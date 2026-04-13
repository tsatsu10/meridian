// PostgreSQL database connection for production with Neon
// Provides reliable cloud database connection

import { drizzle } from 'drizzle-orm/postgres-js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
// Schema: use `./schema` (schema.ts) as the single source of truth for typings and migrations.
import * as schema from './schema';
import logger from '../utils/logger';

/** Drizzle client typed with the full schema (fixes `db.query` / `.query.*` inference). */
export type MeridianDatabase = PostgresJsDatabase<typeof schema>;

/** TLS for postgres.js: off on loopback; on for remote. Override with DATABASE_SSL=true|false */
function resolvePostgresSsl(databaseUrl: string): boolean | 'require' {
  const override = process.env.DATABASE_SSL;
  if (override === 'true') return 'require';
  if (override === 'false') return false;

  try {
    const normalized = databaseUrl.replace(/^postgres(ql)?:\/\//, 'http://');
    const url = new URL(normalized);
    const host = url.hostname.toLowerCase();
    const isLocal =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.endsWith('.local');
    return isLocal ? false : 'require';
  } catch {
    return 'require';
  }
}

// Use global object to ensure singleton across module reloads (tsx watch mode)
declare global {
  var __meridian_db__: MeridianDatabase | null;
  var __meridian_sql__: ReturnType<typeof postgres> | null;
  var __meridian_db_initialized__: boolean;
}

// Initialize globals if not present
if (typeof global.__meridian_db__ === 'undefined') {
  global.__meridian_db__ = null;
  global.__meridian_sql__ = null;
  global.__meridian_db_initialized__ = false;
}

/**
 * Initialize PostgreSQL database connection
 */
export async function initializeDatabase() {
  if (global.__meridian_db__ && global.__meridian_db_initialized__) {
    logger.info('✅ Database already initialized, returning existing instance');
    return global.__meridian_db__;
  }

  try {
    logger.info('🗃️ Initializing PostgreSQL database connection...');

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    // Local Postgres (localhost) is usually non-TLS; cloud hosts need SSL.
    const sslMode = resolvePostgresSsl(databaseUrl);

    // Create PostgreSQL connection with optimized pool settings
    global.__meridian_sql__ = postgres(databaseUrl, {
      max: 20, // Maximum pool size
      idle_timeout: 20, // Close idle connections after 20 seconds (was 0 - MEMORY LEAK)
      max_lifetime: 60 * 30, // 30 minute max lifetime (reduced from 1 hour)
      connect_timeout: 60, // Increased timeout for tests (was 30)
      ssl: sslMode,
      prepare: false, // Disable prepared statements for compatibility
      // Prevent connection leaks
      onnotice: () => {}, // Suppress notices to reduce memory
      fetch_types: false, // Disable type fetching for better performance
      // Add retry logic
      max_connections: 10,
      idle_connection_timeout: 30,
    });

    // Test connection
    await global.__meridian_sql__`SELECT 1 as test`;

    global.__meridian_db__ = drizzle(global.__meridian_sql__, { schema });
    global.__meridian_db_initialized__ = true;
    logger.info('✅ PostgreSQL database initialized successfully');
    return global.__meridian_db__;

  } catch (error) {
    logger.error('❌ Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Get current database connection
 */
export function getDatabase(): MeridianDatabase {
  if (!global.__meridian_db__ || !global.__meridian_db_initialized__) {
    logger.error('❌ Database not initialized when getDatabase() was called');
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }

  return global.__meridian_db__;
}

/**
 * Close database connection
 */
export async function closeDatabase() {
  if (global.__meridian_sql__) {
    await global.__meridian_sql__.end();
    global.__meridian_sql__ = null;
    global.__meridian_db__ = null;
    global.__meridian_db_initialized__ = false;
    logger.info('🗃️ PostgreSQL database connection closed');
  }
}

/**
 * Check database health
 */
export async function checkDatabaseHealth() {
  try {
    if (!global.__meridian_sql__) {
      return { healthy: false, message: 'Database not connected' };
    }

    await global.__meridian_sql__`SELECT 1 as health_check`;
    return { healthy: true, message: 'Database connection healthy' };
  } catch (error) {
    return {
      healthy: false,
      message: `Database health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// For backward compatibility
export { closeDatabase as closeDatabaseConnection };
export { checkDatabaseHealth as testDatabaseConnection };

export function getDatabaseType(): 'postgresql' {
  return 'postgresql';
}

export function getDatabaseStats() {
  return {
    type: 'postgresql',
    isConnected: !!global.__meridian_db__,
    url: process.env.DATABASE_URL ? 'postgresql://***:***@neon.tech/***' : 'Not configured'
  };
}

/**
 * Get raw PostgreSQL client for direct queries
 * For compatibility with database validation
 */
export function getRawSQLClient() {
  if (!global.__meridian_sql__) {
    // Return null instead of throwing during graceful shutdown
    return null;
  }

  // Return a query interface compatible with the validator
  return {
    query: async (query: string) => {
      try {
        if (!global.__meridian_sql__) {
          throw new Error('Database connection closed');
        }
        const result = await global.__meridian_sql__.unsafe(query);
        return { rows: result };
      } catch (error) {
        logger.error('Raw SQL query failed:', error);
        throw error; // Let validator handle the error properly
      }
    }
  };
}

