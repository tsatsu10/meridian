// @epic-3.4-teams: Enhanced team calendar with comprehensive features
// @epic-1.2-gantt: Timeline and dependency visualization
// @persona-david: Team Lead workload management and analytics
// @persona-sarah: PM sprint planning with smart suggestions
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGetTeamEvents } from "@/hooks/queries/team/use-get-team-events";
import type { CalendarEvent as APICalendarEvent } from "@/hooks/queries/team/use-get-team-events";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Calendar, 
  Users, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Target,
  Coffee,
  Video,
  Briefcase,
  BarChart3,
  Zap,
  Download,
  Grid3x3,
  List,
  TrendingUp,
  Lightbulb,
  Plus,
  Info,
  Clock,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/cn";
import { format } from 'date-fns';
import { toast } from 'sonner';
import { WorkloadHeatmap } from '@/components/schedule/workload-heatmap';
import { TimelineView } from '@/components/schedule/timeline-view';
import DayView from '@/components/schedule/day-view';
import WeekView from '@/components/schedule/week-view';
import { useScheduleConflicts } from '@/hooks/use-schedule-conflicts';
import { useSmartScheduling } from '@/hooks/use-smart-scheduling';
import { useScheduleDragDrop } from '@/hooks/use-schedule-drag-drop';
import { useScheduleRealtime } from '@/hooks/use-schedule-realtime';
import useAuth from '@/components/providers/auth-provider/hooks/use-auth';
import useWorkspaceStore from '@/store/workspace';
import type { CalendarEvent, MemberSchedule, CalendarViewMode, TimelineEntry } from '@/types/schedule';
import CreateEventModal from './create-event-modal';
import EventDetailsModal from './event-details-modal';
import EditEventModal from './edit-event-modal';

// Event type icon mapping
const eventTypeIcons = {
  meeting: Video,
  deadline: AlertCircle,
  'time-off': Coffee,
  workload: Briefcase,
  milestone: Target,
  'focus-time': Clock,
  break: Coffee,
  other: Calendar
} as const;

interface TeamCalendarModalProps {
  open: boolean;
  onClose: () => void;
  team?: Team | null;
  allTeams?: Team[];
}

interface Team {
  id: string;
  name: string;
  description: string;
  members: any[];
  lead: string;
  projectId: string;
  projectName: string;
  performance: number;
  workload: number;
  projects: number;
  color: string;
}


const priorityColors = {
  low: "border-gray-300 bg-gray-50",
  medium: "border-yellow-300 bg-yellow-50",
  high: "border-red-300 bg-red-50",
  critical: "border-red-500 bg-red-100"
};

// Helper function to convert CalendarEvents to TimelineEntries
function convertEventsToTimeline(events: CalendarEvent[]): TimelineEntry[] {
  return events.map(event => ({
    id: event.id,
    title: event.title,
    startDate: event.startDate,
    endDate: event.endDate,
    progress: 0,
    dependencies: [],
    assignees: event.attendees?.slice(0, 3) || [],
    color: '#3b82f6',
    type: event.type === 'milestone' ? 'milestone' : 'task',
    canDrag: true,
    canResize: true
  }));
}

