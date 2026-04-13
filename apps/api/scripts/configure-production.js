#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Production Environment Configuration Script
 * 
 * This script helps configure Meridian for production deployment by:
 * 1. Validating required environment variables
 * 2. Generating secure secrets
 * 3. Creating production-ready configurations
 * 4. Running security checks
 */

class ProductionConfigurator {
  constructor() {
    this.envPath = path.join(__dirname, '..', '.env.production');
    this.templatePath = path.join(__dirname, '..', '.env.production.template');
    this.requiredVars = [
      'DATABASE_URL',
      'JWT_SECRET',
      'CORS_ORIGINS',
      'EMAIL_HOST',
      'EMAIL_USER',
      'EMAIL_PASS',
      'ADMIN_EMAIL'
    ];
    this.config = {};
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m', // Green
      warning: '\x1b[33m', // Yellow
      error: '\x1b[31m',   // Red
      reset: '\x1b[0m'     // Reset
    };
    
    const prefix = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };
    
    console.log(`${colors[type]}${prefix[type]} ${message}${colors.reset}`);
  }

  generateSecureSecret(length = 64) {
    return crypto.randomBytes(length).toString('hex');
  }

  generateJWTSecret() {
    return crypto.randomBytes(64).toString('base64url');
  }

  async generateVAPIDKeys() {
    try {
      const webpush = require('web-push');
      return webpush.generateVAPIDKeys();
    } catch (error) {
      this.log('web-push package not found. Install with: npm install web-push', 'warning');
      return {
        publicKey: 'GENERATE_VAPID_KEYS_MANUALLY',
        privateKey: 'RUN_npx_web-push_generate-vapid-keys'
      };
    }
  }

  loadTemplate() {
    try {
      if (!fs.existsSync(this.templatePath)) {
        throw new Error('Production template not found');
      }
      
      const template = fs.readFileSync(this.templatePath, 'utf-8');
      this.log('Production template loaded successfully', 'success');
      return template;
    } catch (error) {
      this.log(`Failed to load template: ${error.message}`, 'error');
      throw error;
    }
  }

  loadExistingConfig() {
    try {
      if (fs.existsSync(this.envPath)) {
        const existing = fs.readFileSync(this.envPath, 'utf-8');
        const lines = existing.split('\n');
        
        lines.forEach(line => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=');
            if (key && valueParts.length > 0) {
              this.config[key.trim()] = valueParts.join('=').replace(/^"/, '').replace(/"$/, '');
            }
          }
        });
        
        this.log('Existing configuration loaded', 'info');
      }
    } catch (error) {
      this.log(`Error loading existing config: ${error.message}`, 'warning');
    }
  }

  validateDatabase() {
    const dbUrl = this.config.DATABASE_URL || '';
    
    if (!dbUrl) {
      this.log('DATABASE_URL is required', 'error');
      return false;
    }
    
    if (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) {
      this.log('DATABASE_URL should point to a production database, not localhost', 'warning');
    }
    
    if (!dbUrl.includes('sslmode=require')) {
      this.log('DATABASE_URL should include sslmode=require for security', 'warning');
    }
    
    if (dbUrl.includes('neon.tech')) {
      this.log('Neon PostgreSQL detected - excellent choice for production!', 'success');
    }
    
    return true;
  }

  validateSecurity() {
    let securityScore = 0;
    let maxScore = 8;
    
    // Check JWT secret
    const jwtSecret = this.config.JWT_SECRET || '';
    if (jwtSecret.length >= 32) {
      securityScore++;
      this.log('JWT secret length is secure', 'success');
    } else {
      this.log('JWT secret should be at least 32 characters', 'warning');
    }
    
    // Check CORS origins
    const corsOrigins = this.config.CORS_ORIGINS || '';
    if (!corsOrigins.includes('localhost')) {
      securityScore++;
      this.log('CORS origins properly configured for production', 'success');
    } else {
      this.log('CORS origins should not include localhost in production', 'warning');
    }
    
    // Check demo mode
    if (this.config.DEMO_MODE === 'false') {
      securityScore++;
      this.log('Demo mode properly disabled', 'success');
    } else {
      this.log('Demo mode should be set to false in production', 'error');
    }
    
    // Check environment
    if (this.config.NODE_ENV === 'production') {
      securityScore++;
      this.log('NODE_ENV properly set to production', 'success');
    } else {
      this.log('NODE_ENV should be set to production', 'error');
    }
    
    // Check logging
    if (this.config.STRUCTURED_LOGS === 'true') {
      securityScore++;
      this.log('Structured logging enabled for production', 'success');
    }
    
    // Check SSL/HTTPS
    const appUrl = this.config.APP_URL || '';
    if (appUrl.startsWith('https://')) {
      securityScore++;
      this.log('HTTPS properly configured', 'success');
    } else {
      this.log('APP_URL should use HTTPS in production', 'warning');
    }
    
    // Check email configuration
    if (this.config.EMAIL_HOST && this.config.EMAIL_USER) {
      securityScore++;
      this.log('Email configuration present', 'success');
    } else {
      this.log('Email configuration missing', 'warning');
    }
    
    // Check monitoring
    if (this.config.SENTRY_DSN || this.config.DATADOG_API_KEY) {
      securityScore++;
      this.log('Error monitoring configured', 'success');
    } else {
      this.log('Consider configuring error monitoring (Sentry, DataDog)', 'info');
    }
    
    const percentage = Math.round((securityScore / maxScore) * 100);
    this.log(`Security score: ${securityScore}/${maxScore} (${percentage}%)`, 
             percentage >= 75 ? 'success' : percentage >= 50 ? 'warning' : 'error');
    
    return percentage >= 75;
  }

  async generateConfiguration() {
    this.log('Generating production configuration...', 'info');
    
    const template = this.loadTemplate();
    this.loadExistingConfig();
    
    // Generate missing secrets
    if (!this.config.JWT_SECRET) {
      this.config.JWT_SECRET = this.generateJWTSecret();
      this.log('Generated new JWT secret', 'success');
    }
    
    if (!this.config.VAPID_PUBLIC_KEY || !this.config.VAPID_PRIVATE_KEY) {
      const vapidKeys = await this.generateVAPIDKeys();
      this.config.VAPID_PUBLIC_KEY = vapidKeys.publicKey;
      this.config.VAPID_PRIVATE_KEY = vapidKeys.privateKey;
      this.log('Generated VAPID keys for push notifications', 'success');
    }
    
    // Replace placeholders in template
    let production = template;
    Object.entries(this.config).forEach(([key, value]) => {
      const regex = new RegExp(`${key}=.*`, 'g');
      production = production.replace(regex, `${key}="${value}"`);
    });
    
    // Write production configuration
    fs.writeFileSync(this.envPath, production);
    this.log(`Production configuration written to ${this.envPath}`, 'success');
    
    return production;
  }

  validateConfiguration() {
    this.log('Validating production configuration...', 'info');
    
    let isValid = true;
    
    // Check required variables
    for (const varName of this.requiredVars) {
      if (!this.config[varName]) {
        this.log(`Required variable ${varName} is missing`, 'error');
        isValid = false;
      }
    }
    
    // Validate database
    if (!this.validateDatabase()) {
      isValid = false;
    }
    
    // Validate security
    if (!this.validateSecurity()) {
      this.log('Security validation failed - please review configuration', 'warning');
    }
    
    return isValid;
  }

  generateDockerfile() {
    const dockerfile = `# Meridian API Production Dockerfile
FROM node:18-alpine AS base

# Install security updates and necessary packages
RUN apk update && apk upgrade && apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S meridian && \
    adduser -S meridian -u 1001 -G meridian

# Change ownership of the app directory
RUN chown -R meridian:meridian /app
USER meridian

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3005/health || exit 1

# Expose port
EXPOSE 3005

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]`;
    
    const dockerfilePath = path.join(__dirname, '..', 'Dockerfile.production');
    fs.writeFileSync(dockerfilePath, dockerfile);
    this.log('Production Dockerfile generated', 'success');
  }

  generateDockerCompose() {
    const dockerCompose = `version: '3.8'

services:
  meridian-api:
    build:
      context: .
      dockerfile: Dockerfile.production
    container_name: meridian-api-production
    restart: unless-stopped
    env_file:
      - .env.production
    ports:
      - "3005:3005"
    networks:
      - meridian-network
    depends_on:
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3005/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1'
        reservations:
          memory: 512M
          cpus: '0.5'

  redis:
    image: redis:7-alpine
    container_name: meridian-redis-production
    restart: unless-stopped
    ports:
      - "6379:6379"
    networks:
      - meridian-network
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru

  nginx:
    image: nginx:alpine
    container_name: meridian-nginx-production
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl
    networks:
      - meridian-network
    depends_on:
      - meridian-api

networks:
  meridian-network:
    driver: bridge

volumes:
  redis-data:`;
    
    const composePath = path.join(__dirname, '..', 'docker-compose.production.yml');
    fs.writeFileSync(composePath, dockerCompose);
    this.log('Production Docker Compose generated', 'success');
  }

  generateDeploymentScript() {
    const script = `#!/bin/bash

# Meridian Production Deployment Script
set -e

echo "🚀 Starting Meridian production deployment..."

# Check if running as root
if [ "$EUID" -eq 0 ]; then
  echo "⚠️  Don't run this script as root"
  exit 1
fi

# Check required commands
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed"; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose is required but not installed"; exit 1; }

# Check environment file
if [ ! -f .env.production ]; then
  echo "❌ .env.production file not found"
  echo "💡 Run: node scripts/configure-production.js first"
  exit 1
fi

# Build and start services
echo "🔨 Building production images..."
docker-compose -f docker-compose.production.yml build --no-cache

echo "🗂️  Creating volumes and networks..."
docker-compose -f docker-compose.production.yml up -d --force-recreate

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 30

# Check service health
if docker-compose -f docker-compose.production.yml ps | grep -q "unhealthy"; then
  echo "❌ Some services are unhealthy"
  docker-compose -f docker-compose.production.yml logs
  exit 1
fi

echo "✅ Meridian deployed successfully!"
echo "🌐 API available at: http://localhost:3005"
echo "📊 Health check: http://localhost:3005/health"

# Show running services
docker-compose -f docker-compose.production.yml ps`;
    
    const scriptPath = path.join(__dirname, '..', 'deploy-production.sh');
    fs.writeFileSync(scriptPath, script);
    fs.chmodSync(scriptPath, '755');
    this.log('Production deployment script generated', 'success');
  }

  async run() {
    try {
      this.log('🚀 Meridian Production Configuration Tool', 'info');
      this.log('=======================================', 'info');
      
      await this.generateConfiguration();
      
      if (this.validateConfiguration()) {
        this.log('✅ Configuration validation passed!', 'success');
        
        // Generate Docker files
        this.generateDockerfile();
        this.generateDockerCompose();
        this.generateDeploymentScript();
        
        this.log('', 'info');
        this.log('🎉 Production configuration complete!', 'success');
        this.log('', 'info');
        this.log('Next steps:', 'info');
        this.log('1. Review and update .env.production with your actual values', 'info');
        this.log('2. Configure your Neon PostgreSQL database', 'info');
        this.log('3. Set up SSL certificates', 'info');
        this.log('4. Run: ./deploy-production.sh', 'info');
        this.log('', 'info');
        
      } else {
        this.log('❌ Configuration validation failed', 'error');
        this.log('Please fix the issues above and run again', 'error');
        process.exit(1);
      }
      
    } catch (error) {
      this.log(`Configuration failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const configurator = new ProductionConfigurator();
  configurator.run();
}

module.exports = ProductionConfigurator;