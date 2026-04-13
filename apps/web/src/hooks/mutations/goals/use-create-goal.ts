/**
 * 🎯 useCreateGoal Mutation Hook
 * 
 * Creates a new goal
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from 'sonner';

export interface CreateGoalData {
  title: string;
  description?: string;
  type: 'objective' | 'personal' | 'team' | 'strategic';
  timeframe: string;
  startDate?: string;
  endDate?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  privacy?: 'private' | 'team' | 'organization';
  parentGoalId?: string;
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  
  
  return useMutation({
    mutationFn: async (data: CreateGoalData) => {
      const response = await api.post('/api/goals', data);
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate goals list to refetch
      queryClient.invalidateQueries({ queryKey: ['goals'] });

      toast.success("Goal created successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to create goal");
    },
  });
}

