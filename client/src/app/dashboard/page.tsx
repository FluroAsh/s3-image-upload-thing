import type { BucketsResponse } from "@shared/types";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { LucideCircleAlert } from "lucide-react";
import { redirect } from "next/navigation";

import { ExplorerLayout } from "@/components/explorer";
import { loadDashboardParams } from "@/lib/search-params";
import { getBuckets, getFileTree } from "@/services/s3";

export const dynamic = "force-dynamic";

const NoBucketsFound = () => {
	return (
		<div className="flex flex-col items-center justify-center h-full">
			<div className="size-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-3 ">
				<LucideCircleAlert className="size-5 stroke-amber-500" />
			</div>
			<p className="text-neutral-300 font-medium mb-1">Unable to retrieve buckets</p>
			<p className="text-sm text-neutral-500">To get started, you need to create S3 buckets in your AWS account.</p>
		</div>
	);
};

export default async function Page({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const queryClient = new QueryClient();

	const { bucket, region } = await loadDashboardParams(searchParams);

	await queryClient.prefetchQuery({
		queryKey: ["buckets"],
		queryFn: getBuckets,
	});

	const data = queryClient.getQueryData<BucketsResponse>(["buckets"]);

	if (!data) {
		return <NoBucketsFound />;
	}

	const { activeBucket, activeRegion } = getInitialQueryState(data, bucket, region);

	// Partial search params is not allowed, redirect to the expected bucket/region
	if (!bucket || !region) {
		redirect(`/dashboard?bucket=${activeBucket}&region=${activeRegion}`);
	}

	await queryClient.prefetchQuery({
		queryKey: ["fileTree", activeBucket],
		queryFn: () => getFileTree(activeBucket, activeRegion),
	});

	const dehydratedState = dehydrate(queryClient);

	return (
		<HydrationBoundary state={dehydratedState}>
			<div className="h-screen overflow-hidden">
				<ExplorerLayout />
			</div>
		</HydrationBoundary>
	);
}

function getInitialQueryState(data: BucketsResponse, requestedBucket: string, requestedRegion: string) {
	const defaultBucket = data.buckets[0];
	const fallback = {
		activeBucket: defaultBucket.Name,
		activeRegion: defaultBucket.BucketRegion,
	};

	if (!requestedBucket) return fallback;

	const found = data.buckets.find((bucket) => bucket.Name === requestedBucket);
	if (!found) return fallback;

	if (requestedRegion && found.BucketRegion !== requestedRegion) {
		return fallback;
	}

	return {
		activeBucket: found.Name,
		activeRegion: found.BucketRegion,
	};
}
