/**
 * @fileoverview Message Memory Manager Hook
 * @description Intelligent memory management for large conversation histories
 * @author Claude Code Assistant
 * @version 1.0.0
 * 
 * Features:
 * - Automatic memory cleanup for old messages
 * - LRU cache for frequently accessed messages
 * - Progressive message unloading
 * - Memory usage monitoring
 * - Configurable thresholds and strategies
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from "../lib/logger";

interface Message {
  id: string;
  content: string;
  createdAt: Date;
  userEmail: string;
  channelId: string;
  [key: string]: any;
}

interface MemoryManagerConfig {
  maxMessages: number;
  maxMemoryMB: number;
  cleanupThreshold: number;
  retentionStrategy: 'lru' | 'temporal' | 'importance';
  enableCompression: boolean;
  monitoringInterval: number;
}

interface MemoryStats {
  totalMessages: number;
  loadedMessages: number;
  estimatedMemoryMB: number;
  compressionRatio: number;
  lastCleanup: Date | null;
  cleanupCount: number;
}

const DEFAULT_CONFIG: MemoryManagerConfig = {
  maxMessages: 1000,
  maxMemoryMB: 50,
  cleanupThreshold: 0.8,
  retentionStrategy: 'lru',
  enableCompression: true,
  monitoringInterval: 30000, // 30 seconds
};

export function useMessageMemoryManager(
  messages: Message[],
  channelId: string,
  config: Partial<MemoryManagerConfig> = {}
) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const queryClient = useQueryClient();
  
  // Memory tracking
  const [memoryStats, setMemoryStats] = useState<MemoryStats>({
    totalMessages: 0,
    loadedMessages: 0,
    estimatedMemoryMB: 0,
    compressionRatio: 1,
    lastCleanup: null,
    cleanupCount: 0,
  });

  // LRU cache for message access tracking
  const accessTracker = useRef(new Map<string, number>());
  const compressionCache = useRef(new Map<string, string>());
  const cleanupTimerRef = useRef<NodeJS.Timeout>();

  // Estimate memory usage of a message
  const estimateMessageSize = useCallback((message: Message): number => {
    // Rough estimation: JSON string length + object overhead
    const jsonSize = JSON.stringify(message).length;
    const overhead = 100; // Estimated object overhead in bytes
    return (jsonSize + overhead) / 1024 / 1024; // Convert to MB
  }, []);

  // Compress message content for older messages
  const compressMessage = useCallback((message: Message): Message => {
    if (!finalConfig.enableCompression) return message;

    const compressed = {
      ...message,
      content: message.content.length > 200 
        ? message.content.substring(0, 200) + '...[compressed]'
        : message.content,
      isCompressed: true,
    };

    // Store original content in compression cache
    compressionCache.current.set(message.id, message.content);
    
    return compressed;
  }, [finalConfig.enableCompression]);

  // Decompress message when needed
  const decompressMessage = useCallback((message: Message): Message => {
    if (!message.isCompressed) return message;

    const originalContent = compressionCache.current.get(message.id);
    if (originalContent) {
      return {
        ...message,
        content: originalContent,
        isCompressed: false,
      };
    }

    return message;
  }, []);

  // Track message access for LRU
  const trackMessageAccess = useCallback((messageId: string) => {
    accessTracker.current.set(messageId, Date.now());
  }, []);

  // Get messages to keep based on retention strategy
  const getMessagesToKeep = useCallback((
    messages: Message[], 
    maxCount: number
  ): Set<string> => {
    const toKeep = new Set<string>();

    switch (finalConfig.retentionStrategy) {
      case 'lru': {
        // Keep most recently accessed messages
        const accessTimes = Array.from(accessTracker.current.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, maxCount);
        
        accessTimes.forEach(([messageId]) => toKeep.add(messageId));
        
        // Also keep recent messages even if not accessed
        const recentMessages = messages
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, Math.floor(maxCount * 0.3)); // Keep 30% most recent
        
        recentMessages.forEach(msg => toKeep.add(msg.id));
        break;
      }

      case 'temporal': {
        // Keep most recent messages
        const sorted = messages
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, maxCount);
        
        sorted.forEach(msg => toKeep.add(msg.id));
        break;
      }

      case 'importance': {
        // Keep pinned, edited, or messages with reactions
        const important = messages.filter(msg => 
          msg.isPinned || msg.isEdited || msg.reactions
        );
        
        important.forEach(msg => toKeep.add(msg.id));
        
        // Fill remaining slots with recent messages
        const remaining = maxCount - important.length;
        if (remaining > 0) {
          const recent = messages
            .filter(msg => !toKeep.has(msg.id))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, remaining);
          
          recent.forEach(msg => toKeep.add(msg.id));
        }
        break;
      }
    }

    return toKeep;
  }, [finalConfig.retentionStrategy]);

  // Perform memory cleanup
  const performCleanup = useCallback(() => {
    if (messages.length <= finalConfig.maxMessages) return;

    const startTime = performance.now();
    const messagesToKeep = getMessagesToKeep(messages, finalConfig.maxMessages);
    
    // Update query cache to remove old messages
    queryClient.setQueryData(
      ['messages', channelId],
      (oldData: Message[] | undefined) => {
        if (!oldData) return oldData;
        
        const filtered = oldData.filter(msg => messagesToKeep.has(msg.id));
        const compressed = filtered.map(msg => 
          messagesToKeep.has(msg.id) && !isMessageRecent(msg) 
            ? compressMessage(msg) 
            : msg
        );
        
        return compressed;
      }
    );

    // Clean up access tracker
    const newAccessTracker = new Map();
    for (const [messageId, time] of accessTracker.current.entries()) {
      if (messagesToKeep.has(messageId)) {
        newAccessTracker.set(messageId, time);
      }
    }
    accessTracker.current = newAccessTracker;

    // Clean up compression cache for removed messages
    for (const messageId of compressionCache.current.keys()) {
      if (!messagesToKeep.has(messageId)) {
        compressionCache.current.delete(messageId);
      }
    }

    const endTime = performance.now();
    
    setMemoryStats(prev => ({
      ...prev,
      lastCleanup: new Date(),
      cleanupCount: prev.cleanupCount + 1,
    }));

    logger.info("🧹 Memory cleanup completed in ${(endTime - startTime).toFixed(1)}ms");
    logger.info("📊 Kept ${messagesToKeep.size}/${messages.length} messages");
  }, [
    messages, 
    finalConfig.maxMessages, 
    channelId, 
    queryClient, 
    getMessagesToKeep, 
    compressMessage
  ]);

  // Check if message is recent (within last hour)
  const isMessageRecent = useCallback((message: Message): boolean => {
    const hourAgo = Date.now() - 60 * 60 * 1000;
    return new Date(message.createdAt).getTime() > hourAgo;
  }, []);

  // Calculate current memory usage
  const calculateMemoryUsage = useCallback((): MemoryStats => {
    const totalMemory = messages.reduce((sum, msg) => sum + estimateMessageSize(msg), 0);
    const compressionRatio = compressionCache.current.size > 0 
      ? messages.length / (messages.length - compressionCache.current.size)
      : 1;

    return {
      totalMessages: messages.length,
      loadedMessages: messages.filter(msg => !msg.isCompressed).length,
      estimatedMemoryMB: totalMemory,
      compressionRatio,
      lastCleanup: memoryStats.lastCleanup,
      cleanupCount: memoryStats.cleanupCount,
    };
  }, [messages, estimateMessageSize, memoryStats.lastCleanup, memoryStats.cleanupCount]);

  // Monitor memory usage and trigger cleanup
  useEffect(() => {
    const checkMemoryUsage = () => {
      const stats = calculateMemoryUsage();
      setMemoryStats(stats);

      const shouldCleanup = 
        stats.totalMessages > finalConfig.maxMessages ||
        stats.estimatedMemoryMB > finalConfig.maxMemoryMB ||
        (stats.totalMessages > finalConfig.maxMessages * finalConfig.cleanupThreshold);

      if (shouldCleanup) {
        performCleanup();
      }
    };

    // Initial check
    checkMemoryUsage();

    // Set up periodic monitoring
    cleanupTimerRef.current = setInterval(checkMemoryUsage, finalConfig.monitoringInterval);

    return () => {
      if (cleanupTimerRef.current) {
        clearInterval(cleanupTimerRef.current);
      }
    };
  }, [
    calculateMemoryUsage,
    performCleanup,
    finalConfig.maxMessages,
    finalConfig.maxMemoryMB,
    finalConfig.cleanupThreshold,
    finalConfig.monitoringInterval,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      accessTracker.current.clear();
      compressionCache.current.clear();
      if (cleanupTimerRef.current) {
        clearInterval(cleanupTimerRef.current);
      }
    };
  }, []);

  // Optimized messages with memory management applied
  const optimizedMessages = useMemo(() => {
    return messages.map(message => {
      // Track access for LRU
      trackMessageAccess(message.id);
      
      // Return decompressed version if needed
      return decompressMessage(message);
    });
  }, [messages, trackMessageAccess, decompressMessage]);

  return {
    messages: optimizedMessages,
    memoryStats,
    trackMessageAccess,
    performCleanup: useCallback(() => performCleanup(), [performCleanup]),
    compressMessage,
    decompressMessage,
    config: finalConfig,
  };
}