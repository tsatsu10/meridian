// Message Cache and Pagination Hook for Performance Optimization
import { useState, useCallback, useRef, useEffect } from 'react'
import { API_BASE_URL, API_URL } from '@/constants/urls';
import { toast } from '@/lib/toast';
import { withApiMonitoring } from '@/lib/api-monitoring'
import { logger } from "../lib/logger";

interface CachedMessage {
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
  channelId: string
  // Cache metadata
  cachedAt: number
  localId?: string // For optimistic updates
}

interface MessagePage {
  messages: CachedMessage[]
  cursor: string | null
  hasMore: boolean
  timestamp: number
}

interface MessageCacheOptions {
  maxCacheSize?: number // Maximum number of messages to cache per channel
  cacheDuration?: number // Cache validity in milliseconds
  pageSize?: number // Number of messages per page
  enablePersistence?: boolean // Whether to persist cache to localStorage
}

interface UseMessageCacheReturn {
  // State
  messages: CachedMessage[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  error: string | null
  
  // Actions
  loadMessages: (channelId: string, cursor?: string) => Promise<void>
  loadMoreMessages: () => Promise<void>
  addMessage: (message: Omit<CachedMessage, 'cachedAt' | 'channelId'>, channelId: string) => void
  updateMessage: (messageId: string, updates: Partial<CachedMessage>) => void
  removeMessage: (messageId: string) => void
  updateMessageStatus: (messageId: string, status: 'sending' | 'sent' | 'failed') => void
  clearCache: (channelId?: string) => void
  
  // Cache management
  getCacheStats: () => { totalMessages: number; channels: number; memoryUsage: number }
  optimizeCache: () => void
  preloadChannel: (channelId: string) => Promise<void>
}

const defaultOptions: Required<MessageCacheOptions> = {
  maxCacheSize: 1000,
  cacheDuration: 30 * 60 * 1000, // 30 minutes
  pageSize: 50,
  enablePersistence: true,
}

export function useMessageCache(options: MessageCacheOptions = {}): UseMessageCacheReturn {
  const opts = { ...defaultOptions, ...options }
  
  // Cache storage: channelId -> MessagePage[]
  const cache = useRef<Map<string, MessagePage[]>>(new Map())
  const [currentChannelId, setCurrentChannelId] = useState<string>('')
  const [messages, setMessages] = useState<CachedMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Initialize cache from localStorage if persistence is enabled
  useEffect(() => {
    if (opts.enablePersistence) {
      try {
        const savedCache = localStorage.getItem('meridian-message-cache')
        if (savedCache) {
          const parsedCache = JSON.parse(savedCache)
          // Convert plain object back to Map
          cache.current = new Map(Object.entries(parsedCache))
        }
      } catch (error) {
        console.warn('Failed to load message cache from localStorage:', error)
      }
    }
  }, [opts.enablePersistence])

  // Save cache to localStorage when it changes
  const saveCache = useCallback(() => {
    if (opts.enablePersistence) {
      try {
        // Convert Map to plain object for storage
        const cacheObject = Object.fromEntries(cache.current.entries())
        localStorage.setItem('meridian-message-cache', JSON.stringify(cacheObject))
      } catch (error) {
        console.warn('Failed to save message cache to localStorage:', error)
      }
    }
  }, [opts.enablePersistence])

  // Get cached messages for a channel
  const getCachedMessages = useCallback((channelId: string): CachedMessage[] => {
    const pages = cache.current.get(channelId) || []
    return pages.flatMap(page => page.messages).sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
  }, [])

  // Check if cache is valid
  const isCacheValid = useCallback((channelId: string): boolean => {
    const pages = cache.current.get(channelId) || []
    if (pages.length === 0) return false
    
    const latestPage = pages[pages.length - 1]
    const now = Date.now()
    return (now - latestPage.timestamp) < opts.cacheDuration
  }, [opts.cacheDuration])

  // API call to fetch messages - ✅ Now using real message API
  const fetchMessages = useCallback(async (channelId: string, cursor?: string): Promise<{
    messages: CachedMessage[]
    nextCursor: string | null
    hasMore: boolean
  }> => withApiMonitoring(async () => {
    // Fetch messages from real API endpoint
    const url = cursor 
      ? `${API_BASE_URL}/messages/channel/${channelId}?cursor=${cursor}&limit=${opts.pageSize}`
      : `${API_BASE_URL}/messages/channel/${channelId}?limit=${opts.pageSize}`;
      
    const response = await fetch(url, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch messages: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Map API response to CachedMessage format
    const messages: CachedMessage[] = (data.messages || []).map((msg: any) => ({
      id: msg.id,
      channelId: msg.channelId || channelId,
      content: msg.content,
      userEmail: msg.userEmail,
      userName: msg.userName || msg.userEmail,
      userAvatar: msg.userAvatar,
      createdAt: msg.createdAt || new Date().toISOString(),
      updatedAt: msg.updatedAt,
      isEdited: msg.isEdited || false,
      mentions: msg.mentions || [],
      attachments: msg.attachments || [],
      replyTo: msg.parentMessageId,
    }));

    return {
      messages,
      nextCursor: data.nextCursor || null,
      hasMore: data.hasMore || false,
    };
  }, 'fetchMessages'), [opts.pageSize])

  // Load messages for a channel
  const loadMessages = useCallback(async (channelId: string, cursor?: string) => {
    setError(null)
    setIsLoading(true)
    setCurrentChannelId(channelId)
    
    try {
      // Check cache first
      if (!cursor && isCacheValid(channelId)) {
        const cachedMessages = getCachedMessages(channelId)
        setMessages(cachedMessages)
        setHasMore(cache.current.get(channelId)?.[0]?.hasMore ?? true)
        setIsLoading(false)
        return
      }

      // Fetch from API
      const response = await fetchMessages(channelId, cursor)
      
      // Update cache
      const newPage: MessagePage = {
        messages: response.messages,
        cursor: response.nextCursor,
        hasMore: response.hasMore,
        timestamp: Date.now(),
      }
      
      const existingPages = cache.current.get(channelId) || []
      if (cursor) {
        // Append to existing pages
        cache.current.set(channelId, [...existingPages, newPage])
      } else {
        // Replace with new pages
        cache.current.set(channelId, [newPage])
      }
      
      // Update state
      const allMessages = getCachedMessages(channelId)
      setMessages(allMessages)
      setHasMore(response.hasMore)
      saveCache()
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages')
      toast.error('Failed to load messages')
    } finally {
      setIsLoading(false)
    }
  }, [isCacheValid, getCachedMessages, fetchMessages, saveCache])

  // Load more messages (pagination)
  const loadMoreMessages = useCallback(async () => {
    if (!currentChannelId || isLoadingMore || !hasMore) return
    
    setIsLoadingMore(true)
    setError(null)
    
    try {
      const pages = cache.current.get(currentChannelId) || []
      const lastPage = pages[pages.length - 1]
      const cursor = lastPage?.cursor
      
      if (!cursor) {
        setHasMore(false)
        return
      }
      
      const response = await fetchMessages(currentChannelId, cursor)
      
      // Add new page to cache
      const newPage: MessagePage = {
        messages: response.messages,
        cursor: response.nextCursor,
        hasMore: response.hasMore,
        timestamp: Date.now(),
      }
      
      cache.current.set(currentChannelId, [...pages, newPage])
      
      // Update state
      const allMessages = getCachedMessages(currentChannelId)
      setMessages(allMessages)
      setHasMore(response.hasMore)
      saveCache()
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more messages')
      toast.error('Failed to load more messages')
    } finally {
      setIsLoadingMore(false)
    }
  }, [currentChannelId, isLoadingMore, hasMore, fetchMessages, getCachedMessages, saveCache])

  // Add a new message (optimistic update)
  const addMessage = useCallback((
    message: Omit<CachedMessage, 'cachedAt' | 'channelId'>, 
    channelId: string
  ) => {
    const newMessage: CachedMessage = {
      ...message,
      channelId,
      cachedAt: Date.now(),
      localId: `local-${Date.now()}`, // Mark as optimistic
    }
    
    // Add to current messages if it's the active channel
    if (channelId === currentChannelId) {
      setMessages(prev => [...prev, newMessage])
    }
    
    // Add to cache
    const pages = cache.current.get(channelId) || []
    if (pages.length > 0) {
      const lastPage = pages[pages.length - 1]
      lastPage.messages.push(newMessage)
    } else {
      // Create new page if none exist
      cache.current.set(channelId, [{
        messages: [newMessage],
        cursor: null,
        hasMore: false,
        timestamp: Date.now(),
      }])
    }
    
    saveCache()
  }, [currentChannelId, saveCache])

  // Update an existing message
  const updateMessage = useCallback((messageId: string, updates: Partial<CachedMessage>) => {
    // Update in current messages
    setMessages(prev => prev.map(msg => 
      msg.id === messageId || msg.localId === messageId
        ? { ...msg, ...updates }
        : msg
    ))
    
    // Update in cache
    for (const [channelId, pages] of cache.current.entries()) {
      for (const page of pages) {
        const messageIndex = page.messages.findIndex(msg => 
          msg.id === messageId || msg.localId === messageId
        )
        if (messageIndex !== -1) {
          page.messages[messageIndex] = { ...page.messages[messageIndex], ...updates }
          saveCache()
          return
        }
      }
    }
  }, [saveCache])

  // Remove a message
  const removeMessage = useCallback((messageId: string) => {
    // Remove from current messages
    setMessages(prev => prev.filter(msg => 
      msg.id !== messageId && msg.localId !== messageId
    ))
    
    // Remove from cache
    for (const [channelId, pages] of cache.current.entries()) {
      for (const page of pages) {
        page.messages = page.messages.filter(msg => 
          msg.id !== messageId && msg.localId !== messageId
        )
      }
    }
    
    saveCache()
  }, [saveCache])

  const updateMessageStatus = useCallback((messageId: string, status: 'sending' | 'sent' | 'failed') => {
    updateMessage(messageId, { status })
  }, [updateMessage])

  // Clear cache
  const clearCache = useCallback((channelId?: string) => {
    if (channelId) {
      cache.current.delete(channelId)
      if (channelId === currentChannelId) {
        setMessages([])
        setHasMore(true)
      }
    } else {
      cache.current.clear()
      setMessages([])
      setHasMore(true)
    }
    saveCache()
  }, [currentChannelId, saveCache])

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    let totalMessages = 0
    let memoryUsage = 0
    
    for (const [channelId, pages] of cache.current.entries()) {
      for (const page of pages) {
        totalMessages += page.messages.length
        // Rough estimate of memory usage
        memoryUsage += JSON.stringify(page.messages).length
      }
    }
    
    return {
      totalMessages,
      channels: cache.current.size,
      memoryUsage: Math.round(memoryUsage / 1024), // KB
    }
  }, [])

