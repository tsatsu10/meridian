/**
 * Integration Tests for Unsplash API Endpoints
 * 
 * Test all Unsplash routes with various scenarios
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import unsplashRoutes from '../unsplash';

// Mock unsplash service
vi.mock('../../services/unsplash-service', () => ({
  unsplashService: {
    searchPhotos: vi.fn(),
    getRandomPhoto: vi.fn(),
    getPhoto: vi.fn(),
    trackDownload: vi.fn(),
    getCollections: vi.fn(),
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

import { unsplashService } from '../../services/unsplash-service';

describe('Unsplash API Routes', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/api/unsplash', unsplashRoutes);
  });

  describe('GET /api/unsplash/search', () => {
    it('should search photos by query', async () => {
      const mockResult = {
        photos: [
          {
            id: 'abc123',
            description: 'Workspace photo',
            urls: { regular: 'https://unsplash.com/photo.jpg', thumb: 'https://unsplash.com/thumb.jpg' },
            user: { name: 'John Doe', username: 'johndoe', profileUrl: 'https://unsplash.com/@johndoe' },
            color: '#2C3E50',
            width: 4000,
            height: 3000,
            likes: 150,
          },
        ],
        total: 1000,
      };

      (unsplashService.searchPhotos as any).mockResolvedValueOnce(mockResult);

      const res = await app.request('/api/unsplash/search?query=workspace&page=1&perPage=20');
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.photos.length).toBe(1);
      expect(data.data.total).toBe(1000);
    });

    it('should require query parameter', async () => {
      const res = await app.request('/api/unsplash/search');
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('query is required');
    });

    it('should handle search failures', async () => {
      (unsplashService.searchPhotos as any).mockResolvedValueOnce(null);

      const res = await app.request('/api/unsplash/search?query=test');
      const data = await res.json();

      expect(res.status).toBe(503);
      expect(data.error).toContain('failed');
    });
  });

  describe('GET /api/unsplash/random', () => {
    it('should get random photo', async () => {
      const mockPhotos = [
        {
          id: 'random123',
          description: 'Random photo',
          urls: { regular: 'https://unsplash.com/random.jpg' },
          user: { name: 'Jane Smith', username: 'janesmith', profileUrl: '' },
          color: '#FF5733',
          width: 3000,
          height: 2000,
          likes: 200,
        },
      ];

      (unsplashService.getRandomPhoto as any).mockResolvedValueOnce(mockPhotos);

      const res = await app.request('/api/unsplash/random?query=nature');
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('random123');
    });

    it('should handle multiple random photos', async () => {
      const mockPhotos = [
        { id: '1', /* ... */ },
        { id: '2', /* ... */ },
        { id: '3', /* ... */ },
      ];

      (unsplashService.getRandomPhoto as any).mockResolvedValueOnce(mockPhotos);

      const res = await app.request('/api/unsplash/random?count=3');
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe('GET /api/unsplash/photo/:id', () => {
    it('should get photo by ID', async () => {
      const mockPhoto = {
        id: 'specific123',
        description: 'Specific photo',
        urls: { regular: 'https://unsplash.com/specific.jpg' },
        user: { name: 'Photographer', username: 'photographer', profileUrl: '' },
        color: '#000000',
        width: 4000,
        height: 3000,
        likes: 500,
      };

      (unsplashService.getPhoto as any).mockResolvedValueOnce(mockPhoto);

      const res = await app.request('/api/unsplash/photo/specific123');
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('specific123');
    });

    it('should handle photo not found', async () => {
      (unsplashService.getPhoto as any).mockResolvedValueOnce(null);

      const res = await app.request('/api/unsplash/photo/nonexistent');
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toContain('not found');
    });
  });

  describe('POST /api/unsplash/download/:id', () => {
    it('should track download', async () => {
      (unsplashService.trackDownload as any).mockResolvedValueOnce(true);

      const res = await app.request('/api/unsplash/download/test123', {
        method: 'POST',
        headers: {
          'x-user-email': 'user@example.com',
        },
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(unsplashService.trackDownload).toHaveBeenCalledWith('test123');
    });

    it('should succeed even if tracking fails', async () => {
      (unsplashService.trackDownload as any).mockResolvedValueOnce(false);

      const res = await app.request('/api/unsplash/download/test123', {
        method: 'POST',
      });

      const data = await res.json();

      // Should still return success (don't block user)
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('GET /api/unsplash/collections', () => {
    it('should get curated collections', async () => {
      const mockCollections = [
        {
          id: 'col1',
          title: 'Productivity',
          description: 'Workspace photos',
          total_photos: 500,
        },
      ];

      (unsplashService.getCollections as any).mockResolvedValueOnce(mockCollections);

      const res = await app.request('/api/unsplash/collections?page=1&perPage=10');
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  describe('GET /api/unsplash/stats', () => {
    it('should return statistics for admin', async () => {
      const mockStats = {
        totalRequests: 500,
        searchRequests: 400,
        randomRequests: 80,
        downloadRequests: 20,
        cacheHits: 450,
        cacheMisses: 50,
        apiCalls: 50,
        errors: 0,
        quotaWarning: false,
        cacheSize: 30,
        photoCacheSize: 15,
        cacheHitRate: '90.00%',
        requestsLastHour: 5,
        topSearches: [
          { query: 'workspace', count: 200 },
          { query: 'nature', count: 150 },
        ],
      };

      (unsplashService.getUsageStats as any).mockReturnValueOnce(mockStats);

      const res = await app.request('/api/unsplash/stats', {
        headers: {
          'x-user-email': 'admin@example.com',
          'x-user-role': 'admin',
        },
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.cacheHitRate).toBe('90.00%');
      expect(data.data.topSearches.length).toBe(2);
    });

    it('should reject non-admin users', async () => {
      const res = await app.request('/api/unsplash/stats', {
        headers: {
          'x-user-email': 'user@example.com',
          'x-user-role': 'member',
        },
      });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/unsplash/quota', () => {
    it('should return quota information', async () => {
      const mockQuota = {
        requestsLastHour: 10,
        limit: 50,
        percentage: 20,
        remaining: 40,
      };

      (unsplashService.getQuotaUsage as any).mockReturnValueOnce(mockQuota);

      const res = await app.request('/api/unsplash/quota', {
        headers: {
          'x-user-email': 'admin@example.com',
          'x-user-role': 'admin',
        },
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.requestsLastHour).toBe(10);
      expect(data.warning).toBeUndefined();
    });

    it('should warn at high usage', async () => {
      const mockQuota = {
        requestsLastHour: 45,
        limit: 50,
        percentage: 90,
        remaining: 5,
      };

      (unsplashService.getQuotaUsage as any).mockReturnValueOnce(mockQuota);

      const res = await app.request('/api/unsplash/quota', {
        headers: {
          'x-user-email': 'admin@example.com',
          'x-user-role': 'admin',
        },
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.warning).toContain('Approaching');
    });
  });

  describe('DELETE /api/unsplash/cache', () => {
    it('should clear cache for admin', async () => {
      (unsplashService.clearCache as any).mockImplementationOnce(() => {});

      const res = await app.request('/api/unsplash/cache', {
        method: 'DELETE',
        headers: {
          'x-user-email': 'admin@example.com',
          'x-user-role': 'admin',
        },
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(unsplashService.clearCache).toHaveBeenCalled();
    });

    it('should reject non-admin users', async () => {
      const res = await app.request('/api/unsplash/cache', {
        method: 'DELETE',
        headers: {
          'x-user-email': 'manager@example.com',
          'x-user-role': 'workspace-manager',
        },
      });

      expect(res.status).toBe(403);
      expect(unsplashService.clearCache).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/unsplash/categories', () => {
    it('should return predefined categories', async () => {
      const res = await app.request('/api/unsplash/categories');
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
      
      // Check category structure
      const category = data.data[0];
      expect(category).toHaveProperty('id');
      expect(category).toHaveProperty('name');
      expect(category).toHaveProperty('query');
      expect(category).toHaveProperty('icon');
    });
  });
});

