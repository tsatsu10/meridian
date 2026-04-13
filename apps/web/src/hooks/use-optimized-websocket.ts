// Optimized WebSocket Hook for High-Performance Message Handling
import { useCallback, useRef, useEffect, useState } from 'react'
import { useUnifiedWebSocketSingleton } from './useUnifiedWebSocketSingleton'
import { WebSocketMessage } from './useStableWebSocket'

interface OptimizedWebSocketOptions {
  // Message batching
  batchMessages?: boolean
  batchDelay?: number // ms to wait before processing batch
  maxBatchSize?: number
  
  // Connection optimization
  enableCompression?: boolean
  enableHeartbeat?: boolean
  heartbeatInterval?: number
  
  // Message filtering
  messageFilters?: ((message: WebSocketMessage) => boolean)[]
  
  // Performance monitoring
  enablePerformanceMonitoring?: boolean
  performanceMetrics?: (metrics: PerformanceMetrics) => void
  onMessageSent?: (messageId: string) => void
  onMessageFailed?: (messageId: string, error: Error) => void
}

interface PerformanceMetrics {
  messagesPerSecond: number
  averageProcessingTime: number
  queueSize: number
  connectionLatency: number
  errorRate: number
}

interface MessageBatch {
  messages: WebSocketMessage[]
  timestamp: number
  channelId: string
}

interface OptimizedWebSocketReturn {
  // All original WebSocket functionality
  connectionState: any
  sendMessage: (channelId: string, content: string) => void
  joinChannel: (channelId: string) => void
  leaveChannel: (channelId: string) => void
  startTyping: (channelId: string) => void
  stopTyping: (channelId: string) => void
  
  // Optimized features
  performanceMetrics: PerformanceMetrics
  messageQueue: MessageBatch[]
  
  // Control methods
  flushMessageQueue: () => void
  pauseProcessing: () => void
  resumeProcessing: () => void
  clearMetrics: () => void
}

const defaultOptions: Required<OptimizedWebSocketOptions> = {
  batchMessages: true,
  batchDelay: 16, // ~60fps
  maxBatchSize: 10,
  enableCompression: true,
  enableHeartbeat: true,
  heartbeatInterval: 30000, // 30 seconds
  messageFilters: [],
  enablePerformanceMonitoring: true,
  performanceMetrics: () => {},
  onMessageSent: () => {},
  onMessageFailed: () => {},
}

interface OptimizedWebSocketParams {
  userEmail: string;
  workspaceId: string;
  onMessage?: (message: WebSocketMessage) => void;
  onError?: (error: string) => void;
  onTyping?: (userEmail: string, channelId: string) => void;
  onUserJoined?: (userEmail: string, channelId: string) => void;
  onUserLeft?: (userEmail: string, channelId: string) => void;
  onMessageSent?: (messageId: string) => void;
  onMessageFailed?: (messageId: string, error: Error) => void;
  autoConnect?: boolean;
}

