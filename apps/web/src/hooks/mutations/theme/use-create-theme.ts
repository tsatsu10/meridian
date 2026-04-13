/**
 * ➕ Create Theme Mutation Hook
 * 
 * Creates a new backlog theme/category
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { API_BASE_URL, API_URL } from '@/constants/urls';
import type { CreateThemeInput, BacklogTheme } from '@/types/backlog-theme';

interface CreateThemeMutationInput extends CreateThemeInput {
  projectId: string;
}

export const useCreateTheme = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, ...data }: CreateThemeMutationInput): Promise<BacklogTheme> => {
      const response = await fetch(
        `${API_BASE_URL}/backlog-categories/${projectId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create theme');
      }

      const result = await response.json();
      return result.data;
    },
    onSuccess: (data, variables) => {
      toast.success(`Theme "${data.name}" created successfully!`);
      // Invalidate and refetch themes
      queryClient.invalidateQueries({
        queryKey: ['backlog-themes', variables.projectId],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create theme');
    },
  });
};

