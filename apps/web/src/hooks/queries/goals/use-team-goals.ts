/**
 * 🎯 useTeamGoals Hook
 * 
 * Fetches team goals with member progress
 */

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface TeamMemberProgress {
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  goalsCount: number;
  averageProgress: number;
  completedGoals: number;
  goals: Array<{
    id: string;
    title: string;
    progress: number;
    keyResultsCount: number;
  }>;
}

export interface TeamGoalsData {
  team: {
    id: string;
    name: string;
  };
  memberProgress: TeamMemberProgress[];
  stats: {
    totalGoals: number;
    averageProgress: number;
    membersWithGoals: number;
    totalMembers: number;
    completedGoals: number;
  };
}

export function useTeamGoals(teamId: string) {
  return useQuery({
    queryKey: ['team-goals', teamId],
    queryFn: async () => {
      const response = await api.get(`/api/goals/team/${teamId}`);
      return (response?.data || response) as TeamGoalsData;
    },
    staleTime: 60000, // 1 minute
    enabled: !!teamId,
  });
}

export function useTeamProgress(teamId: string) {
  return useQuery({
    queryKey: ['team-progress', teamId],
    queryFn: async () => {
      const response = await api.get(`/api/goals/team/${teamId}/progress`);
      return (response?.data || response) as TeamGoalsData;
    },
    staleTime: 60000,
    enabled: !!teamId,
  });
}

