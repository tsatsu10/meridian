/**
 * Unit Tests for Weather Service
 * 
 * Comprehensive test coverage for OpenWeatherMap API integration
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WeatherService, OpenWeatherCurrentSchema } from '../weather-service';

// Mock logger
vi.mock('../../utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock geolocation service
vi.mock('../geolocation-service', () => ({
  geolocationService: {
    getLocation: vi.fn(),
  },
}));

// Mock fetch
global.fetch = vi.fn();

import { geolocationService } from '../geolocation-service';

describe('WeatherService', () => {
  let service: WeatherService;
  
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENWEATHERMAP_API_KEY = 'test-api-key';
    process.env.OPENWEATHERMAP_UNITS = 'metric';
    service = new WeatherService();
  });

  afterEach(() => {
    delete process.env.OPENWEATHERMAP_API_KEY;
    delete process.env.OPENWEATHERMAP_UNITS;
  });

  describe('Initialization', () => {
    it('should initialize with API key', () => {
      expect(service).toBeDefined();
    });

    it('should handle missing API key', () => {
      delete process.env.OPENWEATHERMAP_API_KEY;
      const serviceWithoutKey = new WeatherService();
      expect(serviceWithoutKey).toBeDefined();
    });

    it('should set units from environment', () => {
      process.env.OPENWEATHERMAP_UNITS = 'imperial';
      const imperialService = new WeatherService();
      expect(imperialService).toBeDefined();
    });
  });

  describe('Current Weather - By City', () => {
    it('should fetch weather for a city', async () => {
      const mockResponse = {
        coord: { lon: -122.08, lat: 37.39 },
        weather: [
          {
            id: 800,
            main: 'Clear',
            description: 'clear sky',
            icon: '01d',
          },
        ],
        main: {
          temp: 15,
          feels_like: 14,
          temp_min: 12,
          temp_max: 18,
          pressure: 1013,
          humidity: 65,
        },
        visibility: 10000,
        wind: { speed: 3.5, deg: 180 },
        clouds: { all: 10 },
        dt: 1705334400,
        sys: {
          country: 'US',
          sunrise: 1705325400,
          sunset: 1705362600,
        },
        timezone: -28800,
        id: 5375480,
        name: 'Mountain View',
        cod: 200,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const weather = await service.getCurrentWeather({
        city: 'Mountain View',
        country: 'US',
      });

      expect(weather).toBeDefined();
      expect(weather?.location.city).toBe('Mountain View');
      expect(weather?.location.country).toBe('US');
      expect(weather?.current.temp).toBe(15);
      expect(weather?.current.condition).toBe('Clear');
    });

    it('should fetch weather by coordinates', async () => {
      const mockResponse = {
        coord: { lon: -122.08, lat: 37.39 },
        weather: [{ id: 800, main: 'Clear', description: 'clear sky', icon: '01d' }],
        main: {
          temp: 16,
          feels_like: 15,
          temp_min: 13,
          temp_max: 19,
          pressure: 1013,
          humidity: 60,
        },
        visibility: 10000,
        wind: { speed: 4.0, deg: 200 },
        clouds: { all: 15 },
        dt: 1705334400,
        sys: { country: 'US', sunrise: 1705325400, sunset: 1705362600 },
        timezone: -28800,
        id: 5375480,
        name: 'Mountain View',
        cod: 200,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const weather = await service.getCurrentWeather({
        lat: 37.39,
        lon: -122.08,
      });

      expect(weather).toBeDefined();
      expect(weather?.location.city).toBe('Mountain View');
    });

    it('should handle API errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const weather = await service.getCurrentWeather({
        city: 'London',
        country: 'UK',
      });

      expect(weather).toBeNull();
    });

    it('should handle invalid API key response', async () => {
      const errorResponse = {
        cod: 401,
        message: 'Invalid API key',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => errorResponse,
      });

      const weather = await service.getCurrentWeather({
        city: 'Paris',
        country: 'FR',
      });

      expect(weather).toBeNull();
    });
  });

  describe('Caching', () => {
    it('should cache weather lookups', async () => {
      const mockResponse = {
        coord: { lon: -0.13, lat: 51.51 },
        weather: [{ id: 803, main: 'Clouds', description: 'broken clouds', icon: '04d' }],
        main: { temp: 10, feels_like: 8, temp_min: 9, temp_max: 12, pressure: 1010, humidity: 80 },
        visibility: 8000,
        wind: { speed: 5.5, deg: 250 },
        clouds: { all: 75 },
        dt: 1705334400,
        sys: { country: 'GB', sunrise: 1705310400, sunset: 1705342800 },
        timezone: 0,
        id: 2643743,
        name: 'London',
        cod: 200,
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      // First call - API
      await service.getCurrentWeather({ city: 'London', country: 'GB' });
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Second call - cache
      await service.getCurrentWeather({ city: 'London', country: 'GB' });
      expect(global.fetch).toHaveBeenCalledTimes(1); // Still 1
    });

    it('should track cache statistics', async () => {
      const mockResponse = {
        coord: { lon: 0, lat: 0 },
        weather: [{ id: 800, main: 'Clear', description: 'clear', icon: '01d' }],
        main: { temp: 25, feels_like: 24, temp_min: 24, temp_max: 26, pressure: 1015, humidity: 50 },
        visibility: 10000,
        wind: { speed: 2, deg: 100 },
        clouds: { all: 0 },
        dt: 1705334400,
        sys: { country: 'US', sunrise: 1705325400, sunset: 1705362600 },
        timezone: 0,
        id: 1,
        name: 'Test City',
        cod: 200,
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      // Miss
      await service.getCurrentWeather({ city: 'NYC' });
      
      // Hit
      await service.getCurrentWeather({ city: 'NYC' });

      const stats = service.getUsageStats();
      expect(stats.cacheHits).toBe(1);
      expect(stats.cacheMisses).toBe(1);
      expect(stats.apiCalls).toBe(1);
    });

    it('should clear cache', async () => {
      const mockResponse = {
        coord: { lon: 0, lat: 0 },
        weather: [{ id: 800, main: 'Clear', description: 'clear', icon: '01d' }],
        main: { temp: 20, feels_like: 20, temp_min: 20, temp_max: 20, pressure: 1013, humidity: 50 },
        visibility: 10000,
        wind: { speed: 3, deg: 90 },
        clouds: { all: 0 },
        dt: 1705334400,
        sys: { country: 'US', sunrise: 1705325400, sunset: 1705362600 },
        timezone: 0,
        id: 1,
        name: 'Test',
        cod: 200,
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      // Cache a city
      await service.getCurrentWeather({ city: 'Boston' });
      
      // Clear cache
      service.clearCache();
      
      // Should make API call again
      await service.getCurrentWeather({ city: 'Boston' });
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Auto-Detection with ipstack', () => {
    it('should detect location from IP and fetch weather', async () => {
      const mockLocation = {
        city: 'San Francisco',
        countryCode: 'US',
        latitude: 37.77,
        longitude: -122.42,
      };

      (geolocationService.getLocation as any).mockResolvedValueOnce(mockLocation);

      const mockWeather = {
        coord: { lon: -122.42, lat: 37.77 },
        weather: [{ id: 800, main: 'Clear', description: 'clear', icon: '01d' }],
        main: { temp: 18, feels_like: 17, temp_min: 16, temp_max: 20, pressure: 1015, humidity: 60 },
        visibility: 10000,
        wind: { speed: 4, deg: 270 },
        clouds: { all: 5 },
        dt: 1705334400,
        sys: { country: 'US', sunrise: 1705325400, sunset: 1705362600 },
        timezone: -28800,
        id: 5391959,
        name: 'San Francisco',
        cod: 200,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockWeather,
      });

      const weather = await service.getWeatherForIP('8.8.8.8');

      expect(geolocationService.getLocation).toHaveBeenCalledWith('8.8.8.8');
      expect(weather).toBeDefined();
      expect(weather?.location.city).toBe('San Francisco');
    });

    it('should handle failed location detection', async () => {
      (geolocationService.getLocation as any).mockResolvedValueOnce(null);

      const weather = await service.getWeatherForIP('1.2.3.4');

      expect(weather).toBeNull();
    });
  });

  describe('Weather Data Transformation', () => {
    it('should transform OpenWeatherMap response correctly', async () => {
      const mockResponse = {
        coord: { lon: -0.13, lat: 51.51 },
        weather: [{ id: 500, main: 'Rain', description: 'light rain', icon: '10d' }],
        main: { temp: 12, feels_like: 10, temp_min: 10, temp_max: 14, pressure: 1008, humidity: 85 },
        visibility: 7000,
        wind: { speed: 6.5, deg: 230 },
        clouds: { all: 90 },
        rain: { '1h': 0.5, '3h': 1.2 },
        dt: 1705334400,
        sys: { country: 'GB', sunrise: 1705310400, sunset: 1705342800 },
        timezone: 0,
        id: 2643743,
        name: 'London',
        cod: 200,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const weather = await service.getCurrentWeather({ city: 'London' });

      expect(weather).toBeDefined();
      expect(weather?.current.condition).toBe('Rain');
      expect(weather?.current.description).toBe('light rain');
      expect(weather?.current.humidity).toBe(85);
      expect(weather?.current.windSpeed).toBe(7); // Rounded from 6.5
      expect(weather?.rain?.lastHour).toBe(0.5);
      expect(weather?.rain?.last3Hours).toBe(1.2);
    });

    it('should calculate wind direction compass correctly', async () => {
      const mockResponse = {
        coord: { lon: 0, lat: 0 },
        weather: [{ id: 800, main: 'Clear', description: 'clear', icon: '01d' }],
        main: { temp: 20, feels_like: 20, temp_min: 20, temp_max: 20, pressure: 1013, humidity: 50 },
        visibility: 10000,
        wind: { speed: 5, deg: 0 }, // North
        clouds: { all: 0 },
        dt: 1705334400,
        sys: { country: 'US', sunrise: 1705325400, sunset: 1705362600 },
        timezone: 0,
        id: 1,
        name: 'Test',
        cod: 200,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const weather = await service.getCurrentWeather({ city: 'Test' });

      expect(weather?.current.windDirectionCompass).toBe('N');
    });

    it('should determine day/night correctly', async () => {
      const now = Date.now() / 1000;
      const mockResponse = {
        coord: { lon: 0, lat: 0 },
        weather: [{ id: 800, main: 'Clear', description: 'clear', icon: '01d' }],
        main: { temp: 20, feels_like: 20, temp_min: 20, temp_max: 20, pressure: 1013, humidity: 50 },
        visibility: 10000,
        wind: { speed: 2, deg: 90 },
        clouds: { all: 0 },
        dt: now,
        sys: {
          country: 'US',
          sunrise: now - 3600, // 1 hour ago
          sunset: now + 3600, // 1 hour from now
        },
        timezone: 0,
        id: 1,
        name: 'Test',
        cod: 200,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const weather = await service.getCurrentWeather({ city: 'Test' });

      expect(weather?.current.isDay).toBe(true);
    });
  });

  describe('5-Day Forecast', () => {
    it('should fetch and transform forecast data', async () => {
      const mockForecast = {
        cod: '200',
        message: 0,
        cnt: 40,
        list: [
          {
            dt: 1705334400,
            main: { temp: 15, feels_like: 14, temp_min: 12, temp_max: 18, pressure: 1013, humidity: 65 },
            weather: [{ id: 800, main: 'Clear', description: 'clear sky', icon: '01d' }],
            clouds: { all: 10 },
            wind: { speed: 3.5, deg: 180 },
            pop: 0.1,
            dt_txt: '2024-01-15 12:00:00',
          },
          {
            dt: 1705348800,
            main: { temp: 14, feels_like: 13, temp_min: 11, temp_max: 17, pressure: 1012, humidity: 70 },
            weather: [{ id: 801, main: 'Clouds', description: 'few clouds', icon: '02d' }],
            clouds: { all: 20 },
            wind: { speed: 4.0, deg: 190 },
            pop: 0.2,
            dt_txt: '2024-01-15 16:00:00',
          },
        ],
        city: {
          id: 5375480,
          name: 'Mountain View',
          coord: { lat: 37.39, lon: -122.08 },
          country: 'US',
          timezone: -28800,
          sunrise: 1705325400,
          sunset: 1705362600,
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockForecast,
      });

      const forecast = await service.getForecast({ city: 'Mountain View' });

      expect(forecast).toBeDefined();
      expect(Array.isArray(forecast)).toBe(true);
      expect(forecast!.length).toBeGreaterThan(0);
      expect(forecast![0].date).toBe('2024-01-15');
    });
  });

  describe('Rate Limiting', () => {
    it('should track calls per minute', async () => {
      const mockResponse = {
        coord: { lon: 0, lat: 0 },
        weather: [{ id: 800, main: 'Clear', description: 'clear', icon: '01d' }],
        main: { temp: 20, feels_like: 20, temp_min: 20, temp_max: 20, pressure: 1013, humidity: 50 },
        visibility: 10000,
        wind: { speed: 2, deg: 90 },
        clouds: { all: 0 },
        dt: 1705334400,
        sys: { country: 'US', sunrise: 1705325400, sunset: 1705362600 },
        timezone: 0,
        id: 1,
        name: 'Test',
        cod: 200,
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      // Make 3 API calls (cache miss each time)
      await service.getCurrentWeather({ city: 'NYC' });
      await service.getCurrentWeather({ city: 'LA' });
      await service.getCurrentWeather({ city: 'Chicago' });

      const quota = service.getQuotaUsage();
      expect(quota.callsLastMinute).toBe(3);
      expect(quota.limit).toBe(60);
    });
  });

  describe('Usage Statistics', () => {
    it('should track total requests', async () => {
      const mockResponse = {
        coord: { lon: 0, lat: 0 },
        weather: [{ id: 800, main: 'Clear', description: 'clear', icon: '01d' }],
        main: { temp: 20, feels_like: 20, temp_min: 20, temp_max: 20, pressure: 1013, humidity: 50 },
        visibility: 10000,
        wind: { speed: 2, deg: 90 },
        clouds: { all: 0 },
        dt: 1705334400,
        sys: { country: 'US', sunrise: 1705325400, sunset: 1705362600 },
        timezone: 0,
        id: 1,
        name: 'Test',
        cod: 200,
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await service.getCurrentWeather({ city: 'NYC' });
      await service.getCurrentWeather({ city: 'NYC' }); // Cache hit

      const stats = service.getUsageStats();
      expect(stats.totalRequests).toBe(2);
      expect(stats.cacheHits).toBe(1);
      expect(stats.apiCalls).toBe(1);
    });

    it('should track top locations', async () => {
      const mockResponse = {
        coord: { lon: 0, lat: 0 },
        weather: [{ id: 800, main: 'Clear', description: 'clear', icon: '01d' }],
        main: { temp: 20, feels_like: 20, temp_min: 20, temp_max: 20, pressure: 1013, humidity: 50 },
        visibility: 10000,
        wind: { speed: 2, deg: 90 },
        clouds: { all: 0 },
        dt: 1705334400,
        sys: { country: 'US', sunrise: 1705325400, sunset: 1705362600 },
        timezone: 0,
        id: 1,
        name: 'Test',
        cod: 200,
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      // Request multiple times
      await service.getCurrentWeather({ city: 'NYC' });
      await service.getCurrentWeather({ city: 'NYC' });
      await service.getCurrentWeather({ city: 'LA' });

      const stats = service.getUsageStats();
      expect(stats.topLocations.length).toBeGreaterThan(0);
      expect(stats.topLocations[0].city).toBe('NYC');
      expect(stats.topLocations[0].requests).toBe(2);
    });
  });

  describe('Schema Validation', () => {
    it('should validate correct response schema', () => {
      const validResponse = {
        coord: { lon: 0, lat: 0 },
        weather: [{ id: 800, main: 'Clear', description: 'clear sky', icon: '01d' }],
        main: { temp: 20, feels_like: 20, temp_min: 20, temp_max: 20, pressure: 1013, humidity: 50 },
        base: 'stations',
        visibility: 10000,
        wind: { speed: 2, deg: 90 },
        clouds: { all: 0 },
        dt: 1705334400,
        sys: { country: 'US', sunrise: 1705325400, sunset: 1705362600 },
        timezone: 0,
        id: 1,
        name: 'Test City',
        cod: 200,
      };

      const result = OpenWeatherCurrentSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('should reject invalid response schema', () => {
      const invalidResponse = {
        coord: { lon: 0, lat: 0 },
        // Missing required fields
      };

      const result = OpenWeatherCurrentSchema.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const weather = await service.getCurrentWeather({ city: 'NYC' });

      expect(weather).toBeNull();
      const stats = service.getUsageStats();
      expect(stats.errors).toBe(1);
    });

    it('should handle missing location parameters', async () => {
      const weather = await service.getCurrentWeather({});

      expect(weather).toBeNull();
    });
  });
});