export function useOptimizedWebSocket(
  originalOptions: OptimizedWebSocketParams,
  optimizedOptions: OptimizedWebSocketOptions = {}
): OptimizedWebSocketReturn {
  const opts = { ...defaultOptions, ...optimizedOptions }
  
  // Performance tracking
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    messagesPerSecond: 0,
    averageProcessingTime: 0,
    queueSize: 0,
    connectionLatency: 0,
    errorRate: 0,
  })
  
  // Message batching
  const messageQueue = useRef<MessageBatch[]>([])
  const batchTimer = useRef<NodeJS.Timeout | null>(null)
  const [currentQueue, setCurrentQueue] = useState<MessageBatch[]>([])
  const [isPaused, setIsPaused] = useState(false)
  
  // Performance monitoring
  const metricsRef = useRef({
    messageCount: 0,
    totalProcessingTime: 0,
    errorCount: 0,
    lastMetricsUpdate: Date.now(),
    processingTimes: [] as number[],
  })
  
  // Store original callbacks in refs to avoid dependency issues
  const originalOnMessageRef = useRef(originalOptions.onMessage)
  const originalOnErrorRef = useRef(originalOptions.onError)
  const optsRef = useRef(opts)
  
  // Update refs when options change
  useEffect(() => {
    originalOnMessageRef.current = originalOptions.onMessage
    originalOnErrorRef.current = originalOptions.onError
    optsRef.current = opts
  }, [originalOptions.onMessage, originalOptions.onError, opts])
  
  // Optimized message handler with batching
  const handleOptimizedMessage = useCallback((message: WebSocketMessage) => {
    if (isPaused) return
    
    const startTime = performance.now()
    
    // Apply filters
    for (const filter of optsRef.current.messageFilters) {
      if (!filter(message)) {
        return // Message filtered out
      }
    }
    
    if (optsRef.current.batchMessages) {
      // Add to batch queue
      const channelId = message.channelId || 'default'
      let batch = messageQueue.current.find(b => b.channelId === channelId)
      
      if (!batch) {
        batch = {
          messages: [],
          timestamp: Date.now(),
          channelId,
        }
        messageQueue.current.push(batch)
      }
      
      batch.messages.push(message)
      
      // Update queue state for UI
      setCurrentQueue([...messageQueue.current])
      
      // Check if batch is full or timer should start
      if (batch.messages.length >= optsRef.current.maxBatchSize) {
        flushBatch(batch)
      } else if (!batchTimer.current) {
        batchTimer.current = setTimeout(() => {
          flushAllBatches()
        }, optsRef.current.batchDelay)
      }
    } else {
      // Process immediately
      processMessage(message, startTime)
    }
  }, [isPaused])
  
  // Process individual message
  const processMessage = useCallback((message: WebSocketMessage, startTime: number) => {
    try {
      originalOnMessageRef.current?.(message)
      
      // Track performance
      if (optsRef.current.enablePerformanceMonitoring) {
        const processingTime = performance.now() - startTime
        metricsRef.current.messageCount++
        metricsRef.current.totalProcessingTime += processingTime
        metricsRef.current.processingTimes.push(processingTime)
        
        // Keep only last 100 processing times for average calculation
        if (metricsRef.current.processingTimes.length > 100) {
          metricsRef.current.processingTimes.shift()
        }
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error)
      metricsRef.current.errorCount++
      originalOnErrorRef.current?.(error as Error)
    }
  }, [])
  
  // Flush a specific batch
  const flushBatch = useCallback((batch: MessageBatch) => {
    const startTime = performance.now()
    
    // Process all messages in the batch
    batch.messages.forEach(message => processMessage(message, startTime))
    
    // Remove batch from queue
    messageQueue.current = messageQueue.current.filter(b => b !== batch)
    setCurrentQueue([...messageQueue.current])
  }, [])
  
  // Flush all batches
  const flushAllBatches = useCallback(() => {
    if (batchTimer.current) {
      clearTimeout(batchTimer.current)
      batchTimer.current = null
    }
    
    const batches = [...messageQueue.current]
    messageQueue.current = []
    setCurrentQueue([])
    
    batches.forEach(batch => flushBatch(batch))
  }, [])
  
  // Optimized error handler
  const handleOptimizedError = useCallback((error: Error) => {
    metricsRef.current.errorCount++
    originalOnErrorRef.current?.(error)
  }, [])
  
  // Create optimized WebSocket instance using singleton
  const websocket = useUnifiedWebSocketSingleton({
    userEmail: originalOptions.userEmail,
    workspaceId: originalOptions.workspaceId,
    enabled: !!originalOptions.userEmail && !!originalOptions.workspaceId,
    onMessage: handleOptimizedMessage,
    onError: handleOptimizedError,
    onTypingStart: originalOptions.onTyping,
    onUserJoined: originalOptions.onUserJoined ? (data) => originalOptions.onUserJoined?.(data.userEmail, data.channelId) : undefined,
    onUserLeft: originalOptions.onUserLeft ? (data) => originalOptions.onUserLeft?.(data.userEmail, data.channelId) : undefined,
  })
  
  // Performance metrics calculation
  useEffect(() => {
    if (!optsRef.current.enablePerformanceMonitoring) return
    
    const interval = setInterval(() => {
      const now = Date.now()
      const timeDiff = (now - metricsRef.current.lastMetricsUpdate) / 1000 // seconds
      
      const messagesPerSecond = metricsRef.current.messageCount / timeDiff
      const averageProcessingTime = metricsRef.current.processingTimes.length > 0
        ? metricsRef.current.processingTimes.reduce((a, b) => a + b, 0) / metricsRef.current.processingTimes.length
        : 0
      const queueSize = messageQueue.current.reduce((sum, batch) => sum + batch.messages.length, 0)
      const errorRate = metricsRef.current.errorCount / Math.max(metricsRef.current.messageCount, 1)
      
      const metrics: PerformanceMetrics = {
        messagesPerSecond: Number(messagesPerSecond.toFixed(2)),
        averageProcessingTime: Number(averageProcessingTime.toFixed(2)),
        queueSize,
        connectionLatency: 0, // TODO: Implement actual ping measurement
        errorRate: Number((errorRate * 100).toFixed(2)), // percentage
      }
      
      setPerformanceMetrics(metrics)
      optsRef.current.performanceMetrics(metrics)
      
      // Reset counters
      metricsRef.current.messageCount = 0
      metricsRef.current.totalProcessingTime = 0
      metricsRef.current.errorCount = 0
      metricsRef.current.lastMetricsUpdate = now
    }, 1000) // Update every second
    
    return () => clearInterval(interval)
  }, [websocket.connectionState.isConnected])
  
  // Heartbeat for connection health
  useEffect(() => {
    if (!optsRef.current.enableHeartbeat || !websocket.connectionState.isConnected) return
    
    const heartbeat = setInterval(() => {
      if (websocket.connectionState.isConnected) {
        // Send ping message
        websocket.sendMessage('system', JSON.stringify({ type: 'ping', timestamp: Date.now() }))
      }
    }, optsRef.current.heartbeatInterval)
    
    return () => clearInterval(heartbeat)
  }, [websocket.connectionState.isConnected, websocket.sendMessage])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (batchTimer.current) {
        clearTimeout(batchTimer.current)
      }
      flushAllBatches()
    }
  }, [flushAllBatches])
  
  // Control methods
  const flushMessageQueue = useCallback(() => {
    flushAllBatches()
  }, [flushAllBatches])
  
  const pauseProcessing = useCallback(() => {
    setIsPaused(true)
  }, [])
  
  const resumeProcessing = useCallback(() => {
    setIsPaused(false)
    flushAllBatches()
  }, [flushAllBatches])
  
  const clearMetrics = useCallback(() => {
    metricsRef.current = {
      messageCount: 0,
      totalProcessingTime: 0,
      errorCount: 0,
      lastMetricsUpdate: Date.now(),
      processingTimes: [],
    }
    setPerformanceMetrics({
      messagesPerSecond: 0,
      averageProcessingTime: 0,
      queueSize: 0,
      connectionLatency: 0,
      errorRate: 0,
    })
  }, [])
  
  return {
    // Original WebSocket functionality
    connectionState: websocket.connectionState,
    sendMessage: websocket.sendMessage,
    joinChannel: websocket.joinChannel,
    leaveChannel: websocket.leaveChannel,
    startTyping: websocket.startTyping,
    stopTyping: websocket.stopTyping,
    
    // Optimized features
    performanceMetrics,
    messageQueue: currentQueue,
    
    // Control methods
    flushMessageQueue,
    pauseProcessing,
    resumeProcessing,
    clearMetrics,
  }
}

