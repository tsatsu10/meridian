import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  ToggleGroup, 
  ToggleGroupItem 
} from "@/components/ui/toggle-group";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// Import enhanced backlog view and fallback
import EnhancedBacklogView from "@/components/backlog-list-view/enhanced-backlog-view";
import BacklogListView from "@/components/backlog-list-view";
import PageTitle from "@/components/page-title";
import CreateTaskModal from "@/components/shared/modals/create-task-modal";
import { BulkActionsToolbar } from "@/components/backlog/bulk-actions-toolbar";
import { BacklogHelpDialog } from "@/components/backlog/backlog-help-dialog";
import { BacklogSkeleton } from "@/components/backlog/backlog-skeleton";
import { BacklogAnalyticsPanel } from "@/components/backlog/backlog-analytics-panel";

// Import hooks and stores
import useGetTasks from "@/hooks/queries/task/use-get-tasks";
import useProjectStore from "@/store/project";
import useUpdateTask from "@/hooks/mutations/task/use-update-task";
import { useRBACAuth } from "@/lib/permissions/context";
import { useProjectPermissions } from "@/lib/permissions/hooks";
import { useKeyboardShortcuts, type KeyboardShortcut } from "@/hooks/use-keyboard-shortcuts";
import { z } from "zod";

// Theme API hooks
import { useCreateTheme } from "@/hooks/mutations/theme/use-create-theme";
import { useUpdateTheme } from "@/hooks/mutations/theme/use-update-theme";
import { useDeleteTheme } from "@/hooks/mutations/theme/use-delete-theme";

// Bulk operation hooks
import {
  useBulkUpdateStatus,
  useBulkUpdatePriority,
  useBulkAssignTasks,
  useBulkArchiveTasks,
  useBulkDeleteTasks,
} from "@/hooks/mutations/task/use-bulk-operations";

// Import types
import type { TaskTheme, EnhancedTask } from "@/types/backlog";
import type { ProjectWithTasks } from "@/types/project";
import type Task from "@/types/task";

// Icons
import { 
  Layout, 
  Grid, 
  Settings,
  ArrowRight,
  Plus,
  Sparkles,
  ChevronLeft,
  FolderKanban,
  AlertCircle,
  Filter,
  Search,
  X,
  Lock
} from "lucide-react";

import LazyDashboardLayout from "@/components/performance/lazy-dashboard-layout";
import useGetProject from "@/hooks/queries/project/use-get-project";

export const Route = createFileRoute(
  "/dashboard/workspace/$workspaceId/project/$projectId/backlog",
)({
  component: BacklogPage,
});

