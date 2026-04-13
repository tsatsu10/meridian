// Clean database configuration for PostgreSQL (Neon)
// Single source of truth for database settings

import { z } from 'zod';

// Environment variable schema validation for PostgreSQL
const DatabaseConfigSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_MAX_CONNECTIONS: z.string().transform(Number).default('20'), // Increased for production load
  DATABASE_IDLE_TIMEOUT: z.string().transform(Number).default('300000'), // 5 minutes for production
  DATABASE_CONNECT_TIMEOUT: z.string().transform(Number).default('10000'),
  DATABASE_STATEMENT_TIMEOUT: z.string().transform(Number).default('60000'), // 1 minute for long queries
  DATABASE_MAX_LIFETIME: z.string().transform(Number).default('3600000'), // 1 hour max connection lifetime
});

export interface DatabaseConfig {
  url: string;
  maxConnections: number;
  idleTimeout: number;
  connectTimeout: number;
  statementTimeout: number;
  maxLifetime: number;
}

/**
 * Get validated database configuration from environment variables
 */
export function getDatabaseConfig(): DatabaseConfig {
  try {
    const env = DatabaseConfigSchema.parse({
      DATABASE_URL: process.env.DATABASE_URL,
      DATABASE_MAX_CONNECTIONS: process.env.DATABASE_MAX_CONNECTIONS || '20',
      DATABASE_IDLE_TIMEOUT: process.env.DATABASE_IDLE_TIMEOUT || '300000',
      DATABASE_CONNECT_TIMEOUT: process.env.DATABASE_CONNECT_TIMEOUT || '10000',
      DATABASE_STATEMENT_TIMEOUT: process.env.DATABASE_STATEMENT_TIMEOUT || '60000',
      DATABASE_MAX_LIFETIME: process.env.DATABASE_MAX_LIFETIME || '3600000',
    });

    return {
      url: env.DATABASE_URL,
      maxConnections: env.DATABASE_MAX_CONNECTIONS,
      idleTimeout: env.DATABASE_IDLE_TIMEOUT,
      connectTimeout: env.DATABASE_CONNECT_TIMEOUT,
      statementTimeout: env.DATABASE_STATEMENT_TIMEOUT,
      maxLifetime: env.DATABASE_MAX_LIFETIME,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Database configuration error: ${issues}`);
    }
    throw error;
  }
}

/**
 * Get database connection info for logging (without sensitive data)
 */
export function getDatabaseInfo(): string {
  const config = getDatabaseConfig();
  const url = new URL(config.url);
  return `PostgreSQL at ${url.hostname}:${url.port}/${url.pathname.slice(1)}`;
}

/**
 * Get database type from environment
 */
export function getDatabaseType(): string {
  // FORCED: Always return PostgreSQL per user's explicit requirement
  return 'postgresql';
}

/**
 * Check if database configuration is valid
 */
export function validateDatabaseConfig(): { isValid: boolean; errors: string[] } {
  try {
    getDatabaseConfig();
    return { isValid: true, errors: [] };
  } catch (error) {
    return {
      isValid: false,
      errors: [error instanceof Error ? error.message : 'Unknown configuration error']
    };
  }
}

