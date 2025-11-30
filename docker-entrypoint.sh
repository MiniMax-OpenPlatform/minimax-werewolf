#!/bin/bash
set -e

echo "🐺 Starting AI-Werewolf Game Server..."

# Configure network proxy if provided
if [ -n "$HTTP_PROXY" ]; then
    export http_proxy="$HTTP_PROXY"
    export https_proxy="$HTTP_PROXY"
    echo "✅ Network proxy configured: $HTTP_PROXY"
fi

# Start backend player service in background
echo "🚀 Starting backend player service on port 3001..."
cd /app/packages/player
tsx src/index.ts &
BACKEND_PID=$!

# Wait for backend to be ready
echo "⏳ Waiting for backend to be ready..."
max_attempts=30
attempt=0
while ! curl -s http://localhost:3001/api/health > /dev/null; do
    attempt=$((attempt + 1))
    if [ $attempt -ge $max_attempts ]; then
        echo "❌ Backend failed to start after ${max_attempts} attempts"
        exit 1
    fi
    echo "   Attempt $attempt/$max_attempts..."
    sleep 1
done

echo "✅ Backend is ready!"

# Start Nginx in foreground
echo "🌐 Starting Nginx on port 5001..."
exec nginx -g 'daemon off;'
