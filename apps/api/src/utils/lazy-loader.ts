/**
 * 🚀 Lazy Module Loader
 * Dynamic imports for heavy dependencies to reduce bundle size and improve startup time
 */

import { logger } from './logger';

type LazyModule<T> = {
  module?: T;
  loading?: Promise<T>;
};

class LazyLoader {
  private modules: Map<string, LazyModule<any>> = new Map();

  /**
   * Load a module lazily with caching
   */
  async load<T>(
    moduleId: string,
    importFn: () => Promise<T>,
    options: {
      retries?: number;
      timeout?: number;
      onLoad?: (module: T) => void;
      onError?: (error: Error) => void;
    } = {}
  ): Promise<T> {
    const { retries = 3, timeout = 30000, onLoad, onError } = options;
    
    // Check if module is already loaded
    const cached = this.modules.get(moduleId);
    if (cached?.module) {
      return cached.module;
    }

    // Check if module is currently loading
    if (cached?.loading) {
      return cached.loading;
    }

    // Start loading the module
    const loadingPromise = this.loadWithRetry(moduleId, importFn, retries, timeout);
    
    this.modules.set(moduleId, { loading: loadingPromise });

    try {
      const module = await loadingPromise;
      
      // Cache the loaded module
      this.modules.set(moduleId, { module });
      
      // Call onLoad callback
      onLoad?.(module);
      
      logger.info(`📦 Lazy loaded module: ${moduleId}`);
      return module;
    } catch (error) {
      // Remove failed loading promise
      this.modules.delete(moduleId);
      
      // Call onError callback
      onError?.(error as Error);
      
      logger.error(`❌ Failed to lazy load module: ${moduleId}`, { error });
      throw error;
    }
  }

