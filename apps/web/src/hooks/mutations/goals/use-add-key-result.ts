/**
 * 🎯 useAddKeyResult Mutation Hook
 * 
 * Adds a key result to a goal
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from 'sonner';

export interface AddKeyResultData {
  goalId: string;
  title: string;
  description?: string;
  targetValue: number;
  currentValue?: number;
  unit: '%' | 'count' | 'currency' | 'hours' | 'custom';
  dueDate?: string;
}

export function useAddKeyResult() {
  const queryClient = useQueryClient();
  
  
  return useMutation({
    mutationFn: async ({ goalId, ...data }: AddKeyResultData) => {
      const response = await api.post(`/api/goals/${goalId}/key-results`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate goal to refetch with new key result
      queryClient.invalidateQueries({ queryKey: ['goal', variables.goalId] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });

      toast.success("Key result added successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to add key result");
    },
  });
}

