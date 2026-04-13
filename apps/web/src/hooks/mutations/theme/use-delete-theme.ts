/**
 * 🗑️ Delete Theme Mutation Hook
 * 
 * Deletes a backlog theme
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { API_BASE_URL, API_URL } from '@/constants/urls';

interface DeleteThemeMutationInput {
  themeId: string;
  projectId: string;
  themeName?: string;
}

export const useDeleteTheme = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ themeId }: DeleteThemeMutationInput): Promise<void> => {
      const response = await fetch(
        `${API_BASE_URL}/backlog-categories/${themeId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete theme');
      }
    },
    onSuccess: (_data, variables) => {
      toast.success(
        variables.themeName
          ? `Theme "${variables.themeName}" deleted successfully!`
          : 'Theme deleted successfully!'
      );
      // Invalidate and refetch themes
      queryClient.invalidateQueries({
        queryKey: ['backlog-themes', variables.projectId],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete theme');
    },
  });
};

