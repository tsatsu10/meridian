/**
 * 📰 Activity Feed Component
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, MessageSquare, FileText, UserPlus } from "lucide-react";
import { getActivityFeed, smartProfileKeys } from "@/fetchers/profile/smart-profile-fetchers";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/cn";

interface ActivityFeedProps {
  userId: string;
  limit?: number;
  className?: string;
}

const activityIcons: Record<string, any> = {
  task_created: CheckCircle2,
  task_completed: CheckCircle2,
  task_updated: FileText,
  comment_added: MessageSquare,
  team_joined: UserPlus,
  project_joined: UserPlus,
};

const activityColors: Record<string, string> = {
  task_created: "text-blue-600 dark:text-blue-400",
  task_completed: "text-green-600 dark:text-green-400",
  task_updated: "text-yellow-600 dark:text-yellow-400",
  comment_added: "text-purple-600 dark:text-purple-400",
  team_joined: "text-pink-600 dark:text-pink-400",
  project_joined: "text-indigo-600 dark:text-indigo-400",
};

export function ActivityFeed({ userId, limit = 20, className }: ActivityFeedProps) {
  const { data, isLoading } = useQuery({
    queryKey: smartProfileKeys.activity(userId),
    queryFn: () => getActivityFeed(userId, { limit }),
    staleTime: 1 * 60 * 1000,
  });

  const activities = data?.data || [];

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No recent activity</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {activities.map((activity: any) => {
            const Icon = activityIcons[activity.type] || Activity;
            const colorClass = activityColors[activity.type] || "text-gray-600";

            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className={cn("mt-0.5", colorClass)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {activity.type.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </p>
                  {activity.taskTitle && (
                    <p className="text-sm text-muted-foreground truncate">
                      {activity.taskTitle}
                    </p>
                  )}
                  {activity.projectName && (
                    <p className="text-xs text-muted-foreground truncate">
                      {activity.projectName}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

