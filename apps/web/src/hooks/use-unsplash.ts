/**
 * 🖼️ Unsplash Photo Library Hook
 * 
 * React hook for accessing Unsplash photo library
 * 
 * Features:
 * - Search photos by keyword
 * - Get random photos
 * - Pagination support
 * - Download tracking (required by Unsplash)
 * - Loading and error states
 * - Type-safe responses
 */

import { useState, useEffect, useCallback } from 'react';

export interface UnsplashPhoto {
  id: string;
  description: string | null;
  urls: {
    raw: string;
    full: string;
    regular: string; // Best for backgrounds (1080px)
    small: string; // Best for thumbnails (400px)
    thumb: string; // Best for grid previews (200px)
  };
  user: {
    name: string;
    username: string;
    profileUrl: string;
  };
  downloadUrl: string;
  color: string; // Hex color for placeholder
  width: number;
  height: number;
  likes: number;
}

export interface UnsplashCategory {
  id: string;
  name: string;
  description: string;
  query: string;
  icon: string;
}

export interface UseUnsplashSearchOptions {
  query?: string;
  page?: number;
  perPage?: number;
  orientation?: 'landscape' | 'portrait' | 'squarish';
  orderBy?: 'relevant' | 'latest';
  enabled?: boolean;
}

export interface UseUnsplashSearchReturn {
  photos: UnsplashPhoto[];
  total: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  search: (newQuery: string) => void;
  loadMore: () => void;
  hasMore: boolean;
  refetch: () => Promise<void>;
}

/**
 * Hook to search Unsplash photos
 */
export function useUnsplashSearch(options: UseUnsplashSearchOptions = {}): UseUnsplashSearchReturn {
  const {
    query: initialQuery = '',
    page: initialPage = 1,
    perPage = 20,
    orientation,
    orderBy = 'relevant',
    enabled = true,
  } = options;

  const [query, setQuery] = useState(initialQuery);
  const [page, setPage] = useState(initialPage);
  const [photos, setPhotos] = useState<UnsplashPhoto[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPhotos = useCallback(async (searchQuery: string, searchPage: number, append = false) => {
    if (!enabled || !searchQuery) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        query: searchQuery,
        page: searchPage.toString(),
        perPage: perPage.toString(),
        orderBy,
      });

      if (orientation) {
        params.set('orientation', orientation);
      }

      const response = await fetch(`/api/unsplash/search?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to search photos');
      }

      const data = await response.json();
      
      if (data.success) {
        if (append) {
          setPhotos(prev => [...prev, ...data.data.photos]);
        } else {
          setPhotos(data.data.photos);
        }
        setTotal(data.data.total);
        setTotalPages(data.data.totalPages);
      } else {
        setError(data.error || 'Unknown error');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search photos';
      setError(errorMessage);
      console.error('Unsplash search error:', err);
    } finally {
      setLoading(false);
    }
  }, [enabled, perPage, orientation, orderBy]);

  // Initial fetch
  useEffect(() => {
    if (query) {
      fetchPhotos(query, page);
    }
  }, [query, page, fetchPhotos]);

  const search = useCallback((newQuery: string) => {
    setQuery(newQuery);
    setPage(1);
    setPhotos([]);
  }, []);

  const loadMore = useCallback(() => {
    if (page < totalPages) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPhotos(query, nextPage, true); // Append to existing photos
    }
  }, [page, totalPages, query, fetchPhotos]);

  const refetch = useCallback(async () => {
    if (query) {
      await fetchPhotos(query, page);
    }
  }, [query, page, fetchPhotos]);

  return {
    photos,
    total,
    totalPages,
    loading,
    error,
    search,
    loadMore,
    hasMore: page < totalPages,
    refetch,
  };
}

/**
 * Hook to get random Unsplash photo(s)
 */
export function useUnsplashRandom(options: {
  query?: string;
  orientation?: 'landscape' | 'portrait' | 'squarish';
  collections?: string;
  count?: number;
  enabled?: boolean;
} = {}): {
  photos: UnsplashPhoto[] | null;
  photo: UnsplashPhoto | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const {
    query,
    orientation,
    collections,
    count = 1,
    enabled = true,
  } = options;

  const [photos, setPhotos] = useState<UnsplashPhoto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRandom = useCallback(async () => {
    if (!enabled) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ count: count.toString() });
      if (query) params.set('query', query);
      if (orientation) params.set('orientation', orientation);
      if (collections) params.set('collections', collections);

      const response = await fetch(`/api/unsplash/random?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get random photos');
      }

      const data = await response.json();
      
      if (data.success) {
        const photosArray = Array.isArray(data.data) ? data.data : [data.data];
        setPhotos(photosArray);
      } else {
        setError(data.error || 'Unknown error');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get random photos';
      setError(errorMessage);
      console.error('Unsplash random error:', err);
    } finally {
      setLoading(false);
    }
  }, [query, orientation, collections, count, enabled]);

  useEffect(() => {
    fetchRandom();
  }, [fetchRandom]);

  return {
    photos,
    photo: photos && photos.length > 0 ? photos[0] : null,
    loading,
    error,
    refetch: fetchRandom,
  };
}

/**
 * Hook to get predefined categories
 */
export function useUnsplashCategories(): {
  categories: UnsplashCategory[];
  loading: boolean;
  error: string | null;
} {
  const [categories, setCategories] = useState<UnsplashCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/unsplash/categories');
        
        if (!response.ok) {
          throw new Error('Failed to get categories');
        }

        const data = await response.json();
        
        if (data.success) {
          setCategories(data.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load categories');
        console.error('Categories error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return { categories, loading, error };
}

/**
 * Track photo download (REQUIRED by Unsplash API TOS)
 * Call this when user selects/uses a photo
 */
export async function trackUnsplashDownload(photoId: string): Promise<void> {
  try {
    await fetch(`/api/unsplash/download/${photoId}`, {
      method: 'POST',
    });
  } catch (error) {
    console.warn('Failed to track Unsplash download:', error);
    // Don't block user interaction if tracking fails
  }
}

/**
 * Get Unsplash photo URL by size
 */
export function getUnsplashUrl(photo: UnsplashPhoto, size: 'raw' | 'full' | 'regular' | 'small' | 'thumb' = 'regular'): string {
  return photo.urls[size];
}

/**
 * Generate attribution text for Unsplash photo
 */
export function getUnsplashAttribution(photo: UnsplashPhoto): {
  text: string;
  photographerUrl: string;
  unsplashUrl: string;
} {
  return {
    text: `Photo by ${photo.user.name} on Unsplash`,
    photographerUrl: photo.user.profileUrl,
    unsplashUrl: 'https://unsplash.com/?utm_source=meridian&utm_medium=referral',
  };
}

