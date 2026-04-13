"use client";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import useAuth from "@/components/providers/auth-provider/hooks/use-auth";
import { logger } from "@/lib/logger";
import type { AllTasksFilters } from "@/hooks/queries/task/use-all-tasks";
import { useWorkspaceTaskStats } from "@/hooks/queries/task/use-workspace-task-stats";
import { useBulkUpdateTaskStatus } from "@/hooks/mutations/task/use-bulk-update-task-status";
import { AllTasksVirtualGrid } from "@/components/all-tasks/all-tasks-virtual-grid";
import { AdvancedFilters } from "@/components/all-tasks/advanced-filters";
import React, { useState, useMemo, Suspense, lazy, memo } from "react";
import { TasksPageSkeleton } from "@/components/ui/loading-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CheckSquare, 
  Plus, 
  Calendar, 
  Users, 
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Pause,
  Play,
  Filter,
  Search,
  MoreHorizontal,
  Flag,
  User,
  Target,
  Zap,
  Activity,
  ArrowRight,
  Edit,
  Trash2,
  Loader2,
  Copy,
  UserPlus,
  Layout,
  X
} from "lucide-react";
import { cn } from "@/lib/cn";
import { motion, AnimatePresence } from "framer-motion";
import { format, isToday, isTomorrow, isPast } from "date-fns";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import { useRBACAuth } from "@/lib/permissions";
import useWorkspaceStore from "@/store/workspace";
import useProjectStore from "@/store/project";
import LazyDashboardLayout from "@/components/performance/lazy-dashboard-layout";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CreateTaskModal from "@/components/shared/modals/create-task-modal";
import EditTaskModal from "@/components/shared/modals/edit-task-modal";
import useAllTasks from "@/hooks/queries/task/use-all-tasks";
import useUpdateTask from "@/hooks/mutations/task/use-update-task";
import useDeleteTask from "@/hooks/mutations/task/use-delete-task";
import useCreateTask from "@/hooks/mutations/task/use-create-task";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import useGetProjects from "@/hooks/queries/project/use-get-projects";
import type { Task } from "@/types/task";
import type { Project } from "@/types/project";

// Import All Tasks view components
import { AllTasksKanbanView } from "@/components/all-tasks/kanban-view";
import { AllTasksCalendarView } from "@/components/all-tasks/calendar-view";
import { BlurFade } from "@/components/magicui/blur-fade";
import ErrorBoundary from "@/components/error-boundary";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/dashboard/all-tasks")({
  component: AllTasksPage,
  validateSearch: (search: Record<string, unknown>) => {
    const q = typeof search.q === "string" ? search.q : undefined;
    const scope =
      search.scope === "my-tasks" ||
      search.scope === "overdue" ||
      search.scope === "today" ||
      search.scope === "all"
        ? search.scope
        : undefined;
    return { q, scope };
  },
});

// Task status mapping - aligned with database schema
const TASK_STATUS = {
  todo: { label: "To Do", color: "bg-gray-500", icon: Clock, textColor: "text-gray-600" },
  in_progress: { label: "In Progress", color: "bg-blue-500", icon: Play, textColor: "text-blue-600" },
  done: { label: "Done", color: "bg-green-500", icon: CheckCircle2, textColor: "text-green-600" },
};

// Task priority mapping
const TASK_PRIORITY = {
  low: { label: "Low", color: "bg-gray-500", textColor: "text-gray-600" },
  medium: { label: "Medium", color: "bg-yellow-500", textColor: "text-yellow-600" },
  high: { label: "High", color: "bg-red-500", textColor: "text-red-600" },
  urgent: { label: "Urgent", color: "bg-purple-500", textColor: "text-purple-600" }
};