  // Optimize cache by removing old entries
  const optimizeCache = useCallback(() => {
    const now = Date.now()
    let removedMessages = 0
    
    for (const [channelId, pages] of cache.current.entries()) {
      // Remove expired pages
      const validPages = pages.filter(page => 
        (now - page.timestamp) < opts.cacheDuration
      )
      
      // Limit number of messages per channel
      let totalMessages = validPages.reduce((sum, page) => sum + page.messages.length, 0)
      if (totalMessages > opts.maxCacheSize) {
        // Remove oldest messages
        while (totalMessages > opts.maxCacheSize && validPages.length > 0) {
          const firstPage = validPages[0]
          if (firstPage.messages.length > 0) {
            firstPage.messages.shift()
            totalMessages--
            removedMessages++
          } else {
            validPages.shift()
          }
        }
      }
      
      cache.current.set(channelId, validPages)
    }
    
    saveCache()
    
    if (removedMessages > 0) {
      // logger.info("Cache optimized: removed ${removedMessages} old messages")
    }
  }, [opts.cacheDuration, opts.maxCacheSize, saveCache])

  // Preload channel messages
  const preloadChannel = useCallback(async (channelId: string) => {
    if (!isCacheValid(channelId)) {
      try {
        await loadMessages(channelId)
      } catch (error) {
        console.warn(`Failed to preload channel ${channelId}:`, error)
      }
    }
  }, [isCacheValid, loadMessages])

  // Auto-optimize cache periodically
  // CRITICAL: Use ref to prevent interval leak when optimizeCache changes
  const optimizeCacheRef = useRef(optimizeCache)
  useEffect(() => {
    optimizeCacheRef.current = optimizeCache
  }, [optimizeCache])

  useEffect(() => {
    const interval = setInterval(() => {
      optimizeCacheRef.current()
    }, 5 * 60 * 1000) // Every 5 minutes
    return () => clearInterval(interval)
  }, []) // Empty deps - interval only created once

  return {
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMessages,
    loadMoreMessages,
    addMessage,
    updateMessage,
    removeMessage,
    clearCache,
    getCacheStats,
    optimizeCache,
    preloadChannel,
    updateMessageStatus,
  }
}