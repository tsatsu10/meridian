/**
 * Query Optimizer
 * Database query optimization utilities
 * Phase 1 - Performance Optimization
 */

import { Logger } from '../services/logging/logger';

/**
 * Query performance monitoring
 */
export class QueryMonitor {
  private static slowQueryThreshold = parseInt(
    process.env.SLOW_QUERY_THRESHOLD_MS || '100'
  );

  /**
   * Monitor query execution time
   */
  static async monitor<T>(
    queryName: string,
    queryFn: () => Promise<T>,
    logSlow: boolean = true
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await queryFn();
      const duration = Date.now() - startTime;

      // Log slow queries
      if (logSlow && duration > this.slowQueryThreshold) {
        Logger.warn('Slow query detected', {
          query: queryName,
          duration,
          threshold: this.slowQueryThreshold,
        });
      }

      // Log query performance
      Logger.query(queryName, duration);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      Logger.error('Query failed', error, {
        query: queryName,
        duration,
      });
      throw error;
    }
  }
}

/**
 * Pagination helpers
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  maxLimit?: number;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class Pagination {
  /**
   * Normalize pagination parameters
   */
  static normalize(params: PaginationParams = {}): Required<Omit<PaginationParams, 'maxLimit'>> {
    const maxLimit = params.maxLimit || 100;
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(maxLimit, Math.max(1, params.limit || 20));

    return { page, limit };
  }

  /**
   * Calculate offset from page and limit
   */
  static getOffset(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  /**
   * Build pagination result
   */
  static buildResult<T>(
    data: T[],
    total: number,
    page: number,
    limit: number
  ): PaginationResult<T> {
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }
}

/**
 * Batch operations
 */
export class BatchOperations {
  /**
   * Process items in batches
   */
  static async process<T, R>(
    items: T[],
    batchSize: number,
    processor: (batch: T[]) => Promise<R[]>
  ): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await processor(batch);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Process items in parallel batches
   */
  static async processParallel<T, R>(
    items: T[],
    batchSize: number,
    maxConcurrent: number,
    processor: (batch: T[]) => Promise<R[]>
  ): Promise<R[]> {
    const batches: T[][] = [];

    // Split into batches
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    const results: R[] = [];

    // Process batches with concurrency limit
    for (let i = 0; i < batches.length; i += maxConcurrent) {
      const currentBatches = batches.slice(i, i + maxConcurrent);
      const batchPromises = currentBatches.map(batch => processor(batch));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.flat());
    }

    return results;
  }
}

/**
 * Query result transformation
 */
