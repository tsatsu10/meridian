// @epic-3.2-time: Optimized images without a separate optimizer service

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/cn';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  quality?: number;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  placeholder?: 'blur' | 'empty';
  fallbackSrc?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  objectFit = 'cover',
  placeholder = 'blur',
  fallbackSrc = '/placeholder-image.png',
  onLoad,
  onError,
  ...rest
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setCurrentSrc(src);
  }, [src]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setError(true);
    setCurrentSrc(fallbackSrc);
    onError?.();
  };

  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={{ width, height }}
    >
      {placeholder === 'blur' && !isLoaded && !error && (
        <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden />
      )}
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={cn(
          'transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          objectFit === 'cover' && 'object-cover w-full h-full',
          objectFit === 'contain' && 'object-contain w-full h-full',
          objectFit === 'fill' && 'object-fill w-full h-full',
          objectFit === 'none' && 'object-none',
          objectFit === 'scale-down' && 'object-scale-down w-full h-full',
        )}
        onLoad={handleLoad}
        onError={handleError}
        {...rest}
      />
    </div>
  );
};
