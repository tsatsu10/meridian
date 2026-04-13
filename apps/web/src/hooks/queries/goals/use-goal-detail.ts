/**
 * 🎯 useGoalDetail Hook
 * 
 * Fetches detailed information about a specific goal
 */

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Goal } from "./use-goals";

export function useGoalDetail(goalId: string) {
  return useQuery({
    queryKey: ['goal', goalId],
    queryFn: async () => {
      const response = await api.get(`/api/goals/detail/${goalId}`);
      return response.data as Goal;
    },
    staleTime: 30000,
    enabled: !!goalId,
  });
}