export class QueryTransformer {
  /**
   * Group results by key
   */
  static groupBy<T>(items: T[], keyFn: (item: T) => string | number): Record<string, T[]> {
    return items.reduce((groups, item) => {
      const key = String(keyFn(item));
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  /**
   * Create map from array
   */
  static toMap<T>(items: T[], keyFn: (item: T) => string | number): Map<string | number, T> {
    return new Map(items.map(item => [keyFn(item), item]));
  }

  /**
   * Remove duplicates
   */
  static unique<T>(items: T[], keyFn?: (item: T) => any): T[] {
    if (!keyFn) {
      return Array.from(new Set(items));
    }

    const seen = new Set();
    return items.filter(item => {
      const key = keyFn(item);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Sort by multiple keys
   */
  static sortBy<T>(
    items: T[],
    ...sortFns: ((item: T) => any)[]
  ): T[] {
    return [...items].sort((a, b) => {
      for (const fn of sortFns) {
        const aVal = fn(a);
        const bVal = fn(b);
        
        if (aVal < bVal) return -1;
        if (aVal > bVal) return 1;
      }
      return 0;
    });
  }
}

/**
 * Database connection pooling helpers
 */
export class ConnectionPool {
  private static readonly DEFAULT_POOL_SIZE = 10;
  private static readonly DEFAULT_TIMEOUT = 30000; // 30 seconds

  /**
   * Get optimal pool size based on environment
   */
  static getOptimalPoolSize(): number {
    const cpuCount = require('os').cpus().length;
    
    // Rule of thumb: pool size = (core_count * 2) + effective_spindle_count
    // For web apps: effective_spindle_count ≈ 1
    return Math.max(this.DEFAULT_POOL_SIZE, cpuCount * 2 + 1);
  }

  /**
   * Get connection timeout
   */
  static getTimeout(): number {
    return parseInt(process.env.DB_CONNECTION_TIMEOUT || String(this.DEFAULT_TIMEOUT));
  }
}

/**
 * N+1 query prevention
 */
export class DataLoader<K, V> {
  private batchLoadFn: (keys: K[]) => Promise<V[]>;
  private cache: Map<K, V> = new Map();
  private queue: K[] = [];
  private loading: boolean = false;

  constructor(batchLoadFn: (keys: K[]) => Promise<V[]>) {
    this.batchLoadFn = batchLoadFn;
  }

  /**
   * Load single item (batched)
   */
  async load(key: K): Promise<V | undefined> {
    // Check cache
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    // Add to queue
    this.queue.push(key);

    // Batch load if not already loading
    if (!this.loading) {
      this.loading = true;
      // Use setImmediate to batch multiple load calls
      setImmediate(() => this.executeBatch());
    }

    // Wait for batch to complete
    await new Promise(resolve => setTimeout(resolve, 0));
    
    return this.cache.get(key);
  }

  /**
   * Load multiple items (batched)
   */
  async loadMany(keys: K[]): Promise<(V | undefined)[]> {
    return Promise.all(keys.map(key => this.load(key)));
  }

  /**
   * Execute batched load
   */
  private async executeBatch(): Promise<void> {
    const keys = [...this.queue];
    this.queue = [];

    try {
      const values = await this.batchLoadFn(keys);
      
      // Cache results
      keys.forEach((key, index) => {
        this.cache.set(key, values[index]);
      });
    } catch (error) {
      Logger.error('DataLoader batch failed', error);
    } finally {
      this.loading = false;
    }
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Prime cache
   */
  prime(key: K, value: V): void {
    this.cache.set(key, value);
  }
}

/**
 * Query builder helpers
 */
export class QueryBuilder {
  /**
   * Build WHERE clause with safe parameter binding
   */
  static buildWhereClause(
    conditions: Record<string, any>,
    operator: 'AND' | 'OR' = 'AND'
  ): { sql: string; params: any[] } {
    const clauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(conditions)) {
      if (value === undefined) continue;

      if (value === null) {
        clauses.push(`${key} IS NULL`);
      } else if (Array.isArray(value)) {
        const placeholders = value.map(() => `$${paramIndex++}`).join(', ');
        clauses.push(`${key} IN (${placeholders})`);
        params.push(...value);
      } else {
        clauses.push(`${key} = $${paramIndex++}`);
        params.push(value);
      }
    }

    const sql = clauses.length > 0 
      ? `WHERE ${clauses.join(` ${operator} `)}`
      : '';

    return { sql, params };
  }

  /**
   * Build ORDER BY clause
   */
  static buildOrderByClause(
    orderBy: Record<string, 'ASC' | 'DESC' | 'asc' | 'desc'>
  ): string {
    const clauses = Object.entries(orderBy)
      .map(([key, direction]) => `${key} ${direction.toUpperCase()}`);

    return clauses.length > 0 
      ? `ORDER BY ${clauses.join(', ')}`
      : '';
  }

  /**
   * Build LIMIT and OFFSET clause
   */
  static buildLimitClause(limit?: number, offset?: number): string {
    const parts: string[] = [];

    if (limit !== undefined) {
      parts.push(`LIMIT ${limit}`);
    }

    if (offset !== undefined && offset > 0) {
      parts.push(`OFFSET ${offset}`);
    }

    return parts.join(' ');
  }
}

export default {
  QueryMonitor,
  Pagination,
  BatchOperations,
  QueryTransformer,
  ConnectionPool,
  DataLoader,
  QueryBuilder,
};


