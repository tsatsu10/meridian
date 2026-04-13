// @epic-1.1-subtasks: Project task list view with Magic UI integration
// @persona-sarah: PM needs comprehensive task list management
// @persona-mike: Dev needs efficient task filtering and bulk operations
// @persona-david: Team lead needs task assignment and progress tracking

import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import LazyDashboardLayout from "@/components/performance/lazy-dashboard-layout";
import { ErrorBoundary } from "@/components/error-boundary";
import { EmptyState } from "@/components/empty-state";
import { ExperienceItemSkeleton } from "@/components/ui/skeleton-loader";
import { 
  Search, 
  Plus, 
  Filter,
  Target,
  ChevronDown,
  Layout,
  CheckSquare
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useState, useMemo, useCallback, useRef } from "react";
import { debounce, throttle } from "lodash";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { KeyboardShortcutsDialog } from "@/components/shared/keyboard-shortcuts-dialog";
import useGetTasks from "@/hooks/queries/task/use-get-tasks";
import useProjectStore from "@/store/project";
import { flattenTasks } from "@/utils/task-hierarchy";
import CreateTaskModal from "@/components/shared/modals/create-task-modal";
import CreateMilestoneModal from "@/components/shared/modals/create-milestone-modal";
import { useGetActiveWorkspaceUsers } from "@/hooks/queries/workspace-users/use-active-workspace-users";
import { toast } from "sonner";
import useGetProject from "@/hooks/queries/project/use-get-project";
import { useMilestones } from "@/hooks/use-milestones";
import useUpdateTask from "@/hooks/mutations/task/use-update-task";
import useDeleteTask from "@/hooks/mutations/task/use-delete-task";
// 🧠 MEMORY: Optimization utilities for large task lists
import { optimizedFlattenTasks, optimizedFilter } from "@/utils/memory-optimization";
import { useMemoryCleanup } from "@/components/performance/memory-cleanup-provider";
import { MemoryStatusBadge } from "@/components/performance/memory-status-badge";
// 🔒 SECURITY: XSS protection for user inputs
import { sanitizeString } from "@/utils/xss-protection";
// 🔒 SECURITY: Role-based access control
import { useProjectPermissions } from "@/hooks/use-project-permissions";
// ♻️ UX: Undo delete functionality
import { useUndo } from "@/hooks/use-undo";
// ✨ CONSISTENT: Use the same VirtualizedTaskList as All Tasks page
import { VirtualizedTaskList } from "@/components/all-tasks/virtualized-task-list";
// 🔧 UX: Bulk operations toolbar
import { BulkActionToolbar } from "@/components/shared/bulk-action-toolbar";
// 📱 MOBILE: Mobile-optimized filter sheet
import { MobileFilterSheet } from "@/components/shared/mobile-filter-sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute(
  "/dashboard/workspace/$workspaceId/project/$projectId/_layout/list"
)({
  component: () => (
    <ErrorBoundary>
      <ProjectListView />
    </ErrorBoundary>
  ),
});

// Pagination interface for consistency with All Tasks
interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

