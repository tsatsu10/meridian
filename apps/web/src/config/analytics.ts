// @epic-3.1-analytics: Analytics configuration and feature flags
// @performance: Centralized analytics configuration management

import { WS_URL } from '@/constants/urls';

export interface AnalyticsConfig {
  // WebSocket Configuration
  websocket: {
    enabled: boolean;
    url: string;
    reconnectInterval: number;
    maxReconnectAttempts: number;
  };
  
  // Polling Configuration
  polling: {
    interval: number; // milliseconds
    enabled: boolean;
  };
  
  // Cache Configuration
  cache: {
    enabled: boolean;
    ttl: number; // seconds
    maxSize: number; // MB
  };
  
  // Real-time Features
  realTime: {
    enabled: boolean;
    updateInterval: number; // milliseconds
    batchSize: number;
  };
  
  // Data Retention
  retention: {
    period: number; // days
    maxDataPoints: number;
  };
  
  // Feature Flags
  features: {
    enableSentiment: boolean;
    enablePredictions: boolean;
    enableForecasting: boolean;
    enableBenchmarks: boolean;
    enableUnifiedAnalytics: boolean;
  };
}

const defaultConfig: AnalyticsConfig = {
  websocket: {
    enabled: false, // Disabled until WebSocket server is implemented
    url: import.meta.env.MODE === 'development' 
      ? `${WS_URL}/api/analytics`
      : 'wss://api.meridian.com/analytics',
    reconnectInterval: 5000,
    maxReconnectAttempts: 3,
  },
  
  polling: {
    interval: 120000, // 2 minutes
    enabled: true,
  },
  
  cache: {
    enabled: true,
    ttl: 300, // 5 minutes
    maxSize: 100, // 100MB
  },
  
  realTime: {
    enabled: true,
    updateInterval: 120000, // 2 minutes
    batchSize: 1000,
  },
  
  retention: {
    period: 90, // 90 days
    maxDataPoints: 10000,
  },
  
  features: {
    enableSentiment: false,
    enablePredictions: false,
    enableForecasting: true,
    enableBenchmarks: true,
    enableUnifiedAnalytics: true,
  },
};

// Environment-specific overrides
const getAnalyticsConfig = (): AnalyticsConfig => {
  const config = { ...defaultConfig };
  
  // Development environment adjustments
  if (import.meta.env.MODE === 'development') {
    config.polling.interval = 60000; // 1 minute in development
    config.realTime.updateInterval = 60000;
    config.cache.ttl = 60; // 1 minute cache in development
  }
  
  // Production environment adjustments
  if (import.meta.env.MODE === 'production') {
    config.polling.interval = 300000; // 5 minutes in production
    config.realTime.updateInterval = 300000;
    config.cache.ttl = 600; // 10 minutes cache in production
  }
  
  // Feature flag overrides from environment variables
  if (import.meta.env.VITE_ANALYTICS_WEBSOCKET_ENABLED === 'true') {
    config.websocket.enabled = true;
  }
  
  if (import.meta.env.VITE_ANALYTICS_SENTIMENT_ENABLED === 'true') {
    config.features.enableSentiment = true;
  }
  
  if (import.meta.env.VITE_ANALYTICS_PREDICTIONS_ENABLED === 'true') {
    config.features.enablePredictions = true;
  }
  
  return config;
};

export { getAnalyticsConfig, defaultConfig };
export default getAnalyticsConfig;