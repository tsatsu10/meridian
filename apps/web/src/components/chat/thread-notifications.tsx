/**
 * @fileoverview Thread Notifications System
 * @description Comprehensive notification management for threads with mentions, replies, and custom settings
 * @author Claude Code Assistant
 * @version 1.0.0
 * 
 * Features:
 * - Thread-specific notification settings
 * - Reply notifications with smart filtering
 * - @mention detection and highlighting
 * - Real-time notification delivery
 * - Notification history and management
 * - Custom notification rules and preferences
 * - Email and in-app notification integration
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/cn';
import {
  Bell,
  BellOff,
  AtSign,
  MessageSquare,
  User,
  Settings,
  Mail,
  Smartphone,
  Clock,
  Check,
  X,
  Filter,
  Search,
  MoreVertical,
  Volume2,
  VolumeX,
  Eye,
  EyeOff
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '@/lib/toast';

interface ThreadNotificationSettings {
  threadId: string;
  userEmail: string;
  settings: {
    allReplies: boolean;
    mentionsOnly: boolean;
    disabled: boolean;
    emailNotifications: boolean;
    pushNotifications: boolean;
    soundEnabled: boolean;
    frequency: 'immediate' | 'digest' | 'daily';
  };
  customRules: {
    keywords: string[];
    userFilters: string[];
    timeRestrictions: {
      enabled: boolean;
      startTime: string;
      endTime: string;
      timezone: string;
    };
  };
}

interface ThreadNotification {
  id: string;
  threadId: string;
  type: 'reply' | 'mention' | 'thread_update' | 'participant_joined';
  title: string;
  message: string;
  userEmail: string;
  userName?: string;
  userAvatar?: string;
  createdAt: Date;
  readAt?: Date;
  actionUrl?: string;
  metadata: {
    channelId: string;
    channelName: string;
    messageId?: string;
    mentionedUsers?: string[];
    originalContent?: string;
  };
}

interface ThreadNotificationsProps {
  threadId?: string;
  userEmail: string;
  notifications: ThreadNotification[];
  settings: ThreadNotificationSettings[];
  onUpdateSettings?: (threadId: string, settings: ThreadNotificationSettings['settings']) => void;
  onMarkAsRead?: (notificationIds: string[]) => void;
  onMarkAllAsRead?: () => void;
  onDeleteNotification?: (notificationId: string) => void;
  className?: string;
}

// Mention Detection and Highlighting
export const detectMentions = (content: string): { text: string; mentions: string[] } => {
  const mentionRegex = /@([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|\w+)/g;
  const mentions: string[] = [];
  
  const processedText = content.replace(mentionRegex, (match, username) => {
    mentions.push(username);
    return `<span class="mention">@${username}</span>`;
  });

  return { text: processedText, mentions };
};

// Notification Item Component
const NotificationItem: React.FC<{
  notification: ThreadNotification;
  onMarkAsRead?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
}> = ({ notification, onMarkAsRead, onDelete, onClick }) => {
  const isUnread = !notification.readAt;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'mention':
        return <AtSign className="h-4 w-4 text-blue-500" />;
      case 'reply':
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      case 'thread_update':
        return <Settings className="h-4 w-4 text-orange-500" />;
      case 'participant_joined':
        return <User className="h-4 w-4 text-purple-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        isUnread && "border-l-4 border-l-blue-500 bg-blue-50/50"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="text-sm">
                {notification.userName?.charAt(0) || notification.userEmail.charAt(0)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {getNotificationIcon(notification.type)}
                <span className="font-medium text-sm">{notification.title}</span>
                {isUnread && (
                  <Badge variant="default" className="h-4 text-xs">
                    New
                  </Badge>
                )}
              </div>

              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                {notification.message}
              </p>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                </span>
                
                {notification.metadata.channelName && (
                  <>
                    <span>•</span>
                    <span>#{notification.metadata.channelName}</span>
                  </>
                )}
              </div>

              {notification.metadata.mentionedUsers && notification.metadata.mentionedUsers.length > 0 && (
                <div className="flex items-center gap-1 mt-2">
                  <AtSign className="h-3 w-3 text-blue-500" />
                  <span className="text-xs text-blue-600">
                    Mentioned: {notification.metadata.mentionedUsers.join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {isUnread && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead?.();
                }}
                className="h-6 w-6 p-0"
                title="Mark as read"
              >
                <Check className="h-3 w-3" />
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.();
              }}
              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
              title="Delete notification"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Thread Notification Settings Component
const ThreadNotificationSettingsDialog: React.FC<{
  threadId: string;
  settings: ThreadNotificationSettings['settings'];
  customRules: ThreadNotificationSettings['customRules'];
  onSave: (settings: ThreadNotificationSettings['settings']) => void;
  trigger: React.ReactNode;
}> = ({ threadId, settings, customRules, onSave, trigger }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [isOpen, setIsOpen] = useState(false);

  const handleSave = () => {
    onSave(localSettings);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Thread Notifications
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Settings */}
          <div className="space-y-4">
            <h4 className="font-medium">Notification Types</h4>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">All replies</p>
                <p className="text-xs text-muted-foreground">Get notified for every reply</p>
              </div>
              <Switch
                checked={localSettings.allReplies}
                onCheckedChange={(checked) => 
                  setLocalSettings(prev => ({
                    ...prev,
                    allReplies: checked,
                    mentionsOnly: checked ? false : prev.mentionsOnly,
                    disabled: checked ? false : prev.disabled
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Mentions only</p>
                <p className="text-xs text-muted-foreground">Only when you're mentioned</p>
              </div>
              <Switch
                checked={localSettings.mentionsOnly}
                onCheckedChange={(checked) => 
                  setLocalSettings(prev => ({
                    ...prev,
                    mentionsOnly: checked,
                    allReplies: checked ? false : prev.allReplies,
                    disabled: checked ? false : prev.disabled
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Disabled</p>
                <p className="text-xs text-muted-foreground">Turn off all notifications</p>
              </div>
              <Switch
                checked={localSettings.disabled}
                onCheckedChange={(checked) => 
                  setLocalSettings(prev => ({
                    ...prev,
                    disabled: checked,
                    allReplies: checked ? false : prev.allReplies,
                    mentionsOnly: checked ? false : prev.mentionsOnly
                  }))
                }
              />
            </div>
          </div>

          {/* Delivery Settings */}
          <div className="space-y-4">
            <h4 className="font-medium">Delivery Options</h4>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span className="text-sm">Email notifications</span>
              </div>
              <Switch
                checked={localSettings.emailNotifications}
                onCheckedChange={(checked) => 
                  setLocalSettings(prev => ({ ...prev, emailNotifications: checked }))
                }
                disabled={localSettings.disabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                <span className="text-sm">Push notifications</span>
              </div>
              <Switch
                checked={localSettings.pushNotifications}
                onCheckedChange={(checked) => 
                  setLocalSettings(prev => ({ ...prev, pushNotifications: checked }))
                }
                disabled={localSettings.disabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                <span className="text-sm">Sound alerts</span>
              </div>
              <Switch
                checked={localSettings.soundEnabled}
                onCheckedChange={(checked) => 
                  setLocalSettings(prev => ({ ...prev, soundEnabled: checked }))
                }
                disabled={localSettings.disabled}
              />
            </div>
          </div>

          {/* Frequency Settings */}
          <div className="space-y-4">
            <h4 className="font-medium">Frequency</h4>
            
            <div className="space-y-2">
              {[
                { value: 'immediate', label: 'Immediate', desc: 'Get notified right away' },
                { value: 'digest', label: 'Digest', desc: 'Bundled notifications every hour' },
                { value: 'daily', label: 'Daily', desc: 'Daily summary at 9 AM' },
              ].map((option) => (
                <div
                  key={option.value}
                  className={cn(
                    "p-3 border rounded-lg cursor-pointer transition-colors",
                    localSettings.frequency === option.value 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:bg-muted/50"
                  )}
                  onClick={() => setLocalSettings(prev => ({ 
                    ...prev, 
                    frequency: option.value as 'immediate' | 'digest' | 'daily' 
                  }))}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{option.label}</p>
                      <p className="text-xs text-muted-foreground">{option.desc}</p>
                    </div>
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2",
                      localSettings.frequency === option.value 
                        ? "border-primary bg-primary" 
                        : "border-border"
                    )}>
                      {localSettings.frequency === option.value && (
                        <div className="w-full h-full rounded-full bg-white scale-50" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button onClick={handleSave} className="flex-1">
              Save Settings
            </Button>
            <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Main Thread Notifications Component
export function ThreadNotifications({
  threadId,
  userEmail,
  notifications,
  settings,
  onUpdateSettings,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  className,
}: ThreadNotificationsProps) {
  const [filter, setFilter] = useState<'all' | 'unread' | 'mentions' | 'replies'>('all');

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.readAt;
    if (filter === 'mentions') return notification.type === 'mention';
    if (filter === 'replies') return notification.type === 'reply';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.readAt).length;

  // Handle notification click
  const handleNotificationClick = useCallback((notification: ThreadNotification) => {
    // Mark as read if unread
    if (!notification.readAt) {
      onMarkAsRead?([notification.id]);
    }

    // Navigate to the thread/message
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  }, [onMarkAsRead]);

  // Handle settings update
  const handleSettingsUpdate = useCallback((threadId: string, newSettings: ThreadNotificationSettings['settings']) => {
    onUpdateSettings?.(threadId, newSettings);
    toast.success("Your notification preferences have been saved.");
  }, [onUpdateSettings]);

  // Get thread settings
  const getThreadSettings = (threadId: string) => {
    return settings.find(s => s.threadId === threadId) || {
      threadId,
      userEmail,
      settings: {
        allReplies: true,
        mentionsOnly: false,
        disabled: false,
        emailNotifications: true,
        pushNotifications: true,
        soundEnabled: true,
        frequency: 'immediate' as const,
      },
      customRules: {
        keywords: [],
        userFilters: [],
        timeRestrictions: {
          enabled: false,
          startTime: '09:00',
          endTime: '17:00',
          timezone: 'UTC',
        },
      },
    };
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="destructive">
                {unreadCount}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {threadId && (
              <ThreadNotificationSettingsDialog
                threadId={threadId}
                settings={getThreadSettings(threadId).settings}
                customRules={getThreadSettings(threadId).customRules}
                onSave={(settings) => handleSettingsUpdate(threadId, settings)}
                trigger={
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-1" />
                    Settings
                  </Button>
                }
              />
            )}

            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={onMarkAllAsRead}>
                <Check className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'All', count: notifications.length },
            { key: 'unread', label: 'Unread', count: unreadCount },
            { key: 'mentions', label: 'Mentions', count: notifications.filter(n => n.type === 'mention').length },
            { key: 'replies', label: 'Replies', count: notifications.filter(n => n.type === 'reply').length },
          ].map((filterOption) => (
            <Button
              key={filterOption.key}
              variant={filter === filterOption.key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(filterOption.key as any)}
              className="text-xs"
            >
              {filterOption.label}
              {filterOption.count > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 text-xs">
                  {filterOption.count}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">
                {filter === 'all' ? 'No notifications' : `No ${filter} notifications`}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={() => onMarkAsRead?.([notification.id])}
                onDelete={() => onDeleteNotification?.(notification.id)}
                onClick={() => handleNotificationClick(notification)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default ThreadNotifications;