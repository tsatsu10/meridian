import { Context, Next } from 'hono';
import { getDatabase, getRawSQLClient } from '../database/connection';
import logger from '../utils/logger';

interface DatabaseValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  connectionInfo: {
    databaseType: string;
    databaseName: string;
    host: string;
  };
}

class DatabaseValidator {
  private static instance: DatabaseValidator;
  private validationCache: Map<string, { result: DatabaseValidationResult; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds cache

  private readonly REQUIRED_TABLES = [
    'user',
    'workspace',
    'project',
    'task',
    'message',
    'channel'
  ];

  private readonly EXPECTED_DATABASE_TYPE = process.env.DATABASE_TYPE || 'postgresql';
  private readonly EXPECTED_DATABASE_URL_PATTERN = process.env.DATABASE_URL || '';

  static getInstance(): DatabaseValidator {
    if (!DatabaseValidator.instance) {
      DatabaseValidator.instance = new DatabaseValidator();
    }
    return DatabaseValidator.instance;
  }

  async validateDatabase(): Promise<DatabaseValidationResult> {
    const cacheKey = 'database_validation';
    const cached = this.validationCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.result;
    }

    const result: DatabaseValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      connectionInfo: {
        databaseType: 'unknown',
        databaseName: 'unknown',
        host: 'unknown'
      }
    };

    try {
      // Database validation based on environment
      const isProduction = process.env.NODE_ENV === 'production';

      if (isProduction) {
        // Production: Enforce PostgreSQL with Neon
        if (process.env.DATABASE_TYPE && process.env.DATABASE_TYPE !== 'postgresql') {
          result.errors.push(`Database type must be PostgreSQL in production, got '${process.env.DATABASE_TYPE}'`);
          result.isValid = false;
        }

        if (!process.env.DATABASE_URL?.includes('neon.tech')) {
          result.errors.push('Database URL does not point to Neon PostgreSQL database');
          result.isValid = false;
        }
      } else {
        // Only PostgreSQL is allowed
        const databaseType = process.env.DATABASE_TYPE || 'postgresql';
        if (databaseType !== 'postgresql') {
          result.errors.push(`Database type must be 'postgresql', got '${databaseType}'`);
          result.isValid = false;
        }
      }

      // Database connection validation
      const sql = getRawSQLClient();
      if (!sql) {
        result.errors.push('Database client not available');
        result.isValid = false;
        return result;
      }

      // Test basic database connection with PostgreSQL query
      const connectionTest = await sql.query('SELECT current_database(), current_user, version()');

      if (!connectionTest || !connectionTest.rows || connectionTest.rows.length === 0) {
        result.errors.push('Failed to execute basic connection test query');
        result.isValid = false;
        return result;
      }

        // Extract connection info for PostgreSQL
        const row = connectionTest.rows[0] as any;
        result.connectionInfo = {
          databaseType: 'postgresql',
          databaseName: String(row.current_database || 'unknown'),
          host: process.env.DATABASE_URL?.includes('neon.tech') ? 'neon.tech' : 'unknown'
        };

        // Validate required tables exist for PostgreSQL
        const tablesQuery = await sql.query(`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
          ORDER BY table_name
        `);

        const existingTables = tablesQuery.rows.map(row => String((row as any).table_name));
        const missingTables = this.REQUIRED_TABLES.filter(table => !existingTables.includes(table));

        if (missingTables.length > 0) {
          result.errors.push(`Missing required tables: ${missingTables.join(', ')}`);
          result.isValid = false;
        }

        // Validate demo data exists
        for (const table of this.REQUIRED_TABLES) {
          try {
            // Use parameterized query for table counting (PostgreSQL Pool doesn't have unsafe method)
            const countQuery = await sql.query(`SELECT COUNT(*) as count FROM "${table}"`);
            const count = Number((countQuery.rows[0] as any)?.count || 0);
            if (count === 0 && table !== 'channel') { // channel can be empty
              result.warnings.push(`Table '${table}' has no data`);
            }
          } catch (error) {
            // Don't fail validation if a table doesn't exist, just warn
            result.warnings.push(`Could not query table '${table}': ${error}`);
          }
        }

      // Only PostgreSQL is supported

      // Cache successful validation
      this.validationCache.set(cacheKey, { result, timestamp: Date.now() });

    } catch (error) {
      result.errors.push(`Database validation failed: ${error}`);
      result.isValid = false;
      logger.error('Database validation error:', error);
    }

    return result;
  }

  async validateOnStartup(): Promise<void> {
    logger.info('🔍 Performing database validation on startup...');

    const validation = await this.validateDatabase();

    if (!validation.isValid) {
      logger.error('❌ Database validation failed on startup!');
      validation.errors.forEach(error => logger.error(`  - ${error}`));

      // Critical startup validation failure
      throw new Error(`Database validation failed: ${validation.errors.join(', ')}`);
    }

    if (validation.warnings.length > 0) {
      logger.warn('⚠️ Database validation warnings:');
      validation.warnings.forEach(warning => logger.warn(`  - ${warning}`));
    }

    logger.info('✅ Database validation passed on startup');
    logger.info(`📊 Connected to: ${validation.connectionInfo.databaseName} (${validation.connectionInfo.databaseType}) on ${validation.connectionInfo.host}`);
  }

  clearCache(): void {
    this.validationCache.clear();
  }
}

// Startup validation function
export async function validateDatabaseOnStartup(): Promise<void> {
  const validator = DatabaseValidator.getInstance();
  await validator.validateOnStartup();
}

// Runtime validation middleware
export function databaseValidationMiddleware() {
  return async (c: Context, next: Next) => {
    // Skip validation for health check endpoints to avoid circular dependency
    if (c.req.path === '/api/health' || c.req.path === '/api/database-health') {
      await next();
      return;
    }

    const validator = DatabaseValidator.getInstance();

    try {
      const validation = await validator.validateDatabase();

      if (!validation.isValid) {
        logger.error('❌ Runtime database validation failed!');
        validation.errors.forEach(error => logger.error(`  - ${error}`));

        return c.json({
          error: 'Database validation failed',
          details: validation.errors,
          timestamp: new Date().toISOString()
        }, 500);
      }

      // Add validation info to context for debugging
      c.set('databaseValidation', validation);

      await next();
    } catch (error) {
      logger.error('Database validation middleware error:', error);
      return c.json({
        error: 'Database validation error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 500);
    }
  };
}

// Health check endpoint for database monitoring
export function createDatabaseHealthEndpoint() {
  return async (c: Context) => {
    const validator = DatabaseValidator.getInstance();

    try {
      const validation = await validator.validateDatabase();

      return c.json({
        status: validation.isValid ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        database: validation.connectionInfo,
        validation: {
          isValid: validation.isValid,
          errors: validation.errors,
          warnings: validation.warnings
        }
      }, validation.isValid ? 200 : 500);
    } catch (error) {
      return c.json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 500);
    }
  };
}

export default DatabaseValidator;

