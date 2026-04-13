// @epic-3.1-messaging: Message visibility tracking for read receipts
import { useEffect, useRef, useState } from 'react';
import { markMessageAsRead } from '@/fetchers/message/mark-message-read';
import { logger } from "../lib/logger";

interface UseMessageVisibilityOptions {
  messageId: string;
  enabled?: boolean;
  threshold?: number;
  timeThreshold?: number; // Minimum time visible before marking as read
}

export function useMessageVisibility({
  messageId,
  enabled = true,
  threshold = 0.5, // 50% of message must be visible
  timeThreshold = 1000, // 1 second
}: UseMessageVisibilityOptions) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenRead, setHasBeenRead] = useState(false);
  const elementRef = useRef<HTMLElement | null>(null);
  const visibilityStartTime = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || hasBeenRead || !elementRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isCurrentlyVisible = entry.isIntersecting && entry.intersectionRatio >= threshold;
        
        setIsVisible(isCurrentlyVisible);

        if (isCurrentlyVisible && !visibilityStartTime.current) {
          // Message became visible
          visibilityStartTime.current = Date.now();
          
          // Set timer to mark as read after timeThreshold
          timeoutRef.current = setTimeout(async () => {
            try {
              const timeSpent = visibilityStartTime.current ? Date.now() - visibilityStartTime.current : 0;
              
              await markMessageAsRead(messageId, {
                deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
                readMethod: 'scrolled_past',
                timeSpentMs: timeSpent,
              });
              
              setHasBeenRead(true);
              logger.info("✅ Marked message ${messageId} as read after ${timeSpent}ms");
            } catch (error) {
              console.error(`❌ Failed to mark message ${messageId} as read:`, error);
            }
          }, timeThreshold);
        } else if (!isCurrentlyVisible && visibilityStartTime.current) {
          // Message became hidden
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          visibilityStartTime.current = null;
        }
      },
      {
        threshold: [0, threshold, 1],
        rootMargin: '0px',
      }
    );

    observer.observe(elementRef.current);

    return () => {
      observer.disconnect();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [messageId, enabled, threshold, timeThreshold, hasBeenRead]);

  return {
    elementRef,
    isVisible,
    hasBeenRead,
    markAsRead: () => {
      if (!hasBeenRead) {
        const timeSpent = visibilityStartTime.current ? Date.now() - visibilityStartTime.current : 0;
        markMessageAsRead(messageId, {
          deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
          readMethod: 'clicked',
          timeSpentMs: timeSpent,
        }).then(() => {
          setHasBeenRead(true);
          logger.info("✅ Manually marked message ${messageId} as read");
        }).catch((error) => {
          console.error(`❌ Failed to manually mark message ${messageId} as read:`, error);
        });
      }
    },
  };
}