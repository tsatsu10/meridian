import React, { useState, useMemo } from 'react';
import { Bell, Filter, Search, Trash2, Check, Pin, Archive, Settings, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotificationStore, getNotificationIcon, getNotificationColor, type Notification } from '@/store/notifications';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface NotificationCenterProps {
  className?: string;
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    pinNotification,
    unpinNotification,
    getUnreadNotifications,
    getPinnedNotifications,
    getNotificationsByType,
    getNotificationsByPriority
  } = useNotificationStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('all');

  // Filter notifications based on search and filters
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    // Filter by tab
    switch (activeTab) {
      case 'unread':
        filtered = getUnreadNotifications();
        break;
      case 'pinned':
        filtered = getPinnedNotifications();
        break;
      case 'all':
      default:
        filtered = notifications;
        break;
    }

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(n => n.type === selectedType);
    }

    // Filter by priority
    if (selectedPriority !== 'all') {
      filtered = filtered.filter(n => n.priority === selectedPriority);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [notifications, activeTab, selectedType, selectedPriority, searchQuery, getUnreadNotifications, getPinnedNotifications]);

  // Bulk actions
  const handleSelectAll = () => {
    if (selectedNotifications.size === filteredNotifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(filteredNotifications.map(n => n.id)));
    }
  };

  const handleBulkMarkAsRead = () => {
    selectedNotifications.forEach(id => markAsRead(id));
    setSelectedNotifications(new Set());
  };

  const handleBulkDelete = () => {
    selectedNotifications.forEach(id => deleteNotification(id));
    setSelectedNotifications(new Set());
  };

  const handleBulkPin = () => {
    selectedNotifications.forEach(id => {
      const notification = notifications.find(n => n.id === id);
      if (notification && !notification.isPinned) {
        pinNotification(id);
      }
    });
    setSelectedNotifications(new Set());
  };

  const toggleNotificationSelection = (notificationId: string) => {
    const newSelected = new Set(selectedNotifications);
    if (newSelected.has(notificationId)) {
      newSelected.delete(notificationId);
    } else {
      newSelected.add(notificationId);
    }
    setSelectedNotifications(newSelected);
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            Manage your notifications and stay up to date
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          {unreadCount > 0 && (
            <Button onClick={markAllAsRead} size="sm">
              <Check className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Total</h3>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notifications.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Unread</h3>
            <Badge variant="destructive" className="h-6 w-6 rounded-full p-0 flex items-center justify-center">
              !
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unreadCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Pinned</h3>
            <Pin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getPinnedNotifications().length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">High Priority</h3>
            <Badge variant="destructive" className="h-6 w-6 rounded-full p-0 flex items-center justify-center">
              ⚡
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getNotificationsByPriority('urgent').length + getNotificationsByPriority('high').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="task_assigned">Task assigned</SelectItem>
            <SelectItem value="task_updated">Task updated</SelectItem>
            <SelectItem value="comment_added">Comments</SelectItem>
            <SelectItem value="mention">Mentions</SelectItem>
            <SelectItem value="project_update">Project updates</SelectItem>
            <SelectItem value="message">Messages</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedPriority} onValueChange={setSelectedPriority}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Actions */}
      {selectedNotifications.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selectedNotifications.size} notification{selectedNotifications.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleBulkMarkAsRead}>
              <Check className="h-4 w-4 mr-2" />
              Mark as read
            </Button>
            <Button variant="outline" size="sm" onClick={handleBulkPin}>
              <Pin className="h-4 w-4 mr-2" />
              Pin
            </Button>
            <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedNotifications(new Set())}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Notifications List */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            All
            <Badge variant="secondary" className="ml-2">
              {notifications.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="unread">
            Unread
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pinned">
            Pinned
            <Badge variant="secondary" className="ml-2">
              {getPinnedNotifications().length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {/* Select All */}
          {filteredNotifications.length > 0 && (
            <div className="flex items-center space-x-2 p-4 border rounded-lg">
              <Checkbox
                checked={selectedNotifications.size === filteredNotifications.length && filteredNotifications.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm">
                Select all {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Notification Items */}
          <ScrollArea className="h-[600px]">
            <div className="space-y-2">
              {filteredNotifications.length > 0 ? (
                filteredNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    isSelected={selectedNotifications.has(notification.id)}
                    onSelect={() => toggleNotificationSelection(notification.id)}
                    onMarkAsRead={() => markAsRead(notification.id)}
                    onPin={() => pinNotification(notification.id)}
                    onUnpin={() => unpinNotification(notification.id)}
                    onDelete={() => deleteNotification(notification.id)}
                  />
                ))
              ) : (
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No notifications found</h3>
                  <p className="text-muted-foreground">
                    {searchQuery || selectedType !== 'all' || selectedPriority !== 'all'
                      ? 'Try adjusting your search or filters'
                      : 'You\'re all caught up!'}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification;
  isSelected: boolean;
  onSelect: () => void;
  onMarkAsRead: () => void;
  onPin: () => void;
  onUnpin: () => void;
  onDelete: () => void;
}

function NotificationItem({
  notification,
  isSelected,
  onSelect,
  onMarkAsRead,
  onPin,
  onUnpin,
  onDelete
}: NotificationItemProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <Card
      className={cn(
        "transition-all duration-200 cursor-pointer",
        "hover:shadow-md",
        !notification.isRead && "border-l-4 border-l-blue-500 bg-blue-50/30",
        isSelected && "ring-2 ring-blue-500",
        getNotificationColor(notification.priority)
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            className="mt-1"
          />

          <div className="flex-shrink-0 mt-0.5">
            <span className="text-lg">{getNotificationIcon(notification.type)}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className={cn(
                "text-sm font-medium truncate",
                !notification.isRead && "font-semibold"
              )}>
                {notification.title}
              </h3>
              {notification.isPinned && (
                <Pin className="h-3 w-3 text-blue-500 flex-shrink-0" />
              )}
              {!notification.isRead && (
                <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0" />
              )}
              <Badge
                variant="outline"
                className={cn(
                  "text-xs px-1 py-0 ml-auto",
                  notification.priority === 'urgent' && "border-red-500 text-red-600",
                  notification.priority === 'high' && "border-orange-500 text-orange-600",
                  notification.priority === 'medium' && "border-blue-500 text-blue-600",
                  notification.priority === 'low' && "border-gray-500 text-gray-600"
                )}
              >
                {notification.priority}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
              {notification.message}
            </p>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
              </span>
              <span className="capitalize">{notification.type.replace('_', ' ')}</span>
            </div>
          </div>

          {/* Action Buttons */}
          {showActions && (
            <div className="flex items-center space-x-1">
              {!notification.isRead && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsRead();
                  }}
                  title="Mark as read"
                >
                  <Check className="h-4 w-4" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  notification.isPinned ? onUnpin() : onPin();
                }}
                title={notification.isPinned ? "Unpin" : "Pin"}
              >
                <Pin className={cn(
                  "h-4 w-4",
                  notification.isPinned && "text-blue-500"
                )} />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}