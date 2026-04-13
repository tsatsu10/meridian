import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { HealthBadge } from "./health-badge";
import { QuickActionsMenu } from "./quick-actions-menu";
import { useProjectHealth } from "@/hooks/use-project-health";
import { Star, Calendar, Users, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import type { ProjectDashboardRow } from "@/types/project";

const ROW_HEIGHT = 112;

interface ProjectListViewProps {
  projects: ProjectDashboardRow[];
  onProjectClick: (project: ProjectDashboardRow) => void;
  pinnedProjects?: string[];
  onTogglePin?: (projectId: string) => void;
  onDuplicate?: (project: ProjectDashboardRow) => void;
  onArchive?: (project: ProjectDashboardRow) => void;
  onEdit?: (project: ProjectDashboardRow) => void;
  onShare?: (project: ProjectDashboardRow) => void;
  onSettings?: (project: ProjectDashboardRow) => void;
  onDelete?: (project: ProjectDashboardRow) => void;
}

export function ProjectListView({
  projects,
  onProjectClick,
  pinnedProjects = [],
  onTogglePin,
  onDuplicate,
  onArchive,
  onEdit,
  onShare,
  onSettings,
  onDelete,
}: ProjectListViewProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: projects.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });

  if (projects.length === 0) {
    return null;
  }

  return (
    <div
      ref={parentRef}
      className="max-h-[min(70vh,900px)] overflow-auto pr-1 rounded-lg border border-border/40"
      role="list"
      aria-label="Projects list"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((vRow) => {
          const project = projects[vRow.index];
          if (!project) return null;
          return (
            <div
              key={project.id}
              role="listitem"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${vRow.start}px)`,
              }}
            >
              <ProjectListItem
                project={project}
                isPinned={pinnedProjects.includes(project.id)}
                onProjectClick={onProjectClick}
                onTogglePin={onTogglePin}
                onDuplicate={onDuplicate}
                onArchive={onArchive}
                onEdit={onEdit}
                onShare={onShare}
                onSettings={onSettings}
                onDelete={onDelete}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProjectListItem({
  project,
  isPinned,
  onProjectClick,
  onTogglePin,
  onDuplicate,
  onArchive,
  onEdit,
  onShare,
  onSettings,
  onDelete,
}: {
  project: ProjectDashboardRow;
  isPinned: boolean;
  onProjectClick: (project: ProjectDashboardRow) => void;
  onTogglePin?: (projectId: string) => void;
  onDuplicate?: (project: ProjectDashboardRow) => void;
  onArchive?: (project: ProjectDashboardRow) => void;
  onEdit?: (project: ProjectDashboardRow) => void;
  onShare?: (project: ProjectDashboardRow) => void;
  onSettings?: (project: ProjectDashboardRow) => void;
  onDelete?: (project: ProjectDashboardRow) => void;
}) {
  const health = useProjectHealth(project);

  const completedTasks =
    project.tasks?.filter((t) => {
      const status = t.status?.toLowerCase();
      return status === "completed" || status === "done";
    }).length ?? 0;

  const totalTasks = project.tasks?.length ?? 0;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const members = project.members ?? [];

  return (
    <div
      className="glass-card hover:border-primary/50 transition-all cursor-pointer mb-2"
      onClick={() => onProjectClick(project)}
    >
      <div className="p-4 flex items-center gap-4">
        {onTogglePin && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(project.id);
            }}
          >
            <Star className={isPinned ? "h-4 w-4 fill-yellow-500 text-yellow-500" : "h-4 w-4"} />
          </Button>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold truncate">{project.name}</h3>
            <HealthBadge health={health} />
            <Badge variant="outline" className="capitalize">
              {project.status}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {project.priority}
            </Badge>
          </div>
          {project.description && (
            <p className="text-sm text-muted-foreground truncate">{project.description}</p>
          )}
        </div>

        <div className="w-32">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Progress</span>
            <span className="text-xs font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4" />
            <span>
              {completedTasks}/{totalTasks}
            </span>
          </div>
          {project.dueDate && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(project.dueDate), "MMM d")}</span>
            </div>
          )}
        </div>

        {members.length > 0 && (
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div className="flex -space-x-2">
              {members.slice(0, 3).map((member) => (
                <Avatar key={member.id} className="h-6 w-6 border-2 border-background">
                  <AvatarImage src={member.avatar ?? undefined} />
                  <AvatarFallback className="text-xs">{member.name?.charAt(0) ?? "?"}</AvatarFallback>
                </Avatar>
              ))}
              {members.length > 3 && (
                <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                  +{members.length - 3}
                </div>
              )}
            </div>
          </div>
        )}

        <div onClick={(e) => e.stopPropagation()}>
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
      </div>
    </div>
  );
}
