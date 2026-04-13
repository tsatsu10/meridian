// useVirtualizedMessages - Virtual scrolling for performance

import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, useMemo } from 'react';
import type { TeamMessage } from '../types';

interface UseVirtualizedMessagesOptions {
  messages: TeamMessage[];
  estimatedHeight?: number;
  overscan?: number;
}

/**
 * Hook for virtualizing message list
 * 
 * Only renders visible messages for better performance with large lists.
 * 
 * @param options - Virtualization options
 * @returns Virtualizer instance and parent ref
 */
export function useVirtualizedMessages({
  messages,
  estimatedHeight = 100,
  overscan = 5,
}: UseVirtualizedMessagesOptions) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedHeight,
    overscan,
    // Reverse scroll (newer messages at bottom)
    initialOffset: 0,
  });

  // Get virtual items
  const virtualItems = virtualizer.getVirtualItems();

  // Calculate total size
  const totalSize = virtualizer.getTotalSize();

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (messages.length > 0) {
      virtualizer.scrollToIndex(messages.length - 1, {
        align: 'end',
        behavior: 'smooth',
      });
    }
  };

  // Scroll to specific message
  const scrollToMessage = (messageId: string) => {
    const index = messages.findIndex(m => m.id === messageId);
    if (index !== -1) {
      virtualizer.scrollToIndex(index, {
        align: 'center',
        behavior: 'smooth',
      });
    }
  };

  return {
    parentRef,
    virtualItems,
    totalSize,
    scrollToBottom,
    scrollToMessage,
    virtualizer,
  };
}