// 🛡️ SECURITY: Theme validation schema
const themeSchema = z.object({
  name: z.string()
    .min(1, "Theme name is required")
    .max(100, "Theme name must be less than 100 characters")
    .trim(),
  description: z.string()
    .max(500, "Description must be less than 500 characters")
    .trim()
    .optional(),
  color: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex code (e.g., #FF5733)")
    .optional()
    .default("#6366f1"),
});

// @epic-1.1-subtasks @persona-sarah - PM needs comprehensive backlog management with themes and prioritization
function BacklogPage() {
  const { projectId, workspaceId } = Route.useParams();
  const navigate = useNavigate();
  const { data, isLoading, error } = useGetTasks(projectId);
  const { data: projectData, isLoading: isProjectLoading, error: projectError } = useGetProject({ id: projectId, workspaceId });
  const { project, setProject } = useProjectStore();
  const { mutate: updateTask } = useUpdateTask();
  
  // 🎨 Theme mutations
  const { mutate: createTheme, isPending: isCreatingTheme } = useCreateTheme();
  const { mutate: updateTheme, isPending: isUpdatingTheme } = useUpdateTheme();
  const { mutate: deleteTheme, isPending: isDeletingTheme } = useDeleteTheme();
  
  // ☑️ Bulk operation mutations
  const { mutate: bulkUpdateStatus } = useBulkUpdateStatus();
  const { mutate: bulkUpdatePriority } = useBulkUpdatePriority();
  const { mutate: bulkAssign } = useBulkAssignTasks();
  const { mutate: bulkArchive } = useBulkArchiveTasks();
  const { mutate: bulkDelete } = useBulkDeleteTasks();
  
  // 🔒 SECURITY: RBAC permission checks
  const { hasPermission, user } = useRBACAuth();
  const projectPermissions = useProjectPermissions(projectId);
  
  // Check if user can edit backlog
  const canEditBacklog = projectPermissions.canEdit || hasPermission('canEditProjects');
  const canDeleteItems = projectPermissions.canDelete || hasPermission('canDeleteProjects');
  
  // View management state
  const [viewMode, setViewMode] = useState<'enhanced' | 'classic'>('enhanced');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  
  // 🔍 FEATURE: Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    priority: null as string | null,
    assignee: null as string | null,
    theme: null as string | null,
  });
  
  // ☑️ FEATURE: Bulk selection state
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [showHelp, setShowHelp] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(true);

  // Update project data when tasks are fetched
  useEffect(() => {
    if (data) {
      setProject(data);
    }
  }, [data, setProject]);

  // ⌨️ FEATURE: Keyboard shortcuts for productivity
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'n',
        action: () => {
          if (canEditBacklog) {
            setIsCreateTaskOpen(true);
          }
        },
        description: 'Create new backlog item',
      },
      {
        key: '/',
        action: () => {
          document.querySelector<HTMLInputElement>('input[placeholder*="Search"]')?.focus();
        },
        description: 'Focus search',
      },
      {
        key: 'f',
        action: () => {
          setShowFilters(!showFilters);
        },
        description: 'Toggle filters',
      },
      {
        key: 'e',
        action: () => {
          setViewMode(viewMode === 'enhanced' ? 'classic' : 'enhanced');
        },
        description: 'Toggle enhanced/classic view',
      },
      {
        key: 'Escape',
        action: () => {
          if (showFilters) {
            setShowFilters(false);
          } else if (searchQuery) {
            setSearchQuery('');
          } else if (selectedTasks.size > 0) {
            setSelectedTasks(new Set());
          }
        },
        description: 'Close filters or clear search',
      },
      {
        key: '?',
        action: () => {
          setShowHelp(true);
        },
        description: 'Show keyboard shortcuts help',
      },
      {
        key: 'a',
        ctrlKey: true,
        action: () => {
          // Select all visible tasks
          const allTaskIds = new Set([
            ...(project?.plannedTasks || []).map(t => t.id),
            ...(project?.archivedTasks || []).map(t => t.id),
          ]);
          setSelectedTasks(allTaskIds);
        },
        description: 'Select all tasks',
      },
      {
        key: 'd',
        ctrlKey: true,
        action: () => {
          setSelectedTasks(new Set());
        },
        description: 'Deselect all tasks',
      },
    ],
    enabled: !isTaskModalOpen && !isCreateTaskOpen && !showHelp,
  });

  // ✅ PRODUCTION: Real API theme handlers with validation and permission checks
  const handleThemeCreate = async (theme: Omit<TaskTheme, 'id' | 'createdAt' | 'updatedAt'>) => {
    // Check permissions
    if (!canEditBacklog) {
      toast.error('Permission denied', {
        description: 'You do not have permission to create themes in this project.'
      });
      return;
    }

    try {
      // Validate input with Zod
      const validated = themeSchema.parse(theme);
      
      // ✅ Real API call with audit logging
      createTheme({
        projectId,
        name: validated.name,
        description: validated.description,
        color: validated.color,
      });
      
      // Note: Success toast and query invalidation handled by the hook
      return;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast.error('Invalid theme data', {
          description: firstError.message
        });
      }
      throw error;
    }
  };

  const handleThemeEdit = async (theme: TaskTheme) => {
    // Check permissions
    if (!canEditBacklog) {
      toast.error('Permission denied', {
        description: 'You do not have permission to edit themes in this project.'
      });
      return theme;
    }

    try {
      // Validate input
      const validated = themeSchema.parse({
        name: theme.name,
        description: theme.description,
        color: theme.color,
      });
      
      // ✅ Real API call
      updateTheme({
        themeId: theme.id,
        projectId,
        name: validated.name,
        description: validated.description,
        color: validated.color,
      });

      // Note: Success toast and query invalidation handled by the hook
      return theme;
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error('Invalid theme data', {
          description: error.errors[0].message
        });
      }
      throw error;
    }
  };

  const handleThemeDelete = async (themeId: string, themeName?: string) => {
    // Check permissions
    if (!canDeleteItems) {
      toast.error('Permission denied', {
        description: 'You do not have permission to delete themes in this project.'
      });
      return;
    }

    // Confirm deletion
    if (!confirm('Are you sure you want to delete this theme? Tasks will not be deleted, but will lose their theme association.')) {
      return;
    }

    // ✅ Real API call
    deleteTheme({
      themeId,
      projectId,
      themeName,
    });
    
    // Note: Success toast and query invalidation handled by the hook
  };

  // ✅ FIXED: Task click now navigates to task detail page
  const handleTaskClick = (task: EnhancedTask) => {
    navigate({
      to: '/dashboard/workspace/$workspaceId/project/$projectId/task/$taskId',
      params: {
        workspaceId,
        projectId,
        taskId: task.id
      }
    });
  };

  const handleTaskUpdate = async (taskId: string, updates: Partial<EnhancedTask>) => {
    try {
      // Convert enhanced task updates to regular task updates
      const taskUpdates: Partial<Task> = {
        title: updates.title,
        description: updates.description,
        priority: updates.priority,
        dueDate: updates.dueDate,
        status: updates.status,
        userEmail: updates.userEmail,
        // Map other compatible fields as needed
      };
      
      updateTask({ id: taskId, ...taskUpdates });
      toast.success('Task updated successfully');
    } catch (error) {
      console.error('Failed to update task:', error);
      toast.error('Failed to update task');
    }
  };

  // Bulk operation to move all planned tasks to todo
  const handleMoveAllPlannedToTodo = () => {
    if (!project) return;

    const plannedTasks = project.plannedTasks || [];

    if (plannedTasks.length === 0) {
      toast.info("No planned tasks to move");
      return;
    }

    if (!confirm(`Move all ${plannedTasks.length} planned tasks to To Do?`)) {
      return;
    }

    // Move all planned tasks to the to-do column
    plannedTasks.forEach((task) => {
      const taskUpdate = {
        ...task,
        status: "todo" as const,
      };
      updateTask(taskUpdate);
    });

    toast.success(`Moved ${plannedTasks.length} tasks to To Do`);
  };

  // ✅ PRODUCTION: Real API bulk operation handlers
  const handleBulkDelete = () => {
    if (!canDeleteItems) {
      toast.error('Permission denied', {
        description: 'You do not have permission to delete items.'
      });
      return;
    }

    if (!confirm(`Delete ${selectedTasks.size} selected items? This action cannot be undone.`)) {
      return;
    }

    // ✅ Real API call
    bulkDelete({
      taskIds: Array.from(selectedTasks),
      userId: user?.id || '',
      projectId,
    });
    setSelectedTasks(new Set());
    // Note: Success toast and query invalidation handled by the hook
  };

  const handleBulkArchive = () => {
    if (!canEditBacklog) {
      toast.error('Permission denied');
      return;
    }

    // ✅ Real API call
    bulkArchive({
      taskIds: Array.from(selectedTasks),
      userId: user?.id || '',
      projectId,
    });
    setSelectedTasks(new Set());
    // Note: Success toast and query invalidation handled by the hook
  };

  const handleBulkMoveToSprint = () => {
    if (!canEditBacklog) {
      toast.error('Permission denied');
      return;
    }

    // ✅ Real API call - move to 'todo' status
    bulkUpdateStatus({
      taskIds: Array.from(selectedTasks),
      status: 'todo',
      userId: user?.id || '',
      projectId,
    });
    setSelectedTasks(new Set());
    // Note: Success toast and query invalidation handled by the hook
  };

  const handleBulkSetPriority = (priority: 'low' | 'medium' | 'high' | 'urgent') => {
    if (!canEditBacklog) {
      toast.error('Permission denied');
      return;
    }

    // ✅ Real API call
    bulkUpdatePriority({
      taskIds: Array.from(selectedTasks),
      priority,
      userId: user?.id || '',
      projectId,
    });
    // Note: Success toast and query invalidation handled by the hook
  };

  const handleBulkAssign = (assigneeId: string, assigneeEmail: string) => {
    if (!canEditBacklog) {
      toast.error('Permission denied');
      return;
    }

    // ✅ Real API call
    bulkAssign({
      taskIds: Array.from(selectedTasks),
      assigneeId,
      assigneeEmail,
      userId: user?.id || '',
      projectId,
    });
    // Note: Success toast and query invalidation handled by the hook
  };

  // 💀 Enhanced loading state with skeleton
  if (isLoading || isProjectLoading) {
    return (
      <LazyDashboardLayout>
        <BacklogSkeleton />
      </LazyDashboardLayout>
    );
  }

  if (error || projectError) {
    return (
      <LazyDashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <AlertCircle className="h-12 w-12 text-orange-500" />
          <h3 className="text-lg font-semibold">Unable to load backlog</h3>
          <p className="text-muted-foreground">There was an error loading the project backlog.</p>
        </div>
      </LazyDashboardLayout>
    );
  }

  // Prepare project data for backlog views
  const backlogProject: ProjectWithTasks | undefined = project ? {
    ...project,
    columns: [
      {
        id: "planned" as const,
        name: "Planned" as const,
        tasks: (project.plannedTasks || []).map((task) => ({
          ...task,
          assigneeName: null,
          assigneeEmail: null,
        })),
      },
      {
        id: "archived" as const,
        name: "Archived" as const,
        tasks: (project.archivedTasks || []).map((task) => ({
          ...task,
          assigneeName: null,
          assigneeEmail: null,
        })),
      },
    ],
    plannedTasks: (project.plannedTasks || []).map((task) => ({
      ...task,
      assigneeName: null,
      assigneeEmail: null,
    })),
    archivedTasks: (project.archivedTasks || []).map((task) => ({
      ...task,
      assigneeName: null,
      assigneeEmail: null,
    })),
  } : undefined;

  const totalBacklogTasks = (project?.plannedTasks?.length || 0) + (project?.archivedTasks?.length || 0);

  // 🔒 SECURITY: Show access denied if no permission
  if (!canEditBacklog && (project?.plannedTasks?.length || 0) === 0) {
    return (
      <LazyDashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/20">
            <Lock className="h-12 w-12 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold">Access Restricted</h3>
          <p className="text-muted-foreground text-center max-w-md">
            You don't have permission to view or edit the backlog for this project.
            Contact your project admin if you need access.
          </p>
        </div>
      </LazyDashboardLayout>
    );
  }

  return (
    <LazyDashboardLayout>
      <div className="flex-1 p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* 🎨 Enhanced Header with Search */}
        <div className="space-y-4">
          {/* Title and Actions */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Product Backlog</h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                Manage and prioritize your product backlog for {projectData?.name}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {canEditBacklog && (
                <Button size="sm" onClick={() => setIsCreateTaskOpen(true)}>
                  <Plus className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">New Item</span>
                </Button>
              )}
            </div>
          </div>

          {/* 🔍 Search and Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search backlog items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Button */}
            <Sheet open={showFilters} onOpenChange={setShowFilters}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="shrink-0">
                  <Filter className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Filters</span>
                  {(filters.priority || filters.assignee || filters.theme) && (
                    <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-xs">
                      {[filters.priority, filters.assignee, filters.theme].filter(Boolean).length}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-96">
                <SheetHeader>
                  <SheetTitle>Filter Backlog</SheetTitle>
                  <SheetDescription>
                    Filter backlog items by priority, assignee, or theme
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  {/* Priority Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Priority</label>
                    <div className="flex gap-2 flex-wrap">
                      {['low', 'medium', 'high', 'urgent'].map((priority) => (
                        <Button
                          key={priority}
                          variant={filters.priority === priority ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFilters(f => ({ 
                            ...f, 
                            priority: f.priority === priority ? null : priority 
                          }))}
                          className="capitalize"
                        >
                          {priority}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Clear Filters */}
                  {(filters.priority || filters.assignee || filters.theme) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFilters({ priority: null, assignee: null, theme: null })}
                      className="w-full"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Clear All Filters
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* 📊 Analytics Toggle Button */}
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="text-xs"
            >
              {showAnalytics ? 'Hide' : 'Show'} Analytics
            </Button>
          </div>
        </div>

        {/* 📊 Analytics Panel */}
        {showAnalytics && (
          <BacklogAnalyticsPanel 
            tasks={[...(project?.plannedTasks || []), ...(project?.archivedTasks || [])]}
          />
        )}

        {/* View Mode Toggle */}
        <div className="flex items-center justify-between">
          <ToggleGroup 
            type="single" 
            value={viewMode} 
            onValueChange={(value) => value && setViewMode(value as 'enhanced' | 'classic')}
            className="border rounded-lg p-1"
          >
            <ToggleGroupItem value="enhanced" className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4" />
              <span>Enhanced</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="classic" className="flex items-center space-x-2">
              <Layout className="h-4 w-4" />
              <span>Classic</span>
            </ToggleGroupItem>
          </ToggleGroup>
          
          {totalBacklogTasks > 0 && (
            <Badge variant="outline" className="text-sm">
              {totalBacklogTasks} items in backlog
            </Badge>
          )}
        </div>

        {/* Quick Actions */}
        {(project?.plannedTasks?.length || 0) > 0 && (
          <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-md">
                <ArrowRight className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-100">
                  Ready to Start Sprint?
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  You have {project.plannedTasks.length} planned tasks ready to move to active development
                </p>
              </div>
            </div>
            <Button onClick={handleMoveAllPlannedToTodo} className="bg-blue-600 hover:bg-blue-700">
              Move to Development
            </Button>
          </div>
        )}

        {/* Main Content */}
        <div className="min-h-[600px]">
          {viewMode === 'enhanced' && backlogProject ? (
            <EnhancedBacklogView
              project={backlogProject}
              onThemeCreate={handleThemeCreate}
              onThemeEdit={handleThemeEdit}
              onThemeDelete={handleThemeDelete}
              onTaskClick={handleTaskClick}
              onTaskUpdate={handleTaskUpdate}
            />
          ) : backlogProject ? (
            <BacklogListView
              project={backlogProject}
              onTaskClick={handleTaskClick}
              onTaskUpdate={handleTaskUpdate}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-[400px] border-2 border-dashed border-muted-foreground/25 rounded-lg">
              <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                No backlog items yet
              </h3>
              <p className="text-muted-foreground text-center mb-4 max-w-md">
                Start building your product backlog by creating your first user story or task. 
                Organize them into themes for better management.
              </p>
              <Button onClick={() => setIsCreateTaskOpen(true)} size="lg">
                <Plus className="mr-2 h-4 w-4" />
                Create First Item
              </Button>
            </div>
          )}
        </div>

        {/* Create Task Modal */}
        <CreateTaskModal
          open={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          projectContext={{
            id: projectId,
            name: projectData?.name || 'Project',
            slug: projectData?.slug || 'project'
          }}
        />

        {/* ☑️ Bulk Actions Toolbar */}
        <BulkActionsToolbar
          selectedCount={selectedTasks.size}
          onClearSelection={() => setSelectedTasks(new Set())}
          onBulkDelete={handleBulkDelete}
          onBulkArchive={handleBulkArchive}
          onBulkMoveToSprint={handleBulkMoveToSprint}
          onBulkSetPriority={handleBulkSetPriority}
          onBulkAssign={handleBulkAssign}
        />

        {/* ⌨️ Help Dialog */}
        <BacklogHelpDialog
          open={showHelp}
          onOpenChange={setShowHelp}
        />

        {/* 💡 Help Button (Bottom Right) */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowHelp(true)}
          className="fixed bottom-6 right-6 z-40 rounded-full w-10 h-10 p-0 shadow-lg hover:shadow-xl transition-shadow"
          title="Keyboard shortcuts (Press ?)"
        >
          <span className="text-lg font-semibold">?</span>
        </Button>
      </div>
    </LazyDashboardLayout>
  );
}
