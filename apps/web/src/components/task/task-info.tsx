import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import useDeleteTask from "@/hooks/mutations/task/use-delete-task";
import useUpdateTask from "@/hooks/mutations/task/use-update-task";
import useGetActiveWorkspaceUsers from "@/hooks/queries/workspace-users/use-active-workspace-users";
import useProjectStore from "@/store/project";
import type { ProjectWithTasks, ProjectState } from "@/types/project";
import type { Task } from "@/types/task";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Flag, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import TaskCalendar from "./task-calendar";
import TaskLabels from "./task-labels";
import TaskDependencies from "./task-dependencies";
import CreateTaskModal from "../shared/modals/create-task-modal";
import useAuth from "@/components/providers/auth-provider/hooks/use-auth";

interface Column {
  id: string;
  name: string;
}

interface ProjectWithColumns extends ProjectWithTasks {
  columns: Column[];
  workspaceId: string;
  id: string;
  name: string;
  slug: string;
}

export const taskInfoSchema = z.object({
  status: z.string(),
  userEmail: z.string(),
  priority: z.string(),
  dueDate: z.date(),
});

function TaskInfo({
  task,
  setIsSaving,
}: {
  task: Task;
  setIsSaving: (isSaving: boolean) => void;
}) {
  const navigate = useNavigate();
  const [isCreateSubtaskModalOpen, setIsCreateSubtaskModalOpen] = useState(false);
  const { project } = useProjectStore();
  const { mutateAsync: updateTask } = useUpdateTask();
  const { mutateAsync: deleteTask, isPending: isDeleting } = useDeleteTask();
  const queryClient = useQueryClient();
  const { data: workspaceUsers } = useGetActiveWorkspaceUsers(
    project ? { workspaceId: project.workspaceId } : { workspaceId: "" }
  );
  const { user } = useAuth();

  const isCreator = user?.email === task.userEmail;
  const typedProject = project ? (project as unknown as ProjectWithColumns) : null;

  const form = useForm<z.infer<typeof taskInfoSchema>>({
    defaultValues: {
      status: task?.status || "",
      userEmail: task?.userEmail || "",
      priority: task?.priority || "",
      dueDate: task?.dueDate ? new Date(task.dueDate) : new Date(),
    },
  });

  const handleChange = async (data: z.infer<typeof taskInfoSchema>) => {
    if (!task || !isCreator || !project) return;

    setIsSaving(true);
    try {
      await updateTask({
        ...task,
        userEmail: data.userEmail,
        status: data.status || "",
        priority: data.priority || "",
        dueDate: data.dueDate.toISOString(),
        projectId: project.id,
      });
      toast.success("Task updated successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update task",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!task || !isCreator || !project) return;

    try {
      await deleteTask(task.id);
      queryClient.invalidateQueries({
        queryKey: ["tasks", project.id],
      });
      toast.success("Task deleted successfully");
      navigate({
        to: "/dashboard/workspace/$workspaceId/project/$projectId/board",
        params: {
          workspaceId: project.workspaceId,
          projectId: project.id,
        },
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete task",
      );
    }
  };

  useEffect(() => {
    return () => {
      form.reset();
    };
  }, [form]);

  return (
    <div className="w-full md:w-96 flex-shrink-0 overflow-y-auto border-b border-zinc-200 dark:border-zinc-800 p-4 gap-4 border-l flex flex-col">
      <Form {...form}>
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  handleChange({ ...form.getValues(), status: value });
                }}
                disabled={!isCreator}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {typedProject?.columns?.map((col) => (
                    <SelectItem key={col.id} value={col.id}>
                      {col.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="userEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assign to</FormLabel>
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  handleChange({ ...form.getValues(), userEmail: value });
                }}
                disabled={!isCreator}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {workspaceUsers?.map((user) => (
                    <SelectItem key={user.userEmail} value={user.userEmail ?? "unassigned"}>
                      {user.userName ?? ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Priority</FormLabel>
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  handleChange({ ...form.getValues(), priority: value });
                }}
                disabled={!isCreator}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <div className="flex items-center">
                      <Flag className="w-4 h-4 text-blue-500 mr-2" />
                      Low
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center">
                      <Flag className="w-4 h-4 text-yellow-500 mr-2" />
                      Medium
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="flex items-center">
                      <Flag className="w-4 h-4 text-red-500 mr-2" />
                      High
                    </div>
                  </SelectItem>
                  <SelectItem value="urgent">
                    <div className="flex items-center">
                      <Flag className="w-4 h-4 text-red-500 mr-2" />
                      Urgent
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="dueDate"
          render={({ field }) => (
            <FormItem>
              <TaskCalendar
                value={field.value}
                onChange={(date: Date) => {
                  field.onChange(date);
                  handleChange({ ...form.getValues(), dueDate: date });
                }}
                disabled={!isCreator}
              />
            </FormItem>
          )}
        />
      </Form>

      <div className="flex flex-col gap-4">
        <TaskLabels taskId={task.id} setIsSaving={setIsSaving} />
        <TaskDependencies task={task} setIsSaving={setIsSaving} />
      </div>

      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setIsCreateSubtaskModalOpen(true)}
          disabled={!isCreator}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add subtask
        </Button>
        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={handleDeleteTask}
          disabled={!isCreator || isDeleting}
        >
          {isDeleting ? "Deleting..." : "Delete task"}
        </Button>
      </div>

      {/* @epic-1.1-subtasks: Create Subtask Modal */}
      <CreateTaskModal
        open={isCreateSubtaskModalOpen}
        onOpenChange={setIsCreateSubtaskModalOpen}
        status={task.status}
        parentTaskId={task.id}
        projectContext={typedProject ? {
          id: typedProject.id,
          name: typedProject.name,
          slug: typedProject.slug
        } as ProjectState : undefined}
      />
    </div>
  );
}

export default TaskInfo;
