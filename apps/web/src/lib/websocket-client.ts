/**
 * Smart WebSocket Client - Automatically switches between mock and live WebSocket
 */

import { io, type Socket } from 'socket.io-client'
import { liveWebSocketManager, useLiveWebSocket, type WebSocketConfig } from './live-websocket-manager'
import { shouldUseMocks, getAppConfig } from '@/config/app-mode'

/**
 * Determines if we're in a test environment
 */
function isTestEnvironment(): boolean {
  return typeof window !== 'undefined' && 
         (window as any).__vitest__ || 
         process.env.NODE_ENV === 'test' ||
         typeof global !== 'undefined' && 
         (global as any).__vitest__
}

class SmartWebSocketClient {
  private useLive: boolean
  private mockSocket: any = null
  private liveSocket: Socket | null = null
  private config: WebSocketConfig = {}

  constructor() {
    this.useLive = !isTestEnvironment() && !shouldUseMocks()
    
    const appConfig = getAppConfig(),
  }
}