/**
 * TypeScript types for Unsplash API responses
 * @see https://unsplash.com/documentation
 */

export interface UnsplashPhoto {
  id: string;
  created_at: string;
  updated_at: string;
  width: number;
  height: number;
  color: string; // Hex color
  blur_hash?: string;
  downloads?: number;
  likes: number;
  description: string | null;
  alt_description: string | null;
  urls: {
    raw: string;
    full: string;
    regular: string; // 1080px width
    small: string; // 400px width
    thumb: string; // 200px width
  };
  links: {
    self: string;
    html: string; // Unsplash page
    download: string;
    download_location: string;
  };
  user: {
    id: string;
    username: string;
    name: string;
    portfolio_url: string | null;
    bio: string | null;
    location: string | null;
    total_likes: number;
    total_photos: number;
    links: {
      self: string;
      html: string; // Photographer profile
      photos: string;
    };
  };
}

export interface UnsplashSearchResponse {
  total: number;
  total_pages: number;
  results: UnsplashPhoto[];
}

export interface UnsplashCollection {
  id: string;
  title: string;
  description: string | null;
  total_photos: number;
  cover_photo: UnsplashPhoto;
  user: {
    username: string;
    name: string;
  };
}

export interface UnsplashError {
  errors: string[];
}

// Simplified photo interface for frontend use
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
    id: string;
    name: string;
    username: string;
    links: {
      html: string;
    };
  };
  links: {
    download_location: string;
    html: string;
  };
  width: number;
  height: number;
  color: string;
}

// API response types
export interface UnsplashSearchResult {
  photos: Photo[];
  total: number;
}

export interface UnsplashRandomResult {
  photos: Photo[];
}

export interface UnsplashStats {
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

export interface UnsplashQuotaUsage {
  requestsLastHour: number;
  limit: number;
  percentage: number;
  remaining: number;
}

