import type { PresignedUrlsResponse } from "@shared/types";

import ofetch from "@/lib/ofetch";

/**
 * DataLoader-style batcher for presigned URL generation.
 *
 * Multiple callers within the same batch window each call `fetchPresignedUrl(key)`
 * independently. The batcher collects all keys, fires a single POST request,
 * and resolves each caller's promise with their URL.
 *
 * Uses a short `setTimeout` window rather than `queueMicrotask` because React Query
 * invokes each hook's `queryFn` in separate microtasks — so a microtask flush fires
 * before later hooks have registered their keys. A small delay ensures all queries
 * from the same render cycle are captured in one batch.
 */

type Resolver = {
  resolve: (url: string) => void;
  reject: (error: Error) => void;
};

let pendingKeys: string[] = [];
let pendingResolvers: Map<string, Resolver> = new Map();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

/** The bucket name must be set before fetching — set by the hook layer. */
let activeBucket = "";
let activeBucketRegion = "";

export const setBatcherBucket = (bucket: string, region: string) => {
  activeBucket = bucket;
  activeBucketRegion = region;
};

const flush = async () => {
  const keys = [...pendingKeys];
  const resolvers = new Map(pendingResolvers);

  // Reset state immediately so new calls during the fetch start a fresh batch
  pendingKeys = [];
  pendingResolvers = new Map();
  flushTimer = null;

  try {
    const { urls, errors } = await ofetch<PresignedUrlsResponse>(
      `/storage/presigned-urls?bucket=${activeBucket}&region=${activeBucketRegion}`,
      {
        method: "POST",
        body: { keys },
      },
    );

    // Resolve successful URLs
    for (const { key, url } of urls) {
      resolvers.get(key)?.resolve(url);
      resolvers.delete(key);
    }

    // Reject any keys that had errors
    if (errors) {
      for (const { key, error } of errors) {
        resolvers.get(key)?.reject(new Error(error));
        resolvers.delete(key);
      }
    }

    // Reject any remaining unresolved keys (shouldn't happen, but safety net)
    for (const [key, { reject }] of resolvers) {
      reject(new Error(`No presigned URL returned for key: ${key}`));
    }
  } catch (error) {
    // If the entire request fails, reject all pending resolvers
    const message =
      error instanceof Error ? error.message : "Presigned URL batch failed";
    for (const [, { reject }] of resolvers) {
      reject(new Error(message));
    }
  }
};

/** Batch window in ms — allows all queries from the same render cycle to register. */
const BATCH_DELAY_MS = 10;

/**
 * Request a presigned URL for a single S3 object key.
 * Calls within the batch window are automatically collected into one request.
 */
export const fetchPresignedUrl = (key: string): Promise<string> =>
  new Promise((resolve, reject) => {
    // If this key is already pending, chain onto the existing resolver
    if (pendingResolvers.has(key)) {
      const existing = pendingResolvers.get(key)!;
      pendingResolvers.set(key, {
        resolve: (url) => {
          existing.resolve(url);
          resolve(url);
        },
        reject: (err) => {
          existing.reject(err);
          reject(err);
        },
      });
      return;
    }

    pendingKeys.push(key);
    pendingResolvers.set(key, { resolve, reject });

    if (!flushTimer) {
      flushTimer = setTimeout(flush, BATCH_DELAY_MS);
    }
  });
