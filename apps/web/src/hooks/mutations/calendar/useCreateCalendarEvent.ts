import { useMutation, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL, API_URL } from '@/constants/urls';

interface CreateCalendarEventParams {
  userId: string;
  title: string;
  description?: string;
  startTime: number;
  endTime?: number;
  participants?: string[];
}

interface CreateCalendarEventResponse {
  success: boolean;
  eventId?: string;
  eventUrl?: string;
}

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation<CreateCalendarEventResponse, Error, CreateCalendarEventParams>({
    mutationFn: async (params) => {
      const response = await fetch(`${API_BASE_URL}/calendar/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create calendar event');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
} 