  /**
   * Load module with retry logic
   */
  private async loadWithRetry<T>(
    moduleId: string,
    importFn: () => Promise<T>,
    retries: number,
    timeout: number
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Module loading timeout: ${moduleId}`)), timeout);
        });

        const module = await Promise.race([importFn(), timeoutPromise]);
        
        if (attempt > 1) {
          logger.info(`✅ Module loaded on attempt ${attempt}: ${moduleId}`);
        }
        
        return module;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff
          logger.warn(`⚠️ Module loading failed (attempt ${attempt}/${retries}), retrying in ${delay}ms: ${moduleId}`, { error });
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error(`Failed to load module after ${retries} attempts: ${moduleId}`);
  }

  /**
   * Check if a module is loaded
   */
  isLoaded(moduleId: string): boolean {
    return this.modules.has(moduleId) && !!this.modules.get(moduleId)?.module;
  }

  /**
   * Check if a module is currently loading
   */
  isLoading(moduleId: string): boolean {
    return this.modules.has(moduleId) && !!this.modules.get(moduleId)?.loading;
  }

  /**
   * Get loaded module if available
   */
  getLoaded<T>(moduleId: string): T | undefined {
    return this.modules.get(moduleId)?.module;
  }

  /**
   * Preload modules in the background
   */
  async preload(moduleDefinitions: Array<{
    id: string;
    importFn: () => Promise<any>;
    priority?: number;
  }>): Promise<void> {
    // Sort by priority (higher numbers first)
    const sorted = moduleDefinitions.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    logger.info(`🔄 Starting preload of ${sorted.length} modules...`);
    
    const startTime = Date.now();
    const promises = sorted.map(async ({ id, importFn }, index) => {
      try {
        // Add delay between preloads to avoid overwhelming the system
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        await this.load(id, importFn, { 
          retries: 1, // Less retries for preloading
          timeout: 10000 // Shorter timeout for preloading
        });
      } catch (error) {
        logger.warn(`Failed to preload module: ${id}`, { error });
      }
    });

    await Promise.allSettled(promises);
    
    const duration = Date.now() - startTime;
    const loaded = sorted.filter(({ id }) => this.isLoaded(id)).length;
    
    logger.info(`✅ Preload completed: ${loaded}/${sorted.length} modules in ${duration}ms`);
  }

  /**
   * Clear all cached modules (useful for testing)
   */
  clear(): void {
    this.modules.clear();
    logger.debug('🗑️ Lazy loader cache cleared');
  }

  /**
   * Get loader statistics
   */
  getStats(): {
    totalModules: number;
    loadedModules: number;
    loadingModules: number;
    moduleIds: string[];
  } {
    const moduleIds = Array.from(this.modules.keys());
    const loadedModules = moduleIds.filter(id => this.isLoaded(id)).length;
    const loadingModules = moduleIds.filter(id => this.isLoading(id)).length;

    return {
      totalModules: moduleIds.length,
      loadedModules,
      loadingModules,
      moduleIds
    };
  }
}

// Export singleton instance
export const lazyLoader = new LazyLoader();

// Common lazy loading functions for heavy dependencies
export const lazyLoaders = {
  /**
   * Lazy load TensorFlow.js
   */
  tensorflow: () => lazyLoader.load(
    'tensorflow',
    () => import('@tensorflow/tfjs'),
    {
      timeout: 60000, // TensorFlow can take a while to load
      onLoad: () => logger.info('🧠 TensorFlow.js loaded successfully'),
      onError: (error) => logger.error('❌ Failed to load TensorFlow.js', { error })
    }
  ),

  /**
   * Lazy load Puppeteer
   */
  puppeteer: () => lazyLoader.load(
    'puppeteer',
    () => import('puppeteer'),
    {
      timeout: 45000,
      onLoad: () => logger.info('🎭 Puppeteer loaded successfully'),
      onError: (error) => logger.error('❌ Failed to load Puppeteer', { error })
    }
  ),

  /**
   * Lazy load Firebase Admin
   */
  firebaseAdmin: () => lazyLoader.load(
    'firebase-admin',
    () => import('firebase-admin'),
    {
      onLoad: () => logger.info('🔥 Firebase Admin loaded successfully'),
      onError: (error) => logger.error('❌ Failed to load Firebase Admin', { error })
    }
  ),

  /**
   * Lazy load Google APIs
   */
  googleapis: () => lazyLoader.load(
    'googleapis',
    () => import('googleapis'),
    {
      onLoad: () => logger.info('📊 Google APIs loaded successfully'),
      onError: (error) => logger.error('❌ Failed to load Google APIs', { error })
    }
  ),

  /**
   * Lazy load Sharp (image processing)
   */
  sharp: () => lazyLoader.load(
    'sharp',
    () => import('sharp'),
    {
      onLoad: () => logger.info('🖼️ Sharp loaded successfully'),
      onError: (error) => logger.error('❌ Failed to load Sharp', { error })
    }
  ),

  /**
   * Lazy load ML libraries
   */
  mlKmeans: () => lazyLoader.load(
    'ml-kmeans',
    () => import('ml-kmeans'),
    {
      onLoad: () => logger.info('📈 ML K-means loaded successfully')
    }
  ),

  mlMatrix: () => lazyLoader.load(
    'ml-matrix',
    () => import('ml-matrix'),
    {
      onLoad: () => logger.info('🔢 ML Matrix loaded successfully')
    }
  ),

  mlRegression: () => lazyLoader.load(
    'ml-regression',
    () => import('ml-regression'),
    {
      onLoad: () => logger.info('📉 ML Regression loaded successfully')
    }
  )
};

// Preload high-priority modules on startup (optional)
export async function preloadCriticalModules(): Promise<void> {
  const criticalModules = [
    {
      id: 'firebase-admin',
      importFn: () => import('firebase-admin'),
      priority: 10
    },
    {
      id: 'googleapis',
      importFn: () => import('googleapis'),
      priority: 8
    }
  ];

  await lazyLoader.preload(criticalModules);
}

export default lazyLoader;

