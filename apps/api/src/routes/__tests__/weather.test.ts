/**
 * Integration Tests for Weather API Endpoints
 * 
 * Test all weather routes with various scenarios
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import weatherRoutes from '../weather';

// Mock weather service
vi.mock('../../services/weather-service', () => ({
  weatherService: {
    getCurrentWeather: vi.fn(),
    getForecast: vi.fn(),
    getWeatherForIP: vi.fn(),
    getUsageStats: vi.fn(),
    getQuotaUsage: vi.fn(),
    clearCache: vi.fn(),
  },
}));

// Mock geolocation service
vi.mock('../../services/geolocation-service', () => ({
  geolocationService: {
    getLocation: vi.fn(),
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

import { weatherService } from '../../services/weather-service';

describe('Weather API Routes', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/api/weather', weatherRoutes);
  });

  describe('GET /api/weather/current', () => {
    it('should return weather for city', async () => {
      const mockWeather = {
        location: {
          city: 'Mountain View',
          country: 'US',
          timezone: 'UTC-8',
          localtime: '2024-01-15T14:00:00Z',
          coordinates: { lat: 37.39, lon: -122.08 },
        },
        current: {
          temp: 15,
          feelsLike: 14,
          tempMin: 12,
          tempMax: 18,
          condition: 'Clear',
          description: 'clear sky',
          icon: '01d',
          humidity: 65,
          pressure: 1013,
          windSpeed: 4,
          windDirection: 180,
          windDirectionCompass: 'S',
          cloudCover: 10,
          visibility: 10000,
          sunrise: new Date(),
          sunset: new Date(),
          isDay: true,
        },
      };

      (weatherService.getCurrentWeather as any).mockResolvedValueOnce(mockWeather);

      const res = await app.request('/api/weather/current?city=Mountain View&country=US');
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.location.city).toBe('Mountain View');
    });

    it('should auto-detect location from IP', async () => {
      const mockWeather = {
        location: { city: 'San Francisco', country: 'US', timezone: 'UTC-8', localtime: '2024-01-15T14:00:00Z', coordinates: { lat: 37.77, lon: -122.42 } },
        current: {
          temp: 18,
          feelsLike: 17,
          tempMin: 16,
          tempMax: 20,
          condition: 'Clear',
          description: 'clear',
          icon: '01d',
          humidity: 60,
          pressure: 1015,
          windSpeed: 5,
          windDirection: 270,
          windDirectionCompass: 'W',
          cloudCover: 5,
          visibility: 10000,
          sunrise: new Date(),
          sunset: new Date(),
          isDay: true,
        },
      };

      (weatherService.getCurrentWeather as any).mockResolvedValueOnce(mockWeather);

      const res = await app.request('/api/weather/current?autoDetect=true');
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle missing location parameters', async () => {
      const res = await app.request('/api/weather/current');
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Missing location parameters');
    });

    it('should handle failed weather fetch', async () => {
      (weatherService.getCurrentWeather as any).mockResolvedValueOnce(null);

      const res = await app.request('/api/weather/current?city=InvalidCity');
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toContain('not available');
    });
  });

  describe('GET /api/weather/forecast', () => {
    it('should return forecast data', async () => {
      const mockForecast = [
        {
          date: '2024-01-16',
          tempMin: 10,
          tempMax: 18,
          condition: 'Clear',
          description: 'clear sky',
          icon: '01d',
          humidity: 65,
          windSpeed: 4,
          chanceOfRain: 0.1,
        },
        {
          date: '2024-01-17',
          tempMin: 12,
          tempMax: 20,
          condition: 'Clouds',
          description: 'scattered clouds',
          icon: '03d',
          humidity: 70,
          windSpeed: 5,
          chanceOfRain: 0.2,
        },
      ];

      (weatherService.getForecast as any).mockResolvedValueOnce(mockForecast);

      const res = await app.request('/api/weather/forecast?city=NYC&country=US');
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBe(2);
    });

    it('should handle missing parameters', async () => {
      const res = await app.request('/api/weather/forecast');
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Missing location parameters');
    });
  });

  describe('GET /api/weather/location/:ip', () => {
    it('should get weather for IP (admin)', async () => {
      const mockWeather = {
        location: { city: 'London', country: 'GB', timezone: 'UTC+0', localtime: '2024-01-15T14:00:00Z', coordinates: { lat: 51.51, lon: -0.13 } },
        current: {
          temp: 10,
          feelsLike: 8,
          tempMin: 9,
          tempMax: 12,
          condition: 'Rain',
          description: 'light rain',
          icon: '10d',
          humidity: 85,
          pressure: 1008,
          windSpeed: 7,
          windDirection: 230,
          windDirectionCompass: 'SW',
          cloudCover: 90,
          visibility: 7000,
          sunrise: new Date(),
          sunset: new Date(),
          isDay: true,
        },
      };

      (weatherService.getWeatherForIP as any).mockResolvedValueOnce(mockWeather);

      const res = await app.request('/api/weather/location/8.8.8.8', {
        headers: {
          'x-user-email': 'admin@example.com',
          'x-user-role': 'admin',
        },
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.location.city).toBe('London');
    });

    it('should reject unauthorized roles', async () => {
      const res = await app.request('/api/weather/location/8.8.8.8', {
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

  describe('GET /api/weather/stats', () => {
    it('should return statistics for admin', async () => {
      const mockStats = {
        totalRequests: 500,
        cacheHits: 450,
        cacheMisses: 50,
        apiCalls: 50,
        errors: 0,
        quotaWarning: false,
        cacheSize: 20,
        forecastCacheSize: 10,
        cacheHitRate: '90.00%',
        topLocations: [
          { city: 'NYC', requests: 150 },
          { city: 'LA', requests: 100 },
        ],
      };

      (weatherService.getUsageStats as any).mockReturnValueOnce(mockStats);

      const res = await app.request('/api/weather/stats', {
        headers: {
          'x-user-email': 'admin@example.com',
          'x-user-role': 'admin',
        },
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.cacheHitRate).toBe('90.00%');
      expect(data.data.topLocations.length).toBe(2);
    });

    it('should reject non-admin users', async () => {
      const res = await app.request('/api/weather/stats', {
        headers: {
          'x-user-email': 'user@example.com',
          'x-user-role': 'member',
        },
      });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/weather/quota', () => {
    it('should return quota information', async () => {
      const mockQuota = {
        callsLastMinute: 5,
        limit: 60,
        percentage: 8.33,
      };

      (weatherService.getQuotaUsage as any).mockReturnValueOnce(mockQuota);

      const res = await app.request('/api/weather/quota', {
        headers: {
          'x-user-email': 'admin@example.com',
          'x-user-role': 'admin',
        },
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.callsLastMinute).toBe(5);
      expect(data.warning).toBeUndefined();
    });

    it('should warn at high usage', async () => {
      const mockQuota = {
        callsLastMinute: 50,
        limit: 60,
        percentage: 83.33,
      };

      (weatherService.getQuotaUsage as any).mockReturnValueOnce(mockQuota);

      const res = await app.request('/api/weather/quota', {
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

  describe('DELETE /api/weather/cache', () => {
    it('should clear cache for admin', async () => {
      (weatherService.clearCache as any).mockImplementationOnce(() => {});

      const res = await app.request('/api/weather/cache', {
        method: 'DELETE',
        headers: {
          'x-user-email': 'admin@example.com',
          'x-user-role': 'admin',
        },
      });

      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(weatherService.clearCache).toHaveBeenCalled();
    });

    it('should reject non-admin users', async () => {
      const res = await app.request('/api/weather/cache', {
        method: 'DELETE',
        headers: {
          'x-user-email': 'manager@example.com',
          'x-user-role': 'workspace-manager',
        },
      });

      expect(res.status).toBe(403);
      expect(weatherService.clearCache).not.toHaveBeenCalled();
    });
  });
});

