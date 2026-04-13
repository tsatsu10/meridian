/**
 * Image Optimization Utilities
 * 
 * Comprehensive image loading and optimization system:
 * - Lazy loading with Intersection Observer
 * - WebP and AVIF format support with fallbacks
 * - Responsive images with srcset
 * - Progressive loading with blur placeholders
 * - Image compression and format conversion
 */

import { useState, useEffect, useRef, ImgHTMLAttributes, CSSProperties } from 'react'

// Image format detection
export const supportsWebP = (() => {
  if (typeof window === 'undefined') return false
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
})()

export const supportsAVIF = (() => {
  if (typeof window === 'undefined') return false
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0
})()

// Image optimization options
export interface ImageOptimizationOptions {
  quality?: number
  format?: 'webp' | 'avif' | 'jpeg' | 'png'
  width?: number
  height?: number
  blur?: boolean
  progressive?: boolean
}

// Lazy image loading hook
export function useLazyImage(
  src: string,
  options: {
    rootMargin?: string
    threshold?: number
    placeholder?: string
    onLoad?: () => void
    onError?: (error: Error) => void
  } = {}
) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (!imgRef.current) return

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observerRef.current?.disconnect()
        }
      },
      {
        rootMargin: options.rootMargin || '50px',
        threshold: options.threshold || 0.1,
      }
    )

    observerRef.current.observe(imgRef.current)

    return () => observerRef.current?.disconnect()
  }, [options.rootMargin, options.threshold])

  useEffect(() => {
    if (isInView && !isLoaded) {
      const img = new Image()
      
      img.onload = () => {
        setIsLoaded(true)
        setError(null)
        options.onLoad?.()
      }
      
      img.onerror = () => {
        const err = new Error(`Failed to load image: ${src}`)
        setError(err)
        options.onError?.(err)
      }
      
      img.src = src
    }
  }, [isInView, isLoaded, src, options])

  return {
    ref: imgRef,
    isLoaded,
    isInView,
    error,
    shouldLoad: isInView,
  }
}

// Optimized Image component
export interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string
  alt: string
  width?: number
  height?: number
  placeholder?: string
  blurDataURL?: string
  quality?: number
  formats?: ('webp' | 'avif' | 'jpeg' | 'png')[]
  sizes?: string
  priority?: boolean
  lazy?: boolean
  onLoad?: () => void
  onError?: (error: Error) => void
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  placeholder,
  blurDataURL,
  quality = 85,
  formats = ['webp', 'jpeg'],
  sizes,
  priority = false,
  lazy = true,
  onLoad,
  onError,
  className = '',
  style,
  ...props
}: OptimizedImageProps) {
  const [currentSrc, setCurrentSrc] = useState<string>(placeholder || blurDataURL || '')
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  
  const { ref, shouldLoad } = useLazyImage(src, {
    onLoad: () => {
      setIsLoaded(true)
      onLoad?.()
    },
    onError: (error) => {
      setHasError(true)
      onError?.(error)
    }
  })

  // Generate optimized source URLs
  const generateSrcSet = (baseSrc: string, format: string) => {
    const sizes = [1, 2, 3] // 1x, 2x, 3x density
    return sizes
      .map(density => {
        const optimizedSrc = optimizeImageUrl(baseSrc, {
          width: width ? width * density : undefined,
          height: height ? height * density : undefined,
          quality,
          format: format as any,
        })
        return `${optimizedSrc} ${density}x`
      })
      .join(', ')
  }

  // Load the actual image when in view or priority
  useEffect(() => {
    if ((shouldLoad || priority) && !isLoaded && !hasError) {
      setCurrentSrc(src)
    }
  }, [shouldLoad, priority, src, isLoaded, hasError])

  // Responsive image styles
  const imageStyle: CSSProperties = {
    ...style,
    filter: isLoaded ? 'none' : 'blur(5px)',
    transition: 'filter 0.3s ease, opacity 0.3s ease',
    opacity: isLoaded ? 1 : 0.8,
  }

  // Error fallback
  if (hasError) {
    return (
      <div
        className={`bg-gray-200 flex items-center justify-center ${className}`}
        style={{ width, height, ...style }}
      >
        <span className="text-gray-500 text-sm">Failed to load image</span>
      </div>
    )
  }

  return (
    <picture>
      {/* Modern formats with fallbacks */}
      {formats.includes('avif') && supportsAVIF && (
        <source
          srcSet={generateSrcSet(src, 'avif')}
          type="image/avif"
          sizes={sizes}
        />
      )}
      {formats.includes('webp') && supportsWebP && (
        <source
          srcSet={generateSrcSet(src, 'webp')}
          type="image/webp"
          sizes={sizes}
        />
      )}
      
      {/* Fallback image */}
      <img
        ref={!priority ? ref : undefined}
        src={currentSrc}
        alt={alt}
        width={width}
        height={height}
        className={className}
        style={imageStyle}
        loading={lazy && !priority ? 'lazy' : 'eager'}
        decoding="async"
        sizes={sizes}
        {...props}
      />
    </picture>
  )
}

