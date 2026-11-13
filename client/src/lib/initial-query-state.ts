import { redirect } from "next/navigation";

import type { BucketsResponse } from "~/shared/types";

export function getInitialQueryState(data: BucketsResponse, requestedBucket: string, requestedRegion: string) {
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

/** Redirects to `path` when the requested pair is missing or unknown, so a page always holds a bucket that exists. */
export function redirectToValidBucket(
	data: BucketsResponse,
	requestedBucket: string,
	requestedRegion: string,
	path: "/dashboard" | "/settings",
) {
	const { activeBucket, activeRegion } = getInitialQueryState(data, requestedBucket, requestedRegion);

	if (requestedBucket !== activeBucket || requestedRegion !== activeRegion) {
		redirect(`${path}?${new URLSearchParams({ bucket: activeBucket, region: activeRegion })}`);
	}

	return { activeBucket, activeRegion };
}
