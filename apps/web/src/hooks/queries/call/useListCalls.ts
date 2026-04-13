import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL, API_URL } from '@/constants/urls';

export function useListCalls(userId: string) {
  return useQuery({
    queryKey: ['calls', userId],
    queryFn: async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/call?userId=${userId}`);
        if (!res.ok) throw new Error('Failed to fetch calls');
        const data = await res.json();
        // Ensure we always return an array, even if data.calls is undefined
        return data?.calls || [];
      } catch (error) {
        console.error('Failed to fetch calls:', error);
        // Return empty array on error to ensure we never return undefined
        return [];
      }
    },
    enabled: !!userId
  });
} 