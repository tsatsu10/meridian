import React, { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, isWithinInterval, addMonths } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  Clock, 
  Users, 
  Target, 
  Flag, 
  CheckCircle2,
  AlertTriangle,
  Briefcase,
  Layers,
  MapPin
} from 'lucide-react';
import { cn } from '@/lib/cn';
import type { TaskWithSubtasks } from '@/types/task';

interface RoadmapViewProps {
  tasks: TaskWithSubtasks[];
  milestones: any[];
}

interface RoadmapPhase {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  tasks: TaskWithSubtasks[];
  milestones: any[];
  progress: number;
  status: 'upcoming' | 'in_progress' | 'completed' | 'delayed';
}

function RoadmapView({ tasks, milestones }: RoadmapViewProps) {
  // Group tasks and milestones into phases based on due dates
  const roadmapPhases = useMemo(() => {
    if (!tasks.length) return [];

    // Get date range
    const taskDates = tasks
      .filter(task => task.dueDate)
      .map(task => new Date(task.dueDate!));
    
    if (taskDates.length === 0) return [];

    const startDate = new Date(Math.min(...taskDates.map(d => d.getTime())));
    const endDate = new Date(Math.max(...taskDates.map(d => d.getTime())));
    
    // Create monthly phases
    const months = eachMonthOfInterval({ start: startDate, end: endDate });
    
    const phases: RoadmapPhase[] = months.map((month, index) => {
      const phaseStart = startOfMonth(month);
      const phaseEnd = endOfMonth(month);
      
      const phaseTasks = tasks.filter(task => {
        if (!task.dueDate) return false;
        const taskDate = new Date(task.dueDate);
        return isWithinInterval(taskDate, { start: phaseStart, end: phaseEnd });
      });
      
      const phaseMilestones = milestones.filter(milestone => {
        const milestoneDate = new Date(milestone.date);
        return isWithinInterval(milestoneDate, { start: phaseStart, end: phaseEnd });
      });
      
      const completedTasks = phaseTasks.filter(task => task.status === 'done').length;
      const progress = phaseTasks.length > 0 ? (completedTasks / phaseTasks.length) * 100 : 0;
      
      // Determine status
      let status: RoadmapPhase['status'] = 'upcoming';
      const now = new Date();
      if (phaseEnd < now) {
        status = progress === 100 ? 'completed' : 'delayed';
      } else if (phaseStart <= now && phaseEnd >= now) {
        status = 'in_progress';
      }
      
      return {
        id: `phase-${index}`,
        name: format(month, 'MMMM yyyy'),
        startDate: phaseStart,
        endDate: phaseEnd,
        tasks: phaseTasks,
        milestones: phaseMilestones,
        progress: Math.round(progress),
        status
      };
    });
    
    return phases.filter(phase => phase.tasks.length > 0 || phase.milestones.length > 0);
  }, [tasks, milestones]);

  const getPhaseStatusColor = (status: RoadmapPhase['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'delayed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'done': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'in_progress': return <Briefcase className="w-4 h-4 text-orange-500" />;
      default: return <Flag className="w-4 h-4 text-gray-500" />;
    }
  };

  if (roadmapPhases.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg border">
        <div className="text-center">
          <MapPin className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Roadmap Data</h3>
          <p className="text-gray-600">Add tasks with due dates to generate a project roadmap</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg border">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Project Roadmap</h2>
            <p className="text-gray-600">Strategic timeline view of project phases and deliverables</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            <span>Upcoming</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Delayed</span>
          </div>
        </div>
      </div>

      {/* Roadmap Timeline */}
      <div className="space-y-8">
        {roadmapPhases.map((phase, index) => (
          <div key={phase.id} className="relative">
            {/* Timeline connector */}
            {index < roadmapPhases.length - 1 && (
              <div className="absolute left-6 top-32 w-0.5 h-16 bg-gray-300 z-0"></div>
            )}
            
            <div className="flex gap-6">
              {/* Phase indicator */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center border-4 border-white shadow-lg z-10",
                  phase.status === 'completed' ? 'bg-green-500' :
                  phase.status === 'in_progress' ? 'bg-blue-500' :
                  phase.status === 'delayed' ? 'bg-red-500' : 'bg-gray-400'
                )}>
                  {phase.status === 'completed' ? (
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  ) : phase.status === 'in_progress' ? (
                    <Clock className="w-6 h-6 text-white" />
                  ) : phase.status === 'delayed' ? (
                    <AlertTriangle className="w-6 h-6 text-white" />
                  ) : (
                    <Calendar className="w-6 h-6 text-white" />
                  )}
                </div>
                <div className="mt-2 text-center">
                  <div className="font-medium text-gray-900">{format(phase.startDate, 'MMM')}</div>
                  <div className="text-sm text-gray-500">{format(phase.startDate, 'yyyy')}</div>
                </div>
              </div>

              {/* Phase content */}
              <Card className="flex-1">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg">{phase.name}</CardTitle>
                      <Badge className={getPhaseStatusColor(phase.status)}>
                        {phase.status.replace('-', ' ')}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Briefcase className="w-4 h-4" />
                        <span>{phase.tasks.length} tasks</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="w-4 h-4" />
                        <span>{phase.milestones.length} milestones</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-medium">{phase.progress}%</span>
                    </div>
                    <Progress value={phase.progress} className="h-2" />
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Milestones */}
                  {phase.milestones.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-gray-900 flex items-center gap-2">
                        <Target className="w-4 h-4 text-orange-500" />
                        Key Milestones
                      </h4>
                      <div className="space-y-2">
                        {phase.milestones.map((milestone: any) => (
                          <div key={milestone.id} className="flex items-center justify-between p-2 bg-orange-50 rounded-lg border border-orange-200">
                            <div className="flex items-center gap-2">
                              <Flag className="w-4 h-4 text-orange-500" />
                              <span className="font-medium text-sm">{milestone.title}</span>
                            </div>
                            <Badge variant="outline" className={cn(
                              "text-xs",
                              milestone.status === 'achieved' ? 'bg-green-50 text-green-700' :
                              milestone.status === 'missed' ? 'bg-red-50 text-red-700' :
                              'bg-gray-50 text-gray-700'
                            )}>
                              {milestone.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Tasks grid */}
                  {phase.tasks.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-gray-900 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-blue-500" />
                        Tasks & Deliverables
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {phase.tasks.slice(0, 6).map((task) => (
                          <div key={task.id} className="p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(task.status)}
                                <span className="font-medium text-sm text-gray-900 truncate">
                                  {task.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div 
                                  className={cn("w-2 h-2 rounded-full", getPriorityColor(task.priority || 'medium'))}
                                />
                                {task.userEmail && (
                                  <Users className="w-3 h-3 text-gray-400" />
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>#{task.number}</span>
                              {task.dueDate && (
                                <span>{format(new Date(task.dueDate), 'MMM d')}</span>
                              )}
                            </div>
                          </div>
                        ))}
                        
                        {phase.tasks.length > 6 && (
                          <div className="p-3 bg-gray-100 rounded-lg border border-dashed border-gray-300 flex items-center justify-center">
                            <span className="text-sm text-gray-600">
                              +{phase.tasks.length - 6} more tasks
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RoadmapView; 