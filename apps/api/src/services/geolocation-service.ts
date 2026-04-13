/**
 * 🌍 Geolocation Service
 * 
 * IP-based geolocation using ipstack API for security tracking,
 * analytics, and location-aware features.
 * 
 * Features:
 * - IP address geolocation lookup
 * - Intelligent caching (24-hour TTL)
 * - API quota monitoring
 * - Graceful fallback handling
 * - Security anomaly detection
 */

import logger from '../utils/logger';
import { z } from 'zod';

// Zod schema for ipstack API response
export const IpstackResponseSchema = z.object({
  ip: z.string(),
  type: z.enum(['ipv4', 'ipv6']).optional(),
  continent_code: z.string().optional(),
  continent_name: z.string().optional(),
  country_code: z.string(),
  country_name: z.string(),
  region_code: z.string().optional(),
  region_name: z.string().optional(),
  city: z.string().optional(),
  zip: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  location: z.object({
    geoname_id: z.number().optional(),
    capital: z.string().optional(),
    languages: z.array(z.object({
      code: z.string(),
      name: z.string(),
      native: z.string().optional(),
    })).optional(),
    country_flag: z.string().optional(),
    country_flag_emoji: z.string().optional(),
    country_flag_emoji_unicode: z.string().optional(),
    calling_code: z.string().optional(),
    is_eu: z.boolean().optional(),
  }).optional(),
  time_zone: z.object({
    id: z.string().optional(),
    current_time: z.string().optional(),
    gmt_offset: z.number().optional(),
    code: z.string().optional(),
    is_daylight_saving: z.boolean().optional(),
  }).optional(),
  currency: z.object({
    code: z.string().optional(),
    name: z.string().optional(),
    plural: z.string().optional(),
    symbol: z.string().optional(),
    symbol_native: z.string().optional(),
  }).optional(),
  connection: z.object({
    asn: z.number().optional(),
    isp: z.string().optional(),
  }).optional(),
  security: z.object({
    is_proxy: z.boolean().optional(),
    proxy_type: z.string().optional(),
    is_crawler: z.boolean().optional(),
    crawler_name: z.string().optional(),
    crawler_type: z.string().optional(),
    is_tor: z.boolean().optional(),
    threat_level: z.string().optional(),
    threat_types: z.array(z.string()).optional(),
  }).optional(),
});

export type IpstackResponse = z.infer<typeof IpstackResponseSchema>;

// Simplified location interface for common use cases
export interface LocationData {
  ip: string;
  country: string;
  countryCode: string;
  region?: string;
  city?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
  isp?: string;
  // Security flags
  isProxy?: boolean;
  isTor?: boolean;
  threatLevel?: string;
}

// Error response from ipstack
interface IpstackError {
  success: false;
  error: {
    code: number;
    type: string;
    info: string;
  };
}

// Cache entry structure
interface CacheEntry {
  data: IpstackResponse;
  timestamp: number;
  hits: number;
}

// Usage statistics
interface UsageStats {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  apiCalls: number;
  errors: number;
  lastApiCall?: Date;
  quotaWarning: boolean;
}

