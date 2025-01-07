import { BucketList } from '@/components/bucket-list'
import { getBuckets, getFileTree } from '@/services/s3'
import { Explorer, ViewPanel, ActivePanel } from '@/components/explorer'

export default async function Page({ searchParams }: { searchParams?: { [key: string]: string | undefined } }) {
  const buckets = await getBuckets()

  const activeBucket = ((await searchParams)?.bucket as string | undefined) || buckets[0]?.Name

  // initial fetch should be URL param fetch or first bucket (fallback to first buck if the request fails - no res.ok)

  const initialTree = await getFileTree(activeBucket ?? buckets[0]?.Name)

  return (
    <div className="grid grid-rows-[auto_fill_1fr]">
      <div className="mb-8 overflow-auto">
        <p className="text-xl font-bold pb-2">Bucket List</p>

        {/* Cards should scroll when overflowing the container (max-screen-width) */}
        <BucketList buckets={buckets} />
      </div>

      {/* TODO: Finish bucket display component */}
      {/* Pass the tree to the root component */}
      <Explorer bucketName={activeBucket}>
        <ViewPanel fileTree={initialTree} bucketName={activeBucket} />
        <ActivePanel />
      </Explorer>
    </div>
  )
}
