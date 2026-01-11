import { BucketList } from "@/components/bucket/list";
import { Bucket, getBuckets, getFileTree } from "@/services/s3";
import { Explorer, ViewPanel, ActivePanel } from "@/components/explorer";

import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";

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
      <div className="grid grid-rows-[auto_fill_1fr] p-4">
        <div className="mb-8 overflow-auto">
          {/* Cards should scroll when overflowing the container (max-screen-width) */}
          <BucketList buckets={buckets} bucketName={activeBucket} />
        </div>

        {/* TODO: Finish bucket display component */}
        <Explorer bucketName={activeBucket}>
          <ViewPanel />
          <ActivePanel />
        </Explorer>
      </div>
    </HydrationBoundary>
  );
}
