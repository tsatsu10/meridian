// @epic-3.4-teams: Create calendar event mutation hook
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { API_BASE_URL, API_URL } from '@/constants/urls';

interface CreateEventData {
  title: string;
  description?: string;
  type: 'meeting' | 'deadline' | 'time-off' | 'workload' | 'milestone' | 'other';
  startTime: string;
  endTime?: string;
  allDay?: boolean;
  timezone?: string;
  teamId?: string;
  projectId?: string;
  workspaceId: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  location?: string;
  meetingLink?: string;
  estimatedHours?: number;
  color?: string;
  attendees?: string[];
  isRecurring?: boolean;
  recurringPattern?: {
    frequency: 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
    interval?: number;
    endDate?: string;
    occurrences?: number;
    weekdays?: number[];
    dayOfMonth?: number;
    weekOfMonth?: number;
    customPattern?: Record<string, any>;
    exceptionDates?: string[];
  };
  reminderMinutes?: number;
}

interface CreateEventResponse {
  event: any;
}

async function createEvent(teamId: string, data: CreateEventData): Promise<CreateEventResponse> {
  const response = await fetch(`${API_BASE_URL}/calendar/team/${teamId}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || error.error || 'Failed to create event');
  }

  return response.json();
}

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teamId, data }: { teamId: string; data: CreateEventData }) =>
      createEvent(teamId, data),
    onSuccess: (response, variables) => {
      toast.success('Event created successfully!');
      
      // Invalidate all team events queries (includes all date ranges for this team)
      queryClient.invalidateQueries({ 
        queryKey: ['team-events'],
        exact: false,
        refetchType: 'all'
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to create event', {
        description: error.message,
      });
    },
  });
}

