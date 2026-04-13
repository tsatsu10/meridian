/**
 * Notification Center Component
 * Real-time notification dropdown with badge
 * Phase 2.2 - Smart Notifications System
 */

import React, { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';

type NotificationType = 
  | 'task_assigned' 
  | 'task_completed' 
  | 'comment_mention' 
  | 'comment_reply'
  | 'deadline_approaching'
  | 'kudos_received'
  | 'skill_endorsed'
  | 'mood_reminder'
  | 'project_update'
  | 'custom';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  actionUrl?: string;
  actorName?: string;
  actorAvatar?: string;
  metadata?: any;
  createdAt: string;
}

interface NotificationCenterProps {
  userId: string;
  workspaceId: string;
  onNotificationClick?: (notification: Notification) => void;
  className?: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  userId,
  workspaceId,
  onNotificationClick,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('unread');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUnreadCount();
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, activeTab]);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch(
        `/api/notifications/unread-count?userId=${userId}&workspaceId=${workspaceId}`
      );
      const data = await response.json();
      setUnreadCount(data.count || 0);
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const isRead = activeTab === 'all' ? undefined : false;
      const response = await fetch(
        `/api/notifications?userId=${userId}&workspaceId=${workspaceId}${isRead !== undefined ? `&isRead=${isRead}` : ''}&limit=20`
      );
      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read?userId=${userId}`, {
        method: 'PUT',
      });
      
      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(
        `/api/notifications/mark-all-read?userId=${userId}&workspaceId=${workspaceId}`,
        { method: 'PUT' }
      );
      
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    if (onNotificationClick) {
      onNotificationClick(notification);
    } else if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    const icons: Record<NotificationType, string> = {
      task_assigned: '📋',
      task_completed: '✅',
      comment_mention: '@',
      comment_reply: '💬',
      deadline_approaching: '⏰',
      kudos_received: '⭐',
      skill_endorsed: '👍',
      mood_reminder: '😊',
      project_update: '📊',
      custom: '🔔',
    };
    return icons[type] || '🔔';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'border-gray-300',
      normal: 'border-blue-400',
      high: 'border-orange-400',
      urgent: 'border-red-500',
    };
    return colors[priority] || colors.normal;
  };
  
  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread Badge */}
            {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full transform translate-x-1 -translate-y-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Mark all read
                </button>
          )}
        </div>
        
        {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('unread')}
                className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'unread'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Unread ({unreadCount})
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'all'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                <p className="mt-2 text-sm text-gray-500">Loading...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-4xl mb-2">🔔</div>
                <p className="text-gray-500">
                  {activeTab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors border-l-4 ${
                      notification.isRead ? 'bg-white' : 'bg-blue-50'
                    } ${getPriorityColor(notification.priority)}`}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Icon/Avatar */}
                      <div className="flex-shrink-0">
                        {notification.actorAvatar ? (
                          <img
                            src={notification.actorAvatar}
                            alt={notification.actorName}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl">
                            {getNotificationIcon(notification.type)}
                          </div>
                        )}
                    </div>

                      {/* Content */}
                            <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                                      {notification.title}
                        </p>
                        <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>

                      {/* Unread Indicator */}
                            {!notification.isRead && (
                        <div className="flex-shrink-0">
                          <div className="w-2 h-2 bg-blue-600 rounded-full" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => {
                setIsOpen(false);
                window.location.href = '/notifications'; // Navigate to full page
              }}
              className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
