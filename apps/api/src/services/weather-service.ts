/**
 * 🌤️ Weather Service
 * 
 * Real-time weather data using OpenWeatherMap API for dashboard widgets
 * 
 * Features:
 * - Current weather by location
 * - 5-day forecast (free tier included)
 * - Intelligent caching (30-minute TTL)
 * - Automatic location detection (via ipstack)
 * - API quota monitoring
 * - Type-safe with Zod validation
 * 
 * @see https://openweathermap.org/api
 */

import logger from '../utils/logger';
import { z } from 'zod';
import { geolocationService } from './geolocation-service';

export class OpenWeatherApiKeyError extends Error {
  public readonly statusCode: number;

  constructor(message = 'OpenWeatherMap API rejected the provided API key.') {
    super(message);
    this.name = 'OpenWeatherApiKeyError';
    this.statusCode = 401;
  }
}

// Zod schema for OpenWeatherMap current weather response
export const OpenWeatherCurrentSchema = z.object({
  coord: z.object({
    lon: z.number(),
    lat: z.number(),
  }),
  weather: z.array(z.object({
    id: z.number(),
    main: z.string(), // "Rain", "Snow", "Clear", etc.
    description: z.string(), // "light rain", "clear sky", etc.
    icon: z.string(), // "10d", "01n", etc.
  })),
  base: z.string(),
  main: z.object({
    temp: z.number(),
    feels_like: z.number(),
    temp_min: z.number(),
    temp_max: z.number(),
    pressure: z.number(),
    humidity: z.number(),
    sea_level: z.number().optional(),
    grnd_level: z.number().optional(),
  }),
  visibility: z.number(),
  wind: z.object({
    speed: z.number(),
    deg: z.number(),
    gust: z.number().optional(),
  }),
  clouds: z.object({
    all: z.number(), // Cloud coverage percentage
  }),
  rain: z.object({
    '1h': z.number().optional(), // Rain volume last hour
    '3h': z.number().optional(), // Rain volume last 3 hours
  }).optional(),
  snow: z.object({
    '1h': z.number().optional(),
    '3h': z.number().optional(),
  }).optional(),
  dt: z.number(), // Timestamp
  sys: z.object({
    type: z.number().optional(),
    id: z.number().optional(),
    country: z.string(),
    sunrise: z.number(),
    sunset: z.number(),
  }),
  timezone: z.number(),
  id: z.number(),
  name: z.string(), // City name
  cod: z.number(),
});

// Zod schema for 5-day forecast
export const OpenWeatherForecastSchema = z.object({
  cod: z.string(),
  message: z.number(),
  cnt: z.number(),
  list: z.array(z.object({
    dt: z.number(),
    main: z.object({
      temp: z.number(),
      feels_like: z.number(),
      temp_min: z.number(),
      temp_max: z.number(),
      pressure: z.number(),
      humidity: z.number(),
    }),
    weather: z.array(z.object({
      id: z.number(),
      main: z.string(),
      description: z.string(),
      icon: z.string(),
    })),
    clouds: z.object({ all: z.number() }),
    wind: z.object({
      speed: z.number(),
      deg: z.number(),
      gust: z.number().optional(),
    }),
    pop: z.number(), // Probability of precipitation
    dt_txt: z.string(),
  })),
  city: z.object({
    id: z.number(),
    name: z.string(),
    coord: z.object({ lat: z.number(), lon: z.number() }),
    country: z.string(),
    population: z.number().optional(),
    timezone: z.number(),
    sunrise: z.number(),
    sunset: z.number(),
  }),
});

export type OpenWeatherCurrent = z.infer<typeof OpenWeatherCurrentSchema>;
export type OpenWeatherForecast = z.infer<typeof OpenWeatherForecastSchema>;

// Simplified weather interface for frontend
export interface WeatherData {
  location: {
    city: string;
    country: string;
    timezone: string;
    localtime: string;
    coordinates: {
      lat: number;
      lon: number;
    };
  };
  current: {
    temp: number;
    feelsLike: number;
    tempMin: number;
    tempMax: number;
    condition: string; // "Clear", "Rain", "Snow", "Clouds"
    description: string; // "clear sky", "light rain"
    icon: string; // Icon code for display
    humidity: number;
    pressure: number;
    windSpeed: number;
    windDirection: number;
    windDirectionCompass: string; // "N", "NE", "E", etc.
    cloudCover: number;
    visibility: number; // in meters
    uvIndex?: number;
    sunrise: Date;
    sunset: Date;
    isDay: boolean;
  };
  rain?: {
    lastHour?: number;
    last3Hours?: number;
  };
  snow?: {
    lastHour?: number;
    last3Hours?: number;
  };
}

