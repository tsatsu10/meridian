/**
 * 💼 Active Projects Component
 * 
 * Displays user's current active projects with role and status
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FolderOpen, Calendar, Users, Clock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { getActiveProjects, smartProfileKeys } from "@/fetchers/profile/smart-profile-fetchers";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/cn";

interface ActiveProjectsProps {
  userId: string;
  className?: string;
}

const roleColors: Record<string, string> = {
  owner: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  manager: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  member: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  viewer: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
};

export function ActiveProjects({ userId, className }: ActiveProjectsProps) {
  const { data, isLoading } = useQuery({
    queryKey: smartProfileKeys.activeProjects(userId),
    queryFn: () => getActiveProjects(userId),
    staleTime: 3 * 60 * 1000, // 3 minutes
  });

  const projects = data?.data || [];

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Active Projects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (projects.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Active Projects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No active projects</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5" />
          Active Projects
          <Badge variant="secondary" className="ml-auto">
            {projects.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {projects.map((project: any) => {
            const progress = project.taskCounts.total > 0
              ? Math.round((project.taskCounts.completed / project.taskCounts.total) * 100)
              : 0;

            return (
              <Link
                key={project.id}
                to="/dashboard/projects/$projectId"
                params={{ projectId: project.id }}
                className="block"
              >
                <div className="p-4 rounded-lg border hover:border-primary transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 rounded-lg flex items-center justify-center text-xl"
                        style={{ backgroundColor: project.color + "20" }}
                      >
                        {project.icon || "📁"}
                      </div>
                      <div>
                        <h4 className="font-semibold">{project.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {project.description || "No description"}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("text-xs", roleColors[project.role || "member"])}
                    >
                      {project.role || "member"}
                    </Badge>
                  </div>

                  {/* Progress */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{project.taskCounts.total} tasks</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{project.taskCounts.inProgress} in progress</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {project.lastContribution
                          ? formatDistanceToNow(new Date(project.lastContribution), {
                              addSuffix: true,
                            })
                          : "No activity"}
                      </span>
                    </div>
                  </div>

                  {project.taskCounts.overdue > 0 && (
                    <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                      {project.taskCounts.overdue} overdue task(s)
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

