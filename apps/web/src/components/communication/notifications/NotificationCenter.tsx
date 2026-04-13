// @epic-3.5-communication: Notification center for managing chat alerts and mentions
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  Bell, 
  BellOff, 
  Search, 
  Filter,
  Check,
  CheckCheck,
  Trash2,
  MessageSquare,
  AtSign,
  Megaphone,
  UserPlus,
  Calendar,
  Settings,
  X,
  Clock,
  Pin,
  Archive,
  Volume2,
  VolumeX,
  Smartphone,
  Mail,
  Smile,
  MessageCircle
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { TeamMember } from "../chat/ChatInterface";
import useAuth from "@/components/providers/auth-provider/hooks/use-auth";

// Icon wrappers
const BellIcon = Bell as React.FC<{ className?: string }>;
const BellOffIcon = BellOff as React.FC<{ className?: string }>;
const SearchIcon = Search as React.FC<{ className?: string }>;
const FilterIcon = Filter as React.FC<{ className?: string }>;
const CheckIcon = Check as React.FC<{ className?: string }>;
const CheckCheckIcon = CheckCheck as React.FC<{ className?: string }>;
const Trash2Icon = Trash2 as React.FC<{ className?: string }>;
const MessageSquareIcon = MessageSquare as React.FC<{ className?: string }>;
const AtSignIcon = AtSign as React.FC<{ className?: string }>;
const MegaphoneIcon = Megaphone as React.FC<{ className?: string }>;
const UserPlusIcon = UserPlus as React.FC<{ className?: string }>;
const CalendarIcon = Calendar as React.FC<{ className?: string }>;
const SettingsIcon = Settings as React.FC<{ className?: string }>;
const XIcon = X as React.FC<{ className?: string }>;
const ClockIcon = Clock as React.FC<{ className?: string }>;
const PinIcon = Pin as React.FC<{ className?: string }>;
const ArchiveIcon = Archive as React.FC<{ className?: string }>;
const Volume2Icon = Volume2 as React.FC<{ className?: string }>;
const VolumeXIcon = VolumeX as React.FC<{ className?: string }>;
const SmartphoneIcon = Smartphone as React.FC<{ className?: string }>;
const MailIcon = Mail as React.FC<{ className?: string }>;
const SmileIcon = Smile as React.FC<{ className?: string }>;
const MessageCircleIcon = MessageCircle as React.FC<{ className?: string }>;

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  teamMembers?: TeamMember[];
  onNavigateToChannel?: (channelId: string, messageId?: string) => void;
  notifications?: any[];
}

type NotificationType = 
  | 'message' 
  | 'mention' 
  | 'dm' 
  | 'announcement' 
  | 'channel_invite' 
  | 'team_update'
  | 'reaction'
  | 'thread_reply';

type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';
type NotificationFilter = 'all' | 'unread' | 'mentions' | 'dms' | 'important' | 'today';

interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  channelId?: string;
  channelName?: string;
  messageId?: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  timestamp: Date;
  isRead: boolean;
  isImportant: boolean;
  actionData?: {
    channelInvite?: {
      channelId: string;
      channelName: string;
      inviterId: string;
    };
    mention?: {
      messageText: string;
      mentionContext: string;
    };
    reaction?: {
      emoji: string;
      messageText: string;
    };
  };
}

