import { useSearchParams } from "next/navigation";

import { useBuckets } from "@/lib/query";

export const useActiveBucket = () => {
  const { data: bucketData } = useBuckets();
  const activeBucketName =
    useSearchParams().get("bucket") || bucketData?.buckets?.[0]?.Name;

  if (!activeBucketName) {
    throw new Error(
      "No active bucket found. Please check you have properly configured your env variables.",
    );
  }

  return { activeBucketName };
};
