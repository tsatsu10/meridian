import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  ChevronLeft, 
  ChevronRight, 
  FolderOpen, 
  Calendar as CalendarIcon,
  Clock,
  Users,
  User
} from "lucide-react";
import { cn } from "@/lib/cn";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday,
  addMonths,
  subMonths,
  isBefore
} from "date-fns";

// @epic-3.1-dashboards: Jennifer (Exec) needs high-level calendar overview
// @epic-3.2-time: David (Team Lead) needs time-based workload visualization

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assigneeEmail: string | null;
  assigneeName?: string | null;
  assigneeAvatar?: string | null;
  assignedTeamId?: string | null;
  assignedTeam?: {
    id: string;
    name: string;
  } | null;
  dueDate?: string;
  project?: {
    id: string;
    name: string;
    icon?: string;
    slug?: string;
  };
  number?: string | number;
}

interface AllTasksCalendarViewProps {
  tasks: Task[];
  isLoading: boolean;
  selectedTasks: string[];
  onTaskSelect: (taskId: string) => void;
}

const priorityColors = {
  low: "bg-gray-500",
  medium: "bg-yellow-500", 
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

const statusColors = {
  "todo": "border-l-gray-400",
  "in_progress": "border-l-blue-500",
  "done": "border-l-green-500",
};

// Task Item Component for Calendar
function CalendarTaskItem({ 
  task, 
  isSelected, 
  onSelect 
}: { 
  task: Task;
  isSelected: boolean;
  onSelect: (taskId: string) => void;
}) {
  const isOverdue = task.dueDate && isBefore(new Date(task.dueDate), new Date()) && 
    new Date(task.dueDate).toDateString() !== new Date().toDateString();

  return (
    <div
      className={cn(
        "text-xs p-1 mb-1 rounded border-l-2 cursor-pointer hover:bg-muted/50 transition-colors",
        statusColors[task.status as keyof typeof statusColors],
        isSelected && "ring-1 ring-blue-500 bg-blue-50 dark:bg-blue-900/20",
        isOverdue && "bg-red-50 dark:bg-red-900/20"
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(task.id);
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1 min-w-0 flex-1">
          <div 
            className={cn(
              "w-1.5 h-1.5 rounded-full flex-shrink-0",
              priorityColors[task.priority as keyof typeof priorityColors]
            )}
          />
          <span className="truncate font-medium">{task.title}</span>
        </div>
        {task.assignedTeamId ? (
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {task.assignedTeam?.name || 'Assigned Team'}
            </span>
          </div>
        ) : task.assigneeEmail ? (
          <div className="flex items-center space-x-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={task.assigneeAvatar ? task.assigneeAvatar : undefined} />
              <AvatarFallback>
                {task.assigneeName?.split(' ').map((n: string) => n[0]).join('') || 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">
              {task.assigneeName || task.assigneeEmail}
            </span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Unassigned</span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between mt-0.5">
        <span className="text-muted-foreground text-[10px]">
          {task.project?.slug}-{task.number}
        </span>
        {isOverdue && (
          <span className="text-red-600 text-[10px]">⚠️</span>
        )}
      </div>
    </div>
  );
}

// Calendar Day Cell Component
function CalendarDay({
  date,
  tasks,
  isCurrentMonth,
  selectedTasks,
  onTaskSelect
}: {
  date: Date;
  tasks: Task[];
  isCurrentMonth: boolean;
  selectedTasks: string[];
  onTaskSelect: (taskId: string) => void;
}) {
  const isToday_ = isToday(date);
  const dayTasks = tasks.filter(task => 
    task.dueDate && isSameDay(new Date(task.dueDate), date)
  );

  return (
    <div 
      className={cn(
        "min-h-[100px] p-1 border border-border/50",
        !isCurrentMonth && "bg-muted/30 text-muted-foreground",
        isToday_ && "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700"
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={cn(
          "text-sm font-medium",
          isToday_ && "text-blue-600 dark:text-blue-400"
        )}>
          {format(date, "d")}
        </span>
        {dayTasks.length > 0 && (
          <Badge variant="secondary" className="text-[10px] h-4">
            {dayTasks.length}
          </Badge>
        )}
      </div>
      
      <div className="space-y-0.5 max-h-[70px] overflow-y-auto">
        {dayTasks.slice(0, 3).map((task) => (
          <CalendarTaskItem
            key={task.id}
            task={task}
            isSelected={selectedTasks.includes(task.id)}
            onSelect={onTaskSelect}
          />
        ))}
        {dayTasks.length > 3 && (
          <div className="text-[10px] text-muted-foreground text-center py-0.5">
            +{dayTasks.length - 3} more
          </div>
        )}
      </div>
    </div>
  );
}

export function AllTasksCalendarView({
  tasks,
  isLoading,
  selectedTasks,
  onTaskSelect
}: AllTasksCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Get tasks with due dates and tasks without due dates
  const { tasksWithDates, tasksWithoutDates } = useMemo(() => {
    const withDates = tasks.filter(task => task.dueDate);
    const withoutDates = tasks.filter(task => !task.dueDate);
    return { tasksWithDates: withDates, tasksWithoutDates: withoutDates };
  }, [tasks]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => 
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
          <div className="flex space-x-2">
            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {[...Array(35)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold">
            {format(currentDate, "MMMM yyyy")}
          </h2>
          <div className="text-sm text-muted-foreground">
            {tasksWithDates.length} tasks with due dates
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div 
              key={day} 
              className="p-2 text-center text-sm font-medium text-muted-foreground border-r last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((date) => (
            <CalendarDay
              key={date.toString()}
              date={date}
              tasks={tasksWithDates}
              isCurrentMonth={isSameMonth(date, currentDate)}
              selectedTasks={selectedTasks}
              onTaskSelect={onTaskSelect}
            />
          ))}
        </div>
      </Card>

      {/* Tasks Without Due Dates */}
      {tasksWithoutDates.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center space-x-2 mb-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium">Tasks without due dates</h3>
            <Badge variant="secondary">{tasksWithoutDates.length}</Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {tasksWithoutDates.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "p-2 border rounded text-sm cursor-pointer hover:bg-muted/50 transition-colors",
                  selectedTasks.includes(task.id) && "ring-1 ring-blue-500 bg-blue-50 dark:bg-blue-900/20"
                )}
                onClick={() => onTaskSelect(task.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{task.title}</div>
                    <div className="flex items-center space-x-2 mt-1 text-xs text-muted-foreground">
                      <FolderOpen className="h-3 w-3" />
                      <span>{task.project?.name}</span>
                      <span>•</span>
                      <span>{task.project?.slug}-{task.number}</span>
                    </div>
                  </div>
                  {task.assignedTeamId ? (
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {task.assignedTeam?.name || 'Assigned Team'}
                      </span>
                    </div>
                  ) : task.assigneeEmail ? (
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={task.assigneeAvatar ? task.assigneeAvatar : undefined} />
                        <AvatarFallback>
                          {task.assigneeName?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground">
                        {task.assigneeName || task.assigneeEmail}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Unassigned</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
} 