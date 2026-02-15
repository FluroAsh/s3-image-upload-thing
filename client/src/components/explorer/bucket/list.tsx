"use client";

import {
  LucideAlertTriangle,
  LucideDatabase,
  LucideLoader2,
  LucideSearchX,
} from "lucide-react";
import { useQueryStates } from "nuqs";

import type { Bucket } from "@shared/types";

import { dashboardSearchParams } from "@/lib/search-params";

import { BucketCard } from "./card";

type BucketListProps = {
  buckets: Bucket[];
  bucketName: string | undefined;
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  searchTerm?: string;
};

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center p-12 h-full text-center">
    <div className="size-12 rounded-full bg-sky-500/10 flex items-center justify-center mb-3">
      <LucideLoader2 className="size-5 text-sky-400 animate-spin" />
    </div>
    <p className="text-neutral-300">Loading buckets...</p>
  </div>
);

const ErrorState = ({ message }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center p-12 h-full text-center">
    <div className="size-12 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
      <LucideAlertTriangle className="size-5 stroke-red-500" />
    </div>
    <p className="text-neutral-300 font-medium mb-1">Failed to load buckets</p>
    {message && <p className="text-sm text-red-500">{message}</p>}
  </div>
);

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center p-12 h-full text-center">
    <div className="size-12 rounded-full bg-neutral-800/50 flex items-center justify-center mb-3 ">
      <LucideDatabase className="size-5 stroke-neutral-400" />
    </div>
    <p className="text-neutral-300 font-medium mb-1">No buckets found</p>
    <p className="text-sm text-neutral-500 max-w-sm">
      Create your first S3 bucket to get started
    </p>
  </div>
);

const NoSearchResults = () => (
  <div className="flex flex-col items-center justify-center p-12 h-full text-center text-balance">
    <div className="size-12 rounded-full bg-neutral-800/50 flex items-center justify-center mb-3">
      <LucideSearchX className="size-5 stroke-neutral-400" />
    </div>
    <p className="text-neutral-300 font-medium mb-2">
      No buckets matched your search.
    </p>
    <p className="text-xs text-neutral-500">Try adjusting your search terms</p>
  </div>
);

export const BucketList = ({
  buckets,
  bucketName,
  isLoading = false,
  isError = false,
  error,
  searchTerm = "",
}: BucketListProps) => {
  const [, setParams] = useQueryStates(dashboardSearchParams);

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={error?.message} />;

  if (buckets.length === 0 && !searchTerm) return <EmptyState />;
  if (buckets.length === 0 && searchTerm) return <NoSearchResults />;

  const handleBucketClick = (name: string, region: string) => {
    // Nuqs updates (shallow update) query params client-side, avoiding extra server fetches and keeping navigation fast.
    // SSR is used only on initial load; interactivity stays smooth for switching buckets.
    setParams({ bucket: name, region });
  };

  return (
    <div className="flex flex-col gap-2 p-4" aria-label="Bucket List">
      {buckets.map((bucket) => (
        <BucketCard
          key={`${bucket.Name}-${bucket.BucketRegion}`}
          isActive={bucket.Name === bucketName}
          name={bucket.Name}
          region={bucket.BucketRegion}
          formattedCreationDate={bucket.formattedCreationDate}
          totalSizeHuman={bucket.totalSizeHuman}
          objectCount={bucket.objectCount}
          handleClick={() =>
            handleBucketClick(bucket.Name, bucket.BucketRegion)
          }
        />
      ))}
    </div>
  );
};
