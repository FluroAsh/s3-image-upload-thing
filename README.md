# S3 Image Upload Thing

A self-hosted, single-tenant S3 file management and image processing application designed for homelab and personal use. Upload images, automatically generate optimized variants (thumbnail, medium, large), and manage your S3 buckets without touching the AWS console.

## Features

- 🖼️ **Automatic Image Processing**: Upload images and automatically generate multiple size variants (20px, 400px, 800px, 1440px, lossless)
- 📁 **File Browser**: Browse and manage S3 buckets with an intuitive file tree interface
- 🔒 **BYO Keys**: Bring your own AWS credentials - no hardcoded keys, fully self-hosted
- ⚡ **Modern Stack**: Built with Next.js 15, Hono, and Bun for optimal performance
- 🐳 **Docker Ready**: Deploy with a single `docker compose up` command

## Architecture

This is a monorepo containing two main applications:

### Client (`/client`)

**Tech Stack:**

- Next.js 15 (App Router)
- React 18
- TanStack Query (data fetching)
- Tailwind CSS v4
- TypeScript

**Purpose:**

- Modern web interface for S3 bucket management
- File tree browser with folder navigation
- Image upload with drag-and-drop support
- Real-time upload progress tracking
- Settings UI for AWS credential configuration

**Key Features:**

- Server-side rendering for optimal performance
- Responsive design for desktop and mobile
- Image preview with variant selection
- Bucket search and filtering

### Server (`/server`)

**Tech Stack:**

- Bun runtime
- Hono (lightweight web framework)
- AWS SDK v3 (S3 operations)
- Sharp (image processing)
- TypeScript

**Purpose:**

- RESTful API for S3 operations
- Image processing pipeline
- Presigned URL generation

**Key Features:**

- Automatic image variant generation (placeholder, small, medium, large, lossless)
- WebP conversion for optimal file sizes

## Getting Started

### Prerequisites

- Docker & Docker Compose (recommended)
- OR: Node.js 18+, Bun 1.0+
- AWS account with S3 access
- Darktable (for RAW image support)

### Quick Start with Docker

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/s3-image-upload-thing.git
   cd s3-image-upload-thing
   ```

2. **Configure AWS credentials**

   Create environment files:

   ```bash
   cp server/.env.example server/.env
   ```

   Edit `server/.env`:

   ```bash
   ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
   SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
   AWS_REGION=ap-southeast-2 # Defaults to ap-southeast-2
   PORT=5101
   ```

3. **Start the application**

   ```bash
   docker compose up -d
   ```

4. **Access the application**

   Open http://localhost:5100 in your browser.

### Local Development

**Start the server:**

```bash
cd server
bun install
bun run dev
```

**Start the client:**

```bash
cd client
npm install
npm run dev
```

Access the application at http://localhost:3000

## Configuration

### AWS Credentials

Configure AWS credentials via environment variables in `server/.env`

### Environment Variables

**Server** (`server/.env`):

```bash
ACCESS_KEY_ID=your-access-key-id
SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=ap-southeast-2
PORT=5101
```

**Client** (`client/.env.local`):

```bash
API_URL=http://localhost:5101
NEXT_PUBLIC_S3_REGION=ap-southeast-2 # Defaults to ap-southeast-2
```

### IAM Permissions

Create or use an existing IAM user with the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name",
        "arn:aws:s3:::your-bucket-name/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "s3:ListAllMyBuckets",
      "Resource": "*"
    }
  ]
}
```

## Project Structure

```
.
├── client/                # Next.js frontend application
│   ├── src/
│   │   ├── app/           # Next.js App Router pages
│   │   ├── components/    # React components
│   │   │   └── explorer/  # File browser components
│   │   │   └── ui/        # Shadcn UI components
│   │   ├── services/      # API client services
│   │   ├── lib/           # Utilities and providers
│   │   └── types/         # TypeScript type definitions
│   └── package.json
│
├── server/                # Bun backend application
│   ├── src/
│   │   ├── features/      # Feature modules
│   │   │   ├── s3/        # S3 operations
│   │   │   ├── image/     # Image processing
│   │   │   └── credentials/ # Credential management
│   │   ├── infrastructure/  # TBC for future use (ie. background jobs, RAW image processing, etc.)
│   │   ├── middleware/    # Hono middleware
│   │   ├── services/      # Business logic
│   │   └── lib/           # Utilities
│   └── package.json
│
├── docker-compose.yml     # Docker orchestration
└── README.md
```

