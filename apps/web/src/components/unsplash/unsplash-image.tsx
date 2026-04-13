/**
 * 🖼️ Unsplash Image Component
 * 
 * Displays an Unsplash photo with proper attribution
 * Handles loading, errors, and responsive sizing
 * 
 * Required by Unsplash API TOS:
 * - Display photographer credit
 * - Link to photographer profile
 * - Link to Unsplash
 */

import { useState } from 'react';
import { ExternalLink, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { getUnsplashAttribution, type UnsplashPhoto } from '@/hooks/use-unsplash';

export interface UnsplashImageProps {
  photo: UnsplashPhoto;
  size?: 'raw' | 'full' | 'regular' | 'small' | 'thumb';
  alt?: string;
  className?: string;
  showAttribution?: boolean;
  attributionPosition?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  objectFit?: 'cover' | 'contain' | 'fill';
  onClick?: () => void;
}

export function UnsplashImage({
  photo,
  size = 'regular',
  alt,
  className,
  showAttribution = true,
  attributionPosition = 'bottom-right',
  objectFit = 'cover',
  onClick,
}: UnsplashImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const attribution = getUnsplashAttribution(photo);
  const imageUrl = photo.urls[size];

  const attributionClasses = cn(
    'absolute z-10 text-[10px] text-white bg-black/60 backdrop-blur-sm px-2 py-1 rounded',
    attributionPosition === 'bottom-left' && 'bottom-2 left-2',
    attributionPosition === 'bottom-right' && 'bottom-2 right-2',
    attributionPosition === 'top-left' && 'top-2 left-2',
    attributionPosition === 'top-right' && 'top-2 right-2'
  );

  if (hasError) {
    return (
      <div className={cn('flex items-center justify-center bg-gray-100 dark:bg-gray-800', className)}>
        <div className="text-center text-muted-foreground">
          <ImageIcon className="h-8 w-8 mx-auto mb-2" />
          <p className="text-xs">Failed to load image</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', className)} onClick={onClick}>
      {/* Placeholder while loading */}
      {!isLoaded && (
        <div 
          className="absolute inset-0 animate-pulse"
          style={{ backgroundColor: photo.color }}
        />
      )}

      {/* Image */}
      <img
        src={imageUrl}
        alt={alt || photo.description || 'Unsplash photo'}
        className={cn(
          'w-full h-full transition-opacity duration-300',
          objectFit === 'cover' && 'object-cover',
          objectFit === 'contain' && 'object-contain',
          objectFit === 'fill' && 'object-fill',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        loading="lazy"
      />

      {/* Attribution (required by Unsplash TOS) */}
      {showAttribution && isLoaded && (
        <div className={attributionClasses}>
          <a
            href={attribution.photographerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline inline-flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {attribution.text.replace(' on Unsplash', '')}
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
          {' on '}
          <a
            href={attribution.unsplashUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline font-semibold"
            onClick={(e) => e.stopPropagation()}
          >
            Unsplash
          </a>
        </div>
      )}
    </div>
  );
}

/**
 * Simpler image component without attribution
 * (Use only when attribution is displayed elsewhere)
 */
export function UnsplashImageSimple({
  photo,
  size = 'regular',
  alt,
  className,
  objectFit = 'cover',
}: Omit<UnsplashImageProps, 'showAttribution' | 'attributionPosition'>) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const imageUrl = photo.urls[size];

  if (hasError) {
    return (
      <div className={cn('flex items-center justify-center bg-gray-100 dark:bg-gray-800', className)}>
        <ImageIcon className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {!isLoaded && (
        <div 
          className="absolute inset-0 animate-pulse"
          style={{ backgroundColor: photo.color }}
        />
      )}

      <img
        src={imageUrl}
        alt={alt || photo.description || 'Photo'}
        className={cn(
          'w-full h-full transition-opacity duration-300',
          objectFit === 'cover' && 'object-cover',
          objectFit === 'contain' && 'object-contain',
          objectFit === 'fill' && 'object-fill',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        loading="lazy"
      />
    </div>
  );
}

/**
 * Attribution badge component
 * Use when displaying image attribution separately
 */
export function UnsplashAttribution({
  photo,
  className,
}: {
  photo: UnsplashPhoto;
  className?: string;
}) {
  const attribution = getUnsplashAttribution(photo);

  return (
    <div className={cn('text-xs text-muted-foreground', className)}>
      Photo by{' '}
      <a
        href={attribution.photographerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-foreground"
      >
        {photo.user.name}
      </a>
      {' on '}
      <a
        href={attribution.unsplashUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:text-foreground font-medium"
      >
        Unsplash
      </a>
    </div>
  );
}

