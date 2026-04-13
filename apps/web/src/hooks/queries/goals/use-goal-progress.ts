/**
 * 🎯 useGoalProgress Hook
 * 
 * Fetches progress history for a goal
 */

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface ProgressEntry {
  id: string;
  goalId?: string;
  keyResultId?: string;
  value: number;
  previousValue?: number;
  note?: string;
  recordedBy: string;
  recordedAt: string;
}

export function useGoalProgress(goalId: string) {
  return useQuery({
    queryKey: ['goal-progress', goalId],
    queryFn: async () => {
      const response = await api.get(`/api/goals/${goalId}/progress`);
      return response.data as ProgressEntry[];
    },
    staleTime: 60000, // 1 minute
    enabled: !!goalId,
  });
}

