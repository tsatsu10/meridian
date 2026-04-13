import { useMemo, useState } from "react";
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
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FolderOpen, MoreHorizontal, Calendar, MessageSquare, Paperclip, Users, User } from "lucide-react";
import { cn } from "@/lib/cn";
import useUpdateTask from "@/hooks/mutations/task/use-update-task";
import { format, isAfter, isBefore } from "date-fns";
import { arrayMove } from "@dnd-kit/sortable";
import { client } from "@meridian/libs";

// @epic-1.1-subtasks: Sarah (PM) needs visual task organization across all projects
// @epic-3.2-time: David (Team Lead) needs workload visualization

interface Task {
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
    columns?: Array<{
      id: string;
      name: string;
      color?: string;
      isDefault?: boolean;
    }>;
  };
  assignedTeamId?: string | null;
  assignedTeam?: {
    id: string;
    name: string;
  } | null;
}

interface AllTasksKanbanViewProps {
  tasks: Task[];
  isLoading: boolean;
  selectedTasks: string[];
  onTaskSelect: (taskId: string) => void;
  projects?: Array<{
    id: string;
    name: string;
    slug: string;
    columns: Array<{
      id: string;
      name: string;
      color?: string;
      isDefault?: boolean;
    }>;
  }>;
}

// Status configurations for kanban columns (ids must match API task_status enum)
const statusColumns = [
  {
    id: "todo",
    name: "To Do",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  },
  {
    id: "in_progress",
    name: "In Progress",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  },
  {
    id: "done",
    name: "Done",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  },
];

