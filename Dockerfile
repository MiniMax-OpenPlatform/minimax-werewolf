# Multi-stage build for AI-Werewolf game
FROM node:22-alpine AS builder

# Set proxy for network access
ARG PROXY_URL=http://pac-internal.xaminim.com:3129
ARG NO_PROXY=localhost,127.0.0.1,*.xaminim.com,10.0.0.0/8

ENV http_proxy=${PROXY_URL} \
    https_proxy=${PROXY_URL} \
    ftp_proxy=${PROXY_URL} \
    no_proxy=${NO_PROXY}

# Use Chinese mirrors for faster downloads
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./
COPY packages/player/package.json ./packages/player/
COPY packages/game-master-vite/package.json ./packages/game-master-vite/
COPY shared/types/package.json ./shared/types/
COPY shared/lib/package.json ./shared/lib/

# Configure npm to use Chinese mirror
RUN npm config set registry https://registry.npmmirror.com

# Temporarily remove overrides that conflict with npm
# (Bun needs these, but npm doesn't handle them well with direct dependencies)
RUN sed -i '/"overrides":/,/}/d' package.json

# Replace workspace:* dependencies with file: protocol (npm doesn't support workspace:)
RUN sed -i 's|"@ai-werewolf/lib": "workspace:\*"|"@ai-werewolf/lib": "file:../../shared/lib"|g' packages/player/package.json && \
    sed -i 's|"@ai-werewolf/types": "workspace:\*"|"@ai-werewolf/types": "file:../../shared/types"|g' packages/player/package.json && \
    sed -i 's|"@ai-werewolf/lib": "workspace:\*"|"@ai-werewolf/lib": "file:../../shared/lib"|g' packages/game-master-vite/package.json && \
    sed -i 's|"@ai-werewolf/types": "workspace:\*"|"@ai-werewolf/types": "file:../../shared/types"|g' packages/game-master-vite/package.json && \
    sed -i 's|"@ai-werewolf/types": "workspace:\*"|"@ai-werewolf/types": "file:../types"|g' shared/lib/package.json

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy all source code
COPY packages ./packages
COPY shared ./shared
COPY tsconfig.json ./

# Copy audio files for immersive mode
COPY audio ./audio

# Install tsx globally for running TypeScript directly
RUN npm install -g tsx

# Build frontend only (backend will use tsx to run TypeScript directly)
WORKDIR /app/packages/game-master-vite
RUN npm run build

# Production stage
FROM node:22-alpine

# Set proxy for network access
ARG PROXY_URL=http://pac-internal.xaminim.com:3129
ARG NO_PROXY=localhost,127.0.0.1,*.xaminim.com,10.0.0.0/8

ENV http_proxy=${PROXY_URL} \
    https_proxy=${PROXY_URL} \
    ftp_proxy=${PROXY_URL} \
    no_proxy=${NO_PROXY}

# Use Chinese mirrors
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# Install nginx, curl, and bash
RUN apk add --no-cache nginx curl bash

# Install tsx globally for running TypeScript
RUN npm install -g tsx

# Set working directory
WORKDIR /app

# Copy frontend static files
COPY --from=builder /app/packages/game-master-vite/dist /app/frontend

# Copy audio files to frontend for serving
COPY --from=builder /app/audio /app/frontend/audio

# Copy backend source code (tsx will run TypeScript directly)
COPY --from=builder /app/packages/player/src /app/packages/player/src
COPY --from=builder /app/packages/player/package.json /app/packages/player/package.json
COPY --from=builder /app/packages/player/tsconfig.json /app/packages/player/tsconfig.json

# Copy shared libraries
COPY --from=builder /app/shared /app/shared

# Copy node_modules (production dependencies)
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/tsconfig.json /app/tsconfig.json

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Create game logs directory
RUN mkdir -p /app/game-logs && \
    chmod 777 /app/game-logs

# Expose port 5001
EXPOSE 5001

# Set entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]
