/**
 * 📊 Workload Indicator Component
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle } from "lucide-react";
import { getUserWorkload, smartProfileKeys } from "@/fetchers/profile/smart-profile-fetchers";
import NumberTicker from "@/components/magicui/number-ticker";
import { cn } from "@/lib/cn";

interface WorkloadIndicatorProps {
  userId: string;
  className?: string;
}

const workloadConfig = {
  low: { label: "Light", color: "text-green-600 dark:text-green-400", bgColor: "bg-green-100 dark:bg-green-900" },
  medium: { label: "Moderate", color: "text-yellow-600 dark:text-yellow-400", bgColor: "bg-yellow-100 dark:bg-yellow-900" },
  high: { label: "Heavy", color: "text-red-600 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-900" },
};

export function WorkloadIndicator({ userId, className }: WorkloadIndicatorProps) {
  const { data, isLoading } = useQuery({
    queryKey: smartProfileKeys.workload(userId),
    queryFn: () => getUserWorkload(userId),
    staleTime: 2 * 60 * 1000,
  });

  const workload = data?.data || {};
  const config = workloadConfig[workload.workloadLevel as keyof typeof workloadConfig] || workloadConfig.low;

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="h-24 bg-muted rounded-lg animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" />
          Current Workload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className={cn("text-sm", config.color)}>
            {config.label}
          </Badge>
          <span className="text-2xl font-bold">
            <NumberTicker value={workload.totalActiveTasks || 0} />
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">High Priority</span>
            <span className="font-semibold">{workload.highPriorityTasks || 0}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Due This Week</span>
            <span className="font-semibold">{workload.dueThisWeek || 0}</span>
          </div>

          {(workload.totalEstimatedHours || 0) > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Estimated Hours</span>
              <span className="font-semibold">{workload.totalEstimatedHours}h</span>
            </div>
          )}
        </div>

        {(workload.totalActiveTasks || 0) > 15 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              High workload - consider delegation
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