## Image Processing Pipeline

When you upload an image, the server automatically:

1. **Validates** the image format and size
2. **Generates five variants**:
   - `placeholder_image.webp` (20px width, 60% quality) - Blur placeholder
   - `small_image.webp` (400px width, 80% quality) - Mobile optimized
   - `medium_image.webp` (800px width, 85% quality) - Tablet/desktop
   - `large_image.webp` (1440px width, 90% quality) - High-res desktop
   - `lossless_image.webp` (original dimensions, 95% quality) - Near-lossless
3. **Uploads to S3** in organized folder structure

**Folder Structure:**

```
your-bucket/
└── destination-folder/
    └── image-name/
        ├── placeholder_image-name.webp
        ├── small_image-name.webp
        ├── medium_image-name.webp
        ├── large_image-name.webp
        └── lossless_image-name.webp
```

## Security

- ✅ **No hardcoded credentials**: BYO keys approach
- ✅ **Git-safe**: `.env` files are gitignored
- ✅ **Environment variables**: Credentials stored in environment files
- ✅ **IAM best practices**: Use limited-permission IAM users

**Important**: Never commit `server/.env` or `client/.env.local` to version control. The `.gitignore` is configured to prevent this.

## Contributing

This is a personal project, but contributions are welcome! Feel free to:

- 🐛 Report bugs via GitHub Issues
- 💡 Suggest features or improvements
- 🔧 Submit pull requests
- 📖 Improve documentation

## Roadmap

- [ ] Background upload jobs with BullMQ
- [ ] Image replacement feature
- [ ] Lossless optimization opt-in
- [ ] Source image storage option
- [ ] Multi-region support
- [ ] Batch operations
- [ ] Search and filtering improvements

## Tech Stack Details

### Frontend

| Package        | Purpose                         |
| -------------- | ------------------------------- |
| Next.js 15     | React framework with App Router |
| TanStack Query | Server state management         |
| Tailwind CSS   | Utility-first styling           |
| Lucide React   | Icon library                    |
| Radix UI       | Accessible component primitives |
| ofetch         | Type-safe fetch wrapper         |

### Backend

| Package    | Purpose                   |
| ---------- | ------------------------- |
| Bun        | JavaScript runtime        |
| Hono       | Lightweight web framework |
| AWS SDK v3 | S3 operations             |
| Sharp      | Image processing          |

## Requirements

### System Requirements

- **Docker**: 20.10+ (for containerized deployment)
- **Node.js**: 18+ (for local development)
- **Bun**: 1.0+ (for server development)

### AWS Requirements

- S3 bucket(s) in your AWS account
- IAM user with S3 permissions
- Access key ID and secret access key

## Troubleshooting

### "AWS credentials not configured"

- Ensure `server/.env` exists and contains valid credentials

### "Invalid credentials"

- Verify your access key ID and secret access key in the AWS IAM console
- Ensure the IAM user has the required S3 permissions
- Check that the credentials are active (not deleted or expired)

### Docker container won't start

- Check Docker logs: `docker logs s3-upload-(client|server)`
- Ensure ports 5100 and 5101 are not already in use
- Verify the credentials file in both the `server` and `client` directory is correct

## Acknowledgments

- Built for homelab enthusiasts and self-hosters
- Inspired by the need for a simple, self-hosted S3 management tool
- Thanks to the open-source community for the amazing tools and libraries

## Links

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Hono Documentation](https://hono.dev/)
- [Bun Documentation](https://bun.sh/docs)
- [Sharp Documentation](https://sharp.pixelplumbing.com/)

---

**Note**: This is a self-hosted application designed for personal use. It is not intended for multi-tenant or production SaaS deployments. Use at your own risk and always follow AWS security best practices.

Made with ❤️ by [FluroAsh](https://github.com/FluroAsh)
