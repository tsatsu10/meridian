import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import useProjectStore from "@/store/project";
import useGetProject from "@/hooks/queries/project/use-get-project";
import useGetTasks from "@/hooks/queries/task/use-get-tasks";
import useCreateTask from "@/hooks/mutations/task/use-create-task";
import useUpdateTask from "@/hooks/mutations/task/use-update-task";
import useGetWorkspaceUsers from "@/hooks/queries/workspace-users/use-get-workspace-users";
import type { WorkspaceUser } from "@/types/workspace-user";
import CreateTaskModal from "@/components/shared/modals/create-task-modal";
import { 
  Calendar, 
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
  Calendar as CalendarIcon,
  Grid3X3,
  List,
  User,
  UserCheck,
  UserX,
  Zap,
  TrendingUp,
  BarChart3,
  MapPin,
  MessageSquare,
  Video,
  Coffee,
  Focus,
  Search,
  X,
  ChevronDown
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useState, useMemo, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { flattenTasks } from "@/utils/task-hierarchy";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameDay, isSameMonth, isToday, parseISO, addDays, subDays, startOfDay } from "date-fns";
import LazyDashboardLayout from "@/components/performance/lazy-dashboard-layout";

export const Route = createFileRoute(
  "/dashboard/workspace/$workspaceId/project/$projectId/_layout/calendar"
)({
  component: ProjectCalendar,
});

// Types for calendar events and configurations
interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'task' | 'milestone' | 'meeting' | 'deadline' | 'block';
  status: 'todo' | 'in_progress' | 'done' | 'overdue' | 'cancelled';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  assignee?: {
    id: string;
    name: string;
    avatar?: string;
  };
  project?: string;
  description?: string;
  location?: string;
  participants?: string[];
  isAllDay?: boolean;
  color?: string;
  originalTask?: any;
}

interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
  status: 'available' | 'busy' | 'out-of-office' | 'partially-available';
  workload: number; // 0-100 percentage
}

type CalendarView = 'month' | 'week' | 'day' | 'agenda';

