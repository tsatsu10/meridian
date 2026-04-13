/**
 * 🚀 PERFORMANCE: Unified Project Overview Hook
 * 
 * Replaces ~6 separate API calls with a single optimized request
 * 
 * Benefits:
 * - 83% fewer network requests
 * - Consistent data snapshot
 * - Better caching
 * - Faster page loads
 */

import { useQuery } from "@tanstack/react-query";
import { client } from "@meridian/libs";

interface UseGetProjectOverviewOptions {
  projectId: string;
  workspaceId: string;
  includeActivity?: boolean;
  activityLimit?: number;
  includeTeam?: boolean;
  enabled?: boolean;
}

function useGetProjectOverview(options: UseGetProjectOverviewOptions) {
  const {
    projectId,
    workspaceId,
    includeActivity = true,
    activityLimit = 20,
    includeTeam = true,
    enabled = true,
  } = options;

  return useQuery({
    queryKey: ["project-overview", projectId, workspaceId, { includeActivity, activityLimit, includeTeam }],
    queryFn: async () => {
      const response = await client.project[":id"].overview.$get({
        param: { id: projectId },
        query: {
          workspaceId,
          includeActivity: includeActivity.toString(),
          activityLimit: activityLimit.toString(),
          includeTeam: includeTeam.toString(),
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch project overview");
      }

      return response.json();
    },
    enabled: enabled && !!projectId && !!workspaceId,
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry if it's an auth error
      if (error instanceof Error && error.message.includes("401")) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

export default useGetProjectOverview;