function ProjectListView() {
  const { projectId, workspaceId } = Route.useParams();
  const { data: columns, isLoading } = useGetTasks(projectId);
  const { data: projectData } = useGetProject({ id: projectId, workspaceId });
  const { setProject } = useProjectStore();
  const { getCurrentUsage, isHighMemory } = useMemoryCleanup();
  
  // 🔒 SECURITY: Check user permissions for this project
  const {
    canCreateTasks,
    canEditTasks,
    canDeleteTasks,
    canManageProject,
    hasProjectAccess,
    isLoading: permissionsLoading,
  } = useProjectPermissions(projectId, workspaceId);
  
  // Task management mutations
  const { mutateAsync: updateTask, isPending: isUpdating } = useUpdateTask();
  const { mutateAsync: deleteTask, isPending: isDeleting } = useDeleteTask();
  
  // ♻️ UX: Undo delete with 5-second window
  const { deleteWithUndo, isPendingDelete } = useUndo(
    async (taskId: string) => {
      await deleteTask(taskId);
      setSelectedTasks(prev => prev.filter(id => id !== taskId));
    },
    { 
      delay: 5000, 
      message: 'Task deleted. Click to undo.' 
    }
  );
  
  // Milestone management - moved to component level
  const { createMilestone } = useMilestones(projectId);

  // UI State - same as All Tasks page
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("");
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  
  // Pagination state - same as All Tasks page
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Keyboard shortcuts state
  const [isShortcutsDialogOpen, setIsShortcutsDialogOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // 📱 MOBILE: Mobile filter sheet state
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  
  // Calculate active filters count for mobile badge
  const activeFiltersCount = [statusFilter, priorityFilter, sortBy].filter(Boolean).length;

  // 🔒 SECURITY: Rate limiting for search and updates
  const debouncedSearch = useMemo(
    () => debounce((value: string) => setSearchTerm(value), 300),
    []
  );

  const throttledUpdate = useMemo(
    () => throttle(async (task: any, updates: any) => {
      try {
        await updateTask({
          ...task,
          ...updates,
          dueDate: task.dueDate ? task.dueDate.toISOString() : null
        });
        toast.success("Task updated successfully");
      } catch (error) {
        toast.error("Failed to update task");
      }
    }, 1000, { leading: true, trailing: false }),
    [updateTask]
  );

  // Memory-optimized task processing
  const allTasks = useMemo(() => {
    if (!columns) return [];
    
    const columnArray = Array.isArray(columns)
      ? columns
      : columns && Array.isArray((columns as any).columns)
        ? (columns as any).columns
        : [];

    // Use optimized flattening for large datasets
    const flattened = columnArray.flatMap((col: any) => col.tasks || []);
    const result = optimizedFlattenTasks(flattened);
    
    // Transform to match VirtualizedTaskList format
    return result.map((task: any) => ({
      ...task,
      number: task.number || 0,
      dueDate: task.dueDate ? new Date(task.dueDate) : null,
      createdAt: task.createdAt ? new Date(task.createdAt) : new Date(),
      assigneeName: task.assigneeName || task.userEmail || null,
      assigneeEmail: task.userEmail || null,
      project: {
        id: projectId,
        name: projectData?.name || 'Project',
        slug: projectData?.slug || 'project',
        icon: projectData?.icon ? <Layout className="h-4 w-4 text-muted-foreground" /> : '📋',
        workspaceId: workspaceId
      }
    }));
  }, [columns, projectId, projectData, workspaceId]);

  // Apply filtering and sorting - consistent with All Tasks
  const filteredAndSortedTasks = useMemo(() => {
    if (!allTasks.length) return [];
    
    let filtered = optimizedFilter(
      allTasks,
      (task: any) => {
        const matchesSearch = task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (task.userEmail?.toLowerCase() || "").includes(searchTerm.toLowerCase());
        const matchesStatus = !statusFilter || task.status === statusFilter;
        const matchesPriority = !priorityFilter || task.priority === priorityFilter;
        return matchesSearch && matchesStatus && matchesPriority;
      },
      1000 // Limit for project view
    );

    // Apply sorting
    if (sortBy) {
      filtered.sort((a: any, b: any) => {
        switch (sortBy) {
          case "title":
            return a.title.localeCompare(b.title);
          case "status":
            return a.status.localeCompare(b.status);
          case "priority":
            const priorityOrder = { low: 1, medium: 2, high: 3, urgent: 4 };
            return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
          case "dueDate":
            const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
            const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
            return dateA - dateB;
          case "created":
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          default:
            return 0;
        }
      });
    }

    return filtered;
  }, [allTasks, searchTerm, statusFilter, priorityFilter, sortBy]);

  // Pagination logic - same as All Tasks
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredAndSortedTasks.slice(start, end);
  }, [filteredAndSortedTasks, currentPage, pageSize]);

  const pagination: PaginationInfo = {
    page: currentPage,
    pageSize,
    total: filteredAndSortedTasks.length,
    totalPages: Math.ceil(filteredAndSortedTasks.length / pageSize)
  };

  // Task management functions - same as All Tasks
  const handleTaskSelect = (taskId: string) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTasks.length === paginatedTasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(paginatedTasks.map(task => task.id));
    }
  };

  // 🔒 SECURITY: Throttled reorder to prevent API spam
  const handleTaskReorder = useCallback(
    throttle(async (taskId: string, newPosition: number) => {
      try {
        const task = allTasks.find(t => t.id === taskId);
        if (!task) return;
        
        await updateTask({
          ...task,
          position: newPosition,
          dueDate: task.dueDate ? task.dueDate.toISOString() : null
        });
        
        toast.success("Task reordered successfully");
      } catch (error) {
        toast.error("Failed to reorder task");
        console.error("Task reorder error:", error);
      }
    }, 1000, { leading: true, trailing: false }),
    [allTasks, updateTask]
  );

  // 🔧 BULK OPERATIONS: Handlers for bulk actions
  const handleBulkStatusUpdate = async (status: string) => {
    if (!canEditTasks) {
      toast.error("You don't have permission to edit tasks");
      return;
    }

    try {
      const updatePromises = selectedTasks.map(async (taskId) => {
        const task = allTasks.find(t => t.id === taskId);
        if (!task) return;
        
        await updateTask({
          ...task,
          status,
          dueDate: task.dueDate ? task.dueDate.toISOString() : null
        });
      });

      await Promise.all(updatePromises);
      toast.success(`Updated ${selectedTasks.length} task(s) to ${status}`);
      setSelectedTasks([]);
    } catch (error) {
      toast.error("Failed to update tasks");
      console.error("Bulk status update error:", error);
    }
  };

  const handleBulkPriorityUpdate = async (priority: string) => {
    if (!canEditTasks) {
      toast.error("You don't have permission to edit tasks");
      return;
    }

    try {
      const updatePromises = selectedTasks.map(async (taskId) => {
        const task = allTasks.find(t => t.id === taskId);
        if (!task) return;
        
        await updateTask({
          ...task,
          priority,
          dueDate: task.dueDate ? task.dueDate.toISOString() : null
        });
      });

      await Promise.all(updatePromises);
      toast.success(`Updated ${selectedTasks.length} task(s) priority to ${priority}`);
      setSelectedTasks([]);
    } catch (error) {
      toast.error("Failed to update task priorities");
      console.error("Bulk priority update error:", error);
    }
  };

  const handleBulkDelete = async () => {
    if (!canDeleteTasks) {
      toast.error("You don't have permission to delete tasks");
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedTasks.length} task(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      const deletePromises = selectedTasks.map((taskId) => deleteTask(taskId));
      await Promise.all(deletePromises);
      
      toast.success(`Deleted ${selectedTasks.length} task(s)`);
      setSelectedTasks([]);
    } catch (error) {
      toast.error("Failed to delete tasks");
      console.error("Bulk delete error:", error);
    }
  };

  // ⌨️ KEYBOARD SHORTCUTS: Global shortcuts for the page
  useKeyboardShortcuts([
    {
      key: 'n',
      action: () => canCreateTasks && setIsTaskModalOpen(true),
      description: 'Create new task',
    },
    {
      key: '/',
      action: () => searchInputRef.current?.focus(),
      description: 'Focus search',
    },
    {
      key: 'k',
      meta: true,
      action: () => searchInputRef.current?.focus(),
      description: 'Focus search (Cmd/Ctrl+K)',
    },
    {
      key: '?',
      shift: true,
      action: () => setIsShortcutsDialogOpen(true),
      description: 'Show keyboard shortcuts',
    },
    {
      key: 'Escape',
      action: () => {
        if (selectedTasks.length > 0) {
          setSelectedTasks([]);
        }
      },
      description: 'Clear selection',
    },
  ]);

  if (isLoading) {
    return (
      <LazyDashboardLayout>
        <div className="flex-1 p-6 space-y-6">
          {/* Header Skeleton */}
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="space-y-2">
              <div className="h-8 w-48 bg-muted rounded animate-pulse" />
              <div className="h-4 w-64 bg-muted rounded animate-pulse" />
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-9 w-32 bg-muted rounded animate-pulse" />
              <div className="h-9 w-28 bg-muted rounded animate-pulse" />
            </div>
          </div>

          {/* Search and Filters Skeleton */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex-1 h-10 bg-muted rounded animate-pulse" />
            <div className="flex items-center gap-2">
              <div className="h-9 w-24 bg-muted rounded animate-pulse" />
              <div className="h-9 w-24 bg-muted rounded animate-pulse" />
              <div className="h-9 w-20 bg-muted rounded animate-pulse" />
            </div>
          </div>

          {/* Task List Skeleton - Dynamic based on pageSize */}
          <div className="space-y-3">
            {Array.from({ length: pageSize }).map((_, i) => (
              <ExperienceItemSkeleton key={i} />
            ))}
          </div>
        </div>
      </LazyDashboardLayout>
    );
  }

  return (
    <LazyDashboardLayout>
      <div className="flex-1 p-6 space-y-6">
        {/* Header - consistent with All Tasks */}
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Project Task List</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {filteredAndSortedTasks.length} {filteredAndSortedTasks.length === 1 ? 'task' : 'tasks'} 
              {selectedTasks.length > 0 && ` • ${selectedTasks.length} selected`}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <MemoryStatusBadge className="mr-2 hidden sm:block" />
            {canManageProject && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsMilestoneModalOpen(true)}
                aria-label="Create new milestone"
                className="hidden sm:flex"
              >
                <Target className="mr-2 h-4 w-4 text-orange-500" aria-hidden="true" />
                <span className="hidden md:inline">New Milestone</span>
                <span className="md:hidden">Milestone</span>
              </Button>
            )}
            {canCreateTasks && (
              <Button 
                size="sm" 
                onClick={() => setIsTaskModalOpen(true)}
                aria-label="Create new task"
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">New Task</span>
                <span className="sm:hidden">New</span>
              </Button>
            )}
          </div>
        </div>

        {/* Search and Filters - consistent with All Tasks */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Search tasks by title, description, or assignee... (Press / or Cmd+K)"
              value={searchTerm}
              onChange={(e) => {
                const sanitized = sanitizeString(e.target.value);
                setSearchTerm(sanitized);
                debouncedSearch(sanitized);
              }}
              className="pl-10"
              aria-label="Search tasks by title, description, or assignee"
              role="searchbox"
            />
          </div>
          
          {/* 📱 MOBILE: Mobile Filter Sheet (< 768px) */}
          <div className="md:hidden">
            <MobileFilterSheet
              open={isMobileFilterOpen}
              onOpenChange={setIsMobileFilterOpen}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              priorityFilter={priorityFilter}
              onPriorityFilterChange={setPriorityFilter}
              sortBy={sortBy}
              onSortChange={setSortBy}
              activeFiltersCount={activeFiltersCount}
            />
          </div>
          
          {/* 🖥️ DESKTOP: Desktop Filters (>= 768px) */}
          <div className="hidden md:flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  aria-label="Filter tasks by status"
                  aria-haspopup="true"
                >
                  <Filter className="mr-2 h-4 w-4" aria-hidden="true" />
                  Status
                  <ChevronDown className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent role="menu" aria-label="Status filter options">
                <DropdownMenuItem onClick={() => setStatusFilter("")} role="menuitem">
                  All Status
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setStatusFilter("todo")} role="menuitem">
                  To Do
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("in_progress")} role="menuitem">
                  In Progress
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("in_review")} role="menuitem">
                  In Review
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("done")} role="menuitem">
                  Done
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  aria-label="Filter tasks by priority"
                  aria-haspopup="true"
                >
                  Priority
                  <ChevronDown className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent role="menu" aria-label="Priority filter options">
                <DropdownMenuItem onClick={() => setPriorityFilter("")} role="menuitem">
                  All Priority
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setPriorityFilter("urgent")} role="menuitem">
                  Urgent
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPriorityFilter("high")} role="menuitem">
                  High
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPriorityFilter("medium")} role="menuitem">
                  Medium
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPriorityFilter("low")} role="menuitem">
                  Low
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  aria-label="Sort tasks"
                  aria-haspopup="true"
                >
                  Sort
                  <ChevronDown className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent role="menu" aria-label="Sort options">
                <DropdownMenuItem onClick={() => setSortBy("")} role="menuitem">
                  Default Order
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSortBy("title")} role="menuitem">
                  Title A-Z
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("priority")} role="menuitem">
                  Priority (High to Low)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("dueDate")} role="menuitem">
                  Due Date (Earliest)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("created")} role="menuitem">
                  Recently Created
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Empty State for Zero Tasks */}
        {!isLoading && filteredAndSortedTasks.length === 0 && (
          <EmptyState
            icon={CheckSquare}
            title={searchTerm || statusFilter || priorityFilter ? "No tasks found" : "No tasks yet"}
            description={
              searchTerm || statusFilter || priorityFilter
                ? "Try adjusting your search or filters to find what you're looking for."
                : "Create your first task to get started with project management."
            }
            actionLabel={canCreateTasks ? "Create Task" : undefined}
            onAction={canCreateTasks ? () => setIsTaskModalOpen(true) : undefined}
          />
        )}

        {/* Virtualized Task List - SAME AS ALL TASKS PAGE */}
        {filteredAndSortedTasks.length > 0 && (
          <VirtualizedTaskList
            tasks={paginatedTasks}
            selectedTasks={selectedTasks}
            onTaskSelect={handleTaskSelect}
            onSelectAll={handleSelectAll}
          onTaskUpdate={canEditTasks ? async (taskId: string, updates: any) => {
            const task = allTasks.find(t => t.id === taskId);
            if (!task) return;
            
            try {
              await updateTask({
                ...task,
                ...updates,
                dueDate: task.dueDate ? task.dueDate.toISOString() : null
              });
              toast.success("Task updated successfully");
            } catch (error) {
              toast.error("Failed to update task");
            }
          } : undefined}
          onTaskDelete={canDeleteTasks ? (taskId: string) => {
            deleteWithUndo(taskId);
          } : undefined}
          onTaskReorder={handleTaskReorder}
          isLoading={isLoading}
          className="w-full"
          pagination={pagination}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          onPageChange={setCurrentPage}
          />
        )}

        {/* Bulk Action Toolbar - Floating at bottom */}
        <BulkActionToolbar
          selectedCount={selectedTasks.length}
          onBulkStatusUpdate={handleBulkStatusUpdate}
          onBulkPriorityUpdate={handleBulkPriorityUpdate}
          onBulkDelete={handleBulkDelete}
          onClearSelection={() => setSelectedTasks([])}
          canDelete={canDeleteTasks}
          canEdit={canEditTasks}
        />

        {/* Keyboard Shortcuts Dialog */}
        <KeyboardShortcutsDialog
          open={isShortcutsDialogOpen}
          onClose={() => setIsShortcutsDialogOpen(false)}
          shortcuts={[
            {
              key: 'n',
              action: () => {},
              description: 'Create new task',
            },
            {
              key: '/',
              action: () => {},
              description: 'Focus search',
            },
            {
              key: 'k',
              meta: true,
              action: () => {},
              description: 'Focus search (Cmd/Ctrl+K)',
            },
            {
              key: '?',
              shift: true,
              action: () => {},
              description: 'Show keyboard shortcuts',
            },
            {
              key: 'Escape',
              action: () => {},
              description: 'Clear selection',
            },
          ]}
        />

        {/* Modals */}
        <CreateTaskModal 
          open={isTaskModalOpen} 
          onClose={() => setIsTaskModalOpen(false)} 
          status="todo"
          projectContext={{
            id: projectId,
            name: projectData?.name || 'Project',
            slug: projectData?.slug || 'project',
            icon: projectData?.icon ? <Layout className="h-4 w-4 text-muted-foreground" /> : '📋'
          }}
        />
        
        <CreateMilestoneModal
          open={isMilestoneModalOpen}
          onClose={() => setIsMilestoneModalOpen(false)}
          projectId={projectId}
          projectName={projectData?.name}
          onMilestoneCreated={(milestone) => {
            createMilestone({
              ...milestone,
              projectId,
            });
            setIsMilestoneModalOpen(false);
          }}
        />
      </div>
    </LazyDashboardLayout>
  );
} 