/**
 * 🔧 Environment Variable Validation and Management
 * 
 * Comprehensive validation system to prevent deployment misconfigurations
 * and ensure all required environment variables are properly set.
 */

import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger';
import { DEFAULT_API_PORT } from './default-api-port';

// Environment variable schema with validation rules
const envSchema = z.object({
  // Server Configuration
  API_PORT: z
    .string()
    .regex(/^\d+$/, 'API_PORT must be a valid port number')
    .default(String(DEFAULT_API_PORT)),
  HOST: z.string().default('localhost'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Database Configuration
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  
  // Application Configuration
  APP_URL: z.string().url('APP_URL must be a valid URL'),
  DEMO_MODE: z.string().transform(val => val?.toLowerCase() === 'true').default('false'),
  ADMIN_EMAIL: z.string().email('ADMIN_EMAIL must be a valid email').optional(),
  
  // Security Configuration
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5173,http://localhost:5174'),
  
  // Logging Configuration
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  DISABLE_CONSOLE_LOGS: z.string().transform(val => val?.toLowerCase() === 'true').optional(),
  
  // Push Notifications (Optional)
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().email().optional(),
  
  // Email Configuration (Optional)
  EMAIL_HOST: z.string().optional(),
  EMAIL_PORT: z.string().regex(/^\d+$/, 'EMAIL_PORT must be a valid port number').optional(),
  EMAIL_SECURE: z.string().transform(val => val?.toLowerCase() === 'true').optional(),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASS: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  
  // Google Integration (Optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
  
  // Geolocation Service (Optional)
  IPSTACK_API_KEY: z.string().optional(),
  IPSTACK_SECURITY: z.string().transform(val => val?.toLowerCase() === 'true').optional(),
  
  // Weather Service (Optional)
  OPENWEATHERMAP_API_KEY: z.string().optional(),
  OPENWEATHERMAP_UNITS: z.enum(['metric', 'imperial']).optional(),
  
  // Photo Library Service (Optional)
  UNSPLASH_ACCESS_KEY: z.string().optional(),
  UNSPLASH_SECRET_KEY: z.string().optional(),
  UNSPLASH_APP_NAME: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export interface ValidationResult {
  isValid: boolean;
  config?: EnvConfig;
  errors: string[];
  warnings: string[];
  missingRequired: string[];
  missingOptional: string[];
  recommendations: string[];
}

export interface MeridianConfig {
  apiPort: number;
  host: string;
  nodeEnv: 'development' | 'production' | 'test';
  isDemoMode: boolean;
  jwtSecret: string;
  databaseUrl: string;
  corsOrigins: string[];
}

export class EnvironmentValidator {
  private requiredVars = [
    'API_PORT',
    'DATABASE_URL', 
    'APP_URL',
    'JWT_SECRET'
  ];
  
  private optionalVars = [
    'HOST',
    'NODE_ENV',
    'DEMO_MODE',
    'ADMIN_EMAIL',
    'CORS_ORIGINS',
    'LOG_LEVEL',
    'DISABLE_CONSOLE_LOGS',
    'VAPID_PUBLIC_KEY',
    'VAPID_PRIVATE_KEY', 
    'VAPID_SUBJECT',
    'EMAIL_HOST',
    'EMAIL_PORT',
    'EMAIL_SECURE',
    'EMAIL_USER',
    'EMAIL_PASS',
    'EMAIL_FROM',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REDIRECT_URI',
    'IPSTACK_API_KEY',
    'IPSTACK_SECURITY',
    'OPENWEATHERMAP_API_KEY',
    'OPENWEATHERMAP_UNITS',
    'UNSPLASH_ACCESS_KEY',
    'UNSPLASH_SECRET_KEY',
    'UNSPLASH_APP_NAME'
  ];

  /**
   * Validate environment variables against schema
   */
  validateEnvironment(): ValidationResult {
    const result: ValidationResult = {
      isValid: false,
      errors: [],
      warnings: [],
      missingRequired: [],
      missingOptional: [],
      recommendations: []
    };

    try {
      // Parse and validate environment variables
      const parsed = envSchema.safeParse(process.env);
      
      if (!parsed.success) {
        // Extract validation errors
        parsed.error.issues.forEach(issue => {
          const field = issue.path.join('.');
          result.errors.push(`${field}: ${issue.message}`);
        });
      } else {
        result.config = parsed.data;
        result.isValid = true;
      }

      // Check for missing required variables
      this.requiredVars.forEach(varName => {
        if (!process.env[varName]) {
          result.missingRequired.push(varName);
          result.errors.push(`Missing required environment variable: ${varName}`);
        }
      });

      // Check for missing optional variables
      this.optionalVars.forEach(varName => {
        if (!process.env[varName]) {
          result.missingOptional.push(varName);
        }
      });

      // Production-specific validation
      if (process.env.NODE_ENV === 'production') {
        this.validateProductionEnvironment(result);
      }

      // Development-specific warnings
      if (process.env.NODE_ENV === 'development') {
        this.validateDevelopmentEnvironment(result);
      }

      // Security validations
      this.validateSecurityConfiguration(result);

      // Email configuration validation
      this.validateEmailConfiguration(result);

      // Generate recommendations
      this.generateRecommendations(result);

      return result;

    } catch (error) {
      result.errors.push(`Environment validation failed: ${error}`);
      return result;
    }
  }

  /**
   * Validate production-specific requirements
   */
  private validateProductionEnvironment(result: ValidationResult): void {
    // Check DEMO_MODE is disabled in production
    if (process.env.DEMO_MODE?.toLowerCase() === 'true') {
      result.errors.push('DEMO_MODE must be false in production environment');
      result.recommendations.push('Set DEMO_MODE=false for production deployment');
    }

    // Check JWT_SECRET strength
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret && jwtSecret.length < 64) {
      result.warnings.push('JWT_SECRET should be at least 64 characters in production');
      result.recommendations.push('Generate a stronger JWT secret for production');
    }

    // Check for development URLs
    const appUrl = process.env.APP_URL;
    if (appUrl && (appUrl.includes('localhost') || appUrl.includes('127.0.0.1'))) {
      result.warnings.push('APP_URL appears to be a development URL in production');
      result.recommendations.push('Set APP_URL to your production domain');
    }

    // Check SSL configuration
    if (appUrl && !appUrl.startsWith('https://')) {
      result.warnings.push('APP_URL should use HTTPS in production');
      result.recommendations.push('Configure SSL/TLS for production deployment');
    }
  }

  /**
   * Validate development-specific settings
   */
  private validateDevelopmentEnvironment(result: ValidationResult): void {
    // Check if using default JWT secret
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret === 'your-jwt-secret-key-minimum-32-characters') {
      result.warnings.push('Using default JWT_SECRET from .env.example');
      result.recommendations.push('Generate a unique JWT_SECRET for your development environment');
    }
  }

  /**
   * Validate security configuration
   */
  private validateSecurityConfiguration(result: ValidationResult): void {
    // Check JWT secret format
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret) {
      if (jwtSecret.includes(' ') || jwtSecret.includes('\n')) {
        result.errors.push('JWT_SECRET should not contain spaces or newlines');
      }
      
      if (jwtSecret === 'change-me' || jwtSecret === 'secret') {
        result.errors.push('JWT_SECRET is using an insecure default value');
      }
    }

    // Check VAPID keys consistency
    const vapidPublic = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    if ((vapidPublic && !vapidPrivate) || (!vapidPublic && vapidPrivate)) {
      result.warnings.push('VAPID keys should be configured together (both public and private)');
      result.recommendations.push('Generate VAPID keys with: npx web-push generate-vapid-keys');
    }
  }

  /**
   * Validate email configuration
   */
  private validateEmailConfiguration(result: ValidationResult): void {
    const emailVars = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS', 'EMAIL_FROM'];
    const configuredEmailVars = emailVars.filter(varName => process.env[varName]);
    
    if (configuredEmailVars.length > 0 && configuredEmailVars.length < emailVars.length) {
      result.warnings.push('Email configuration is incomplete');
      const missing = emailVars.filter(varName => !process.env[varName]);
      result.recommendations.push(`Configure missing email variables: ${missing.join(', ')}`);
    }

    // Validate email port
    const emailPort = process.env.EMAIL_PORT;
    if (emailPort && (parseInt(emailPort) < 1 || parseInt(emailPort) > 65535)) {
      result.errors.push('EMAIL_PORT must be between 1 and 65535');
    }
  }

  /**
   * Generate helpful recommendations
   */
  private generateRecommendations(result: ValidationResult): void {
    // Missing .env file
    if (result.missingRequired.length > 0) {
      result.recommendations.push('Copy .env.example to .env and configure required variables');
    }

    // Optional features
    if (result.missingOptional.includes('EMAIL_HOST')) {
      result.recommendations.push('Configure email settings to enable invitation emails');
    }

    if (result.missingOptional.includes('VAPID_PUBLIC_KEY')) {
      result.recommendations.push('Configure VAPID keys to enable push notifications');
    }

    if (result.missingOptional.includes('GOOGLE_CLIENT_ID')) {
      result.recommendations.push('Configure Google OAuth for calendar integration');
    }

    if (result.missingOptional.includes('IPSTACK_API_KEY')) {
      result.recommendations.push('Configure ipstack API for geolocation and security tracking');
    }

    if (result.missingOptional.includes('OPENWEATHERMAP_API_KEY')) {
      result.recommendations.push('Configure OpenWeatherMap API for weather widgets and forecasts');
    }

    if (result.missingOptional.includes('UNSPLASH_ACCESS_KEY')) {
      result.recommendations.push('Configure Unsplash API for professional stock photos and backgrounds');
    }

    // Performance recommendations
    if (process.env.LOG_LEVEL === 'debug' && process.env.NODE_ENV === 'production') {
      result.recommendations.push('Set LOG_LEVEL=error or LOG_LEVEL=warn for production');
    }
  }

  /**
   * Display validation results using enhanced logger
   */
  displayValidationResults(result: ValidationResult): void {
    const allMessages = [
      ...result.errors,
      ...result.warnings,
      ...result.missingRequired.map(v => `Missing required: ${v}`),
      ...result.recommendations
    ];

    logger.validationResults('Environment Validation Results', {
      errors: result.errors,
      warnings: result.warnings,
      recommendations: result.recommendations
    });
  }

  /**
   * Validate on startup and exit if critical errors
   */
  validateOnStartup(): EnvConfig {
    const result = this.validateEnvironment();
    this.displayValidationResults(result);

    if (!result.isValid || result.errors.length > 0) {
      logger.error('\n💥 Critical environment validation errors detected!');
      logger.error('   Server cannot start with invalid configuration.');
      logger.error('   Please fix the errors above and restart the server.\n');
      process.exit(1);
    }

    if (result.warnings.length > 0) {
      logger.warn('\n⚠️  Environment warnings detected. Server will continue but consider addressing them.\n');
    }

    return result.config!;
  }
}