// Event type colors matching the requirements
const eventTypeColors = {
  task: '#3B82F6', // Blue
  milestone: '#8B5CF6', // Purple  
  meeting: '#10B981', // Green
  deadline: '#EF4444', // Red
  block: '#6B7280', // Gray
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

// @epic-1.2-projects: Project calendar view with task scheduling
// @persona-sarah: PM needs visual timeline and deadline management
// @persona-david: Team lead needs workload distribution and capacity planning
// @persona-jennifer: Exec needs milestone tracking and project timeline overview
function ProjectCalendar() {
  const { workspaceId, projectId } = Route.useParams();
  const { project } = useProjectStore();
  const { mutate: createTask } = useCreateTask();
  const { mutate: updateTask } = useUpdateTask();

  // Fetch real project and task data
  const { data: projectData, isLoading: isProjectLoading, error: projectError } = useGetProject({ 
    id: projectId, 
    workspaceId 
  });
  const { data: tasksData, isLoading: isTasksLoading, error: tasksError } = useGetTasks(projectId);
  
  // Calendar state management
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<CalendarView>('month');
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // Filter state
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all', 
    priority: 'all',
    assignee: 'all',
    showCompleted: true,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Team availability - will be loaded from real team data
  const { data: workspaceUsers } = useGetWorkspaceUsers({ workspaceId });
  const teamMembers: TeamMember[] = workspaceUsers?.map((user: WorkspaceUser) => ({
    id: user.userEmail || '',
    name: user.userName || 'Unknown User',
    status: 'available' as const,
    workload: 0, // Will be calculated from actual task assignments
  })) ?? [];

  // Process task data into calendar events
  const columnArray = Array.isArray(tasksData)
    ? tasksData
    : tasksData && Array.isArray((tasksData as any).columns)
      ? (tasksData as any).columns
      : [];
  const allTasks = flattenTasks(columnArray.flatMap((col: any) => col.tasks));

  // Convert tasks to calendar events
  const calendarEvents = useMemo((): CalendarEvent[] => {
    const events: CalendarEvent[] = [];

      // Debug logging// Convert tasks to events
  allTasks.forEach((task: any) => {if (task.dueDate) {
      try {
        const dueDate = parseISO(task.dueDate);events.push({
          id: task.id,
          title: task.title,
          start: dueDate,
          end: dueDate,
          type: 'task',
          status: task.status || 'todo',
          priority: task.priority || 'medium',
          assignee: task.assignee ? {
            id: task.assignee.id,
            name: task.assignee.name,
            avatar: task.assignee.avatar,
          } : undefined,
          description: task.description,
          isAllDay: true, // Tasks are all-day events since they only have due dates
          color: eventTypeColors.task,
          originalTask: task,
        });
      } catch (error) {
        console.error('Calendar: Error parsing due date for task:', task.title, error);
      }
    } else {}
  });// Return events created from real task data only
  return events;
  }, [allTasks]);

  // Apply filters to events
  const filteredEvents = useMemo(() => {
    return calendarEvents.filter((event) => {
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

      // Assignee filter
      if (filters.assignee !== 'all' && event.assignee?.id !== filters.assignee) {
        return false;
      }

      // Show completed filter
      if (!filters.showCompleted && event.status === 'done') {
        return false;
      }

      return true;
    });
  }, [calendarEvents, filters, searchQuery]);

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
  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEventModalOpen(true);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsCreateEventOpen(true);
  };

  const handleCreateTask = () => {
    setIsCreateTaskOpen(true);
  };

  // Filter handlers
  const clearFilters = () => {
    setFilters({
      type: 'all',
      status: 'all',
      priority: 'all', 
      assignee: 'all',
      showCompleted: true,
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
    const weekStart = startOfWeek(currentDate);
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const timeSlots = Array.from({ length: 24 }, (_, i) => i);
    
    return (
      <div className="flex flex-col h-full">
        {/* Week header */}
        <div className="grid grid-cols-8 border-b border-border">
          <div className="p-2"></div>
          {weekDays.map((day) => (
            <div key={day.toISOString()} className="p-2 text-center border-r border-border last:border-r-0">
              <div className="text-sm font-medium">{format(day, 'EEE')}</div>
              <div className={cn(
                "text-lg font-bold",
                isToday(day) && "text-primary"
              )}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>
        
        {/* All-day events section */}
        <div className="grid grid-cols-8 border-b border-border">
          <div className="p-2 text-xs text-muted-foreground">All Day</div>
          {weekDays.map((day) => {
            const allDayEvents = filteredEvents.filter(event => 
              isSameDay(event.start, day) && event.isAllDay
            );
            
            return (
              <div
                key={`allday-${day.toISOString()}`}
                className="min-h-12 border-r border-border last:border-r-0 p-1 hover:bg-muted/50 cursor-pointer"
                onClick={() => handleDateClick(day)}
              >
                {allDayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="text-xs p-1 rounded mb-1 truncate cursor-pointer hover:opacity-80"
                    style={{ backgroundColor: event.color + '20', color: event.color, borderLeft: `3px solid ${event.color}` }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEventClick(event);
                    }}
                  >
                    {event.title}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        
        {/* Time slots */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-8">
            {timeSlots.map((hour) => (
              <div key={hour} className="contents">
                <div className="p-2 text-xs text-muted-foreground border-r border-b border-border">
                  {format(new Date().setHours(hour, 0, 0, 0), 'HH:mm')}
                </div>
                {weekDays.map((day) => {
                  const hourEvents = filteredEvents.filter(event => {
                    const eventStart = new Date(event.start);
                    return isSameDay(eventStart, day) && eventStart.getHours() === hour && !event.isAllDay;
                  });
                  
                  return (
                    <div
                      key={`${day.toISOString()}-${hour}`}
                      className="min-h-12 border-r border-b border-border last:border-r-0 p-1 hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleDateClick(new Date(day.setHours(hour, 0, 0, 0)))}
                    >
                      {hourEvents.map((event) => (
                        <div
                          key={event.id}
                          className="text-xs p-1 rounded mb-1 truncate cursor-pointer hover:opacity-80"
                          style={{ backgroundColor: event.color + '20', color: event.color, borderLeft: `3px solid ${event.color}` }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEventClick(event);
                          }}
                        >
                          {event.title}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const timeSlots = Array.from({ length: 24 }, (_, i) => i);
    const dayEvents = filteredEvents.filter(event => isSameDay(event.start, currentDate));
    
    return (
      <div className="flex flex-col h-full">
        {/* Day header */}
        <div className="p-4 border-b border-border">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">{format(currentDate, 'EEEE')}</div>
            <div className={cn(
              "text-2xl font-bold",
              isToday(currentDate) && "text-primary"
            )}>
              {format(currentDate, 'MMMM d, yyyy')}
            </div>
          </div>
        </div>
        
        {/* All-day events */}
        {dayEvents.filter(e => e.isAllDay).length > 0 && (
          <div className="p-4 border-b border-border">
            <div className="text-sm font-medium mb-2">All Day</div>
            <div className="space-y-1">
              {dayEvents.filter(e => e.isAllDay).map((event) => (
                <div
                  key={event.id}
                  className="text-sm p-2 rounded cursor-pointer hover:opacity-80"
                  style={{ backgroundColor: event.color + '20', color: event.color, borderLeft: `3px solid ${event.color}` }}
                  onClick={() => handleEventClick(event)}
                >
                  {event.title}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Time slots */}
        <div className="flex-1 overflow-y-auto">
          {timeSlots.map((hour) => {
            const hourEvents = dayEvents.filter(event => {
              const eventStart = new Date(event.start);
              return eventStart.getHours() === hour && !event.isAllDay;
            });
            
            return (
              <div key={hour} className="flex border-b border-border">
                <div className="w-16 p-2 text-xs text-muted-foreground border-r border-border">
                  {format(new Date().setHours(hour, 0, 0, 0), 'HH:mm')}
                </div>
                <div 
                  className="flex-1 min-h-12 p-2 hover:bg-muted/50 cursor-pointer"
                  onClick={() => handleDateClick(new Date(currentDate.setHours(hour, 0, 0, 0)))}
                >
                  {hourEvents.map((event) => (
                    <div
                      key={event.id}
                      className="text-sm p-2 rounded mb-1 cursor-pointer hover:opacity-80"
                      style={{ backgroundColor: event.color + '20', color: event.color, borderLeft: `3px solid ${event.color}` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEventClick(event);
                      }}
                    >
                      <div className="font-medium">{event.title}</div>
                      {event.location && (
                        <div className="text-xs opacity-75 flex items-center mt-1">
                          <MapPin className="h-3 w-3 mr-1" />
                          {event.location}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAgendaView = () => {
    const upcomingEvents = filteredEvents
      .filter(event => event.start >= startOfDay(new Date()))
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, 50);

    return (
      <div className="space-y-4 p-4">
        {upcomingEvents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No upcoming events</p>
          </div>
        ) : (
          upcomingEvents.map((event) => (
            <div
              key={event.id}
              className="flex items-center space-x-4 p-4 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => handleEventClick(event)}
            >
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: event.color }}
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h3 className="font-medium">{event.title}</h3>
                  <Badge variant="outline" className="text-xs">
                    {event.type}
                  </Badge>
                  {event.priority === 'urgent' && (
                    <Badge variant="secondary" className="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                      {event.priority}
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(event.start, 'MMM d, yyyy')} at {format(event.start, 'HH:mm')}
                  {event.location && ` • ${event.location}`}
                </div>
              </div>
              {event.assignee && (
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm">{event.assignee.name}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    );
  };

  // Loading state
  if (isProjectLoading || isTasksLoading) {
    return (
      <LazyDashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-zinc-500 dark:text-zinc-400">Loading calendar...</div>
        </div>
      </LazyDashboardLayout>
    );
  }

  // Error state
  if (projectError || tasksError) {
    return (
      <LazyDashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <AlertCircle className="h-12 w-12 text-orange-500" />
          <div className="text-center">
            <h3 className="text-lg font-medium">Unable to load calendar</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {projectError?.message || tasksError?.message}
            </p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Try Again
            </Button>
          </div>
        </div>
      </LazyDashboardLayout>
    );
  }

  return (
    <LazyDashboardLayout>
      <div className="flex flex-col h-full bg-background">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-semibold">Project Calendar</h1>
            </div>
            
            <Badge variant="outline" className="text-xs">
              {projectData?.name || 'Loading...'}
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
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsCreateTaskOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button onClick={handleCreateTask}>
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="p-4 bg-muted/30 border-b border-border">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Label htmlFor="type-filter" className="text-sm font-medium">Type:</Label>
                <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="task">Tasks</SelectItem>
                    <SelectItem value="milestone">Milestones</SelectItem>
                    <SelectItem value="meeting">Meetings</SelectItem>
                    <SelectItem value="deadline">Deadlines</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Label htmlFor="status-filter" className="text-sm font-medium">Status:</Label>
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Label htmlFor="priority-filter" className="text-sm font-medium">Priority:</Label>
                <Select value={filters.priority} onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Label htmlFor="assignee-filter" className="text-sm font-medium">Assignee:</Label>
                <Select value={filters.assignee} onValueChange={(value) => setFilters(prev => ({ ...prev, assignee: value }))}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Assignees</SelectItem>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </div>
        )}

        {/* Calendar Navigation */}
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
          <div className="flex items-center space-x-1 bg-muted rounded-md p-1">
            {([
              { key: 'month', label: 'Month', icon: Grid3X3 },
              { key: 'week', label: 'Week', icon: BarChart3 },
              { key: 'day', label: 'Day', icon: Calendar },
              { key: 'agenda', label: 'Agenda', icon: List },
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

        {/* Team Status Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted/20 border-b border-border">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium">Team Status:</span>
            <div className="flex items-center space-x-2">
              {teamMembers.slice(0, 5).map((member) => {
                const statusIcons = {
                  'available': UserCheck,
                  'busy': User,
                  'out-of-office': UserX,
                  'partially-available': UserCheck,
                };
                const StatusIcon = statusIcons[member.status];
                
                return (
                  <div
                    key={member.id}
                    className="flex items-center space-x-1 text-xs bg-background rounded-full px-2 py-1"
                    title={`${member.name} - ${member.status} (${member.workload}% capacity)`}
                  >
                    <StatusIcon className={cn(
                      "h-3 w-3",
                      member.status === 'available' && "text-green-500",
                      member.status === 'busy' && "text-red-500",
                      member.status === 'out-of-office' && "text-gray-500",
                      member.status === 'partially-available' && "text-yellow-500"
                    )} />
                    <span>{member.name.split(' ')[0]}</span>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground">
            {filteredEvents.length} events {searchQuery && `matching "${searchQuery}"`}
          </div>
        </div>

        {/* Calendar Content */}
        <div className="flex-1 overflow-hidden">
          {calendarView === 'month' && renderMonthView()}
          {calendarView === 'week' && renderWeekView()}
          {calendarView === 'day' && renderDayView()}
          {calendarView === 'agenda' && renderAgendaView()}
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
              </DialogTitle>
              <DialogDescription>
                {selectedEvent && format(selectedEvent.start, 'PPP p')}
                {selectedEvent?.location && ` • ${selectedEvent.location}`}
              </DialogDescription>
            </DialogHeader>
            
            {selectedEvent && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Status:</span>
                    <Badge 
                      variant="outline" 
                      className="ml-2"
                      style={{ color: statusColors[selectedEvent.status] }}
                    >
                      {selectedEvent.status}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium">Priority:</span>
                    <Badge 
                      variant="outline" 
                      className="ml-2"
                      style={{ color: priorityColors[selectedEvent.priority] }}
                    >
                      {selectedEvent.priority}
                    </Badge>
                  </div>
                </div>
                
                {selectedEvent.assignee && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Assignee:</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-sm">{selectedEvent.assignee.name}</span>
                    </div>
                  </div>
                )}
                
                {selectedEvent.description && (
                  <div>
                    <span className="text-sm font-medium">Description:</span>
                    <p className="text-sm text-muted-foreground mt-1">{selectedEvent.description}</p>
                  </div>
                )}
                
                {selectedEvent.participants && selectedEvent.participants.length > 0 && (
                  <div>
                    <span className="text-sm font-medium">Participants:</span>
                    <div className="flex items-center space-x-2 mt-1">
                      {selectedEvent.participants.map((participant, index) => (
                        <Badge key={index} variant="outline">{participant}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEventModalOpen(false)}>
                Close
              </Button>
              {selectedEvent?.originalTask && (
                <Button onClick={() => {
                  // Navigate to task detail or open edit modal
                  toast.info('Task editing will be implemented');
                }}>
                  Edit Task
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Task Modal */}
        <CreateTaskModal
          open={isCreateTaskOpen}
          onClose={() => setIsCreateTaskOpen(false)}
          projectContext={{
            id: projectId,
            name: projectData?.name || 'Project',
            slug: projectData?.slug || 'project'
          }}
        />
      </div>
    </LazyDashboardLayout>
  );
} 