// Phase 2: Team Collaboration Hub - Team Notification Center
// Centralized notification and mention management

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Bell,
  BellRing,
  AtSign,
  MessageCircle,
  Users,
  Settings,
  Check,
  CheckCheck,
  X,
  Filter,
  Megaphone,
  AlertCircle,
  Info,
  Clock,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDistanceToNow } from "date-fns";
import { toast } from '@/lib/toast';

// Hooks
import {
  useTeamNotifications,
  useMarkNotificationsAsRead,
  useUnreadNotificationCount,
  useTeamNotificationsRealtime,
  useNotificationManager,
  type TeamNotification,
} from "@/hooks/use-team-notifications";
import { useAuth } from '@/components/providers/unified-context-provider';
import { logger } from "../../lib/logger";

interface TeamNotificationCenterProps {
  className?: string;
  showAsPopover?: boolean;
}

export default function TeamNotificationCenter({
  className,
  showAsPopover = true,
}: TeamNotificationCenterProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "mention" | "team">("all");
  const [readFilter, setReadFilter] = useState<"all" | "unread">("all");

  // API hooks
  const { data: notificationsData, isLoading } = useTeamNotifications({
    type: filter === "all" ? "all" : filter,
    read: readFilter === "all" ? "all" : "false",
    limit: 50,
  });

  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const { markAllAsRead, markAsRead } = useNotificationManager();

  // Real-time updates
  useTeamNotificationsRealtime(user?.userEmail);

  const notifications = notificationsData?.data?.notifications || [];
  const totalUnread = notificationsData?.data?.unreadCount || 0;

  // Handle mark as read
  const handleMarkAsRead = (notificationIds: string[]) => {
    markAsRead(notificationIds);
  };

  // Handle mark all as read
  const handleMarkAllAsRead = () => {
    if (notifications.length > 0) {
      markAllAsRead(notifications);
      toast.success("All notifications marked as read");
    }
  };

  // Get notification icon
  const getNotificationIcon = (type: string, priority: string) => {
    const iconMap: Record<string, React.ComponentType<any>> = {
      mention: AtSign,
      team: Users,
      system: Bell,
      welcome: Users,
      task_assignment: MessageCircle,
      deadline_reminder: Clock,
      announcement: Megaphone,
    };

    const IconComponent = iconMap[type] || Bell;
    
    // Color based on priority
    const colorMap: Record<string, string> = {
      high: "text-red-500",
      medium: "text-blue-500",
      low: "text-gray-500",
    };

    const colorClass = colorMap[priority] || "text-gray-500";

    return <IconComponent className={cn("w-4 h-4", colorClass)} />;
  };

  // Get notification background color
  const getNotificationBg = (notification: TeamNotification) => {
    if (notification.isRead) return "bg-background";
    
    switch (notification.priority) {
      case "high":
        return "bg-red-50 border-red-200";
      case "medium":
        return "bg-blue-50 border-blue-200";
      default:
        return "bg-muted/30";
    }
  };

  const NotificationContent = () => (
    <div className="w-96">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          <h3 className="font-semibold">Notifications</h3>
          {totalUnread > 0 && (
            <Badge variant="destructive" className="text-xs">
              {totalUnread}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Filter dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Filter className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFilter("all")}>
                <Bell className="w-4 h-4 mr-2" />
                All Notifications
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("mention")}>
                <AtSign className="w-4 h-4 mr-2" />
                Mentions Only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("team")}>
                <Users className="w-4 h-4 mr-2" />
                Team Updates
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setReadFilter("all")}>
                <CheckCheck className="w-4 h-4 mr-2" />
                All
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setReadFilter("unread")}>
                <BellRing className="w-4 h-4 mr-2" />
                Unread Only
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mark all as read */}
          {totalUnread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              title="Mark all as read"
            >
              <CheckCheck className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Notifications list */}
      <ScrollArea className="h-96">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-sm text-muted-foreground">Loading notifications...</div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <Bell className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No notifications</p>
              <p className="text-xs text-muted-foreground">
                {filter === "mention" 
                  ? "No mentions yet"
                  : readFilter === "unread"
                  ? "All caught up!"
                  : "You're all set"
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                getNotificationIcon={getNotificationIcon}
                getNotificationBg={getNotificationBg}
                onMarkAsRead={() => handleMarkAsRead([notification.id])}
                onNavigate={() => {
                  // Handle navigation to the source
                  if (notification.metadata.teamId) {
                    // Navigate to team chat or relevant section
                    logger.info("Navigate to team:");
                  }
                  setIsOpen(false);
                }}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {notifications.length} of {notificationsData?.data?.pagination?.total || 0} notifications
          </span>
          <Button variant="ghost" size="sm" className="h-6 text-xs">
            <Settings className="w-3 h-3 mr-1" />
            Settings
          </Button>
        </div>
      </div>
    </div>
  );

  if (showAsPopover) {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className={cn("relative", className)}>
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <NotificationContent />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Card className={className}>
      <NotificationContent />
    </Card>
  );
}

// Notification Item Component
interface NotificationItemProps {
  notification: TeamNotification;
  getNotificationIcon: (type: string, priority: string) => React.ReactNode;
  getNotificationBg: (notification: TeamNotification) => string;
  onMarkAsRead: () => void;
  onNavigate: () => void;
}

function NotificationItem({
  notification,
  getNotificationIcon,
  getNotificationBg,
  onMarkAsRead,
  onNavigate,
}: NotificationItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={cn(
        "p-3 hover:bg-muted/50 cursor-pointer transition-colors group relative",
        getNotificationBg(notification)
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onNavigate}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {getNotificationIcon(notification.type, notification.priority)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className={cn(
                "text-sm font-medium leading-tight",
                !notification.isRead && "font-semibold"
              )}>
                {notification.title}
              </h4>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {notification.message}
              </p>
            </div>

            {/* Actions */}
            <div className={cn(
              "flex items-center gap-1 ml-2 opacity-0 transition-opacity",
              (isHovered || !notification.isRead) && "opacity-100"
            )}>
              {!notification.isRead && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsRead();
                  }}
                  title="Mark as read"
                >
                  <Check className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>
                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
              </span>
              
              {notification.metadata.teamName && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {notification.metadata.teamName}
                  </span>
                </>
              )}
            </div>

            {!notification.isRead && (
              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}