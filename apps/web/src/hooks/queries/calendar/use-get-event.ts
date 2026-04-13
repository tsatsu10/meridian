// @epic-3.4-teams: Get single calendar event query hook
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL, API_URL } from '@/constants/urls';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  startTime: string;
  endTime?: string;
  allDay: boolean;
  timezone: string;
  teamId?: string;
  projectId?: string;
  workspaceId: string;
  createdBy: string;
  priority: string;
  location?: string;
  meetingLink?: string;
  estimatedHours?: number;
  actualHours?: number;
  color: string;
  attachments: any[];
  metadata: Record<string, any>;
  isRecurring: boolean;
  recurringEventId?: string;
  reminderMinutes: number;
  createdAt: string;
  updatedAt: string;
  attendees?: any[];
  recurringPattern?: any;
}

interface GetEventResponse {
  event: CalendarEvent;
}

async function getEvent(eventId: string): Promise<GetEventResponse> {
  const response = await fetch(`${API_BASE_URL}/calendar/events/${eventId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || error.error || 'Failed to fetch event');
  }

  return response.json();
}

export function useGetEvent(eventId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['event', eventId],
    queryFn: () => getEvent(eventId),
    enabled: options?.enabled !== false && !!eventId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

