/**
 * 🎯 useUpdateKeyResult Mutation Hook
 * 
 * Updates a key result and automatically recalculates goal progress
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from 'sonner';

export interface UpdateKeyResultData {
  id: string;
  goalId: string;
  title?: string;
  description?: string;
  targetValue?: number;
  currentValue?: number;
  unit?: '%' | 'count' | 'currency' | 'hours' | 'custom';
  dueDate?: string;
  status?: 'not_started' | 'on_track' | 'at_risk' | 'behind' | 'completed';
}

export function useUpdateKeyResult() {
  const queryClient = useQueryClient();
  
  
  return useMutation({
    mutationFn: async ({ id, goalId, ...data }: UpdateKeyResultData) => {
      const response = await api.put(`/api/goals/key-results/${id}`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate goal and progress data
      queryClient.invalidateQueries({ queryKey: ['goal', variables.goalId] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goal-progress', variables.goalId] });
      queryClient.invalidateQueries({ queryKey: ['goal-analytics', variables.goalId] });

      toast.success("Key result updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to update key result");
    },
  });
}

