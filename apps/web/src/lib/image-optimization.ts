/**
 * Image Optimization Utilities
 * Client-side image compression and optimization for uploads
 */

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputFormat?: 'image/jpeg' | 'image/webp' | 'image/png';
  maintainAspectRatio?: boolean;
}

export interface OptimizedImage {
  file: File;
  dataUrl: string;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  width: number;
  height: number;
}

const DEFAULT_OPTIONS: Required<ImageOptimizationOptions> = {
  maxWidth: 800,
  maxHeight: 800,
  quality: 0.85,
  outputFormat: 'image/webp',
  maintainAspectRatio: true,
};

/**
 * Compress and optimize an image file
 * @param file - The image file to optimize
 * @param options - Optimization options
 * @returns Promise with optimized image data
 */
export async function optimizeImage(
  file: File,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImage> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Failed to read image file'));

    reader.onload = (e) => {
      const result = e.target?.result;
      if (!result || typeof result !== 'string') {
        reject(new Error('Failed to read image file - invalid result'));
        return;
      }

      const img = new Image();

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.onload = () => {
        try {
          // Calculate new dimensions
          let { width, height } = img;
          
          if (!width || !height || width <= 0 || height <= 0) {
            reject(new Error('Invalid image dimensions'));
            return;
          }
          
          if (opts.maintainAspectRatio) {
            const aspectRatio = width / height;
            
            if (width > opts.maxWidth) {
              width = opts.maxWidth;
              height = width / aspectRatio;
            }
            
            if (height > opts.maxHeight) {
              height = opts.maxHeight;
              width = height * aspectRatio;
            }
          } else {
            width = Math.min(width, opts.maxWidth);
            height = Math.min(height, opts.maxHeight);
          }

          // Create canvas and draw resized image
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(width);
          canvas.height = Math.round(height);

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // Enable image smoothing for better quality
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Draw image on canvas
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Get file extension from output format
          const formatParts = opts.outputFormat.split('/');
          const extension = formatParts.length > 1 ? formatParts[1] : 'jpg';
          
          // Create optimized file
          const fileName = file.name.replace(/\.[^/.]+$/, '') || 'image';
          const optimizedFileName = `${fileName}.${extension}`;

          // Convert to blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to create image blob'));
                return;
              }

              const optimizedFile = new File(
                [blob],
                optimizedFileName,
                {
                  type: opts.outputFormat,
                  lastModified: Date.now(),
                }
              );

              // Create data URL for preview
              const dataUrl = canvas.toDataURL(opts.outputFormat, opts.quality);

              const compressionRatio = ((file.size - blob.size) / file.size) * 100;

              resolve({
                file: optimizedFile,
                dataUrl,
                originalSize: file.size,
                optimizedSize: blob.size,
                compressionRatio,
                width: canvas.width,
                height: canvas.height,
              });
            },
            opts.outputFormat,
            opts.quality
          );
        } catch (error) {
          reject(error instanceof Error ? error : new Error('Unknown error during image optimization'));
        }
      };

      img.src = result;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Generate multiple sizes for responsive images
 * @param file - The image file
 * @param sizes - Array of max dimensions for each size
 * @returns Promise with array of optimized images
 */
export async function generateResponsiveSizes(
  file: File,
  sizes: Array<{ name: string; maxWidth: number; maxHeight: number }> = [
    { name: 'thumbnail', maxWidth: 150, maxHeight: 150 },
    { name: 'small', maxWidth: 400, maxHeight: 400 },
    { name: 'medium', maxWidth: 800, maxHeight: 800 },
    { name: 'large', maxWidth: 1200, maxHeight: 1200 },
  ]
): Promise<Array<OptimizedImage & { name: string }>> {
  const results = await Promise.all(
    sizes.map(async (size) => {
      const optimized = await optimizeImage(file, {
        maxWidth: size.maxWidth,
        maxHeight: size.maxHeight,
        quality: 0.85,
        outputFormat: 'image/webp',
      });
      return { ...optimized, name: size.name };
    })
  );

  return results;
}

/**
 * Check if browser supports WebP format
 */
export function supportsWebP(): boolean {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
}

/**
 * Get optimal format based on browser support
 */
export function getOptimalFormat(): 'image/webp' | 'image/jpeg' {
  return supportsWebP() ? 'image/webp' : 'image/jpeg';
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Validate image dimensions
 */
export async function validateImageDimensions(
  file: File,
  options: {
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
  } = {}
): Promise<{ valid: boolean; width: number; height: number; message?: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const result = e.target?.result;
      if (!result || typeof result !== 'string') {
        resolve({
          valid: false,
          width: 0,
          height: 0,
          message: 'Failed to read file',
        });
        return;
      }

      const img = new Image();

      img.onload = () => {
        const { width, height } = img;
        
        if (!width || !height || width <= 0 || height <= 0) {
          resolve({
            valid: false,
            width: 0,
            height: 0,
            message: 'Invalid image dimensions',
          });
          return;
        }
        
        let valid = true;
        let message: string | undefined;

        if (options.minWidth && width < options.minWidth) {
          valid = false;
          message = `Image width must be at least ${options.minWidth}px (current: ${width}px)`;
        } else if (options.minHeight && height < options.minHeight) {
          valid = false;
          message = `Image height must be at least ${options.minHeight}px (current: ${height}px)`;
        } else if (options.maxWidth && width > options.maxWidth) {
          valid = false;
          message = `Image width must not exceed ${options.maxWidth}px (current: ${width}px)`;
        } else if (options.maxHeight && height > options.maxHeight) {
          valid = false;
          message = `Image height must not exceed ${options.maxHeight}px (current: ${height}px)`;
        }

        resolve({ valid, width, height, message });
      };

      img.onerror = () => {
        resolve({
          valid: false,
          width: 0,
          height: 0,
          message: 'Failed to load image',
        });
      };

      img.src = result;
    };

    reader.onerror = () => {
      resolve({
        valid: false,
        width: 0,
        height: 0,
        message: 'Failed to read file',
      });
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Avatar-specific optimization
 * Optimizes images specifically for avatar use (square, smaller)
 */
export async function optimizeAvatarImage(file: File): Promise<OptimizedImage> {
  return optimizeImage(file, {
    maxWidth: 400,
    maxHeight: 400,
    quality: 0.9,
    outputFormat: getOptimalFormat(),
    maintainAspectRatio: true,
  });
}

