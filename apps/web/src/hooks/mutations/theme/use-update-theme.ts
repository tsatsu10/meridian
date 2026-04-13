/**
 * ✏️ Update Theme Mutation Hook
 * 
 * Updates an existing backlog theme
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { API_BASE_URL, API_URL } from '@/constants/urls';
import type { UpdateThemeInput, BacklogTheme } from '@/types/backlog-theme';

interface UpdateThemeMutationInput extends UpdateThemeInput {
  themeId: string;
  projectId: string;
}

export const useUpdateTheme = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ themeId, projectId, ...data }: UpdateThemeMutationInput): Promise<BacklogTheme> => {
      const response = await fetch(
        `${API_BASE_URL}/backlog-categories/${themeId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update theme');
      }

      const result = await response.json();
      return result.data;
    },
    onSuccess: (data, variables) => {
      toast.success('Theme updated successfully!');
      // Invalidate and refetch themes
      queryClient.invalidateQueries({
        queryKey: ['backlog-themes', variables.projectId],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update theme');
    },
  });
};

