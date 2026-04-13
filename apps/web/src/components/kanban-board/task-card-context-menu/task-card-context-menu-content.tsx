import {
  Calendar as CalendarIcon,
  Copy,
  Flag,
  FlipHorizontal2,
  ListTodo,
  Tags,
  Trash,
  User,
  Plus,
  CheckSquare,
  MousePointer,
  Unlink,
  Edit,
} from "lucide-react";

import useCreateTask from "@/hooks/mutations/task/use-create-task";
import useUpdateTask from "@/hooks/mutations/task/use-update-task";
import useGetProjects from "@/hooks/queries/project/use-get-projects";
import useGetActiveWorkspaceUsers from "@/hooks/queries/workspace-users/use-active-workspace-users";

import type { taskInfoSchema } from "@/components/task/task-info";
import { Calendar } from "@/components/ui/calendar";
import {
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";

import useDeleteTask from "@/hooks/mutations/task/use-delete-task";
import { generateLink } from "@/lib/generate-link";
import queryClient from "@/query-client";
import type Task from "@/types/task";
import type { TaskWithSubtasks } from "@/types/task";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { z } from "zod";
import CreateTaskModal from "../../shared/modals/create-task-modal";
import EditTaskModal from "../../shared/modals/edit-task-modal";
import { useBulkOperations } from "@/contexts/bulk-operations-context";

interface TaskCardContext {
  worskpaceId: string;
  projectId: string;
}

interface TaskCardContextMenuContentProps {
  task: TaskWithSubtasks;
  taskCardContext: TaskCardContext;
}

export default function TaskCardContextMenuContent({
  task,
  taskCardContext,
}: TaskCardContextMenuContentProps) {
  const [isCreateSubtaskModalOpen, setIsCreateSubtaskModalOpen] = useState(false);
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  
  // Use bulk operations if available, otherwise provide defaults
  let isSelectionMode = false;
  let enterSelectionMode = () => {};
  let selectAllSubtasks = (_parentTaskId: string, _subtasks: TaskWithSubtasks[]) => {};

  try {
    const bulkOps = useBulkOperations();
    isSelectionMode = bulkOps.isSelectionMode;
    enterSelectionMode = bulkOps.enterSelectionMode;
    selectAllSubtasks = bulkOps.selectAllSubtasks;
  } catch (error) {
    // BulkOperationsProvider not available, use defaults
  }
  const { data: projects } = useGetProjects({
    workspaceId: taskCardContext.worskpaceId,
  });
  const { data: workspaceUsers } = useGetActiveWorkspaceUsers({
    workspaceId: taskCardContext.worskpaceId,
  });
  const { mutateAsync: updateTask } = useUpdateTask();
  const { mutateAsync: createTask } = useCreateTask();
  const { mutateAsync: deleteTask } = useDeleteTask();

  const projectsOptions = useMemo(() => {
    return projects?.map((project) => {
      return { label: project.name, value: project.id };
    });
  }, [projects]);

  const usersOptions = useMemo(() => {
    return workspaceUsers?.map((user) => ({
      label: user.userName ?? user.userEmail,
      value: user.userEmail,
    }));
  }, [workspaceUsers]);

  const statusOptions = [
    {
      label: "To Do",
      value: "todo",
    },
    {
      label: "In Progress",
      value: "in_progress",
    },
    {
      label: "In Review",
      value: "done",
    },
    {
      label: "Done",
      value: "done",
    },
  ];

  const handleCopyTaskLink = () => {
    const path = `/dashboard/workspace/${taskCardContext.worskpaceId}/project/${taskCardContext.projectId}/task/${task.id}`;
    const taskLink = generateLink(path);

    navigator.clipboard.writeText(taskLink);
    toast.success("Task link copied!");
  };

  const handleDuplicateTask = async (projectId: string) => {
    const selectedProject = projectsOptions?.find(
      (project) => project.value === projectId,
    );

    const newTask = {
      description: task.description ?? "",
      dueDate: task.dueDate ?? "",
      position: 0,
      priority: task.priority as "low" | "medium" | "high" | "urgent",
      status: task.status,
      title: task.title,
      userEmail: task.userEmail ?? "",
      projectId,
    };

    try {
      await createTask(newTask);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update task",
      );
    } finally {
      toast.success(`Mirrored task successfully to: ${selectedProject?.label}`);
    }
  };

  const handleChange = async (
    field: keyof z.infer<typeof taskInfoSchema>,
    value: string | Date,
  ) => {
    try {
      await updateTask({
        ...task,
        [field]: value,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update task",
      );
    } finally {
      toast.success("Task updated successfully");
    }
  };

  const handleDeleteTask = async () => {
    try {
      await deleteTask(task.id);
      queryClient.invalidateQueries({
        queryKey: ["tasks", taskCardContext.projectId],
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete task",
      );
    } finally {
      toast.success("Task deleted successfully");
    }
  };

  const handleRemoveFromParent = async () => {
    try {
      await updateTask({
        ...task,
        parentId: null,
      });
      toast.success("Task removed from parent successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove task from parent",
      );
    }
  };

  const handleEditTask = () => {
    setIsEditTaskModalOpen(true);
  };

  return (
    <>
      <CreateTaskModal
        open={isCreateSubtaskModalOpen}
        onOpenChange={setIsCreateSubtaskModalOpen}
        status={task.status}
        parentTaskId={task.id}
        projectContext={projects?.find(p => p.id === taskCardContext.projectId)}
        hideProjectSelection={true}
      />
      
      <EditTaskModal
        open={isEditTaskModalOpen}
        onClose={() => setIsEditTaskModalOpen(false)}
        task={task}
        workspaceId={taskCardContext.worskpaceId}
      />
      
      <ContextMenuContent className="w-56">
        {/* 🎯 QUICK ACTIONS: Primary task operations */}
        <ContextMenuItem
          onClick={handleEditTask}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Edit className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
          <span className="flex-1">Edit Task</span>
          <kbd className="text-xs text-muted-foreground">E</kbd>
        </ContextMenuItem>

        <ContextMenuItem
          onClick={() => setIsCreateSubtaskModalOpen(true)}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
          <span className="flex-1">Create Subtask</span>
        </ContextMenuItem>

        <ContextMenuSeparator />

        {!isSelectionMode && (
          <ContextMenuItem
            onClick={enterSelectionMode}
            className="flex items-center gap-2 cursor-pointer"
          >
            <MousePointer className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
            Enter Selection Mode
          </ContextMenuItem>
        )}

        {task.subtasks && task.subtasks.length > 0 && (
          <ContextMenuItem
            onClick={() => selectAllSubtasks(task.id, task.subtasks!)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <CheckSquare className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
            Select All Subtasks
          </ContextMenuItem>
        )}

        {/* Show "Remove from Parent" option only for subtasks */}
        {task.parentId && (
          <ContextMenuItem
            onClick={handleRemoveFromParent}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Unlink className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
            Remove from Parent
          </ContextMenuItem>
        )}

        <ContextMenuItem
          onClick={handleCopyTaskLink}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Copy className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 " />
          <span className="flex-1">Copy Link</span>
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* ⚡ QUICK EDITS: Change properties without opening modal */}
      <ContextMenuSub>
        <ContextMenuSubTrigger className="flex items-center gap-2">
          <Tags className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
          <span className="flex-1">Priority</span>
          <kbd className="text-xs text-muted-foreground">P</kbd>
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          <ContextMenuCheckboxItem
            onClick={() => handleChange("priority", "low")}
            className="flex items-center gap-2 cursor-pointer"
            checked={task.priority === "low"}
          >
            <Flag className="w-3.5 h-3.5 text-blue-400" />
            Low
          </ContextMenuCheckboxItem>
          <ContextMenuCheckboxItem
            onClick={() => handleChange("priority", "medium")}
            className="flex items-center gap-2 cursor-pointer"
            checked={task.priority === "medium"}
          >
            <Flag className="w-3.5 h-3.5 text-yellow-400" />
            Medium
          </ContextMenuCheckboxItem>
          <ContextMenuCheckboxItem
            onClick={() => handleChange("priority", "high")}
            className="flex items-center gap-2 cursor-pointer"
            checked={task.priority === "high"}
          >
            <Flag className="w-3.5 h-3.5 text-red-400" />
            High
          </ContextMenuCheckboxItem>
          <ContextMenuCheckboxItem
            onClick={() => handleChange("priority", "urgent")}
            className="flex items-center gap-2 cursor-pointer"
            checked={task.priority === "urgent"}
          >
            <Flag className="w-3.5 h-3.5 text-red-400" />
            Urgent
          </ContextMenuCheckboxItem>
        </ContextMenuSubContent>
      </ContextMenuSub>

      <ContextMenuSub>
        <ContextMenuSubTrigger className="flex items-center gap-2">
          <ListTodo className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
          <span className="flex-1">Status</span>
          <kbd className="text-xs text-muted-foreground">S</kbd>
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          {statusOptions.map((status) => (
            <ContextMenuCheckboxItem
              key={status.value}
              checked={task.status === status.value}
              onCheckedChange={() => handleChange("status", status.value)}
              className="flex items-center justify-between cursor-pointer"
            >
              {status.label}
            </ContextMenuCheckboxItem>
          ))}
        </ContextMenuSubContent>
      </ContextMenuSub>

      <ContextMenuSub>
        <ContextMenuSubTrigger className="flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
          <span className="flex-1">Assignee</span>
          <kbd className="text-xs text-muted-foreground">A</kbd>
        </ContextMenuSubTrigger>

        {usersOptions && (
          <ContextMenuSubContent>
            {usersOptions.map((user) => (
              <ContextMenuCheckboxItem
                key={user.value}
                checked={task.userEmail === user.value}
                onCheckedChange={() =>
                  handleChange("userEmail", user.value ?? "")
                }
                className="flex items-center justify-between cursor-pointer"
              >
                {user.label}
              </ContextMenuCheckboxItem>
            ))}
            <ContextMenuCheckboxItem
              checked={!task.userEmail}
              onCheckedChange={() => handleChange("userEmail", "")}
              className="flex items-center justify-between cursor-pointer"
            >
              Unassigned
            </ContextMenuCheckboxItem>
          </ContextMenuSubContent>
        )}
      </ContextMenuSub>

      <ContextMenuSub>
        <ContextMenuSubTrigger className="flex items-center gap-2">
          <CalendarIcon className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
          <span className="flex-1">Due date</span>
          <kbd className="text-xs text-muted-foreground">D</kbd>
        </ContextMenuSubTrigger>
        {projectsOptions && (
          <ContextMenuSubContent>
            <Calendar
              mode="single"
              selected={task.dueDate ? new Date(task.dueDate) : undefined}
              onSelect={(value) => handleChange("dueDate", String(value))}
              className="w-auto border-none"
              initialFocus
            />
          </ContextMenuSubContent>
        )}
      </ContextMenuSub>

        <ContextMenuSeparator />

        {/* 🔄 ADVANCED: Mirror and bulk operations */}
      <ContextMenuSub>
        <ContextMenuSubTrigger className="flex items-center gap-2">
          <FlipHorizontal2 className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
          <span className="flex-1">Mirror</span>
        </ContextMenuSubTrigger>

        {projectsOptions && (
          <ContextMenuSubContent>
            {projectsOptions.map((project) => (
              <ContextMenuItem
                key={project.value}
                onClick={() => handleDuplicateTask(project.value)}
                className="flex items-center justify-between cursor-pointer"
              >
                {project.label}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        )}
      </ContextMenuSub>

        <ContextMenuSeparator />

      <ContextMenuItem
        onClick={handleDeleteTask}
        className="flex items-center transition-all duration-200 gap-2 cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
      >
        <Trash className="w-3.5 h-3.5" />
        <span className="flex-1">Delete Task</span>
        <kbd className="text-xs">⌦</kbd>
      </ContextMenuItem>
    </ContextMenuContent>
    </>
  );
}
