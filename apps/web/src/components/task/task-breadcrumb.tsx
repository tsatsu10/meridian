// Task Details Breadcrumb Navigation
import { Link } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskBreadcrumbProps {
  workspaceId: string;
  workspaceName?: string;
  projectId: string;
  projectName?: string;
  taskNumber?: number;
  taskTitle?: string;
  className?: string;
}

export function TaskBreadcrumb({
  workspaceId,
  workspaceName = "Workspace",
  projectId,
  projectName = "Project",
  taskNumber,
  taskTitle,
  className,
}: TaskBreadcrumbProps) {
  return (
    <nav
      className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground overflow-x-auto scrollbar-none",
        className
      )}
      aria-label="Breadcrumb navigation"
    >
      {/* Workspace */}
      <Link
        to="/dashboard"
        className="flex items-center gap-1 hover:text-foreground transition-colors shrink-0"
        aria-label="Go to dashboard"
      >
        <Home className="w-3.5 h-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">Dashboard</span>
      </Link>

      <ChevronRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />

      {/* Workspace */}
      <Link
        to="/dashboard/workspace/$workspaceId"
        params={{ workspaceId }}
        className="hover:text-foreground transition-colors truncate max-w-[120px] sm:max-w-none"
        aria-label={`Go to workspace ${workspaceName}`}
      >
        {workspaceName}
      </Link>

      <ChevronRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />

      {/* Project */}
      <Link
        to="/dashboard/workspace/$workspaceId/project/$projectId"
        params={{ workspaceId, projectId }}
        className="hover:text-foreground transition-colors truncate max-w-[120px] sm:max-w-none"
        aria-label={`Go to project ${projectName}`}
      >
        {projectName}
      </Link>

      <ChevronRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />

      {/* Board */}
      <Link
        to="/dashboard/workspace/$workspaceId/project/$projectId/board"
        params={{ workspaceId, projectId }}
        className="hover:text-foreground transition-colors shrink-0"
        aria-label="Go to project board"
      >
        Board
      </Link>

      <ChevronRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />

      {/* Current Task */}
      <span className="font-medium text-foreground truncate" aria-current="page">
        {taskNumber ? `#${taskNumber}` : "Task"}
        {taskTitle && (
          <span className="hidden md:inline"> - {taskTitle}</span>
        )}
      </span>
    </nav>
  );
}

