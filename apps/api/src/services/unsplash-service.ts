/**
 * 🖼️ Unsplash Photo Library Service
 * 
 * Professional stock photography integration using Unsplash API
 * for backgrounds, cover images, and visual enhancements
 * 
 * Features:
 * - Photo search by keyword
 * - Random photos by category
 * - Curated collections
 * - Download tracking (required by Unsplash TOS)
 * - Intelligent caching (24-hour TTL)
 * - Rate limit management (50/hour free tier)
 * - Attribution handling
 * 
 * @see https://unsplash.com/documentation
 */

import logger from '../utils/logger';
import { z } from 'zod';

// Zod schema for Unsplash photo response
export const UnsplashPhotoSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  width: z.number(),
  height: z.number(),
  color: z.string(), // Hex color
  blur_hash: z.string().optional(),
  downloads: z.number().optional(),
  likes: z.number(),
  description: z.string().nullable(),
  alt_description: z.string().nullable(),
  urls: z.object({
    raw: z.string(),
    full: z.string(),
    regular: z.string(), // 1080px width
    small: z.string(), // 400px width
    thumb: z.string(), // 200px width
  }),
  links: z.object({
    self: z.string(),
    html: z.string(), // Unsplash page
    download: z.string(),
    download_location: z.string(),
  }),
  user: z.object({
    id: z.string(),
    username: z.string(),
    name: z.string(),
    portfolio_url: z.string().nullable(),
    bio: z.string().nullable(),
    location: z.string().nullable(),
    total_likes: z.number(),
    total_photos: z.number(),
    links: z.object({
      self: z.string(),
      html: z.string(), // Photographer profile
      photos: z.string(),
    }),
  }),
});

// Search results schema
export const UnsplashSearchSchema = z.object({
  total: z.number(),
  total_pages: z.number(),
  results: z.array(UnsplashPhotoSchema),
});

// Collection schema
export const UnsplashCollectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  total_photos: z.number(),
  cover_photo: UnsplashPhotoSchema,
  user: z.object({
    username: z.string(),
    name: z.string(),
  }),
});

export type UnsplashPhoto = z.infer<typeof UnsplashPhotoSchema>;
export type UnsplashSearchResult = z.infer<typeof UnsplashSearchSchema>;
export type UnsplashCollection = z.infer<typeof UnsplashCollectionSchema>;

// Simplified photo interface for frontend
export interface Photo {
  id: string;
  description: string | null;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  user: {
    name: string;
    username: string;
    profileUrl: string;
  };
  downloadUrl: string;
  color: string;
  width: number;
  height: number;
  likes: number;
}

// Error response from Unsplash
interface UnsplashError {
  errors: string[];
}

// Cache entry structure
interface SearchCacheEntry {
  data: Photo[];
  total: number;
  timestamp: number;
  hits: number;
}

interface PhotoCacheEntry {
  data: Photo;
  timestamp: number;
  hits: number;
}

// Usage statistics
interface UnsplashStats {
  totalRequests: number;
  searchRequests: number;
  randomRequests: number;
  downloadRequests: number;
  cacheHits: number;
  cacheMisses: number;
  apiCalls: number;
  errors: number;
  lastApiCall?: Date;
  quotaWarning: boolean;
  topSearches: Array<{ query: string; count: number }>;
}

export class UnsplashService {
  private accessKey: string;
  private secretKey: string;
  private appName: string;
  private searchCache: Map<string, SearchCacheEntry> = new Map();
  private photoCache: Map<string, PhotoCacheEntry> = new Map();
  private cacheTTL = 24 * 60 * 60 * 1000; // 24 hours
  private stats: UnsplashStats = {
    totalRequests: 0,
    searchRequests: 0,
    randomRequests: 0,
    downloadRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    apiCalls: 0,
    errors: 0,
    quotaWarning: false,
    topSearches: [],
  };

  // Rate limiting (50 requests/hour for free tier)
  private readonly REQUESTS_PER_HOUR = 50;
  private callTimestamps: number[] = [];
  private searchQueryCount: Map<string, number> = new Map();

  constructor() {
    this.accessKey = process.env.UNSPLASH_ACCESS_KEY || '';
    this.secretKey = process.env.UNSPLASH_SECRET_KEY || '';
    this.appName = process.env.UNSPLASH_APP_NAME || 'Meridian';
    
    if (!this.accessKey) {
      logger.warn('⚠️  Unsplash access key not configured. Photo library features will be disabled.');
      logger.info('   Get a free access key at https://unsplash.com/developers');
    } else {
      logger.info('✅ Unsplash photo library initialized');
      logger.info(`   App: ${this.appName}`);
      logger.info('   Free tier: 50 requests/hour');
    }

    // Start periodic cache cleanup
    this.startCacheCleanup();
  }

