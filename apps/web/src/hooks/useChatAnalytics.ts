import { useState, useEffect, useCallback, useRef } from 'react';
import { getAnalyticsConfig } from '@/config/analytics';
import { fetchApi } from '@/lib/fetch';
import useWorkspaceStore from '@/store/workspace';
import { logger } from "../lib/logger";

interface MessageMetrics {
  id: string;
  channelId: string;
  userId: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file' | 'video' | 'audio' | 'emoji' | 'reaction';
  length: number;
  hasAttachment: boolean;
  hasEmoji: boolean;
  hasMention: boolean;
  isReply: boolean;
  isEdit: boolean;
  isDelete: boolean;
  readBy: string[];
  reactedBy: string[];
  threadId?: string;
  sentimentScore?: number; // -1 to 1
  language?: string;
  processingTime: number; // milliseconds
}

interface UserEngagementMetrics {
  userId: string;
  username: string;
  timeSpent: number; // milliseconds
  messagesCount: number;
  reactionsGiven: number;
  reactionsReceived: number;
  mentionsGiven: number;
  mentionsReceived: number;
  threadsStarted: number;
  threadsParticipated: number;
  filesShared: number;
  lastActivity: Date;
  peakHours: number[]; // Hours of day (0-23)
  averageResponseTime: number; // milliseconds
  readRate: number; // Percentage of messages read
  activeChannels: string[];
  favoriteEmojis: { emoji: string; count: number }[];
  engagementScore: number; // 0-100
  presenceHistory: { timestamp: Date; status: 'online' | 'away' | 'offline' }[];
}

interface ChannelAnalytics {
  channelId: string;
  channelName: string;
  channelType: 'public' | 'private' | 'direct' | 'group';
  memberCount: number;
  activeMembers: number;
  totalMessages: number;
  messagesPerDay: number;
  averageResponseTime: number;
  peakHours: number[];
  topContributors: { userId: string; messageCount: number; engagementScore: number }[];
  messageTypes: Record<string, number>;
  sentimentTrend: { date: Date; sentiment: number }[];
  popularEmojis: { emoji: string; count: number }[];
  threadActivity: number;
  fileShareCount: number;
  retentionRate: number; // Percentage of members who are active
  growthRate: number; // Member growth percentage
  createdAt: Date;
  lastActivity: Date;
}

interface TimeSeriesData {
  timestamp: Date;
  value: number;
  label?: string;
  metadata?: Record<string, any>;
}

interface AnalyticsAggregation {
  total: number;
  average: number;
  median: number;
  min: number;
  max: number;
  percentiles: { p25: number; p50: number; p75: number; p90: number; p95: number };
  trend: 'increasing' | 'decreasing' | 'stable';
  trendPercentage: number;
}

interface ChatAnalyticsData {
  overview: {
    totalMessages: number;
    totalUsers: number;
    totalChannels: number;
    activeUsers: number;
    messageGrowth: number;
    userGrowth: number;
    averageEngagement: number;
    systemHealth: number;
  };
  messageMetrics: {
    hourly: TimeSeriesData[];
    daily: TimeSeriesData[];
    weekly: TimeSeriesData[];
    monthly: TimeSeriesData[];
    byType: Record<string, number>;
    byChannel: Record<string, number>;
    aggregations: AnalyticsAggregation;
  };
  userEngagement: {
    users: UserEngagementMetrics[];
    aggregations: AnalyticsAggregation;
    retentionCohorts: { cohort: string; retention: number[] }[];
    engagementDistribution: { range: string; count: number }[];
  };
  channelAnalytics: {
    channels: ChannelAnalytics[];
    aggregations: AnalyticsAggregation;
    popularChannels: { channelId: string; score: number }[];
    channelGrowth: TimeSeriesData[];
  };
  realTimeMetrics: {
    activeUsers: number;
    messagesPerMinute: number;
    averageResponseTime: number;
    systemLatency: number;
    errorRate: number;
    lastUpdated: Date;
  };
}

