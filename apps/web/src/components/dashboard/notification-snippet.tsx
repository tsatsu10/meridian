// @epic-3.5-communication: Dashboard notification snippet for quick access
// @persona-sarah: PM needs quick visibility of important notifications
// @persona-jennifer: Exec needs summary of team communications

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import useGetNotifications from "@/hooks/queries/notification/use-get-notifications";
import useMarkNotificationAsRead from "@/hooks/mutations/notification/use-mark-notification-as-read";
import { 
  Bell, 
  BellOff, 
  ArrowRight, 
  MessageSquare, 
  AtSign, 
  Megaphone,
  UserPlus,
  CheckCircle,
  AlertTriangle,
  Clock
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";

// Icon wrappers
const BellIcon = Bell as React.FC<{ className?: string }>;
const BellOffIcon = BellOff as React.FC<{ className?: string }>;
const ArrowRightIcon = ArrowRight as React.FC<{ className?: string }>;
const MessageSquareIcon = MessageSquare as React.FC<{ className?: string }>;
const AtSignIcon = AtSign as React.FC<{ className?: string }>;
const MegaphoneIcon = Megaphone as React.FC<{ className?: string }>;
const UserPlusIcon = UserPlus as React.FC<{ className?: string }>;
const CheckCircleIcon = CheckCircle as React.FC<{ className?: string }>;
const AlertTriangleIcon = AlertTriangle as React.FC<{ className?: string }>;
const ClockIcon = Clock as React.FC<{ className?: string }>;

interface NotificationSnippetProps {
  className?: string;
}

export default function NotificationSnippet({ className }: NotificationSnippetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: notificationsData = [], isLoading } = useGetNotifications();
  
  // Ensure notifications is always an array
  const notifications = Array.isArray(notificationsData) ? notificationsData : [];
  const { mutate: markAsRead } = useMarkNotificationAsRead();

  // Get recent notifications (last 5 unread + 2 recent read)
  const unreadNotifications = notifications.filter(n => !n.isRead).slice(0, 5);
  const recentReadNotifications = notifications.filter(n => n.isRead).slice(0, 2);
  const displayNotifications = [...unreadNotifications, ...recentReadNotifications];
  
  const unreadCount = unreadNotifications.length;
  const totalCount = notifications.length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'mention':
        return <AtSignIcon className="h-4 w-4 text-blue-500" />;
      case 'comment':
        return <MessageSquareIcon className="h-4 w-4 text-green-500" />;
      case 'system':
      case 'announcement':
        return <MegaphoneIcon className="h-4 w-4 text-orange-500" />;
      case 'task':
        return <CheckCircleIcon className="h-4 w-4 text-purple-500" />;
      case 'project':
        return <AlertTriangleIcon className="h-4 w-4 text-red-500" />;
      case 'team':
        return <UserPlusIcon className="h-4 w-4 text-indigo-500" />;
      default:
        return <BellIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
  };

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-center h-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <BellIcon className="h-5 w-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs h-5 px-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <Link to="/dashboard/notifications">
            <Button variant="ghost" size="sm" className="text-xs">
              View All
              <ArrowRightIcon className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="p-0 pb-4">
        {displayNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <BellOffIcon className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground font-medium">All caught up!</p>
            <p className="text-xs text-muted-foreground">No new notifications</p>
          </div>
        ) : (
          <ScrollArea className="h-auto max-h-64">
            <div className="px-4 space-y-2">
              {displayNotifications.slice(0, isExpanded ? displayNotifications.length : 4).map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer hover:bg-muted/50",
                    !notification.isRead && "bg-blue-50/50 dark:bg-blue-900/10 border-l-2 border-l-blue-500"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium truncate",
                      !notification.isRead && "font-semibold"
                    )}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {notification.content || notification.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <ClockIcon className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.createdAt || notification.timestamp), { addSuffix: true })}
                      </span>
                      {!notification.isRead && (
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full ml-auto" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {displayNotifications.length > 4 && (
                <div className="pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full text-xs"
                  >
                    {isExpanded ? 'Show Less' : `Show ${displayNotifications.length - 4} More`}
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {totalCount > displayNotifications.length && (
          <div className="px-4 pt-3 border-t mt-2">
            <Link to="/dashboard/notifications">
              <Button variant="outline" size="sm" className="w-full">
                View All {totalCount} Notifications
                <ArrowRightIcon className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 