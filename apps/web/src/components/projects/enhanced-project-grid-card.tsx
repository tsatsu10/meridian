import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { HealthBadge } from "./health-badge";
import { QuickActionsMenu } from "./quick-actions-menu";
import { useProjectHealth } from "@/hooks/use-project-health";
import { Star, Calendar, CheckCircle2, AlertCircle, FolderOpen } from "lucide-react";
import { format, isPast } from "date-fns";
import { cn } from "@/lib/utils";
import type { ProjectDashboardRow } from "@/types/project";

type TaskLike = NonNullable<ProjectDashboardRow["tasks"]>[number];

interface EnhancedProjectGridCardProps {
  project: ProjectDashboardRow;
  index: number;
  isPinned: boolean;
  onProjectClick: (project: ProjectDashboardRow) => void;
  onTogglePin?: (projectId: string) => void;
  onDuplicate?: (project: ProjectDashboardRow) => void;
  onArchive?: (project: ProjectDashboardRow) => void;
  onEdit?: (project: ProjectDashboardRow) => void;
  onShare?: (project: ProjectDashboardRow) => void;
  onSettings?: (project: ProjectDashboardRow) => void;
  onDelete?: (project: ProjectDashboardRow) => void;
}

export function EnhancedProjectGridCard({
  project,
  index,
  isPinned,
  onProjectClick,
  onTogglePin,
  onDuplicate,
  onArchive,
  onEdit,
  onShare,
  onSettings,
  onDelete,
}: EnhancedProjectGridCardProps) {
  const health = useProjectHealth(project);

  const tasks = (project.tasks ?? []) as TaskLike[];

  const completedTasks =
    tasks.filter((t) => {
      const status = t.status?.toLowerCase();
      return status === "completed" || status === "done";
    }).length || 0;

  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const overdueTasks =
    tasks.filter((t) => {
      if (!t.dueDate) return false;
      const status = t.status?.toLowerCase();
      const isComplete = status === "completed" || status === "done";
      return !isComplete && isPast(new Date(t.dueDate));
    }).length || 0;

  const members = project.members ?? [];

  const isProjectOverdue = project.dueDate && isPast(new Date(project.dueDate)) && 
    project.status !== "completed";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card 
        className="glass-card hover:border-primary/50 transition-all cursor-pointer group relative overflow-hidden"
        onClick={() => onProjectClick(project)}
      >
        {/* Pin Star - Top Right */}
        {onTogglePin && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-10 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(project.id);
            }}
          >
            <Star className={isPinned ? "h-4 w-4 fill-yellow-500 text-yellow-500" : "h-4 w-4"} />
          </Button>
        )}

        {/* Quick Actions - Top Right */}
        <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
          <QuickActionsMenu
            project={project}
            isPinned={isPinned}
            onStar={onTogglePin}
            onDuplicate={onDuplicate}
            onArchive={onArchive}
            onEdit={onEdit}
            onShare={onShare}
            onSettings={onSettings}
            onDelete={onDelete}
          />
        </div>

        <CardContent className="p-6">
          {/* Project Icon/Color */}
          <div className="flex items-start gap-3 mb-4">
            <div className={cn(
              "h-12 w-12 rounded-lg flex items-center justify-center text-white text-xl font-bold",
              getProjectColor(project.name)
            )}>
              {project.icon || <FolderOpen className="h-6 w-6" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 min-w-0">
                <h3 className="font-semibold truncate flex-1 min-w-0">{project.name}</h3>
                {isPinned && <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 flex-shrink-0" />}
              </div>
              <HealthBadge health={health} className="text-xs" />
            </div>
          </div>

          {/* Description */}
          {project.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
              {project.description}
            </p>
          )}

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Progress</span>
              <span className="text-xs font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Stats Row */}
          <div className="flex items-center flex-wrap gap-3 text-sm mb-4">
            <div className="flex items-center gap-1 text-muted-foreground flex-shrink-0">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs whitespace-nowrap">{completedTasks}/{totalTasks}</span>
            </div>
            {overdueTasks > 0 && (
              <div className="flex items-center gap-1 text-orange-500 flex-shrink-0">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs whitespace-nowrap">{overdueTasks} overdue</span>
              </div>
            )}
            {project.dueDate && (
              <div className={cn(
                "flex items-center gap-1 flex-shrink-0",
                isProjectOverdue ? "text-red-500" : "text-muted-foreground"
              )}>
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs whitespace-nowrap">{format(new Date(project.dueDate), "MMM d, yyyy")}</span>
              </div>
            )}
          </div>

          {/* Team Avatars & Status Badges */}
          {members.length > 0 ? (
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex -space-x-2 flex-shrink-0">
                {members.slice(0, 4).map((member) => (
                  <Avatar key={member.id} className="h-8 w-8 border-2 border-background">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback className="text-xs">
                      {member.name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {members.length > 4 && (
                  <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                    +{members.length - 4}
                  </div>
                )}
              </div>
              <div className="flex gap-1 flex-wrap justify-end min-w-0">
                <Badge variant="outline" className="text-xs capitalize whitespace-nowrap">{project.status}</Badge>
                <Badge variant="outline" className="text-xs capitalize whitespace-nowrap">{project.priority}</Badge>
              </div>
            </div>
          ) : (
            <div className="flex gap-1 flex-wrap justify-end">
              <Badge variant="outline" className="text-xs capitalize whitespace-nowrap">{project.status}</Badge>
              <Badge variant="outline" className="text-xs capitalize whitespace-nowrap">{project.priority}</Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function getProjectColor(name: string) {
  const colors = [
    "bg-gradient-to-br from-blue-500 to-cyan-500",
    "bg-gradient-to-br from-purple-500 to-pink-500",
    "bg-gradient-to-br from-emerald-500 to-teal-500",
    "bg-gradient-to-br from-orange-500 to-red-500",
    "bg-gradient-to-br from-indigo-500 to-purple-500",
    "bg-gradient-to-br from-green-500 to-blue-500",
  ];
  const index = name.length % colors.length;
  return colors[index];
}

