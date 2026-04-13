// @epic-3.5-communication: Notification analytics and insights
// @persona-jennifer: Exec wants notification performance insights
// @persona-sarah: PM wants to track notification effectiveness

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Bell,
  Mail,
  MailOpen,
} from "lucide-react";

interface NotificationAnalyticsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: {
    total: number;
    unread: number;
    read: number;
    pinned: number;
    important: number;
  };
  notifications: any[];
}

export default function NotificationAnalyticsModal({
  open,
  onOpenChange,
  stats,
  notifications,
}: NotificationAnalyticsModalProps) {
  // Calculate type distribution
  const typeDistribution = notifications.reduce((acc, notif) => {
    acc[notif.type] = (acc[notif.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calculate read rate
  const readRate = stats.total > 0 ? ((stats.read / stats.total) * 100).toFixed(1) : 0;

  // Calculate average response time (time to mark as read)
  const calculateAverageResponseTime = () => {
    const readNotifications = notifications.filter(n => n.isRead);
    if (readNotifications.length === 0) return "N/A";
    
    const totalMinutes = readNotifications.reduce((acc, notif) => {
      const created = new Date(notif.createdAt).getTime();
      const now = Date.now();
      const minutes = (now - created) / (1000 * 60);
      return acc + minutes;
    }, 0);
    
    const avgMinutes = totalMinutes / readNotifications.length;
    
    if (avgMinutes < 60) {
      return `${Math.round(avgMinutes)} minutes`;
    } else if (avgMinutes < 1440) {
      return `${Math.round(avgMinutes / 60)} hours`;
    } else {
      return `${Math.round(avgMinutes / 1440)} days`;
    }
  };

  // Get most common notification type
  const mostCommonType = Object.entries(typeDistribution)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || "N/A";

  // Calculate important rate
  const importantRate = stats.total > 0 ? ((stats.important / stats.total) * 100).toFixed(1) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Notification Analytics
          </DialogTitle>
          <DialogDescription>
            Insights and statistics about your notifications
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  Total Notifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  All time notifications
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MailOpen className="h-4 w-4 text-green-600" />
                  Read Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{readRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.read} of {stats.total} read
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  Avg Response Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{calculateAverageResponseTime()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Time to mark as read
                </p>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Notification Types */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Notification Types Distribution
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(typeDistribution).map(([type, count]) => (
                <Card key={type}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{count}</span>
                        <span className="text-xs text-muted-foreground">
                          ({stats.total > 0 ? ((count / stats.total) * 100).toFixed(0) : 0}%)
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Separator />

          {/* Key Insights */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Key Insights
            </h3>
            <div className="space-y-3">
              <Card>
                <CardContent className="py-3">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Most Common Type</p>
                      <p className="text-xs text-muted-foreground">
                        Your most frequent notification type is <Badge variant="secondary" className="capitalize">{mostCommonType}</Badge> with {typeDistribution[mostCommonType] || 0} notifications
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Important Notifications</p>
                      <p className="text-xs text-muted-foreground">
                        {importantRate}% of your notifications are marked as important ({stats.important} of {stats.total})
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-3">
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Unread Notifications</p>
                      <p className="text-xs text-muted-foreground">
                        You have {stats.unread} unread notifications waiting for your attention
                        {stats.unread > 10 && " (consider reviewing and archiving old ones)"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {stats.pinned > 0 && (
                <Card>
                  <CardContent className="py-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Pinned Notifications</p>
                        <p className="text-xs text-muted-foreground">
                          You have {stats.pinned} pinned notifications for quick access
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <Separator />

          {/* Recommendations */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Recommendations</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              {stats.unread > 20 && (
                <div className="flex items-start gap-2">
                  <span className="text-orange-600">•</span>
                  <p>You have many unread notifications. Consider using batch operations to mark multiple as read at once.</p>
                </div>
              )}
              {parseFloat(readRate) < 50 && stats.total > 10 && (
                <div className="flex items-start gap-2">
                  <span className="text-orange-600">•</span>
                  <p>Your read rate is below 50%. Archive old notifications to keep your inbox clean.</p>
                </div>
              )}
              {stats.pinned === 0 && (
                <div className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <p>Pin important notifications to keep them at the top of your list for quick access.</p>
                </div>
              )}
              {Object.keys(typeDistribution).length > 1 && (
                <div className="flex items-start gap-2">
                  <span className="text-green-600">•</span>
                  <p>Use filters to focus on specific notification types for better productivity.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

