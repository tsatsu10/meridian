import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from "../lib/logger";

interface NotificationBundle {
  id: string;
  type: 'grouped' | 'summary' | 'digest' | 'thread';
  category: string;
  notifications: NotificationItem[];
  title: string;
  summary: string;
  createdAt: Date;
  updatedAt: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  bundleStrategy: BundleStrategy;
  status: 'pending' | 'delivered' | 'read' | 'dismissed';
  metadata: Record<string, any>;
}

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  content: string;
  sender: string;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  metadata: Record<string, any>;
  read: boolean;
  bundled: boolean;
}

interface BundleStrategy {
  name: string;
  groupBy: ('type' | 'sender' | 'category' | 'time' | 'thread')[];
  timeWindow: number; // milliseconds
  maxItems: number;
  minItems: number;
  priority: ('low' | 'medium' | 'high' | 'urgent')[];
  conditions: BundleCondition[];
}

interface BundleCondition {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex';
  value: string;
  weight: number;
}

interface BundlingRules {
  strategies: BundleStrategy[];
  globalSettings: {
    enabled: boolean;
    maxBundleSize: number;
    quietHours: { start: string; end: string };
    urgentBypass: boolean;
    userPreferences: Record<string, any>;
  };
  categoryRules: Record<string, {
    bundleAfter: number; // minutes
    maxPerHour: number;
    digestMode: boolean;
  }>;
}

interface BundlingMetrics {
  totalNotifications: number;
  bundledNotifications: number;
  bundleCount: number;
  reductionRate: number;
  averageBundleSize: number;
  userEngagement: {
    bundleReadRate: number;
    individualReadRate: number;
    dismissalRate: number;
  };
  categoryPerformance: Record<string, {
    notifications: number;
    bundles: number;
    engagement: number;
  }>;
}