// Sample notifications data
const sampleNotifications: Notification[] = [
  {
    id: "notif-1",
    type: "mention",
    priority: "high",
    title: "You were mentioned in #general",
    message: "Sarah mentioned you: '@mike can you review the new component designs?'",
    channelId: "general",
    channelName: "general",
    messageId: "msg-1",
    senderId: "user-1",
    senderName: "Sarah Chen",
    timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    isRead: false,
    isImportant: true,
    actionData: {
      mention: {
        messageText: "@mike can you review the new component designs?",
        mentionContext: "in general discussion about UI components"
      }
    }
  },
  {
    id: "notif-2",
    type: "dm",
    priority: "medium",
    title: "New direct message from Lisa Wang",
    message: "Hey! Quick question about the project timeline...",
    senderId: "user-3",
    senderName: "Lisa Wang",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    isRead: false,
    isImportant: false
  },
  {
    id: "notif-3",
    type: "channel_invite",
    priority: "medium",
    title: "Invited to #design-reviews",
    message: "David invited you to join the design-reviews channel",
    channelId: "design-reviews",
    channelName: "design-reviews",
    senderId: "user-4",
    senderName: "David Kim",
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    isRead: true,
    isImportant: false,
    actionData: {
      channelInvite: {
        channelId: "design-reviews",
        channelName: "design-reviews",
        inviterId: "user-4"
      }
    }
  },
  {
    id: "notif-4",
    type: "announcement",
    priority: "high",
    title: "New company announcement",
    message: "Important: Team meeting scheduled for tomorrow at 2 PM",
    channelId: "announcements",
    channelName: "announcements",
    senderId: "user-1",
    senderName: "Sarah Chen",
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    isRead: false,
    isImportant: true
  },
  {
    id: "notif-5",
    type: "reaction",
    priority: "low",
    title: "Reaction to your message",
    message: "Alex reacted with 👍 to your message in #general",
    channelId: "general",
    channelName: "general",
    messageId: "msg-5",
    senderId: "user-7",
    senderName: "Alex Thompson",
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
    isRead: true,
    isImportant: false,
    actionData: {
      reaction: {
        emoji: "👍",
        messageText: "Great work on the new feature implementation!"
      }
    }
  }
];

