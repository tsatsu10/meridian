import useUpdateTask from "@/hooks/mutations/task/use-update-task";
import useDeleteTask from "@/hooks/mutations/task/use-delete-task";
import type { ProjectWithTasks } from "@/types/project";
import type { TaskWithSubtasks, TaskWithDependencies } from "@/types/task";
import { flattenTasks, findTaskInHierarchy, findAllChildrenOfTask } from "@/utils/task-hierarchy";
import { BulkOperationsProvider } from "@/contexts/bulk-operations-context";
import { BulkOperationsToolbar } from "@/components/bulk-operations/bulk-operations-toolbar";
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  type UniqueIdentifier,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useState } from "react";
import { toast } from "sonner";
import { Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import Column from "./column";
import TaskCard from "./task-card";
import CreateMilestoneModal from "@/components/shared/modals/create-milestone-modal";
import { useMilestones } from "@/hooks/use-milestones";

// Enhanced visual components for the redesign
import { AnimatedGridPattern } from "@/components/magicui/animated-grid-pattern";
import { BlurFade } from "@/components/magicui/blur-fade";
import { cn } from "@/lib/utils";

interface KanbanBoardProps {
  project: ProjectWithTasks;
  setActiveColumn?: (column: string) => void;
  setIsTaskModalOpen?: (open: boolean) => void;
}

// Type guard to ensure project has columns
const hasColumns = (project: ProjectWithTasks): project is ProjectWithTasks & { columns: Array<any> } => {
  return project && Array.isArray((project as any).columns) && (project as any).columns.length > 0;
};

// @epic-1.2-dependencies: Dependency validation for task movement
const validateTaskMove = (task: TaskWithDependencies, newStatus: string, allTasks: TaskWithSubtasks[], projectSlug?: string) => {
  const warnings: string[] = [];
  let canMove = true;

  // Block completion if dependencies aren't done
  if (newStatus === 'done') {
    const incompleteBlockers = (task.blockedBy || []).filter((dep: any) => {
      const requiredTask = allTasks.find(t => t.id === dep.requiredTaskId);
      return requiredTask && requiredTask.status !== 'done';
    });
    
    if (incompleteBlockers.length > 0) {
      const blockerNames = incompleteBlockers
        .map((dep: any) => {
          const requiredTask = allTasks.find(t => t.id === dep.requiredTaskId);
          return requiredTask ? `${projectSlug}-${requiredTask.number}` : 'Unknown';
        })
        .join(', ');
      
      canMove = false;
      return {
        canMove,
        message: `❌ Cannot complete task - blocked by: ${blockerNames}`,
        type: 'error' as const
      };
    }
  }
  
  // Warn about starting blocked tasks
  if (newStatus === 'in_progress') {
    const incompleteBlockers = (task.blockedBy || []).filter((dep: any) => {
      const requiredTask = allTasks.find(t => t.id === dep.requiredTaskId);
      return requiredTask && requiredTask.status !== 'done';
    });
    
    if (incompleteBlockers.length > 0) {
      const blockerNames = incompleteBlockers
        .map((dep: any) => {
          const requiredTask = allTasks.find(t => t.id === dep.requiredTaskId);
          return requiredTask ? `${projectSlug}-${requiredTask.number}` : 'Unknown';
        })
        .join(', ');

      warnings.push(`⚠️ Starting early - waiting for: ${blockerNames}`);
    }
  }

  // Warn about moving tasks that block others
  if (newStatus === 'todo' && task.status !== 'todo') {
    const dependentTasks = (task.dependencies || []).filter((dep: any) => {
      const dependentTask = allTasks.find(t => t.id === dep.dependentTaskId);
      return dependentTask && ['in_progress', 'done', 'done'].includes(dependentTask.status);
    });
    
    if (dependentTasks.length > 0) {
      const dependentNames = dependentTasks
        .map((dep: any) => {
          const dependentTask = allTasks.find(t => t.id === dep.dependentTaskId);
          return dependentTask ? `${projectSlug}-${dependentTask.number}` : 'Unknown';
        })
        .join(', ');

      warnings.push(`⚠️ Moving back will affect: ${dependentNames}`);
    }
  }

  // Warning for reopening completed tasks
  if (task.status === 'done' && newStatus !== 'done') {
    const dependentTasks = (task.dependencies || []).filter((dep: any) => {
      const dependentTask = allTasks.find(t => t.id === dep.dependentTaskId);
      return dependentTask && dependentTask.status === 'done';
    });
    
    if (dependentTasks.length > 0) {
      const dependentNames = dependentTasks
        .map((dep: any) => {
          const dependentTask = allTasks.find(t => t.id === dep.dependentTaskId);
          return dependentTask ? `${projectSlug}-${dependentTask.number}` : 'Unknown';
        })
        .join(', ');

      warnings.push(`⚠️ Reopening may affect completed: ${dependentNames}`);
    }
  }

  return {
    canMove: true,
    warnings,
    type: 'warning' as const
  };
};

function KanbanBoard({ project, setActiveColumn, setIsTaskModalOpen }: KanbanBoardProps) {
  // TypeScript sometimes loses the type for project.id due to complex inference; force as any for id access
  const projectId = (project as any).id;const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const { createMilestone } = useMilestones(projectId);
  const { mutate: updateTask } = useUpdateTask();
  const { mutate: deleteTask } = useDeleteTask(projectId);

  // Bulk operations handlers
  const handleBulkUpdate = (taskIds: string[], updates: Partial<TaskWithSubtasks>) => {
    if (!hasColumns(project)) return;
    
    taskIds.forEach(taskId => {
      const allTasks = (project as any).columns.flatMap((col: any) => flattenTasks(col.tasks));
      const task = findTaskInHierarchy(taskId, allTasks);
      if (task) {
        updateTask({ ...task, ...updates });
      }
    });
  };

  const handleBulkDelete = (taskIds: string[]) => {
    taskIds.forEach(taskId => {
      deleteTask(taskId);
    });
  };

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !hasColumns(project)) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();
    const overData = over.data.current;

    // Get all tasks for hierarchy validation
    const allTasks = (project as any).columns.flatMap((col: any) => flattenTasks(col.tasks));

    // Find the dragged task
    const draggedTask = findTaskInHierarchy(activeId, allTasks);
    if (!draggedTask) {
      console.error('Dragged task not found');
      setActiveId(null);
      return;
    }

    // Handle column drops and task reordering// Find source and destination columns
    // For subtasks, we need to find which column contains the task (not necessarily where the parent is)
    const sourceColumn = (project as any).columns.find((col: any) => {
      const allTasksInColumn = flattenTasks(col.tasks);
      const taskFound = allTasksInColumn.some((task: any) => task.id === activeId);return taskFound;
    });
    
    // Check if dropping on a column by looking at overData.type first
    const destinationColumn = overData?.type === "column" 
      ? (project as any).columns.find((col: any) => col.id === overId)
      : null;if (!sourceColumn) {
      console.error('Source column not found for task:', activeId);
      setActiveId(null);
      return;
    }

    // Case 1: Dropping on a column (changing status) - PRIORITIZE THIS
    if (destinationColumn) {// Only update if actually changing columns
      if (sourceColumn.id !== destinationColumn.id) {
        // @epic-1.2-dependencies: Validate task movement based on dependencies
        const validation = validateTaskMove(draggedTask as TaskWithDependencies, destinationColumn.id, allTasks, (project as any).slug || '');
        
        if (!validation.canMove) {
          // Compact toast for dependency errors
          toast.error(validation.message, {
            duration: 5000,
            style: {
              maxWidth: '400px',
              fontSize: '14px'
            }
          });
          setActiveId(null);
          return;
        }
        
        // Show warnings if any
        if (validation.warnings && validation.warnings.length > 0) {
          validation.warnings.forEach(warning => {
            toast.warning(warning, { 
              duration: 4000,
              style: {
                maxWidth: '400px',
                fontSize: '14px'
              }
            });
          });
        }

        // @epic-1.1-subtasks: When moving a parent task, move all its subtasks too
        const tasksToUpdate: TaskWithSubtasks[] = [draggedTask];
        
        // Debug: Log the structure of allTasks to understand the data// Find all children of this task (regardless of hierarchy structure)
        const allChildren = findAllChildrenOfTask(draggedTask.id, allTasks);if (allChildren.length > 0) {
          tasksToUpdate.push(...allChildren);}
        
        // Update all tasks (parent + subtasks) to new column
        tasksToUpdate.forEach((taskToUpdate, index) => {
          const updatedTask = { 
            ...taskToUpdate, 
            status: destinationColumn.id,
            parentId: taskToUpdate.parentId || null,
            position: index + 1 // Will be recalculated by API
          };updateTask(updatedTask, {
            onError: (error: any) => {
              console.error(`Failed to update task ${updatedTask.title}:`, error);
              toast.error(`Failed to move "${updatedTask.title}" to ${destinationColumn.name}. Please try again.`);
            },
            onSuccess: () => {
              if (index === 0) { // Only show success message for parent task
                const subtaskCount = tasksToUpdate.length - 1;
                const message = subtaskCount > 0 
                  ? `Moved "${draggedTask.title}" and ${subtaskCount} subtask${subtaskCount > 1 ? 's' : ''} to ${destinationColumn.name}`
                  : `Moved "${draggedTask.title}" to ${destinationColumn.name}`;toast.success(message);
              }
            }
          });
        });
      } else {}
    } else {
      // Case 2: Task reordering within same column or moving to another task's position// First check if we're dropping on a task (reordering)
      if (overData?.type === "task") {
        const overTask = findTaskInHierarchy(overId, allTasks);
        if (!overTask) {
          console.error('Target task not found for reordering');
          setActiveId(null);
          return;
        }
        
        // Find which column the target task is in
        const targetColumn = (project as any).columns.find((col: any) => {
          const allTasksInColumn = flattenTasks(col.tasks);
          return allTasksInColumn.some((task: any) => task.id === overId);
        });
        
        if (!targetColumn) {
          console.error('Target column not found for reordering');
          setActiveId(null);
          return;
        }// For now, we'll just update the position
        // In a full implementation, you'd calculate the exact position based on the drop location
        const updatedTask = { 
          ...draggedTask, 
          status: targetColumn.id,
          position: overTask.position || 1
        };
        
        updateTask(updatedTask, {
          onError: (error: any) => {
            console.error('Failed to reorder task:', error);
            toast.error('Failed to reorder task. Please try again.');
          },
          onSuccess: () => {}
        });
      }
    }
    
    setActiveId(null);
  };

  if (!project || !hasColumns(project)) {
    return (
      <div className="h-full flex flex-col w-full">
        <header className="mb-6 mt-6 space-y-6 shrink-0 px-6">
          <div className="flex items-center justify-between">
            <div className="w-48 h-8 bg-zinc-100 dark:bg-zinc-800/50 rounded-md animate-pulse" />
          </div>
        </header>

        <div className="flex-1 relative min-h-0">
          <div className="flex gap-6 flex-1 overflow-x-auto pb-4 px-4 md:px-6 h-full">
            {[...Array(4)].map((_, i) => (
              <div
                key={`kanban-column-skeleton-${
                  // biome-ignore lint/suspicious/noArrayIndexKey: It's a skeleton
                  i
                }`}
                className="flex-1 w-full min-w-80 flex flex-col bg-zinc-50 dark:bg-zinc-900 rounded-lg h-full"
              >
                <div className="px-4 py-3 flex items-center justify-between">
                  <div className="w-24 h-5 bg-zinc-100 dark:bg-zinc-800/50 rounded animate-pulse" />
                  <div className="w-8 h-5 bg-zinc-100 dark:bg-zinc-800/50 rounded animate-pulse" />
                </div>

                <div className="px-2 pb-4 flex flex-col gap-3 flex-1">
                  {[...Array(3)].map((_, j) => (
                    <div
                      key={`kanban-task-skeleton-${
                        // biome-ignore lint/suspicious/noArrayIndexKey: It's a skeleton
                        j
                      }`}
                      className="p-4 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-800/50 animate-pulse"
                    >
                      <div className="space-y-3">
                        <div className="w-2/3 h-4 bg-zinc-200 dark:bg-zinc-700/50 rounded" />
                        <div className="w-1/2 h-3 bg-zinc-200 dark:bg-zinc-700/50 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const activeTask = activeId && hasColumns(project)
    ? (project as any).columns
        .flatMap((col: any) => flattenTasks(col.tasks))
        .find((task: any) => task.id === activeId)
    : null;

  return (
    <BulkOperationsProvider
      onBulkUpdate={handleBulkUpdate}
      onBulkDelete={handleBulkDelete}
    >
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* @epic-design: Modern Kanban Board with animated background and enhanced UX */}
      <div className="h-full flex flex-col overflow-hidden w-full relative">
        {/* Animated background with subtle grid pattern */}
        <div className="absolute inset-0 overflow-hidden">
          <AnimatedGridPattern
            numSquares={25}
            maxOpacity={0.03}
            duration={3}
            repeatDelay={1}
            className={cn(
              "[mask-image:radial-gradient(800px_circle_at_center,white,transparent)]",
              "inset-x-0 inset-y-[-30%] h-[200%] skew-y-12",
            )}
          />
        </div>

        {/* Redesigned Kanban Board Header - Clean, Minimal, Modern */}
        <div className="relative z-10 bg-gradient-to-r from-white/95 via-white/90 to-white/95 dark:from-zinc-900/95 dark:via-zinc-900/90 dark:to-zinc-900/95 backdrop-blur-sm border-b border-zinc-200/50 dark:border-zinc-800/50">
          <div className="px-6 py-6 flex items-center justify-between">
            <div className="flex flex-col items-center justify-center gap-2 flex-1">
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-zinc-100 dark:to-zinc-400 bg-clip-text text-transparent tracking-tight">
                {(project as any)?.name || 'Project'}
              </h1>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2 text-base text-zinc-500 dark:text-zinc-400">
                  <span className="font-semibold">{(project as any).columns?.length || 0} columns</span>
                  <span>•</span>
                  <span>{(project as any).columns?.reduce((acc: number, col: any) => acc + (col.tasks?.length || 0), 0) || 0} tasks</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100/70 dark:bg-zinc-800/70 rounded-full border border-zinc-200/50 dark:border-zinc-700/50 ml-4">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Live</span>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMilestoneModalOpen(true)}
                className="flex items-center gap-2 bg-white/50 dark:bg-zinc-800/50 hover:bg-white dark:hover:bg-zinc-800 border-zinc-200/70 dark:border-zinc-700/70"
              >
                <Target className="h-4 w-4 text-orange-500" />
                New Milestone
              </Button>
            </div>
          </div>
        </div>

        {/* 📱 MOBILE RESPONSIVE: Horizontal scroll on desktop, vertical stack on mobile */}
        <div className="flex-1 h-full overflow-auto relative z-10">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 p-3 sm:p-6 min-h-full">
            {hasColumns(project) ? (
              (project as any).columns
                .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
                .map((column: any, index: number) => (
                  <BlurFade 
                    key={column.id} 
                    delay={0.1 + index * 0.05} 
                    inView
                    className="flex-shrink-0"
                  >
                    <div className="relative group">
                      {/* Enhanced column with modern glass effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/5 dark:from-zinc-800/20 dark:to-zinc-900/5 rounded-xl blur-xl group-hover:from-white/30 group-hover:to-white/10 dark:group-hover:from-zinc-800/30 dark:group-hover:to-zinc-900/10 transition-all duration-500" />
                      <div className="relative bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl shadow-lg shadow-zinc-200/20 dark:shadow-zinc-900/20 hover:shadow-xl hover:shadow-zinc-200/30 dark:hover:shadow-zinc-900/30 transition-all duration-300">
                        <Column column={column as ProjectWithTasks["columns"][number]} />
                      </div>
                    </div>
                  </BlurFade>
                ))
            ) : (
              <BlurFade delay={0.2} inView>
                <div className="flex-1 flex items-center justify-center min-h-[400px]">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 rounded-full flex items-center justify-center mx-auto">
                      <svg className="w-8 h-8 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0v10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">No columns yet</h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">Create your first column to start organizing tasks in your Kanban board.</p>
                    </div>
                  </div>
                </div>
              </BlurFade>
            )}
          </div>
        </div>

        {/* Enhanced drag overlay with improved visual feedback */}
      <DragOverlay>
        {activeTask ? (
            <BlurFade inView className="transform rotate-2 scale-105">
              <div className="relative">
                {/* Glow effect for dragged item */}
                <div className="absolute inset-0 bg-blue-500/20 rounded-lg blur-xl scale-110" />
                <div className="relative bg-white dark:bg-zinc-800 border-2 border-blue-500/50 rounded-lg shadow-2xl shadow-blue-500/25">
            <TaskCard task={activeTask} />
          </div>
              </div>
            </BlurFade>
        ) : null}
      </DragOverlay>
      </div>
    </DndContext>
      
      {/* Enhanced bulk operations toolbar */}
      <div className="relative z-20">
      <BulkOperationsToolbar />
      </div>

      {/* Milestone Creation Modal */}
      <CreateMilestoneModal
        open={isMilestoneModalOpen}
        onClose={() => setIsMilestoneModalOpen(false)}
        projectId={projectId}
        projectName={(project as any)?.name}
        onMilestoneCreated={(milestone) => {
          createMilestone({
            ...milestone,
            projectId: projectId,
          });
          setIsMilestoneModalOpen(false);
        }}
      />
    </BulkOperationsProvider>
  );
}

export default KanbanBoard;
