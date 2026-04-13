// @epic-1.2-projects: Global calendar view with cross-project task scheduling
// @persona-sarah: PM needs unified timeline across all projects  
// @persona-david: Team lead needs workload distribution across projects
// @persona-jennifer: Exec needs organization-wide deadline visibility
// @persona-mike: Dev needs personal schedule management
// @persona-lisa: Designer needs project deadline coordination

import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Avatar } from "@/components/ui/avatar";
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Filter,
  ChevronLeft,
  ChevronRight,
  Settings,
  Clock,
  Flag,
  Users,
  MoreVertical,
  Download,
  Share,
  Eye,
  AlertCircle,
  Target,
  CheckCircle2,
  PlayCircle,
  PauseCircle,
  FileText,
  Grid3X3,
  List,
  User,
  MapPin,
  MessageSquare,
  Video,
  Coffee,
  Focus,
  Search,
  X,
  ChevronDown,
  Zap,
  TrendingUp,
  BarChart3,
  Layers,
  Globe,
  Building,
  Calendar as Cal,
  Briefcase,
  Bell,
  RefreshCw,
  ExternalLink,
  Edit
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameDay, isSameMonth, isToday, parseISO, addDays, subDays, startOfDay, isBefore, isAfter, isWithinInterval, addHours } from "date-fns";
import LazyDashboardLayout from "@/components/performance/lazy-dashboard-layout";
import useAuth from "@/components/providers/auth-provider/hooks/use-auth";
import useWorkspaceStore from "@/store/workspace";

export const Route = createFileRoute("/dashboard/calendar")({
  component: GlobalCalendar,
});

// Types for global calendar events
interface GlobalCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'task' | 'milestone' | 'meeting' | 'deadline' | 'block' | 'personal';
  status: 'todo' | 'in_progress' | 'done' | 'overdue' | 'cancelled';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  assignee?: {
    id: string;
    name: string;
    avatar?: string;
  };
  project?: {
    id: string;
    name: string;
    color: string;
    workspace: string;
  };
  workspace?: {
    id: string;
    name: string;
  };
  description?: string;
  location?: string;
  participants?: string[];
  isAllDay?: boolean;
  color?: string;
  isRecurring?: boolean;
  category?: 'work' | 'meeting' | 'personal' | 'travel' | 'holiday';
  estimatedDuration?: number;
  actualDuration?: number;
  tags?: string[];
}

interface TeamAvailability {
  id: string;
  name: string;
  status: 'available' | 'busy' | 'away' | 'offline';
  currentTask?: string;
  nextMeeting?: Date;
  workload: number; // 0-100%
  timezone: string;
  workingHours: {
    start: string;
    end: string;
  };
}

type GlobalCalendarView = 'month' | 'week' | 'day' | 'agenda' | 'workload' | 'timeline';

// Event type colors for multi-workspace calendar
const eventTypeColors = {
  task: '#3B82F6',
  milestone: '#8B5CF6',  
  meeting: '#10B981',
  deadline: '#EF4444',
  block: '#6B7280',
  personal: '#F59E0B',
};

const statusColors = {
  'todo': '#94A3B8',
  'in_progress': '#3B82F6', 
  'done': '#10B981',
  'overdue': '#EF4444',
  'cancelled': '#6B7280',
};

const priorityColors = {
  'urgent': '#EF4444',
  'high': '#F59E0B',
  'medium': '#3B82F6',
  'low': '#6B7280',
};

const categoryColors = {
  'work': '#3B82F6',
  'meeting': '#10B981',
  'personal': '#F59E0B',
  'travel': '#8B5CF6',
  'holiday': '#EF4444',
};

