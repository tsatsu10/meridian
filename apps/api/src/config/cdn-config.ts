/**
 * CDN Configuration
 * CloudFront, Cloudflare, and other CDN setup
 * Phase 1 - Performance Optimization
 */

import { Logger } from '../services/logging/logger';

interface CDNConfig {
  provider: 'cloudfront' | 'cloudflare' | 'fastly' | 'none';
  domain?: string;
  enabled: boolean;
  cacheRules?: CacheRule[];
}

interface CacheRule {
  path: string | RegExp;
  ttl: number;
  queryStrings?: 'all' | 'none' | string[];
  headers?: string[];
}

/**
 * CDN Service
 */
export class CDNService {
  private config: CDNConfig;

  constructor(config: CDNConfig) {
    this.config = config;
  }

  /**
   * Get CDN URL for asset
   */
  getAssetUrl(path: string): string {
    if (!this.config.enabled || !this.config.domain) {
      return path;
    }

    // Remove leading slash
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    
    return `https://${this.config.domain}/${cleanPath}`;
  }

  /**
   * Check if path should be served from CDN
   */
  shouldUseCDN(path: string): boolean {
    if (!this.config.enabled) {
      return false;
    }

    // Static assets
    const staticExtensions = [
      '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg',
      '.woff', '.woff2', '.ttf', '.eot', '.ico', '.mp4', '.webm',
    ];

    return staticExtensions.some(ext => path.endsWith(ext));
  }

  /**
   * Get cache TTL for path
   */
  getCacheTTL(path: string): number {
    if (!this.config.cacheRules) {
      return 3600; // Default 1 hour
    }

    for (const rule of this.config.cacheRules) {
      if (typeof rule.path === 'string') {
        if (path.startsWith(rule.path)) {
          return rule.ttl;
        }
      } else if (rule.path instanceof RegExp) {
        if (rule.path.test(path)) {
          return rule.ttl;
        }
      }
    }

    return 3600; // Default 1 hour
  }

  /**
   * Invalidate CDN cache
   */
  async invalidate(paths: string[]): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      switch (this.config.provider) {
        case 'cloudfront':
          await this.invalidateCloudFront(paths);
          break;
        case 'cloudflare':
          await this.invalidateCloudflare(paths);
          break;
        case 'fastly':
          await this.invalidateFastly(paths);
          break;
        default:
          Logger.warn('CDN invalidation not supported for provider', {
            provider: this.config.provider,
          });
      }
    } catch (error) {
      Logger.error('CDN invalidation failed', error, { paths });
    }
  }

  /**
   * Invalidate CloudFront cache
   */
  private async invalidateCloudFront(paths: string[]): Promise<void> {
    // TODO: Implement AWS CloudFront invalidation
    // Requires AWS SDK and CloudFront distribution ID
    Logger.info('CloudFront invalidation requested', { paths });
  }

  /**
   * Invalidate Cloudflare cache
   */
  private async invalidateCloudflare(paths: string[]): Promise<void> {
    const zoneId = process.env.CLOUDFLARE_ZONE_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!zoneId || !apiToken) {
      Logger.error('Cloudflare credentials not configured');
      return;
    }

    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            files: paths.map(p => this.getAssetUrl(p)),
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        Logger.info('Cloudflare cache purged', { paths, count: paths.length });
      } else {
        Logger.error('Cloudflare cache purge failed', data.errors);
      }
    } catch (error) {
      Logger.error('Cloudflare API error', error);
    }
  }

  /**
   * Invalidate Fastly cache
   */
  private async invalidateFastly(paths: string[]): Promise<void> {
    // TODO: Implement Fastly invalidation
    // Requires Fastly API key and service ID
    Logger.info('Fastly invalidation requested', { paths });
  }

  /**
   * Purge all CDN cache
   */
  async purgeAll(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      switch (this.config.provider) {
        case 'cloudflare':
          await this.purgeAllCloudflare();
          break;
        default:
          Logger.warn('Purge all not supported for provider', {
            provider: this.config.provider,
          });
      }
    } catch (error) {
      Logger.error('CDN purge all failed', error);
    }
  }

  /**
   * Purge all Cloudflare cache
   */
  private async purgeAllCloudflare(): Promise<void> {
    const zoneId = process.env.CLOUDFLARE_ZONE_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!zoneId || !apiToken) {
      Logger.error('Cloudflare credentials not configured');
      return;
    }

    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ purge_everything: true }),
        }
      );

      const data = await response.json();

      if (data.success) {
        Logger.info('Cloudflare cache fully purged');
      } else {
        Logger.error('Cloudflare full purge failed', data.errors);
      }
    } catch (error) {
      Logger.error('Cloudflare API error', error);
    }
  }
}

/**
 * Default CDN configuration
 */
export const defaultCDNConfig: CDNConfig = {
  provider: (process.env.CDN_PROVIDER as any) || 'none',
  domain: process.env.CDN_DOMAIN,
  enabled: process.env.CDN_ENABLED === 'true',
  cacheRules: [
    // Images - 1 year
    {
      path: /\.(png|jpg|jpeg|gif|webp|svg|ico)$/,
      ttl: 31536000,
      queryStrings: 'none',
    },
    // Fonts - 1 year
    {
      path: /\.(woff|woff2|ttf|eot)$/,
      ttl: 31536000,
      queryStrings: 'none',
    },
    // CSS/JS with versioning - 1 year
    {
      path: /\.(css|js)$/,
      ttl: 31536000,
      queryStrings: ['v', 'version'],
    },
    // Videos - 1 week
    {
      path: /\.(mp4|webm|ogg)$/,
      ttl: 604800,
      queryStrings: 'none',
    },
    // API responses - 5 minutes
    {
      path: '/api/',
      ttl: 300,
      queryStrings: 'all',
      headers: ['Authorization'],
    },
  ],
};

/**
 * Create CDN service instance
 */
export const createCDNService = (config: CDNConfig = defaultCDNConfig): CDNService => {
  return new CDNService(config);
};

/**
 * Singleton CDN service
 */
let cdnService: CDNService | null = null;

export const initializeCDN = (config?: CDNConfig): CDNService => {
  if (!cdnService) {
    cdnService = createCDNService(config);
    Logger.info('CDN service initialized', {
      provider: cdnService['config'].provider,
      enabled: cdnService['config'].enabled,
    });
  }
  return cdnService;
};

export const getCDNService = (): CDNService => {
  if (!cdnService) {
    return initializeCDN();
  }
  return cdnService;
};

export default CDNService;


