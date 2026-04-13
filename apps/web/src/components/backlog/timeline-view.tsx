import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, isToday, isThisWeek, isThisMonth, addDays, isBefore } from 'date-fns';
import { Calendar, Clock, Target, AlertTriangle, CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import type { EnhancedTask } from '@/types/backlog';

interface TimelineViewProps {
  tasks: EnhancedTask[];
  onTaskClick?: (task: EnhancedTask) => void;
}

export default function TimelineView({ tasks, onTaskClick }: TimelineViewProps) {
  // Group tasks by time period
  const groupedTasks = useMemo(() => {
    const today = new Date();
    
    const groups = {
      overdue: [] as EnhancedTask[],
      today: [] as EnhancedTask[],
      thisWeek: [] as EnhancedTask[],
      thisMonth: [] as EnhancedTask[],
      future: [] as EnhancedTask[],
      unscheduled: [] as EnhancedTask[]
    };

    tasks.forEach(task => {
      const dueDate = task.dueDate ? new Date(task.dueDate) : null;
      
      if (!dueDate) {
        groups.unscheduled.push(task);
      } else if (isBefore(dueDate, today) && !isToday(dueDate)) {
        groups.overdue.push(task);
      } else if (isToday(dueDate)) {
        groups.today.push(task);
      } else if (isThisWeek(dueDate)) {
        groups.thisWeek.push(task);
      } else if (isThisMonth(dueDate)) {
        groups.thisMonth.push(task);
      } else {
        groups.future.push(task);
      }
    });

    return groups;
  }, [tasks]);

  const getTaskStatusIcon = (task: EnhancedTask) => {
    switch (task.status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Circle className="h-4 w-4 text-blue-500" />;
      default:
        return <Circle className="h-4 w-4 text-gray-300" />;
    }
  };

  const renderTask = (task: EnhancedTask) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      key={task.id}
    >
      <Card 
        className={cn(
          "mb-3 hover:shadow-lg transition-all cursor-pointer border-l-4",
          task.priority === 'critical' ? 'border-l-red-500' :
          task.priority === 'high' ? 'border-l-orange-500' :
          task.priority === 'medium' ? 'border-l-yellow-500' :
          'border-l-green-500'
        )}
        onClick={() => onTaskClick?.(task)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Status Icon */}
            <div className="mt-1">
              {getTaskStatusIcon(task)}
            </div>

            {/* Task Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-medium text-base truncate">{task.title}</h4>
                  {task.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {task.description}
                    </p>
                  )}
                </div>
                {task.userEmail && (
                  <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-medium">
                    {task.userEmail.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Task Metadata */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs font-medium",
                    task.priority === 'critical' ? 'text-red-700 bg-red-50 border-red-200' :
                    task.priority === 'high' ? 'text-orange-700 bg-orange-50 border-orange-200' :
                    task.priority === 'medium' ? 'text-yellow-700 bg-yellow-50 border-yellow-200' :
                    'text-green-700 bg-green-50 border-green-200'
                  )}
                >
                  {task.priority}
                </Badge>

                {task.storyPoints && (
                  <Badge variant="secondary" className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border-blue-200">
                    <Target className="h-3 w-3" />
                    {task.storyPoints}sp
                  </Badge>
                )}

                {task.dueDate && (
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "flex items-center gap-1 text-xs",
                      isBefore(new Date(task.dueDate), new Date()) && !isToday(new Date(task.dueDate))
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-purple-50 text-purple-700 border-purple-200"
                    )}
                  >
                    <Calendar className="h-3 w-3" />
                    {format(new Date(task.dueDate), 'MMM d')}
                  </Badge>
                )}

                {task.refinementStatus && (
                  <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-200">
                    {task.refinementStatus}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderTimeGroup = (
    title: string, 
    tasks: EnhancedTask[], 
    indicator?: JSX.Element,
    className?: string
  ) => (
    <div className={cn("mb-8 relative", className)}>
      {/* Timeline connector */}
      <div className="absolute left-[5px] top-12 bottom-0 w-0.5 bg-gray-200" />

      {/* Group Header */}
      <div className="flex items-center gap-3 mb-6 relative">
        {indicator}
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">
            {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
          </p>
        </div>
      </div>

      {/* Tasks */}
      <div className="space-y-2 pl-8">
        {tasks.map(renderTask)}
        {tasks.length === 0 && (
          <p className="text-sm text-muted-foreground italic pl-2">
            No tasks scheduled
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4">
      {/* Overdue Tasks */}
      {groupedTasks.overdue.length > 0 && renderTimeGroup(
        "Overdue", 
        groupedTasks.overdue,
        <div className="w-3 h-3 rounded-full bg-red-500 ring-4 ring-red-100" />,
        "animate-pulse"
      )}

      {/* Today's Tasks */}
      {renderTimeGroup(
        "Today", 
        groupedTasks.today,
        <div className="w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-100" />
      )}

      {/* This Week */}
      {renderTimeGroup(
        "This Week", 
        groupedTasks.thisWeek,
        <div className="w-3 h-3 rounded-full bg-purple-500 ring-4 ring-purple-100" />
      )}

      {/* This Month */}
      {renderTimeGroup(
        "This Month", 
        groupedTasks.thisMonth,
        <div className="w-3 h-3 rounded-full bg-indigo-500 ring-4 ring-indigo-100" />
      )}

      {/* Future */}
      {renderTimeGroup(
        "Future", 
        groupedTasks.future,
        <div className="w-3 h-3 rounded-full bg-green-500 ring-4 ring-green-100" />
      )}

      {/* Unscheduled */}
      {renderTimeGroup(
        "Unscheduled", 
        groupedTasks.unscheduled,
        <div className="w-3 h-3 rounded-full bg-gray-500 ring-4 ring-gray-100" />
      )}
    </div>
  );
} 