function GlobalCalendar() {
  const { user } = useAuth();
  const { workspace } = useWorkspaceStore();
  
  // Calendar state management
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<GlobalCalendarView>('month');
  const [activeTab, setActiveTab] = useState('calendar');
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<GlobalCalendarEvent | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // Filter state
  const [filters, setFilters] = useState({
    workspaces: 'all',
    projects: 'all',
    type: 'all',
    status: 'all', 
    priority: 'all',
    category: 'all',
    assignee: 'all',
    showCompleted: true,
    showPersonal: true,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Mock data for demonstration - would be replaced with real API calls
  const globalEvents: GlobalCalendarEvent[] = useMemo(() => {
    const today = new Date();
    const tomorrow = addDays(today, 1);
    const nextWeek = addDays(today, 7);
    const nextMonth = addDays(today, 30);
    
    return [
      {
        id: '1',
        title: 'Product Launch Milestone',
        start: nextWeek,
        end: nextWeek,
        type: 'milestone',
        status: 'todo',
        priority: 'urgent',
        project: {
          id: 'proj1',
          name: 'Meridian Platform',
          color: '#3B82F6',
          workspace: 'main'
        },
        workspace: {
          id: 'ws1',
          name: 'Main Workspace'
        },
        description: 'Major product launch milestone',
        isAllDay: true,
        color: eventTypeColors.milestone,
        category: 'work',
        tags: ['launch', 'milestone', 'priority']
      },
      {
        id: '2',
        title: 'Team Standup',
        start: new Date(addDays(today, 1).getFullYear(), addDays(today, 1).getMonth(), addDays(today, 1).getDate(), 9, 0),
        end: new Date(addDays(today, 1).getFullYear(), addDays(today, 1).getMonth(), addDays(today, 1).getDate(), 9, 30),
        type: 'meeting',
        status: 'todo',
        priority: 'medium',
        location: 'Conference Room A',
        participants: ['team@meridian.app'],
        isAllDay: false,
        color: eventTypeColors.meeting,
        category: 'meeting',
        isRecurring: true,
        estimatedDuration: 30
      },
      {
        id: '3',
        title: 'UI/UX Design Review',
        start: new Date(addDays(today, 3).getFullYear(), addDays(today, 3).getMonth(), addDays(today, 3).getDate(), 14, 0),
        end: new Date(addDays(today, 3).getFullYear(), addDays(today, 3).getMonth(), addDays(today, 3).getDate(), 16, 0),
        type: 'task',
        status: 'in_progress',
        priority: 'high',
        assignee: {
          id: 'lisa',
          name: 'Lisa Chen'
        },
        project: {
          id: 'proj2',
          name: 'Design System',
          color: '#8B5CF6',
          workspace: 'design'
        },
        description: 'Review latest design iterations',
        isAllDay: false,
        color: eventTypeColors.task,
        category: 'work',
        estimatedDuration: 120
      },
      {
        id: '4',
        title: 'Client Presentation',
        start: new Date(addDays(today, 30).getFullYear(), addDays(today, 30).getMonth(), addDays(today, 30).getDate(), 10, 0),
        end: new Date(addDays(today, 30).getFullYear(), addDays(today, 30).getMonth(), addDays(today, 30).getDate(), 11, 30),
        type: 'meeting',
        status: 'todo',
        priority: 'urgent',
        location: 'Zoom Meeting',
        participants: ['client@company.com'],
        description: 'Present Q4 deliverables',
        isAllDay: false,
        color: eventTypeColors.meeting,
        category: 'meeting',
        estimatedDuration: 90
      },
      {
        id: '5',
        title: 'Personal Development Time',
        start: new Date(addDays(today, 5).getFullYear(), addDays(today, 5).getMonth(), addDays(today, 5).getDate(), 13, 0),
        end: new Date(addDays(today, 5).getFullYear(), addDays(today, 5).getMonth(), addDays(today, 5).getDate(), 17, 0),
        type: 'personal',
        status: 'todo',
        priority: 'low',
        description: 'Learning new technologies',
        isAllDay: false,
        color: eventTypeColors.personal,
        category: 'personal',
        estimatedDuration: 240
      }
    ];
  }, []);

  // Mock team availability data
  const teamAvailability: TeamAvailability[] = useMemo(() => [
    {
      id: '1',
      name: 'Sarah Johnson',
      status: 'busy',
      currentTask: 'Sprint Planning',
      nextMeeting: addDays(new Date(), 1),
      workload: 85,
      timezone: 'PST',
      workingHours: { start: '09:00', end: '17:00' }
    },
    {
      id: '2',
      name: 'David Kim',
      status: 'available',
      workload: 60,
      timezone: 'EST',
      workingHours: { start: '08:00', end: '16:00' }
    },
    {
      id: '3',
      name: 'Lisa Chen',
      status: 'busy',
      currentTask: 'Design Review',
      nextMeeting: addDays(new Date(), 2),
      workload: 75,
      timezone: 'PST',
      workingHours: { start: '10:00', end: '18:00' }
    },
    {
      id: '4',
      name: 'Mike Rodriguez',
      status: 'away',
      workload: 90,
      timezone: 'CST',
      workingHours: { start: '09:00', end: '17:00' }
    }
  ], []);

  // Apply filters to events
  const filteredEvents = useMemo(() => {
    return globalEvents.filter((event) => {
      // Text search
      if (searchQuery && !event.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Type filter
      if (filters.type !== 'all' && event.type !== filters.type) {
        return false;
      }

      // Status filter
      if (filters.status !== 'all' && event.status !== filters.status) {
        return false;
      }

      // Priority filter
      if (filters.priority !== 'all' && event.priority !== filters.priority) {
        return false;
      }

      // Category filter
      if (filters.category !== 'all' && event.category !== filters.category) {
        return false;
      }

      // Show completed filter
      if (!filters.showCompleted && event.status === 'done') {
        return false;
      }

      // Show personal filter
      if (!filters.showPersonal && event.type === 'personal') {
        return false;
      }

      return true;
    });
  }, [globalEvents, filters, searchQuery]);

  // Calendar navigation
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate(direction === 'next' ? addDays(currentDate, 7) : subDays(currentDate, 7));
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    setCurrentDate(direction === 'next' ? addDays(currentDate, 1) : subDays(currentDate, 1));
  };

  const handleNavigation = (direction: 'prev' | 'next') => {
    switch (calendarView) {
      case 'month':
        navigateMonth(direction);
        break;
      case 'week':
        navigateWeek(direction);
        break;
      case 'day':
        navigateDay(direction);
        break;
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Event handlers
  const handleEventClick = (event: GlobalCalendarEvent) => {
    setSelectedEvent(event);
    setIsEventModalOpen(true);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsCreateEventOpen(true);
  };

  // Filter handlers
  const clearFilters = () => {
    setFilters({
      workspaces: 'all',
      projects: 'all',
      type: 'all',
      status: 'all',
      priority: 'all',
      category: 'all',
      assignee: 'all',
      showCompleted: true,
      showPersonal: true,
    });
    setSearchQuery('');
    toast.success('Filters cleared');
  };

  const exportCalendar = () => {
    toast.info('Calendar export feature will be implemented soon');
  };

  const shareCalendar = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Calendar link copied to clipboard');
  };

  const syncExternalCalendar = () => {
    toast.info('External calendar sync will be implemented soon');
  };

  // Calendar statistics
  const calendarStats = useMemo(() => {
    const upcomingEvents = filteredEvents.filter(e => isAfter(e.start, new Date()));
    const overdueEvents = filteredEvents.filter(e => e.status === 'overdue');
    const todayEvents = filteredEvents.filter(e => isSameDay(e.start, new Date()));
    const thisWeekEvents = filteredEvents.filter(e => {
      const weekStart = startOfWeek(new Date());
      const weekEnd = endOfWeek(new Date());
      return e.start >= weekStart && e.start <= weekEnd;
    });

    return {
      total: filteredEvents.length,
      upcoming: upcomingEvents.length,
      overdue: overdueEvents.length,
      today: todayEvents.length,
      thisWeek: thisWeekEvents.length,
      completed: filteredEvents.filter(e => e.status === 'done').length
    };
  }, [filteredEvents]);

  // Week View Component
  // Calendar view components
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    
    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    
    return (
      <div className="flex flex-col h-full">
        {/* Month header */}
        <div className="grid grid-cols-7 border-b border-border">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground border-r border-border last:border-r-0">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="flex-1 grid grid-cols-7 auto-rows-fr">
          {calendarDays.map((day, index) => {
            const dayEvents = filteredEvents.filter(event => 
              isSameDay(event.start, day) || 
              (event.start <= day && event.end >= day)
            );
            
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isCurrentDay = isToday(day);
            
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "border-r border-b border-border last:border-r-0 p-1 cursor-pointer hover:bg-muted/50 transition-colors",
                  !isCurrentMonth && "bg-muted/20 text-muted-foreground"
                )}
                onClick={() => handleDateClick(day)}
              >
                <div className={cn(
                  "text-sm font-medium mb-1",
                  isCurrentDay && "text-primary font-bold"
                )}>
                  {format(day, 'd')}
                </div>
                
                <div className="space-y-1 max-h-20 overflow-hidden">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className="text-xs p-1 rounded truncate cursor-pointer hover:opacity-80"
                      style={{ backgroundColor: event.color + '20', color: event.color, borderLeft: `3px solid ${event.color}` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEventClick(event);
                      }}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const startWeek = startOfWeek(currentDate);
    const endWeek = endOfWeek(currentDate);
    const days = eachDayOfInterval({ start: startWeek, end: endWeek });
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    const weekEvents = filteredEvents.filter(event => 
      isWithinInterval(event.start, { start: startWeek, end: endWeek })
    );
    
    return (
      <div className="flex flex-col h-full">
        {/* Week Header */}
        <div className="grid grid-cols-8 border-b">
          <div className="p-2 text-center text-sm font-medium">Time</div>
          {days.map(day => (
            <div key={day.toISOString()} className="p-2 text-center border-l">
              <div className="text-sm font-medium">{format(day, 'EEE')}</div>
              <div className={cn(
                "text-lg",
                isSameDay(day, new Date()) && "bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto"
              )}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>
        
        {/* Week Grid */}
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-8 relative">
            {/* Time column */}
            <div className="border-r">
              {hours.map(hour => (
                <div key={hour} className="h-16 border-b p-1 text-xs text-muted-foreground">
                  {hour === 0 ? '12 AM' : hour <= 12 ? `${hour} AM` : `${hour - 12} PM`}
                </div>
              ))}
            </div>
            
            {/* Day columns */}
            {days.map(day => (
              <div key={day.toISOString()} className="border-r relative">
                {hours.map(hour => (
                  <div key={hour} className="h-16 border-b hover:bg-muted/50 cursor-pointer"
                       onClick={() => handleDateClick(new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour))} />
                ))}
                
                {/* Events for this day */}
                {weekEvents
                  .filter(event => isSameDay(event.start, day))
                  .map(event => (
                    <div
                      key={event.id}
                      className="absolute left-1 right-1 rounded px-1 py-0.5 text-xs cursor-pointer hover:opacity-80 z-10"
                      style={{
                        backgroundColor: event.color,
                        top: `${(event.start.getHours() + event.start.getMinutes() / 60) * 64}px`,
                        height: `${Math.max(1, (event.end.getTime() - event.start.getTime()) / (1000 * 60 * 60)) * 64}px`
                      }}
                      onClick={() => handleEventClick(event)}
                    >
                      <div className="font-medium truncate">{event.title}</div>
                      {event.location && <div className="truncate opacity-80">{event.location}</div>}
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Day View Component
  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayEvents = filteredEvents.filter(event => 
      isSameDay(event.start, currentDate)
    );
    
    return (
      <div className="flex flex-col h-full">
        {/* Day Header */}
        <div className="p-4 border-b bg-muted/30">
          <div className="text-center">
            <div className="text-2xl font-bold">{format(currentDate, 'd')}</div>
            <div className="text-sm text-muted-foreground">{format(currentDate, 'EEEE, MMMM yyyy')}</div>
            <div className="text-sm text-primary mt-1">{dayEvents.length} events</div>
          </div>
        </div>
        
        {/* Day Grid */}
        <div className="flex-1 overflow-auto">
          <div className="relative">
            {hours.map(hour => (
              <div key={hour} className="flex border-b">
                <div className="w-20 p-2 text-xs text-muted-foreground border-r">
                  {hour === 0 ? '12 AM' : hour <= 12 ? `${hour} AM` : `${hour - 12} PM`}
                </div>
                <div className="flex-1 h-16 hover:bg-muted/50 cursor-pointer"
                     onClick={() => handleDateClick(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), hour))} />
              </div>
            ))}
            
            {/* Events */}
            {dayEvents.map(event => (
              <div
                key={event.id}
                className="absolute left-20 right-4 rounded px-2 py-1 text-sm cursor-pointer hover:opacity-80 z-10 ml-2"
                style={{
                  backgroundColor: event.color,
                  top: `${(event.start.getHours() + event.start.getMinutes() / 60) * 64}px`,
                  height: `${Math.max(1, (event.end.getTime() - event.start.getTime()) / (1000 * 60 * 60)) * 64}px`
                }}
                onClick={() => handleEventClick(event)}
              >
                <div className="font-medium">{event.title}</div>
                <div className="text-xs opacity-80">
                  {format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}
                </div>
                {event.location && <div className="text-xs opacity-80">{event.location}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Agenda View Component
  const renderAgendaView = () => {
    const groupedEvents = filteredEvents
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .reduce((groups: { [key: string]: GlobalCalendarEvent[] }, event) => {
        const dateKey = format(event.start, 'yyyy-MM-dd');
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(event);
        return groups;
      }, {});
    
    return (
      <div className="p-4 space-y-6 overflow-auto">
        {Object.entries(groupedEvents).map(([dateKey, events]) => (
          <div key={dateKey} className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="text-lg font-semibold">
                {format(new Date(dateKey), 'EEEE, MMMM d')}
              </div>
              <div className="h-px flex-1 bg-border"></div>
              <div className="text-sm text-muted-foreground">
                {events.length} event{events.length !== 1 ? 's' : ''}
              </div>
            </div>
            
            <div className="space-y-2">
              {events.map(event => (
                <div
                  key={event.id}
                  className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                  onClick={() => handleEventClick(event)}
                >
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: event.color }}></div>
                  <div className="flex-1">
                    <div className="font-medium">{event.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {event.isAllDay ? 'All day' : `${format(event.start, 'h:mm a')} - ${format(event.end, 'h:mm a')}`}
                      {event.location && ` • ${event.location}`}
                    </div>
                  </div>
                  <Badge variant="outline">{event.type}</Badge>
                  {event.priority === 'urgent' && (
                    <Badge variant="secondary" className="bg-red-100 text-red-800">Urgent</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        
        {Object.keys(groupedEvents).length === 0 && (
          <div className="text-center py-12">
            <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No events found</h3>
            <p className="text-muted-foreground mb-4">Try adjusting your filters or create a new event.</p>
            <Button onClick={() => setIsCreateEventOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </div>
        )}
      </div>
    );
  };

  // Workload View Component
  const renderWorkloadView = () => {
    const teamAvailability: TeamAvailability[] = [
      {
        id: '1',
        name: 'Alice Johnson',
        status: 'available',
        currentTask: 'Design Review',
        nextMeeting: addHours(new Date(), 2),
        workload: 75,
        timezone: 'PST',
        workingHours: { start: '9:00', end: '17:00' }
      },
      {
        id: '2',
        name: 'Bob Smith',
        status: 'busy',
        currentTask: 'Sprint Planning',
        nextMeeting: addHours(new Date(), 1),
        workload: 90,
        timezone: 'EST',
        workingHours: { start: '8:00', end: '16:00' }
      },
      {
        id: '3',
        name: 'Carol Davis',
        status: 'away',
        workload: 0,
        timezone: 'PST',
        workingHours: { start: '10:00', end: '18:00' }
      }
    ];
    
    return (
      <div className="p-4 space-y-6 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teamAvailability.map(member => (
            <Card key={member.id} className="p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className={cn(
                  "w-3 h-3 rounded-full",
                  member.status === 'available' && "bg-green-500",
                  member.status === 'busy' && "bg-red-500",
                  member.status === 'away' && "bg-yellow-500",
                  member.status === 'offline' && "bg-gray-500"
                )}></div>
                <div>
                  <div className="font-medium">{member.name}</div>
                  <div className="text-sm text-muted-foreground capitalize">{member.status}</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Workload</span>
                  <span>{member.workload}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className={cn(
                      "h-2 rounded-full transition-all",
                      member.workload < 50 && "bg-green-500",
                      member.workload >= 50 && member.workload < 80 && "bg-yellow-500",
                      member.workload >= 80 && "bg-red-500"
                    )}
                    style={{ width: `${member.workload}%` }}
                  ></div>
                </div>
                
                {member.currentTask && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Current: </span>
                    <span>{member.currentTask}</span>
                  </div>
                )}
                
                {member.nextMeeting && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Next meeting: </span>
                    <span>{format(member.nextMeeting, 'h:mm a')}</span>
                  </div>
                )}
                
                <div className="text-sm text-muted-foreground">
                  {member.workingHours.start} - {member.workingHours.end} {member.timezone}
                </div>
              </div>
            </Card>
          ))}
        </div>
        
        {/* Team Summary */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Team Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">
                {teamAvailability.filter(m => m.status === 'available').length}
              </div>
              <div className="text-sm text-muted-foreground">Available</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">
                {teamAvailability.filter(m => m.status === 'busy').length}
              </div>
              <div className="text-sm text-muted-foreground">Busy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-500">
                {teamAvailability.filter(m => m.status === 'away').length}
              </div>
              <div className="text-sm text-muted-foreground">Away</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {Math.round(teamAvailability.reduce((avg, m) => avg + m.workload, 0) / teamAvailability.length)}%
              </div>
              <div className="text-sm text-muted-foreground">Avg Workload</div>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  // Timeline View Component
  const renderTimelineView = () => {
    const timelineEvents = filteredEvents
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, 20); // Limit for performance
    
    return (
      <div className="p-4 space-y-4 overflow-auto">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border"></div>
          
          {timelineEvents.map((event, index) => (
            <div key={event.id} className="relative flex items-start space-x-4 pb-8">
              {/* Timeline dot */}
              <div 
                className="relative z-10 w-4 h-4 rounded-full border-2 bg-background"
                style={{ borderColor: event.color }}
              >
                <div 
                  className="absolute inset-1 rounded-full"
                  style={{ backgroundColor: event.color }}
                ></div>
              </div>
              
              {/* Event content */}
              <div 
                className="flex-1 p-4 rounded-lg border hover:bg-muted/50 cursor-pointer"
                onClick={() => handleEventClick(event)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">{event.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {format(event.start, 'MMM d, h:mm a')}
                  </div>
                </div>
                
                {event.description && (
                  <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                )}
                
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">{event.type}</Badge>
                  {event.priority === 'urgent' && (
                    <Badge variant="secondary" className="bg-red-100 text-red-800">Urgent</Badge>
                  )}
                  {event.project && (
                    <div className="flex items-center space-x-1">
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: event.project.color }}
                      ></div>
                      <span className="text-xs text-muted-foreground">{event.project.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {timelineEvents.length === 0 && (
            <div className="text-center py-12">
              <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No timeline events</h3>
              <p className="text-muted-foreground">Events will appear here as they're created.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <LazyDashboardLayout>
      <div className="flex flex-col h-full bg-background">
        {/* Global Calendar Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Globe className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-semibold">Global Calendar</h1>
            </div>
            
            <Badge variant="outline" className="text-xs">
              {workspace?.name || 'All Workspaces'}
            </Badge>
            
            <Badge variant="secondary" className="text-xs">
              {calendarStats.total} events
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            
            {/* Filters Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(showFilters && "bg-muted")}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            
            {/* Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Calendar Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={exportCalendar}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Calendar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={shareCalendar}>
                  <Share className="h-4 w-4 mr-2" />
                  Share Calendar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={syncExternalCalendar}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync External Calendar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsCreateEventOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Event
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button onClick={() => setIsCreateEventOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Event
            </Button>
          </div>
        </div>

        {/* Calendar Statistics */}
        <div className="flex items-center justify-between p-4 bg-muted/30 border-b">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm">{calendarStats.today} Today</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm">{calendarStats.thisWeek} This Week</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-sm">{calendarStats.upcoming} Upcoming</span>
            </div>
            {calendarStats.overdue > 0 && (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm text-red-600">{calendarStats.overdue} Overdue</span>
              </div>
            )}
          </div>
          
          <div className="text-sm text-muted-foreground">
            {calendarStats.completed}/{calendarStats.total} completed
          </div>
        </div>

        {/* Navigation and View Controls */}
        <div className="flex items-center justify-between p-4 bg-muted/30">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => handleNavigation('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <h3 className="font-medium min-w-[200px] text-center">
                {calendarView === 'day' && format(currentDate, 'EEEE, MMMM d, yyyy')}
                {calendarView === 'week' && `Week of ${format(startOfWeek(currentDate), 'MMM d, yyyy')}`}
                {calendarView === 'month' && format(currentDate, 'MMMM yyyy')}
                {calendarView === 'agenda' && 'Upcoming Events'}
                {calendarView === 'workload' && 'Team Workload'}
                {calendarView === 'timeline' && 'Project Timeline'}
              </h3>
              
              <Button variant="outline" size="sm" onClick={() => handleNavigation('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
          </div>
          
          {/* View Toggle */}
          <div className="flex items-center space-x-1">
            {([
              { key: 'month', label: 'Month', icon: Grid3X3 },
              { key: 'week', label: 'Week', icon: BarChart3 },
              { key: 'day', label: 'Day', icon: CalendarIcon },
              { key: 'agenda', label: 'Agenda', icon: List },
              { key: 'workload', label: 'Workload', icon: Users },
              { key: 'timeline', label: 'Timeline', icon: TrendingUp },
            ] as const).map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant={calendarView === key ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCalendarView(key)}
                className="px-3 py-1 text-xs"
              >
                <Icon className="h-3 w-3 mr-1" />
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Calendar Content */}
        <div className="flex-1 overflow-hidden">
          {calendarView === 'month' && renderMonthView()}
          {calendarView === 'week' && renderWeekView()}
          {calendarView === 'day' && renderDayView()}
          {calendarView === 'agenda' && renderAgendaView()}
          {calendarView === 'workload' && renderWorkloadView()}
          {calendarView === 'timeline' && renderTimelineView()}
        </div>

        {/* Event Detail Modal */}
        <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: selectedEvent?.color }}
                />
                <span>{selectedEvent?.title}</span>
                <Badge variant="outline">{selectedEvent?.type}</Badge>
                {selectedEvent?.priority === 'urgent' && (
                  <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                    Urgent
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                {selectedEvent && format(selectedEvent.start, 'PPP p')}
                {selectedEvent?.location && ` • ${selectedEvent.location}`}
              </DialogDescription>
            </DialogHeader>
            
            {selectedEvent && (
              <div className="space-y-4">
                {selectedEvent.project && (
                  <div>
                    <label className="text-sm font-medium">Project</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: selectedEvent.project.color }}
                      />
                      <span className="text-sm">{selectedEvent.project.name}</span>
                    </div>
                  </div>
                )}
                
                {selectedEvent.description && (
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <p className="text-sm text-muted-foreground mt-1">{selectedEvent.description}</p>
                  </div>
                )}
                
                {selectedEvent.assignee && (
                  <div>
                    <label className="text-sm font-medium">Assignee</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Avatar className="w-6 h-6">
                        <div className="w-full h-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                          {selectedEvent.assignee.name.charAt(0)}
                        </div>
                      </Avatar>
                      <span className="text-sm">{selectedEvent.assignee.name}</span>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center space-x-4">
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <Badge variant="outline" className="ml-2">
                      {selectedEvent.status}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Priority</label>
                    <Badge variant="outline" className="ml-2">
                      {selectedEvent.priority}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEventModalOpen(false)}>
                Close
              </Button>
              <Button>
                <Edit className="h-4 w-4 mr-2" />
                Edit Event
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Event Modal */}
        <Dialog open={isCreateEventOpen} onOpenChange={setIsCreateEventOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Event</DialogTitle>
              <DialogDescription>
                {selectedDate ? `Create event for ${format(selectedDate, 'PPP')}` : 'Create a new calendar event'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <p className="text-center text-muted-foreground">
                Event creation form will be implemented soon...
              </p>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateEventOpen(false)}>
                Cancel
              </Button>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </LazyDashboardLayout>
  );
} 