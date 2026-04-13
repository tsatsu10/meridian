import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";
import useWorkspaceStore from "@/store/workspace";

export interface WorkspaceTaskStats {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
}

export function useWorkspaceTaskStats() {
  const { workspace } = useWorkspaceStore();

  return useQuery({
    queryKey: ["all-tasks-stats", workspace?.id],
    queryFn: async (): Promise<WorkspaceTaskStats> => {
      if (!workspace?.id) {
        throw new Error("No workspace selected");
      }
      return fetchApi(`/task/all/${workspace.id}/stats`);
    },
    enabled: !!workspace?.id,
    staleTime: 30_000,
  });
}
