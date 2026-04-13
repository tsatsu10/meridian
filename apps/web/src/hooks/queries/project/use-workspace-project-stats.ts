import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";
import useWorkspaceStore from "@/store/workspace";

export interface WorkspaceProjectStats {
  total: number;
  active: number;
  completed: number;
  avgProgress: number;
}

export function useWorkspaceProjectStats() {
  const { workspace } = useWorkspaceStore();

  return useQuery({
    queryKey: ["projects-stats", workspace?.id],
    queryFn: async (): Promise<WorkspaceProjectStats> => {
      if (!workspace?.id) {
        throw new Error("No workspace selected");
      }
      return fetchApi(`/project/stats`, {
        params: { workspaceId: workspace.id },
      });
    },
    enabled: !!workspace?.id,
    staleTime: 30_000,
  });
}
