#!/bin/bash
# Staging Rollback Script
# Rollback to previous Docker image version

set -e

echo "🔄 Meridian Staging Rollback"
echo "================================"

# Check if backup tag exists
BACKUP_TAG=${1:-previous}

echo "Rolling back to tag: $BACKUP_TAG"

# Update docker-compose to use backup tag
echo "📦 Pulling backup images..."
docker pull ghcr.io/meridian/api:$BACKUP_TAG || echo "No API backup found"
docker pull ghcr.io/meridian/web:$BACKUP_TAG || echo "No Web backup found"

# Tag as latest
docker tag ghcr.io/meridian/api:$BACKUP_TAG ghcr.io/meridian/api:staging-latest
docker tag ghcr.io/meridian/web:$BACKUP_TAG ghcr.io/meridian/web:staging-latest

# Restart services
echo "🔄 Restarting services..."
docker compose -f docker-compose.staging.yml up -d

# Health check
echo "🏥 Health check..."
sleep 5

if curl -f http://localhost:3005/api/health; then
  echo "✅ Rollback successful!"
else
  echo "❌ Rollback failed - check logs"
  docker compose -f docker-compose.staging.yml logs api --tail 50
  exit 1
fi

echo "================================"
echo "Rollback to $BACKUP_TAG complete"

