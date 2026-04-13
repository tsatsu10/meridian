import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateDashboardQueriesForWorkspace } from "@/lib/dashboard/invalidate-workspace-project-surface";
import useWorkspaceStore from "@/store/workspace";
import { client } from "@meridian/libs";
import type Task from "@/types/task";

interface BulkUpdateData {
  tasks: Task[];
  updates: Partial<Pick<Task, 'status' | 'priority' | 'userEmail'>>;
}

function useBulkUpdateTasks() {
  const queryClient = useQueryClient();
  const { workspace } = useWorkspaceStore();

  return useMutation({
    mutationFn: async ({ tasks, updates }: BulkUpdateData) => {
      const updatePromises = tasks.map(async (task) => {
        const updatedTask = {
          ...task,
          ...updates,
        };

        const response = await client.task[":id"].$put({
          param: { id: task.id },
          json: {
            userEmail: updatedTask.userEmail || "",
            title: updatedTask.title,
            description: updatedTask.description || "",
            status: updatedTask.status,
            priority: updatedTask.priority || "",
            dueDate: updatedTask.dueDate?.toString() || new Date().toString(),
            position: updatedTask.position || 0,
            projectId: updatedTask.projectId,
            parentId: updatedTask.parentId || undefined,
          },
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Failed to update task ${task.id}: ${error}`);
        }

        return response.json();
      });

      return Promise.all(updatePromises);
    },
    onSuccess: (_, variables) => {
      variables.tasks.forEach(task => {
        queryClient.invalidateQueries({
          queryKey: ["task", task.id],
        });
      });
      
      if (workspace?.id) {
        queryClient.invalidateQueries({ 
          queryKey: ["all-tasks", workspace.id] 
        });
        invalidateDashboardQueriesForWorkspace(queryClient, workspace.id);
      }
      
      queryClient.invalidateQueries({
        queryKey: ["tasks"],
      });
      
      queryClient.invalidateQueries({
        queryKey: ["notifications"],
      });
    },
    onError: (error) => {
      console.error("Bulk update failed:", error);
    },
  });
}

export default useBulkUpdateTasks; 