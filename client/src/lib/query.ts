import { useMemo } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ApiError } from "@/lib/ofetch";
import { fetchPresignedUrl, setBatcherBucket } from "@/lib/presigned-url-batcher";
import { useExplorer } from "@/lib/providers/explorer-provider";
import {
	deleteCollection,
	getCollections,
	patchCollection,
	patchPhoto,
	postCollection,
	putCollectionOrder,
	putSetMembers,
} from "@/services/collections";
import { postUploadImages } from "@/services/images";
import { getManifest, postGenerateSizes, postOriginal } from "@/services/manifests";
import { getBuckets, getFileTree } from "@/services/s3";
import type {
	BucketLocation,
	BucketsResponse,
	CollectionsFile,
	FileTreeResponse,
	GenerateSizesResponse,
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
		enabled: !!bucketName && !!bucketRegion,
		retry: false,
	});

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
		onSuccess: ({ results }) => {
			if (!results.some(({ status }) => status === "stored")) return;
			qc.invalidateQueries({
				exact: false,
				queryKey: ["fileTree", bucketName],
			});
		},
	});
};

export const useCollections = () => {
	const { bucketName, bucketRegion } = useExplorer().state;
	return useQuery<CollectionsFile, ApiError>({
		queryKey: ["collections", bucketName],
		queryFn: () => getCollections({ bucketName, bucketRegion }),
		enabled: !!bucketName && !!bucketRegion,
		retry: false,
	});
};

export const useManifest = (set: string) => {
	const { bucketName, bucketRegion } = useExplorer().state;
	return useQuery<Manifest, ApiError>({
		queryKey: ["manifest", bucketName, set],
		queryFn: () => getManifest(set, { bucketName, bucketRegion }),
		enabled: !!bucketName && !!bucketRegion,
		retry: false,
	});
};

const useSetSizesWrite = <Variables>(
	write: (variables: Variables, location: BucketLocation) => Promise<GenerateSizesResponse>,
) => {
	const qc = useQueryClient();
	const { bucketName, bucketRegion } = useExplorer().state;

	return useMutation<GenerateSizesResponse, ApiError, Variables>({
		mutationFn: (variables) => write(variables, { bucketName, bucketRegion }),
		/** Also on failure: a part-way run still stored some sizes. */
		onSettled: () =>
			Promise.all([
				qc.invalidateQueries({ queryKey: ["manifest", bucketName] }),
				qc.invalidateQueries({ queryKey: ["fileTree", bucketName] }),
			]),
	});
};

export const useGenerateSizes = (set: string) =>
	useSetSizesWrite<void>((_, location) => postGenerateSizes(set, location));

export const useAttachOriginal = (set: string) =>
	useSetSizesWrite<File>((file, location) => postOriginal(set, file, location));

/** Refetches collections after a write, so every reader shows what the server saved. */
const useCollectionsWrite = <Response, Variables>(
	write: (variables: Variables, location: BucketLocation) => Promise<Response>,
) => {
	const qc = useQueryClient();
	const { bucketName, bucketRegion } = useExplorer().state;

	return useMutation<Response, ApiError, Variables>({
		mutationFn: (variables) => write(variables, { bucketName, bucketRegion }),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["collections", bucketName] }),
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
	setBatcherBucket(bucketName, bucketRegion);

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
