import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query";

import type { Bucket } from "@shared/types";

import { ExplorerLayout } from "@/components/explorer";
import { getBuckets, getFileTree } from "@/services/s3";

export const dynamic = "force-dynamic";

const qc = new QueryClient();

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | undefined }>;
}) {
  await qc.prefetchQuery({
    queryKey: ["buckets"],
    queryFn: getBuckets,
  });

  const buckets = qc.getQueryData<Bucket[]>(["buckets"]);
  const activeBucket = (await searchParams)?.bucket || buckets?.[0]?.Name;
  const activeBucketRegion =
    (await searchParams)?.region || buckets?.[0]?.BucketRegion;

  if (!activeBucket || !buckets) {
    return null;
  }

  await qc.prefetchQuery({
    queryKey: ["fileTree", activeBucket],
    queryFn: () => getFileTree(activeBucket),
  });

  const dehydratedState = dehydrate(qc);

  return (
    <HydrationBoundary state={dehydratedState}>
      <div className="h-screen overflow-hidden">
        <ExplorerLayout
          bucketName={activeBucket}
          bucketRegion={activeBucketRegion}
        />
      </div>
    </HydrationBoundary>
  );
}
