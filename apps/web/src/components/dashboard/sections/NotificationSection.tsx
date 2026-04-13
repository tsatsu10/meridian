import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle, Target } from "lucide-react";
import { cn } from "@/lib/cn";

interface NotificationSectionProps {
  allNotifications: any[];
}

export default function NotificationSection({ allNotifications }: NotificationSectionProps) {
  const notifications = allNotifications || [];
  const recentNotifications = notifications.slice(0, 5);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <Card
      role="region"
      aria-labelledby="notifications-heading"
      aria-describedby="notifications-summary"
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle
            id="notifications-heading"
            className="text-lg flex items-center gap-2"
          >
            <Bell className="h-5 w-5 text-blue-600" aria-hidden="true" data-testid="bell-icon" />
            Recent Activity
          </CardTitle>
          {unreadCount > 0 && (
            <Badge
              variant="secondary"
              className="text-xs"
              aria-label={`${unreadCount} unread notifications`}
            >
              {unreadCount} unread
            </Badge>
          )}
        </div>
        <div id="notifications-summary" className="sr-only">
          {recentNotifications.length === 0
            ? "No recent notifications to display."
            : unreadCount === 0
              ? `Showing ${recentNotifications.length} most recent notifications out of ${notifications.length} total. All notifications are read.`
              : `Showing ${recentNotifications.length} most recent notifications out of ${notifications.length} total. ${unreadCount} notifications are unread and require attention.`
          }
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {recentNotifications.length === 0 ? (
          <div
            className="text-center py-4 text-gray-500"
            role="status"
            aria-label="No recent activity available"
          >
            <Bell className="h-6 w-6 mx-auto mb-2 opacity-50" aria-hidden="true" data-testid="bell-icon-empty" />
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          <ul
            className="space-y-3"
            role="list"
            aria-label="Recent notifications"
          >
            {recentNotifications.map((notification, index) => (
              <li
                key={`${notification.id}-${index}`}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                  notification.isRead ? "bg-gray-50" : "bg-blue-50 border-blue-200"
                )}
                role="article"
                aria-labelledby={`notification-title-${index}`}
                aria-describedby={`notification-content-${index}`}
                tabIndex={0}
              >
                <div className="mt-0.5" aria-hidden="true">
                  {notification.title.includes('🚨') ? (
                    <AlertTriangle className="h-4 w-4 text-red-500" data-testid="alert-triangle-icon" />
                  ) : (
                    <Target className="h-4 w-4 text-blue-500" data-testid="target-icon" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4
                    id={`notification-title-${index}`}
                    className="font-medium text-sm"
                  >
                    {notification.title}
                  </h4>
                  <p
                    id={`notification-content-${index}`}
                    className="text-xs text-gray-500 mt-1"
                  >
                    {notification.message}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge
                      variant="outline"
                      className="text-xs"
                      aria-label={`Priority: ${notification.priority}`}
                    >
                      {notification.priority}
                    </Badge>
                    <time
                      className="text-xs text-gray-500"
                      dateTime={notification.timestamp}
                      aria-label={`Notification received on ${new Date(notification.timestamp).toLocaleDateString()}`}
                    >
                      {new Date(notification.timestamp).toLocaleDateString()}
                    </time>
                  </div>
                </div>
                {!notification.isRead && (
                  <div
                    className="w-2 h-2 bg-blue-500 rounded-full mt-2"
                    aria-label="Unread notification indicator"
                    role="img"
                  />
                )}
                <div className="sr-only">
                  {!notification.isRead ? "Unread notification" : "Read notification"}.
                  Priority: {notification.priority}.
                  Received on {new Date(notification.timestamp).toLocaleDateString()}.
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}