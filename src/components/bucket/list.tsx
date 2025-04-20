'use client'

import { type Bucket } from '@/services/s3'
import { usePathname, useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'

import { BucketCard } from './card'

export const BucketList = ({ buckets }: { buckets: Bucket[] }) => {
  const router = useRouter()
  const pathName = usePathname()
  const searchParams = useSearchParams()

  return (
    <div className="flex overflow-x-auto gap-2">
      {buckets.map((bucket, idx: number) => (
        <BucketCard
          key={idx}
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
  )
}
