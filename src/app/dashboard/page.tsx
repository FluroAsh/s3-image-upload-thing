import BucketDisplay from '@/components/bucket-display'
import S3BucketCard from '@/components/s3-card'
import { getBuckets } from '@/services/s3'

export default async function Page() {
  const buckets = await getBuckets()

  return (
    <div className="grid grid-rows-2">
      <div className="mb-8 overflow-auto">
        <p className="text-xl font-bold pb-2">Bucket List</p>

        {/* Cards should scroll when overflowing the container (max-screen-width) */}
        <div className="flex overflow-x-auto gap-4">
          {buckets.map((bucket, idx: number) => (
            <S3BucketCard
              key={idx}
              name={bucket.Name}
              region={bucket.BucketRegion}
              formattedCreationDate={bucket.formattedCreationDate}
            />
          ))}
        </div>
      </div>

      {/* TODO: Finish bucket display component */}
      <BucketDisplay />
    </div>
  )
}
