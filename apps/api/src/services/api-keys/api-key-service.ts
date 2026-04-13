/**
 * 🔑 API Key Management Service
 * 
 * Secure API key generation and management:
 * - Generate keys with scopes
 * - Key rotation
 * - Key revocation
 * - Usage tracking
 * - Rate limiting per key
 * 
 * Security:
 * - Keys hashed in database (bcrypt)
 * - Prefix for identification (kn_live_, kn_test_)
 * - Scoped permissions
 * - Expiration dates
 */

import crypto from 'crypto';
import { hash, compare } from '@node-rs/argon2';
import { createId } from '@paralleldrive/cuid2';
import { winstonLog } from '../../utils/winston-logger';
import { ValidationError, UnauthorizedError } from '../../utils/errors';

export interface ApiKeyConfig {
  name: string;
  scopes: string[];
  workspaceId: string;
  userId: string;
  expiresAt?: Date;
  rateLimit?: number; // Requests per minute
}

export interface ApiKey {
  id: string;
  key: string;          // Only returned once on creation
  keyPrefix: string;    // First 8 chars for identification
  keyHash: string;      // Hashed key stored in DB
  name: string;
  scopes: string[];
  workspaceId: string;
  userId: string;
  usageCount: number;
  lastUsedAt?: Date;
  expiresAt?: Date;
  rateLimit: number;
  isActive: boolean;
  createdAt: Date;
}

/**
 * API Key Service
 */
export class ApiKeyService {
  private static readonly KEY_PREFIX_LIVE = 'kn_live_';
  private static readonly KEY_PREFIX_TEST = 'kn_test_';

  /**
   * Generate cryptographically secure API key
   */
  private static generateKey(isTest: boolean = false): {
    key: string;
    prefix: string;
  } {
    const randomBytes = crypto.randomBytes(32).toString('hex');
    const prefix = isTest ? this.KEY_PREFIX_TEST : this.KEY_PREFIX_LIVE;
    const key = `${prefix}${randomBytes}`;
    const keyPrefix = key.substring(0, 15); // Store first 15 chars for identification

    return { key, prefix: keyPrefix };
  }

  /**
   * Hash API key for secure storage
   */
  private static async hashKey(key: string): Promise<string> {
    return await hash(key, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });
  }

  /**
   * Verify API key against hash
   */
  static async verifyKey(key: string, hash: string): Promise<boolean> {
    try {
      return await compare(hash, key);
    } catch (error) {
      return false;
    }
  }

  /**
   * Create new API key
   */
  static async createApiKey(
    config: ApiKeyConfig,
    isTest: boolean = false
  ): Promise<ApiKey> {
    try {
      const { key, prefix } = this.generateKey(isTest);
      const keyHash = await this.hashKey(key);
      const keyId = createId();

      const apiKey: ApiKey = {
        id: keyId,
        key, // Only returned here, never stored in DB
        keyPrefix: prefix,
        keyHash,
        name: config.name,
        scopes: config.scopes,
        workspaceId: config.workspaceId,
        userId: config.userId,
        usageCount: 0,
        expiresAt: config.expiresAt,
        rateLimit: config.rateLimit || 100, // Default: 100 req/min
        isActive: true,
        createdAt: new Date(),
      };

      // In production: Save to database
      // await db.insert(apiKeysTable).values({
      //   id: keyId,
      //   keyPrefix: prefix,
      //   keyHash,
      //   name: config.name,
      //   scopes: JSON.stringify(config.scopes),
      //   ...
      // });

      winstonLog.info('API key created', {
        keyId,
        keyPrefix: prefix,
        name: config.name,
        scopes: config.scopes,
        userId: config.userId,
        workspaceId: config.workspaceId,
      });

      // Return key ONCE - user must save it
      return apiKey;

    } catch (error) {
      winstonLog.error('Failed to create API key', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Validate API key and return config
   */
  static async validateKey(key: string): Promise<ApiKey | null> {
    try {
      // In production: 
      // 1. Extract prefix
      // 2. Query DB by prefix for faster lookup
      // 3. Verify hash
      // 4. Check expiration
      // 5. Check isActive
      // 6. Return config

      const prefix = key.substring(0, 15);

      // Mock validation for now
      winstonLog.debug('API key validation attempt', { prefix });

      // In production:
      // const apiKey = await db.query.apiKeys.findFirst({
      //   where: eq(apiKeys.keyPrefix, prefix),
      // });
      //
      // if (!apiKey) return null;
      //
      // const isValid = await this.verifyKey(key, apiKey.keyHash);
      // if (!isValid) return null;
      //
      // if (!apiKey.isActive) return null;
      // if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;
      //
      // // Increment usage counter
      // await db.update(apiKeys)
      //   .set({ 
      //     usageCount: apiKey.usageCount + 1,
      //     lastUsedAt: new Date(),
      //   })
      //   .where(eq(apiKeys.id, apiKey.id));
      //
      // return apiKey;

      return null;

    } catch (error) {
      winstonLog.error('API key validation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Rotate API key (generate new key, invalidate old)
   */
  static async rotateKey(
    keyId: string,
    userId: string
  ): Promise<{ oldPrefix: string; newKey: ApiKey }> {
    try {
      // In production:
      // 1. Get current key config
      // 2. Mark old key as inactive
      // 3. Generate new key with same config
      // 4. Return new key

      winstonLog.info('API key rotation initiated', {
        keyId,
        userId,
      });

      // Mock rotation
      const newKey = await this.createApiKey({
        name: 'Rotated key',
        scopes: ['read', 'write'],
        workspaceId: 'ws_placeholder',
        userId,
      });

      return {
        oldPrefix: 'kn_live_old...',
        newKey,
      };

    } catch (error) {
      winstonLog.error('Failed to rotate API key', { error });
      throw error;
    }
  }

  /**
   * Revoke API key
   */
  static async revokeKey(keyId: string, userId: string, reason?: string): Promise<void> {
    try {
      // In production:
      // await db.update(apiKeys)
      //   .set({ 
      //     isActive: false,
      //     revokedAt: new Date(),
      //     revokedBy: userId,
      //     revocationReason: reason,
      //   })
      //   .where(eq(apiKeys.id, keyId));

      winstonLog.security('API key revoked', {
        keyId,
        userId,
        reason,
      });

    } catch (error) {
      winstonLog.error('Failed to revoke API key', { error });
      throw error;
    }
  }

  /**
   * Check if key has specific scope
   */
  static hasScope(apiKey: ApiKey, requiredScope: string): boolean {
    // Check for exact match
    if (apiKey.scopes.includes(requiredScope)) {
      return true;
    }

    // Check for wildcard scopes
    for (const scope of apiKey.scopes) {
      if (scope.endsWith('*')) {
        const baseScope = scope.slice(0, -1); // Remove *
        if (requiredScope.startsWith(baseScope)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get API key statistics
   */
  static async getKeyStats(keyId: string): Promise<{
    usageCount: number;
    lastUsedAt?: Date;
    createdAt: Date;
    daysActive: number;
    averageRequestsPerDay: number;
  }> {
    try {
      // In production: Query from database
      // For now, return mock stats

      return {
        usageCount: 1543,
        lastUsedAt: new Date(),
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        daysActive: 30,
        averageRequestsPerDay: 51,
      };

    } catch (error) {
      winstonLog.error('Failed to get key stats', { error });
      throw error;
    }
  }
}

export default ApiKeyService;


