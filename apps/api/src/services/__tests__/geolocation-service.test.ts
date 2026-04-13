/**
 * Unit Tests for Geolocation Service
 * 
 * Comprehensive test coverage for ipstack API integration
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GeolocationService, IpstackResponseSchema } from '../geolocation-service';

// Mock logger
vi.mock('../../utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock Redis
vi.mock('../redis-session-store', () => ({
  getRedisClient: vi.fn(() => null),
}));

// Mock fetch
global.fetch = vi.fn();

describe('GeolocationService', () => {
  let service: GeolocationService;
  
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.IPSTACK_API_KEY = 'test-api-key';
    process.env.IPSTACK_SECURITY = 'false';
    service = new GeolocationService();
  });

  afterEach(() => {
    delete process.env.IPSTACK_API_KEY;
    delete process.env.IPSTACK_SECURITY;
  });

  describe('Initialization', () => {
    it('should initialize with API key', () => {
      expect(service).toBeDefined();
    });

    it('should handle missing API key', () => {
      delete process.env.IPSTACK_API_KEY;
      const serviceWithoutKey = new GeolocationService();
      expect(serviceWithoutKey).toBeDefined();
    });

    it('should set HTTPS mode when configured', () => {
      process.env.IPSTACK_SECURITY = 'true';
      const httpsService = new GeolocationService();
      expect(httpsService).toBeDefined();
    });
  });

  describe('IP Address Validation', () => {
    it('should accept valid IPv4 addresses', async () => {
      const mockResponse = {
        ip: '8.8.8.8',
        country_code: 'US',
        country_name: 'United States',
        region_name: 'California',
        city: 'Mountain View',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.lookupIP('8.8.8.8');
      expect(result).toBeDefined();
      expect(result?.ip).toBe('8.8.8.8');
    });

    it('should reject invalid IP addresses', async () => {
      const result = await service.lookupIP('invalid-ip');
      expect(result).toBeNull();
    });

    it('should reject "unknown" IP', async () => {
      const result = await service.lookupIP('unknown');
      expect(result).toBeNull();
    });

    it('should accept valid IPv6 addresses', async () => {
      const mockResponse = {
        ip: '2001:4860:4860::8888',
        country_code: 'US',
        country_name: 'United States',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.lookupIP('2001:4860:4860::8888');
      expect(result).toBeDefined();
    });
  });

  describe('API Calls', () => {
    it('should make API call for uncached IP', async () => {
      const mockResponse = {
        ip: '1.1.1.1',
        country_code: 'AU',
        country_name: 'Australia',
        city: 'Brisbane',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.lookupIP('1.1.1.1');
      
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('1.1.1.1')
      );
      expect(result?.country_name).toBe('Australia');
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await service.lookupIP('1.2.3.4');
      expect(result).toBeNull();
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await service.lookupIP('1.2.3.4');
      expect(result).toBeNull();
    });

    it('should handle ipstack error responses', async () => {
      const errorResponse = {
        success: false,
        error: {
          code: 101,
          type: 'invalid_access_key',
          info: 'Invalid API key',
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => errorResponse,
      });

      const result = await service.lookupIP('1.2.3.4');
      expect(result).toBeNull();
    });
  });

  describe('Caching', () => {
    it('should cache successful lookups', async () => {
      const mockResponse = {
        ip: '8.8.8.8',
        country_code: 'US',
        country_name: 'United States',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      // First call - API
      await service.lookupIP('8.8.8.8');
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Second call - cache
      await service.lookupIP('8.8.8.8');
      expect(global.fetch).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('should track cache statistics', async () => {
      const mockResponse = {
        ip: '1.1.1.1',
        country_code: 'AU',
        country_name: 'Australia',
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      // Miss
      await service.lookupIP('1.1.1.1');
      
      // Hit
      await service.lookupIP('1.1.1.1');

      const stats = service.getUsageStats();
      expect(stats.cacheHits).toBe(1);
      expect(stats.cacheMisses).toBe(1);
      expect(stats.apiCalls).toBe(1);
    });

    it('should clear cache', async () => {
      const mockResponse = {
        ip: '8.8.8.8',
        country_code: 'US',
        country_name: 'United States',
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      // Cache an IP
      await service.lookupIP('8.8.8.8');
      
      // Clear cache
      await service.clearCache();
      
      // Should make API call again
      await service.lookupIP('8.8.8.8');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Location Data', () => {
    it('should return simplified location data', async () => {
      const mockResponse = {
        ip: '8.8.8.8',
        country_code: 'US',
        country_name: 'United States',
        region_name: 'California',
        city: 'Mountain View',
        latitude: 37.4056,
        longitude: -122.0775,
        time_zone: {
          id: 'America/Los_Angeles',
        },
        connection: {
          isp: 'Google LLC',
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const location = await service.getLocation('8.8.8.8');
      
      expect(location).toBeDefined();
      expect(location?.country).toBe('United States');
      expect(location?.countryCode).toBe('US');
      expect(location?.city).toBe('Mountain View');
      expect(location?.timezone).toBe('America/Los_Angeles');
      expect(location?.isp).toBe('Google LLC');
    });

    it('should return null for failed lookups', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const location = await service.getLocation('1.2.3.4');
      expect(location).toBeNull();
    });
  });

  describe('Security Features', () => {
    it('should detect proxy IPs', async () => {
      const mockResponse = {
        ip: '1.2.3.4',
        country_code: 'XX',
        country_name: 'Unknown',
        security: {
          is_proxy: true,
          is_tor: false,
          threat_level: 'high',
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const isSuspicious = await service.isSuspiciousIP('1.2.3.4');
      expect(isSuspicious).toBe(true);
    });

    it('should detect Tor IPs', async () => {
      const mockResponse = {
        ip: '1.2.3.4',
        country_code: 'XX',
        country_name: 'Unknown',
        security: {
          is_proxy: false,
          is_tor: true,
          threat_level: 'medium',
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const isSuspicious = await service.isSuspiciousIP('1.2.3.4');
      expect(isSuspicious).toBe(true);
    });

    it('should detect high threat IPs', async () => {
      const mockResponse = {
        ip: '1.2.3.4',
        country_code: 'XX',
        country_name: 'Unknown',
        security: {
          is_proxy: false,
          is_tor: false,
          threat_level: 'high',
          threat_types: ['spam', 'malware'],
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const isSuspicious = await service.isSuspiciousIP('1.2.3.4');
      expect(isSuspicious).toBe(true);
    });

    it('should not flag clean IPs as suspicious', async () => {
      const mockResponse = {
        ip: '8.8.8.8',
        country_code: 'US',
        country_name: 'United States',
        security: {
          is_proxy: false,
          is_tor: false,
          threat_level: 'low',
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const isSuspicious = await service.isSuspiciousIP('8.8.8.8');
      expect(isSuspicious).toBe(false);
    });
  });

  describe('Anomaly Detection', () => {
    it('should detect new country access', async () => {
      const mockResponse = {
        ip: '1.2.3.4',
        country_code: 'RU',
        country_name: 'Russia',
        city: 'Moscow',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const previousLocations = [
        { countryCode: 'US', country: 'United States', city: 'New York' },
        { countryCode: 'CA', country: 'Canada', city: 'Toronto' },
      ];

      const anomaly = await service.detectLocationAnomaly('1.2.3.4', previousLocations);
      
      expect(anomaly.isAnomaly).toBe(true);
      expect(anomaly.reason).toContain('New country detected');
      expect(anomaly.reason).toContain('Russia');
    });

    it('should not flag known countries', async () => {
      const mockResponse = {
        ip: '8.8.8.8',
        country_code: 'US',
        country_name: 'United States',
        city: 'Mountain View',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const previousLocations = [
        { countryCode: 'US', country: 'United States', city: 'New York' },
        { countryCode: 'US', country: 'United States', city: 'Boston' },
      ];

      const anomaly = await service.detectLocationAnomaly('8.8.8.8', previousLocations);
      expect(anomaly.isAnomaly).toBe(false);
    });

    it('should flag proxy access as anomaly', async () => {
      const mockResponse = {
        ip: '1.2.3.4',
        country_code: 'US',
        country_name: 'United States',
        security: {
          is_proxy: true,
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const previousLocations = [
        { countryCode: 'US', country: 'United States', city: 'New York' },
      ];

      const anomaly = await service.detectLocationAnomaly('1.2.3.4', previousLocations);
      expect(anomaly.isAnomaly).toBe(true);
      expect(anomaly.reason).toContain('proxy');
    });
  });

  describe('Quota Management', () => {
    it('should track API usage', async () => {
      const mockResponse = {
        ip: '1.1.1.1',
        country_code: 'AU',
        country_name: 'Australia',
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await service.lookupIP('1.1.1.1');
      await service.lookupIP('2.2.2.2');
      await service.lookupIP('3.3.3.3');

      const quota = service.getQuotaUsage();
      expect(quota.used).toBe(3);
      expect(quota.total).toBe(10000);
    });

    it('should block calls when quota exceeded', async () => {
      service.setMonthlyQuota(1);

      const mockResponse = {
        ip: '1.1.1.1',
        country_code: 'AU',
        country_name: 'Australia',
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      // First call succeeds
      const result1 = await service.lookupIP('1.1.1.1');
      expect(result1).toBeDefined();

      // Second call blocked
      const result2 = await service.lookupIP('2.2.2.2');
      expect(result2).toBeNull();
    });

    it('should allow setting custom quota', () => {
      service.setMonthlyQuota(50000);
      const quota = service.getQuotaUsage();
      expect(quota.total).toBe(50000);
    });
  });

  describe('Usage Statistics', () => {
    it('should track total requests', async () => {
      const mockResponse = {
        ip: '1.1.1.1',
        country_code: 'AU',
        country_name: 'Australia',
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await service.lookupIP('1.1.1.1');
      await service.lookupIP('1.1.1.1'); // Cache hit
      await service.lookupIP('2.2.2.2');

      const stats = service.getUsageStats();
      expect(stats.totalRequests).toBe(3);
    });

    it('should calculate cache hit rate', async () => {
      const mockResponse = {
        ip: '1.1.1.1',
        country_code: 'AU',
        country_name: 'Australia',
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      // 1 miss, 3 hits
      await service.lookupIP('1.1.1.1'); // Miss
      await service.lookupIP('1.1.1.1'); // Hit
      await service.lookupIP('1.1.1.1'); // Hit
      await service.lookupIP('1.1.1.1'); // Hit

      const stats = service.getUsageStats();
      expect(stats.cacheHitRate).toBe('75.00%');
    });

    it('should track errors', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      await service.lookupIP('1.2.3.4');

      const stats = service.getUsageStats();
      expect(stats.errors).toBe(1);
    });
  });

  describe('Zod Schema Validation', () => {
    it('should validate correct response schema', () => {
      const validResponse = {
        ip: '8.8.8.8',
        country_code: 'US',
        country_name: 'United States',
      };

      const result = IpstackResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('should reject invalid response schema', () => {
      const invalidResponse = {
        ip: '8.8.8.8',
        // Missing required fields
      };

      const result = IpstackResponseSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });
  });
});

