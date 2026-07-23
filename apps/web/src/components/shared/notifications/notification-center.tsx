import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bell, AlertTriangle, Target, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { format, isToday, isYesterday } from "date-fns";
import useGetNotifications from "@/hooks/queries/notification/use-get-notifications";
import useMarkNotificationAsRead from "@/hooks/mutations/notification/use-mark-notification-as-read";
import useMarkAllNotificationsAsRead from "@/hooks/mutations/notification/use-mark-all-notifications-as-read";
import useClearNotifications from "@/hooks/mutations/notification/use-clear-notifications";
import type { Notification } from "@/types/notification";

// @epic-2.3-notifications: Unified notification system for all alerts
// @epic-2.4-risk-detection: Risk alert notifications

interface NotificationCenterProps {
  className?: string;
  variant?: "icon" | "button";
  showTitle?: boolean;
  maxNotifications?: number;
}

const isCritical = (notification: Notification) =>
  notification.priority === "urgent" || notification.priority === "high";

const getNotificationIcon = (notification: Notification) => {
  if (isCritical(notification)) {
    return <AlertTriangle className="h-4 w-4 text-red-500" />;
  }

  if (notification.type === "task") {
    return <Target className="h-4 w-4 text-blue-500" />;
  }

  return <Bell className="h-4 w-4 text-gray-500" />;
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "urgent":
      return "bg-red-100 text-red-800 border-red-200";
    case "high":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "low":
      return "bg-blue-100 text-blue-800 border-blue-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const formatNotificationTime = (createdAt: string) => {
  const date = new Date(createdAt);

  if (isToday(date)) {
    return format(date, "h:mm a");
  }

  if (isYesterday(date)) {
    return "Yesterday";
  }

  return format(date, "MMM dd");
};

export default function NotificationCenter({
  className,
  variant = "icon",
  showTitle = true,
  maxNotifications = 50,
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { data: allNotifications, isLoading } = useGetNotifications();
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllReadMutation = useMarkAllNotificationsAsRead();
  const clearAllMutation = useClearNotifications();

  const notifications = useMemo(
    () => (allNotifications ?? []).slice(0, maxNotifications),
    [allNotifications, maxNotifications],
  );

  const groupedNotifications = useMemo(() => {
    const groups: { [key: string]: Notification[] } = {};

    for (const notification of notifications) {
      const date = new Date(notification.createdAt);
      let groupKey: string;

      if (isToday(date)) {
        groupKey = "Today";
      } else if (isYesterday(date)) {
        groupKey = "Yesterday";
      } else {
        groupKey = format(date, "MMMM dd, yyyy");
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(notification);
    }

    return groups;
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const criticalCount = notifications.filter(isCritical).length;

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
  };

  const handleClearAll = () => {
    clearAllMutation.mutate();
  };

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate();
  };

  const TriggerComponent =
    variant === "button" ? (
      <Button variant="outline" size="sm" className={cn("relative", className)}>
        <Bell className="h-4 w-4 mr-2" />
        {showTitle && "Notifications"}
        {unreadCount > 0 && (
          <Badge
            variant="secondary"
            className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-500 text-white border-red-500"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
        {criticalCount > 0 && (
          <div className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
        )}
      </Button>
    ) : (
      <Button
        variant="ghost"
        size="icon"
        className={cn("relative", className)}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge
            variant="secondary"
            className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-500 text-white border-red-500"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
        {criticalCount > 0 && (
          <div className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
        )}
      </Button>
    );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>{TriggerComponent}</PopoverTrigger>
      <PopoverContent
        className="w-96 p-0"
        align="end"
        side="bottom"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold">Notifications</h3>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
                : "All caught up!"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllRead}
                  disabled={unreadCount === 0 || markAllReadMutation.isPending}
                  className="text-xs"
                >
                  Mark all read
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClearAll}
                  disabled={clearAllMutation.isPending}
                  className="h-7 w-7"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Critical Alerts Section */}
        {criticalCount > 0 && (
          <div className="p-4 border-b bg-red-50/50">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="font-medium text-red-700 text-sm">
                Critical Alerts ({criticalCount})
              </span>
            </div>
            <div className="space-y-2">
              {notifications
                .filter(isCritical)
                .slice(0, 2)
                .map((notification) => (
                  <div
                    key={notification.id}
                    className="p-2 bg-white border border-red-200 rounded-lg cursor-pointer hover:bg-red-50 transition-colors"
                    // biome-ignore lint/a11y/useSemanticElements: styled clickable notification row, keep as div
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleNotificationClick(notification);
                      }
                    }}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-2">
                      {getNotificationIcon(notification)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-red-800 line-clamp-1">
                          {notification.title}
                        </p>
                        <p className="text-xs text-red-600 line-clamp-2 mt-1">
                          {notification.content ?? notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <Badge
                            className={cn(
                              "text-xs",
                              getPriorityColor(
                                notification.priority ?? "normal",
                              ),
                            )}
                          >
                            {notification.priority}
                          </Badge>
                          <span className="text-xs text-red-500">
                            {formatNotificationTime(notification.createdAt)}
                          </span>
                        </div>
                      </div>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-red-500 rounded-full mt-2" />
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Notifications List */}
        <ScrollArea className="max-h-96">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
              <p className="text-xs">You'll see auto-updates and alerts here</p>
            </div>
          ) : (
            <div className="p-2">
              {Object.entries(groupedNotifications).map(
                ([groupKey, groupNotifications]) => (
                  <div key={groupKey} className="mb-4">
                    <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-2 py-1 mb-2">
                      <h4 className="font-medium text-sm text-muted-foreground">
                        {groupKey}
                      </h4>
                    </div>
                    <div className="space-y-2">
                      {groupNotifications
                        .filter((n) => !isCritical(n))
                        .map((notification) => (
                          <div
                            key={notification.id}
                            className={cn(
                              "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                              notification.isRead
                                ? "bg-muted/30 hover:bg-muted/50"
                                : "bg-blue-50 border-blue-200 hover:bg-blue-100",
                            )}
                            // biome-ignore lint/a11y/useSemanticElements: styled clickable notification row, keep as div
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleNotificationClick(notification);
                              }
                            }}
                            onClick={() =>
                              handleNotificationClick(notification)
                            }
                          >
                            <div className="mt-0.5">
                              {getNotificationIcon(notification)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4
                                className={cn(
                                  "font-medium text-sm line-clamp-1",
                                  !notification.isRead && "font-semibold",
                                )}
                              >
                                {notification.title}
                              </h4>
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                {notification.content ?? notification.message}
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-xs",
                                    getPriorityColor(
                                      notification.priority ?? "normal",
                                    ),
                                  )}
                                >
                                  {notification.priority}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatNotificationTime(
                                    notification.createdAt,
                                  )}
                                </span>
                              </div>
                            </div>
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {(allNotifications?.length ?? 0) > maxNotifications && (
          <div className="p-4 border-t">
            <Button variant="ghost" size="sm" className="w-full text-xs">
              View older notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
