// Virtualized Message Container for Performance Optimization
import React, { useMemo, useRef, useCallback, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  content: string
  userEmail: string
  userName: string
  createdAt: string
  user: {
    email: string
    name: string
  }
  attachments?: any[]
}

interface VirtualizedMessageContainerProps {
  messages: Message[]
  renderMessage: (message: Message, index: number) => React.ReactNode
  height: number
  className?: string
  onScroll?: (scrollTop: number, scrollHeight: number, clientHeight: number) => void
  autoScrollToBottom?: boolean
  itemHeight?: number
}

export function VirtualizedMessageContainer({
  messages,
  renderMessage,
  height,
  className,
  onScroll,
  autoScrollToBottom = true,
  itemHeight = 120, // Estimated height per message
}: VirtualizedMessageContainerProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const previousMessageCount = useRef(messages.length)

  // Dynamic item height calculation based on message content
  const getItemSize = useCallback((index: number) => {
    const message = messages[index]
    if (!message) return itemHeight

    // Base height
    let calculatedHeight = 80 // Avatar + basic content

    // Add height for content
    const contentLines = Math.ceil(message.content.length / 60) // Rough estimate
    calculatedHeight += contentLines * 20

    // Add height for attachments
    if (message.attachments && message.attachments.length > 0) {
      calculatedHeight += 60 * Math.ceil(message.attachments.length / 3) // Grid layout
    }

    // Minimum and maximum heights
    return Math.max(60, Math.min(calculatedHeight, 300))
  }, [messages, itemHeight])

  // Create virtualizer
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: getItemSize,
    overscan: 5, // Render 5 extra items above/below viewport
  })

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScrollToBottom && messages.length > previousMessageCount.current) {
      virtualizer.scrollToIndex(messages.length - 1, { align: 'end' })
    }
    previousMessageCount.current = messages.length
  }, [messages.length, autoScrollToBottom, virtualizer])

  // Handle scroll events
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    if (onScroll && parentRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = parentRef.current
      onScroll(scrollTop, scrollHeight, clientHeight)
    }
  }, [onScroll])

  // Scroll to bottom method
  const scrollToBottom = useCallback(() => {
    virtualizer.scrollToIndex(messages.length - 1, { align: 'end' })
  }, [messages.length, virtualizer])

  // Scroll to specific message
  const scrollToMessage = useCallback((messageIndex: number) => {
    virtualizer.scrollToIndex(messageIndex, { align: 'center' })
  }, [virtualizer])

  // Handle empty state
  if (messages.length === 0) {
    return (
      <div 
        className={cn("flex items-center justify-center", className)} 
        style={{ height }}
      >
        <div className="text-center text-gray-500">
          <p className="text-lg font-medium mb-2">No messages yet</p>
          <p className="text-sm">Start a conversation!</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("relative", className)} style={{ height }}>
      <div
        ref={parentRef}
        className="h-full overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
        onScroll={handleScroll}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const message = messages[virtualItem.index]
            
            return (
              <div
                key={virtualItem.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                className="px-1"
              >
                {renderMessage(message, virtualItem.index)}
              </div>
            )
          })}
        </div>
      </div>

      {/* Scroll to bottom button */}
      {messages.length > 10 && (
        <ScrollToBottomButton 
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4"
        />
      )}
    </div>
  )
}

// Scroll to bottom button component
interface ScrollToBottomButtonProps {
  onClick: () => void
  className?: string
}

function ScrollToBottomButton({ onClick, className }: ScrollToBottomButtonProps) {
  const [isVisible, setIsVisible] = React.useState(false)
  const [unreadCount, setUnreadCount] = React.useState(0)

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all",
        "transform hover:scale-105 active:scale-95",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
        className
      )}
      title="Scroll to bottom"
    >
      <svg 
        className="w-4 h-4" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M19 14l-7 7m0 0l-7-7m7 7V3" 
        />
      </svg>
      {unreadCount > 0 && (
        <span className="text-xs font-medium bg-red-500 rounded-full px-2 py-1 min-w-[20px]">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  )
}

// Performance monitoring hook
export function useMessageVirtualizationPerformance(messageCount: number) {
  const [performanceMetrics, setPerformanceMetrics] = React.useState({
    renderTime: 0,
    memoryUsage: 0,
    scrollPerformance: 'good' as 'good' | 'fair' | 'poor',
  })

  React.useEffect(() => {
    const startTime = performance.now()
    
    // Measure render time
    const measureRender = () => {
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      // Estimate memory usage (rough calculation)
      const estimatedMemoryPerMessage = 0.5 // KB per message
      const memoryUsage = messageCount * estimatedMemoryPerMessage
      
      // Determine scroll performance based on message count
      let scrollPerformance: 'good' | 'fair' | 'poor' = 'good'
      if (messageCount > 1000) scrollPerformance = 'fair'
      if (messageCount > 5000) scrollPerformance = 'poor'
      
      setPerformanceMetrics({
        renderTime,
        memoryUsage,
        scrollPerformance,
      })
    }

    // Use requestAnimationFrame to measure after render
    requestAnimationFrame(measureRender)
  }, [messageCount])

  return performanceMetrics
}

// Export types for external use
export type { Message as VirtualizedMessage, VirtualizedMessageContainerProps }