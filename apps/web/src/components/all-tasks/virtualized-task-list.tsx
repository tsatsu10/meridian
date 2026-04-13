import React, { useMemo, useCallback, useState, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
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
  PointerSensor,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { OptimisticButton } from '@/components/ui/optimistic-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Clock,
  Flag,
  User,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  GripVertical,
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from '@tanstack/react-router';
import { toast } from "sonner";

// @epic-3.2-time: Mike needs efficient task browsing with large datasets
// @persona-mike: Developer needs fast, responsive task management interface

// Task interface matching the exact structure from use-all-tasks.ts
interface VirtualizedTask {
  id: string;
  title: string;
  number: number;
  description: string;
  status: string;
  priority: string;
  dueDate: Date | null;
  position: number;
  createdAt: Date;
  userEmail: string | null;
  assigneeName: string | null;
  assigneeEmail: string | null;
  projectId: string;
  parentId: string | null;
  project: {
    id: string;
    name: string;
    slug: string;
    icon: string;
    workspaceId: string;
  };
}

interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  pages: number;
  currentPage: number;
}

interface VirtualizedTaskListProps {
  tasks: VirtualizedTask[];
  selectedTasks: string[];
  onTaskSelect: (taskId: string) => void;
  onSelectAll: () => void;
  onTaskUpdate?: (taskId: string, updates: any) => Promise<void>;
  onTaskDelete?: (taskId: string) => Promise<void>;
  onTaskReorder?: (taskId: string, newPosition: number) => Promise<void>;
  isLoading?: boolean;
  className?: string;
  // Pagination props
  pagination?: PaginationInfo;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  onPageChange: (page: number) => void;
}

// ♿ WCAG 2.1 AA Compliant colors (contrast ratio >= 4.5:1)
const priorityColors = {
  low: "bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100",
  medium: "bg-yellow-200 text-yellow-900 dark:bg-yellow-800 dark:text-yellow-100",
  high: "bg-orange-200 text-orange-900 dark:bg-orange-800 dark:text-orange-100",
  urgent: "bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100",
};

const priorityLabels = {
  low: "Low",
  medium: "Medium", 
  high: "High",
  urgent: "Urgent",
};

const statusColors = {
  "todo": "bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-100",
  "in_progress": "bg-blue-200 text-blue-900 dark:bg-blue-800 dark:text-blue-100",
  "done": "bg-green-200 text-green-900 dark:bg-green-800 dark:text-green-100",
  "in_review": "bg-purple-200 text-purple-900 dark:bg-purple-800 dark:text-purple-100",
};

const statusLabels = {
  "todo": "To Do",
  "in_progress": "In Progress",
  "done": "Done",
  "in_review": "In Review",
};

const ITEM_HEIGHT = 72; // Height of each task row in pixels

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200];

const PaginationControls: React.FC<{
  pagination: PaginationInfo;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  onPageChange: (page: number) => void;
}> = ({ pagination, pageSize, onPageSizeChange, onPageChange }) => {
  const { currentPage, pages, total } = pagination;
  
  const startItem = ((currentPage - 1) * pageSize) + 1;
  const endItem = Math.min(currentPage * pageSize, total);
  
  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(pages, startPage + maxVisiblePages - 1);
    
    // Adjust if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <Button
          key={i}
          variant={i === currentPage ? "default" : "outline"}
          size="sm"
          onClick={() => onPageChange(i)}
          className="h-8 w-8 p-0"
        >
          {i}
        </Button>
      );
    }
    
    return pageNumbers;
  };

  // Always show pagination controls if there are tasks
  if (total === 0) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t bg-background">
      <div className="flex items-center gap-4">
        <div className="text-sm text-muted-foreground">
          Showing {startItem} to {endItem} of {total} tasks
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <Select value={pageSize.toString()} onValueChange={(value) => onPageSizeChange(parseInt(value))}>
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="h-8 w-8 p-0"
          title="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-8 w-8 p-0"
          title="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center gap-1">
          {renderPageNumbers()}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === pages}
          className="h-8 w-8 p-0"
          title="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pages)}
          disabled={currentPage === pages}
          className="h-8 w-8 p-0"
          title="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

