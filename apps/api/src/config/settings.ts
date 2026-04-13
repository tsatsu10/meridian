/**
 * 🎛️ Centralized Application Settings
 *
 * Single source of truth for all application configuration.
 * ALL configuration should come from environment variables defined here.
 */
import logger from '../utils/logger';
import { DEFAULT_API_PORT } from './default-api-port';

import 'dotenv/config';

export interface AppSettings {
  // Environment
  nodeEnv: 'development' | 'production' | 'test';
  isDemoMode: boolean;
  apiPort: number;
  host: string;

  // Authentication
  adminEmail: string;
  jwtSecret: string;

  // Database
  databaseType: 'sqlite' | 'postgresql';
  databaseUrl: string;

  // Security
  corsOrigins: string[];

  // Features
  emailEnabled: boolean;
}

/**
 * Load and validate settings from environment
 */
function loadSettings(): AppSettings {
  const settings: AppSettings = {
    // Environment
    nodeEnv: (process.env.NODE_ENV as any) || 'development',
    isDemoMode: process.env.DEMO_MODE === 'true',
    apiPort: parseInt(process.env.API_PORT || String(DEFAULT_API_PORT), 10),
    host: process.env.HOST || 'localhost',

    // Authentication - SINGLE SOURCE OF TRUTH
    adminEmail: process.env.ADMIN_EMAIL || 'admin@meridian.app',
    jwtSecret: process.env.JWT_SECRET || 'meridian-dev-secret',

    // Database
    databaseType: (process.env.DATABASE_TYPE as any) || 'postgresql',
    databaseUrl: process.env.DATABASE_URL || '',

    // Security
    corsOrigins: (process.env.CORS_ORIGINS || '').split(',').filter(Boolean),

    // Features
    emailEnabled: !!(process.env.EMAIL_HOST && process.env.EMAIL_USER),
  };

  // Validate critical settings
  if (!settings.databaseUrl) {
    logger.warn('⚠️  DATABASE_URL not set');
  }

  if (!settings.jwtSecret || settings.jwtSecret === 'meridian-dev-secret') {
    logger.warn('⚠️  Using default JWT_SECRET - not secure for production!');
  }

  return settings;
}

// Export singleton instance
export const appSettings = loadSettings();

/**
 * Helper function for backwards compatibility
 */
export function getSettings() {
  return {
    isDemoMode: appSettings.isDemoMode,
    adminEmail: appSettings.adminEmail,
  };
}

export default appSettings;

