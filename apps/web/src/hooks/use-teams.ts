import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";

export interface Team {
  id: string;
  name: string;
  description: string;
  type: 'general' | 'project';
  workspaceId: string;
  projectId?: string;
  projectName?: string;
  members: TeamMember[];
  memberCount: number;
  createdAt: Date;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  joinedAt: Date;
}

// @epic-3.4-teams: Hook for fetching teams in a workspace
export function useTeams(workspaceId: string) {
  return useQuery({
    queryKey: ["teams", workspaceId],
    queryFn: async () => {
      const response = await fetchApi(`/team/${workspaceId}`);
      const teams = (response?.teams || []) as Team[];
      return teams;
    },
    enabled: !!workspaceId && workspaceId.length > 0,
  });
} 