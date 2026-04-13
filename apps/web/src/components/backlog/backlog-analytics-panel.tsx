// Backlog Analytics Panel - Quick Metrics
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target,
} from "lucide-react";
import type Task from "@/types/task";

interface BacklogAnalyticsPanelProps {
  tasks: Task[];
  className?: string;
}

export function BacklogAnalyticsPanel({ tasks, className }: BacklogAnalyticsPanelProps) {
  // Calculate metrics
  const totalTasks = tasks.length;
  const highPriorityCount = tasks.filter(t => t.priority === 'high' || t.priority === 'urgent').length;
  const readyForSprintCount = tasks.filter(t => t.status === 'todo').length;
  const overdueCount = tasks.filter(t => 
    t.dueDate && new Date(t.dueDate) < new Date()
  ).length;

  const highPriorityPercentage = totalTasks > 0 ? (highPriorityCount / totalTasks) * 100 : 0;
  const readyPercentage = totalTasks > 0 ? (readyForSprintCount / totalTasks) * 100 : 0;

  const metrics = [
    {
      label: "Total Items",
      value: totalTasks,
      icon: Target,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
    },
    {
      label: "High Priority",
      value: highPriorityCount,
      percentage: highPriorityPercentage,
      icon: AlertTriangle,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-100 dark:bg-amber-900/20",
      trend: highPriorityPercentage > 30 ? "up" : "stable",
    },
    {
      label: "Ready for Sprint",
      value: readyForSprintCount,
      percentage: readyPercentage,
      icon: CheckCircle2,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/20",
    },
    {
      label: "Overdue",
      value: overdueCount,
      icon: Clock,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-100 dark:bg-red-900/20",
      alert: overdueCount > 0,
    },
  ];

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Backlog Health
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className={`p-2 rounded-md ${metric.bgColor}`}>
                  <metric.icon className={`w-4 h-4 ${metric.color}`} />
                </div>
                {metric.trend === "up" && (
                  <TrendingUp className="w-3 h-3 text-amber-600" />
                )}
                {metric.alert && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                    !
                  </Badge>
                )}
              </div>
              <div className="space-y-1">
                <div className={`text-2xl font-bold ${metric.color}`}>
                  {metric.value}
                </div>
                <div className="text-xs text-muted-foreground font-medium">
                  {metric.label}
                </div>
                {metric.percentage !== undefined && (
                  <div className="space-y-1">
                    <Progress value={metric.percentage} className="h-1.5" />
                    <div className="text-[10px] text-muted-foreground">
                      {Math.round(metric.percentage)}% of total
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Health Summary */}
        <div className="mt-4 p-3 bg-muted/50 rounded-md">
          <div className="text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Backlog Health:</span>
              <Badge variant={overdueCount > 0 ? "destructive" : readyPercentage > 40 ? "default" : "secondary"}>
                {overdueCount > 0 ? "Needs Attention" : readyPercentage > 40 ? "Healthy" : "OK"}
              </Badge>
            </div>
            {overdueCount > 0 && (
              <p className="text-muted-foreground mt-2">
                ⚠️ You have {overdueCount} overdue {overdueCount === 1 ? 'item' : 'items'} that need attention
              </p>
            )}
            {highPriorityPercentage > 50 && (
              <p className="text-muted-foreground mt-2">
                💡 Consider moving high priority items to sprint planning
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

