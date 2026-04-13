/**
 * ✅ Recent Tasks Component
 * 
 * Displays last completed, currently assigned, and overdue tasks
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { getRecentTasks, smartProfileKeys } from "@/fetchers/profile/smart-profile-fetchers";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/cn";

interface RecentTasksProps {
  userId: string;
  className?: string;
}

const priorityColors = {
  urgent: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  low: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

export function RecentTasks({ userId, className }: RecentTasksProps) {
  const { data, isLoading } = useQuery({
    queryKey: smartProfileKeys.recentTasks(userId),
    queryFn: () => getRecentTasks(userId),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const tasksData = data?.data || {
    lastCompleted: [],
    currentlyAssigned: [],
    overdue: [],
    summary: { totalCompleted: 0, totalAssigned: 0, totalOverdue: 0 },
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Recent Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Recent Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="assigned" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="assigned" className="text-xs">
              Assigned ({tasksData.summary.totalAssigned})
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-xs">
              Completed ({tasksData.summary.totalCompleted})
            </TabsTrigger>
            <TabsTrigger value="overdue" className="text-xs">
              Overdue ({tasksData.summary.totalOverdue})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assigned" className="space-y-2 mt-4">
            {tasksData.currentlyAssigned.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No currently assigned tasks
              </p>
            ) : (
              tasksData.currentlyAssigned.slice(0, 5).map((task: any) => (
                <TaskItem key={task.id} task={task} icon={Circle} />
              ))
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-2 mt-4">
            {tasksData.lastCompleted.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No completed tasks yet
              </p>
            ) : (
              tasksData.lastCompleted.map((task: any) => (
                <TaskItem key={task.id} task={task} icon={CheckCircle2} />
              ))
            )}
          </TabsContent>

          <TabsContent value="overdue" className="space-y-2 mt-4">
            {tasksData.overdue.length === 0 ? (
              <p className="text-center text-green-600 dark:text-green-400 py-8 text-sm">
                ✨ No overdue tasks!
              </p>
            ) : (
              tasksData.overdue.map((task: any) => (
                <TaskItem key={task.id} task={task} icon={AlertCircle} isOverdue />
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function TaskItem({
  task,
  icon: Icon,
  isOverdue = false,
}: {
  task: any;
  icon: any;
  isOverdue?: boolean;
}) {
  return (
    <Link
      to="/dashboard/projects/$projectId"
      params={{ projectId: task.projectId }}
      className="block"
    >
      <div
        className={cn(
          "p-3 rounded-lg border hover:border-primary transition-colors",
          isOverdue && "border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/20"
        )}
      >
        <div className="flex items-start gap-3">
          <Icon
            className={cn(
              "h-4 w-4 mt-0.5 flex-shrink-0",
              isOverdue && "text-red-600 dark:text-red-400"
            )}
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{task.title}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground truncate">
                {task.projectName}
              </span>
              <Badge
                variant="outline"
                className={cn("text-xs", priorityColors[task.priority as keyof typeof priorityColors])}
              >
                {task.priority}
              </Badge>
            </div>
            {task.dueDate && (
              <p className="text-xs text-muted-foreground mt-1">
                <Clock className="h-3 w-3 inline mr-1" />
                Due {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
              </p>
            )}
            {task.completedAt && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                Completed {formatDistanceToNow(new Date(task.completedAt), { addSuffix: true })}
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

