/**
 * 🖼️ Unsplash Photo Picker Component
 * 
 * Beautiful modal for selecting photos from Unsplash
 * 
 * Features:
 * - Keyword search
 * - Quick category buttons
 * - Photo grid with preview
 * - Infinite scroll / Load more
 * - Attribution display
 * - Download tracking (Unsplash TOS)
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, ImageIcon, ExternalLink, Heart } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  useUnsplashSearch,
  useUnsplashCategories,
  trackUnsplashDownload,
  type UnsplashPhoto,
} from '@/hooks/use-unsplash';

export interface UnsplashPhotoPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (photo: UnsplashPhoto) => void;
  orientation?: 'landscape' | 'portrait' | 'squarish';
  defaultQuery?: string;
  title?: string;
  description?: string;
}

export function UnsplashPhotoPicker({
  isOpen,
  onClose,
  onSelect,
  orientation = 'landscape',
  defaultQuery = 'workspace',
  title = 'Choose Photo from Unsplash',
  description = 'Search millions of free high-quality photos',
}: UnsplashPhotoPickerProps) {
  const [searchInput, setSearchInput] = useState(defaultQuery);
  const [selectedPhoto, setSelectedPhoto] = useState<UnsplashPhoto | null>(null);

  const {
    photos,
    total,
    loading,
    error,
    search,
    loadMore,
    hasMore,
  } = useUnsplashSearch({
    query: searchInput,
    perPage: 20,
    orientation,
    enabled: isOpen,
  });

  const { categories } = useUnsplashCategories();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    search(searchInput);
  };

  const handleCategoryClick = (categoryQuery: string) => {
    setSearchInput(categoryQuery);
    search(categoryQuery);
  };

  const handlePhotoSelect = async (photo: UnsplashPhoto) => {
    setSelectedPhoto(photo);
    
    // Track download with Unsplash (required by TOS)
    await trackUnsplashDownload(photo.id);
    
    // Call parent handler
    onSelect(photo);
    
    // Close modal
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search photos... (e.g., 'productivity', 'teamwork', 'nature')"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" disabled={loading || !searchInput}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
          </Button>
        </form>

        {/* Quick Categories */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Badge
              key={category.id}
              variant="outline"
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
              onClick={() => handleCategoryClick(category.query)}
            >
              <span className="mr-1">{category.icon}</span>
              {category.name}
            </Badge>
          ))}
        </div>

        {/* Results Info */}
        {total > 0 && !loading && (
          <div className="text-sm text-muted-foreground">
            Found {total.toLocaleString()} photos
          </div>
        )}

        {/* Photo Grid */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="text-center py-8">
              <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {!error && photos.length === 0 && !loading && (
            <div className="text-center py-12">
              <ImageIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                {searchInput ? 'No photos found. Try a different search term.' : 'Enter a search term to find photos'}
              </p>
            </div>
          )}

          {photos.length > 0 && (
            <div className="grid grid-cols-4 gap-4 p-2">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="group relative cursor-pointer rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                  onClick={() => handlePhotoSelect(photo)}
                  style={{ backgroundColor: photo.color }}
                >
                  {/* Photo */}
                  <img
                    src={photo.urls.small}
                    alt={photo.description || 'Unsplash photo'}
                    className="w-full h-48 object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                  
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                    {/* Photographer info */}
                    <div className="text-white text-xs space-y-1">
                      <p className="font-medium truncate">
                        {photo.user.name}
                      </p>
                      {photo.description && (
                        <p className="truncate opacity-90">
                          {photo.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-[10px] opacity-75">
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {photo.likes}
                        </span>
                        <span>
                          {photo.width} × {photo.height}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="grid grid-cols-4 gap-4 p-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
                />
              ))}
            </div>
          )}

          {/* Load More */}
          {hasMore && !loading && (
            <div className="text-center py-4">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Footer - Attribution */}
        <div className="border-t pt-4 text-xs text-muted-foreground flex items-center justify-between">
          <span>
            Photos powered by{' '}
            <a
              href="https://unsplash.com/?utm_source=meridian&utm_medium=referral"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              Unsplash
            </a>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