interface AnalyticsConfig {
  updateInterval: number; // milliseconds
  retentionPeriod: number; // days
  aggregationWindows: ('1h' | '1d' | '1w' | '1m')[];
  enableRealTime: boolean;
  enableSentiment: boolean;
  enablePredictions: boolean;
  batchSize: number;
  maxDataPoints: number;
}

export function useChatAnalytics(config?: Partial<AnalyticsConfig>) {
  const [analyticsData, setAnalyticsData] = useState<ChatAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);

  const globalConfig = getAnalyticsConfig();
  const analyticsConfig = useRef<AnalyticsConfig>({
    updateInterval: globalConfig.realTime.updateInterval,
    retentionPeriod: globalConfig.retention.period,
    aggregationWindows: ['1h', '1d', '1w', '1m'],
    enableRealTime: globalConfig.realTime.enabled,
    enableSentiment: globalConfig.features.enableSentiment,
    enablePredictions: globalConfig.features.enablePredictions,
    batchSize: globalConfig.realTime.batchSize,
    maxDataPoints: globalConfig.retention.maxDataPoints,
    ...config
  });

  const messageBuffer = useRef<MessageMetrics[]>([]);
  const realTimeInterval = useRef<NodeJS.Timeout>();
  const periodicRefreshInterval = useRef<NodeJS.Timeout>(); // CRITICAL: Store for cleanup
  const websocketConnection = useRef<WebSocket | null>(null);

  // Initialize analytics
  useEffect(() => {
    initializeAnalytics();
    return () => cleanup();
  }, []);

  const initializeAnalytics = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load initial analytics data
      await loadAnalyticsData();
      
      // Setup real-time updates if enabled
      if (analyticsConfig.current.enableRealTime) {
        setupRealTimeUpdates();
      }

      // Setup periodic data refresh
      setupPeriodicRefresh();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAnalyticsData = async () => {
    try {
      // Debug environment variables
      logger.debug("🔍 Environment check:");

      const workspaceId = useWorkspaceStore.getState().workspace?.id;
      logger.debug("🔍 Loading analytics data for workspace:");

      if (!workspaceId) {
        console.warn('⚠️ No workspace ID available for analytics');
        // For now, use a default workspace ID for testing}

      const testWorkspaceId = workspaceId || 'test-workspace';// Direct fetch to bypass any issues with fetchApi
      const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3009'}/api/analytics/chat?workspaceId=${testWorkspaceId}&timeRange=30d&granularity=day&includeRealTime=true`;
      logger.info("🌐 Making direct fetch to:");

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      logger.info("📡 Analytics API response status:");
      logger.info("📡 Analytics API response ok:");

      if (!response.ok) {
        throw new Error(`Failed to fetch chat analytics: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      logger.info("✅ Analytics data loaded successfully:");
      setAnalyticsData(data);
    } catch (error) {
      console.error('❌ Failed to load chat analytics data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load analytics data');
      setAnalyticsData(null);
    }
  };

  const setupRealTimeUpdates = () => {
    // Setup WebSocket connection for real-time updates
    try {
      // Check if WebSocket is enabled in configuration
      if (!globalConfig.websocket.enabled) {
        logger.info("📊 WebSocket analytics disabled in config, using polling fallback");
        setupPollingFallback();
        return;
      }
      
      const wsUrl = globalConfig.websocket.url;
      logger.info("📊 Attempting WebSocket connection to:");
        
      // Commented out WebSocket code until server is implemented
      /*
      websocketConnection.current = new WebSocket(wsUrl);
      
      websocketConnection.current.onopen = () => {
        logger.info("📊 WebSocket analytics connected");
      };
      
      websocketConnection.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleRealTimeUpdate(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      websocketConnection.current.onerror = (error) => {
        console.warn('📊 WebSocket analytics connection failed, falling back to polling:', error);
        setupPollingFallback();
      };

      websocketConnection.current.onclose = () => {
        logger.info("📊 WebSocket analytics connection closed");
        setupPollingFallback();
      };
      */

    } catch (error) {
      console.warn('📊 Failed to setup WebSocket analytics, using polling:', error);
      setupPollingFallback();
    }
  };

  const setupPollingFallback = () => {
    if (!globalConfig.polling.enabled) {
      logger.info("📊 Polling disabled in config, analytics will be static");
      return;
    }
    
    const pollingInterval = globalConfig.polling.interval;
    
    logger.info("📊 Setting up polling fallback with ${pollingInterval / 1000}s interval");
    
    realTimeInterval.current = setInterval(() => {
      loadRealTimeMetrics();
      // Also refresh the full analytics data less frequently
      if (Math.random() < 0.1) { // 10% chance every polling cycle
        loadAnalyticsData();
      }
    }, pollingInterval);
    
    // Load initial real-time metrics immediately
    loadRealTimeMetrics();
  };

  const setupPeriodicRefresh = () => {
    // CRITICAL: Clear any existing interval first
    if (periodicRefreshInterval.current) {
      clearInterval(periodicRefreshInterval.current);
    }

    // Refresh full analytics data every 5 minutes
    periodicRefreshInterval.current = setInterval(() => {
      loadAnalyticsData();
    }, 300000);
  };

  const handleRealTimeUpdate = (data: any) => {
    if (data.type === 'message') {
      handleNewMessage(data.payload);
    } else if (data.type === 'user_activity') {
      handleUserActivity(data.payload);
    } else if (data.type === 'metrics_update') {
      updateRealTimeMetrics(data.payload);
    }
  };

  const handleNewMessage = (messageData: any) => {
    const metrics: MessageMetrics = {
      id: messageData.id,
      channelId: messageData.channelId,
      userId: messageData.userId,
      timestamp: new Date(messageData.timestamp),
      type: messageData.type || 'text',
      length: messageData.content?.length || 0,
      hasAttachment: !!messageData.attachments?.length,
      hasEmoji: /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(messageData.content || ''),
      hasMention: /@\w+/.test(messageData.content || ''),
      isReply: !!messageData.replyTo,
      isEdit: !!messageData.editedAt,
      isDelete: !!messageData.deletedAt,
      readBy: messageData.readBy || [],
      reactedBy: messageData.reactions?.map((r: any) => r.userId) || [],
      threadId: messageData.threadId,
      sentimentScore: messageData.sentimentScore,
      language: messageData.language,
      processingTime: messageData.processingTime || 0
    };

    messageBuffer.current.push(metrics);
    
    // Process buffer when it reaches batch size
    if (messageBuffer.current.length >= analyticsConfig.current.batchSize) {
      processBatchedMessages();
    }

    // Update real-time metrics
    updateMessageMetrics(metrics);
  };

  const processBatchedMessages = async () => {
    const messages = messageBuffer.current.splice(0);
    
    try {
      // Send to analytics service for processing
      await processMessages(messages);
    } catch (error) {
      console.error('Failed to process message batch:', error);
      // Re-add to buffer for retry
      messageBuffer.current.unshift(...messages);
    }
  };

  const processMessages = async (messages: MessageMetrics[]) => {
    // In a real implementation, this would send to analytics API
    logger.info("Processing ${messages.length} messages for analytics");
    
    // Update local analytics data
    setAnalyticsData(prev => {
      if (!prev) return prev;
      
      const updated = { ...prev };
      
      // Update overview metrics
      updated.overview.totalMessages += messages.length;
      
      // Update message metrics
      messages.forEach(message => {
        const hour = message.timestamp.getHours();
        const hourlyData = updated.messageMetrics.hourly.find(d => 
          d.timestamp.getHours() === hour && 
          d.timestamp.toDateString() === message.timestamp.toDateString()
        );
        
        if (hourlyData) {
          hourlyData.value += 1;
        } else {
          updated.messageMetrics.hourly.push({
            timestamp: new Date(message.timestamp.getFullYear(), message.timestamp.getMonth(), 
                              message.timestamp.getDate(), hour),
            value: 1
          });
        }
        
        // Update by type
        updated.messageMetrics.byType[message.type] = 
          (updated.messageMetrics.byType[message.type] || 0) + 1;
        
        // Update by channel
        updated.messageMetrics.byChannel[message.channelId] = 
          (updated.messageMetrics.byChannel[message.channelId] || 0) + 1;
      });
      
      return updated;
    });
  };

  const updateMessageMetrics = (message: MessageMetrics) => {
    setAnalyticsData(prev => {
      if (!prev) return prev;
      
      const updated = { ...prev };
      updated.realTimeMetrics.messagesPerMinute += 1;
      updated.realTimeMetrics.lastUpdated = new Date();
      
      return updated;
    });
  };

  const handleUserActivity = (activityData: any) => {
    setAnalyticsData(prev => {
      if (!prev) return prev;
      
      const updated = { ...prev };
      
      // Update active users count
      const activeUserIds = new Set(prev.userEngagement.users
        .filter(u => Date.now() - u.lastActivity.getTime() < 300000) // 5 minutes
        .map(u => u.userId)
      );
      
      activeUserIds.add(activityData.userId);
      updated.realTimeMetrics.activeUsers = activeUserIds.size;
      updated.realTimeMetrics.lastUpdated = new Date();
      
      return updated;
    });
  };

  const updateRealTimeMetrics = (metricsData: any) => {
    setAnalyticsData(prev => {
      if (!prev) return prev;
      
      return {
        ...prev,
        realTimeMetrics: {
          ...prev.realTimeMetrics,
          ...metricsData,
          lastUpdated: new Date()
        }
      };
    });
  };

  const loadRealTimeMetrics = async () => {
    try {
      const workspaceId = useWorkspaceStore.getState().workspace?.id;
      logger.debug("🔍 Loading real-time metrics for workspace:");

      if (!workspaceId) {
        console.warn('⚠️ No workspace ID available for real-time metrics');}

      const testWorkspaceId = workspaceId || 'test-workspace';// Direct fetch to bypass any issues with fetchApi
      const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3009'}/api/analytics/chat/realtime?workspaceId=${testWorkspaceId}`;
      logger.info("🌐 Making direct fetch to real-time:");

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      logger.info("📡 Real-time API response status:");
      logger.info("📡 Real-time API response ok:");

      if (!response.ok) {
        throw new Error(`Failed to fetch real-time metrics: ${response.status} ${response.statusText}`);
      }

      const realTimeData = await response.json();
      logger.info("✅ Real-time metrics loaded successfully:");
      updateRealTimeMetrics(realTimeData);
    } catch (error) {
      console.error('❌ Failed to load real-time metrics:', error);
    }
  };

  // Analytics query functions
  const getMessageVolumeByPeriod = useCallback((
    period: '1h' | '1d' | '1w' | '1m',
    channelId?: string,
    userId?: string
  ): TimeSeriesData[] => {
    if (!analyticsData) return [];
    
    let data = analyticsData.messageMetrics[
      period === '1h' ? 'hourly' :
      period === '1d' ? 'daily' :
      period === '1w' ? 'weekly' : 'monthly'
    ];
    
    // Filter by channel or user if specified
    if (channelId) {
      data = data.filter(d => d.metadata?.channelId === channelId);
    }
    
    if (userId) {
      data = data.filter(d => d.metadata?.userId === userId);
    }
    
    return data;
  }, [analyticsData]);

  const getUserEngagementMetrics = useCallback((userId?: string): UserEngagementMetrics[] => {
    if (!analyticsData) return [];
    
    if (userId) {
      const user = analyticsData.userEngagement.users.find(u => u.userId === userId);
      return user ? [user] : [];
    }
    
    return analyticsData.userEngagement.users;
  }, [analyticsData]);

  const getChannelAnalytics = useCallback((channelId?: string): ChannelAnalytics[] => {
    if (!analyticsData) return [];
    
    if (channelId) {
      const channel = analyticsData.channelAnalytics.channels.find(c => c.channelId === channelId);
      return channel ? [channel] : [];
    }
    
    return analyticsData.channelAnalytics.channels;
  }, [analyticsData]);

  const getTopChannelsByActivity = useCallback((limit: number = 10): ChannelAnalytics[] => {
    if (!analyticsData) return [];
    
    return analyticsData.channelAnalytics.channels
      .sort((a, b) => b.messagesPerDay - a.messagesPerDay)
      .slice(0, limit);
  }, [analyticsData]);

  const getTopUsersByEngagement = useCallback((limit: number = 10): UserEngagementMetrics[] => {
    if (!analyticsData) return [];
    
    return analyticsData.userEngagement.users
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, limit);
  }, [analyticsData]);

  const getPeakActivityHours = useCallback((): { hour: number; activity: number }[] => {
    if (!analyticsData) return [];
    
    const hourlyActivity = Array(24).fill(0);
    
    analyticsData.messageMetrics.hourly.forEach(data => {
      const hour = data.timestamp.getHours();
      hourlyActivity[hour] += data.value;
    });
    
    return hourlyActivity.map((activity, hour) => ({ hour, activity }))
      .sort((a, b) => b.activity - a.activity);
  }, [analyticsData]);

  const calculateGrowthRate = useCallback((
    metric: 'messages' | 'users' | 'channels',
    period: 'daily' | 'weekly' | 'monthly'
  ): number => {
    if (!analyticsData) return 0;
    
    // Simplified growth calculation
    const currentValue = analyticsData.overview.totalMessages; // Placeholder
    const previousValue = currentValue * 0.9; // Mock previous value
    
    return ((currentValue - previousValue) / previousValue) * 100;
  }, [analyticsData]);

  // Export functions
  const exportAnalyticsData = useCallback(async (
    format: 'json' | 'csv' | 'xlsx',
    options?: {
      dateRange?: { start: Date; end: Date };
      metrics?: string[];
      includeRawData?: boolean;
    }
  ) => {
    try {
      const workspaceId = useWorkspaceStore.getState().workspace?.id;
      if (!workspaceId) {
        console.warn('No workspace ID available for export');
        return;
      }

      const params: Record<string, string> = {
        workspaceId,
        format,
        timeRange: '30d',
        granularity: 'day'
      };

      if (options?.dateRange) {
        params.startDate = options.dateRange.start.toISOString();
        params.endDate = options.dateRange.end.toISOString();
      }

      const response = await fetchApi('/analytics/chat/export', { params });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.status}`);
      }

      const filename = `meridian-chat-analytics-${Date.now()}.${format}`;

      if (format === 'csv') {
        const csvData = await response.text();
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const exportData = await response.json();
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export analytics:', error);
      throw error;
    }
  }, [analyticsData]);

  const cleanup = () => {
    if (realTimeInterval.current) {
      clearInterval(realTimeInterval.current);
    }

    // CRITICAL: Clear periodic refresh interval
    if (periodicRefreshInterval.current) {
      clearInterval(periodicRefreshInterval.current);
    }

    if (websocketConnection.current) {
      websocketConnection.current.close();
    }

    // Process remaining messages in buffer
    if (messageBuffer.current.length > 0) {
      processBatchedMessages();
    }
  };


  return {
    // Data
    analyticsData,
    isLoading,
    error,
    isRealTimeEnabled,
    
    // Query functions
    getMessageVolumeByPeriod,
    getUserEngagementMetrics,
    getChannelAnalytics,
    getTopChannelsByActivity,
    getTopUsersByEngagement,
    getPeakActivityHours,
    calculateGrowthRate,
    
    // Controls
    setIsRealTimeEnabled,
    refreshData: loadAnalyticsData,
    exportAnalyticsData,
    
    // Configuration
    updateConfig: (newConfig: Partial<AnalyticsConfig>) => {
      analyticsConfig.current = { ...analyticsConfig.current, ...newConfig };
    },
    
    // Computed values
    hasData: !!analyticsData,
    lastUpdated: analyticsData?.realTimeMetrics.lastUpdated,
    dataQuality: analyticsData ? 'high' : 'none'
  };
}