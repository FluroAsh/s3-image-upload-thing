import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query";
import { redirect } from "next/navigation";

import type { BucketsResponse } from "@shared/types";

import { ExplorerLayout } from "@/components/explorer";
import { loadDashboardParams } from "@/lib/search-params";
import { getBuckets, getFileTree } from "@/services/s3";

export const dynamic = "force-dynamic";

const qc = new QueryClient();

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { bucket, region } = await loadDashboardParams(searchParams);

  await qc.prefetchQuery({
    queryKey: ["buckets"],
    queryFn: getBuckets,
  });

  const data = qc.getQueryData<BucketsResponse>(["buckets"]);
  const activeBucket = bucket || data?.buckets?.[0]?.Name || "";
  const activeRegion = region || data?.buckets?.[0]?.BucketRegion || "";

  // if bucket or region param is not provided, user should be redirected to their first bucket
  if ((!bucket || !region) && activeBucket && activeRegion) {
    redirect(`/dashboard?bucket=${activeBucket}&region=${activeRegion}`);
  }

  await qc.prefetchQuery({
    queryKey: ["fileTree", activeBucket],
    queryFn: () => getFileTree(activeBucket),
  });

  const dehydratedState = dehydrate(qc);

  return (
    <HydrationBoundary state={dehydratedState}>
      <div className="h-screen overflow-hidden">
        <ExplorerLayout />
      </div>
    </HydrationBoundary>
  );
}