// Task Card Loading Skeleton Component
const TaskCardSkeleton = () => (
  <Card className="overflow-hidden glass-card border-border/50">
    <CardContent className="p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <div className="flex items-center space-x-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>

        {/* Description */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Enhanced task card component
const TaskCard = ({ task, onAction, showCheckbox, isSelected, onSelect }: {
  task: Task;
  onAction: (action: string, task: Task) => void;
  showCheckbox?: boolean;
  isSelected?: boolean;
  onSelect?: (taskId: string) => void;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const statusInfo = TASK_STATUS[task.status as keyof typeof TASK_STATUS] || TASK_STATUS.todo;
  const priorityInfo = TASK_PRIORITY[task.priority as keyof typeof TASK_PRIORITY] || TASK_PRIORITY.medium;

  const getDueDateStatus = () => {
    if (!task.dueDate) return "no-date";
    if (task.status === "completed" || task.status === "done") return "completed";
    if (isPast(new Date(task.dueDate))) return "overdue";
    if (isToday(new Date(task.dueDate))) return "today";
    if (isTomorrow(new Date(task.dueDate))) return "tomorrow";
    return "upcoming";
  };

  const dueDateStatus = getDueDateStatus();
  const dueDateColors = {
    overdue: "text-red-500 bg-red-50 dark:bg-red-900/20",
    today: "text-orange-500 bg-orange-50 dark:bg-orange-900/20",
    tomorrow: "text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20",
    upcoming: "text-blue-500 bg-blue-50 dark:bg-blue-900/20",
    completed: "text-green-500 bg-green-50 dark:bg-green-900/20",
    "no-date": "text-gray-500 bg-gray-50 dark:bg-gray-900/20"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Card className={cn(
        "relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.01] glass-card border-border/50",
        isHovered && "shadow-xl",
        isSelected && "ring-2 ring-primary"
      )}>
        <CardContent className="p-6">
          {/* Task Header */}
          <div className="flex items-start justify-between mb-4">
            {showCheckbox && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onSelect?.(task.id)}
                className="mt-1 mr-3 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                onClick={(e) => e.stopPropagation()}
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="font-semibold text-foreground truncate">{task.title}</h3>
                <Badge className={cn("text-xs text-white", priorityInfo.color)}>
                  {priorityInfo.label}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  #{task.number}
                </Badge>
              </div>
              {task.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{task.description}</p>
              )}
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-card bg-background dark:bg-gray-900 border-border/50">
                <DropdownMenuLabel>Task Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onAction('view', task)}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAction('edit', task)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Task
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAction('assign', task)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Reassign
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAction('duplicate', task)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onAction('delete', task)} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Status and Project */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Badge className={cn("text-xs text-white", statusInfo.color)}>
                <statusInfo.icon className="h-3 w-3 mr-1" />
                {statusInfo.label}
              </Badge>
              {task.project && (
                <Badge variant="outline" className="text-xs">
                  {task.project.icon ? (
                    <Layout className="h-4 w-4 text-muted-foreground mr-2" />
                  ) : null}
                  {task.project.name}
                </Badge>
              )}
            </div>
            
            {task.dueDate && (
              <div className={cn("px-2 py-1 rounded-full text-xs font-medium", dueDateColors[dueDateStatus])}>
                {dueDateStatus === "overdue" && "Overdue"}
                {dueDateStatus === "today" && "Due Today"}
                {dueDateStatus === "tomorrow" && "Due Tomorrow"}
                {dueDateStatus === "upcoming" && format(new Date(task.dueDate), "MMM d")}
                {dueDateStatus === "completed" && "Completed"}
                {dueDateStatus === "no-date" && "No due date"}
              </div>
            )}
          </div>

          {/* Assignment Info */}
          <div className="flex items-center space-x-2 mt-4">
            {task.assignedTeamId ? (
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {task.assignedTeam?.name || 'Assigned Team'}
                </span>
              </div>
            ) : task.assigneeEmail && task.assigneeEmail !== 'unassigned' ? (
              <div className="flex items-center space-x-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={task.assigneeAvatar} />
                  <AvatarFallback>
                    {task.assigneeName?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground">
                  {task.assigneeName || task.assigneeEmail}
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Unassigned</span>
              </div>
            )}
          </div>

          {/* Activity Indicators */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center space-x-3">
              <span className="flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                {format(new Date(task.createdAt), "MMM d")}
              </span>
              {task.project && (
                <span className="flex items-center">
                  <Target className="h-3 w-3 mr-1" />
                  {task.project.name}
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => onAction('view', task)}
            >
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default function AllTasksPage() {
  const urlSearch = Route.useSearch();
  const { user } = useAuth();
  const { hasPermission } = useRBACAuth();
  const { workspace } = useWorkspaceStore();
  const { project } = useProjectStore();
  const { data: projects = [] as Project[] } = useGetProjects({ workspaceId: workspace?.id ?? "" });
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(urlSearch.q ?? "");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [activeTab, setActiveTab] = useState(urlSearch.scope ?? "all");
  const [advancedFilters, setAdvancedFilters] = useState<Partial<AllTasksFilters>>({});
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isEditTaskOpen, setIsEditTaskOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12); // Tasks per page

  // View mode state management with database persistence
  const { 
    allTasksViewMode, 
    updateAllTasksViewMode,
    isLoading: preferencesLoading 
  } = useUserPreferences();
  
  const viewMode = allTasksViewMode as "list" | "kanban" | "calendar";

  const { mutateAsync: bulkUpdateStatus, isPending: isBulkStatusPending } = useBulkUpdateTaskStatus();

  React.useEffect(() => {
    navigate({
      to: "/dashboard/all-tasks",
      search: {
        q: searchQuery || undefined,
        scope: activeTab === "all" ? undefined : activeTab,
      },
      replace: true,
    });
  }, [searchQuery, activeTab, navigate]);
  
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Permissions check - MUST be before keyboard shortcuts
  const canCreateTasks = hasPermission("canCreateTasks");
  const canViewAllTasks = hasPermission("canViewAllTasks");
  const canEditTasks = hasPermission("canEditTasks");
  const canDeleteTasks = hasPermission("canDeleteTasks");
  
  // Keyboard shortcuts (uses canCreateTasks)
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // N - New task
      if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (canCreateTasks) {
          handleCreateTask();
        }
      }
      
      // F or / - Focus search
      if ((e.key.toLowerCase() === 'f' || e.key === '/') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        document.getElementById("all-tasks-search")?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [canCreateTasks]);

  // Task mutation hooks
  const { mutateAsync: deleteTask, isPending: isDeletingTask } = useDeleteTask(selectedTask?.projectId || "");
  const { mutateAsync: createTask } = useCreateTask();

  const apiFilters = useMemo((): AllTasksFilters => {
    const filters: AllTasksFilters = {};

    if (searchQuery) {
      filters.search = searchQuery;
    }

    if (filterStatus !== "all") {
      filters.status = [filterStatus];
    }

    if (filterPriority !== "all") {
      filters.priority = [filterPriority];
    }

    if (activeTab === "my-tasks") {
      filters.assignedToMe = true;
    } else if (activeTab === "overdue") {
      filters.dueBefore = new Date();
      filters.status = ["todo", "in_progress"];
    } else if (activeTab === "today") {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      filters.dueAfter = today;
      filters.dueBefore = tomorrow;
    }

    if (advancedFilters.projectIds?.length) {
      filters.projectIds = advancedFilters.projectIds;
    }
    if (advancedFilters.dueAfter) {
      filters.dueAfter = advancedFilters.dueAfter;
    }
    if (advancedFilters.dueBefore) {
      filters.dueBefore = advancedFilters.dueBefore;
    }

    filters.limit = pageSize;
    filters.offset = (currentPage - 1) * pageSize;

    return filters;
  }, [
    searchQuery,
    filterStatus,
    filterPriority,
    activeTab,
    currentPage,
    pageSize,
    advancedFilters.projectIds,
    advancedFilters.dueAfter,
    advancedFilters.dueBefore,
  ]);

  const { data: allTasksData, isLoading, error, refetch } = useAllTasks(apiFilters);

  const { data: taskStatsData } = useWorkspaceTaskStats();

  // Persist view mode preference
  // Save view mode changes to database
  React.useEffect(() => {
    if (viewMode && updateAllTasksViewMode) {
      updateAllTasksViewMode(viewMode);
    }
  }, [viewMode, updateAllTasksViewMode]);

  const tasks = allTasksData?.tasks || [];
  const pagination = allTasksData?.pagination;

  const taskStats = useMemo(() => {
    const s = taskStatsData;
    return {
      total: s?.total ?? 0,
      completed: s?.completed ?? 0,
      inProgress: s?.inProgress ?? 0,
      overdue: s?.overdue ?? 0,
    };
  }, [taskStatsData]);

  const handleTaskAction = async (action: string, task: Task) => {
    switch (action) {
      case 'view':
        if (!workspace?.id || !task.project?.id) {
          toast.error("Unable to navigate to task - missing workspace or project information");
          return;
        }
        try {
          navigate({
            to: "/dashboard/workspace/$workspaceId/project/$projectId/task/$taskId",
            params: {
              workspaceId: workspace.id,
              projectId: task.project.id,
              taskId: task.id,
            },
          });
        } catch (error) {
          toast.error("Unable to navigate to task details");
        }
        break;
        
      case 'edit':
        if (!canEditTasks) {
          toast.error("You don't have permission to edit tasks");
          return;
        }
        setSelectedTask(task);
        setIsEditTaskOpen(true);
        break;
        
      case 'assign':
        if (!canEditTasks) {
          toast.error("You don't have permission to reassign tasks");
          return;
        }
        // Open edit modal focused on assignment
        setSelectedTask(task);
        setIsEditTaskOpen(true);
        toast.info("Use the assignee dropdown in the edit modal to reassign this task");
        break;
        
      case 'duplicate':
        if (!canCreateTasks) {
          toast.error("You don't have permission to create tasks");
          return;
        }
        if (!task.project?.id) {
          toast.error("Unable to duplicate task - missing project information");
          return;
        }
        try {
          await createTask({
            title: `${task.title} (Copy)`,
            description: task.description || "",
            projectId: task.project.id,
            userEmail: user?.email ?? "",
            status: "todo", // Reset to todo for duplicated task
            dueDate: task.dueDate ? new Date(task.dueDate) : new Date(),
            priority: task.priority || "medium",
            parentId: task.parentId || undefined,
          });
          
          toast.success(`Task "${task.title}" duplicated successfully!`);
          refetch(); // Refresh the task list
        } catch (error) {
          logger.error(
            "Failed to duplicate task",
            error instanceof Error ? error : new Error(String(error))
          );
          toast.error("Failed to duplicate task");
        }
        break;
        
      case 'delete':
        if (!canDeleteTasks) {
          toast.error("You don't have permission to delete tasks");
          return;
        }
        setTaskToDelete(task);
        setIsDeleteAlertOpen(true);
        break;
        
      default:
        toast.info(`${action} functionality coming soon!`);
    }
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    
    try {
      await deleteTask(taskToDelete.id);
      toast.success(`Task "${taskToDelete.title}" deleted successfully`);
      setIsDeleteAlertOpen(false);
      setTaskToDelete(null);
      refetch(); // Refresh the task list
    } catch (error) {
      toast.error("Failed to delete task");
    }
  };

  const handleCreateTask = () => {
    if (!canCreateTasks) {
      toast.error("You don't have permission to create tasks");
      return;
    }
    setIsCreateTaskOpen(true);
  };

  // Task selection handlers
  const handleTaskSelect = (taskId: string) => {
    setSelectedTasks(prev => {
      if (prev.includes(taskId)) {
        return prev.filter(id => id !== taskId);
      } else {
        return [...prev, taskId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedTasks.length === tasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(tasks.map(t => t.id));
    }
  };

  const handleBulkDelete = async () => {
    if (!canDeleteTasks || selectedTasks.length === 0) return;
    
    try {
      // Delete all selected tasks
      await Promise.all(
        selectedTasks.map(taskId => {
          const task = tasks.find(t => t.id === taskId);
          if (task?.projectId) {
            return deleteTask(taskId);
          }
          return Promise.resolve();
        })
      );
      
      toast.success(`${selectedTasks.length} tasks deleted successfully`);
      setSelectedTasks([]);
      setShowBulkActions(false);
      refetch();
    } catch (error) {
      toast.error("Failed to delete some tasks");
    }
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedTasks.length === 0 || !user?.id) {
      toast.error("You must be signed in to update tasks");
      return;
    }
    if (!["todo", "in_progress", "done"].includes(newStatus)) return;
    try {
      await bulkUpdateStatus({
        taskIds: selectedTasks,
        status: newStatus as "todo" | "in_progress" | "done",
        userId: user.id,
      });
      toast.success(`Updated ${selectedTasks.length} task(s)`);
      setSelectedTasks([]);
      setShowBulkActions(false);
      await refetch();
    } catch (err) {
      toast.error("Failed to update task status");
      logger.error(
        "Bulk status update failed",
        err instanceof Error ? err : new Error(String(err))
      );
    }
  };

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, filterPriority, activeTab, advancedFilters]);

  // Common props for all view components
  const commonViewProps = {
    tasks: tasks,
    isLoading,
    selectedTasks,
    onTaskSelect: handleTaskSelect,
    projects: projects
  };

  // Pagination helper to generate page numbers
  const generatePageNumbers = () => {
    if (!pagination) return [];
    
    const { pages, currentPage: current } = pagination;
    const pageNumbers: (number | string)[] = [];
    
    if (pages <= 7) {
      // Show all pages if 7 or less
      for (let i = 1; i <= pages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always show first page
      pageNumbers.push(1);
      
      if (current > 3) {
        pageNumbers.push('...');
      }
      
      // Show pages around current page
      const start = Math.max(2, current - 1);
      const end = Math.min(pages - 1, current + 1);
      
      for (let i = start; i <= end; i++) {
        pageNumbers.push(i);
      }
      
      if (current < pages - 2) {
        pageNumbers.push('...');
      }
      
      // Always show last page
      pageNumbers.push(pages);
    }
    
    return pageNumbers;
  };

  if (!workspace) {
    return (
      <LazyDashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <CheckSquare className="h-16 w-16 text-muted-foreground mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">No Workspace Selected</h3>
              <p className="text-muted-foreground">Please select a workspace to view tasks</p>
            </div>
          </div>
        </div>
      </LazyDashboardLayout>
    );
  }

  if (!canViewAllTasks) {
    return (
      <LazyDashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Access Restricted</h3>
              <p className="text-muted-foreground">You don't have permission to view all tasks</p>
            </div>
          </div>
        </div>
      </LazyDashboardLayout>
    );
  }

  if (error) {
    return (
      <LazyDashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Error Loading Tasks</h3>
              <p className="text-muted-foreground">{error.message}</p>
              <Button onClick={() => refetch()} className="mt-2">
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </LazyDashboardLayout>
    );
  }

  return (
    <ErrorBoundary>
      <LazyDashboardLayout loadingComponent="table" enablePerformanceMode>
        {/* Dashboard Header */}
        <DashboardHeader
        title="All Tasks"
        subtitle={`${taskStats.total} total tasks • ${taskStats.completed} completed • ${taskStats.overdue} overdue`}
        variant="default"
      >
        <div className="flex items-center space-x-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="all-tasks-search"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full min-w-0 sm:max-w-xs md:max-w-sm glass-card"
            />
          </div>

          <Button onClick={handleCreateTask} className="glass-card">
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>
      </DashboardHeader>

      <div className="space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="glass-card border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Tasks</p>
                  <p className="text-2xl font-bold text-foreground">{taskStats.total}</p>
                  <p className="text-xs text-blue-500 flex items-center mt-1">
                    <Target className="h-3 w-3 mr-1" />
                    All assignments
                  </p>
                </div>
                <CheckSquare className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                  <p className="text-2xl font-bold text-foreground">{taskStats.inProgress}</p>
                  <p className="text-xs text-blue-500 flex items-center mt-1">
                    <Zap className="h-3 w-3 mr-1" />
                    Active work
                  </p>
                </div>
                <Activity className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-foreground">{taskStats.completed}</p>
                  <p className="text-xs text-green-500 flex items-center mt-1">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0}% done
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                  <p className="text-2xl font-bold text-foreground">{taskStats.overdue}</p>
                  <p className="text-xs text-red-500 flex items-center mt-1">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Needs attention
                  </p>
                </div>
                <Clock className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scope + filters (buttons avoid duplicate TabsContent per scope) */}
        <div className="space-y-6">
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4 -mt-4 -mx-6 px-6 border-b mb-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2 rounded-lg border border-border/60 bg-muted/30 p-1 glass-card">
                {(
                  [
                    { id: "all", label: "All Tasks" },
                    { id: "my-tasks", label: "My Tasks" },
                    { id: "overdue", label: "Overdue" },
                    { id: "today", label: "Due Today" },
                  ] as const
                ).map((tab) => (
                  <Button
                    key={tab.id}
                    type="button"
                    variant={activeTab === tab.id ? "default" : "ghost"}
                    size="sm"
                    className="rounded-md"
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>

              <div className="flex items-center space-x-2">
                {/* Status Filter */}
                <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>

                {/* Priority Filter */}
                <Select value={filterPriority} onValueChange={(value) => setFilterPriority(value)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="All Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>

                {/* Clear Filters Button */}
                {(searchQuery || filterStatus !== 'all' || filterPriority !== 'all') && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setFilterStatus('all');
                      setFilterPriority('all');
                      setAdvancedFilters({});
                    }}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
            {allTasksData?.filters && (
              <div className="mt-4 max-w-4xl">
                <AdvancedFilters
                  filters={advancedFilters}
                  filterOptions={{
                    projects: allTasksData.filters.projects,
                    teamMembers: allTasksData.filters.teamMembers,
                    statuses: allTasksData.filters.statuses,
                    priorities: allTasksData.filters.priorities,
                  }}
                  onFiltersChange={setAdvancedFilters}
                  onClearFilters={() => setAdvancedFilters({})}
                />
              </div>
            )}
          </div>
        
          {/* NEW: View Mode Switcher */}
          <BlurFade delay={0.1}>
                          <Tabs value={viewMode} onValueChange={(value) => updateAllTasksViewMode(value as 'list' | 'kanban' | 'calendar')} className="space-y-6">
              <div className="flex items-center justify-between">
                <TabsList className="glass-card">
                  <TabsTrigger value="list" className="flex items-center gap-2">
                    <Layout className="h-4 w-4" />
                    List View
                  </TabsTrigger>
                  <TabsTrigger value="kanban" className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Kanban Board
                  </TabsTrigger>
                  <TabsTrigger value="calendar" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Calendar View
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* List View - Shows filtered content based on activeTab */}
              <TabsContent value="list" className="space-y-6">
                <BlurFade delay={0.3}>
                  {/* Results Summary, Bulk Actions, and Page Size Selector */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-muted-foreground">
                        {isLoading ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Loading tasks...
                          </span>
                        ) : pagination ? (
                          <span>
                            Showing <span className="font-medium">{pagination.offset + 1}-{Math.min(pagination.offset + pagination.limit, pagination.total)}</span> of <span className="font-medium">{pagination.total}</span> tasks
                          </span>
                        ) : (
                          <span>
                            <span className="font-medium">{tasks.length}</span> task{tasks.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      
                      {/* Bulk Actions Toggle */}
                      {!isLoading && tasks.length > 0 && (
                        <Button
                          variant={showBulkActions ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setShowBulkActions(!showBulkActions);
                            setSelectedTasks([]);
                          }}
                        >
                          {showBulkActions ? "Cancel Selection" : "Select Multiple"}
                        </Button>
                      )}
                      
                      {/* Bulk Action Buttons */}
                      {showBulkActions && selectedTasks.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {selectedTasks.length} selected
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSelectAll}
                          >
                            {selectedTasks.length === tasks.length ? "Deselect All" : "Select All"}
                          </Button>
                          <Select onValueChange={handleBulkStatusChange} disabled={isBulkStatusPending}>
                            <SelectTrigger className="w-[140px] h-8">
                              <SelectValue placeholder="Change Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todo">To Do</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="done">Done</SelectItem>
                            </SelectContent>
                          </Select>
                          {canDeleteTasks && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={handleBulkDelete}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete ({selectedTasks.length})
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {!isLoading && tasks.length > 0 && (
                        <>
                          <span className="text-sm text-muted-foreground">Per page:</span>
                          <Select
                            value={pageSize.toString()}
                            onValueChange={(value) => {
                              setPageSize(parseInt(value));
                              setCurrentPage(1);
                            }}
                          >
                            <SelectTrigger className="w-20 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="6">6</SelectItem>
                              <SelectItem value="12">12</SelectItem>
                              <SelectItem value="24">24</SelectItem>
                              <SelectItem value="48">48</SelectItem>
                            </SelectContent>
                          </Select>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {isLoading ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <TaskCardSkeleton key={i} />
                      ))}
                    </div>
                  ) : tasks.length > 0 ? (
                    <>
                      <AllTasksVirtualGrid
                        tasks={tasks}
                        renderTask={(task) => (
                          <TaskCard
                            task={task}
                            onAction={handleTaskAction}
                            showCheckbox={showBulkActions}
                            isSelected={selectedTasks.includes(task.id)}
                            onSelect={handleTaskSelect}
                          />
                        )}
                      />
                      
                      {/* Pagination Controls */}
                      {pagination && pagination.total >= 0 && (
                        <div className="mt-8 border-t pt-6">
                          <div className="flex items-center">
                            <div className="text-sm text-muted-foreground">
                              Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, pagination.total)} of {pagination.total}
                            </div>
                            <div className="ml-auto">
                              {pagination.pages > 1 ? (
                                <Pagination>
                                  <PaginationContent>
                                <PaginationItem>
                                  <PaginationPrevious
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      if (currentPage > 1) {
                                        setCurrentPage(currentPage - 1);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                      }
                                    }}
                                    className={cn(
                                      currentPage === 1 && "pointer-events-none opacity-50"
                                    )}
                                  />
                                </PaginationItem>
                                
                                {generatePageNumbers().map((pageNum, idx) => (
                                  <PaginationItem key={idx}>
                                    {pageNum === '...' ? (
                                      <PaginationEllipsis />
                                    ) : (
                                      <PaginationLink
                                        href="#"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          setCurrentPage(pageNum as number);
                                          window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        isActive={currentPage === pageNum}
                                      >
                                        {pageNum}
                                      </PaginationLink>
                                    )}
                                  </PaginationItem>
                                ))}
                                
                                <PaginationItem>
                                  <PaginationNext
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      if (currentPage < pagination.pages) {
                                        setCurrentPage(currentPage + 1);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                      }
                                    }}
                                    className={cn(
                                      currentPage === pagination.pages && "pointer-events-none opacity-50"
                                    )}
                                  />
                                </PaginationItem>
                                  </PaginationContent>
                                </Pagination>
                              ) : (
                                <div className="text-sm text-muted-foreground">
                                  Page {currentPage} of {Math.max(1, pagination.pages)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center space-y-4">
                        <CheckSquare className="h-16 w-16 text-muted-foreground mx-auto" />
                        <div>
                          <h3 className="text-lg font-semibold">
                            {searchQuery || filterStatus !== 'all' || filterPriority !== 'all'
                              ? 'No Tasks Match Your Filters'
                              : 'No Tasks Yet'}
                          </h3>
                          <p className="text-muted-foreground mb-4">
                            {searchQuery || filterStatus !== 'all' || filterPriority !== 'all'
                              ? 'Try adjusting your filters or clearing them to see more tasks'
                              : 'Get started by creating your first task'}
                          </p>
                          {(searchQuery || filterStatus !== 'all' || filterPriority !== 'all') ? (
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSearchQuery('');
                                setFilterStatus('all');
                                setFilterPriority('all');
                              }}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Clear All Filters
                            </Button>
                          ) : canCreateTasks ? (
                            <Button onClick={handleCreateTask}>
                              <Plus className="h-4 w-4 mr-2" />
                              Create Your First Task
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )}
                </BlurFade>
              </TabsContent>

              <TabsContent value="kanban" className="space-y-6">
                <BlurFade delay={0.3}>
                  <AllTasksKanbanView
                    {...commonViewProps}
                    onTaskUpdate={handleTaskAction}
                    activeTab={activeTab}
                    filters={{ status: filterStatus, priority: filterPriority, search: searchQuery }}
                  />
                </BlurFade>
              </TabsContent>

              <TabsContent value="calendar" className="space-y-6">
                <BlurFade delay={0.3}>
                  <AllTasksCalendarView
                    {...commonViewProps}
                    onTaskUpdate={handleTaskAction}
                    activeTab={activeTab}
                    filters={{ status: filterStatus, priority: filterPriority, search: searchQuery }}
                  />
                </BlurFade>
              </TabsContent>
            </Tabs>
          </BlurFade>
        </div>
      </div>

      {/* Create Task Modal */}
      {isCreateTaskOpen && (
        <CreateTaskModal
          open={isCreateTaskOpen}
          onClose={() => setIsCreateTaskOpen(false)}
          hideProjectSelection={false}
        />
      )}

      {/* Edit Task Modal */}
      {isEditTaskOpen && selectedTask && workspace && (
        <EditTaskModal
          open={isEditTaskOpen}
          onClose={() => {
            setIsEditTaskOpen(false);
            setSelectedTask(null);
          }}
          task={selectedTask}
          workspaceId={workspace.id}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{taskToDelete?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteAlertOpen(false);
                setTaskToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteTask}
              disabled={isDeletingTask}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeletingTask ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Task"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </LazyDashboardLayout>
    </ErrorBoundary>
  );
} 