"use client";

import type { Bucket } from "@/types/api";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";

import { BucketCard } from "./card";

type BucketListProps = {
  buckets: Bucket[];
  bucketName: string;
};

export const BucketList = ({ buckets, bucketName }: BucketListProps) => {
  const router = useRouter();
  const pathName = usePathname();
  const searchParams = useSearchParams();

  if (buckets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <p className="text-lg font-medium text-neutral-100 mb-2">
          No buckets found
        </p>
        <p className="text-sm text-slate-400 max-w-sm">
          Create your first S3 bucket to get started with file management
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4" aria-label="Bucket List">
      {buckets.map((bucket, idx: number) => (
        <BucketCard
          key={`bucket-${bucket.Name}-${idx}`}
          isActive={bucket.Name === bucketName}
          name={bucket.Name}
          region={bucket.BucketRegion}
          formattedCreationDate={bucket.formattedCreationDate}
          totalSizeHuman={bucket.totalSizeHuman}
          objectCount={bucket.objectCount}
          handleClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("bucket", encodeURIComponent(bucket.Name));
            router.push(`${pathName}?${params.toString()}`);
          }}
        />
      ))}
    </div>
  );
};
