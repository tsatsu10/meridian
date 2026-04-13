import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";

export interface MemberPermissions {
  canManageMembers: boolean;
  canManageTasks: boolean;
  canManageProjects: boolean;
  canViewAnalytics: boolean;
  canManageIntegrations: boolean;
  canDeleteTeam: boolean;
  canChangePermissions: boolean;
}

export interface MemberWithPermissions {
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  joinedAt: Date;
  permissions: MemberPermissions;
}

// @epic-3.4-teams: Hook for fetching advanced permissions for team members
export function useGetAdvancedPermissions(teamId: string | undefined) {
  return useQuery<{ members: MemberWithPermissions[]; roles: string[] }>({
    queryKey: ["team-advanced-permissions", teamId],
    queryFn: async () => {
      if (!teamId) throw new Error("Team ID is required");
      const response = await fetchApi(`/team/${teamId}/permissions/advanced`);
      return response;
    },
    enabled: !!teamId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

