/**
 * 📋 Get Themes Query Hook
 * 
 * Fetches all backlog themes for a project
 */

import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL, API_URL } from '@/constants/urls';
import type { BacklogTheme } from '@/types/backlog-theme';

export const useGetThemes = (projectId: string) => {
  return useQuery({
    queryKey: ['backlog-themes', projectId],
    queryFn: async (): Promise<BacklogTheme[]> => {
      const response = await fetch(
        `${API_BASE_URL}/backlog-categories/${projectId}`,
        {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch themes');
      }

      const data = await response.json();
      return data.data || [];
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

