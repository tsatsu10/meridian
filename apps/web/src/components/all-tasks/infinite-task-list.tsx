import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useInfiniteQuery } from '@tanstack/react-query';
import { API_BASE_URL, API_URL } from '@/constants/urls';
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
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, ChevronUp } from 'lucide-react';
import { TaskRow } from '@/components/all-tasks/virtualized-task-list';
import { toast } from '@/lib/toast';

// Task interface matching the existing VirtualizedTask
interface InfiniteTask {
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

interface InfiniteTaskListProps {
  projectId?: string;
  workspaceId?: string;
  filters?: {
    search?: string;
    status?: string;
    priority?: string;
    assignee?: string;
  };
  selectedTasks: string[];
  onTaskSelect: (taskId: string) => void;
  onSelectAll: () => void;
  onTaskUpdate?: (taskId: string, updates: any) => Promise<void>;
  onTaskDelete?: (taskId: string) => Promise<void>;
  onTaskReorder?: (taskId: string, newPosition: number) => Promise<void>;
  className?: string;
  pageSize?: number;
}

const ITEM_HEIGHT = 72; // Height of each task row in pixels
const OVERSCAN = 5; // Number of items to render outside visible area

// Fetch function for infinite task loading
const fetchInfiniteTasks = async ({
  pageParam = 0,
  projectId,
  workspaceId,
  filters,
  pageSize = 50
}: {
  pageParam?: number;
  projectId?: string;
  workspaceId?: string;
  filters?: any;
  pageSize?: number;
}) => {
  // This would be replaced with actual API call
  const response = await fetch(`${API_BASE_URL}/task${projectId ? `/tasks/${projectId}` : `/all/${workspaceId}`}?offset=${pageParam}&limit=${pageSize}`);

  if (!response.ok) {
    throw new Error('Failed to fetch tasks');
  }

  const data = await response.json();

  // Transform API response to match expected format
  const tasks: InfiniteTask[] = data.columns ?
    data.columns.flatMap((col: any) => col.tasks || []) :
    data.tasks || [];

  return {
    tasks,
    nextCursor: tasks.length === pageSize ? pageParam + pageSize : undefined,
    hasMore: tasks.length === pageSize
  };
};

export const InfiniteTaskList: React.FC<InfiniteTaskListProps> = ({
  projectId,
  workspaceId,
  filters,
  selectedTasks,
  onTaskSelect,
  onSelectAll,
  onTaskUpdate,
  onTaskDelete,
  onTaskReorder,
  className,
  pageSize = 50,
}) => {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);

  // Infinite query for tasks
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey: ['infinite-tasks', projectId, workspaceId, filters],
    queryFn: ({ pageParam }) => fetchInfiniteTasks({
      pageParam,
      projectId,
      workspaceId,
      filters,
      pageSize
    }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30000, // 30 seconds
  });

  // Flatten all pages into single array
  const allTasks = useMemo(() => {
    return data?.pages.flatMap(page => page.tasks) ?? [];
  }, [data]);

  // Virtual scrolling setup
  const rowVirtualizer = useVirtualizer({
    count: hasNextPage ? allTasks.length + 1 : allTasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: OVERSCAN,
  });

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

  // Handle infinite scrolling
  useEffect(() => {
    const [lastItem] = [...rowVirtualizer.getVirtualItems()].reverse();

    if (!lastItem) return;

    if (
      lastItem.index >= allTasks.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [
    hasNextPage,
    fetchNextPage,
    allTasks.length,
    isFetchingNextPage,
    rowVirtualizer.getVirtualItems(),
  ]);

  // Handle scroll to top button visibility
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = parentRef.current?.scrollTop ?? 0;
      setShowScrollToTop(scrollTop > 500);
    };

    const element = parentRef.current;
    element?.addEventListener('scroll', handleScroll);
    return () => element?.removeEventListener('scroll', handleScroll);
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !onTaskReorder) return;

    const activeIndex = allTasks.findIndex((task) => task.id === active.id);
    const overIndex = allTasks.findIndex((task) => task.id === over.id);

    if (activeIndex !== overIndex) {
      const activeTask = allTasks[activeIndex];
      const newPosition = overIndex + 1;

      try {
        await onTaskReorder(activeTask.id, newPosition);
        toast.success("Task reordered successfully");
      } catch (error) {
        toast.error("Failed to reorder task");
        console.error("Task reorder error:", error);
      }
    }
  };

  const scrollToTop = () => {
    parentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className={cn("border rounded-lg", className)}>
        <div className="p-4 border-b">
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="p-4 space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={cn("border rounded-lg p-8 text-center", className)}>
        <p className="text-red-600 mb-4">Failed to load tasks</p>
        <p className="text-sm text-gray-500 mb-4">{error?.message}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("border rounded-lg relative", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <input
            type="checkbox"
            checked={selectedTasks.length === allTasks.length && allTasks.length > 0}
            onChange={onSelectAll}
            className="rounded border-gray-300"
          />
          <h3 className="font-medium">
            {allTasks.length} tasks
            {selectedTasks.length > 0 && ` • ${selectedTasks.length} selected`}
          </h3>
        </div>
        <Badge variant="secondary" className="text-xs">
          Infinite Scroll
        </Badge>
      </div>

      {/* Virtualized Task List */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          ref={parentRef}
          className="h-[600px] overflow-auto"
          style={{
            contain: 'strict',
          }}
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            <SortableContext items={allTasks.map(task => task.id)}>
              {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                const isLoaderRow = virtualItem.index > allTasks.length - 1;
                const task = allTasks[virtualItem.index];

                return (
                  <div
                    key={virtualItem.key}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    {isLoaderRow ? (
                      hasNextPage ? (
                        <div className="flex items-center justify-center h-full">
                          <Loader2 className="h-6 w-6 animate-spin" />
                          <span className="ml-2 text-sm text-gray-500">Loading more tasks...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-sm text-gray-500">
                          No more tasks to load
                        </div>
                      )
                    ) : task ? (
                      <TaskRow
                        task={task}
                        isSelected={selectedTasks.includes(task.id)}
                        onSelect={() => onTaskSelect(task.id)}
                        onUpdate={onTaskUpdate ? (updates) => onTaskUpdate(task.id, updates) : undefined}
                        onDelete={onTaskDelete ? () => onTaskDelete(task.id) : undefined}
                      />
                    ) : null}
                  </div>
                );
              })}
            </SortableContext>
          </div>
        </div>

        <DragOverlay>
          {activeId ? (
            <div className="bg-white border shadow-lg rounded-lg p-4 opacity-90">
              <span className="font-medium">Dragging task...</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Scroll to top button */}
      <AnimatePresence>
        {showScrollToTop && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-4 right-4"
          >
            <Button
              size="sm"
              variant="secondary"
              onClick={scrollToTop}
              className="rounded-full h-10 w-10 p-0 shadow-lg"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InfiniteTaskList;