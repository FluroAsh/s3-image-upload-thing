import { ListObjectsV2Command, type S3Client } from '@aws-sdk/client-s3'

// export async function getBucketSize(s3Instance: S3Client, bucketName: string) {
//   let size = 0
//   let continuationToken

//   do {
//     const listObjectsCommand = new ListObjectsV2Command({
//       Bucket: bucketName,
//       ContinuationToken: continuationToken
//     })
//     const res = await s3Instance.send(listObjectsCommand)
//     size += res.Contents?.reduce((acc, obj) => acc + (obj.Size || 0), 0) || 0
//     continuationToken = res.NextContinuationToken
//   } while (continuationToken)

//   return size
// }
