// @epic-3.4-teams: Hook for fetching team calendar events
// @persona-sarah: PM needs to see team deadlines and milestones
// @persona-david: Team Lead needs workload visibility

import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/fetch";

/**
 * Calendar event returned from the API
 */
export interface CalendarEvent {
  id: string;
  title: string;
  type: 'deadline' | 'milestone' | 'meeting' | 'time-off' | 'workload' | 'focus-time' | 'break';
  date: string; // ISO date string (primary)
  startDate?: string; // ISO date string (optional)
  endDate?: string; // ISO date string (optional)
  startTime?: string; // ISO datetime string (for DayView/WeekView)
  endTime?: string; // ISO datetime string (for DayView/WeekView)
  priority?: 'low' | 'medium' | 'high' | 'critical';
  color?: string;
  memberId?: string;
  attendees?: string[];
  description?: string;
  source?: 'task' | 'milestone' | 'calendar'; // Event source type for click handling
  location?: string;
  meetingLink?: string;
  status?: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  createdBy?: string;
  allDay?: boolean;
}

interface TeamEventsResponse {
  events: CalendarEvent[];
}

/**
 * Fetch calendar events for a team (tasks, milestones, deadlines)
 * 
 * @param teamId - The team ID to fetch events for
 * @param options - Optional configuration
 * @param options.startDate - Start date for event filtering (ISO string)
 * @param options.endDate - End date for event filtering (ISO string)
 * @param options.enabled - Whether the query should run
 * 
 * @returns TanStack Query result with events data
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = useGetTeamEvents(team.id, {
 *   startDate: new Date().toISOString(),
 *   endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
 * });
 * 
 * const events = data?.events || [];
 * ```
 */
export function useGetTeamEvents(
  teamId: string | undefined,
  options?: {
    startDate?: string;
    endDate?: string;
    enabled?: boolean;
  }
) {
  const { startDate, endDate, enabled = true } = options || {};

  // Default to current date if not provided
  const defaultStart = startDate || new Date().toISOString();
  // Default to 30 days from now if not provided
  const defaultEnd = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  return useQuery<TeamEventsResponse>({
    queryKey: ["team-events", teamId, defaultStart, defaultEnd],
    queryFn: async () => {
      if (!teamId) throw new Error("Team ID is required");
      
      const params = new URLSearchParams({
        startDate: defaultStart,
        endDate: defaultEnd,
      });
      
      const response = await fetchApi(`/calendar/team/${teamId}/events?${params}`);
      return response;
    },
    enabled: !!teamId && enabled,
    staleTime: 1000 * 60 * 2, // 2 minutes - events don't change that often
    retry: 2, // Retry failed requests twice
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