export interface ForecastDay {
  date: string;
  tempMin: number;
  tempMax: number;
  condition: string;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  chanceOfRain: number; // 0-1 (0% to 100%)
}

// Error response from OpenWeatherMap
interface OpenWeatherError {
  cod: string | number;
  message: string;
}

// Cache entry structure
interface CacheEntry {
  data: WeatherData;
  timestamp: number;
  hits: number;
}

// Forecast cache entry
interface ForecastCacheEntry {
  data: ForecastDay[];
  timestamp: number;
  hits: number;
}

// Usage statistics
interface WeatherStats {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  apiCalls: number;
  errors: number;
  lastApiCall?: Date;
  quotaWarning: boolean;
  topLocations: Array<{ city: string; requests: number }>;
}

export class WeatherService {
  private apiKey: string;
  private units: 'metric' | 'imperial';
  private currentWeatherCache: Map<string, CacheEntry> = new Map();
  private forecastCache: Map<string, ForecastCacheEntry> = new Map();
  private cacheTTL = 30 * 60 * 1000; // 30 minutes in milliseconds
  private forecastCacheTTL = 60 * 60 * 1000; // 1 hour for forecasts
  private stats: WeatherStats = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    apiCalls: 0,
    errors: 0,
    quotaWarning: false,
    topLocations: [],
  };

  // Rate limiting for free tier
  private readonly CALLS_PER_MINUTE = 60; // Free tier limit
  private callTimestamps: number[] = [];
  private locationRequestCount: Map<string, number> = new Map();

  constructor() {
    this.apiKey = process.env.OPENWEATHERMAP_API_KEY || '';
    this.units = (process.env.OPENWEATHERMAP_UNITS as 'metric' | 'imperial') || 'metric';
    
    if (!this.apiKey) {
      logger.warn('⚠️  OpenWeatherMap API key not configured. Weather features will be disabled.');
      logger.info('   Get a free API key at https://openweathermap.org/api');
    } else {
      logger.info('✅ Weather service initialized with OpenWeatherMap API');
      logger.info(`   Units: ${this.units} (${this.units === 'metric' ? 'Celsius' : 'Fahrenheit'})`);
      logger.info('   Free tier: 60 calls/minute, 1,000,000 calls/month');
    }

    // Start periodic cache cleanup
    this.startCacheCleanup();
  }

  /**
   * Get current weather for a location
   */
  async getCurrentWeather(params: {
    city?: string;
    country?: string;
    lat?: number;
    lon?: number;
    autoDetect?: boolean;
    userIP?: string;
  }): Promise<WeatherData | null> {
    // Auto-detect location from IP if requested
    if (params.autoDetect && params.userIP) {
      const location = await geolocationService.getLocation(params.userIP);
      if (location) {
        params.city = location.city;
        params.country = location.countryCode;
        params.lat = location.latitude;
        params.lon = location.longitude;
      }
    }

    // Validate we have either city or coordinates
    if (!params.city && (!params.lat || !params.lon)) {
      logger.debug('Weather request missing location data');
      return null;
    }

    // Check if service is configured
    if (!this.apiKey) {
      logger.debug('OpenWeatherMap API key not configured');
      return null;
    }

    this.stats.totalRequests++;

    // Generate cache key
    const cacheKey = this.generateCacheKey(params);

    // Check cache first
    const cached = this.getFromCurrentCache(cacheKey);
    if (cached) {
      this.stats.cacheHits++;
      logger.debug(`Weather cache hit for: ${cacheKey}`);
      this.trackLocationRequest(params.city || 'coordinates');
      return cached;
    }

    this.stats.cacheMisses++;

    // Check rate limit
    if (!this.checkRateLimit()) {
      logger.warn('⚠️  OpenWeatherMap rate limit reached. Using cached data only.');
      return null;
    }

    try {
      // Build query string
      let query: string;
      if (params.lat && params.lon) {
        query = `lat=${params.lat}&lon=${params.lon}`;
      } else {
        query = `q=${params.city}${params.country ? `,${params.country}` : ''}`;
      }

      const url = `https://api.openweathermap.org/data/2.5/weather?${query}&appid=${this.apiKey}&units=${this.units}`;
      
      logger.debug(`Calling OpenWeatherMap API for: ${params.city || 'coordinates'}`);
      const response = await fetch(url);

      if (response.status === 401 || response.status === 403) {
        throw new OpenWeatherApiKeyError(
          `OpenWeatherMap API authentication failed (HTTP ${response.status}). ` +
          'Verify that OPENWEATHERMAP_API_KEY is present, active, and has the correct API permissions in your OpenWeatherMap account.'
        );
      }

      if (!response.ok) {
        throw new Error(`OpenWeatherMap API error: HTTP ${response.status}`);
      }

      const data = await response.json();

      // Check for API error response
      if (data.cod && data.cod !== 200) {
        const error = data as OpenWeatherError;
        logger.error('OpenWeatherMap API error:', {
          code: error.cod,
          message: error.message,
        });
        this.stats.errors++;
        return null;
      }

      // Validate response with Zod schema
      const validatedData = OpenWeatherCurrentSchema.parse(data);

      // Transform to our simplified format
      const weather = this.transformCurrentWeather(validatedData);

      // Update API call tracking
      this.stats.apiCalls++;
      this.stats.lastApiCall = new Date();
      this.trackCallTimestamp();
      this.trackLocationRequest(params.city || 'coordinates');

      // Cache the result
      this.addToCurrentCache(cacheKey, weather);

      logger.debug(`Successfully fetched weather for: ${weather.location.city} (${weather.current.temp}°${this.units === 'metric' ? 'C' : 'F'}, ${weather.current.condition})`);

      return weather;

    } catch (error) {
      this.stats.errors++;
      if (error instanceof OpenWeatherApiKeyError) {
        logger.error(error.message);
        throw error;
      }
      if (error instanceof z.ZodError) {
        logger.error('Invalid response from OpenWeatherMap API:', error.errors);
      } else {
        logger.error('Failed to fetch weather from OpenWeatherMap:', error);
      }
      return null;
    }
  }

  /**
   * Get 5-day weather forecast
   */
  async getForecast(params: {
    city?: string;
    country?: string;
    lat?: number;
    lon?: number;
  }): Promise<ForecastDay[] | null> {
    // Validate location
    if (!params.city && (!params.lat || !params.lon)) {
      logger.debug('Forecast request missing location data');
      return null;
    }

    if (!this.apiKey) {
      return null;
    }

    const cacheKey = this.generateCacheKey(params);

    // Check forecast cache
    const cached = this.getFromForecastCache(cacheKey);
    if (cached) {
      this.stats.cacheHits++;
      logger.debug(`Forecast cache hit for: ${cacheKey}`);
      return cached;
    }

    this.stats.cacheMisses++;

    if (!this.checkRateLimit()) {
      logger.warn('⚠️  OpenWeatherMap rate limit reached');
      return null;
    }

    try {
      let query: string;
      if (params.lat && params.lon) {
        query = `lat=${params.lat}&lon=${params.lon}`;
      } else {
        query = `q=${params.city}${params.country ? `,${params.country}` : ''}`;
      }

      const url = `https://api.openweathermap.org/data/2.5/forecast?${query}&appid=${this.apiKey}&units=${this.units}`;
      
      logger.debug(`Calling OpenWeatherMap Forecast API for: ${params.city || 'coordinates'}`);
      const response = await fetch(url);

      if (response.status === 401 || response.status === 403) {
        throw new OpenWeatherApiKeyError(
          `OpenWeatherMap API authentication failed (HTTP ${response.status}). ` +
          'Verify that OPENWEATHERMAP_API_KEY is present, active, and has the correct API permissions in your OpenWeatherMap account.'
        );
      }

      if (!response.ok) {
        throw new Error(`OpenWeatherMap API error: HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.cod && data.cod !== '200') {
        const error = data as OpenWeatherError;
        logger.error('OpenWeatherMap forecast error:', error.message);
        this.stats.errors++;
        return null;
      }

      const validatedData = OpenWeatherForecastSchema.parse(data);
      const forecast = this.transformForecast(validatedData);

      this.stats.apiCalls++;
      this.trackCallTimestamp();
      this.addToForecastCache(cacheKey, forecast);

      logger.debug(`Successfully fetched forecast for: ${params.city || 'coordinates'}`);

      return forecast;

    } catch (error) {
      this.stats.errors++;
      if (error instanceof OpenWeatherApiKeyError) {
        logger.error(error.message);
        throw error;
      }
      if (error instanceof z.ZodError) {
        logger.error('Invalid forecast response:', error.errors);
      } else {
        logger.error('Failed to fetch forecast:', error);
      }
      return null;
    }
  }

  /**
   * Get weather with automatic location detection
   */
  async getWeatherForIP(ip: string): Promise<WeatherData | null> {
    const location = await geolocationService.getLocation(ip);
    
    if (!location) {
      logger.debug('Could not detect location for IP:', ip);
      return null;
    }

    return this.getCurrentWeather({
      city: location.city,
      country: location.countryCode,
      lat: location.latitude,
      lon: location.longitude,
    });
  }

  /**
   * Get service usage statistics
   */
  getUsageStats(): WeatherStats & { cacheSize: number; forecastCacheSize: number; cacheHitRate: string } {
    const cacheHitRate = this.stats.totalRequests > 0
      ? ((this.stats.cacheHits / this.stats.totalRequests) * 100).toFixed(2)
      : '0.00';

    return {
      ...this.stats,
      cacheSize: this.currentWeatherCache.size,
      forecastCacheSize: this.forecastCache.size,
      cacheHitRate: `${cacheHitRate}%`,
    };
  }

  /**
   * Get quota usage (calls per minute tracking)
   */
  getQuotaUsage(): { callsLastMinute: number; limit: number; percentage: number } {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    
    // Count calls in last minute
    const callsLastMinute = this.callTimestamps.filter(ts => ts > oneMinuteAgo).length;
    const percentage = (callsLastMinute / this.CALLS_PER_MINUTE) * 100;

    return {
      callsLastMinute,
      limit: this.CALLS_PER_MINUTE,
      percentage: Math.round(percentage * 100) / 100,
    };
  }

  /**
   * Clear caches
   */
  clearCache(): void {
    this.currentWeatherCache.clear();
    this.forecastCache.clear();
    logger.info('Weather caches cleared');
  }

  // Private helper methods

  private generateCacheKey(params: {
    city?: string;
    country?: string;
    lat?: number;
    lon?: number;
  }): string {
    if (params.lat && params.lon) {
      return `coords:${params.lat.toFixed(2)},${params.lon.toFixed(2)}`;
    }
    return `${params.city}:${params.country || 'unknown'}`.toLowerCase();
  }

  private getFromCurrentCache(key: string): WeatherData | null {
    const entry = this.currentWeatherCache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > this.cacheTTL) {
      this.currentWeatherCache.delete(key);
      return null;
    }

    entry.hits++;
    return entry.data;
  }

  private addToCurrentCache(key: string, data: WeatherData): void {
    this.currentWeatherCache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  private getFromForecastCache(key: string): ForecastDay[] | null {
    const entry = this.forecastCache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > this.forecastCacheTTL) {
      this.forecastCache.delete(key);
      return null;
    }

    entry.hits++;
    return entry.data;
  }

  private addToForecastCache(key: string, data: ForecastDay[]): void {
    this.forecastCache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  private checkRateLimit(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    
    // Remove old timestamps
    this.callTimestamps = this.callTimestamps.filter(ts => ts > oneMinuteAgo);
    
    // Check if we're under the limit
    return this.callTimestamps.length < this.CALLS_PER_MINUTE;
  }

  private trackCallTimestamp(): void {
    this.callTimestamps.push(Date.now());
    
    // Keep only last minute of timestamps
    const oneMinuteAgo = Date.now() - 60 * 1000;
    this.callTimestamps = this.callTimestamps.filter(ts => ts > oneMinuteAgo);
  }

  private trackLocationRequest(city: string): void {
    const count = this.locationRequestCount.get(city) || 0;
    this.locationRequestCount.set(city, count + 1);

    // Update top locations in stats
    const sortedLocations = Array.from(this.locationRequestCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([city, requests]) => ({ city, requests }));

    this.stats.topLocations = sortedLocations;
  }

  private transformCurrentWeather(data: OpenWeatherCurrent): WeatherData {
    const now = new Date();
    const sunrise = new Date(data.sys.sunrise * 1000);
    const sunset = new Date(data.sys.sunset * 1000);
    const isDay = now >= sunrise && now <= sunset;

    return {
      location: {
        city: data.name,
        country: data.sys.country,
        timezone: this.getTimezoneFromOffset(data.timezone),
        localtime: new Date(Date.now() + data.timezone * 1000).toISOString(),
        coordinates: {
          lat: data.coord.lat,
          lon: data.coord.lon,
        },
      },
      current: {
        temp: Math.round(data.main.temp),
        feelsLike: Math.round(data.main.feels_like),
        tempMin: Math.round(data.main.temp_min),
        tempMax: Math.round(data.main.temp_max),
        condition: data.weather[0]?.main || 'Unknown',
        description: data.weather[0]?.description || 'Unknown',
        icon: data.weather[0]?.icon || '01d',
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        windSpeed: Math.round(data.wind.speed),
        windDirection: data.wind.deg,
        windDirectionCompass: this.degreeToCompass(data.wind.deg),
        cloudCover: data.clouds.all,
        visibility: data.visibility,
        sunrise,
        sunset,
        isDay,
      },
      rain: data.rain ? {
        lastHour: data.rain['1h'],
        last3Hours: data.rain['3h'],
      } : undefined,
      snow: data.snow ? {
        lastHour: data.snow['1h'],
        last3Hours: data.snow['3h'],
      } : undefined,
    };
  }

  private transformForecast(data: OpenWeatherForecast): ForecastDay[] {
    // Group by day and get daily min/max
    const dailyData: Map<string, any[]> = new Map();

    data.list.forEach(item => {
      const date = item.dt_txt.split(' ')[0]; // Get date part only
      if (!dailyData.has(date)) {
        dailyData.set(date, []);
      }
      dailyData.get(date)!.push(item);
    });

    // Transform to daily forecast
    const forecast: ForecastDay[] = [];
    
    for (const [date, items] of dailyData.entries()) {
      const temps = items.map(i => i.main.temp);
      const conditions = items.map(i => i.weather[0]);
      
      forecast.push({
        date,
        tempMin: Math.round(Math.min(...temps)),
        tempMax: Math.round(Math.max(...temps)),
        condition: conditions[0]?.main || 'Unknown',
        description: conditions[0]?.description || 'Unknown',
        icon: conditions[0]?.icon || '01d',
        humidity: Math.round(items.reduce((sum, i) => sum + i.main.humidity, 0) / items.length),
        windSpeed: Math.round(items.reduce((sum, i) => sum + i.wind.speed, 0) / items.length),
        chanceOfRain: Math.max(...items.map(i => i.pop)),
      });
    }

    return forecast.slice(0, 5); // Return 5 days
  }

  private degreeToCompass(degrees: number): string {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  }

  private getTimezoneFromOffset(offsetSeconds: number): string {
    const hours = Math.floor(offsetSeconds / 3600);
    const sign = hours >= 0 ? '+' : '-';
    const absHours = Math.abs(hours);
    return `UTC${sign}${absHours}`;
  }

  private startCacheCleanup(): void {
    // Clean up expired cache entries every 10 minutes
    setInterval(() => {
      const now = Date.now();
      let removedCurrent = 0;
      let removedForecast = 0;

      // Clean current weather cache
      for (const [key, entry] of this.currentWeatherCache.entries()) {
        const age = now - entry.timestamp;
        if (age > this.cacheTTL) {
          this.currentWeatherCache.delete(key);
          removedCurrent++;
        }
      }

      // Clean forecast cache
      for (const [key, entry] of this.forecastCache.entries()) {
        const age = now - entry.timestamp;
        if (age > this.forecastCacheTTL) {
          this.forecastCache.delete(key);
          removedForecast++;
        }
      }

      if (removedCurrent > 0 || removedForecast > 0) {
        logger.debug(`Cleaned up ${removedCurrent} current weather + ${removedForecast} forecast cache entries`);
      }
    }, 10 * 60 * 1000); // Run every 10 minutes
  }
}

// Export singleton instance
export const weatherService = new WeatherService();

// Export for testing
export default weatherService;

