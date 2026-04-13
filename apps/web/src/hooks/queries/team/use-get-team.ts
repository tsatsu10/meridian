// @epic-3.4-teams: Single team query hook
// @persona-sarah: PM needs detailed team information
// @persona-david: Team lead needs comprehensive team data

import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  joinedAt: string;
  lastActive?: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  type: "general" | "project";
  workspaceId: string;
  projectId?: string;
  color: string;
  settings: Record<string, any>;
  memberCount: number;
  isActive: boolean;
  members: TeamMember[];
  createdAt: string;
  updatedAt: string;
}

export interface GetTeamResponse {
  team: Team;
}

export function useGetTeam(teamId: string) {
  return useQuery({
    queryKey: ["team", teamId],
    queryFn: async (): Promise<Team> => {
      const response: GetTeamResponse = await fetchApi(`/team/details/${teamId}`);
      return response.team;
    },
    enabled: !!teamId,
  });
}