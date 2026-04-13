/**
 * 🎯 useGoalAnalytics Hook
 * 
 * Fetches analytics data for a goal
 */

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface GoalAnalytics {
  goalId: string;
  currentProgress: number;
  keyResultsCount: number;
  completedKeyResults: number;
  velocity: number;
  estimatedCompletion: string | null;
  progressTrend: Array<{ date: string; value: number }>;
  daysSinceLastUpdate: number;
  healthScore: number;
}

export function useGoalAnalytics(goalId: string) {
  return useQuery({
    queryKey: ['goal-analytics', goalId],
    queryFn: async () => {
      const response = await api.get(`/api/goals/${goalId}/analytics`);
      return response.data as GoalAnalytics;
    },
    staleTime: 300000, // 5 minutes (analytics don't change frequently)
    enabled: !!goalId,
  });
}

