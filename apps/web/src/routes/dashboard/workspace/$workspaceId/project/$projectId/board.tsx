// @epic-1.1-subtasks: Project kanban board with drag-and-drop
// @persona-sarah: PM needs visual task management and workflow overview
// @persona-mike: Dev needs efficient task status updates and assignments
// @persona-lisa: Designer needs visual project organization and collaboration

import type { BoardFilters as BoardFiltersType } from "@/components/filters";
import BoardFilters from "@/components/filters";
import BoardEmptyState from "@/components/board/board-empty-state";
import KanbanBoard from "@/components/kanban-board";
import ListView from "@/components/list-view";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useUserPreferencesStore } from "@/store/user-preferences";
import NotificationBell from "@/components/notification/notification-bell";
import CreateTaskModal from "@/components/shared/modals/create-task-modal";
import { Button } from "@/components/ui/button";
import useGetTasks from "@/hooks/queries/task/use-get-tasks";
import useProjectStore from "@/store/project";
import type Task from "@/types/task";
import { createFileRoute, Link } from "@tanstack/react-router";
import { addWeeks, endOfWeek, isWithinInterval, startOfWeek } from "date-fns";
import { ChevronLeft } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import LazyDashboardLayout from "@/components/performance/lazy-dashboard-layout";

export const Route = createFileRoute(
  "/dashboard/workspace/$workspaceId/project/$projectId/board",
)({
  component: RouteComponent,
});

