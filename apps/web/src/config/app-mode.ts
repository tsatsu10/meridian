/**
 * Application Mode Configuration
 * Controls whether the app runs with mocks (testing) or live backend (production)
 */

import { API_URL, WS_URL } from '@/constants/urls';
import { logger } from "@/lib/logger";

export type AppMode = 'development' | 'production' | 'testing'

export interface AppConfig {
  mode: AppMode
  apiUrl: string
  wsUrl: string
  useMocks: boolean
  debugMode: boolean
}

/**
 * Get current application configuration based on environment
 */
export function getAppConfig(): AppConfig {
  const mode = import.meta.env.NODE_ENV as AppMode || 'development'
  const useMocksEnv = import.meta.env.VITE_USE_MOCK_API
  const debugMode = import.meta.env.VITE_DEBUG_MODE === 'true'
  
  // Force live backend when explicitly disabled
  const useMocks = useMocksEnv === 'true'
  
  const config: AppConfig = {
    mode,
    apiUrl: API_URL,
    wsUrl: WS_URL,
    useMocks,
    debugMode
  }

  if (debugMode) {
    logger.debug('🔧 App Config:', config)
  }

  return config
}

/**
 * Check if the app should use mocks
 */
export function shouldUseMocks(): boolean {
  return getAppConfig().useMocks
}

/**
 * Check if the app is in development mode
 */
export function isDevelopment(): boolean {
  return getAppConfig().mode === 'development'
}

/**
 * Check if the app is in production mode  
 */
export function isProduction(): boolean {
  return getAppConfig().mode === 'production'
}

/**
 * Check if debug mode is enabled
 */
export function isDebugMode(): boolean {
  return getAppConfig().debugMode
}