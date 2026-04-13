/**
 * 🎯 useUpdateGoal Mutation Hook
 * 
 * Updates an existing goal
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from 'sonner';

export interface UpdateGoalData {
  id: string;
  title?: string;
  description?: string;
  type?: 'objective' | 'personal' | 'team' | 'strategic';
  timeframe?: string;
  startDate?: string;
  endDate?: string;
  status?: 'draft' | 'active' | 'completed' | 'abandoned';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  privacy?: 'private' | 'team' | 'organization';
  progress?: number;
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  
  
  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateGoalData) => {
      const response = await api.put(`/api/goals/${id}`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate specific goal and goals list
      queryClient.invalidateQueries({ queryKey: ['goal', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });

      toast.success("Goal updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to update goal");
    },
  });
}

