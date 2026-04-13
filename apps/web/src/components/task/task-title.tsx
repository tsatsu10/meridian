// @epic-2.2-realtime: Real-time collaborative task title editing
import useUpdateTask from "@/hooks/mutations/task/use-update-task";
import useGetTask from "@/hooks/queries/task/use-get-task";
import { Route } from "@/routes/dashboard/workspace/$workspaceId/project/$projectId/task/$taskId";
import { toast } from "sonner";
import { RealTimeTaskEditor } from "./real-time-task-editor";

function TaskTitle({
  setIsSaving,
}: { setIsSaving: (isSaving: boolean) => void }) {
  const { taskId } = Route.useParams();
  const { data: task } = useGetTask(taskId);
  const { mutateAsync: updateTask } = useUpdateTask();

  const handleTitleChange = (value: string) => {
    // Real-time updates are handled by the RealTimeTaskEditor
    // This is just for local state management
  };

  const handleTitleSave = async (value: string) => {
    if (!task) return;

    setIsSaving(true);
    try {
      await updateTask({
        ...task,
        title: value,
        userEmail: task.userEmail || "",
        status: task.status || "",
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : null,
        priority: task.priority || "",
        position: task.position || 0,
      });
      toast.success("Task title updated", { duration: 2000 });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update task title",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <RealTimeTaskEditor
        taskId={taskId}
        field="title"
        value={task?.title || ""}
        onChange={handleTitleChange}
        onSave={handleTitleSave}
        placeholder="Task title"
        className="w-full text-sm font-medium bg-transparent border-none focus:outline-none focus:ring-0 text-zinc-900 dark:text-zinc-100 p-0"
      />
    </div>
  );
}

export default TaskTitle;
