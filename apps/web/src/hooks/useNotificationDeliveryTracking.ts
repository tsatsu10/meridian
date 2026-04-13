import { useState, useCallback, useRef, useEffect } from 'react';

interface DeliveryAttempt {
  id: string;
  timestamp: Date;
  channel: 'push' | 'email' | 'in-app' | 'sms';
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'bounced';
  error?: string;
  retryCount: number;
  deliveryTime?: number; // milliseconds
  metadata?: Record<string, any>;
}

interface NotificationDelivery {
  notificationId: string;
  userId: string;
  attempts: DeliveryAttempt[];
  finalStatus: 'delivered' | 'failed' | 'partial';
  createdAt: Date;
  firstDeliveredAt?: Date;
  readAt?: Date;
  channels: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  fallbackStrategy: 'none' | 'email' | 'sms' | 'all';
}

interface DeliveryMetrics {
  totalNotifications: number;
  deliveryRate: number;
  readRate: number;
  averageDeliveryTime: number;
  channelPerformance: Record<string, {
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    averageTime: number;
  }>;
  recentFailures: DeliveryAttempt[];
  trends: {
    hourly: number[];
    daily: number[];
    weekly: number[];
  };
}

interface DeliveryConfig {
  retryPolicy: {
    maxRetries: number;
    retryDelays: number[]; // milliseconds
    exponentialBackoff: boolean;
  };
  timeouts: {
    push: number;
    email: number;
    inApp: number;
    sms: number;
  };
  fallbackRules: {
    pushToEmail: boolean;
    emailToSms: boolean;
    urgentBroadcast: boolean;
  };
  trackingEnabled: boolean;
  analyticsRetention: number; // days
}