export function useSmartNotificationBundling(initialRules?: Partial<BundlingRules>) {
  const [bundles, setBundles] = useState<Map<string, NotificationBundle>>(new Map());
  const [pendingNotifications, setPendingNotifications] = useState<Map<string, NotificationItem>>(new Map());
  const [metrics, setMetrics] = useState<BundlingMetrics | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);

  const bundlingRules = useRef<BundlingRules>({
    strategies: [
      {
        name: 'message-grouping',
        groupBy: ['type', 'sender'],
        timeWindow: 300000, // 5 minutes
        maxItems: 10,
        minItems: 2,
        priority: ['low', 'medium'],
        conditions: [
          { field: 'type', operator: 'equals', value: 'message', weight: 1.0 },
          { field: 'category', operator: 'equals', value: 'chat', weight: 0.8 }
        ]
      },
      {
        name: 'task-updates',
        groupBy: ['category', 'type'],
        timeWindow: 600000, // 10 minutes
        maxItems: 15,
        minItems: 3,
        priority: ['low', 'medium', 'high'],
        conditions: [
          { field: 'category', operator: 'contains', value: 'task', weight: 1.0 },
          { field: 'type', operator: 'contains', value: 'update', weight: 0.9 }
        ]
      },
      {
        name: 'digest-mode',
        groupBy: ['category'],
        timeWindow: 3600000, // 1 hour
        maxItems: 50,
        minItems: 5,
        priority: ['low'],
        conditions: [
          { field: 'priority', operator: 'equals', value: 'low', weight: 1.0 }
        ]
      },
      {
        name: 'thread-grouping',
        groupBy: ['thread'],
        timeWindow: 1800000, // 30 minutes
        maxItems: 20,
        minItems: 2,
        priority: ['low', 'medium', 'high'],
        conditions: [
          { field: 'metadata.threadId', operator: 'regex', value: '^thread_.*', weight: 1.0 }
        ]
      }
    ],
    globalSettings: {
      enabled: true,
      maxBundleSize: 25,
      quietHours: { start: '22:00', end: '08:00' },
      urgentBypass: true,
      userPreferences: {}
    },
    categoryRules: {
      'chat': { bundleAfter: 5, maxPerHour: 12, digestMode: false },
      'task': { bundleAfter: 10, maxPerHour: 8, digestMode: true },
      'system': { bundleAfter: 15, maxPerHour: 4, digestMode: true },
      'social': { bundleAfter: 30, maxPerHour: 6, digestMode: true }
    },
    ...initialRules
  });

  const bundlingTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const processingQueue = useRef<NotificationItem[]>([]);

  // Add notification for bundling consideration
  const addNotification = useCallback((notification: NotificationItem) => {
    if (!isEnabled || !bundlingRules.current.globalSettings.enabled) {
      // Bypass bundling, send immediately
      return false;
    }

    // Check if urgent notifications should bypass bundling
    if (notification.priority === 'urgent' && bundlingRules.current.globalSettings.urgentBypass) {
      return false;
    }

    // Check quiet hours
    if (isInQuietHours()) {
      // During quiet hours, bundle more aggressively
      notification.priority = 'low';
    }

    setPendingNotifications(prev => {
      const updated = new Map(prev);
      updated.set(notification.id, notification);
      return updated;
    });

    // Add to processing queue
    processingQueue.current.push(notification);
    
    // Schedule processing
    scheduleProcessing(notification);
    
    return true; // Notification was queued for bundling
  }, [isEnabled]);

  // Check if current time is in quiet hours
  const isInQuietHours = (): boolean => {
    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    const { start, end } = bundlingRules.current.globalSettings.quietHours;
    
    const startTime = parseInt(start.replace(':', ''));
    const endTime = parseInt(end.replace(':', ''));
    
    if (startTime > endTime) {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  };

  // Schedule notification processing
  const scheduleProcessing = (notification: NotificationItem) => {
    const category = notification.category;
    const categoryRules = bundlingRules.current.categoryRules[category];
    const bundleDelay = categoryRules?.bundleAfter || 5; // Default 5 minutes

    const timerId = setTimeout(() => {
      processNotificationForBundling(notification.id);
      bundlingTimers.current.delete(notification.id);
    }, bundleDelay * 60 * 1000);

    // Clear existing timer if any
    const existingTimer = bundlingTimers.current.get(notification.id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    bundlingTimers.current.set(notification.id, timerId);
  };

  // Process notification for bundling
  const processNotificationForBundling = (notificationId: string) => {
    const notification = pendingNotifications.get(notificationId);
    if (!notification) return;

    // Find matching bundle or create new one
    const matchingBundle = findMatchingBundle(notification);
    
    if (matchingBundle) {
      addToBundle(matchingBundle.id, notification);
    } else {
      // Check if we should create a bundle
      const bundleCandidate = findBundleCandidates(notification);
      
      if (bundleCandidate.length >= 2) {
        createBundle(bundleCandidate);
      } else {
        // Send notification individually
        sendIndividualNotification(notification);
      }
    }

    // Remove from pending
    setPendingNotifications(prev => {
      const updated = new Map(prev);
      updated.delete(notificationId);
      return updated;
    });
  };

  // Find matching existing bundle
  const findMatchingBundle = (notification: NotificationItem): NotificationBundle | null => {
    const applicableStrategies = getApplicableStrategies(notification);
    
    for (const strategy of applicableStrategies) {
      for (const bundle of bundles.values()) {
        if (bundle.bundleStrategy.name === strategy.name && 
            bundle.status === 'pending' &&
            bundle.notifications.length < strategy.maxItems &&
            isWithinTimeWindow(bundle, strategy.timeWindow) &&
            matchesGroupingCriteria(notification, bundle, strategy)) {
          return bundle;
        }
      }
    }
    
    return null;
  };

  // Find bundle candidates (similar pending notifications)
  const findBundleCandidates = (notification: NotificationItem): NotificationItem[] => {
    const candidates = [notification];
    const applicableStrategies = getApplicableStrategies(notification);
    
    for (const strategy of applicableStrategies) {
      for (const pendingNotification of pendingNotifications.values()) {
        if (pendingNotification.id !== notification.id &&
            matchesStrategy(pendingNotification, strategy) &&
            matchesGroupingCriteria(pendingNotification, { notifications: candidates } as NotificationBundle, strategy)) {
          candidates.push(pendingNotification);
          
          if (candidates.length >= strategy.maxItems) break;
        }
      }
      
      if (candidates.length >= strategy.minItems) break;
    }
    
    return candidates;
  };

  // Get applicable strategies for notification
  const getApplicableStrategies = (notification: NotificationItem): BundleStrategy[] => {
    return bundlingRules.current.strategies.filter(strategy => 
      matchesStrategy(notification, strategy)
    ).sort((a, b) => {
      // Sort by specificity (more conditions = higher priority)
      return b.conditions.length - a.conditions.length;
    });
  };

  // Check if notification matches strategy
  const matchesStrategy = (notification: NotificationItem, strategy: BundleStrategy): boolean => {
    // Check priority
    if (!strategy.priority.includes(notification.priority)) {
      return false;
    }

    // Check conditions
    return strategy.conditions.every(condition => {
      const fieldValue = getFieldValue(notification, condition.field);
      return evaluateCondition(fieldValue, condition);
    });
  };

  // Check if notification matches grouping criteria
  const matchesGroupingCriteria = (
    notification: NotificationItem, 
    bundle: NotificationBundle, 
    strategy: BundleStrategy
  ): boolean => {
    if (bundle.notifications.length === 0) return true;
    
    const referenceNotification = bundle.notifications[0];
    
    return strategy.groupBy.every(groupField => {
      const value1 = getFieldValue(notification, groupField);
      const value2 = getFieldValue(referenceNotification, groupField);
      return value1 === value2;
    });
  };

  // Check if bundle is within time window
  const isWithinTimeWindow = (bundle: NotificationBundle, timeWindow: number): boolean => {
    const now = Date.now();
    const bundleAge = now - bundle.updatedAt.getTime();
    return bundleAge <= timeWindow;
  };

  // Get field value from notification
  const getFieldValue = (notification: NotificationItem, field: string): string => {
    if (field.startsWith('metadata.')) {
      const metadataField = field.substring(9);
      return notification.metadata[metadataField] || '';
    }
    
    switch (field) {
      case 'type': return notification.type;
      case 'sender': return notification.sender;
      case 'category': return notification.category;
      case 'priority': return notification.priority;
      case 'thread': return notification.metadata.threadId || '';
      case 'time': return notification.timestamp.getHours().toString();
      default: return '';
    }
  };

  // Evaluate condition
  const evaluateCondition = (value: string, condition: BundleCondition): boolean => {
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'contains':
        return value.includes(condition.value);
      case 'startsWith':
        return value.startsWith(condition.value);
      case 'endsWith':
        return value.endsWith(condition.value);
      case 'regex':
        return new RegExp(condition.value).test(value);
      default:
        return false;
    }
  };

  // Create new bundle
  const createBundle = (notifications: NotificationItem[]) => {
    const strategy = getApplicableStrategies(notifications[0])[0];
    
    const bundleId = Math.random().toString(36).substr(2, 9);
    const bundle: NotificationBundle = {
      id: bundleId,
      type: determinebundleType(notifications, strategy),
      category: notifications[0].category,
      notifications: notifications.map(n => ({ ...n, bundled: true })),
      title: generateBundleTitle(notifications, strategy),
      summary: generateBundleSummary(notifications, strategy),
      createdAt: new Date(),
      updatedAt: new Date(),
      priority: getHighestPriority(notifications),
      bundleStrategy: strategy,
      status: 'pending',
      metadata: {
        originalCount: notifications.length,
        groupingFields: strategy.groupBy
      }
    };

    setBundles(prev => {
      const updated = new Map(prev);
      updated.set(bundleId, bundle);
      return updated;
    });

    // Remove bundled notifications from pending
    notifications.forEach(notification => {
      bundlingTimers.current.delete(notification.id);
      setPendingNotifications(prev => {
        const updated = new Map(prev);
        updated.delete(notification.id);
        return updated;
      });
    });

    // Send bundle notification
    sendBundleNotification(bundle);
  };

  // Add notification to existing bundle
  const addToBundle = (bundleId: string, notification: NotificationItem) => {
    setBundles(prev => {
      const updated = new Map(prev);
      const bundle = updated.get(bundleId);
      
      if (bundle) {
        bundle.notifications.push({ ...notification, bundled: true });
        bundle.updatedAt = new Date();
        bundle.summary = generateBundleSummary(bundle.notifications, bundle.bundleStrategy);
        bundle.priority = getHighestPriority(bundle.notifications);
        bundle.metadata.originalCount = bundle.notifications.length;
        
        // Update bundle notification
        updateBundleNotification(bundle);
      }
      
      return updated;
    });

    // Remove from pending
    bundlingTimers.current.delete(notification.id);
  };

  // Send individual notification
  const sendIndividualNotification = (notification: NotificationItem) => {
    // This would integrate with actual notification sending logic
    logger.info("Sending individual notification:");
  };

  // Send bundle notification
  const sendBundleNotification = (bundle: NotificationBundle) => {
    // This would integrate with actual notification sending logic
    logger.info("Sending bundle notification:");
  };

  // Update bundle notification
  const updateBundleNotification = (bundle: NotificationBundle) => {
    // This would update the existing notification
    logger.info("Updating bundle notification:");
  };

  // Determine bundle type
  const determinebundleType = (notifications: NotificationItem[], strategy: BundleStrategy): NotificationBundle['type'] => {
    if (strategy.name.includes('digest')) return 'digest';
    if (strategy.name.includes('thread')) return 'thread';
    if (strategy.groupBy.includes('type')) return 'grouped';
    return 'summary';
  };

  // Generate bundle title
  const generateBundleTitle = (notifications: NotificationItem[], strategy: BundleStrategy): string => {
    const count = notifications.length;
    const category = notifications[0].category;
    const senders = [...new Set(notifications.map(n => n.sender))];
    
    if (strategy.groupBy.includes('sender') && senders.length === 1) {
      return `${count} messages from ${senders[0]}`;
    }
    
    if (strategy.groupBy.includes('type')) {
      const type = notifications[0].type;
      return `${count} ${type} notifications`;
    }
    
    return `${count} ${category} updates`;
  };

  // Generate bundle summary
  const generateBundleSummary = (notifications: NotificationItem[], strategy: BundleStrategy): string => {
    if (notifications.length <= 3) {
      return notifications.map(n => n.title).join(', ');
    }
    
    const firstThree = notifications.slice(0, 3).map(n => n.title);
    const remaining = notifications.length - 3;
    
    return `${firstThree.join(', ')} and ${remaining} more`;
  };

  // Get highest priority
  const getHighestPriority = (notifications: NotificationItem[]): NotificationItem['priority'] => {
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    const highest = notifications.reduce((max, notification) => {
      return priorityOrder[notification.priority] > priorityOrder[max.priority] ? notification : max;
    });
    return highest.priority;
  };

  // Mark bundle as read
  const markBundleAsRead = useCallback((bundleId: string) => {
    setBundles(prev => {
      const updated = new Map(prev);
      const bundle = updated.get(bundleId);
      if (bundle) {
        bundle.status = 'read';
        bundle.notifications.forEach(n => n.read = true);
      }
      return updated;
    });
  }, []);

  // Dismiss bundle
  const dismissBundle = useCallback((bundleId: string) => {
    setBundles(prev => {
      const updated = new Map(prev);
      const bundle = updated.get(bundleId);
      if (bundle) {
        bundle.status = 'dismissed';
      }
      return updated;
    });
  }, []);

  // Calculate metrics
  const calculateMetrics = useCallback((): BundlingMetrics => {
    const allBundles = Array.from(bundles.values());
    const allNotifications = allBundles.flatMap(b => b.notifications);
    
    const totalNotifications = allNotifications.length;
    const bundleCount = allBundles.length;
    const bundledNotifications = allNotifications.filter(n => n.bundled).length;
    
    const reductionRate = totalNotifications > 0 
      ? ((totalNotifications - bundleCount) / totalNotifications) * 100 
      : 0;
      
    const averageBundleSize = bundleCount > 0 
      ? totalNotifications / bundleCount 
      : 0;

    // Calculate engagement metrics
    const readBundles = allBundles.filter(b => b.status === 'read').length;
    const dismissedBundles = allBundles.filter(b => b.status === 'dismissed').length;
    const deliveredBundles = allBundles.filter(b => b.status === 'delivered').length;
    
    const bundleReadRate = deliveredBundles > 0 ? (readBundles / deliveredBundles) * 100 : 0;
    const dismissalRate = deliveredBundles > 0 ? (dismissedBundles / deliveredBundles) * 100 : 0;

    // Calculate category performance
    const categoryPerformance = allBundles.reduce((acc, bundle) => {
      const category = bundle.category;
      if (!acc[category]) {
        acc[category] = { notifications: 0, bundles: 0, engagement: 0 };
      }
      
      acc[category].notifications += bundle.notifications.length;
      acc[category].bundles++;
      
      if (bundle.status === 'read') {
        acc[category].engagement += 1;
      }
      
      return acc;
    }, {} as Record<string, any>);

    // Calculate engagement rates for categories
    Object.keys(categoryPerformance).forEach(category => {
      const data = categoryPerformance[category];
      data.engagement = data.bundles > 0 ? (data.engagement / data.bundles) * 100 : 0;
    });

    return {
      totalNotifications,
      bundledNotifications,
      bundleCount,
      reductionRate,
      averageBundleSize,
      userEngagement: {
        bundleReadRate,
        individualReadRate: 0, // Would need individual notification data
        dismissalRate
      },
      categoryPerformance
    };
  }, [bundles]);

  // Update metrics periodically
  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(calculateMetrics());
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [calculateMetrics]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      bundlingTimers.current.forEach(timer => clearTimeout(timer));
      bundlingTimers.current.clear();
    };
  }, []);

  return {
    // State
    bundles: Array.from(bundles.values()),
    pendingNotifications: Array.from(pendingNotifications.values()),
    metrics,
    isEnabled,
    
    // Actions
    addNotification,
    markBundleAsRead,
    dismissBundle,
    
    // Configuration
    updateRules: (newRules: Partial<BundlingRules>) => {
      bundlingRules.current = { ...bundlingRules.current, ...newRules };
    },
    
    // Controls
    enable: () => setIsEnabled(true),
    disable: () => setIsEnabled(false),
    
    // Utilities
    flushPending: () => {
      // Process all pending notifications immediately
      Array.from(pendingNotifications.keys()).forEach(processNotificationForBundling);
    },
    
    // Computed values
    activeBundles: Array.from(bundles.values()).filter(b => b.status === 'pending'),
    recentBundles: Array.from(bundles.values()).filter(b => 
      Date.now() - b.createdAt.getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
    )
  };
}