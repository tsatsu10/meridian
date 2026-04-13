import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";

interface Activity {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: any;
  createdAt: Date;
  userName: string | null;
  userEmail: string | null;
}

interface TeamActivityResponse {
  activities: Activity[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// @epic-3.4-teams: Hook for fetching team activity log with pagination
export function useGetTeamActivity(
  teamId: string | undefined,
  options?: {
    limit?: number;
    offset?: number;
    enabled?: boolean;
  }
) {
  const { limit = 50, offset = 0, enabled = true } = options || {};

  return useQuery<TeamActivityResponse>({
    queryKey: ["team-activity", teamId, limit, offset],
    queryFn: async () => {
      if (!teamId) throw new Error("Team ID is required");
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });
      const response = await fetchApi(`/team/${teamId}/activity?${params}`);
      return response;
    },
    enabled: !!teamId && enabled,
    staleTime: 1000 * 60, // 1 minute
  });
}

