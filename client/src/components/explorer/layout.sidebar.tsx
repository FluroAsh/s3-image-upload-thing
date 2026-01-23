"use client";

import { useExplorer } from "@/lib/providers/explorer-provider";
import { BucketList } from "./bucket/list";
import { useBuckets } from "@/lib/query";
import { useSearchParams } from "next/navigation";
import { LucideSettings } from "lucide-react";

export const Sidebar = () => {
  const { data: buckets } = useBuckets();
  const { bucketName } = useExplorer().state;

  const searchParams = useSearchParams();
  const activeBucket = searchParams.get("bucket") || buckets?.[0]?.Name;

  if (!buckets || !bucketName || !activeBucket) {
    return null;
  }

  return (
    <div>
      <div className="w-[300px] h-full bg-sky-500/50 flex flex-col justify-between">
        <div className="flex flex-col gap-4 p-4">
          <div className="bg-sky-600">
            <p>Buckets</p>
            <div>Search Buckets</div>d
          </div>

          <div className="bg-sky-700">
            <div>Total Buckets: {buckets.length}</div>
            <div>Total Files: 0</div>
          </div>

          <div className="flex flex-col gap-2">
            <BucketList buckets={buckets} bucketName={activeBucket} />
          </div>
        </div>

        <div className="bg-neutral-900 py-2 px-4 flex items-center">
          <LucideSettings className="size-4 text-neutral-100 inline mr-1.5" />
          <span className="mt-[1.5px]">Settings</span>
        </div>
      </div>
    </div>
  );
};
