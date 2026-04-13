import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";

export interface SearchedMember {
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar: string | null;
  role: string;
  joinedAt: Date;
}

interface SearchFilters {
  query?: string;
  role?: string;
  sortBy?: "name" | "joinedAt" | "tasksCompleted";
  order?: "asc" | "desc";
}

// @epic-3.4-teams: Hook for advanced member search and filtering
export function useSearchTeamMembers(
  teamId: string | undefined,
  filters: SearchFilters = {},
  enabled: boolean = true
) {
  const { query = "", role, sortBy = "name", order = "asc" } = filters;

  return useQuery<{ members: SearchedMember[]; total: number; filters: SearchFilters }>({
    queryKey: ["team-members-search", teamId, query, role, sortBy, order],
    queryFn: async () => {
      if (!teamId) throw new Error("Team ID is required");
      
      const params = new URLSearchParams();
      if (query) params.append("q", query);
      if (role) params.append("role", role);
      params.append("sortBy", sortBy);
      params.append("order", order);

      const response = await fetchApi(`/team/${teamId}/members/search?${params}`);
      return response;
    },
    enabled: !!teamId && enabled,
    staleTime: 1000 * 30, // 30 seconds
  });
}