function RouteComponent() {
  const { projectId, workspaceId } = Route.useParams();
  const { data: project, isLoading } = useGetTasks(projectId);
  const { setProject } = useProjectStore();
  const { viewMode, setViewMode } = useUserPreferencesStore();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [activeColumn, setActiveColumn] = useState<string>("todo");
  const [filters, setFilters] = useState<BoardFiltersType>({
    search: "",
    assignee: null,
    priority: null,
    dueDate: null,
    sortBy: null,
    sortOrder: null,
  });

  useEffect(() => {
    if (project) {
      setProject(project);
    }
  }, [project, setProject]);

  const handleFiltersChange = (newFilters: BoardFiltersType) => {
    setFilters(newFilters);
  };

  const clearAllFilters = () => {
    setFilters({
      search: "",
      assignee: null,
      priority: null,
      dueDate: null,
      sortBy: null,
      sortOrder: null,
    });
  };

  // Calculate if filters are active and total task count
  const hasActiveFilters = Boolean(
    filters.search ||
    filters.assignee ||
    filters.priority ||
    filters.dueDate ||
    filters.sortBy
  );

  // 🎹 KEYBOARD SHORTCUTS: Enhance productivity with keyboard navigation
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: "c",
        description: "Create new task",
        action: () => setIsTaskModalOpen(true),
      },
      {
        key: "v",
        description: "Toggle board/list view",
        action: () => setViewMode(viewMode === "board" ? "list" : "board"),
      },
      {
        key: "/",
        description: "Focus search",
        action: () => {
          const searchInput = document.querySelector('input[placeholder="Search tasks..."]') as HTMLInputElement;
          searchInput?.focus();
        },
      },
      {
        key: "f",
        metaKey: true,
        shiftKey: true,
        description: "Clear all filters",
        action: clearAllFilters,
      },
    ] as KeyboardShortcut[],
    enabled: true,
  });

  const totalTasks = project?.columns?.reduce((acc: number, col: any) => acc + (col.tasks?.length || 0), 0) || 0;
  const activeFilterCount = [filters.assignee, filters.priority, filters.dueDate, filters.sortBy].filter(Boolean).length;

  // Helper function to flatten hierarchical tasks for filtering
  const flattenTasksForFiltering = (tasks: Task[]): Task[] => {
    const flattened: Task[] = [];
    
    const flatten = (taskList: Task[]) => {
      for (const task of taskList) {
        flattened.push(task);
        if (task.subtasks && task.subtasks.length > 0) {
          flatten(task.subtasks);
        }
      }
    };
    
    flatten(tasks);
    return flattened;
  };

  // Helper function to rebuild hierarchy from flat list
  const rebuildTaskHierarchy = (flatTasks: Task[]): Task[] => {
    const taskMap = new Map();
    const rootTasks: Task[] = [];

    // First pass: create task map
    flatTasks.forEach((task) => {
      taskMap.set(task.id, { ...task, subtasks: [] });
    });

    // Second pass: build hierarchy
    flatTasks.forEach((task) => {
      const taskWithSubtasks = taskMap.get(task.id);
      if (task.parentId && taskMap.has(task.parentId)) {
        const parent = taskMap.get(task.parentId);
        parent.subtasks.push(taskWithSubtasks);
      } else {
        rootTasks.push(taskWithSubtasks);
      }
    });

    return rootTasks;
  };

  // 🚀 PERFORMANCE: Memoize filtering logic to prevent re-computation on every render
  const filteredProject = useMemo(() => {
    if (!project) return null;

    const filterTasks = (tasks: Task[]): Task[] => {
      // First, flatten all tasks (including subtasks) for filtering
      const allTasks = flattenTasksForFiltering(tasks);
      
      let filteredTasks = allTasks
        .filter((task) => {
          if (
            filters.search &&
            !task.title.toLowerCase().includes(filters.search.toLowerCase())
          ) {
            return false;
          }

          if (filters.assignee && task.userEmail !== filters.assignee) {
            return false;
          }

          if (filters.priority && task.priority !== filters.priority) {
            return false;
          }

          if (filters.dueDate && task.dueDate) {
            const today = new Date();
            const taskDate = new Date(task.dueDate);

            switch (filters.dueDate) {
              case "Due this week": {
                const weekStart = startOfWeek(today);
                const weekEnd = endOfWeek(today);
                if (
                  !isWithinInterval(taskDate, { start: weekStart, end: weekEnd })
                ) {
                  return false;
                }
                break;
              }
              case "Due next week": {
                const nextWeekStart = startOfWeek(addWeeks(today, 1));
                const nextWeekEnd = endOfWeek(addWeeks(today, 1));
                if (
                  !isWithinInterval(taskDate, {
                    start: nextWeekStart,
                    end: nextWeekEnd,
                  })
                ) {
                  return false;
                }
                break;
              }
              case "No due date": {
                return false;
              }
            }
          }

          return true;
        })
        .map((task) => ({
          ...task,
          assigneeEmail: task.userEmail ?? null,
          assigneeName: (task as any).userName ?? null,
          assignedTeamId: (task as any).teamId ?? null,
          assignedTeam: (task as any).team ?? null,
          position: task.position ?? 0
        }));

      if (filters.sortBy && filters.sortOrder) {
        filteredTasks = filteredTasks.sort((a, b) => {
          const sortOrder = filters.sortOrder === "asc" ? 1 : -1;

          switch (filters.sortBy) {
            case "title":
              return sortOrder * a.title.localeCompare(b.title);

            case "priority": {
              const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
              const aPriority = a.priority
                ? (priorityOrder[a.priority as keyof typeof priorityOrder] ?? 999)
                : 999;
              const bPriority = b.priority
                ? (priorityOrder[b.priority as keyof typeof priorityOrder] ?? 999)
                : 999;
              return sortOrder * (aPriority - bPriority);
            }

            case "dueDate": {
              if (!a.dueDate && !b.dueDate) return 0;
              if (!a.dueDate) return sortOrder;
              if (!b.dueDate) return -sortOrder;

              const aDate = new Date(a.dueDate).getTime();
              const bDate = new Date(b.dueDate).getTime();
              return sortOrder * (aDate - bDate);
            }

            case "createdAt": {
              const aDate = new Date(a.createdAt).getTime();
              const bDate = new Date(b.createdAt).getTime();
              return sortOrder * (aDate - bDate);
            }

            default:
              return 0;
          }
        });
      }

      // Rebuild the hierarchy from the filtered flat list
      return rebuildTaskHierarchy(filteredTasks);
    };

    return {
      ...project,
      columns:
        project.columns?.map((column: any) => ({
          id: column.id as "todo" | "in_progress" | "done" | "done",
          name: column.name as "To Do" | "In Progress" | "In Review" | "Done",
          tasks: filterTasks(column.tasks),
        })) ?? [],
    };
  }, [project, filters]); // Only recompute when project or filters change

  const visibleTasks = filteredProject?.columns?.reduce((acc: number, col: any) => acc + (col.tasks?.length || 0), 0) || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-500 dark:text-zinc-400">Loading tasks...</div>
      </div>
    );
  }

  if (!filteredProject) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-500 dark:text-zinc-400">Project not found</div>
      </div>
    );
  }

  return (
    <LazyDashboardLayout>
      <div className="flex flex-col h-full">
        {/* 📱 MOBILE RESPONSIVE: Enhanced Toolbar with Breadcrumb + Filters */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b mb-4">
          {/* Top Row: Breadcrumb + Actions */}
          <div className="flex items-center justify-between px-3 sm:px-6 py-2 sm:py-3 border-b gap-2">
            {/* Left: Back Button */}
            <Link
              to="/dashboard/workspace/$workspaceId/project/$projectId"
              params={{ workspaceId, projectId }}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors min-w-0"
            >
              <ChevronLeft className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Back to Project</span>
              <span className="sm:hidden">Back</span>
            </Link>
            
            {/* Center: Project Title - Hidden on mobile */}
            <h1 className="hidden md:block text-xl font-semibold text-foreground truncate">
              {filteredProject?.name || 'Project'} Board
            </h1>

            {/* Right: Actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              <NotificationBell />
              <Button onClick={() => setIsTaskModalOpen(true)} size="sm" className="gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9">
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                <span className="hidden sm:inline">New Task</span>
                <span className="sm:hidden">Task</span>
              </Button>
            </div>
          </div>

          {/* Second Row: Comprehensive Filters */}
          <div className="px-3 sm:px-6 py-2 sm:py-3">
            <BoardFilters onFiltersChange={handleFiltersChange} />
          </div>
        </div>
        {/* @mcp-future: Context7 for smart search, TaskMaster AI for quick actions, Exa for global search */}

        {/* 🔊 ACCESSIBILITY: Main content area with proper ARIA labels */}
        <main 
          className="flex-1 overflow-hidden" 
          role="main"
          aria-label="Task board view"
        >
          {/* Show empty state when appropriate */}
          {totalTasks === 0 ? (
            <BoardEmptyState
              type="no-tasks"
              onCreateTask={() => setIsTaskModalOpen(true)}
            />
          ) : visibleTasks === 0 && hasActiveFilters ? (
            <BoardEmptyState
              type="no-results"
              onClearFilters={clearAllFilters}
              searchQuery={filters.search}
              filterCount={activeFilterCount}
            />
          ) : (
            <>
              {viewMode === "board" && (
                <KanbanBoard
                  project={filteredProject}
                  setActiveColumn={setActiveColumn}
                  setIsTaskModalOpen={setIsTaskModalOpen}
                />
              )}
              {viewMode === "list" && <ListView project={filteredProject} />}
            </>
          )}
        </main>

        <CreateTaskModal
          open={isTaskModalOpen}
          onOpenChange={setIsTaskModalOpen}
          status={activeColumn}
        />
      </div>
    </LazyDashboardLayout>
  );
}