export default function NotificationCenter({
  isOpen,
  onClose,
  teamMembers = [],
  onNavigateToChannel,
  notifications: externalNotifications = []
}: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>(
    externalNotifications.length > 0 ? 
      externalNotifications.map(notif => ({
        ...notif,
        timestamp: notif.timestamp || notif.createdAt ? new Date(notif.timestamp || notif.createdAt) : new Date(),
        type: notif.type || 'message',
        priority: notif.priority || 'medium',
        senderName: notif.senderName || notif.title || 'Unknown',
        senderId: notif.senderId || notif.userEmail || 'unknown',
        message: notif.message || notif.content || '',
        isImportant: notif.isImportant || false
      })) : 
      sampleNotifications
  );
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');
  const [searchTerm, setSearchTerm] = useState("");
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [showSettings, setShowSettings] = useState(false);
  
  const { user } = useAuth();

  // Filter notifications based on active filter and search
  const filteredNotifications = notifications
    .filter(notification => notification && notification.timestamp) // Filter out invalid notifications
    .filter(notification => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        notification.title.toLowerCase().includes(searchLower) ||
        notification.message.toLowerCase().includes(searchLower) ||
        notification.senderName.toLowerCase().includes(searchLower) ||
        (notification.channelName && notification.channelName.toLowerCase().includes(searchLower));
      
      if (!matchesSearch) return false;
    }

    // Type/status filters
    switch (activeFilter) {
      case 'unread':
        return !notification.isRead;
      case 'mentions':
        return notification.type === 'mention';
      case 'dms':
        return notification.type === 'dm';
      case 'important':
        return notification.isImportant;
      case 'today':
        const today = new Date();
        const notifDate = notification.timestamp;
        if (!notifDate || !(notifDate instanceof Date)) return false;
        return notifDate.toDateString() === today.toDateString();
      case 'all':
      default:
        return true;
    }
  }).sort((a, b) => {
    // Sort by timestamp, newest first - add null checks
    if (!a.timestamp || !b.timestamp) return 0;
    return b.timestamp.getTime() - a.timestamp.getTime();
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const importantCount = notifications.filter(n => n.isImportant).length;

  const formatTimestamp = (date: Date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return "unknown time";
    }
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'mention':
        return <AtSignIcon className="h-4 w-4 text-blue-500" />;
      case 'dm':
        return <MessageSquareIcon className="h-4 w-4 text-green-500" />;
      case 'announcement':
        return <MegaphoneIcon className="h-4 w-4 text-orange-500" />;
      case 'channel_invite':
        return <UserPlusIcon className="h-4 w-4 text-purple-500" />;
      case 'team_update':
        return <CalendarIcon className="h-4 w-4 text-indigo-500" />;
      case 'reaction':
        return <SmileIcon className="h-4 w-4 text-yellow-500" />;
      case 'thread_reply':
        return <MessageCircleIcon className="h-4 w-4 text-teal-500" />;
      default:
        return <BellIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500';
      case 'high':
        return 'border-l-orange-500';
      case 'medium':
        return 'border-l-blue-500';
      case 'low':
      default:
        return 'border-l-gray-300';
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      markAsRead([notification.id]);
    }

    // Navigate to channel/message if applicable
    if (notification.channelId && onNavigateToChannel) {
      onNavigateToChannel(notification.channelId, notification.messageId);
      onClose();
    } else {}

    // Handle special actions
    if (notification.type === 'channel_invite' && notification.actionData?.channelInvite) {}
  };

  const markAsRead = (notificationIds: string[]) => {
    setNotifications(prev => prev.map(notification => 
      notificationIds.includes(notification.id) 
        ? { ...notification, isRead: true }
        : notification
    ));};

  const markAllAsRead = () => {
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
    markAsRead(unreadIds);
  };

  const deleteNotifications = (notificationIds: string[]) => {
    setNotifications(prev => prev.filter(n => !notificationIds.includes(n.id)));};

  const toggleNotificationSelection = (notificationId: string) => {
    setSelectedNotifications(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(notificationId)) {
        newSelection.delete(notificationId);
      } else {
        newSelection.add(notificationId);
      }
      return newSelection;
    });
  };

  const handleBulkAction = (action: 'read' | 'delete' | 'important') => {
    const selectedIds = Array.from(selectedNotifications);
    
    switch (action) {
      case 'read':
        markAsRead(selectedIds);
        break;
      case 'delete':
        deleteNotifications(selectedIds);
        break;
      case 'important':
        setNotifications(prev => prev.map(notification => 
          selectedIds.includes(notification.id) 
            ? { ...notification, isImportant: !notification.isImportant }
            : notification
        ));
        break;
    }
    
    setSelectedNotifications(new Set());
    setIsSelectionMode(false);
  };

  const handleChannelInviteAction = (notificationId: string, action: 'accept' | 'decline') => {
    const notification = notifications.find(n => n.id === notificationId);
    if (notification?.actionData?.channelInvite) {// Mark as read and remove from list
      markAsRead([notificationId]);
      
      if (action === 'accept' && onNavigateToChannel) {
        // Navigate to the channel
        onNavigateToChannel(notification.actionData.channelInvite.channelId);
        onClose();
      }
    }
  };

  const filterOptions: { value: NotificationFilter; label: string; count?: number; icon?: React.ReactNode }[] = [
    { value: 'all', label: 'All', count: notifications.length, icon: <BellIcon className="h-4 w-4" /> },
    { value: 'unread', label: 'Unread', count: unreadCount, icon: <BellIcon className="h-4 w-4" /> },
    { value: 'mentions', label: 'Mentions', count: notifications.filter(n => n.type === 'mention').length, icon: <AtSignIcon className="h-4 w-4" /> },
    { value: 'dms', label: 'Direct Messages', count: notifications.filter(n => n.type === 'dm').length, icon: <MessageSquareIcon className="h-4 w-4" /> },
    { value: 'important', label: 'Important', count: importantCount, icon: <PinIcon className="h-4 w-4" /> },
    { value: 'today', label: 'Today', icon: <ClockIcon className="h-4 w-4" /> }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] p-0">
        <DialogTitle className="sr-only">
          Notification Center
        </DialogTitle>
        <DialogDescription className="sr-only">
          View and manage your notifications, mentions, and communication alerts
        </DialogDescription>
        <div className="flex h-full">
          {/* Sidebar - Filters */}
          <div className="w-64 bg-muted border-r">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Notifications</h3>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSettings(!showSettings)}
                    className="h-8 w-8 p-0"
                    title="Notification settings"
                  >
                    <SettingsIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-8 w-8 p-0"
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-8"
                />
              </div>
            </div>

            <div className="p-2">
              {unreadCount > 0 && (
                <div className="mb-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={markAllAsRead}
                    className="w-full"
                  >
                    <CheckCheckIcon className="h-4 w-4 mr-2" />
                    Mark All Read
                  </Button>
                </div>
              )}

              <div className="space-y-1">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setActiveFilter(option.value)}
                    className={cn(
                      "w-full flex items-center justify-between p-2 rounded text-sm transition-colors",
                      activeFilter === option.value 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-background/80"
                    )}
                  >
                    <div className="flex items-center space-x-2">
                      {option.icon}
                      <span>{option.label}</span>
                    </div>
                    {option.count !== undefined && option.count > 0 && (
                      <Badge variant="secondary" className="text-xs h-4 px-1">
                        {option.count}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b bg-background">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    {filterOptions.find(f => f.value === activeFilter)?.label} Notifications
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
                    {unreadCount > 0 && ` • ${unreadCount} unread`}
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  {isSelectionMode && selectedNotifications.size > 0 && (
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkAction('read')}
                        title="Mark as read"
                      >
                        <CheckIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkAction('important')}
                        title="Toggle important"
                      >
                        <PinIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkAction('delete')}
                        title="Delete notifications"
                      >
                        <Trash2Icon className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsSelectionMode(!isSelectionMode);
                      setSelectedNotifications(new Set());
                    }}
                  >
                    {isSelectionMode ? 'Cancel' : 'Select'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <BellOffIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No notifications</h3>
                  <p className="text-sm">
                    {searchTerm ? "No notifications match your search" : "You're all caught up!"}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-4 hover:bg-muted/50 transition-colors border-l-4 cursor-pointer",
                        getPriorityColor(notification.priority),
                        !notification.isRead && "bg-blue-50/50 dark:bg-blue-900/10"
                      )}
                      onClick={() => !isSelectionMode && handleNotificationClick(notification)}
                    >
                      <div className="flex items-start space-x-3">
                        {isSelectionMode && (
                          <input
                            type="checkbox"
                            checked={selectedNotifications.has(notification.id)}
                            onChange={() => toggleNotificationSelection(notification.id)}
                            className="mt-1"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <div className="w-full h-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                            {notification.senderName.charAt(0)}
                          </div>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className={cn(
                              "font-medium text-sm truncate",
                              !notification.isRead && "font-semibold"
                            )}>
                              {notification.title}
                            </h4>
                            
                            {notification.isImportant && (
                              <PinIcon className="h-3 w-3 text-orange-500" />
                            )}
                            
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                              <span>{notification.senderName}</span>
                              {notification.channelName && (
                                <>
                                  <span>•</span>
                                  <span>#{notification.channelName}</span>
                                </>
                              )}
                              <span>•</span>
                              <span>{formatTimestamp(notification.timestamp)}</span>
                            </div>
                            
                            {notification.type === 'channel_invite' && !notification.isRead && (
                              <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-6 text-xs"
                                  onClick={() => handleChannelInviteAction(notification.id, 'decline')}
                                >
                                  Decline
                                </Button>
                                <Button 
                                  size="sm" 
                                  className="h-6 text-xs"
                                  onClick={() => handleChannelInviteAction(notification.id, 'accept')}
                                >
                                  Accept
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="absolute inset-0 bg-background z-10">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Notification Settings</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}>
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span>Desktop notifications</span>
                <input type="checkbox" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <span>Email notifications</span>
                <input type="checkbox" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <span>Mobile push notifications</span>
                <input type="checkbox" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <span>Sound notifications</span>
                <input type="checkbox" defaultChecked />
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 