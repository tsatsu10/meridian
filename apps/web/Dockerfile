# syntax=docker/dockerfile:1

# Build stage
FROM --platform=$BUILDPLATFORM node:20-alpine AS builder

# Native build deps for any node-gyp modules pulled in transitively
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy workspace manifests first for deterministic, cache-friendly install.
# `npm ci` validates the entire workspace tree, so every workspace's
# package.json must be present before install.
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
COPY packages/libs/package.json ./packages/libs/
COPY packages/typescript-config/package.json ./packages/typescript-config/

RUN npm ci

# Copy the source needed to build the web app. @meridian/libs re-exports
# @meridian/api types, so the api source must be present too.
COPY packages/typescript-config ./packages/typescript-config
COPY packages/libs ./packages/libs
COPY apps/api ./apps/api
COPY apps/web ./apps/web

# Build the web app (Vite output lands in apps/web/dist)
RUN npm run build --workspace=@meridian/web

# Production stage with specific version
FROM nginx:1.25-alpine AS runtime

# Create non-root user and configure nginx in a single layer
RUN addgroup -g 1001 appuser && \
    adduser -u 1001 -G appuser -D appuser && \
    # Set permissions for nginx directories
    chown -R appuser:appuser /var/cache/nginx && \
    chmod -R 755 /var/cache/nginx && \
    # Create directory for pid file
    mkdir -p /var/run/nginx && \
    chown -R appuser:appuser /var/run/nginx && \
    chmod -R 755 /var/run/nginx && \
    # Set permissions for nginx pid file
    touch /var/run/nginx.pid && \
    chown appuser:appuser /var/run/nginx.pid && \
    chmod 644 /var/run/nginx.pid && \
    # Update nginx configuration to run as non-root
    sed -i 's/user  nginx;/user  appuser;/' /etc/nginx/nginx.conf && \
    # Remove the user directive completely to avoid warnings
    sed -i 's/user  appuser;//' /etc/nginx/nginx.conf

# Copy built files from builder stage
COPY --from=builder --chown=appuser:appuser /app/apps/web/dist /usr/share/nginx/html

# Copy nginx configuration
COPY --chown=appuser:appuser apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy and set permissions for environment script
COPY --chown=appuser:appuser apps/web/env.sh /docker-entrypoint.d/env.sh
RUN chmod +x /docker-entrypoint.d/env.sh

# Switch to non-root user
USER appuser
EXPOSE 5173

# Use exec form of CMD for proper signal handling
CMD ["nginx", "-g", "daemon off;"]
