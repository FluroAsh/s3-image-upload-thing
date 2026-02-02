"use client";

import { useExplorer } from "@/lib/providers/explorer-provider";
import { BucketList } from "./bucket/list";
import { useBuckets } from "@/lib/query";
import { useSearchParams } from "next/navigation";
import { LucideDatabase, LucideSettings } from "lucide-react";
import { BucketSearch } from "./bucket/search";
import { Separator } from "../ui/separator";
import { ScrollArea } from "../ui/scroll-area";

export const Sidebar = () => {
  const { data: bucketData } = useBuckets();
  const { bucketName, bucketSearchTerm } = useExplorer().state;

  const searchParams = useSearchParams();
  const activeBucket =
    searchParams.get("bucket") || bucketData?.buckets?.[0]?.Name;

  if (!bucketData || !bucketName || !activeBucket) {
    return null;
  }

  const { buckets, totalObjectCount, totalCount } = bucketData;

  const filteredBuckets = buckets.filter((bucket) =>
    bucket.Name?.toLowerCase().includes(bucketSearchTerm.toLowerCase())
  );

  return (
    <aside className="w-[300px] h-full bg-neutral-900 flex flex-col justify-between border-r border-neutral-700">
      <header className="flex flex-col shrink-0">
        <div className="flex items-center gap-2 p-4">
          <div className="size-8 rounded-lg bg-sky-500/20 flex items-center justify-center">
            <LucideDatabase className="size-4 stroke-sky-400" />
          </div>
          <span className="text-neutral-100 font-semibold">Buckets</span>
        </div>

        <div className="pb-4 px-4" aria-label="Bucket Search">
          <BucketSearch />
        </div>

        <Separator />
      </header>

      <div aria-label="Bucket Collection Summary" className="shrink-0">
        <div className="p-4">
          <p>Total Buckets: {totalCount}</p>
          <p>Total Files: {totalObjectCount}</p>
        </div>
        <Separator />
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <BucketList buckets={filteredBuckets} bucketName={activeBucket} />
      </ScrollArea>

      <footer
        className="p-3 border-t border-neutral-700 shrink-0"
        aria-label="Account Settings"
      >
        {/* TODO: Open/build settings modal */}
        <button
          onClick={() => console.log("Open settings modal")}
          className="w-full justify-start gap-2 text-sm hover:bg-sky-900/30 hover:[text,fill]-sky-400 transition-colors hover:cursor-pointer rounded-md p-2"
        >
          <LucideSettings className="size-4 text-neutral-100 inline mr-1.5" />
          Settings
        </button>
      </footer>
    </aside>
  );
};