// Message filter utilities
export const messageFilters = {
  // Filter out duplicate messages
  deduplicate: (seenIds: Set<string>) => (message: WebSocketMessage) => {
    if (seenIds.has(message.data?.id || message.data?.content || '')) {
      return false
    }
    seenIds.add(message.data?.id || message.data?.content || '')
    return true
  },
  
  // Filter messages by channel
  byChannel: (allowedChannels: string[]) => (message: WebSocketMessage) => {
    return allowedChannels.includes(message.channelId || '')
  },
  
  // Filter out system messages
  excludeSystem: () => (message: WebSocketMessage) => {
    return message.type !== 'system' && !message.data?.content?.startsWith('System:')
  },
  
  // Filter by message content
  byContent: (pattern: RegExp) => (message: WebSocketMessage) => {
    return pattern.test(message.data?.content || '')
  },
  
  // Rate limiting filter
  rateLimit: (maxMessagesPerSecond: number) => {
    let messageCount = 0
    let lastReset = Date.now()
    
    return (message: WebSocketMessage) => {
      const now = Date.now()
      if (now - lastReset > 1000) {
        messageCount = 0
        lastReset = now
      }
      
      if (messageCount >= maxMessagesPerSecond) {
        return false
      }
      
      messageCount++
      return true
    }
  },
}

export type { OptimizedWebSocketOptions, PerformanceMetrics, OptimizedWebSocketReturn }