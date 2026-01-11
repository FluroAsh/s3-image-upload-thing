# Getting Started

## Run with Docker

```bash
cd .docker && docker compose up --build
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
