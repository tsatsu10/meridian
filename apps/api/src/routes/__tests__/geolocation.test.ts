/**
 * Integration Tests for Geolocation API Endpoints
 * 
 * Test all geolocation routes with various scenarios
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import geolocationRoutes from '../geolocation';

// Mock geolocation service
vi.mock('../../services/geolocation-service', () => ({
  geolocationService: {
    getLocation: vi.fn(),
    isSuspiciousIP: vi.fn(),
    getUsageStats: vi.fn(),
    getQuotaUsage: vi.fn(),
    clearCache: vi.fn(),
  },
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock request helpers
vi.mock('../../utils/request-helpers', () => ({
  getClientIP: vi.fn(() => '1.2.3.4'),
}));

import { geolocationService } from '../../services/geolocation-service';
import { getClientIP } from '../../utils/request-helpers';

describe('Geolocation API Routes', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/api/geolocation', geolocationRoutes);
  });

  describe('GET /api/geolocation/current', () => {
    it('should return current IP location', async () => {
      const mockLocation = {
        ip: '1.2.3.4',
        country: 'United States',
        countryCode: 'US',
        city: 'New York',
        timezone: 'America/New_York',
      };

      (geolocationService.getLocation as any).mockResolvedValueOnce(mockLocation);

      const res = await app.request('/api/geolocation/current');
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockLocation);
    });

    it('should handle unknown IP', async () => {
      (getClientIP as any).mockReturnValueOnce('unknown');

      const res = await app.request('/api/geolocation/current');
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Unable to determine');
    });

    it('should handle missing location data', async () => {
      (geolocationService.getLocation as any).mockResolvedValueOnce(null);

      const res = await app.request('/api/geolocation/current');
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toContain('not available');
    });
  });

  describe('GET /api/geolocation/lookup/:ip', () => {
    it('should lookup IP for admin', async () => {
      const mockLocation = {
        ip: '8.8.8.8',
        country: 'United States',
        countryCode: 'US',
        city: 'Mountain View',
      };

      (geolocationService.getLocation as any).mockResolvedValueOnce(mockLocation);

      const res = await app.request('/api/geolocation/lookup/8.8.8.8', {
        headers: {
          'x-user-email': 'admin@example.com',
          'x-user-role': 'admin',
        },
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.ip).toBe('8.8.8.8');
    });

    it('should lookup IP for workspace-manager', async () => {
      const mockLocation = {
        ip: '1.1.1.1',
        country: 'Australia',
        countryCode: 'AU',
      };

      (geolocationService.getLocation as any).mockResolvedValueOnce(mockLocation);

      const res = await app.request('/api/geolocation/lookup/1.1.1.1', {
        headers: {
          'x-user-email': 'manager@example.com',
          'x-user-role': 'workspace-manager',
        },
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should reject unauthorized roles', async () => {
      const res = await app.request('/api/geolocation/lookup/8.8.8.8', {
        headers: {
          'x-user-email': 'user@example.com',
          'x-user-role': 'member',
        },
      });

      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain('Unauthorized');
    });

    it('should handle lookup failures', async () => {
      (geolocationService.getLocation as any).mockResolvedValueOnce(null);

      const res = await app.request('/api/geolocation/lookup/1.2.3.4', {
        headers: {
          'x-user-email': 'admin@example.com',
          'x-user-role': 'admin',
        },
      });

      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toContain('not available');
    });
  });

  describe('GET /api/geolocation/stats', () => {
    it('should return statistics for admin', async () => {
      const mockStats = {
        totalRequests: 1000,
        cacheHits: 950,
        cacheMisses: 50,
        apiCalls: 50,
        errors: 0,
        quotaWarning: false,
        cacheSize: 45,
        cacheHitRate: '95.00%',
      };

      (geolocationService.getUsageStats as any).mockReturnValueOnce(mockStats);

      const res = await app.request('/api/geolocation/stats', {
        headers: {
          'x-user-email': 'admin@example.com',
          'x-user-role': 'admin',
        },
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.cacheHitRate).toBe('95.00%');
    });

    it('should reject non-admin users', async () => {
      const res = await app.request('/api/geolocation/stats', {
        headers: {
          'x-user-email': 'user@example.com',
          'x-user-role': 'member',
        },
      });

      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain('Unauthorized');
    });
  });

  describe('GET /api/geolocation/quota', () => {
    it('should return quota information', async () => {
      const mockQuota = {
        used: 450,
        total: 10000,
        percentage: 4.5,
        remaining: 9550,
      };

      (geolocationService.getQuotaUsage as any).mockReturnValueOnce(mockQuota);

      const res = await app.request('/api/geolocation/quota', {
        headers: {
          'x-user-email': 'admin@example.com',
          'x-user-role': 'admin',
        },
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.percentage).toBe(4.5);
      expect(data.warning).toBeUndefined();
    });

    it('should warn at 80% quota usage', async () => {
      const mockQuota = {
        used: 8500,
        total: 10000,
        percentage: 85,
        remaining: 1500,
      };

      (geolocationService.getQuotaUsage as any).mockReturnValueOnce(mockQuota);

      const res = await app.request('/api/geolocation/quota', {
        headers: {
          'x-user-email': 'admin@example.com',
          'x-user-role': 'admin',
        },
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.warning).toContain('Approaching quota');
    });

    it('should alert at 95% quota usage', async () => {
      const mockQuota = {
        used: 9700,
        total: 10000,
        percentage: 97,
        remaining: 300,
      };

      (geolocationService.getQuotaUsage as any).mockReturnValueOnce(mockQuota);

      const res = await app.request('/api/geolocation/quota', {
        headers: {
          'x-user-email': 'admin@example.com',
          'x-user-role': 'admin',
        },
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.critical).toContain('Critical');
    });
  });

  describe('POST /api/geolocation/check-suspicious/:ip', () => {
    it('should check suspicious IP', async () => {
      const mockLocation = {
        ip: '1.2.3.4',
        country: 'Unknown',
        countryCode: 'XX',
        isProxy: true,
        isTor: false,
        threatLevel: 'high',
      };

      (geolocationService.isSuspiciousIP as any).mockResolvedValueOnce(true);
      (geolocationService.getLocation as any).mockResolvedValueOnce(mockLocation);

      const res = await app.request('/api/geolocation/check-suspicious/1.2.3.4', {
        method: 'POST',
        headers: {
          'x-user-email': 'admin@example.com',
          'x-user-role': 'admin',
        },
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.isSuspicious).toBe(true);
      expect(data.data.details.isProxy).toBe(true);
    });

    it('should identify clean IPs', async () => {
      const mockLocation = {
        ip: '8.8.8.8',
        country: 'United States',
        countryCode: 'US',
        isProxy: false,
        isTor: false,
        threatLevel: 'low',
      };

      (geolocationService.isSuspiciousIP as any).mockResolvedValueOnce(false);
      (geolocationService.getLocation as any).mockResolvedValueOnce(mockLocation);

      const res = await app.request('/api/geolocation/check-suspicious/8.8.8.8', {
        method: 'POST',
        headers: {
          'x-user-email': 'admin@example.com',
          'x-user-role': 'admin',
        },
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.isSuspicious).toBe(false);
    });

    it('should reject unauthorized users', async () => {
      const res = await app.request('/api/geolocation/check-suspicious/1.2.3.4', {
        method: 'POST',
        headers: {
          'x-user-email': 'user@example.com',
          'x-user-role': 'member',
        },
      });

      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain('Unauthorized');
    });
  });

  describe('DELETE /api/geolocation/cache', () => {
    it('should clear cache for admin', async () => {
      (geolocationService.clearCache as any).mockResolvedValueOnce(undefined);

      const res = await app.request('/api/geolocation/cache', {
        method: 'DELETE',
        headers: {
          'x-user-email': 'admin@example.com',
          'x-user-role': 'admin',
        },
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('cleared successfully');
      expect(geolocationService.clearCache).toHaveBeenCalled();
    });

    it('should reject non-admin users', async () => {
      const res = await app.request('/api/geolocation/cache', {
        method: 'DELETE',
        headers: {
          'x-user-email': 'manager@example.com',
          'x-user-role': 'workspace-manager',
        },
      });

      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain('Unauthorized');
      expect(geolocationService.clearCache).not.toHaveBeenCalled();
    });

    it('should handle cache clear errors', async () => {
      (geolocationService.clearCache as any).mockRejectedValueOnce(new Error('Redis error'));

      const res = await app.request('/api/geolocation/cache', {
        method: 'DELETE',
        headers: {
          'x-user-email': 'admin@example.com',
          'x-user-role': 'admin',
        },
      });

      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toContain('Failed to clear cache');
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      (geolocationService.getLocation as any).mockRejectedValueOnce(new Error('Service error'));

      const res = await app.request('/api/geolocation/current');
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it('should handle missing headers', async () => {
      const res = await app.request('/api/geolocation/lookup/8.8.8.8');
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toContain('Unauthorized');
    });
  });
});

