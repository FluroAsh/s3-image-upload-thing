import type { Bucket } from "@/types/api";
import { getBuckets, getFileTree } from "@/services/s3";
import { ExplorerLayout } from "@/components/explorer";

import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";

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
        <ExplorerLayout bucketName={activeBucket} />
      </div>
    </HydrationBoundary>
  );
}
