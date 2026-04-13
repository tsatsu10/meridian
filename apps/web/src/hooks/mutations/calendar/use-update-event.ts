// @epic-3.4-teams: Update calendar event mutation hook
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { API_BASE_URL, API_URL } from '@/constants/urls';

interface UpdateEventData {
  title?: string;
  description?: string;
  type?: 'meeting' | 'deadline' | 'time-off' | 'workload' | 'milestone' | 'other';
  status?: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  location?: string;
  meetingLink?: string;
  estimatedHours?: number;
  actualHours?: number;
  color?: string;
  reminderMinutes?: number;
}

interface UpdateEventResponse {
  event: any;
}

async function updateEvent(eventId: string, data: UpdateEventData): Promise<UpdateEventResponse> {
  const response = await fetch(`${API_BASE_URL}/calendar/events/${eventId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || error.error || 'Failed to update event');
  }

  return response.json();
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, data }: { eventId: string; data: UpdateEventData }) =>
      updateEvent(eventId, data),
    onSuccess: (response) => {
      toast.success('Event updated successfully!');
      
      // Invalidate all team events queries (includes all date ranges)
      queryClient.invalidateQueries({ 
        queryKey: ['team-events'],
        exact: false,
        refetchType: 'all'
      });
      
      // Invalidate specific event query
      queryClient.invalidateQueries({ 
        queryKey: ['event', response.event.id],
        exact: false,
        refetchType: 'all'
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to update event', {
        description: error.message,
      });
    },
  });
}

