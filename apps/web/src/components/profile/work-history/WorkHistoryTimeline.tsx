/**
 * 📈 Work History Timeline Component
 * 
 * Displays career progression timeline within workspace
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, TrendingUp, Award, Users, FolderOpen } from "lucide-react";
import { getWorkHistory, smartProfileKeys } from "@/fetchers/profile/smart-profile-fetchers";
import { format } from "date-fns";
import { cn } from "@/lib/cn";

interface WorkHistoryTimelineProps {
  userId: string;
  workspaceId?: string;
  className?: string;
}

const eventIcons: Record<string, any> = {
  role_change: TrendingUp,
  promotion: Award,
  team_join: Users,
  project_completed: FolderOpen,
  milestone: Award,
};

const eventColors: Record<string, string> = {
  role_change: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30",
  promotion: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30",
  team_join: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30",
  project_completed: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30",
  milestone: "text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/30",
};

export function WorkHistoryTimeline({ userId, workspaceId, className }: WorkHistoryTimelineProps) {
  const { data, isLoading } = useQuery({
    queryKey: smartProfileKeys.workHistory(userId, workspaceId),
    queryFn: () => getWorkHistory(userId, workspaceId, { limit: 20 }),
    staleTime: 10 * 60 * 1000,
  });

  const history = data?.data || [];

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Career Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Career Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No work history recorded</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Career Timeline
          <Badge variant="secondary" className="ml-auto">
            {history.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-6">
            {history.map((event: any, index: number) => {
              const Icon = eventIcons[event.eventType] || History;
              const colorClass = eventColors[event.eventType] || eventColors.milestone;

              return (
                <div key={event.id} className="relative flex gap-4">
                  {/* Icon */}
                  <div className={cn("relative z-10 h-12 w-12 rounded-full flex items-center justify-center border-2 border-background", colorClass)}>
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-6">
                    <div className="mb-1">
                      <h4 className="font-semibold">{event.eventTitle}</h4>
                      {event.eventDescription && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {event.eventDescription}
                        </p>
                      )}
                    </div>

                    {(event.fromValue || event.toValue) && (
                      <div className="flex items-center gap-2 text-sm mb-2">
                        {event.fromValue && (
                          <Badge variant="outline" className="text-xs">
                            {event.fromValue}
                          </Badge>
                        )}
                        {event.fromValue && event.toValue && <span>→</span>}
                        {event.toValue && (
                          <Badge variant="default" className="text-xs">
                            {event.toValue}
                          </Badge>
                        )}
                      </div>
                    )}

                    {(event.projectName || event.teamName) && (
                      <p className="text-xs text-muted-foreground">
                        {event.projectName && `Project: ${event.projectName}`}
                        {event.teamName && `Team: ${event.teamName}`}
                      </p>
                    )}

                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(event.eventDate), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

