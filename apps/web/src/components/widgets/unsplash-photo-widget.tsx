/**
 * 🖼️ Unsplash Photo Widget
 * 
 * Displays beautiful photos from Unsplash on the dashboard
 * Features:
 * - Photo of the day (random)
 * - Category selection
 * - Photographer attribution
 * - Refresh capability
 * - Click to view on Unsplash
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Sparkles, 
  RefreshCw, 
  ExternalLink, 
  Image as ImageIcon,
  Camera,
  Calendar,
  Heart,
  Download
} from 'lucide-react';
import { cn } from '@/lib/cn';
import type { UnsplashPhoto } from '@/types/unsplash';

interface UnsplashPhotoWidgetProps {
  className?: string;
  defaultCategory?: string;
  showControls?: boolean;
}

const PHOTO_CATEGORIES = [
  { value: 'random', label: '✨ Random', query: '' },
  { value: 'nature', label: '🌿 Nature', query: 'nature landscape' },
  { value: 'workspace', label: '💼 Workspace', query: 'minimal workspace desk' },
  { value: 'architecture', label: '🏛️ Architecture', query: 'modern architecture' },
  { value: 'abstract', label: '🎨 Abstract', query: 'abstract gradient' },
  { value: 'travel', label: '✈️ Travel', query: 'travel destination' },
  { value: 'technology', label: '💻 Technology', query: 'technology modern' },
  { value: 'people', label: '👥 People', query: 'people lifestyle' },
];

export const UnsplashPhotoWidget: React.FC<UnsplashPhotoWidgetProps> = ({
  className,
  defaultCategory = 'random',
  showControls = true,
}) => {
  const [photo, setPhoto] = useState<UnsplashPhoto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState(defaultCategory);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchPhoto = async (selectedCategory: string = category) => {
    setLoading(true);
    setError(null);

    try {
      const categoryData = PHOTO_CATEGORIES.find(c => c.value === selectedCategory);
      const query = categoryData?.query || '';
      
      const url = `/api/unsplash/random${query ? `?query=${encodeURIComponent(query)}` : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch photo');
      }

      const data = await response.json();
      
      if (data.success && data.data && data.data.length > 0) {
        setPhoto(data.data[0]);
        
        // Track download (required by Unsplash TOS)
        if (data.data[0].links?.download_location) {
          fetch('/api/unsplash/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              downloadLocation: data.data[0].links.download_location 
            }),
          }).catch(err => console.error('Download tracking failed:', err));
        }
      } else {
        throw new Error('No photo returned');
      }
    } catch (err) {
      console.error('Failed to fetch Unsplash photo:', err);
      setError(err instanceof Error ? err.message : 'Failed to load photo');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPhoto();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchPhoto(category);
  };

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);
    fetchPhoto(newCategory);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-500" />
          Unsplash Photo
        </CardTitle>
        {showControls && (
          <div className="flex items-center gap-2">
            <Select value={category} onValueChange={handleCategoryChange}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PHOTO_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value} className="text-xs">
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleRefresh}
              disabled={loading || isRefreshing}
            >
              <RefreshCw className={cn(
                "h-4 w-4",
                isRefreshing && "animate-spin"
              )} />
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="w-full h-48 rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground mb-2">
              Failed to load photo
            </p>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              Try Again
            </Button>
          </div>
        ) : photo ? (
          <div className="relative group">
            {/* Photo */}
            <div className="relative aspect-video overflow-hidden">
              <img
                src={photo.urls.regular}
                alt={photo.alt_description || 'Unsplash photo'}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Info Overlay (on hover) */}
              <div className="absolute inset-0 flex items-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="flex items-center justify-between w-full text-white">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Camera className="h-4 w-4 flex-shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <a
                        href={`${photo.user.links.html}?utm_source=Meridian&utm_medium=referral`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium hover:underline truncate"
                      >
                        {photo.user.name}
                      </a>
                      <span className="text-xs text-white/80">
                        on Unsplash
                      </span>
                    </div>
                  </div>
                  
                  <a
                    href={`${photo.links.html}?utm_source=Meridian&utm_medium=referral`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0"
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-white hover:bg-white/20"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
              </div>
            </div>

            {/* Photo Info */}
            <div className="p-4 space-y-3">
              {/* Description */}
              {photo.description && (
                <p className="text-sm text-foreground line-clamp-2">
                  {photo.description}
                </p>
              )}

              {/* Stats */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  {photo.likes !== undefined && (
                    <span className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      {photo.likes.toLocaleString()}
                    </span>
                  )}
                  {photo.downloads !== undefined && (
                    <span className="flex items-center gap-1">
                      <Download className="h-3 w-3" />
                      {photo.downloads.toLocaleString()}
                    </span>
                  )}
                </div>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(photo.created_at)}
                </span>
              </div>

              {/* Attribution (always visible) */}
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Photo by{' '}
                  <a
                    href={`${photo.user.links.html}?utm_source=Meridian&utm_medium=referral`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:underline"
                  >
                    {photo.user.name}
                  </a>
                  {' '}on{' '}
                  <a
                    href="https://unsplash.com?utm_source=Meridian&utm_medium=referral"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:underline"
                  >
                    Unsplash
                  </a>
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

// Named export for widget registry
export { UnsplashPhotoWidget };

// Default export for convenience
export default UnsplashPhotoWidget;

