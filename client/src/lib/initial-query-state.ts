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
