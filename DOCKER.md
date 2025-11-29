# Docker Deployment Guide

This guide explains how to deploy the AI-Werewolf game using Docker.

## Architecture

The Docker deployment uses a single container with:
- **Nginx** (port 80) - Serves frontend static files and proxies API requests
- **Backend** (port 3001, internal) - Player service managing all AI players
- **Frontend** (static files) - React UI built with Vite

```
External Port 80
       ↓
    Nginx
    ├── / → Frontend static files
    └── /api/* → Backend (localhost:3001)
```

## Prerequisites

1. Docker installed
2. Docker Compose installed (optional, but recommended)
3. Environment variables configured (see below)

## Environment Configuration

Create a `.env` file in the project root:

```bash
# Required: AI Provider Configuration
OPENROUTER_API_KEY=your_openrouter_api_key_here
AI_MODEL=google/gemini-2.5-flash

# Optional: Langfuse Telemetry
LANGFUSE_SECRET_KEY=your_langfuse_secret_key
LANGFUSE_PUBLIC_KEY=your_langfuse_public_key
LANGFUSE_BASEURL=https://us.cloud.langfuse.com
```

## Quick Start (Docker Compose)

The easiest way to run the application:

```bash
# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

Access the game at http://localhost

## Manual Docker Commands

If you prefer not to use Docker Compose:

### Build the Image

```bash
docker build -t ai-werewolf:latest .
```

### Run the Container

```bash
docker run -d \
  --name ai-werewolf-game \
  -p 80:80 \
  -e OPENROUTER_API_KEY=your_api_key \
  -e AI_MODEL=google/gemini-2.5-flash \
  ai-werewolf:latest
```

### View Logs

```bash
docker logs -f ai-werewolf-game
```

### Stop and Remove

```bash
docker stop ai-werewolf-game
docker rm ai-werewolf-game
```

## Health Check

The container includes a health check endpoint:

```bash
curl http://localhost/health
```

Backend health check:

```bash
curl http://localhost/api/health
```

## Configuration

### Port Mapping

By default, the container exposes port 80. To use a different external port:

```bash
# Use port 8080 instead
docker run -p 8080:80 ai-werewolf:latest
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENROUTER_API_KEY` | Yes | - | OpenRouter API key for AI model access |
| `AI_MODEL` | No | `google/gemini-2.5-flash` | AI model to use |
| `LANGFUSE_SECRET_KEY` | No | - | Langfuse telemetry secret key |
| `LANGFUSE_PUBLIC_KEY` | No | - | Langfuse telemetry public key |
| `LANGFUSE_BASEURL` | No | `https://us.cloud.langfuse.com` | Langfuse API endpoint |

## Troubleshooting

### Container fails to start

Check logs:
```bash
docker logs ai-werewolf-game
```

### Backend not responding

1. Check if backend is running inside container:
```bash
docker exec ai-werewolf-game curl http://localhost:3001/api/health
```

2. Check nginx logs:
```bash
docker exec ai-werewolf-game cat /var/log/nginx/error.log
```

### API key issues

Ensure the `OPENROUTER_API_KEY` environment variable is set correctly:
```bash
docker exec ai-werewolf-game env | grep OPENROUTER
```

## Production Deployment

For production deployment, consider:

1. **Use HTTPS**: Put the container behind a reverse proxy (e.g., Caddy, Traefik) with SSL
2. **Resource Limits**: Set memory and CPU limits
3. **Persistent Logs**: Mount log volumes for persistence
4. **Environment Security**: Use Docker secrets instead of environment variables

### Example with Resource Limits

```bash
docker run -d \
  --name ai-werewolf-game \
  -p 80:80 \
  --memory="1g" \
  --cpus="1.0" \
  -e OPENROUTER_API_KEY=your_api_key \
  ai-werewolf:latest
```

## Development vs Production

This Docker setup is designed for production deployment. For development:
- Use `bun run dev:players` for backend
- Use `bun run dev:game-master` for frontend
- See main README.md for development instructions
