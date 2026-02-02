import { useBuckets } from "@/lib/query";
import { useSearchParams } from "next/navigation";

export const useActiveBucket = () => {
  const { data: bucketData } = useBuckets();
  const bucketName =
    useSearchParams().get("bucket") || bucketData?.buckets?.[0]?.Name;

  if (!bucketName) {
    throw new Error(
      "No active bucket found. Please check you have properly configured your env variables."
    );
  }

  return { bucketName };
};
