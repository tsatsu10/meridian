/**
 * 🎯 useDeleteGoal Mutation Hook
 * 
 * Deletes a goal (soft delete)
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from 'sonner';

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  
  
  return useMutation({
    mutationFn: async (goalId: string) => {
      const response = await api.delete(`/api/goals/${goalId}`);
      return response.data;
    },
    onSuccess: (data, goalId) => {
      // Invalidate goals list and specific goal
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goal', goalId] });

      toast.success("Goal deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to delete goal");
    },
  });
}

