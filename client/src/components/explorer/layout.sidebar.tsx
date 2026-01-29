"use client";

import { useExplorer } from "@/lib/providers/explorer-provider";
import { BucketList } from "./bucket/list";
import { useBuckets } from "@/lib/query";
import { useSearchParams } from "next/navigation";
import { LucideDatabase, LucideSettings } from "lucide-react";
import { BucketSearch } from "./bucket/search";

export const Sidebar = () => {
  const { data: buckets } = useBuckets();
  const { bucketName, bucketSearchTerm } = useExplorer().state;

  const searchParams = useSearchParams();
  const activeBucket = searchParams.get("bucket") || buckets?.[0]?.Name;

  if (!buckets || !bucketName || !activeBucket) {
    return null;
  }

  const filteredBuckets = buckets.filter((bucket) =>
    bucket.Name?.toLowerCase().includes(bucketSearchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="w-[300px] h-full bg-neutral-900 flex flex-col justify-between border-r border-neutral-700">
        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-center gap-2 ">
            <div className="size-8 rounded-lg bg-sky-500/20 flex items-center justify-center">
              <LucideDatabase className="size-4 stroke-sky-400" />
            </div>
            <span className="text-neutral-100 font-semibold">Buckets</span>
          </div>

          <BucketSearch />

          <div className="bg-sky-700">
            <div>Total Buckets: {filteredBuckets.length}</div>
            {/* TODO: Return object count in our backend GET /s3/buckets call */}
            <div>Total Files: 0</div>
          </div>

          <div className="flex flex-col gap-2">
            <BucketList buckets={filteredBuckets} bucketName={activeBucket} />
          </div>
        </div>

        <div className="p-3 border-t border-neutral-700">
          {/* TODO: Open/build settings modal */}
          <button
            onClick={() => console.log("Open settings modal")}
            className="w-full justify-start gap-2 text-sm hover:bg-sky-900/30 hover:[text,fill]-sky-400 transition-colors hover:cursor-pointer rounded-md p-2"
          >
            <LucideSettings className="size-4 text-neutral-100 inline mr-1.5" />
            Settings
          </button>
        </div>
      </div>
    </div>
  );
};
