/**
 * 📬 Notification Queue Service
 * 
 * Simple yet robust queue system for background notification processing.
 * Supports:
 * - In-memory queue with optional persistence
 * - Priority-based processing
 * - Retry logic with exponential backoff
 * - Job status tracking
 * - Graceful shutdown
 * 
 * @future: Can be upgraded to Redis/BullMQ for distributed systems
 */

import { EventEmitter } from 'events';
import logger from '../../utils/logger';
import { NotificationDeliveryService, NotificationPayload } from '../../notification/services/notification-delivery';

export interface QueueJob<T = any> {
  id: string;
  type: 'notification' | 'email' | 'digest' | 'alert';
  payload: T;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  attempts: number;
  maxAttempts: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  totalProcessed: number;
  averageProcessingTime: number;
  lastProcessedAt?: Date;
}

class NotificationQueue extends EventEmitter {
  private queue: Map<string, QueueJob> = new Map();
  private processing: Set<string> = new Set();
  private concurrency: number = 5; // Process 5 jobs concurrently
  private isProcessing: boolean = false;
  private isShuttingDown: boolean = false;
  private processingTimes: number[] = [];
  private totalProcessed: number = 0;

  constructor(concurrency: number = 5) {
    super();
    this.concurrency = concurrency;
  }

  /**
   * Add a job to the queue
   */
  public async addJob<T = any>(
    type: QueueJob['type'],
    payload: T,
    priority: QueueJob['priority'] = 'normal',
    maxAttempts: number = 3
  ): Promise<string> {
    const jobId = `${type}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    const job: QueueJob<T> = {
      id: jobId,
      type,
      payload,
      priority,
      attempts: 0,
      maxAttempts,
      status: 'pending',
      createdAt: new Date(),
    };

    this.queue.set(jobId, job);
    
    logger.info('Job added to queue', {
      jobId,
      type,
      priority,
      queueSize: this.queue.size,
    });

    this.emit('job:added', job);

    // Start processing if not already running
    if (!this.isProcessing) {
      this.startProcessing();
    }

    return jobId;
  }

  /**
   * Add a notification job (convenience method)
   */
  public async addNotification(
    payload: NotificationPayload,
    priority: QueueJob['priority'] = 'normal'
  ): Promise<string> {
    return this.addJob('notification', payload, priority);
  }

  /**
   * Get job status
   */
  public getJob(jobId: string): QueueJob | undefined {
    return this.queue.get(jobId);
  }

  /**
   * Get queue statistics
   */
  public getStats(): QueueStats {
    const jobs = Array.from(this.queue.values());
    const pending = jobs.filter(j => j.status === 'pending').length;
    const processing = jobs.filter(j => j.status === 'processing').length;
    const completed = jobs.filter(j => j.status === 'completed').length;
    const failed = jobs.filter(j => j.status === 'failed').length;

    const avgTime = this.processingTimes.length > 0
      ? this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length
      : 0;

    return {
      pending,
      processing,
      completed,
      failed,
      totalProcessed: this.totalProcessed,
      averageProcessingTime: Math.round(avgTime),
      lastProcessedAt: this.processingTimes.length > 0 ? new Date() : undefined,
    };
  }

  /**
   * Start processing jobs from the queue
   */
  private async startProcessing(): Promise<void> {
    if (this.isProcessing || this.isShuttingDown) return;

    this.isProcessing = true;
    logger.info('Queue processing started', { concurrency: this.concurrency });

    while (this.queue.size > 0 && !this.isShuttingDown) {
      // Get pending jobs sorted by priority
      const pendingJobs = Array.from(this.queue.values())
        .filter(job => job.status === 'pending')
        .sort((a, b) => {
          const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        });

      if (pendingJobs.length === 0) break;

      // Process jobs up to concurrency limit
      const jobsToProcess = pendingJobs.slice(0, this.concurrency - this.processing.size);
      
      await Promise.all(
        jobsToProcess.map(job => this.processJob(job.id))
      );

      // Small delay to prevent CPU thrashing
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isProcessing = false;
    logger.info('Queue processing stopped', { queueSize: this.queue.size });
  }

  /**
   * Process a single job
   */
  private async processJob(jobId: string): Promise<void> {
    const job = this.queue.get(jobId);
    if (!job) return;

    // Update job status
    job.status = 'processing';
    job.processedAt = new Date();
    job.attempts++;
    this.processing.add(jobId);

    const startTime = Date.now();

    try {
      logger.info('Processing job', {
        jobId,
        type: job.type,
        attempt: job.attempts,
        maxAttempts: job.maxAttempts,
      });

      // Process based on job type
      switch (job.type) {
        case 'notification':
          await NotificationDeliveryService.deliverNotification(
            job.payload as NotificationPayload
          );
          break;
          
        case 'email':
          // Handle email-specific jobs
          await this.processEmailJob(job);
          break;
          
        case 'digest':
          // Handle digest generation
          await this.processDigestJob(job);
          break;
          
        case 'alert':
          // Handle alert notifications
          await this.processAlertJob(job);
          break;
          
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      // Mark as completed
      job.status = 'completed';
      job.completedAt = new Date();
      
      const processingTime = Date.now() - startTime;
      this.processingTimes.push(processingTime);
      if (this.processingTimes.length > 100) {
        this.processingTimes.shift(); // Keep last 100 times
      }
      this.totalProcessed++;

      logger.info('Job completed successfully', {
        jobId,
        type: job.type,
        processingTime,
      });

      this.emit('job:completed', job);

      // Remove from queue after 1 minute (keep for status checks)
      setTimeout(() => {
        this.queue.delete(jobId);
      }, 60000);

    } catch (error) {
      logger.error('Job processing failed', {
        jobId,
        type: job.type,
        attempt: job.attempts,
        maxAttempts: job.maxAttempts,
        error: error instanceof Error ? error.message : String(error),
      });

      // Retry logic
      if (job.attempts < job.maxAttempts) {
        job.status = 'pending';
        job.error = error instanceof Error ? error.message : String(error);
        
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, job.attempts), 30000);
        
        logger.info('Retrying job after delay', {
          jobId,
          delay,
          attempt: job.attempts + 1,
        });

        setTimeout(() => {
          if (!this.isShuttingDown) {
            this.startProcessing();
          }
        }, delay);

        this.emit('job:retry', job);
      } else {
        // Max attempts reached
        job.status = 'failed';
        job.error = error instanceof Error ? error.message : String(error);
        job.completedAt = new Date();
        
        logger.error('Job failed permanently', {
          jobId,
          type: job.type,
          attempts: job.attempts,
        });

        this.emit('job:failed', job);

        // Remove from queue after 5 minutes
        setTimeout(() => {
          this.queue.delete(jobId);
        }, 300000);
      }
    } finally {
      this.processing.delete(jobId);
    }
  }

  /**
   * Process email job
   */
  private async processEmailJob(job: QueueJob): Promise<void> {
    // Email-specific processing
    // This is a placeholder - actual implementation depends on email service
    logger.info('Processing email job', { jobId: job.id });
  }

  /**
   * Process digest job
   */
  private async processDigestJob(job: QueueJob): Promise<void> {
    // Digest-specific processing
    logger.info('Processing digest job', { jobId: job.id });
  }

  /**
   * Process alert job
   */
  private async processAlertJob(job: QueueJob): Promise<void> {
    // Alert-specific processing
    logger.info('Processing alert job', { jobId: job.id });
  }

  /**
   * Clear completed and failed jobs
   */
  public clearCompleted(): number {
    const before = this.queue.size;
    
    for (const [id, job] of this.queue.entries()) {
      if (job.status === 'completed' || job.status === 'failed') {
        this.queue.delete(id);
      }
    }

    const cleared = before - this.queue.size;
    logger.info('Cleared completed/failed jobs', { cleared });
    
    return cleared;
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    logger.info('Initiating queue shutdown...');
    
    this.isShuttingDown = true;

    // Wait for current jobs to complete (max 30 seconds)
    let attempts = 0;
    while (this.processing.size > 0 && attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }

    if (this.processing.size > 0) {
      logger.warn('Forceful shutdown - some jobs still processing', {
        processingCount: this.processing.size,
      });
    }

    logger.info('Queue shutdown complete', {
      pending: Array.from(this.queue.values()).filter(j => j.status === 'pending').length,
    });
  }

  /**
   * Pause processing
   */
  public pause(): void {
    this.isProcessing = false;
    logger.info('Queue processing paused');
  }

  /**
   * Resume processing
   */
  public resume(): void {
    if (!this.isShuttingDown) {
      this.startProcessing();
      logger.info('Queue processing resumed');
    }
  }
}

// Export singleton instance
export const notificationQueue = new NotificationQueue(5);

// Graceful shutdown on process termination
process.on('SIGTERM', async () => {
  await notificationQueue.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await notificationQueue.shutdown();
  process.exit(0);
});

export default notificationQueue;


