// @epic-3.5-communication: Real-time notification updates via WebSocket
// @persona-sarah: PM needs instant notification updates for project changes
// @persona-david: Team lead needs real-time team activity notifications

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUnifiedWebSocket } from './useUnifiedWebSocket';
import type { Notification } from '@/types/notification';
import { logger } from "../lib/logger";

interface NotificationWebSocketData {
  type: 'notification_created' | 'notification_updated' | 'notification_deleted';
  notification: Notification;
  userId?: string;
  userEmail?: string;
}

export function useNotificationRealtime() {
  const queryClient = useQueryClient();
  const { isConnected, on, off } = useUnifiedWebSocket();

  useEffect(() => {
    if (!isConnected) return;

    const handleNotificationUpdate = (data: NotificationWebSocketData) => {
      logger.info("🔔 Real-time notification update:");

      switch (data.type) {
        case 'notification_created':
          // Add new notification to the cache
          queryClient.setQueryData(['notifications'], (oldData: Notification[] | undefined) => {
            if (!oldData) return [data.notification];
            return [data.notification, ...oldData];
          });
          
          // Show browser notification if supported
          if ('Notification' in window && Notification.permission === 'granted') {
            new window.Notification(data.notification.title, {
              body: data.notification.content || '',
              icon: '/meridian-logomark.png',
              badge: '/meridian-logomark.png',
              tag: data.notification.id,
            });
          }
          break;

        case 'notification_updated':
          // Update existing notification in cache
          queryClient.setQueryData(['notifications'], (oldData: Notification[] | undefined) => {
            if (!oldData) return [];
            return oldData.map(notification => 
              notification.id === data.notification.id ? data.notification : notification
            );
          });
          break;

        case 'notification_deleted':
          // Remove notification from cache
          queryClient.setQueryData(['notifications'], (oldData: Notification[] | undefined) => {
            if (!oldData) return [];
            return oldData.filter(notification => notification.id !== data.notification.id);
          });
          break;
      }

      // Invalidate queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    // Subscribe to notification events
    on('notification:update', handleNotificationUpdate);
    on('notification:created', handleNotificationUpdate);
    on('notification:deleted', handleNotificationUpdate);

    return () => {
      off('notification:update', handleNotificationUpdate);
      off('notification:created', handleNotificationUpdate);
      off('notification:deleted', handleNotificationUpdate);
    };
  }, [isConnected, queryClient, on, off]);

  return { isConnected };
}

// Hook to request browser notification permissions
export function useNotificationPermission() {
  const requestPermission = async () => {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return 'not-supported';
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission;
    }

    return Notification.permission;
  };

  return { requestPermission, permission: Notification.permission };
}