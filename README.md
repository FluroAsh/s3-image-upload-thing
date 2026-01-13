# Getting Started

## Run with Docker

```bash
docker compose build --no-cache && docker compose up -d
```

This should trigger both the client and server to build and start, in sequence.

## Run Locally

Start the server first:

```bash
cd server && npm run dev
```

And then start the client:

```bash
cd client && npm run dev
```
