/**
 * 🎯 useLogProgress Mutation Hook
 * 
 * Manually logs progress for a goal or key result
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from 'sonner';

export interface LogProgressData {
  goalId: string;
  keyResultId?: string;
  value: number;
  note?: string;
}

export function useLogProgress() {
  const queryClient = useQueryClient();
  
  
  return useMutation({
    mutationFn: async ({ goalId, ...data }: LogProgressData) => {
      const response = await api.post(`/api/goals/${goalId}/progress`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate all goal-related queries
      queryClient.invalidateQueries({ queryKey: ['goal', variables.goalId] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goal-progress', variables.goalId] });
      queryClient.invalidateQueries({ queryKey: ['goal-analytics', variables.goalId] });

      toast.success("Progress logged successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to log progress");
    },
  });
}

