// @epic-3.6-communication: Thread notification badge component
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL, API_URL } from '@/constants/urls';
import { MessageSquare, Bell } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ThreadNotification {
  id: string;
  threadId: string;
  notificationType: 'reply' | 'mention' | 'resolve';
  isRead: boolean;
  createdAt: Date;
  threadPreview?: string;
  threadMessageCount?: number;
}

interface ThreadNotificationBadgeProps {
  className?: string;
  onThreadClick?: (threadId: string) => void;
}

export default function ThreadNotificationBadge({ 
  className, 
  onThreadClick 
}: ThreadNotificationBadgeProps) {
  // Fetch thread notifications
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['thread', 'notifications'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/message/thread/notifications`);
      if (!response.ok) throw new Error('Failed to fetch thread notifications');
      return response.json();
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const unreadNotifications = notifications?.notifications?.filter(
    (n: ThreadNotification) => !n.isRead
  ) || [];

  const unreadCount = unreadNotifications.length;

  if (unreadCount === 0) {
    return null;
  }

  return (
    <div className={cn("relative", className)}>
      <Button
        variant="ghost"
        size="sm"
        className="relative p-2"
        onClick={() => {
          // Mark notifications as read
          fetch(`${API_BASE_URL}/message/thread/notifications/read`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              threadIds: unreadNotifications.map((n: ThreadNotification) => n.threadId) 
            }),
          });
        }}
      >
        <MessageSquare className="w-4 h-4" />
        <Badge 
          variant="destructive" 
          className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      </Button>

      {/* Notification dropdown */}
      {unreadCount > 0 && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-background border rounded-lg shadow-lg z-50">
          <div className="p-3 border-b">
            <h3 className="font-semibold text-sm">Thread Notifications</h3>
            <p className="text-xs text-muted-foreground">
              {unreadCount} unread thread{unreadCount !== 1 ? 's' : ''}
            </p>
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {unreadNotifications.map((notification: ThreadNotification) => (
              <div
                key={notification.id}
                className="p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                onClick={() => onThreadClick?.(notification.threadId)}
              >
                <div className="flex items-start space-x-2">
                  <div className="flex-shrink-0 mt-0.5">
                    {notification.notificationType === 'reply' && (
                      <MessageSquare className="w-4 h-4 text-blue-500" />
                    )}
                    {notification.notificationType === 'mention' && (
                      <Bell className="w-4 h-4 text-orange-500" />
                    )}
                    {notification.notificationType === 'resolve' && (
                      <MessageSquare className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">
                      {notification.notificationType === 'reply' && 'New reply in thread'}
                      {notification.notificationType === 'mention' && 'You were mentioned in thread'}
                      {notification.notificationType === 'resolve' && 'Thread was resolved'}
                    </div>
                    
                    {notification.threadPreview && (
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {notification.threadPreview}
                      </div>
                    )}
                    
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(notification.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-3 border-t">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                fetch(`${API_BASE_URL}/message/thread/notifications/read`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({}),
                });
              }}
            >
              Mark all as read
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 