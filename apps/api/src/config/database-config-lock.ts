import logger from '../utils/logger';
import crypto from 'crypto';

interface DatabaseConfigLock {
  databaseType: string;
  databaseUrl: string;
  configHash: string;
  lockedAt: string;
  environment: string;
}

class DatabaseConfigurationLock {
  private static instance: DatabaseConfigurationLock;
  private readonly CONFIG_LOCK_FILE = 'database-config.lock';
  private lockedConfig: DatabaseConfigLock | null = null;

  // This is the EXPECTED configuration - it should NEVER change during runtime
  private readonly EXPECTED_CONFIG = this.getExpectedConfig();

  private getExpectedConfig() {
    const env = process.env.NODE_ENV || 'development';

    // Only PostgreSQL is supported
    return {
      databaseType: 'postgresql',
      databaseUrlPattern: 'neon.tech',
      environment: env
    };
  }

  static getInstance(): DatabaseConfigurationLock {
    if (!DatabaseConfigurationLock.instance) {
      DatabaseConfigurationLock.instance = new DatabaseConfigurationLock();
    }
    return DatabaseConfigurationLock.instance;
  }

  private generateConfigHash(config: { databaseType: string; databaseUrl: string }): string {
    // Create a hash of the essential configuration to detect changes
    const configString = `${config.databaseType}:${config.databaseUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`;
    return crypto.createHash('sha256').update(configString).digest('hex').substring(0, 16);
  }

  private getCurrentConfig(): { databaseType: string; databaseUrl: string } {
    const databaseUrl = process.env.DATABASE_URL || 'unknown';

    // Only PostgreSQL is supported
    const databaseType = 'postgresql';

    return {
      databaseType,
      databaseUrl
    };
  }

  private validateExpectedConfiguration(): string[] {
    const errors: string[] = [];
    const currentConfig = this.getCurrentConfig();

    // Validate database type - only PostgreSQL is allowed
    if (currentConfig.databaseType !== 'postgresql') {
      errors.push(`Database type must be 'postgresql', got '${currentConfig.databaseType}'`);
    }

    // Validate database URL pattern for Neon PostgreSQL
    if (!currentConfig.databaseUrl.includes('neon.tech')) {
      errors.push('Database URL must point to Neon PostgreSQL database');
    }

    // Validate environment
    if (process.env.NODE_ENV !== this.EXPECTED_CONFIG.environment) {
      errors.push(`Environment mismatch: expected '${this.EXPECTED_CONFIG.environment}', got '${process.env.NODE_ENV}'`);
    }

    return errors;
  }

  async lockConfiguration(): Promise<void> {
    logger.info('🔒 Locking database configuration...');

    // First validate against expected configuration
    const validationErrors = this.validateExpectedConfiguration();
    if (validationErrors.length > 0) {
      const errorMessage = `Database configuration validation failed:\n${validationErrors.map(e => `  - ${e}`).join('\n')}`;
      logger.error(errorMessage);
      throw new Error(`Configuration validation failed: ${validationErrors.join(', ')}`);
    }

    const currentConfig = this.getCurrentConfig();
    const configHash = this.generateConfigHash(currentConfig);

    this.lockedConfig = {
      databaseType: currentConfig.databaseType,
      databaseUrl: currentConfig.databaseUrl,
      configHash,
      lockedAt: new Date().toISOString(),
      environment: this.EXPECTED_CONFIG.environment
    };

    logger.info('✅ Database configuration locked successfully');
    logger.info(`📋 Locked config: ${currentConfig.databaseType} database (hash: ${configHash})`);
  }

  validateAgainstLock(): { isValid: boolean; errors: string[] } {
    if (!this.lockedConfig) {
      return {
        isValid: false,
        errors: ['Configuration not locked - call lockConfiguration() first']
      };
    }

    const errors: string[] = [];
    const currentConfig = this.getCurrentConfig();
    const currentHash = this.generateConfigHash(currentConfig);

    // Check if configuration has changed since lock
    if (currentHash !== this.lockedConfig.configHash) {
      errors.push('Database configuration has changed since application startup');
      errors.push(`Expected hash: ${this.lockedConfig.configHash}, current hash: ${currentHash}`);
    }

    // Validate database type hasn't changed
    if (currentConfig.databaseType !== this.lockedConfig.databaseType) {
      errors.push(`Database type changed: expected '${this.lockedConfig.databaseType}', got '${currentConfig.databaseType}'`);
    }

    // Validate URL pattern hasn't changed
    if (currentConfig.databaseUrl !== this.lockedConfig.databaseUrl) {
      errors.push('Database URL has changed since startup');
    }

    // Validate against expected configuration
    const expectedValidationErrors = this.validateExpectedConfiguration();
    errors.push(...expectedValidationErrors);

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  getLockedConfiguration(): DatabaseConfigLock | null {
    return this.lockedConfig;
  }

  isConfigurationLocked(): boolean {
    return this.lockedConfig !== null;
  }

  // For emergency situations - should NEVER be called in normal operation
  emergencyUnlock(reason: string): void {
    logger.warn(`⚠️ EMERGENCY UNLOCK of database configuration. Reason: ${reason}`);
    logger.warn('🚨 This should NEVER happen in normal operation!');
    this.lockedConfig = null;
  }
}

// Startup function to lock configuration
export async function lockDatabaseConfigurationOnStartup(): Promise<void> {
  const configLock = DatabaseConfigurationLock.getInstance();
  await configLock.lockConfiguration();
}

// Runtime function to validate configuration hasn't changed
export function validateDatabaseConfigurationLock(): { isValid: boolean; errors: string[] } {
  const configLock = DatabaseConfigurationLock.getInstance();
  return configLock.validateAgainstLock();
}

// Get current locked configuration for monitoring
export function getLockedDatabaseConfiguration(): DatabaseConfigLock | null {
  const configLock = DatabaseConfigurationLock.getInstance();
  return configLock.getLockedConfiguration();
}

export default DatabaseConfigurationLock;

