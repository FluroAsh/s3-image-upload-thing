# Docker Deployment Guide

This guide explains how to deploy the S3 Image Upload application using Docker Compose on your homelab server with Swag/Traefik.

## Prerequisites

1. Docker and Docker Compose installed on your homelab server
2. Swag/Traefik configured with DNS challenge for `ashmatrix.com`
3. Cloudflare DNS setup (or adjust certresolver in docker-compose.yml)

## Setup Instructions

### 1. Environment Configuration

Copy the example environment file and configure your values:

```bash
cp .env.example server/.env
```

Edit `server/.env` with your actual values:
- AWS credentials and S3 bucket information
- JWT secret for authentication
- Other application-specific settings

For the client, create `client/.env.local`:
```bash
echo "NEXT_PUBLIC_API_URL=https://s3-upload-api.ashmatrix.com" > client/.env.local
```

### 2. DNS Configuration

Ensure these subdomains point to your homelab server:
- `s3-upload.ashmatrix.com` (client)
- `s3-upload-api.ashmatrix.com` (server API)

### 3. Deploy with Docker Compose

```bash
# Build and start the services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the services
docker-compose down
```

## Service Details

### Client (Next.js Frontend)
- **URL**: https://s3-upload.ashmatrix.com
- **Port**: 3000 (internal)
- **Build**: Multi-stage Node.js build with production optimization

### Server (Bun/Hono API)
- **URL**: https://s3-upload-api.ashmatrix.com  
- **Port**: 3000 (internal)
- **Runtime**: Bun with Hono framework
- **Features**: S3 integration, image processing

## Traefik Labels Explained

The docker-compose.yml includes Traefik labels for:
- Automatic HTTPS with Cloudflare DNS challenge
- Routing based on hostnames
- Load balancing to container ports

## Troubleshooting

### Check container status:
```bash
docker-compose ps
```

### View logs:
```bash
docker-compose logs s3-upload-client
docker-compose logs s3-upload-server
```

### Rebuild after code changes:
```bash
docker-compose build --no-cache
docker-compose up -d
```

### Update Traefik configuration:
Make sure your Traefik instance can reach the containers by ensuring they're on the same Docker network or adjust the network configuration accordingly.