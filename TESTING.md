# Testing Guide - S3 Image Upload Tool

## ✅ Presigned URL Test Results

The presigned URL generation is working correctly! Test output:

```
✅ Presigned URL generated successfully!
✅ All required parameters present - URL is valid!
```

## 🧪 How to Test the Full Upload Flow

### Prerequisites

1. **Servers Running:**
   - Client: `http://localhost:3000`
   - Server: `http://localhost:3002`

2. **AWS Credentials Set:**
   - `ACCESS_KEY_ID` in `.env`
   - `SECRET_ACCESS_KEY` in `.env`

### Test 1: Basic Upload Test

1. **Open the client** at `http://localhost:3000`

2. **Select a test image** (JPG, PNG, or WebP)

3. **Choose a destination folder** in your S3 bucket

4. **Upload the image**

5. **Check the response** - You should see:
   ```json
   {
     "message": "Successfully uploaded images",
     "files": [
       {
         "variant": "placeholder",
         "fileName": "test.jpg",
         "imageURL": "https://s3-upload-thing.s3.us-east-1.amazonaws.com/...?X-Amz-Algorithm=...",
         "size": "1.8 KB",
         "ETag": "..."
       },
       // ... 4 more variants
     ]
   }
   ```

6. **Verify URL structure** - Each `imageURL` should have:
   - ✅ `X-Amz-Algorithm=AWS4-HMAC-SHA256`
   - ✅ `X-Amz-Credential=...`
   - ✅ `X-Amz-Expires=3600`
   - ✅ `X-Amz-Signature=...`

### Test 2: Image Preview Test

1. **After upload**, the UI should display image previews

2. **Click on any image URL** - It should open in a new tab

3. **Verify the image loads** - Even though your bucket is private!

4. **Check browser console** - No CORS or access errors

### Test 3: Variant Generation Test

Upload an image and verify all 5 variants are generated:

| Variant | Expected Behavior |
|---------|-------------------|
| `placeholder` | ~20px wide, small file size (~1-2 KB) |
| `small` | 400px wide (or original if smaller) |
| `medium` | 800px wide (or original if smaller) |
| `large` | 1440px wide (or original if smaller) |
| `lossless` | Original dimensions, high quality |

**Console Output Example:**
```
||== 📊 "photo.jpg" | Source: 4032x3024 (2.5 MB) ==||
||== ✅ "photo.jpg" | placeholder | successfully compressed image to 1.8 KB ==||
||== ✅ "photo.jpg" | small | successfully compressed image to 45 KB ==||
||== ✅ "photo.jpg" | medium | successfully compressed image to 127 KB ==||
||== ✅ "photo.jpg" | large | successfully compressed image to 342 KB ==||
||== ✅ "photo.jpg" | lossless | successfully compressed image to 1.2 MB ==||
```

### Test 4: Upscaling Prevention Test

Upload a **small image** (e.g., 300x200px) and verify:

1. **No upscaling occurs** - Variants larger than source should be skipped
2. **Fallback variants created** - Skipped variants use the lossless version
3. **Console shows skip messages:**
   ```
   ||== ⏭️  "small.jpg" | medium | skipped (would upscale from 300px to 800px) ==||
   ```

### Test 5: Private Bucket Test

1. **Try accessing S3 URL directly** (without presigned params):
   ```
   https://s3-upload-thing.s3.us-east-1.amazonaws.com/folder/image/large_photo.webp
   ```
   
2. **Expected result:** `AccessDenied` error

3. **Try accessing presigned URL** (with params):
   ```
   https://s3-upload-thing.s3.us-east-1.amazonaws.com/folder/image/large_photo.webp?X-Amz-Algorithm=...
   ```
   
4. **Expected result:** Image loads successfully! ✅

### Test 6: URL Expiration Test

1. **Upload an image** and copy a presigned URL

2. **Wait 1 hour** (or modify `expiresIn` to 60 seconds for faster testing)

3. **Try accessing the URL** after expiration

4. **Expected result:** `Request has expired` error

## 🔧 Quick Test Script

Run this to verify presigned URL generation:

```bash
cd server
bun run test-presigned-url.ts
```

Expected output:
```
✅ AWS credentials found
✅ S3 client initialized
✅ Presigned URL generated successfully!
✅ All required parameters present - URL is valid!
```

## 🐛 Troubleshooting

### Issue: "AccessDenied" on presigned URLs

**Cause:** AWS credentials don't have S3 read permissions

**Fix:** Ensure your IAM user has `s3:GetObject` permission:
```json
{
  "Effect": "Allow",
  "Action": ["s3:GetObject", "s3:PutObject"],
  "Resource": "arn:aws:s3:::s3-upload-thing/*"
}
```

### Issue: "Request has expired"

**Cause:** Presigned URL expired (1 hour default)

**Fix:** Upload a new image to get fresh URLs

### Issue: Images not loading in UI

**Cause:** CORS or network issue

**Fix:** 
1. Check browser console for errors
2. Verify servers are running
3. Check S3 bucket CORS configuration

### Issue: "fileGroup.map is not a function"

**Cause:** Client types not updated

**Fix:** Already fixed! Client now handles flat array response.

## ✅ Success Criteria

Your implementation is working correctly if:

- ✅ Presigned URLs are generated with all required parameters
- ✅ Images load in localhost:3000 despite private bucket
- ✅ All 5 variants are created (placeholder, small, medium, large, lossless)
- ✅ Small images are not upscaled
- ✅ URLs expire after 1 hour
- ✅ No bucket policy changes needed

## 📊 Expected Upload Response

```json
{
  "message": "Successfully uploaded images",
  "files": [
    {
      "variant": "placeholder",
      "fileName": "sunset.jpg",
      "imageURL": "https://s3-upload-thing.s3.us-east-1.amazonaws.com/photos/sunset/placeholder_sunset.webp?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIA...&X-Amz-Date=20260104T120000Z&X-Amz-Expires=3600&X-Amz-Signature=...",
      "size": "1.8 KB",
      "ETag": "\"abc123...\""
    },
    {
      "variant": "small",
      "fileName": "sunset.jpg",
      "imageURL": "https://s3-upload-thing.s3.us-east-1.amazonaws.com/photos/sunset/small_sunset.webp?X-Amz-Algorithm=...",
      "size": "45 KB",
      "ETag": "\"def456...\""
    },
    {
      "variant": "medium",
      "fileName": "sunset.jpg",
      "imageURL": "https://s3-upload-thing.s3.us-east-1.amazonaws.com/photos/sunset/medium_sunset.webp?X-Amz-Algorithm=...",
      "size": "127 KB",
      "ETag": "\"ghi789...\""
    },
    {
      "variant": "large",
      "fileName": "sunset.jpg",
      "imageURL": "https://s3-upload-thing.s3.us-east-1.amazonaws.com/photos/sunset/large_sunset.webp?X-Amz-Algorithm=...",
      "size": "342 KB",
      "ETag": "\"jkl012...\""
    },
    {
      "variant": "lossless",
      "fileName": "sunset.jpg",
      "imageURL": "https://s3-upload-thing.s3.us-east-1.amazonaws.com/photos/sunset/lossless_sunset.webp?X-Amz-Algorithm=...",
      "size": "1.2 MB",
      "ETag": "\"mno345...\""
    }
  ]
}
```

## 🎯 Next Steps

After testing:

1. ✅ Verify all tests pass
2. 📝 Document any issues found
3. 🚀 Ready for production use!
4. 🔄 Consider implementing the backfill script for existing images
