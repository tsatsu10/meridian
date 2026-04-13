import useUpdateTask from "@/hooks/mutations/task/use-update-task";
import useDeleteStatusColumn from "@/hooks/mutations/project/use-delete-status-column";
import useProjectStore from "@/store/project";
import type { ProjectWithTasks } from "@/types/project";
import { produce } from "immer";
import { Archive, Plus, Settings, MoreHorizontal, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import AddColumnModal from "./add-column-modal";

// 🎯 WIP LIMITS: Default Work-In-Progress limits for Kanban columns
// These can be configured per project/column in the future
const WIP_LIMITS: Record<string, number> = {
  todo: 15, // Backlog can be larger
  in_progress: 5, // Limit active work
  done: 10, // Review should be processed quickly
  default: 8, // Default limit for custom columns
};

interface ColumnHeaderProps {
  column: ProjectWithTasks["columns"][number];
}

function ColumnHeader({ column }: ColumnHeaderProps) {
  const { project, setProject } = useProjectStore();
  const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
  const updateTask = useUpdateTask();
  const deleteStatusColumn = useDeleteStatusColumn();
  
  // Type-safe task calculations
  const taskCount = (column?.tasks as any[])?.length || 0;
  const completedTasks = (column?.tasks as any[])?.filter((task: any) => task.status === 'done').length || 0;
  const progressPercentage = taskCount > 0 ? Math.round((completedTasks / taskCount) * 100) : 0;

  // 🚦 WIP LIMIT CALCULATIONS: Visual warnings for work-in-progress limits
  const columnId = (column as any)?.id || 'default';
  const wipLimit = WIP_LIMITS[columnId] || WIP_LIMITS.default;
  const wipPercentage = (taskCount / wipLimit) * 100;
  const isApproachingLimit = wipPercentage >= 75 && wipPercentage < 100;
  const isExceedingLimit = wipPercentage >= 100;
  
  // Color coding for WIP limits
  const getWipBadgeStyles = () => {
    if (isExceedingLimit) {
      return "bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300";
    }
    if (isApproachingLimit) {
      return "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300";
    }
    return "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300";
  };

  // Get column position for insertion
  const getCurrentColumnPosition = () => {
    if (!project?.columns) return undefined;
    
    // Find the current column in the columns array
    const currentColumn = project.columns.find((col: any) => col.id === (column as any)?.id);
    if (!currentColumn) return undefined;
    
    // For default columns, use their predictable positions + 1
    if (currentColumn.isDefault) {
      const defaultPositions = {
        'todo': 0,
        'in_progress': 1,
        'done': 2
      };
      const currentPos = defaultPositions[currentColumn.id as keyof typeof defaultPositions];
      if (currentPos !== undefined) {
        return currentPos + 1;
      }
    }
    
    // For custom columns, we need to find their actual visual position
    // Sort columns the same way the backend does: by position, with conflict resolution
    const sortedColumns = [...project.columns].sort((a: any, b: any) => {
      const posA = 'position' in a && typeof a.position === 'number' ? a.position : 999;
      const posB = 'position' in b && typeof b.position === 'number' ? b.position : 999;
      
      // If positions are equal, prioritize defaults first, then by creation order (ID)
      if (posA === posB) {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return a.id.localeCompare(b.id);
      }
      
      return posA - posB;
    });
    
    // Find the visual index of the current column
    const currentIndex = sortedColumns.findIndex((col: any) => col.id === (column as any)?.id);
    
    // Insert after this column's visual position
    // The backend will handle shifting existing columns to make room
    if (currentIndex >= 0) {
      // Use the visual position + 1 for insertion
      return currentIndex + 1;
    }
    
    // Fallback: append at the end
    return sortedColumns.length;
  };

  const handleArchiveColumn = async () => {
    if (!project) return;
    
    try {
      // Move all tasks in this column to "archived" status
      const tasksToArchive = (column?.tasks as any[]) || [];
      
      for (const task of tasksToArchive) {
        await updateTask.mutateAsync({
          id: task.id,
          number: task.number,
          title: task.title,
          description: task.description || "",
          dueDate: task.dueDate || new Date().toISOString(),
          priority: task.priority,
          status: "archived",
          projectId: task.projectId,
          position: task.position,
          userEmail: task.userEmail,
          parentId: task.parentId,
          createdAt: task.createdAt,
        });
      }

      // Update local state to remove the column
      setProject(produce(project, (draft) => {
        draft.columns = draft.columns.filter((col: any) => col.id !== (column as any)?.id);
      }));

      toast.success(`"${(column as any)?.name}" column archived successfully`);
    } catch (error) {
      toast.error("Failed to archive column");
      console.error(error);
    }
  };

  const handleDeleteColumn = async () => {
    if (!project || !(column as any)?.id) return;
    
    // Check if column has tasks
    if (taskCount > 0) {
      toast.error(`Cannot delete column. ${taskCount} task(s) are using this status. Please move them to another column first.`);
      return;
    }
    
    try {
      await deleteStatusColumn.mutateAsync({
        projectId: project.id,
        columnId: (column as any)?.id,
      });

      // Update local state to remove the column
      setProject(produce(project, (draft) => {
        draft.columns = draft.columns.filter((col: any) => col.id !== (column as any)?.id);
      }));

      toast.success(`"${(column as any)?.name}" column deleted successfully`);
    } catch (error) {
      toast.error("Failed to delete column");
      console.error(error);
    }
  };

  return (
    <>
      <AddColumnModal 
        open={isAddColumnModalOpen}
        onClose={() => setIsAddColumnModalOpen(false)}
        projectId={project?.id || ""}
        insertAfterPosition={getCurrentColumnPosition()}
      />
      
      {/* @epic-design: Enhanced column header with modern aesthetics and persona-aligned functionality */}
      <div className="flex items-center justify-between w-full group/header">
        <div className="flex items-center gap-3">
          {/* Enhanced status indicator with gradient and animation */}
          <div className="relative">
            <div 
              className="w-3 h-3 rounded-full shadow-sm border border-white/20 dark:border-zinc-700/20 transition-all duration-200 group-hover/header:scale-110" 
              style={{ 
                backgroundColor: (column as any)?.color || "#6b7280",
                boxShadow: `0 0 0 2px ${(column as any)?.color || "#6b7280"}20`
              }}
            />
            {/* Subtle pulsing animation for active columns */}
            {taskCount > 0 && (
              <div 
                className="absolute inset-0 w-3 h-3 rounded-full animate-ping opacity-20" 
                style={{ backgroundColor: (column as any)?.color || "#6b7280" }}
              />
            )}
          </div>
          
          {/* Enhanced column title with better typography */}
          <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 tracking-tight">
            {(column as any)?.name}
          </h3>
          
          {/* @persona-sarah: Enhanced task count badge for PM visibility */}
          <div className="flex items-center gap-2">
            {/* 🚦 WIP LIMIT INDICATOR: Visual warnings for work-in-progress limits */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative group/wip">
                    <Badge 
                      variant="outline" 
                      className={`text-xs font-medium px-2 py-0.5 transition-all duration-200 backdrop-blur-sm ${getWipBadgeStyles()}`}
                    >
                      <div className="flex items-center gap-1.5">
                        {isExceedingLimit && (
                          <AlertTriangle className="w-3 h-3 animate-pulse" />
                        )}
                        <span className="font-semibold">{taskCount}</span>
                        <span className="text-[10px] opacity-70">/</span>
                        <span className="opacity-70">{wipLimit}</span>
                      </div>
                    </Badge>
                    {isExceedingLimit && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                    )}
                    {isApproachingLimit && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <div className="space-y-1">
                    <p className="font-semibold text-xs">
                      {isExceedingLimit 
                        ? "⚠️ WIP Limit Exceeded" 
                        : isApproachingLimit 
                        ? "⚡ Approaching WIP Limit"
                        : "✅ Within WIP Limit"}
                    </p>
                    <p className="text-xs opacity-80">
                      {taskCount} of {wipLimit} tasks ({Math.round(wipPercentage)}%)
                    </p>
                    {isExceedingLimit && (
                      <p className="text-xs text-red-400">
                        Consider completing existing tasks before adding more.
                      </p>
                    )}
                    {isApproachingLimit && (
                      <p className="text-xs text-amber-400">
                        Almost at capacity. Focus on completion.
                      </p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* @persona-jennifer: Progress indicator for executive overview */}
            {!(column as any)?.isDefault && progressPercentage > 0 && (
              <Badge 
                variant="outline" 
                className="text-xs font-medium px-2 py-0.5 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 shadow-sm"
              >
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  {progressPercentage}%
                </div>
              </Badge>
            )}
          </div>
        </div>

        {/* @persona-mike: Enhanced action buttons for developer efficiency */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
          {/* Add Column Button - enhanced with subtle animation */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:bg-white/50 dark:hover:bg-zinc-800/50 hover:scale-105 transition-all duration-200 backdrop-blur-sm border border-transparent hover:border-zinc-200/50 dark:hover:border-zinc-700/50 rounded-lg"
            onClick={() => setIsAddColumnModalOpen(true)}
            title="Add Column"
          >
            <Plus className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
          </Button>

          {/* Enhanced Column Settings for custom columns */}
          {!(column as any)?.isDefault && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 hover:bg-white/50 dark:hover:bg-zinc-800/50 hover:scale-105 transition-all duration-200 backdrop-blur-sm border border-transparent hover:border-zinc-200/50 dark:hover:border-zinc-700/50 rounded-lg"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  aria-label="Column options"
                >
                  <MoreHorizontal className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-48 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl"
              >
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // TODO: Implement edit column functionality
                    toast.info("Edit column feature coming soon");
                  }}
                  className="hover:bg-white/50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Edit Column
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleArchiveColumn();
                  }}
                  className="text-amber-600 hover:text-amber-700 focus:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 dark:focus:text-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-900/20 transition-colors"
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Archive Column
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-zinc-200/50 dark:bg-zinc-700/50" />
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDeleteColumn();
                  }}
                  className="text-red-600 hover:text-red-700 focus:text-red-600 dark:text-red-400 dark:hover:text-red-300 dark:focus:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-900/20 transition-colors"
                  disabled={taskCount > 0}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Column
                  {taskCount > 0 && (
                    <span className="ml-auto text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                      ({taskCount} tasks)
                    </span>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </>
  );
}

export default ColumnHeader;
