/**
 * 🎯 Activities Query Hook
 * React Query hook for fetching workspace activities
 */

import { useQuery } from "@tanstack/react-query";
import { getActivities, type GetActivitiesParams } from "@/fetchers/activity/get-activities";
import useWorkspaceStore from "@/store/workspace";

export function useActivities(params?: Partial<GetActivitiesParams>) {
  const { workspace } = useWorkspaceStore();

  return useQuery({
    queryKey: ["activities", workspace?.id, params],
    queryFn: async () => {
      if (!workspace?.id) {
        throw new Error("No workspace selected");
      }

      return getActivities({
        workspaceId: workspace.id,
        ...params,
        limit: params?.limit || 20, // Default to 20 activities
      });
    },
    enabled: !!workspace?.id,
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: true, // Refetch when user switches tabs
  });
}

