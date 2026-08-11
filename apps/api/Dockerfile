# syntax=docker/dockerfile:1

# Build stage
FROM --platform=$BUILDPLATFORM node:20-alpine AS builder

# Native build deps for node-gyp modules (bcrypt, etc.)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy workspace manifests first. `npm ci` validates the entire workspace
# tree, so every workspace's package.json must be present before install.
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/libs/package.json ./packages/libs/
COPY packages/typescript-config/package.json ./packages/typescript-config/

RUN npm ci

# Copy source needed to build the api
COPY packages/typescript-config ./packages/typescript-config
COPY packages/libs ./packages/libs
COPY apps/api ./apps/api

# Build the api (esbuild bundle -> apps/api/dist/index.js)
RUN npm run build --workspace=@meridian/api

# Production-dependencies stage. Runs under the target platform so native
# modules (bcrypt / @node-rs/argon2) are compiled for the right arch, then
# only the pruned node_modules is carried into the runtime image.
FROM node:20-alpine AS prod-deps

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/libs/package.json ./packages/libs/
COPY packages/typescript-config/package.json ./packages/typescript-config/

RUN HUSKY=0 NODE_ENV=production npm ci --omit=dev

# Runtime stage
FROM node:20-alpine AS runtime

# Non-root user
RUN addgroup -g 1001 appuser && \
    adduser -u 1001 -G appuser -D appuser && \
    mkdir -p /app && \
    chown -R appuser:appuser /app

WORKDIR /app

# Production dependencies (hoisted to the workspace root node_modules)
COPY --from=prod-deps --chown=appuser:appuser /app/node_modules ./node_modules

# Built app + migrations + manifest
COPY --from=builder --chown=appuser:appuser /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=appuser:appuser /app/apps/api/drizzle ./apps/api/drizzle
COPY --from=builder --chown=appuser:appuser /app/apps/api/package.json ./apps/api/package.json

ENV NODE_ENV=production

USER appuser
WORKDIR /app/apps/api
EXPOSE 3005

# Liveness probe hits the public /api/health endpoint (see src/index.ts)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3005/api/health || exit 1

CMD ["node", "--enable-source-maps", "dist/index.js"]
