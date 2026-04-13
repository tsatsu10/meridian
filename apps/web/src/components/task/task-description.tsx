// @epic-2.2-realtime: Real-time collaborative task description editing
import useUpdateTask from "@/hooks/mutations/task/use-update-task";
import useGetTask from "@/hooks/queries/task/use-get-task";
import { Route } from "@/routes/dashboard/workspace/$workspaceId/project/$projectId/task/$taskId";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Editor } from "../common/editor";
import { Form, FormField } from "../ui/form";
import { RealTimeTaskEditor } from "./real-time-task-editor";
import { useTextSelectionTracking } from "@/components/presence/text-selection-overlay";
import { useRef } from "react";

interface TaskDescriptionProps {
  setIsSaving: (isSaving: boolean) => void;
}

function TaskDescription({ setIsSaving }: TaskDescriptionProps) {
  const { taskId } = Route.useParams();
  const { data: task, isLoading, error } = useGetTask(taskId);
  const { mutateAsync: updateTask } = useUpdateTask();
  const descriptionRef = useRef<HTMLDivElement>(null);

  // Always call hooks unconditionally - React rule of hooks
  // Track text selections in the description for collaborative editing
  useTextSelectionTracking(descriptionRef, `task-description-${taskId}`);

  const form = useForm<{
    description: string;
  }>({
    shouldUnregister: true,
    values: {
      description: task?.description ?? "",
    },
  });

  // Handle loading state AFTER all hooks
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200/50 dark:border-zinc-800/50 pb-1 px-1">
        <div className="min-h-[120px] flex items-center justify-center">
          <div className="text-sm text-muted-foreground">Loading description...</div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error || !task) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200/50 dark:border-zinc-800/50 pb-1 px-1">
        <div className="min-h-[120px] flex items-center justify-center">
          <div className="text-sm text-red-600 dark:text-red-400">
            Failed to load task description
          </div>
        </div>
      </div>
    );
  }

  const handleDescriptionChange = (value: string) => {
    // Real-time updates are handled by the RealTimeTaskEditor
    // This is just for local state management
  };

  const handleDescriptionSave = async (value: string) => {
    if (!task) return;

    try {
      setIsSaving(true);
      await updateTask({
        ...task,
        description: value,
        userEmail: task.userEmail ?? "",
        title: task.title ?? "",
        status: task.status ?? "todo",
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : null,
        priority: task.priority ?? "medium",
        position: task.position ?? 0,
      });
    } catch (error) {
      console.error("Failed to save task description:", error);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    return () => {
      form.reset();
    };
  }, [form]);

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200/50 dark:border-zinc-800/50 pb-1 px-1">
      <div ref={descriptionRef} data-selection-id={`task-description-${taskId}`}>
        <RealTimeTaskEditor
          taskId={taskId}
          field="description"
          value={task?.description || ""}
          onChange={handleDescriptionChange}
          onSave={handleDescriptionSave}
          placeholder="Use the toolbar to format your description..."
          className="min-h-[120px]"
        />
      </div>
    </div>
  );
}

export default TaskDescription;
