import React, { useMemo } from 'react';
import { format, parseISO, isValid, compareAsc, isSameDay, startOfDay } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  Users, 
  Target, 
  Flag, 
  CheckCircle2,
  AlertTriangle,
  Briefcase,
  List,
  ArrowRight,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/cn';
import type { TaskWithSubtasks } from '@/types/task';

interface ChronologicalViewProps {
  tasks: TaskWithSubtasks[];
  milestones: any[];
}

interface TimelineItem {
  id: string;
  type: 'task' | 'milestone';
  date: Date;
  title: string;
  status: string;
  priority?: string;
  description?: string;
  userEmail?: string;
  number?: number;
  data: TaskWithSubtasks | any;
}

interface DayGroup {
  date: Date;
  dateLabel: string;
  items: TimelineItem[];
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
}

function ChronologicalView({ tasks, milestones }: ChronologicalViewProps) {
  // Combine and sort tasks and milestones chronologically
  const timelineItems = useMemo(() => {
    const items: TimelineItem[] = [];
    
    // Add tasks
    tasks.forEach(task => {
      if (task.dueDate) {
        const date = parseISO(task.dueDate);
        if (isValid(date)) {
          items.push({
            id: task.id,
            type: 'task',
            date,
            title: task.title,
            status: task.status,
            priority: task.priority || undefined,
            description: task.description || undefined,
            userEmail: task.userEmail || undefined,
            number: task.number || undefined,
            data: task
          });
        }
      }
    });
    
    // Add milestones
    milestones.forEach(milestone => {
      const date = parseISO(milestone.date);
      if (isValid(date)) {
        items.push({
          id: milestone.id,
          type: 'milestone',
          date,
          title: milestone.title,
          status: milestone.status,
          description: milestone.description,
          data: milestone
        });
      }
    });
    
    // Sort by date
    return items.sort((a, b) => compareAsc(a.date, b.date));
  }, [tasks, milestones]);

  // Group items by day
  const dayGroups = useMemo(() => {
    const groups: DayGroup[] = [];
    const today = new Date();
    
    timelineItems.forEach(item => {
      const dayStart = startOfDay(item.date);
      let dayGroup = groups.find(group => isSameDay(group.date, dayStart));
      
      if (!dayGroup) {
        dayGroup = {
          date: dayStart,
          dateLabel: format(dayStart, 'EEEE, MMMM d, yyyy'),
          items: [],
          isToday: isSameDay(dayStart, today),
          isPast: dayStart < startOfDay(today),
          isFuture: dayStart > startOfDay(today)
        };
        groups.push(dayGroup);
      }
      
      dayGroup.items.push(item);
    });
    
    return groups.sort((a, b) => compareAsc(a.date, b.date));
  }, [timelineItems]);

  const getStatusColor = (status: string, type: 'task' | 'milestone') => {
    if (type === 'milestone') {
      switch (status) {
        case 'achieved': return 'bg-green-100 text-green-800 border-green-200';
        case 'missed': return 'bg-red-100 text-red-800 border-red-200';
        default: return 'bg-orange-100 text-orange-800 border-orange-200';
      }
    }

    switch (status) {
      case 'done': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getItemIcon = (item: TimelineItem) => {
    if (item.type === 'milestone') {
      switch (item.status) {
        case 'achieved': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
        case 'missed': return <AlertTriangle className="w-5 h-5 text-red-500" />;
        default: return <Target className="w-5 h-5 text-orange-500" />;
      }
    }

    switch (item.status) {
      case 'done': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'in_progress': return <Briefcase className="w-5 h-5 text-orange-500" />;
      default: return <Flag className="w-5 h-5 text-gray-500" />;
    }
  };

  if (timelineItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg border">
        <div className="text-center">
          <List className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Timeline Data</h3>
          <p className="text-gray-600">Add tasks and milestones with dates to see chronological view</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg border">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
            <List className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Chronological Timeline</h2>
            <p className="text-gray-600">Sequential view of all tasks and milestones ordered by date</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Today</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            <span>Past</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Future</span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-6">
        {dayGroups.map((dayGroup, dayIndex) => (
          <div key={dayGroup.date.getTime()} className="relative">
            {/* Timeline connector */}
            {dayIndex < dayGroups.length - 1 && (
              <div className="absolute left-6 top-16 w-0.5 h-full bg-gray-200 z-0"></div>
            )}
            
            {/* Day header */}
            <div className="flex items-center gap-4 mb-4">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center border-4 border-white shadow-lg z-10",
                dayGroup.isToday ? 'bg-blue-500' :
                dayGroup.isPast ? 'bg-gray-400' : 'bg-green-500'
              )}>
                <Calendar className="w-6 h-6 text-white" />
              </div>
              
              <div className="flex-1">
                <h3 className={cn(
                  "text-lg font-semibold",
                  dayGroup.isToday ? 'text-blue-700' :
                  dayGroup.isPast ? 'text-gray-700' : 'text-green-700'
                )}>
                  {dayGroup.dateLabel}
                </h3>
                <p className="text-sm text-gray-500">
                  {dayGroup.items.filter(item => item.type === 'task').length} tasks, {' '}
                  {dayGroup.items.filter(item => item.type === 'milestone').length} milestones
                  {dayGroup.isToday && ' • Today'}
                </p>
              </div>
              
              <Badge className={cn(
                "px-3 py-1",
                dayGroup.isToday ? 'bg-blue-100 text-blue-800' :
                dayGroup.isPast ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'
              )}>
                {dayGroup.items.length} items
              </Badge>
            </div>
            
            {/* Day items */}
            <div className="ml-16 space-y-3">
              {dayGroup.items.map((item, itemIndex) => (
                <Card key={item.id} className={cn(
                  "border-l-4 hover:shadow-md transition-shadow",
                  item.type === 'milestone' ? 'border-l-orange-500' : 'border-l-blue-500'
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {getItemIcon(item)}
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900 truncate">
                              {item.title}
                            </h4>
                            
                            <Badge variant="outline" className={cn(
                              "text-xs border",
                              item.type === 'milestone' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                              'bg-blue-50 text-blue-700 border-blue-200'
                            )}>
                              {item.type}
                            </Badge>
                            
                            {item.number && (
                              <Badge variant="outline" className="text-xs">
                                #{item.number}
                              </Badge>
                            )}
                          </div>
                          
                          {item.description && (
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>{format(item.date, 'h:mm a')}</span>
                            
                            {item.userEmail && (
                              <div className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                <span>{item.userEmail}</span>
                              </div>
                            )}
                            
                            {item.priority && item.type === 'task' && (
                              <div className="flex items-center gap-1">
                                <div className={cn("w-2 h-2 rounded-full", getPriorityColor(item.priority))} />
                                <span className="capitalize">{item.priority}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Badge className={cn("text-xs border", getStatusColor(item.status, item.type))}>
                          {item.status.replace('-', ' ')}
                        </Badge>
                        
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                    
                    {/* Timeline connector to next item */}
                    {itemIndex < dayGroup.items.length - 1 && (
                      <div className="flex items-center mt-3 text-xs text-gray-400">
                        <ArrowRight className="w-3 h-3 mr-1" />
                        <span>Next item</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {/* Summary */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg border">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {timelineItems.filter(item => item.type === 'task').length}
            </div>
            <div className="text-sm text-gray-600">Total Tasks</div>
          </div>
          
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {timelineItems.filter(item => item.type === 'milestone').length}
            </div>
            <div className="text-sm text-gray-600">Milestones</div>
          </div>
          
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {timelineItems.filter(item => item.status === 'done' || item.status === 'achieved').length}
            </div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {dayGroups.length}
            </div>
            <div className="text-sm text-gray-600">Days Scheduled</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChronologicalView; 