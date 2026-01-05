'use client'

import { type Bucket } from '@/services/s3'
import { usePathname, useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'

import { BucketCard } from './card'

export const BucketList = ({ buckets, bucketName }: { buckets: Bucket[]; bucketName: string }) => {
  const router = useRouter()
  const pathName = usePathname()
  const searchParams = useSearchParams()

  if (buckets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="size-16 rounded-full bg-slate-700/50 flex items-center justify-center mb-4">
          <div className="size-8 text-slate-400">📦</div>
        </div>
        <h3 className="text-lg font-medium text-neutral-100 mb-2">No buckets found</h3>
        <p className="text-sm text-slate-400 max-w-sm">
          Create your first S3 bucket to get started with file management
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-neutral-100">S3 Buckets</h2>
          <p className="text-sm text-slate-400">
            {buckets.length} bucket{buckets.length !== 1 ? 's' : ''} available
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {buckets.map((bucket, idx: number) => (
          <BucketCard
            key={`bucket-${bucket.Name}-${idx}`}
            isActive={bucket.Name === bucketName}
            name={bucket.Name}
            region={bucket.BucketRegion}
            formattedCreationDate={bucket.formattedCreationDate}
            handleClick={() => {
              const params = new URLSearchParams(searchParams.toString())
              params.set('bucket', encodeURIComponent(bucket.Name))
              router.push(`${pathName}?${params.toString()}`)
            }}
          />
        ))}
      </div>
    </div>
  )
}