  /**
   * Search photos by keyword
   */
  async searchPhotos(params: {
    query: string;
    page?: number;
    perPage?: number;
    orientation?: 'landscape' | 'portrait' | 'squarish';
    orderBy?: 'relevant' | 'latest';
  }): Promise<{ photos: Photo[]; total: number } | null> {
    if (!this.accessKey) {
      logger.debug('Unsplash access key not configured');
      return null;
    }

    this.stats.totalRequests++;
    this.stats.searchRequests++;

    const {
      query,
      page = 1,
      perPage = 20,
      orientation,
      orderBy = 'relevant',
    } = params;

    // Generate cache key
    const cacheKey = `search:${query}:${page}:${perPage}:${orientation}:${orderBy}`;

    // Check cache
    const cached = this.getFromSearchCache(cacheKey);
    if (cached) {
      this.stats.cacheHits++;
      logger.debug(`Unsplash search cache hit: "${query}"`);
      this.trackSearchQuery(query);
      return { photos: cached.data, total: cached.total };
    }

    this.stats.cacheMisses++;

    // Check rate limit
    if (!this.checkRateLimit()) {
      logger.warn('⚠️  Unsplash API rate limit reached. Using cached data only.');
      return null;
    }

    try {
      // Build query params
      const queryParams = new URLSearchParams({
        query,
        page: page.toString(),
        per_page: perPage.toString(),
        order_by: orderBy,
      });

      if (orientation) {
        queryParams.set('orientation', orientation);
      }

      const url = `https://api.unsplash.com/search/photos?${queryParams}`;
      
      logger.debug(`Calling Unsplash API - Search: "${query}"`);
      const response = await fetch(url, {
        headers: {
          'Authorization': `Client-ID ${this.accessKey}`,
          'Accept-Version': 'v1',
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          logger.error('Unsplash API rate limit exceeded');
          this.stats.quotaWarning = true;
        }
        throw new Error(`Unsplash API error: HTTP ${response.status}`);
      }

      const data = await response.json();

      // Check for API error
      if ('errors' in data) {
        const error = data as UnsplashError;
        logger.error('Unsplash API error:', error.errors);
        this.stats.errors++;
        return null;
      }

      // Validate with Zod
      const validatedData = UnsplashSearchSchema.parse(data);

      // Transform to simplified format
      const photos = validatedData.results.map(this.transformPhoto);

      // Update tracking
      this.stats.apiCalls++;
      this.stats.lastApiCall = new Date();
      this.trackCallTimestamp();
      this.trackSearchQuery(query);

      // Cache results
      this.addToSearchCache(cacheKey, photos, validatedData.total);

      logger.debug(`Successfully fetched ${photos.length} photos for "${query}"`);

      return { photos, total: validatedData.total };

    } catch (error) {
      this.stats.errors++;
      if (error instanceof z.ZodError) {
        logger.error('Invalid response from Unsplash API:', error.errors);
      } else {
        logger.error('Failed to search Unsplash:', error);
      }
      return null;
    }
  }

  /**
   * Get random photo(s)
   */
  async getRandomPhoto(params: {
    query?: string;
    orientation?: 'landscape' | 'portrait' | 'squarish';
    collections?: string;
    count?: number; // 1-30
  } = {}): Promise<Photo[] | null> {
    if (!this.accessKey) {
      return null;
    }

    this.stats.totalRequests++;
    this.stats.randomRequests++;

    const {
      query,
      orientation,
      collections,
      count = 1,
    } = params;

    // Check cache for random photos (shorter TTL)
    const cacheKey = `random:${query}:${orientation}:${collections}:${count}`;
    const cached = this.getFromSearchCache(cacheKey);
    if (cached && Date.now() - cached.timestamp < 60 * 60 * 1000) { // 1 hour for random
      this.stats.cacheHits++;
      return cached.data;
    }

    this.stats.cacheMisses++;

    if (!this.checkRateLimit()) {
      logger.warn('⚠️  Unsplash API rate limit reached');
      return null;
    }

    try {
      const queryParams = new URLSearchParams();
      
      if (query) queryParams.set('query', query);
      if (orientation) queryParams.set('orientation', orientation);
      if (collections) queryParams.set('collections', collections);
      if (count > 1) queryParams.set('count', count.toString());

      const url = `https://api.unsplash.com/photos/random?${queryParams}`;
      
      logger.debug(`Calling Unsplash API - Random${query ? `: "${query}"` : ''}`);
      const response = await fetch(url, {
        headers: {
          'Authorization': `Client-ID ${this.accessKey}`,
          'Accept-Version': 'v1',
        },
      });

      if (!response.ok) {
        throw new Error(`Unsplash API error: HTTP ${response.status}`);
      }

      const data = await response.json();

      // Handle single vs multiple photos
      const photosArray = Array.isArray(data) ? data : [data];
      const validatedPhotos = photosArray.map(p => UnsplashPhotoSchema.parse(p));
      const photos = validatedPhotos.map(this.transformPhoto);

      this.stats.apiCalls++;
      this.stats.lastApiCall = new Date();
      this.trackCallTimestamp();

      // Cache with shorter TTL
      this.addToSearchCache(cacheKey, photos, photos.length);

      logger.debug(`Successfully fetched ${photos.length} random photo(s)`);

      return photos;

    } catch (error) {
      this.stats.errors++;
      logger.error('Failed to get random photos:', error);
      return null;
    }
  }

  /**
   * Get photo by ID
   */
  async getPhoto(photoId: string): Promise<Photo | null> {
    if (!this.accessKey) {
      return null;
    }

    this.stats.totalRequests++;

    // Check cache
    const cached = this.getFromPhotoCache(photoId);
    if (cached) {
      this.stats.cacheHits++;
      return cached;
    }

    this.stats.cacheMisses++;

    if (!this.checkRateLimit()) {
      logger.warn('⚠️  Unsplash API rate limit reached');
      return null;
    }

    try {
      const url = `https://api.unsplash.com/photos/${photoId}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Client-ID ${this.accessKey}`,
          'Accept-Version': 'v1',
        },
      });

