import { useMemo } from 'react';
import { addDays, differenceInDays, startOfDay, endOfDay } from 'date-fns';
import type { TaskWithSubtasks } from '@/types/task';

interface ScheduledTask {
  id: string;
  title: string;
  originalStartDate?: Date;
  originalEndDate?: Date;
  scheduledStartDate: Date;
  scheduledEndDate: Date;
  duration: number;
  dependencies: string[];
  hasSchedulingConflict: boolean;
  conflictReason?: string;
}

// @epic-1.2-dependencies: Automatic scheduling based on dependencies
export function useAutoSchedule(tasks: TaskWithSubtasks[]) {
  const scheduledTasks = useMemo(() => {
    const taskMap = new Map<string, ScheduledTask>();
    const scheduledMap = new Map<string, ScheduledTask>();
    
    // Convert tasks to schedulable format
    tasks.forEach(task => {
      const defaultDuration = task.priority === 'urgent' ? 1 : 
                             task.priority === 'high' ? 3 : 
                             task.priority === 'medium' ? 5 : 7;
      
      const originalStart = task.dueDate ? new Date(task.dueDate) : new Date(task.createdAt);
      const originalEnd = task.dueDate ? new Date(task.dueDate) : addDays(originalStart, defaultDuration);
      const duration = Math.max(1, differenceInDays(originalEnd, originalStart));
      
      const scheduledTask: ScheduledTask = {
        id: task.id,
        title: task.title,
        originalStartDate: originalStart,
        originalEndDate: originalEnd,
        scheduledStartDate: originalStart,
        scheduledEndDate: originalEnd,
        duration,
        dependencies: task.blockedBy?.map((dep: any) => dep.dependentTaskId) || [],
        hasSchedulingConflict: false
      };
      
      taskMap.set(task.id, scheduledTask);
    });
    
    // Topological sort to handle dependencies
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const sorted: string[] = [];
    
    function visit(taskId: string): boolean {
      if (visiting.has(taskId)) {
        // Circular dependency detected
        const task = taskMap.get(taskId);
        if (task) {
          task.hasSchedulingConflict = true;
          task.conflictReason = 'Circular dependency detected';
        }
        return false;
      }
      
      if (visited.has(taskId)) {
        return true;
      }
      
      visiting.add(taskId);
      const task = taskMap.get(taskId);
      
      if (task) {
        for (const depId of task.dependencies) {
          if (!visit(depId)) {
            task.hasSchedulingConflict = true;
            task.conflictReason = 'Dependency has circular reference';
          }
        }
      }
      
      visiting.delete(taskId);
      visited.add(taskId);
      sorted.push(taskId);
      
      return true;
    }
    
    // Sort all tasks
    for (const taskId of taskMap.keys()) {
      visit(taskId);
    }
    
    // Schedule tasks in dependency order
    for (const taskId of sorted) {
      const task = taskMap.get(taskId);
      if (!task) continue;
      
      let earliestStart = task.originalStartDate || new Date();
      
      // Check all dependencies
      for (const depId of task.dependencies) {
        const dependency = scheduledMap.get(depId);
        if (dependency) {
          const depEnd = dependency.scheduledEndDate;
          const nextDay = addDays(depEnd, 1);
          
          if (nextDay > earliestStart) {
            earliestStart = nextDay;
          }
        }
      }
      
      // Calculate new schedule
      const scheduledStart = startOfDay(earliestStart);
      const scheduledEnd = endOfDay(addDays(scheduledStart, task.duration - 1));
      
      // Check for conflicts with original dates
      if (task.originalStartDate && scheduledStart > task.originalStartDate) {
        task.hasSchedulingConflict = true;
        task.conflictReason = `Delayed by dependencies (was ${task.originalStartDate.toDateString()})`;
      }
      
      task.scheduledStartDate = scheduledStart;
      task.scheduledEndDate = scheduledEnd;
      
      scheduledMap.set(taskId, task);
    }
    
    return Array.from(scheduledMap.values());
  }, [tasks]);
  
  const schedulingStats = useMemo(() => {
    const totalTasks = scheduledTasks.length;
    const conflictedTasks = scheduledTasks.filter(t => t.hasSchedulingConflict).length;
    const delayedTasks = scheduledTasks.filter(t => 
      t.originalStartDate && t.scheduledStartDate > t.originalStartDate
    ).length;
    
    // Calculate total project duration
    const projectStart = scheduledTasks.length > 0 
      ? new Date(Math.min(...scheduledTasks.map(t => t.scheduledStartDate.getTime())))
      : new Date();
    const projectEnd = scheduledTasks.length > 0
      ? new Date(Math.max(...scheduledTasks.map(t => t.scheduledEndDate.getTime())))
      : new Date();
    
    const projectDuration = differenceInDays(projectEnd, projectStart) + 1;
    
    return {
      totalTasks,
      conflictedTasks,
      delayedTasks,
      projectStart,
      projectEnd,
      projectDuration,
      hasConflicts: conflictedTasks > 0
    };
  }, [scheduledTasks]);
  
  return {
    scheduledTasks,
    schedulingStats,
    getTaskSchedule: (taskId: string) => scheduledTasks.find(t => t.id === taskId),
    getConflictedTasks: () => scheduledTasks.filter(t => t.hasSchedulingConflict),
    getDelayedTasks: () => scheduledTasks.filter(t => 
      t.originalStartDate && t.scheduledStartDate > t.originalStartDate
    )
  };
} 