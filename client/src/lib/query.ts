import { useMemo } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ApiError } from "@/lib/ofetch";
import { fetchPresignedUrl, setBatcherBucket } from "@/lib/presigned-url-batcher";
import { useExplorer } from "@/lib/providers/explorer-provider";
import {
	type BucketLocation,
	deleteCollection,
	getCollections,
	patchCollection,
	patchPhoto,
	postCollection,
	putCollectionOrder,
	putSetMembers,
} from "@/services/collections";
import { postUploadImages } from "@/services/images";
import { getManifest } from "@/services/manifests";
import { getBuckets, getFileTree } from "@/services/s3";
import type {
	BucketsResponse,
	CollectionsFile,
	FileTreeResponse,
	Manifest,
	TreeNode,
	UpdatePhotoRequest,
} from "~/shared/types";

export const useBuckets = () =>
	useQuery<BucketsResponse, ApiError>({
		queryKey: ["buckets"],
		queryFn: getBuckets,
		retry: false,
	});

export const useFileTree = (bucketName: string, bucketRegion: string) => {
	const query = useQuery<FileTreeResponse, ApiError>({
		queryKey: ["fileTree", bucketName],
		queryFn: () => getFileTree(bucketName, bucketRegion),
		retry: false,
	});

	// NOTE: This is temporary until we add lazy/progressive loading for the file tree
	// based on expansion state
	const childMap = useMemo(() => {
		const map = new Map<string, TreeNode[]>();
		query.data?.tree.forEach((node) => {
			const siblings = map.get(node.parentId) || [];
			siblings.push(node);
			map.set(node.parentId, siblings);
		});

		return map;
	}, [query.data]);

	return { ...query, childMap };
};

export const useMutateUpload = (bucketName: string) => {
	const qc = useQueryClient();

	return useMutation({
		mutationFn: (formData: FormData) => postUploadImages(formData),
		onSuccess: () => {
			qc.invalidateQueries({
				exact: false,
				queryKey: ["fileTree", bucketName],
			});
		},
	});
};

/** The bucket the explorer has open, which every collections call is scoped to. */
const useBucketLocation = () => {
	const { bucketName, bucketRegion } = useExplorer().state;
	return { bucketName, bucketRegion };
};

export const useCollections = () => {
	const location = useBucketLocation();
	return useQuery<CollectionsFile, ApiError>({
		queryKey: ["collections", location.bucketName],
		queryFn: () => getCollections(location),
		retry: false,
	});
};

export const useManifest = (set: string) => {
	const location = useBucketLocation();
	return useQuery<Manifest, ApiError>({
		queryKey: ["manifest", location.bucketName, set],
		queryFn: () => getManifest(set, location),
		retry: false,
	});
};

/** Refetches collections after a write, so every reader shows what the server saved. */
const useCollectionsWrite = <Response, Variables>(
	write: (variables: Variables, location: BucketLocation) => Promise<Response>,
) => {
	const qc = useQueryClient();
	const location = useBucketLocation();

	return useMutation<Response, ApiError, Variables>({
		mutationFn: (variables) => write(variables, location),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["collections", location.bucketName] }),
	});
};

export const useCreateCollection = () => useCollectionsWrite(postCollection);

export const useUpdateCollection = () => useCollectionsWrite(patchCollection);

export const useReorderCollection = () => useCollectionsWrite(putCollectionOrder);

export const useDeleteCollection = () => useCollectionsWrite(deleteCollection);

export const useSetMembers = () => useCollectionsWrite(putSetMembers);

export const useUpdatePhoto = () =>
	useCollectionsWrite(({ set, ...body }: { set: string } & UpdatePhotoRequest, location) =>
		patchPhoto(set, body, location),
	);

const FIFTY_MINUTES_MS = 50 * 60 * 1000;
const FIVE_MINUTES_MS = 5 * 60 * 1000;

/**
 * Fetches presigned URLs for a list of S3 object keys.
 * Under the hood, calls from multiple components in the same render cycle
 * are batched into a single network request via the presigned URL batcher.
 */
export const usePresignedUrls = (keys: string[], bucketName: string, bucketRegion: string) => {
	setBatcherBucket(bucketName, bucketRegion); // Keep the batcher in sync with the active bucket

	const sortedKeys = [...keys].sort();

	return useQuery<Record<string, string>>({
		queryKey: ["presignedUrls", bucketName, ...sortedKeys],
		queryFn: async () => {
			const entries = await Promise.all(sortedKeys.map(async (key) => [key, await fetchPresignedUrl(key)] as const));
			return Object.fromEntries(entries);
		},
		enabled: sortedKeys.length > 0,
		staleTime: FIFTY_MINUTES_MS,
		gcTime: FIVE_MINUTES_MS,
	});
};
