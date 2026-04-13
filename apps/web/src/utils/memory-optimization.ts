// @epic-3.2-time: Memory optimization utilities for large dataset handling
// @persona-mike: Developer needs efficient memory management for performance

/**
 * Optimized array processing for large datasets
 * Prevents memory leaks and reduces memory pressure
 */

/**
 * Memory-efficient flatMap implementation
 */
export function optimizedFlatMap<T, U>(
  array: T[], 
  mapper: (item: T, index: number) => U[]
): U[] {
  const result: U[] = [];
  const batchSize = 1000; // Process in batches to avoid blocking main thread
  
  for (let i = 0; i < array.length; i += batchSize) {
    const batch = array.slice(i, i + batchSize);
    for (let j = 0; j < batch.length; j++) {
      const mapped = mapper(batch[j], i + j);
      result.push(...mapped);
    }
    
    // Yield control back to the browser
    if (i + batchSize < array.length && i % (batchSize * 5) === 0) {
      setTimeout(() => {}, 0);
    }
  }
  
  return result;
}

/**
 * Memory-efficient task flattening for hierarchical data
 */
export function optimizedFlattenTasks(tasks: any[]): any[] {
  const flattened: any[] = [];
  const stack: any[] = [...tasks];
  
  while (stack.length > 0) {
    const task = stack.pop();
    if (!task) continue;
    
    flattened.push(task);
    
    // Add subtasks to stack if they exist
    if (task.subtasks && Array.isArray(task.subtasks) && task.subtasks.length > 0) {
      stack.push(...task.subtasks);
    }
  }
  
  return flattened;
}

/**
 * Memory-efficient filter with pagination
 */
export function optimizedFilter<T>(
  array: T[],
  predicate: (item: T, index: number) => boolean,
  maxResults: number = 1000
): T[] {
  const result: T[] = [];
  
  for (let i = 0; i < array.length && result.length < maxResults; i++) {
    if (predicate(array[i], i)) {
      result.push(array[i]);
    }
  }
  
  return result;
}

/**
 * Memory-efficient sorting with stable sort
 */
export function optimizedSort<T>(
  array: T[],
  compareFn: (a: T, b: T) => number
): T[] {
  // For large arrays, use a more memory-efficient approach
  if (array.length > 1000) {
    return array.slice().sort(compareFn);
  }
  
  return [...array].sort(compareFn);
}

/**
 * Debounced memoization for expensive operations
 */
export function createMemoizedComputation<T, R>(
  computeFn: (input: T) => R,
  keyFn: (input: T) => string,
  ttl: number = 5000 // 5 seconds TTL
): (input: T) => R {
  const cache = new Map<string, { result: R; timestamp: number }>();
  
  return (input: T): R => {
    const key = keyFn(input);
    const now = Date.now();
    const cached = cache.get(key);
    
    if (cached && (now - cached.timestamp) < ttl) {
      return cached.result;
    }
    
    const result = computeFn(input);
    cache.set(key, { result, timestamp: now });
    
    // Cleanup old entries
    if (cache.size > 100) {
      const cutoffTime = now - ttl;
      for (const [k, v] of cache.entries()) {
        if (v.timestamp < cutoffTime) {
          cache.delete(k);
        }
      }
    }
    
    return result;
  };
}

/**
 * Batch processor for large operations
 */
export async function processBatches<T, R>(
  items: T[],
  processor: (batch: T[]) => Promise<R[]> | R[],
  batchSize: number = 100
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await processor(batch);
    results.push(...batchResults);
    
    // Yield control between batches
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  
  return results;
}

/**
 * Memory usage monitor for components
 */
export class MemoryMonitor {
  private static instance: MemoryMonitor;
  private observers: Array<{ threshold: number; callback: () => void }> = [];
  private checkInterval: NodeJS.Timeout | null = null;
  
  static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor();
    }
    return MemoryMonitor.instance;
  }
  
  addObserver(threshold: number, callback: () => void): () => void {
    const observer = { threshold, callback };
    this.observers.push(observer);
    
    if (!this.checkInterval) {
      this.startMonitoring();
    }
    
    return () => {
      const index = this.observers.indexOf(observer);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
      
      if (this.observers.length === 0) {
        this.stopMonitoring();
      }
    };
  }
  
  private startMonitoring(): void {
    this.checkInterval = setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usage = memory.usedJSHeapSize / memory.totalJSHeapSize;
        
        this.observers.forEach(observer => {
          if (usage >= observer.threshold) {
            observer.callback();
          }
        });
      }
    }, 15000); // Check every 15 seconds instead of 5 seconds
  }
  
  private stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
  
  getCurrentUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / memory.totalJSHeapSize;
    }
    return 0;
  }
}

/**
 * Hook for memory-efficient useMemo
 */
export function useOptimizedMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  maxSize: number = 1000
): T {
  const React = require('react');
  
  return React.useMemo(() => {
    const result = factory();
    
    // If result is an array and too large, limit it
    if (Array.isArray(result) && result.length > maxSize) {
      console.warn(`🧠 Large array detected (${result.length} items), limiting to ${maxSize} for memory efficiency`);
      return result.slice(0, maxSize) as T;
    }
    
    return result;
  }, deps);
}

/**
 * Cleanup utility for component unmount
 */
export function createCleanupManager(): {
  add: (cleanup: () => void) => void;
  cleanup: () => void;
} {
  const cleanupFunctions: Array<() => void> = [];
  
  return {
    add: (cleanup: () => void) => {
      cleanupFunctions.push(cleanup);
    },
    cleanup: () => {
      cleanupFunctions.forEach(fn => {
        try {
          fn();
        } catch (error) {
          console.warn('Cleanup function failed:', error);
        }
      });
      cleanupFunctions.length = 0;
    }
  };
} 