export default function TeamCalendarModal({ 
  open, 
  onClose, 
  team: selectedTeam = null,
  allTeams = []
}: TeamCalendarModalProps) {
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [team, setTeam] = useState<Team | null>(selectedTeam);
  const [showConflicts, setShowConflicts] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false);
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Get auth and workspace context
  const { user } = useAuth();
  const { workspace } = useWorkspaceStore();

  // Calculate date range based on view mode and current date
  const { startDate, endDate } = useMemo(() => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    switch (viewMode) {
      case "day":
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case "week":
        const dayOfWeek = currentDate.getDay();
        start.setDate(currentDate.getDate() - dayOfWeek);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      case "month":
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
        break;
      case "timeline":
      case "agenda":
      case "heatmap":
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() + 1);
        end.setHours(23, 59, 59, 999);
        break;
    }

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  }, [currentDate, viewMode]);

  // Fetch team events from API
  const { 
    data: eventsData, 
    isLoading: isLoadingEvents,
    error: eventsError 
  } = useGetTeamEvents(team?.id, { 
    startDate, 
    endDate, 
    enabled: open && !!team?.id 
  });

  // Transform API events to component format
  const events: CalendarEvent[] = useMemo(() => {
    if (!eventsData?.events) return [];
    
    return eventsData.events.map((event: APICalendarEvent) => ({
      id: event.id,
      title: event.title,
      type: event.type,
      date: event.date,
      startDate: new Date(event.startTime || event.date),
      endDate: new Date(event.endTime || event.endDate || event.date),
      startTime: event.startTime || event.date, // API now provides this directly
      endTime: event.endTime || event.endDate || event.date, // API now provides this directly
      priority: event.priority || 'medium',
      color: event.color || '#3b82f6',
      attendees: event.memberId ? [event.memberId] : (event.attendees || []),
      description: event.description,
      source: event.source, // Important: preserve source field for click handling
      location: event.location,
      meetingLink: event.meetingLink,
      status: event.status,
      allDay: event.allDay,
      createdBy: event.createdBy,
    }));
  }, [eventsData]);

  // Update team when selectedTeam prop changes
  useEffect(() => {
    if (selectedTeam) {
      setTeam(selectedTeam);
    } else if (allTeams.length > 0) {
      setTeam(allTeams[0]);
    }
  }, [selectedTeam, allTeams]);
  
  // Convert team members to MemberSchedule format
  const memberSchedules: MemberSchedule[] = useMemo(() => {
    if (!team) return [];
    
    return team.members.map(member => ({
      memberId: member.id,
      memberName: member.name,
      memberEmail: member.email,
      role: member.role,
      avatar: member.avatar,
      availability: member.availability || 'available',
      status: member.status || 'offline',
      currentActivity: member.currentActivity,
      workload: member.workload || 0,
      hoursScheduled: member.hoursScheduled || 0,
      hoursAvailable: 40,
      tasksCount: member.currentTasks || 0,
      events: events.filter(e => e.attendees.includes(member.id)),
      blockedSlots: [],
      availableSlots: [],
      workingHours: {
        monday: { start: '09:00', end: '17:00', enabled: true },
        tuesday: { start: '09:00', end: '17:00', enabled: true },
        wednesday: { start: '09:00', end: '17:00', enabled: true },
        thursday: { start: '09:00', end: '17:00', enabled: true },
        friday: { start: '09:00', end: '17:00', enabled: true },
        saturday: { start: '09:00', end: '17:00', enabled: false },
        sunday: { start: '09:00', end: '17:00', enabled: false }
      }
    }));
  }, [team, events]);
  
  // Use schedule conflict detection
  const { conflicts, conflictStats, hasConflicts } = useScheduleConflicts({
    events,
    memberSchedules,
    autoDetect: showConflicts
  });
  
  // Use smart scheduling suggestions
  const { suggestions, suggestionStats } = useSmartScheduling({
    events,
    memberSchedules,
    teamSize: team?.members.length || 0
  });
  
  // Use drag-drop scheduling
  const {
    dragContext: _dragContext,
    isDragging: _isDragging,
    startDrag: _startDrag,
    updateDragTarget: _updateDragTarget,
    completeDrag: _completeDrag,
    cancelDrag: _cancelDrag
  } = useScheduleDragDrop({
    events,
    memberSchedules,
    onEventMove: (_eventId, _newDate, _newMember) => {
      toast.success('Event rescheduled successfully');
      // Broadcast real-time update
      if (team?.id && workspace?.id && user?.id) {
        broadcastEventChange('event-moved', _eventId);
      }
    },
    onEventResize: (_eventId, _newStartDate, _newEndDate) => {
      toast.success('Event duration updated');
      // Broadcast real-time update
      if (team?.id && workspace?.id && user?.id) {
        broadcastEventChange('event-updated', _eventId);
      }
    }
  });
  
  // Use real-time collaboration
  const {
    isConnected: isRealtimeConnected,
    activeUsers: _activeUsers,
    otherActiveUsers,
    recentUpdates: _recentUpdates,
    broadcastActivity: _broadcastActivity,
    broadcastEventChange,
    lockEvent: _lockEvent,
    unlockEvent: _unlockEvent,
    isEventLocked: _isEventLocked,
    stats: _realtimeStats
  } = useScheduleRealtime({
    teamId: team?.id || '',
    workspaceId: workspace?.id || '',
    currentUserId: user?.id || '',
    onEventUpdate: (update) => {
      // Refresh events when other users make changes
      toast.info('Schedule updated', {
        description: `${update.type.replace('-', ' ')} by another user`
      });
    },
    onUserActivity: (_users) => {
      // Handle user activity updates
    }
  });
  
  // Broadcast activity when viewing different dates
  useEffect(() => {
    if (team?.id && workspace?.id && user?.id && isRealtimeConnected) {
      _broadcastActivity(currentDate);
    }
  }, [currentDate, team?.id, workspace?.id, user?.id, isRealtimeConnected, _broadcastActivity]);

  const handleTeamSelect = (teamId: string) => {
    const selectedTeam = allTeams.find(t => t.id === teamId);
    if (selectedTeam) {
      setTeam(selectedTeam);
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const formatDateHeader = () => {
    const options: Intl.DateTimeFormatOptions = viewMode === 'month' 
      ? { month: 'long', year: 'numeric' }
      : viewMode === 'week'
      ? { month: 'short', day: 'numeric', year: 'numeric' }
      : { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
    
    return currentDate.toLocaleDateString('en-US', options);
  };

  const getEventsForTeam = () => {
    if (!team) return events;
    
    // Filter events for selected team members
    return events.filter(event => {
      // Show events that have no attendees or empty attendees array
      if (!event.attendees || event.attendees.length === 0) {
        return true;
      }
      
      // For events with attendees, check if any match team members
      return event.attendees.some(attendee => 
        team.members.find(member => member.id === attendee || member.name === attendee)
      );
    });
  };

  const renderCalendarView = () => {
    const teamEvents = getEventsForTeam();
    
    if (viewMode === 'agenda') {
      // Group events by date
      const groupedEvents = teamEvents.reduce((groups: Record<string, typeof teamEvents>, event) => {
        const dateKey = format(new Date(event.startDate), 'yyyy-MM-dd');
        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push(event);
        return groups;
      }, {});

      const sortedDates = Object.keys(groupedEvents).sort();

      return (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-xl">Upcoming Events</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {teamEvents.length} {teamEvents.length === 1 ? 'event' : 'events'} scheduled
              </p>
            </div>
            <Badge variant="secondary" className="px-3 py-1">
              {sortedDates.length} {sortedDates.length === 1 ? 'day' : 'days'}
            </Badge>
          </div>

          {/* Events by date */}
          {sortedDates.map((dateKey) => {
            const events = groupedEvents[dateKey];
            const eventDate = new Date(dateKey);
            const isToday = format(eventDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

            return (
              <div key={dateKey} className="space-y-3">
                {/* Date header */}
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    "px-3 py-1 rounded-full text-sm font-medium",
                    isToday ? "bg-blue-500 text-white" : "bg-muted"
                  )}>
                    {isToday ? 'Today' : format(eventDate, 'EEEE')}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(eventDate, 'MMMM d, yyyy')}
                  </div>
                  <div className="flex-1 h-px bg-border" />
                  <Badge variant="outline" className="text-xs">
                    {events.length}
                  </Badge>
                </div>

                {/* Events */}
                <div className="space-y-2 pl-2">
                  {events.map((event) => {
                    const EventIcon = eventTypeIcons[event.type as keyof typeof eventTypeIcons] || Calendar;
                    const isCalendarEvent = event.source === 'calendar';
                    
                    return (
                      <div
                        key={event.id}
                        className={cn(
                          "group relative p-4 rounded-lg border-l-4 transition-all",
                          "bg-card hover:shadow-md",
                          event.priority === 'high' ? 'border-l-red-500' :
                          event.priority === 'medium' ? 'border-l-yellow-500' :
                          'border-l-blue-500',
                          isCalendarEvent && "cursor-pointer hover:scale-[1.01]"
                        )}
                        onClick={() => isCalendarEvent && handleEventClick(event.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            event.priority === 'high' ? 'bg-red-100 text-red-600 dark:bg-red-950' :
                            event.priority === 'medium' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-950' :
                            'bg-blue-100 text-blue-600 dark:bg-blue-950'
                          )}>
                            <EventIcon className="h-5 w-5" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <h4 className="font-semibold">{event.title}</h4>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5" />
                                    {format(new Date(event.startDate), 'h:mm a')}
                                  </span>
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {event.type.replace('-', ' ')}
                                  </Badge>
                                </div>
                                {event.description && (
                                  <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
                                    {event.description}
                                  </p>
                                )}
                              </div>
                              <Badge className={cn(
                                "capitalize",
                                event.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-950' :
                                event.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950' :
                                'bg-gray-100 text-gray-700 dark:bg-gray-800'
                              )}>
                                {event.priority}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Empty state */}
          {teamEvents.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-medium mb-2">No upcoming events</h3>
              <p className="text-sm text-muted-foreground">
                Create your first event to get started
              </p>
            </div>
          )}
        </div>
      );
    }

    // Month view (simplified grid)
    return (
      <div className="space-y-4">
        {/* Calendar Grid */}
        <div className="border rounded-lg overflow-hidden">
          {/* Days of week header */}
          <div className="grid grid-cols-7 bg-muted/50 border-b">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="p-3 text-center text-sm font-medium">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar dates */}
          <div className="grid grid-cols-7">
            {Array.from({ length: 35 }, (_, index) => {
              const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), index - 6);
              const isCurrentMonth = date.getMonth() === currentDate.getMonth();
              const isToday = date.toDateString() === new Date().toDateString();
              const dayEvents = teamEvents.filter(event => {
                const eventDate = new Date(event.startDate);
                return eventDate.toISOString().split('T')[0] === date.toISOString().split('T')[0];
              });
              
              return (
                <div
                  key={index}
                  className={cn(
                    "min-h-[80px] p-2 border-r border-b relative",
                    !isCurrentMonth && "bg-muted/30 text-muted-foreground",
                    isToday && "bg-blue-50 dark:bg-blue-900/20"
                  )}
                >
                  <div className={cn(
                    "text-sm",
                    isToday && "font-bold text-blue-600"
                  )}>
                    {date.getDate()}
                  </div>
                  <div className="space-y-1 mt-1">
                    {dayEvents.slice(0, 2).map((event) => {
                      const isCalendarEvent = event.source === 'calendar';
                      return (
                        <div
                          key={event.id}
                          className={cn(
                            "text-xs p-1 rounded truncate",
                            event.color,
                            "text-white",
                            isCalendarEvent && "cursor-pointer hover:opacity-80"
                          )}
                          title={event.title}
                          onClick={(e) => {
                            if (isCalendarEvent) {
                              e.stopPropagation();
                              handleEventClick(event.id);
                            }
                          }}
                        >
                          {event.title}
                        </div>
                      );
                    })}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Quick actions
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);
  const [integrationAction, setIntegrationAction] = useState<'google' | 'outlook' | 'export' | null>(null);

  const handleScheduleMeeting = () => {
    setShowCreateEventModal(true);
  };

  const handleCreateEvent = (eventData: any) => {
    // Event creation is now handled by the CreateEventModal component
    // This handler is called after successful creation for any additional logic
    setShowCreateEventModal(false);
  };

  const handleEventClick = (eventId: string) => {
    setSelectedEventId(eventId);
    setShowEventDetailsModal(true);
  };

  const handleEditEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    setShowEditEventModal(true);
    setShowEventDetailsModal(false);
  };
  
  const handleFindBestTime = () => {
    if (suggestions.length > 0 && suggestions[0].type === 'best-time') {
      toast.success(`Best time: ${suggestions[0].suggestedTime} on ${format(suggestions[0].suggestedDate!, 'MMM d')}`);
    } else {
      toast.info('No optimal time found. Try adjusting filters.');
    }
  };
  
  const handleExportCalendar = () => {
    setIntegrationAction('export');
    setShowIntegrationModal(true);
  };
  
  const handleSyncGoogle = () => {
    setIntegrationAction('google');
    setShowIntegrationModal(true);
  };

  const handleIntegrationConfirm = () => {
    if (integrationAction === 'export') {
      // Generate ICS file
      const icsContent = generateICSFile(getEventsForTeam());
      const blob = new Blob([icsContent], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${team?.name || 'team'}-calendar.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Calendar exported successfully');
    } else if (integrationAction === 'google') {
      // Redirect to Google OAuth
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!clientId) {
        toast.error('Google Calendar integration not configured. Please contact your administrator.');
        return;
      }
      const redirectUri = `${window.location.origin}/auth/google/callback`;
      const scope = 'https://www.googleapis.com/auth/calendar';
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline`;
      window.location.href = authUrl;
    } else if (integrationAction === 'outlook') {
      // Redirect to Microsoft OAuth
      const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID;
      if (!clientId) {
        toast.error('Outlook Calendar integration not configured. Please contact your administrator.');
        return;
      }
      const redirectUri = `${window.location.origin}/auth/microsoft/callback`;
      const scope = 'Calendars.ReadWrite offline_access';
      const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
      window.location.href = authUrl;
    }
    setShowIntegrationModal(false);
  };

  const generateICSFile = (events: CalendarEvent[]): string => {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Meridian//Team Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    events.forEach(event => {
      const startDate = event.startDate;
      const endDate = event.endDate;
      
      lines.push(
        'BEGIN:VEVENT',
        `UID:${event.id}@meridian.app`,
        `DTSTAMP:${formatICSDate(new Date())}`,
        `DTSTART:${formatICSDate(startDate)}`,
        `DTEND:${formatICSDate(endDate)}`,
        `SUMMARY:${event.title}`,
        event.description ? `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}` : '',
        event.location ? `LOCATION:${event.location}` : '',
        `STATUS:${event.type === 'deadline' ? 'NEEDS-ACTION' : 'CONFIRMED'}`,
        'END:VEVENT'
      );
    });

    lines.push('END:VCALENDAR');
    return lines.filter(line => line).join('\r\n');
  };

  const formatICSDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[98vw] sm:w-[98vw] max-h-[98vh] overflow-hidden flex flex-col p-0 gap-0 bg-gradient-to-br from-background via-background to-muted/20">
        <div className="relative flex-1 flex flex-col overflow-hidden">
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
          
          {/* Header Section with Gradient */}
          <div className="relative border-b bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 animate-pulse" />
            
            <div className="relative p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                      <Calendar className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <DialogTitle className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400">
                        Team Schedule
                      </DialogTitle>
                      <DialogDescription className="text-sm mt-1">
                        AI-powered scheduling with real-time collaboration
                      </DialogDescription>
                </div>
                
                    {hasConflicts && (
                      <Badge variant="outline" className="ml-4 shadow-lg animate-pulse border-red-500 bg-red-50 text-red-700">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {conflictStats.total} Conflicts
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Team Selector with Modern Design */}
                {allTeams.length > 0 && (
                    <div className="relative">
                    <select
                      value={team?.id || ""}
                      onChange={(e) => handleTeamSelect(e.target.value)}
                        className="appearance-none px-4 py-2 pr-10 border border-input/50 bg-background/80 backdrop-blur-sm rounded-lg text-sm font-medium min-w-[200px] shadow-sm hover:shadow-md transition-all cursor-pointer focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">All Teams</option>
                      {allTeams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                      <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none rotate-90" />
                  </div>
                )}
                  
                  {/* Quick Action Button */}
                  <Button 
                    onClick={handleScheduleMeeting}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Event
                  </Button>
                </div>
              </div>
              
              {/* Stats Bar */}
              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                <div className="flex items-center gap-4">
            {team && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                      <Users className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                        {team.members.length} Members
                      </span>
                </div>
                  )}
                  {events.length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20">
                      <Calendar className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                      <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                        {events.length} Events
                      </span>
                    </div>
                  )}
                  {suggestionStats.total > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                      <Zap className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                        {suggestionStats.total} AI Insights
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Real-time presence indicator */}
                {isRealtimeConnected && otherActiveUsers.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                    <div className="flex -space-x-2">
                      {otherActiveUsers.slice(0, 3).map((activeUser) => (
                        <div
                          key={activeUser.userId}
                          className="w-6 h-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 border-2 border-background flex items-center justify-center text-white text-xs font-semibold shadow-sm hover:scale-110 transition-transform"
                          title={`${activeUser.userName} is viewing`}
                        >
                          {activeUser.userName.charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {otherActiveUsers.length > 3 && (
                        <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                          +{otherActiveUsers.length - 3}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-xs font-medium text-green-700 dark:text-green-300">
                        {otherActiveUsers.length} Online
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-auto p-6 space-y-4">
            {/* Loading State */}
            {isLoadingEvents ? (
              <div className="flex items-center justify-center h-[600px]">
                <div className="text-center space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                  <div>
                    <p className="font-medium text-lg">Loading team schedule...</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Fetching tasks, milestones, and deadlines
                    </p>
                  </div>
                </div>
              </div>
            ) : eventsError ? (
              /* Error State */
              <div className="flex items-center justify-center h-[600px]">
                <div className="text-center space-y-4">
                  <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
                  <div>
                    <p className="font-medium text-lg">Failed to load schedule</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {eventsError instanceof Error ? eventsError.message : 'An error occurred while loading events'}
                    </p>
                  </div>
                  <Button onClick={() => window.location.reload()} variant="outline">
                    Retry
                  </Button>
                </div>
              </div>
            ) : (
              /* Calendar Content - Always Show */
              <>
            {/* Smart Suggestions Panel - Modern Card Design */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
                <div className="relative bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-background border border-blue-500/20 rounded-xl p-5 shadow-lg backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 shadow-md">
                        <Lightbulb className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">AI-Powered Insights</h3>
                        <p className="text-xs text-muted-foreground">
                          Smart recommendations to optimize your schedule
                  </p>
                </div>
                      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                        {suggestionStats.total} Insights
                      </Badge>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowSuggestions(false)}
                      className="hover:bg-white/10"
                    >
                      Dismiss
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {suggestions.slice(0, 4).map((suggestion) => (
                      <div
                        key={suggestion.id}
                        className="group/card relative p-4 bg-background/80 backdrop-blur-sm rounded-lg border border-border/50 hover:border-primary/50 transition-all hover:shadow-md"
                      >
                        <div className="absolute top-2 right-2">
                          <Badge
                            variant={suggestion.priority === 'high' ? 'outline' : 'secondary'}
                            className={cn(
                              "text-xs shadow-sm",
                              suggestion.priority === 'high' && "border-red-500 bg-red-50 text-red-700"
                            )}
                          >
                            {suggestion.confidence}% confident
                          </Badge>
                        </div>
                        <div className="pr-24">
                          <div className="flex items-start gap-2 mb-2">
                            <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 animate-pulse" />
                            <div className="font-semibold text-sm">{suggestion.title}</div>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {suggestion.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Conflicts Panel - Modern Alert Design */}
            {hasConflicts && showConflicts && (
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 via-orange-500/20 to-red-500/20 rounded-xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
                <div className="relative bg-gradient-to-br from-red-500/10 to-background border border-red-500/30 rounded-xl p-5 shadow-lg backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-orange-600 shadow-md animate-pulse">
                        <AlertCircle className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-red-700 dark:text-red-400">Schedule Conflicts Detected</h3>
                        <p className="text-xs text-muted-foreground">
                          Review and resolve conflicts to optimize your schedule
                        </p>
                      </div>
                      <Badge variant="outline" className="shadow-sm border-red-500 bg-red-50 text-red-700">
                        {conflictStats.total} Issues
                      </Badge>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowConflicts(false)}
                      className="hover:bg-white/10"
                    >
                      Hide
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {conflicts.slice(0, 3).map((conflict) => (
                      <div
                        key={conflict.id}
                        className="group/conflict p-4 bg-background/80 backdrop-blur-sm rounded-lg border border-red-500/20 hover:border-red-500/40 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={conflict.severity === 'high' ? 'outline' : 'secondary'}
                                className={cn(
                                  "text-xs uppercase",
                                  conflict.severity === 'high' && "border-red-500 bg-red-50 text-red-700"
                                )}
                              >
                                {conflict.type}
                              </Badge>
                              <span className="text-sm font-semibold">{conflict.description}</span>
                            </div>
                            {conflict.suggestedResolutions.length > 0 && (
                              <div className="flex items-start gap-2 p-2 rounded-md bg-blue-500/10 border border-blue-500/20">
                                <Lightbulb className="h-3.5 w-3.5 text-blue-600 mt-0.5" />
                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                  {conflict.suggestedResolutions[0].description}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Quick Actions Bar - Modern Floating Design */}
            <div className="sticky top-0 z-10">
              <div className="bg-background/95 backdrop-blur-md border border-border/50 rounded-xl p-4 shadow-lg">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                      size="sm" 
                      onClick={handleScheduleMeeting}
                      className="shadow-sm hover:shadow-md transition-all"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Event
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleFindBestTime}
                      className="shadow-sm hover:shadow-md transition-all border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/10"
                    >
                      <Zap className="h-4 w-4 mr-2 text-amber-600" />
                      AI Best Time
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleExportCalendar}
                      className="shadow-sm hover:shadow-md transition-all"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleSyncGoogle}
                      className="shadow-sm hover:shadow-md transition-all"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Sync
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
                      <Button
                        variant="ghost"
                    size="sm"
                    onClick={() => navigateDate('prev')}
                        className="h-8 w-8 p-0 hover:bg-background"
                  >
                        <ChevronLeft className="h-4 w-4" />
                  </Button>
                      <div className="px-3 py-1 text-sm font-semibold min-w-[160px] text-center">
                    {formatDateHeader()}
                  </div>
                  <Button
                        variant="ghost"
                    size="sm"
                    onClick={() => navigateDate('next')}
                        className="h-8 w-8 p-0 hover:bg-background"
                  >
                        <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                      className="shadow-sm hover:shadow-md transition-all bg-primary/10 border-primary/20 hover:bg-primary/20"
                >
                  Today
                </Button>
                  </div>
                </div>
              </div>
              </div>

            {/* Tabbed View System - Modern Design */}
            <div className="bg-background/60 backdrop-blur-sm border border-border/50 rounded-xl p-4 shadow-lg">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as CalendarViewMode)} className="flex flex-col">
                <TabsList className="grid w-full grid-cols-6 bg-muted/50 p-1 rounded-lg h-auto gap-1">
                  <TabsTrigger 
                    value="day" 
                    className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-md rounded-md transition-all px-3 py-2"
                  >
                    <List className="h-4 w-4" />
                    <span className="hidden sm:inline">Day</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="week" 
                    className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-md rounded-md transition-all px-3 py-2"
                  >
                    <Grid3x3 className="h-4 w-4" />
                    <span className="hidden sm:inline">Week</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="month" 
                    className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-md rounded-md transition-all px-3 py-2"
                  >
                    <Calendar className="h-4 w-4" />
                    <span className="hidden sm:inline">Month</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="timeline" 
                    className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-md rounded-md transition-all px-3 py-2"
                  >
                    <TrendingUp className="h-4 w-4" />
                    <span className="hidden sm:inline">Timeline</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="heatmap" 
                    className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-md rounded-md transition-all px-3 py-2"
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span className="hidden sm:inline">Heatmap</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="agenda" 
                    className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-md rounded-md transition-all px-3 py-2"
                  >
                    <List className="h-4 w-4" />
                    <span className="hidden sm:inline">Agenda</span>
                  </TabsTrigger>
                </TabsList>
                
                <div className="mt-6 min-h-[500px]">
                  <TabsContent value="day" className="mt-0 h-[500px]">
                    {team ? (
                      <DayView
                        events={getEventsForTeam()}
                        currentDate={currentDate}
                        onEventClick={(event) => {
                          if (event.source === 'calendar') {
                            handleEventClick(event.id);
                          } else {
                            toast.info(`${event.type}: ${event.title}`);
                          }
                        }}
                        className="bg-background/80 backdrop-blur-sm rounded-lg border border-border/50"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 space-y-4">
                        <div className="p-4 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                          <List className="h-8 w-8 text-blue-600" />
              </div>
                        <div className="text-center space-y-2">
                          <h3 className="text-lg font-semibold">Select a Team</h3>
                          <p className="text-sm text-muted-foreground max-w-md">
                            Choose a team to view their daily schedule
                          </p>
            </div>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="week" className="mt-0 h-[500px]">
                    {team ? (
                      <WeekView
                        events={getEventsForTeam()}
                        currentDate={currentDate}
                        onEventClick={(event) => {
                          if (event.source === 'calendar') {
                            handleEventClick(event.id);
                          } else {
                            toast.info(`${event.type}: ${event.title}`);
                          }
                        }}
                        className="bg-background/80 backdrop-blur-sm rounded-lg border border-border/50"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 space-y-4">
                        <div className="p-4 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                          <Grid3x3 className="h-8 w-8 text-purple-600" />
                        </div>
                        <div className="text-center space-y-2">
                          <h3 className="text-lg font-semibold">Select a Team</h3>
                          <p className="text-sm text-muted-foreground max-w-md">
                            Choose a team to view their weekly schedule
                          </p>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="month" className="mt-0">
                    <div className="bg-background/80 backdrop-blur-sm rounded-lg border border-border/50 p-4">
              {renderCalendarView()}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="timeline" className="mt-0">
                    {team ? (
                      <TimelineView
                        entries={convertEventsToTimeline(events)}
                        onEntryClick={(entry) => toast.info(`Clicked: ${entry.title}`)}
                        className="bg-background/80 backdrop-blur-sm"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 space-y-4">
                        <div className="p-4 rounded-full bg-gradient-to-br from-blue-500/20 to-green-500/20">
                          <TrendingUp className="h-8 w-8 text-blue-600" />
                        </div>
                        <div className="text-center space-y-2">
                          <h3 className="text-lg font-semibold">Select a Team</h3>
                          <p className="text-sm text-muted-foreground max-w-md">
                            Choose a team to view their project timeline
                          </p>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="heatmap" className="mt-0">
                    {team ? (
                      <WorkloadHeatmap
                        memberSchedules={memberSchedules}
                        weeks={4}
                        onCellClick={(date, member) => {
                          toast.info(`${member.memberName} on ${format(date, 'MMM d')}`);
                        }}
                        className="bg-background/80 backdrop-blur-sm"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 space-y-4">
                        <div className="p-4 rounded-full bg-gradient-to-br from-orange-500/20 to-red-500/20">
                          <BarChart3 className="h-8 w-8 text-orange-600" />
                        </div>
                        <div className="text-center space-y-2">
                          <h3 className="text-lg font-semibold">Select a Team</h3>
                          <p className="text-sm text-muted-foreground max-w-md">
                            Choose a team to view their workload distribution
                          </p>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="agenda" className="mt-0">
                    <div className="bg-background/80 backdrop-blur-sm rounded-lg border border-border/50 p-4">
                      {renderCalendarView()}
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>

            {/* Project Timeline Integration */}
            {team && (() => {
              const teamEvents = getEventsForTeam();
              
              return (
                <div className="mt-6 space-y-4">
                  <h3 className="font-medium text-lg">Project Timeline Impact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Critical Path Events */}
                    <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                      <h4 className="font-medium mb-3 flex items-center space-x-2">
                        <Target className="h-4 w-4 text-red-500" />
                        <span>Critical Path Events</span>
                      </h4>
                      <div className="space-y-2">
                        {teamEvents.filter((e: CalendarEvent) => e.priority === 'critical').slice(0, 3).map((event: CalendarEvent) => (
                          <div key={event.id} className="flex items-center justify-between text-sm">
                            <span className="truncate">{event.title}</span>
                            <Badge variant="secondary" className="text-xs bg-red-100 text-red-800">
                              {new Date(event.startDate).toLocaleDateString()}
                            </Badge>
                          </div>
                        ))}
                        {teamEvents.filter((e: CalendarEvent) => e.priority === 'critical').length === 0 && (
                          <p className="text-sm text-muted-foreground">No critical events</p>
                        )}
                      </div>
                    </div>

                    {/* Capacity Warnings */}
                    <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                      <h4 className="font-medium mb-3 flex items-center space-x-2">
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                        <span>Capacity Warnings</span>
                      </h4>
                      <div className="space-y-2">
                        {team.members.filter((m: any) => m.workload > 85).map((member: any) => (
                          <div key={member.id} className="flex items-center justify-between text-sm">
                            <span>{member.name}</span>
                            <Badge variant="secondary" className={cn(
                              "text-xs",
                              member.workload > 95 ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"
                            )}>
                              {member.workload}% load
                            </Badge>
                          </div>
                        ))}
                        {team.members.filter((m: any) => m.workload > 85).length === 0 && (
                          <p className="text-sm text-muted-foreground">All members within capacity</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Workload Forecast */}
                  <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                    <h4 className="font-medium mb-3 flex items-center space-x-2">
                      <BarChart3 className="h-4 w-4 text-blue-500" />
                      <span>30-Day Workload Forecast</span>
                    </h4>
                    
                    {/* Simple workload visualization */}
                    <div className="space-y-3">
                      {Array.from({ length: 4 }, (_, week) => {
                        const weekStart = new Date();
                        weekStart.setDate(weekStart.getDate() + (week * 7));
                        const weekEnd = new Date(weekStart);
                        weekEnd.setDate(weekEnd.getDate() + 6);
                        
                        const weekEvents = teamEvents.filter((event: CalendarEvent) => {
                          const eventDate = new Date(event.startDate);
                          return eventDate >= weekStart && eventDate <= weekEnd;
                        });
                        
                        const estimatedHours = weekEvents.reduce(
                          (total: number, event: CalendarEvent) => total + (event.estimatedHours || 0), 0
                        );
                        const workloadPercentage = Math.min((estimatedHours / 40) * 100, 100);
                        
                        return (
                          <div key={week} className="flex items-center space-x-3">
                            <div className="text-sm font-medium w-16">
                              Week {week + 1}
                            </div>
                            <div className="flex-1 bg-secondary rounded-full h-3">
                              <div 
                                className={cn(
                                  "h-3 rounded-full transition-all",
                                  workloadPercentage > 90 ? "bg-red-500" :
                                  workloadPercentage > 75 ? "bg-yellow-500" : "bg-green-500"
                                )}
                                style={{ width: `${workloadPercentage}%` }}
                              />
                            </div>
                            <div className="text-sm text-muted-foreground w-16">
                              {Math.round(workloadPercentage)}%
                            </div>
                            <div className="text-xs text-muted-foreground w-20">
                              {weekEvents.length} events
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Team Availability Summary */}
            {team && (
              <div className="mt-6 space-y-4">
                <h3 className="font-medium text-lg">Team Availability</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {team.members.map((member) => (
                    <div
                      key={member.id}
                      className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg"
                    >
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium">{member.name.charAt(0)}</span>
                        </div>
                        <div>
                          <div className="font-medium text-sm">{member.name}</div>
                          <div className="text-xs text-muted-foreground">{member.role}</div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Workload:</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-secondary rounded-full h-2">
                              <div 
                                className={cn("h-2 rounded-full transition-all", 
                                  member.workload > 90 ? "bg-red-500" : 
                                  member.workload > 70 ? "bg-yellow-500" : "bg-green-500"
                                )}
                                style={{ width: `${member.workload}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium">{member.workload}%</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span>Status:</span>
                          <Badge 
                            className={cn("text-xs", 
                              member.status === 'online' ? "bg-green-100 text-green-800" :
                              member.status === 'busy' ? "bg-red-100 text-red-800" :
                              member.status === 'away' ? "bg-yellow-100 text-yellow-800" :
                              "bg-gray-100 text-gray-800"
                            )}
                          >
                            {member.status}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span>Tasks:</span>
                          <span className="text-xs">{member.currentTasks} active</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="mt-6 p-4 bg-muted/30 rounded-lg">
              <h4 className="font-medium mb-3">Event Types</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(eventTypeIcons).map(([type, IconComponent]) => (
                  <div key={type} className="flex items-center space-x-2">
                    <IconComponent className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm capitalize">{type.replace('-', ' ')}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
            </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Integration Confirmation Modal */}
    <Dialog open={showIntegrationModal} onOpenChange={setShowIntegrationModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {integrationAction === 'export' && 'Export Calendar'}
            {integrationAction === 'google' && 'Connect Google Calendar'}
            {integrationAction === 'outlook' && 'Connect Outlook Calendar'}
          </DialogTitle>
          <DialogDescription>
            {integrationAction === 'export' && 
              'Export your team calendar as an ICS file that can be imported into any calendar application.'
            }
            {integrationAction === 'google' && 
              'Connect your Google Calendar to automatically sync events between Meridian and Google Calendar.'
            }
            {integrationAction === 'outlook' && 
              'Connect your Outlook Calendar to automatically sync events between Meridian and Outlook.'
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {integrationAction === 'export' && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                The exported file will include:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>{getEventsForTeam().length} events from {team?.name}</li>
                <li>Event titles, dates, times, and locations</li>
                <li>Participant information</li>
              </ul>
            </div>
          )}
          
          {(integrationAction === 'google' || integrationAction === 'outlook') && (
            <div className="space-y-2">
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm flex items-start gap-2">
                  <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
                  <span>You will be redirected to {integrationAction === 'google' ? 'Google' : 'Microsoft'} to authorize access to your calendar.</span>
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Meridian will be able to:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Read your calendar events</li>
                <li>Create new events</li>
                <li>Update existing events</li>
                <li>Sync changes bidirectionally</li>
              </ul>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => setShowIntegrationModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleIntegrationConfirm}>
            {integrationAction === 'export' && 'Download ICS File'}
            {integrationAction === 'google' && 'Connect Google'}
            {integrationAction === 'outlook' && 'Connect Outlook'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Create Event Modal */}
    <CreateEventModal
      open={showCreateEventModal}
      onClose={() => setShowCreateEventModal(false)}
      onCreateEvent={handleCreateEvent}
      selectedTeam={team}
      selectedDate={currentDate}
    />

    {/* Event Details Modal */}
    {selectedEventId && (
      <EventDetailsModal
        open={showEventDetailsModal}
        onClose={() => {
          setShowEventDetailsModal(false);
          setSelectedEventId(null);
        }}
        eventId={selectedEventId}
        onEdit={handleEditEvent}
      />
    )}

    {/* Edit Event Modal */}
    {selectedEventId && (
      <EditEventModal
        open={showEditEventModal}
        onClose={() => {
          setShowEditEventModal(false);
          setSelectedEventId(null);
        }}
        eventId={selectedEventId}
      />
    )}
    </>
  );
} 