const priorityColors = {
  low: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  urgent: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const priorityLabels = {
  "low": "Low",
  "medium": "Medium", 
  "high": "High",
  "urgent": "Urgent",
};

// @epic-1.1-subtasks: Dynamic status columns for Sarah's PM workflow enhancement
function getStatusColumnsFromProjects(projects: AllTasksKanbanViewProps['projects'], tasks: Task[]) {
  const columnMap = new Map<string, { id: string; name: string; color: string; isDefault: boolean; position?: number }>();
  
  // Default columns as fallback with positions
  const defaultColumns = [
    { id: "todo", name: "To Do", color: "#6b7280", isDefault: true, position: 0 },
    { id: "in_progress", name: "In Progress", color: "#3b82f6", isDefault: true, position: 1 },
    { id: "done", name: "Done", color: "#10b981", isDefault: true, position: 2 },
  ];

  // Add default columns
  defaultColumns.forEach(col => columnMap.set(col.id, col));

  // Add custom columns from projects with their positions
  let customColumnCounter = 0;
  projects?.forEach(project => {
    project.columns?.forEach((column) => {
      if (!column.isDefault && !columnMap.has(column.id)) { // also check if column already exists
        columnMap.set(column.id, {
          id: column.id,
          name: column.name,
          color: column.color || "#6b7280",
          isDefault: false,
          position: 4 + customColumnCounter++, // Incrementing position
        });
      }
    });
  });

  // Add any status found in tasks that's not in columns (for data consistency)
  const taskStatuses = new Set(tasks.map(task => task.status));
  let unknownStatusCounter = 0;
  taskStatuses.forEach(status => {
    if (!columnMap.has(status)) {
      columnMap.set(status, {
        id: status,
        name: status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        color: "#6b7280",
        isDefault: false,
        position: 100 + unknownStatusCounter++, // Put unknown statuses at the end
      });
    }
  });

  return Array.from(columnMap.values()).sort((a, b) => {
    // Sort by position, with defaults first
    const aPos = a.position ?? (a.isDefault ? 0 : 999);
    const bPos = b.position ?? (b.isDefault ? 0 : 999);
    return aPos - bPos;
  });
}

// Task Card Component for Kanban
function TaskCard({ task, isSelected, onSelect }: { 
  task: Task; 
  isSelected: boolean;
  onSelect: (taskId: string) => void;
}) {
  const isOverdue = (dueDate: Date | null) => {
    if (!dueDate) return false;
    return isBefore(new Date(dueDate), new Date()) && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  return (
    <Card 
      className={cn(
        "p-3 cursor-pointer hover:shadow-md transition-shadow",
        isSelected && "ring-2 ring-blue-500"
      )}
      onClick={() => onSelect(task.id)}
    >
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium truncate">{task.title}</h4>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
              <span>{task.project.slug}-{task.number}</span>
              {task.parentId && (
                <Badge variant="outline" className="text-xs">
                  Subtask
                </Badge>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </div>

        {/* Project */}
        <div className="flex items-center space-x-2 text-xs">
          <FolderOpen className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground truncate">{task.project.name}</span>
        </div>

        {/* Priority */}
        <div className="flex items-center justify-between">
          <Badge
            variant="secondary"
            className={cn("text-xs", priorityColors[task.priority as keyof typeof priorityColors])}
          >
            {priorityLabels[task.priority as keyof typeof priorityLabels]}
          </Badge>

          {/* Assignee */}
          {task.assignedTeamId ? (
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {task.assignedTeam?.name || 'Assigned Team'}
              </span>
            </div>
          ) : task.assigneeEmail ? (
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

        {/* Due Date */}
        {task.dueDate && (
          <div className={cn(
            "text-xs",
            isOverdue(task.dueDate) ? "text-red-600 dark:text-red-400 font-medium" : "text-muted-foreground"
          )}>
            Due: {format(new Date(task.dueDate), "MMM d, yyyy")}
            {isOverdue(task.dueDate) && (
              <span className="ml-1">⚠️</span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

// Column Component 
function KanbanColumn({ 
  column, 
  tasks, 
  selectedTasks,
  onTaskSelect 
}: { 
  column: { id: string; name: string; color: string; isDefault: boolean };
  tasks: Task[];
  selectedTasks: string[];
  onTaskSelect: (taskId: string) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Column Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center space-x-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: column.color }}
          />
          <h3 className="font-semibold text-sm">{column.name}</h3>
          <Badge variant="secondary" className="text-xs">
            {tasks.length}
          </Badge>
        </div>
      </div>

      {/* Task List */}
      <div 
        className="flex-1 p-3 space-y-2 overflow-y-auto min-h-[200px]"
        data-column-id={column.id}
      >
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            isSelected={selectedTasks.includes(task.id)}
            onSelect={onTaskSelect}
          />
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No tasks in {column.name.toLowerCase()}
          </div>
        )}
      </div>
    </div>
  );
}

export function AllTasksKanbanView({ 
  tasks, 
  isLoading, 
  selectedTasks, 
  onTaskSelect,
  projects = []
}: AllTasksKanbanViewProps) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const { mutate: updateTask } = useUpdateTask();

  // @epic-1.1-subtasks: Get dynamic status columns
  const statusColumns = getStatusColumnsFromProjects(projects, tasks);

  // Group tasks by status using dynamic columns
  const tasksByStatus = statusColumns.reduce((acc, column) => {
    acc[column.id] = tasks.filter(task => task.status === column.id);
    return acc;
  }, {} as Record<string, Task[]>);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as string;

    // Find the task being moved
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (task.status === newStatus) return;

    try {
      await client.task[":id"].$put({
        param: { id: taskId },
        json: {
          id: task.id,
          title: task.title,
          description: task.description || "",
          status: newStatus,
          priority: task.priority,
          dueDate: task.dueDate ? task.dueDate.toISOString() : undefined,
          position: task.position,
          projectId: task.projectId,
          parentId: task.parentId || undefined,
          userEmail: task.userEmail || undefined,
          number: task.number,
          createdAt: task.createdAt.toISOString(),
        },
      });
      toast.success(`Task moved to ${statusColumns.find(col => col.id === newStatus)?.name}`);
    } catch (error) {
      toast.error("Failed to update task status");
      logger.error(
        "Kanban drag update failed",
        error instanceof Error ? error : new Error(String(error))
      );
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-[600px]">
        {statusColumns.map((column) => (
          <Card key={column.id} className="p-4">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-4"></div>
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 bg-gray-100 rounded"></div>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-[600px]">
        {statusColumns.map((column) => (
          <Card key={column.id} className="flex flex-col">
            <KanbanColumn
              column={column}
              tasks={tasksByStatus[column.id] || []}
              selectedTasks={selectedTasks}
              onTaskSelect={onTaskSelect}
            />
          </Card>
        ))}
      </div>

      <DragOverlay>
        {activeId ? (
          <div className="transform rotate-3">
            {(() => {
              const task = tasks.find(t => t.id === activeId);
              return task ? (
                <TaskCard
                  task={task}
                  isSelected={false}
                  onSelect={() => {}}
                />
              ) : null;
            })()}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
} 