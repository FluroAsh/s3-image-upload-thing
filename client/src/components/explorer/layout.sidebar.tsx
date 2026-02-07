"use client";

import { LucideDatabase, LucideSettings } from "lucide-react";

import { useActiveBucket } from "@/hooks/useActiveBucket";
import { useExplorer } from "@/lib/providers/explorer-provider";
import { useBuckets } from "@/lib/query";

import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import { BucketList } from "./bucket/list";
import { BucketSearch } from "./bucket/search";

export const Sidebar = () => {
  const { data: bucketData, isLoading, isError, error } = useBuckets();

  const { bucketSearchTerm } = useExplorer().state;
  const { activeBucketName } = useActiveBucket();

  const totalCount = bucketData?.totalCount ?? 0;
  const totalObjectCount = bucketData?.totalObjectCount ?? 0;
  const buckets = bucketData?.buckets ?? [];

  // Filter buckets based on search term
  const filteredBuckets = buckets.filter((bucket) =>
    bucket.Name?.toLowerCase().includes(bucketSearchTerm.toLowerCase()),
  );

  return (
    <aside className="min-w-[300px] max-w-[300px] h-full bg-neutral-900 flex flex-col border-r border-neutral-700">
      <header className="flex flex-col shrink-0">
        <div className="flex items-center gap-2 p-4">
          <div className="size-8 rounded-lg bg-sky-500/20 flex items-center justify-center">
            <LucideDatabase className="size-4 stroke-sky-400" />
          </div>
          <span className="text-neutral-100 font-semibold">Buckets</span>
        </div>

        <div className="pb-4 px-4" aria-label="Bucket Search">
          <BucketSearch disabled={isLoading} />
        </div>

        <Separator />
      </header>

      <div aria-label="Bucket Collection Summary" className="shrink-0">
        <div className="p-4">
          <p className="text-sm text-neutral-300">
            Total Buckets: {isLoading ? "..." : totalCount}
          </p>
          <p className="text-sm text-neutral-300">
            Total Files: {isLoading ? "..." : totalObjectCount}
          </p>
        </div>
        <Separator />
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <BucketList
          buckets={filteredBuckets}
          bucketName={activeBucketName}
          isLoading={isLoading}
          isError={isError}
          error={error}
          searchTerm={bucketSearchTerm}
        />
      </ScrollArea>

      <footer
        className="p-3 border-t border-neutral-700 shrink-0"
        aria-label="Account Settings"
      >
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