interface TaskRowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    tasks: VirtualizedTask[];
    selectedTasks: string[];
    onTaskSelect: (taskId: string) => void;
    onTaskUpdate?: (taskId: string, updates: any) => Promise<void>;
    onTaskDelete?: (taskId: string) => Promise<void>;
  };
  dragAttributes?: any;
  dragListeners?: any;
  isDragging?: boolean;
}

const TaskRow: React.FC<TaskRowProps> = ({ 
  index, 
  style, 
  data, 
  dragAttributes = {}, 
  dragListeners = {}, 
  isDragging = false 
}) => {
  const { tasks, selectedTasks, onTaskSelect, onTaskUpdate, onTaskDelete } = data;
  const task = tasks[index];

  const isOverdue = (dueDate: Date | null) => {
    if (!dueDate) return false;
    return dueDate < new Date() && task.status !== 'done';
  };

  const formatDueDate = (dueDate: Date | null) => {
    if (!dueDate) return null;
    return format(dueDate, 'MMM d');
  };

  const handleQuickStatusUpdate = useCallback(async (newStatus: string) => {
    if (!onTaskUpdate) {
      console.error('onTaskUpdate function not provided');
      return;
    }
    try {await onTaskUpdate(task.id, { status: newStatus });} catch (error) {
      console.error('Failed to update task status:', error);
    }
  }, [task.id, onTaskUpdate]);

  const handleDelete = useCallback(async () => {
    if (!onTaskDelete) {
      console.error('onTaskDelete function not provided');
      return;
    }
    try {await onTaskDelete(task.id);} catch (error) {
      console.error('Failed to delete task:', error);
    }
  }, [task.id, onTaskDelete]);

  return (
    <motion.div
      style={{
        ...style,
        display: "grid",
        gridTemplateColumns: "20px 48px 1fr 150px 120px 100px 150px 100px 100px 48px",
        gap: "0.75rem",
        alignItems: "center"
      }}
      className={cn(
        "group px-4 py-2 hover:bg-muted/50 transition-colors border-b border-border/50",
        isDragging && "opacity-50 z-50"
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
    >
      {/* Drag Handle */}
      <div 
        {...dragAttributes} 
        {...dragListeners}
        className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        title="Drag to reorder"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Checkbox */}
      <div>
        <input
          type="checkbox"
          checked={selectedTasks.includes(task.id)}
          onChange={() => onTaskSelect(task.id)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          aria-label={`Select task ${task.title}`}
        />
      </div>

      {/* Title */}
      <div className="min-w-0">
        <div className="block group/link cursor-pointer">
          <div className="font-medium text-sm group-hover/link:text-primary transition-colors line-clamp-1">
            {task.title}
          </div>
          <div className="text-xs text-muted-foreground line-clamp-1 flex items-center gap-1">
            <span>{task.project.slug}-{task.number}</span>
            {task.parentId && (
              <span className="bg-muted px-1 py-0.5 rounded text-xs">Subtask</span>
            )}
          </div>
        </div>
      </div>

      {/* Project */}
      <div>
        <div className="flex items-center space-x-2">
          <span className="text-sm truncate">{task.project.name}</span>
        </div>
      </div>

      {/* Status */}
      <div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-2">
              <Badge 
                className={cn(
                  "text-xs cursor-pointer hover:opacity-80 transition-opacity",
                  statusColors[task.status as keyof typeof statusColors]
                )}
              >
                {statusLabels[task.status as keyof typeof statusLabels] || task.status}
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleQuickStatusUpdate("todo");
              }}
            >
              To Do
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleQuickStatusUpdate("in_progress");
              }}
            >
              In Progress
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleQuickStatusUpdate("done");
              }}
            >
              In Review
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleQuickStatusUpdate("done");
              }}
            >
              Done
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Priority */}
      <div>
        <Badge 
          className={cn(
            "text-xs",
            priorityColors[task.priority as keyof typeof priorityColors]
          )}
        >
          {priorityLabels[task.priority as keyof typeof priorityLabels] || task.priority}
        </Badge>
      </div>

      {/* Assignee */}
      <div>
        {task.assigneeName ? (
          <div className="flex items-center space-x-2">
            <Avatar className="h-6 w-6">
              <div className="bg-primary/10 text-primary text-xs font-medium flex items-center justify-center h-full">
                {task.assigneeName.charAt(0).toUpperCase()}
              </div>
            </Avatar>
            <span className="text-sm truncate">{task.assigneeName}</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
              <User className="h-3 w-3 text-muted-foreground" />
            </div>
            <span className="text-xs text-muted-foreground">Unassigned</span>
          </div>
        )}
      </div>

      {/* Start Date */}
      <div>
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {format(task.createdAt, 'MMM d')}
        </div>
      </div>

      {/* Due Date */}
      <div>
        {task.dueDate ? (
          <div className={cn(
            "text-xs flex items-center gap-1",
            isOverdue(task.dueDate) ? "text-red-600 font-medium" : "text-muted-foreground"
          )}>
            <Clock className="h-3 w-3" />
            {formatDueDate(task.dueDate)}
            {isOverdue(task.dueDate) && " (Overdue)"}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label={`Actions for task ${task.title}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // TODO: Navigate to task details when route is available
              }}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const newStatus = task.status === 'done' ? 'todo' : 'done';
                handleQuickStatusUpdate(newStatus);
              }}
              className="flex items-center gap-2"
            >
              <CheckSquare className="h-4 w-4" />
              {task.status === 'done' ? 'Mark as To Do' : 'Mark as Done'}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!onTaskUpdate) {
                  console.error('onTaskUpdate function not provided');
                  return;
                }
                try {
                  const newPriority = task.priority === 'urgent' ? 'medium' : 'urgent';await onTaskUpdate(task.id, { priority: newPriority });} catch (error) {
                  console.error('Failed to update task priority:', error);
                }
              }}
              className="flex items-center gap-2"
            >
              <Flag className="h-4 w-4" />
              {task.priority === 'urgent' ? 'Remove Urgent' : 'Mark as Urgent'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDelete();
              }}
              className="flex items-center gap-2 text-red-600 focus:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
              Delete Task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
};

// Sortable Task Row wrapper component
const SortableTaskRow: React.FC<TaskRowProps> = ({ 
  index, 
  style, 
  data
}) => {
  const { tasks } = data;
  const task = tasks[index];
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: "task",
      task,
      index,
    },
  });

  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...style,
  };

  return (
    <div ref={setNodeRef} style={sortableStyle}>
      <TaskRow 
        index={index} 
        style={{}} 
        data={data} 
        dragAttributes={attributes}
        dragListeners={listeners}
        isDragging={isDragging}
      />
    </div>
  );
};

const TaskListHeader: React.FC<{
  selectedTasks: string[];
  totalTasks: number;
  onSelectAll: () => void;
}> = ({ selectedTasks, totalTasks, onSelectAll }) => {
  const allSelected = selectedTasks.length === totalTasks && totalTasks > 0;
  
  return (
    <div 
      style={{
        display: "grid",
        gridTemplateColumns: "20px 48px 1fr 150px 120px 100px 150px 100px 100px 48px",
        gap: "0.75rem",
        alignItems: "center"
      }}
      className="px-4 py-3 bg-muted/30 border-b border-border text-sm font-medium text-muted-foreground"
    >
      <div></div> {/* Drag handle space */}
      <div>
        <input
          type="checkbox"
          checked={allSelected}
          ref={(input) => {
            if (input) input.indeterminate = selectedTasks.length > 0 && !allSelected;
          }}
          onChange={onSelectAll}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          aria-label="Select all tasks"
        />
      </div>
      <div>Task</div>
      <div>Project</div>
      <div>Status</div>
      <div>Priority</div>
      <div>Assignee</div>
      <div>Start Date</div>
      <div>Due Date</div>
      <div className="text-center">Actions</div>
    </div>
  );
};

const TaskListSkeleton: React.FC = () => {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div 
          key={i} 
          style={{
            display: "grid",
            gridTemplateColumns: "20px 48px 1fr 150px 120px 100px 150px 100px 100px 48px",
            gap: "0.75rem",
            alignItems: "center"
          }}
          className="py-2"
        >
          <div>
            <Skeleton className="h-4 w-4" />
          </div>
          <div>
            <Skeleton className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <div>
            <Skeleton className="h-6 w-20" />
          </div>
          <div>
            <Skeleton className="h-6 w-16" />
          </div>
          <div>
            <Skeleton className="h-6 w-12" />
          </div>
          <div>
            <Skeleton className="h-6 w-20" />
          </div>
          <div>
            <Skeleton className="h-4 w-12" />
          </div>
          <div>
            <Skeleton className="h-4 w-12" />
          </div>
          <div className="flex justify-center">
            <Skeleton className="h-6 w-6" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const VirtualizedTaskList: React.FC<VirtualizedTaskListProps> = ({
  tasks,
  selectedTasks,
  onTaskSelect,
  onSelectAll,
  onTaskUpdate,
  onTaskDelete,
  onTaskReorder,
  isLoading = false,
  className,
  pagination,
  pageSize,
  onPageSizeChange,
  onPageChange,
}) => {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  
  // DnD Kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !onTaskReorder) return;

    const activeIndex = tasks.findIndex((task) => task.id === active.id);
    const overIndex = tasks.findIndex((task) => task.id === over.id);

    if (activeIndex !== overIndex) {
      const activeTask = tasks[activeIndex];
      const newPosition = overIndex + 1; // Positions are 1-indexed
      
      try {
        await onTaskReorder(activeTask.id, newPosition);
        toast.success("Task reordered successfully");
      } catch (error) {
        toast.error("Failed to reorder task");
        console.error("Task reorder error:", error);
      }
    }
  };

  const itemData = useMemo(() => ({
    tasks,
    selectedTasks,
    onTaskSelect,
    onTaskUpdate,
    onTaskDelete,
  }), [tasks, selectedTasks, onTaskSelect, onTaskUpdate, onTaskDelete]);

  // Show pagination controls whenever pagination data is available
  const shouldShowPagination = pagination && pagination.total > 0;

  if (isLoading) {
    return (
      <div className={cn("border rounded-lg", className)}>
        <TaskListHeader
          selectedTasks={[]}
          totalTasks={0}
          onSelectAll={() => {}}
        />
        <TaskListSkeleton />
        {shouldShowPagination && (
          <PaginationControls
            pagination={pagination!}
            pageSize={pageSize}
            onPageSizeChange={onPageSizeChange}
            onPageChange={onPageChange}
          />
        )}
      </div>
    );
  }

  if (tasks.length === 0 && pagination?.total === 0) {
    return (
      <div className={cn("border rounded-lg", className)}>
        <TaskListHeader
          selectedTasks={selectedTasks}
          totalTasks={0}
          onSelectAll={onSelectAll}
        />
        <div className="p-8 text-center">
          <div className="text-muted-foreground">No tasks found</div>
        </div>
      </div>
    );
  }

  // Calculate list height based on page size, max 15 rows visible
  const maxVisibleRows = Math.min(pageSize, 15);
  const actualRows = Math.min(tasks.length, maxVisibleRows);
  const listHeight = actualRows * ITEM_HEIGHT;

  // Set up virtualizer
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5,
  });

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={cn("border rounded-lg overflow-hidden", className)}>
        <TaskListHeader
          selectedTasks={selectedTasks}
          totalTasks={pagination?.total || tasks.length}
          onSelectAll={onSelectAll}
        />
        <SortableContext
          items={tasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          <div 
            ref={parentRef}
            className="border-t"
            style={{
              height: `${listHeight}px`,
              overflow: 'auto',
            }}
          >
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const task = tasks[virtualRow.index];
                return (
                  <div
                    key={virtualRow.index}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${ITEM_HEIGHT}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <SortableTaskRow
                      index={virtualRow.index}
                      style={{}}
                      data={itemData}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </SortableContext>
        
        {/* Drag Overlay */}
        <DragOverlay>
          {activeId ? (
            <div className="transform rotate-2 shadow-lg">
              {(() => {
                const task = tasks.find(t => t.id === activeId);
                const taskIndex = tasks.findIndex(t => t.id === activeId);
                return task ? (
                  <TaskRow
                    index={taskIndex}
                    style={{}}
                    data={itemData}
                    isDragging={true}
                  />
                ) : null;
              })()}
            </div>
          ) : null}
        </DragOverlay>
      </div>
      {shouldShowPagination && (
        <PaginationControls
          pagination={pagination!}
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange}
          onPageChange={onPageChange}
        />
      )}
    </DndContext>
  );
};

export default VirtualizedTaskList; 