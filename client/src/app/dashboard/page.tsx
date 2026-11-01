import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { LucideAlertTriangle, LucideDatabase } from "lucide-react";
import { redirect } from "next/navigation";

import { ExplorerLayout } from "@/components/explorer";
import { serverErrorMessage } from "@/components/explorer/utils";
import { StateMessage } from "@/components/ui/state-message";
import { getInitialQueryState } from "@/lib/initial-query-state";
import type { ApiError } from "@/lib/ofetch";
import { loadDashboardParams } from "@/lib/search-params";
import { getBuckets, getFileTree } from "@/services/s3";
import type { BucketsResponse } from "~/shared/types";

export const dynamic = "force-dynamic";

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
		const error = queryClient.getQueryState<BucketsResponse, ApiError>(["buckets"])?.error;
		return (
			<StateMessage
				className="h-screen"
				tone="error"
				icon={LucideAlertTriangle}
				title="Unable to retrieve buckets"
				message={error ? serverErrorMessage(error, "The server could not be reached. Try again shortly.") : undefined}
			/>
		);
	}

	if (!data.buckets.length) {
		return (
			<StateMessage
				className="h-screen"
				icon={LucideDatabase}
				title="No buckets found"
				message="To get started, create an S3 bucket in your AWS account."
			/>
		);
	}

	const { activeBucket, activeRegion } = getInitialQueryState(data, bucket, region);

	// The explorer reads bucket/region from the URL, so it must always hold a valid pair
	if (bucket !== activeBucket || region !== activeRegion) {
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