// Image URL optimization helper
export function optimizeImageUrl(
  url: string,
  options: ImageOptimizationOptions = {}
): string {
  // In a real implementation, this would integrate with an image CDN
  // like Cloudinary, ImageKit, or a custom image optimization service
  
  const params = new URLSearchParams()
  
  if (options.width) params.set('w', options.width.toString())
  if (options.height) params.set('h', options.height.toString())
  if (options.quality) params.set('q', options.quality.toString())
  if (options.format) params.set('f', options.format)
  if (options.blur) params.set('blur', '10')
  if (options.progressive) params.set('progressive', 'true')
  
  const queryString = params.toString()
  const separator = url.includes('?') ? '&' : '?'
  
  return queryString ? `${url}${separator}${queryString}` : url
}

// Progressive image loading component
export function ProgressiveImage({
  src,
  placeholder,
  alt,
  className,
  ...props
}: OptimizedImageProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(placeholder || src)

  useEffect(() => {
    const img = new Image()
    img.src = src
    img.onload = () => {
      setCurrentSrc(src)
      setImageLoaded(true)
    }
  }, [src])

  return (
    <div className="relative overflow-hidden">
      <img
        src={currentSrc}
        alt={alt}
        className={`transition-all duration-300 ${
          imageLoaded ? 'filter-none' : 'filter blur-sm scale-110'
        } ${className}`}
        {...props}
      />
      {!imageLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
    </div>
  )
}

// Image preloader utility
export class ImagePreloader {
  private static cache = new Set<string>()
  private static loading = new Set<string>()

  static preload(urls: string[]): Promise<void[]> {
    return Promise.all(
      urls.map(url => {
        if (this.cache.has(url) || this.loading.has(url)) {
          return Promise.resolve()
        }

        this.loading.add(url)

        return new Promise<void>((resolve, reject) => {
          const img = new Image()
          img.onload = () => {
            this.cache.add(url)
            this.loading.delete(url)
            resolve()
          }
          img.onerror = () => {
            this.loading.delete(url)
            reject(new Error(`Failed to preload image: ${url}`))
          }
          img.src = url
        })
      })
    )
  }

  static isLoaded(url: string): boolean {
    return this.cache.has(url)
  }

  static clearCache(): void {
    this.cache.clear()
  }
}

// Avatar image component with fallback
export function AvatarImage({
  src,
  name,
  size = 40,
  className = '',
  ...props
}: {
  src?: string
  name: string
  size?: number
  className?: string
} & Omit<OptimizedImageProps, 'src' | 'alt'>) {
  const [hasError, setHasError] = useState(false)

  // Generate initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Generate color from name
  const getColor = (name: string) => {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ]
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[index % colors.length]
  }

  if (!src || hasError) {
    return (
      <div
        className={`
          ${getColor(name)} 
          rounded-full 
          flex items-center justify-center 
          text-white font-medium
          ${className}
        `}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {getInitials(name)}
      </div>
    )
  }

  return (
    <OptimizedImage
      src={src}
      alt={`${name} avatar`}
      width={size}
      height={size}
      className={`rounded-full object-cover ${className}`}
      onError={() => setHasError(true)}
      {...props}
    />
  )
}

export default {
  OptimizedImage,
  ProgressiveImage,
  AvatarImage,
  ImagePreloader,
  useLazyImage,
  optimizeImageUrl,
  supportsWebP,
  supportsAVIF,
}