export function useNotificationDeliveryTracking(config?: Partial<DeliveryConfig>) {
  const [deliveries, setDeliveries] = useState<Map<string, NotificationDelivery>>(new Map());
  const [metrics, setMetrics] = useState<DeliveryMetrics | null>(null);
  const [isTracking, setIsTracking] = useState(true);

  const deliveryConfig = useRef<DeliveryConfig>({
    retryPolicy: {
      maxRetries: 3,
      retryDelays: [1000, 5000, 15000], // 1s, 5s, 15s
      exponentialBackoff: true
    },
    timeouts: {
      push: 10000, // 10 seconds
      email: 30000, // 30 seconds
      inApp: 5000, // 5 seconds
      sms: 20000 // 20 seconds
    },
    fallbackRules: {
      pushToEmail: true,
      emailToSms: false,
      urgentBroadcast: true
    },
    trackingEnabled: true,
    analyticsRetention: 30,
    ...config
  });

  const retryQueues = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const deliveryPromises = useRef<Map<string, Promise<void>>>(new Map());

  // Track notification delivery attempt
  const trackDeliveryAttempt = useCallback(async (
    notificationId: string,
    channel: DeliveryAttempt['channel'],
    userId: string,
    priority: NotificationDelivery['priority'] = 'medium',
    channels: string[] = [channel]
  ): Promise<string> => {
    if (!deliveryConfig.current.trackingEnabled) {
      return 'tracking-disabled';
    }

    const attemptId = Math.random().toString(36).substr(2, 9);
    const attempt: DeliveryAttempt = {
      id: attemptId,
      timestamp: new Date(),
      channel,
      status: 'pending',
      retryCount: 0,
      metadata: {
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      }
    };

    setDeliveries(prev => {
      const updated = new Map(prev);
      const existing = updated.get(notificationId);
      
      if (existing) {
        existing.attempts.push(attempt);
      } else {
        const delivery: NotificationDelivery = {
          notificationId,
          userId,
          attempts: [attempt],
          finalStatus: 'delivered', // Will be updated based on attempts
          createdAt: new Date(),
          channels,
          priority,
          fallbackStrategy: priority === 'urgent' ? 'all' : 'email'
        };
        updated.set(notificationId, delivery);
      }
      
      return updated;
    });

    // Start delivery process
    executeDelivery(notificationId, attemptId, channel);
    
    return attemptId;
  }, []);

  // Execute delivery attempt
  const executeDelivery = async (
    notificationId: string,
    attemptId: string,
    channel: DeliveryAttempt['channel']
  ) => {
    const timeout = deliveryConfig.current.timeouts[channel];
    
    try {
      updateAttemptStatus(notificationId, attemptId, 'sent');
      
      // Simulate delivery process
      const deliveryPromise = simulateDelivery(channel, timeout);
      deliveryPromises.current.set(attemptId, deliveryPromise);
      
      const startTime = Date.now();
      await deliveryPromise;
      const deliveryTime = Date.now() - startTime;
      
      updateAttemptStatus(notificationId, attemptId, 'delivered', undefined, deliveryTime);
      
      // Update delivery record
      setDeliveries(prev => {
        const updated = new Map(prev);
        const delivery = updated.get(notificationId);
        if (delivery && !delivery.firstDeliveredAt) {
          delivery.firstDeliveredAt = new Date();
        }
        return updated;
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateAttemptStatus(notificationId, attemptId, 'failed', errorMessage);
      
      // Handle retry logic
      await handleDeliveryFailure(notificationId, attemptId, channel, errorMessage);
    } finally {
      deliveryPromises.current.delete(attemptId);
    }
  };

  // Handle delivery failure and retry logic
  const handleDeliveryFailure = async (
    notificationId: string,
    attemptId: string,
    channel: DeliveryAttempt['channel'],
    error: string
  ) => {
    const delivery = deliveries.get(notificationId);
    if (!delivery) return;

    const attempt = delivery.attempts.find(a => a.id === attemptId);
    if (!attempt) return;

    const { retryPolicy, fallbackRules } = deliveryConfig.current;
    
    // Check if we should retry
    if (attempt.retryCount < retryPolicy.maxRetries) {
      const retryDelay = retryPolicy.exponentialBackoff
        ? Math.min(retryPolicy.retryDelays[0] * Math.pow(2, attempt.retryCount), 60000)
        : retryPolicy.retryDelays[Math.min(attempt.retryCount, retryPolicy.retryDelays.length - 1)];

      const timeoutId = setTimeout(() => {
        retryDelivery(notificationId, attemptId, channel);
        retryQueues.current.delete(attemptId);
      }, retryDelay);

      retryQueues.current.set(attemptId, timeoutId);
      
    } else {
      // Exhausted retries, try fallback channels
      await handleFallbackDelivery(notificationId, channel, error);
    }
  };

  // Retry delivery attempt
  const retryDelivery = async (
    notificationId: string,
    attemptId: string,
    channel: DeliveryAttempt['channel']
  ) => {
    setDeliveries(prev => {
      const updated = new Map(prev);
      const delivery = updated.get(notificationId);
      if (delivery) {
        const attempt = delivery.attempts.find(a => a.id === attemptId);
        if (attempt) {
          attempt.retryCount++;
          attempt.status = 'pending';
          attempt.timestamp = new Date();
        }
      }
      return updated;
    });

    await executeDelivery(notificationId, attemptId, channel);
  };

  // Handle fallback delivery channels
  const handleFallbackDelivery = async (
    notificationId: string,
    failedChannel: DeliveryAttempt['channel'],
    originalError: string
  ) => {
    const delivery = deliveries.get(notificationId);
    if (!delivery) return;

    const { fallbackRules } = deliveryConfig.current;
    const fallbackChannels: DeliveryAttempt['channel'][] = [];

    // Determine fallback channels based on rules and failed channel
    if (failedChannel === 'push' && fallbackRules.pushToEmail) {
      fallbackChannels.push('email');
    }
    
    if (failedChannel === 'email' && fallbackRules.emailToSms) {
      fallbackChannels.push('sms');
    }
    
    if (delivery.priority === 'urgent' && fallbackRules.urgentBroadcast) {
      fallbackChannels.push('email', 'sms', 'in-app');
    }

    // Execute fallback deliveries
    for (const channel of fallbackChannels) {
      if (channel !== failedChannel && !delivery.attempts.some(a => a.channel === channel)) {
        await trackDeliveryAttempt(notificationId, channel, delivery.userId, delivery.priority);
      }
    }

    // Update final status based on all attempts
    updateFinalDeliveryStatus(notificationId);
  };

  // Update attempt status
  const updateAttemptStatus = (
    notificationId: string,
    attemptId: string,
    status: DeliveryAttempt['status'],
    error?: string,
    deliveryTime?: number
  ) => {
    setDeliveries(prev => {
      const updated = new Map(prev);
      const delivery = updated.get(notificationId);
      if (delivery) {
        const attempt = delivery.attempts.find(a => a.id === attemptId);
        if (attempt) {
          attempt.status = status;
          if (error) attempt.error = error;
          if (deliveryTime) attempt.deliveryTime = deliveryTime;
        }
      }
      return updated;
    });
  };

  // Update final delivery status
  const updateFinalDeliveryStatus = (notificationId: string) => {
    setDeliveries(prev => {
      const updated = new Map(prev);
      const delivery = updated.get(notificationId);
      if (delivery) {
        const hasDelivered = delivery.attempts.some(a => a.status === 'delivered');
        const allFailed = delivery.attempts.every(a => a.status === 'failed' || a.status === 'bounced');
        
        delivery.finalStatus = hasDelivered ? 'delivered' : 
                              allFailed ? 'failed' : 'partial';
      }
      return updated;
    });
  };

  // Simulate delivery process (replace with actual delivery logic)
  const simulateDelivery = (channel: string, timeout: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      const deliveryTime = Math.random() * 3000 + 500; // 0.5-3.5 seconds
      const failureRate = channel === 'push' ? 0.05 : channel === 'email' ? 0.02 : 0.01;
      
      const timeoutId = setTimeout(() => {
        reject(new Error(`Delivery timeout for ${channel}`));
      }, timeout);

      setTimeout(() => {
        clearTimeout(timeoutId);
        if (Math.random() < failureRate) {
          reject(new Error(`${channel} delivery failed`));
        } else {
          resolve();
        }
      }, deliveryTime);
    });
  };

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    setDeliveries(prev => {
      const updated = new Map(prev);
      const delivery = updated.get(notificationId);
      if (delivery && !delivery.readAt) {
        delivery.readAt = new Date();
        
        // Update attempts to mark as read
        delivery.attempts.forEach(attempt => {
          if (attempt.status === 'delivered') {
            attempt.status = 'read';
          }
        });
      }
      return updated;
    });
  }, []);

  // Get delivery status for a notification
  const getDeliveryStatus = useCallback((notificationId: string) => {
    return deliveries.get(notificationId);
  }, [deliveries]);

  // Calculate metrics
  const calculateMetrics = useCallback((): DeliveryMetrics => {
    const allDeliveries = Array.from(deliveries.values());
    const allAttempts = allDeliveries.flatMap(d => d.attempts);
    
    const totalNotifications = allDeliveries.length;
    const deliveredNotifications = allDeliveries.filter(d => d.finalStatus === 'delivered').length;
    const readNotifications = allDeliveries.filter(d => d.readAt).length;
    
    const deliveryTimes = allAttempts
      .filter(a => a.status === 'delivered' && a.deliveryTime)
      .map(a => a.deliveryTime!);
    
    const averageDeliveryTime = deliveryTimes.length > 0
      ? deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length
      : 0;

    // Calculate channel performance
    const channelPerformance = allAttempts.reduce((acc, attempt) => {
      const channel = attempt.channel;
      if (!acc[channel]) {
        acc[channel] = { sent: 0, delivered: 0, read: 0, failed: 0, averageTime: 0 };
      }
      
      if (attempt.status === 'sent' || attempt.status === 'delivered' || attempt.status === 'read') {
        acc[channel].sent++;
      }
      if (attempt.status === 'delivered' || attempt.status === 'read') {
        acc[channel].delivered++;
      }
      if (attempt.status === 'read') {
        acc[channel].read++;
      }
      if (attempt.status === 'failed' || attempt.status === 'bounced') {
        acc[channel].failed++;
      }
      
      return acc;
    }, {} as Record<string, any>);

    // Calculate average times per channel
    Object.keys(channelPerformance).forEach(channel => {
      const channelAttempts = allAttempts.filter(a => a.channel === channel && a.deliveryTime);
      if (channelAttempts.length > 0) {
        channelPerformance[channel].averageTime = 
          channelAttempts.reduce((sum, a) => sum + a.deliveryTime!, 0) / channelAttempts.length;
      }
    });

    return {
      totalNotifications,
      deliveryRate: totalNotifications > 0 ? (deliveredNotifications / totalNotifications) * 100 : 0,
      readRate: totalNotifications > 0 ? (readNotifications / totalNotifications) * 100 : 0,
      averageDeliveryTime,
      channelPerformance,
      recentFailures: allAttempts
        .filter(a => a.status === 'failed' && Date.now() - a.timestamp.getTime() < 3600000) // Last hour
        .slice(-10), // Last 10 failures
      trends: {
        hourly: [], // Would be calculated from historical data
        daily: [],
        weekly: []
      }
    };
  }, [deliveries]);

  // Update metrics periodically
  useEffect(() => {
    if (!isTracking) return;

    const updateMetrics = () => {
      setMetrics(calculateMetrics());
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [isTracking, calculateMetrics]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all retry timeouts
      retryQueues.current.forEach(timeout => clearTimeout(timeout));
      retryQueues.current.clear();
      
      // Cancel pending delivery promises
      deliveryPromises.current.clear();
    };
  }, []);

  // Export delivery data
  const exportDeliveryData = useCallback(() => {
    const data = {
      deliveries: Array.from(deliveries.entries()),
      metrics: metrics,
      config: deliveryConfig.current,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `notification-delivery-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  }, [deliveries, metrics]);

  // Clear old delivery data
  const clearOldData = useCallback((olderThanDays: number = 30) => {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    
    setDeliveries(prev => {
      const updated = new Map();
      for (const [id, delivery] of prev) {
        if (delivery.createdAt > cutoffDate) {
          updated.set(id, delivery);
        }
      }
      return updated;
    });
  }, []);

  return {
    // State
    deliveries: Array.from(deliveries.values()),
    metrics,
    isTracking,
    
    // Actions
    trackDeliveryAttempt,
    markAsRead,
    getDeliveryStatus,
    
    // Configuration
    updateConfig: (newConfig: Partial<DeliveryConfig>) => {
      deliveryConfig.current = { ...deliveryConfig.current, ...newConfig };
    },
    
    // Utilities
    exportDeliveryData,
    clearOldData,
    
    // Controls
    startTracking: () => setIsTracking(true),
    stopTracking: () => setIsTracking(false),
    
    // Computed values
    totalDeliveries: deliveries.size,
    pendingDeliveries: Array.from(deliveries.values()).filter(d => 
      d.attempts.some(a => a.status === 'pending')
    ).length,
    failedDeliveries: Array.from(deliveries.values()).filter(d => 
      d.finalStatus === 'failed'
    ).length,
    recentDeliveries: Array.from(deliveries.values())
      .filter(d => Date.now() - d.createdAt.getTime() < 3600000) // Last hour
      .length
  };
}