export class GeolocationService {
  private apiKey: string;
  private useHttps: boolean;
  private cache: Map<string, CacheEntry> = new Map();
  private cacheTTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private stats: UsageStats = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    apiCalls: 0,
    errors: 0,
    quotaWarning: false,
  };

  // Rate limiting
  private readonly QUOTA_WARNING_THRESHOLD = 0.8; // Warn at 80% usage
  private monthlyQuota: number = 10000; // Default free tier quota
  private currentMonthCalls: number = 0;
  private monthStartDate: Date = new Date();

  // Redis support for distributed caching
  private useRedis: boolean = false;
  private redisClient: any = null;
  private readonly REDIS_KEY_PREFIX = 'geolocation:';
  private readonly REDIS_TTL_SECONDS = 24 * 60 * 60; // 24 hours

  constructor() {
    this.apiKey = process.env.IPSTACK_API_KEY || '';
    this.useHttps = process.env.IPSTACK_SECURITY === 'true';
    
    // Initialize Redis if available
    this.initializeRedis();
    
    if (!this.apiKey) {
      logger.warn('⚠️  ipstack API key not configured. Geolocation features will be disabled.');
      logger.info('   Get a free API key at https://ipstack.com');
    } else {
      logger.info('✅ Geolocation service initialized with ipstack API');
      if (!this.useHttps) {
        logger.info('   Note: Using HTTP endpoint (HTTPS requires paid plan)');
      }
      if (this.useRedis) {
        logger.info('   Redis caching enabled for distributed deployment');
      }
    }

    // Start periodic cache cleanup
    this.startCacheCleanup();
  }

  /**
   * Initialize Redis for distributed caching
   * 
   * Note: Redis support is optional. If Redis is not available,
   * the service will fall back to in-memory caching only.
   */
  private async initializeRedis(): Promise<void> {
    // Redis support is disabled for now to avoid connection errors
    // Will be enabled when Redis is properly configured
    // 
    // To enable Redis caching:
    // 1. Ensure Redis is running (redis-server)
    // 2. Set REDIS_URL in .env
    // 3. Uncomment the Redis initialization code below
    
    this.useRedis = false;
    this.redisClient = null;
    logger.debug('Redis caching disabled - using in-memory cache only');
    
    /* Uncomment when Redis is available:
    
    try {
      const Redis = (await import('ioredis')).default;
      
      const redisOptions = {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
        db: Number(process.env.REDIS_DB) || 0,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 3000,
        enableOfflineQueue: false,
      };

      this.redisClient = new Redis(redisOptions);
      await this.redisClient.connect();
      
      this.useRedis = true;
      logger.info('✅ Geolocation Redis caching enabled');

      this.redisClient.on('error', (error) => {
        logger.debug('Redis error:', error.message);
        this.useRedis = false;
      });

    } catch (error) {
      logger.debug('Redis not available, using in-memory cache only');
      this.useRedis = false;
      this.redisClient = null;
    }
    */
  }

  /**
   * Lookup IP address and get geolocation data
   */
  async lookupIP(ip: string): Promise<IpstackResponse | null> {
    // Validate IP address format
    if (!this.isValidIP(ip) || ip === 'unknown') {
      logger.debug('Invalid or unknown IP address:', ip);
      return null;
    }

    // Re-check API key at runtime (in case it was set after initialization)
    if (!this.apiKey) {
      this.apiKey = process.env.IPSTACK_API_KEY || '';
    }

    // Check if service is configured
    if (!this.apiKey) {
      logger.debug('ipstack API key not configured - skipping geolocation lookup');
      return null;
    }

    this.stats.totalRequests++;

    // Check cache first
    const cached = await this.getFromCache(ip);
    if (cached) {
      this.stats.cacheHits++;
      logger.debug(`Geolocation cache hit for IP: ${ip}`);
      return cached;
    }

    this.stats.cacheMisses++;

    // Check quota before making API call
    if (this.isQuotaExceeded()) {
      logger.warn(`⚠️  ipstack API quota exceeded. Skipping lookup for: ${ip}`);
      return null;
    }

    try {
      const protocol = this.useHttps ? 'https' : 'http';
      const url = `${protocol}://api.ipstack.com/${ip}?access_key=${this.apiKey}`;
      
      logger.debug(`Calling ipstack API for IP: ${ip}`);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`ipstack API error: HTTP ${response.status}`);
      }

      const data = await response.json();

      // Check for API error response
      if ('error' in data) {
        const error = data as IpstackError;
        logger.error('ipstack API error:', {
          code: error.error.code,
          type: error.error.type,
          info: error.error.info,
        });
        this.stats.errors++;
        return null;
      }

      // Validate response with Zod schema
      const validatedData = IpstackResponseSchema.parse(data);

      // Update API call tracking
      this.stats.apiCalls++;
      this.stats.lastApiCall = new Date();
      this.trackMonthlyQuota();

      // Cache the result
      await this.addToCache(ip, validatedData);

      logger.debug(`Successfully fetched geolocation for IP: ${ip} (${validatedData.city}, ${validatedData.country_name})`);

      return validatedData;

    } catch (error) {
      this.stats.errors++;
      if (error instanceof z.ZodError) {
        logger.error('Invalid response from ipstack API:', error.errors);
      } else {
        logger.error('Failed to lookup IP with ipstack:', error);
      }
      return null;
    }
  }

  /**
   * Get simplified location data
   */
  async getLocation(ip: string): Promise<LocationData | null> {
    const data = await this.lookupIP(ip);
    if (!data) return null;

    return {
      ip: data.ip,
      country: data.country_name,
      countryCode: data.country_code,
      region: data.region_name,
      city: data.city,
      timezone: data.time_zone?.id,
      latitude: data.latitude,
      longitude: data.longitude,
      isp: data.connection?.isp,
      isProxy: data.security?.is_proxy,
      isTor: data.security?.is_tor,
      threatLevel: data.security?.threat_level,
    };
  }

  /**
   * Check if IP is from a suspicious source
   */
  async isSuspiciousIP(ip: string): Promise<boolean> {
    const data = await this.lookupIP(ip);
    if (!data || !data.security) return false;

    return !!(
      data.security.is_proxy ||
      data.security.is_tor ||
      data.security.threat_level === 'high' ||
      (data.security.threat_types && data.security.threat_types.length > 0)
    );
  }

  /**
   * Detect location change for security monitoring
   */
  async detectLocationAnomaly(
    ip: string,
    previousLocations: LocationData[]
  ): Promise<{ isAnomaly: boolean; reason?: string }> {
    const currentLocation = await this.getLocation(ip);
    
    if (!currentLocation) {
      return { isAnomaly: false };
    }

    // Check if this is a new country
    const knownCountries = new Set(previousLocations.map(loc => loc.countryCode));
    if (!knownCountries.has(currentLocation.countryCode)) {
      return {
        isAnomaly: true,
        reason: `New country detected: ${currentLocation.country}`,
      };
    }

    // Check for suspicious indicators
    if (currentLocation.isProxy || currentLocation.isTor) {
      return {
        isAnomaly: true,
        reason: 'Access via proxy/VPN/Tor detected',
      };
    }

    if (currentLocation.threatLevel === 'high') {
      return {
        isAnomaly: true,
        reason: 'High threat level detected',
      };
    }

    return { isAnomaly: false };
  }

  /**
   * Get service usage statistics
   */
  getUsageStats(): UsageStats & { cacheSize: number; cacheHitRate: string } {
    const cacheHitRate = this.stats.totalRequests > 0
      ? ((this.stats.cacheHits / this.stats.totalRequests) * 100).toFixed(2)
      : '0.00';

    return {
      ...this.stats,
      cacheSize: this.cache.size,
      cacheHitRate: `${cacheHitRate}%`,
    };
  }

  /**
   * Get monthly quota usage
   */
  getQuotaUsage(): { used: number; total: number; percentage: number; remaining: number } {
    const percentage = (this.currentMonthCalls / this.monthlyQuota) * 100;
    return {
      used: this.currentMonthCalls,
      total: this.monthlyQuota,
      percentage: Math.round(percentage * 100) / 100,
      remaining: Math.max(0, this.monthlyQuota - this.currentMonthCalls),
    };
  }

  /**
   * Clear the cache (useful for testing or manual refresh)
   */
  async clearCache(): Promise<void> {
    // Clear Redis cache if available
    if (this.useRedis && this.redisClient) {
      try {
        const keys = await this.redisClient.keys(`${this.REDIS_KEY_PREFIX}*`);
        if (keys && keys.length > 0) {
          await this.redisClient.del(...keys);
          logger.info(`Cleared ${keys.length} entries from Redis geolocation cache`);
        }
      } catch (error) {
        logger.warn('Failed to clear Redis cache:', error);
      }
    }

    // Clear in-memory cache
    this.cache.clear();
    logger.info('Geolocation in-memory cache cleared');
  }

  // Private helper methods

  private isValidIP(ip: string): boolean {
    // Basic IPv4 validation
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    // Basic IPv6 validation
    const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
    
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  private async getFromCache(ip: string): Promise<IpstackResponse | null> {
    // Try Redis first if available
    if (this.useRedis && this.redisClient) {
      try {
        const redisKey = `${this.REDIS_KEY_PREFIX}${ip}`;
        const cached = await this.redisClient.get(redisKey);
        
        if (cached) {
          const data = JSON.parse(cached);
          logger.debug(`Redis cache hit for IP: ${ip}`);
          return IpstackResponseSchema.parse(data);
        }
      } catch (error) {
        logger.debug('Redis cache error, falling back to memory:', error);
      }
    }

    // Fallback to in-memory cache
    const entry = this.cache.get(ip);
    if (!entry) return null;

    // Check if cache entry is still valid
    const age = Date.now() - entry.timestamp;
    if (age > this.cacheTTL) {
      this.cache.delete(ip);
      return null;
    }

    // Update hit counter
    entry.hits++;
    return entry.data;
  }

  private async addToCache(ip: string, data: IpstackResponse): Promise<void> {
    // Add to Redis if available
    if (this.useRedis && this.redisClient) {
      try {
        const redisKey = `${this.REDIS_KEY_PREFIX}${ip}`;
        await this.redisClient.setex(
          redisKey,
          this.REDIS_TTL_SECONDS,
          JSON.stringify(data)
        );
        logger.debug(`Cached geolocation in Redis for IP: ${ip}`);
      } catch (error) {
        logger.debug('Redis cache write error:', error);
      }
    }

    // Always add to in-memory cache as backup
    this.cache.set(ip, {
      data,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  private trackMonthlyQuota(): void {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Reset counter if new month
    if (this.monthStartDate < monthStart) {
      this.currentMonthCalls = 0;
      this.monthStartDate = monthStart;
      this.stats.quotaWarning = false;
    }

    this.currentMonthCalls++;

    // Check quota warning threshold
    const usagePercentage = this.currentMonthCalls / this.monthlyQuota;
    if (usagePercentage >= this.QUOTA_WARNING_THRESHOLD && !this.stats.quotaWarning) {
      this.stats.quotaWarning = true;
      logger.warn(`⚠️  ipstack API quota warning: ${Math.round(usagePercentage * 100)}% used (${this.currentMonthCalls}/${this.monthlyQuota})`);
    }
  }

  private isQuotaExceeded(): boolean {
    return this.currentMonthCalls >= this.monthlyQuota;
  }

  private startCacheCleanup(): void {
    // Clean up expired cache entries every hour
    setInterval(() => {
      const now = Date.now();
      let removed = 0;

      for (const [ip, entry] of this.cache.entries()) {
        const age = now - entry.timestamp;
        if (age > this.cacheTTL) {
          this.cache.delete(ip);
          removed++;
        }
      }

      if (removed > 0) {
        logger.debug(`Cleaned up ${removed} expired geolocation cache entries`);
      }
    }, 60 * 60 * 1000); // Run every hour
  }

  /**
   * Set monthly quota limit (for different ipstack plans)
   */
  setMonthlyQuota(quota: number): void {
    this.monthlyQuota = quota;
    logger.info(`ipstack monthly quota updated to: ${quota} requests`);
  }
}

// Export singleton instance
export const geolocationService = new GeolocationService();

// Export for testing
export default geolocationService;

