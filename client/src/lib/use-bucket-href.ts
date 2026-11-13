import { useExplorer } from "@/lib/providers/explorer-provider";

/** A link to `path` for the bucket chosen in the top bar. */
export const useBucketHref = (path: "/dashboard" | "/settings") => {
	const { bucketName, bucketRegion } = useExplorer().state;
	return `${path}?${new URLSearchParams({ bucket: bucketName, region: bucketRegion })}`;
};
