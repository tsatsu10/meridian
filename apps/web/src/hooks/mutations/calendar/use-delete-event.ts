// @epic-3.4-teams: Delete calendar event mutation hook
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { API_BASE_URL, API_URL } from '@/constants/urls';

interface DeleteEventResponse {
  success: boolean;
  message: string;
}

async function deleteEvent(eventId: string): Promise<DeleteEventResponse> {
  const response = await fetch(`${API_BASE_URL}/calendar/events/${eventId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || error.error || 'Failed to delete event');
  }

  return response.json();
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventId: string) => deleteEvent(eventId),
    onSuccess: () => {
      toast.success('Event deleted successfully!');
      
      // Invalidate all team events queries (includes all date ranges)
      queryClient.invalidateQueries({ 
        queryKey: ['team-events'],
        exact: false,
        refetchType: 'all'
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to delete event', {
        description: error.message,
      });
    },
  });
}