// Legacy function for backward compatibility
export function validateEnvironment(): MeridianConfig {
  const errors: string[] = [];
  
  // Required environment variables
  const apiPort = parseInt(process.env.API_PORT || String(DEFAULT_API_PORT), 10);
  const host = process.env.HOST || 'localhost';
  const nodeEnv = (process.env.NODE_ENV || 'development') as MeridianConfig['nodeEnv'];
  const isDemoMode = process.env.DEMO_MODE === 'true';
  const jwtSecret = process.env.JWT_SECRET;
  const databaseUrl = process.env.DATABASE_URL;
  const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173,http://localhost:5174').split(',');

  // Validate port numbers
  if (isNaN(apiPort) || apiPort < 1024 || apiPort > 65535) {
    errors.push(`Invalid API_PORT: ${process.env.API_PORT}. Must be between 1024-65535`);
  }

  if (!jwtSecret) {
    errors.push('Missing JWT_SECRET');
  } else if (jwtSecret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters');
  }

  // Validate node environment
  if (!['development', 'production', 'test'].includes(nodeEnv)) {
    errors.push(`Invalid NODE_ENV: ${nodeEnv}. Must be development, production, or test`);
  }

  // Validate demo mode in production
  if (nodeEnv === 'production' && isDemoMode) {
    errors.push('CRITICAL: Demo mode cannot be enabled in production (DEMO_MODE=true)');
  }
  if (!databaseUrl) {
    errors.push('Missing DATABASE_URL');
  }

  // Validate CORS origins in production
  if (nodeEnv === 'production' && corsOrigins.includes('*')) {
    errors.push('CRITICAL: Wildcard CORS origins (*) not allowed in production');
  }

  if (errors.length > 0) {
    logger.error('❌ Environment Configuration Errors:');
    errors.forEach(error => logger.error(`   - ${error}`));
    process.exit(1);
  }

  const config: MeridianConfig = {
    apiPort,
    host,
    nodeEnv,
    isDemoMode,
    jwtSecret: jwtSecret ?? '',
    databaseUrl: databaseUrl ?? '',
    corsOrigins
  };

  // Log configuration in development
  if (nodeEnv === 'development') {
    logger.info('✅ Environment Configuration:');
    logger.info(`   Unified Server Port: ${apiPort} (HTTP + WebSocket)`);
    logger.info(`   Host: ${host}`);
    logger.info(`   Environment: ${nodeEnv}`);
    logger.info(`   Demo Mode: ${isDemoMode}`);
    logger.info(`   Database: ${databaseUrl}`);
    logger.info(`   CORS Origins: ${corsOrigins.join(', ')}`);
  }

  return config;
}

// Export singleton instance
export const envValidator = new EnvironmentValidator();

export default validateEnvironment;

