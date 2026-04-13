#!/bin/bash
# Staging Deployment Script
# Run this manually to deploy to staging environment

set -e

echo "🚀 Meridian Staging Deployment"
echo "================================"

# Check if .env.staging exists
if [ ! -f ".env.staging" ]; then
  echo "❌ Error: .env.staging not found"
  echo "Copy .env.staging.example and fill in your values"
  exit 1
fi

# Load environment variables
source .env.staging

# Build images
echo "📦 Building Docker images..."
docker compose -f docker-compose.staging.yml build --no-cache

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker compose -f docker-compose.staging.yml down

# Start new containers
echo "🚀 Starting containers..."
docker compose -f docker-compose.staging.yml up -d

# Wait for database to be ready
echo "⏳ Waiting for database..."
sleep 10

# Run migrations
echo "🔄 Running database migrations..."
docker compose -f docker-compose.staging.yml exec -T api pnpm db:push

# Health check
echo "🏥 Running health check..."
MAX_RETRIES=20
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if curl -f http://localhost:3005/api/health 2>/dev/null; then
    echo "✅ API is healthy!"
    break
  fi
  
  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "Attempt $RETRY_COUNT/$MAX_RETRIES - waiting..."
  sleep 3
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "❌ Health check failed after $MAX_RETRIES attempts"
  echo "📋 Checking logs..."
  docker compose -f docker-compose.staging.yml logs api --tail 50
  exit 1
fi

echo "🎉 Deployment successful!"
echo "================================"
echo "Web: http://localhost:8080"
echo "API: http://localhost:3005"
echo "Postgres: localhost:5433"
echo "Redis: localhost:6380"
echo ""
echo "View logs: docker compose -f docker-compose.staging.yml logs -f"
echo "Stop: docker compose -f docker-compose.staging.yml down"

