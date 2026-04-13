// @epic-2.4-performance: Stream-based data processing utilities
// Prevents memory leaks when processing large datasets

import { Readable, Transform, pipeline } from 'stream';
import { promisify } from 'util';
import logger from './logger';

const pipelineAsync = promisify(pipeline);

interface StreamProcessorOptions {
  batchSize?: number;
  concurrency?: number;
  memoryLimit?: number; // in MB
  timeout?: number; // in ms
}

interface ProcessingResult<T> {
  processed: number;
  errors: number;
  results: T[];
  memoryUsage: {
    initial: number;
    peak: number;
    final: number;
  };
  processingTime: number;
}

/**
 * Memory-efficient stream processor for large datasets
 */
export class StreamProcessor<T, R> {
  private options: Required<StreamProcessorOptions>;
  private memoryTracking = {
    initial: 0,
    peak: 0,
    final: 0
  };

  constructor(options: StreamProcessorOptions = {}) {
    this.options = {
      batchSize: options.batchSize || 100,
      concurrency: options.concurrency || 4,
      memoryLimit: (options.memoryLimit || 256) * 1024 * 1024, // Convert MB to bytes
      timeout: options.timeout || 30000
    };
  }

  /**
   * Process data array in memory-efficient batches
   */
  async processArray<U>(
    data: T[],
    processor: (batch: T[]) => Promise<U[]>,
    options: { onProgress?: (progress: number) => void } = {}
  ): Promise<ProcessingResult<U>> {
    const startTime = Date.now();
    this.memoryTracking.initial = this.getCurrentMemoryUsage();
    
    const results: U[] = [];
    let processed = 0;
    let errors = 0;

    try {
      // Process in batches to avoid memory spikes
      for (let i = 0; i < data.length; i += this.options.batchSize) {
        const batch = data.slice(i, i + this.options.batchSize);
        
        try {
          // Check memory before processing batch
          const currentMemory = this.getCurrentMemoryUsage();
          this.memoryTracking.peak = Math.max(this.memoryTracking.peak, currentMemory);
          
          if (currentMemory > this.options.memoryLimit) {
            logger.warn(`⚠️ Memory limit exceeded: ${currentMemory / (1024 * 1024)}MB`);
            
            // Force garbage collection if available
            if (global.gc) {
              global.gc();
            }
            
            // Wait a bit for GC to complete
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          const batchResults = await Promise.race([
            processor(batch),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Batch processing timeout')), this.options.timeout)
            )
          ]);

          results.push(...batchResults);
          processed += batch.length;

          // Report progress
          if (options.onProgress) {
            const progress = Math.round((processed / data.length) * 100);
            options.onProgress(progress);
          }

        } catch (error) {
          logger.error(`❌ Error processing batch ${i}-${i + batch.length}:`, error);
          errors += batch.length;
        }

        // Small delay to prevent overwhelming the system
        if (i + this.options.batchSize < data.length) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

    } finally {
      this.memoryTracking.final = this.getCurrentMemoryUsage();
    }

    return {
      processed,
      errors,
      results,
      memoryUsage: this.memoryTracking,
      processingTime: Date.now() - startTime
    };
  }

  /**
   * Process database query results as a stream
   */
  async processQueryStream<U>(
    queryFn: (offset: number, limit: number) => Promise<T[]>,
    processor: (item: T) => Promise<U>,
    options: { 
      onProgress?: (progress: { processed: number, estimated?: number }) => void,
      estimatedTotal?: number 
    } = {}
  ): Promise<ProcessingResult<U>> {
    const startTime = Date.now();
    this.memoryTracking.initial = this.getCurrentMemoryUsage();
    
    const results: U[] = [];
    let processed = 0;
    let errors = 0;
    let offset = 0;
    let hasMore = true;

    try {
      while (hasMore) {
        // Fetch next batch
        const batch = await queryFn(offset, this.options.batchSize);
        
        if (batch.length === 0) {
          hasMore = false;
          break;
        }

        // Process batch items
        const batchPromises = batch.map(async (item) => {
          try {
            return await processor(item);
          } catch (error) {
            logger.error('❌ Error processing item:', error);
            errors++;
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        
        // Filter out null results (errors)
        const validResults = batchResults.filter(result => result !== null) as U[];
        results.push(...validResults);
        
        processed += batch.length;
        offset += this.options.batchSize;

        // Memory check
        const currentMemory = this.getCurrentMemoryUsage();
        this.memoryTracking.peak = Math.max(this.memoryTracking.peak, currentMemory);

        // Progress reporting
        if (options.onProgress) {
          options.onProgress({
            processed,
            estimated: options.estimatedTotal
          });
        }

        // Memory management
        if (currentMemory > this.options.memoryLimit) {
          logger.warn(`🧹 Triggering cleanup at ${currentMemory / (1024 * 1024)}MB`);
          if (global.gc) {
            global.gc();
          }
        }

        // Prevent runaway queries
        if (processed > 10000) {
          logger.warn(`⚠️ Processed ${processed} items, stopping to prevent memory issues`);
          break;
        }
      }

    } finally {
      this.memoryTracking.final = this.getCurrentMemoryUsage();
    }

    return {
      processed,
      errors,
      results,
      memoryUsage: this.memoryTracking,
      processingTime: Date.now() - startTime
    };
  }

  /**
   * Create a transform stream for processing data
   */
  createTransformStream<U>(
    processor: (chunk: T) => Promise<U>
  ): Transform {
    return new Transform({
      objectMode: true,
      highWaterMark: this.options.batchSize,
      async transform(chunk: T, encoding, callback) {
        try {
          const result = await processor(chunk);
          callback(null, result);
        } catch (error) {
          callback(error);
        }
      }
    });
  }

  /**
   * Process readable stream with backpressure handling
   */
  async processStream<U>(
    source: Readable,
    processor: (chunk: T) => Promise<U>
  ): Promise<ProcessingResult<U>> {
    const startTime = Date.now();
    this.memoryTracking.initial = this.getCurrentMemoryUsage();
    
    const results: U[] = [];
    let processed = 0;
    let errors = 0;

    const transformStream = new Transform({
      objectMode: true,
      highWaterMark: this.options.batchSize,
      async transform(chunk: T, encoding, callback) {
        try {
          const result = await processor(chunk);
          results.push(result);
          processed++;
          
          // Update peak memory
          const currentMemory = this.getCurrentMemoryUsage();
          this.memoryTracking.peak = Math.max(this.memoryTracking.peak, currentMemory);
          
          callback(null, result);
        } catch (error) {
          errors++;
          logger.error('❌ Stream processing error:', error);
          callback(); // Continue processing
        }
      }
    });

    try {
      await pipelineAsync(source, transformStream);
    } catch (error) {
      logger.error('❌ Stream pipeline error:', error);
    }

    this.memoryTracking.final = this.getCurrentMemoryUsage();

    return {
      processed,
      errors,
      results,
      memoryUsage: this.memoryTracking,
      processingTime: Date.now() - startTime
    };
  }

  /**
   * Get current memory usage in bytes
   */
  private getCurrentMemoryUsage(): number {
    return process.memoryUsage().heapUsed;
  }
}

/**
 * Utility function to create paginated query processor
 */
export function createPaginatedProcessor<T, R>(options: StreamProcessorOptions = {}) {
  return new StreamProcessor<T, R>(options);
}

/**
 * Memory-safe batch processor for arrays
 */
export async function processBatches<T, R>(
  data: T[],
  processor: (batch: T[]) => Promise<R[]>,
  batchSize: number = 100
): Promise<R[]> {
  const streamProcessor = new StreamProcessor<T, R>({ batchSize });
  const result = await streamProcessor.processArray(data, processor);
  
  logger.info(`📊 Batch processing complete: ${result.processed} items, ${result.errors} errors, ${result.processingTime}ms`);
  
  return result.results;
}