      if (!response.ok) {
        throw new Error(`Unsplash API error: HTTP ${response.status}`);
      }

      const data = await response.json();
      const validatedData = UnsplashPhotoSchema.parse(data);
      const photo = this.transformPhoto(validatedData);

      this.stats.apiCalls++;
      this.trackCallTimestamp();

      // Cache photo details (longer TTL - 7 days)
      this.addToPhotoCache(photoId, photo);

      return photo;

    } catch (error) {
      this.stats.errors++;
      logger.error('Failed to get photo:', error);
      return null;
    }
  }

  /**
   * Track photo download (REQUIRED by Unsplash API TOS)
   * Must be called when user selects/uses a photo
   */
  async trackDownload(photoId: string): Promise<boolean> {
    if (!this.accessKey) {
      return false;
    }

    this.stats.downloadRequests++;

    try {
      // First get the download_location URL
      const photo = await this.getPhoto(photoId);
      if (!photo) {
        logger.warn('Cannot track download - photo not found:', photoId);
        return false;
      }

      // Call the download tracking endpoint
      const url = `https://api.unsplash.com/photos/${photoId}/download`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Client-ID ${this.accessKey}`,
          'Accept-Version': 'v1',
        },
      });

      if (response.ok) {
        logger.debug(`Tracked download for photo: ${photoId}`);
        return true;
      } else {
        logger.warn(`Failed to track download: HTTP ${response.status}`);
        return false;
      }

    } catch (error) {
      logger.error('Failed to track download:', error);
      return false;
    }
  }

  /**
   * Get curated collections
   */
  async getCollections(page = 1, perPage = 10): Promise<UnsplashCollection[] | null> {
    if (!this.accessKey) {
      return null;
    }

    if (!this.checkRateLimit()) {
      return null;
    }

    try {
      const url = `https://api.unsplash.com/collections?page=${page}&per_page=${perPage}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Client-ID ${this.accessKey}`,
          'Accept-Version': 'v1',
        },
      });

      if (!response.ok) {
        throw new Error(`Unsplash API error: HTTP ${response.status}`);
      }

      const data = await response.json();
      const collections = z.array(UnsplashCollectionSchema).parse(data);

      this.stats.apiCalls++;
      this.trackCallTimestamp();

      return collections;

    } catch (error) {
      this.stats.errors++;
      logger.error('Failed to get collections:', error);
      return null;
    }
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): UnsplashStats & { 
    cacheSize: number; 
    photoCacheSize: number;
    cacheHitRate: string;
    requestsLastHour: number;
  } {
    const cacheHitRate = this.stats.totalRequests > 0
      ? ((this.stats.cacheHits / this.stats.totalRequests) * 100).toFixed(2)
      : '0.00';

    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const requestsLastHour = this.callTimestamps.filter(ts => ts > oneHourAgo).length;

    return {
      ...this.stats,
      cacheSize: this.searchCache.size,
      photoCacheSize: this.photoCache.size,
      cacheHitRate: `${cacheHitRate}%`,
      requestsLastHour,
    };
  }

  /**
   * Get quota usage
   */
  getQuotaUsage(): { 
    requestsLastHour: number; 
    limit: number; 
    percentage: number;
    remaining: number;
  } {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    
    const requestsLastHour = this.callTimestamps.filter(ts => ts > oneHourAgo).length;
    const percentage = (requestsLastHour / this.REQUESTS_PER_HOUR) * 100;
    const remaining = Math.max(0, this.REQUESTS_PER_HOUR - requestsLastHour);

    return {
      requestsLastHour,
      limit: this.REQUESTS_PER_HOUR,
      percentage: Math.round(percentage * 100) / 100,
      remaining,
    };
  }

  /**
   * Clear caches
   */
  clearCache(): void {
    this.searchCache.clear();
    this.photoCache.clear();
    logger.info('Unsplash caches cleared');
  }

  // Private helper methods

  private transformPhoto(photo: UnsplashPhoto): Photo {
    return {
      id: photo.id,
      description: photo.description || photo.alt_description,
      urls: photo.urls,
      user: {
        name: photo.user.name,
        username: photo.user.username,
        profileUrl: photo.user.links.html,
      },
      downloadUrl: photo.links.download_location,
      color: photo.color,
      width: photo.width,
      height: photo.height,
      likes: photo.likes,
    };
  }

  private getFromSearchCache(key: string): SearchCacheEntry | null {
    const entry = this.searchCache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > this.cacheTTL) {
      this.searchCache.delete(key);
      return null;
    }

    entry.hits++;
    return entry;
  }

  private addToSearchCache(key: string, data: Photo[], total: number): void {
    this.searchCache.set(key, {
      data,
      total,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  private getFromPhotoCache(photoId: string): Photo | null {
    const entry = this.photoCache.get(photoId);
    if (!entry) return null;

    // Photo details cache for 7 days
    const age = Date.now() - entry.timestamp;
    if (age > 7 * 24 * 60 * 60 * 1000) {
      this.photoCache.delete(photoId);
      return null;
    }

    entry.hits++;
    return entry.data;
  }

  private addToPhotoCache(photoId: string, data: Photo): void {
    this.photoCache.set(photoId, {
      data,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  private checkRateLimit(): boolean {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    
    // Remove old timestamps
    this.callTimestamps = this.callTimestamps.filter(ts => ts > oneHourAgo);
    
    // Check if we're under the limit
    const underLimit = this.callTimestamps.length < this.REQUESTS_PER_HOUR;
    
    // Warn at 80% usage
    if (this.callTimestamps.length >= this.REQUESTS_PER_HOUR * 0.8 && !this.stats.quotaWarning) {
      this.stats.quotaWarning = true;
      logger.warn(`⚠️  Unsplash API approaching limit: ${this.callTimestamps.length}/${this.REQUESTS_PER_HOUR} requests in last hour`);
    }
    
    return underLimit;
  }

  private trackCallTimestamp(): void {
    this.callTimestamps.push(Date.now());
    
    // Keep only last hour
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.callTimestamps = this.callTimestamps.filter(ts => ts > oneHourAgo);
  }

  private trackSearchQuery(query: string): void {
    const count = this.searchQueryCount.get(query) || 0;
    this.searchQueryCount.set(query, count + 1);

    // Update top searches in stats
    const sortedSearches = Array.from(this.searchQueryCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));

    this.stats.topSearches = sortedSearches;
  }

  private startCacheCleanup(): void {
    // Clean up expired cache entries every hour
    setInterval(() => {
      const now = Date.now();
      let removedSearch = 0;
      let removedPhotos = 0;

      // Clean search cache (24 hour TTL)
      for (const [key, entry] of this.searchCache.entries()) {
        const age = now - entry.timestamp;
        if (age > this.cacheTTL) {
          this.searchCache.delete(key);
          removedSearch++;
        }
      }

      // Clean photo cache (7 day TTL)
      for (const [key, entry] of this.photoCache.entries()) {
        const age = now - entry.timestamp;
        if (age > 7 * 24 * 60 * 60 * 1000) {
          this.photoCache.delete(key);
          removedPhotos++;
        }
      }

      if (removedSearch > 0 || removedPhotos > 0) {
        logger.debug(`Cleaned up ${removedSearch} search + ${removedPhotos} photo cache entries`);
      }
    }, 60 * 60 * 1000); // Run every hour
  }
}

// Export singleton instance
export const unsplashService = new UnsplashService();

// Export for testing
export default unsplashService;

