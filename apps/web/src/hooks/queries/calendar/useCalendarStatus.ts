import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL, API_URL } from '@/constants/urls';

interface CalendarStatus {
  connected: boolean;
  provider?: 'google' | 'microsoft';
  needsRefresh?: boolean;
}

export function useCalendarStatus(userId: string) {
  return useQuery<CalendarStatus>({
    queryKey: ['calendar', 'status', userId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/calendar/status/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch calendar status');
      }
      return response.json();
    },
    enabled: !!userId,
  });
} 