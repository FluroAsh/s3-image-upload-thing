import { BucketList } from "@/components/bucket/list";
import { Bucket, getBuckets, getFileTree } from "@/services/s3";
import { Explorer, BrowserPanel, DetailsPanel } from "@/components/explorer";

import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { Header } from "@/components/explorer/header";

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
        <Explorer bucketName={activeBucket}>
          <div className="">
            <div className="w-[300px] h-full bg-sky-500/50 p-4 flex flex-col gap-4">
              <div className="bg-sky-600">
                <p>Buckets</p>
                <div>Search Buckets</div>
              </div>

              <div className="bg-sky-700">
                <div>Total Buckets: 0</div>
                <div>Total Files: 0</div>
              </div>

              <div className="flex flex-col gap-2 bg-sky-600">
                {/* <BucketList buckets={buckets} bucketName={activeBucket} /> */}
                <div>Bucket 1</div>
                <div>Bucket 2</div>
                <div>Bucket 3</div>
              </div>
            </div>
          </div>

          <div className="size-full flex flex-col">
            <Header />

            <div className="flex h-full overflow-hidden">
              {/* Left Panel */}
              <BrowserPanel />

              {/* Right Panel */}
              {/* Contains 2 panels (top/bottom) */}
              <DetailsPanel />
            </div>
          </div>
        </Explorer>
      </div>
    </HydrationBoundary>
  );
}
