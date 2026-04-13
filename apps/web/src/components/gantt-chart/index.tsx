import { useMemo, useState, useRef, useEffect } from 'react';
import { format, addDays, differenceInDays } from 'date-fns';
import type { TaskWithSubtasks } from '@/types/task';
import useProjectStore from '@/store/project';
import { useAutoSchedule } from '@/hooks/use-auto-schedule';

interface GanttChartProps {
  tasks: TaskWithSubtasks[];
}

interface GanttTask {
  id: string;
  title: string;
  number: number;
  startDate: Date;
  endDate: Date;
  duration: number;
  dependencies: string[];
  status: string;
  isCriticalPath: boolean;
  progress: number;
  hasSchedulingConflict?: boolean;
  conflictReason?: string;
  assignee?: string;
  priority: string;
}

// Simplified Priority Badge
const PriorityBadge = ({ priority }: { priority: string }) => {
  const colors = {
    urgent: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    medium: 'bg-blue-100 text-blue-800 border-blue-200',
    low: 'bg-green-100 text-green-800 border-green-200',
  };
  
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded border ${colors[priority as keyof typeof colors] || colors.medium}`}>
      {priority}
    </span>
  );
};

// Progress bar component (currently unused but available for future use)
// const ProgressBar = ({ progress }: { progress: number }) => (
//   <div className="w-full bg-gray-200 rounded-full h-2">
//     <div
//       className="bg-blue-600 h-2 rounded-full transition-all duration-300"
//       style={{ width: `${progress}%` }}
//     />
//   </div>
// );

// @epic-1.2-dependencies: Calculate critical path using longest path algorithm
function calculateCriticalPath(tasks: GanttTask[]): Set<string> {
  const taskMap = new Map(tasks.map(task => [task.id, task]));
  const criticalPath = new Set<string>();
  
  // Calculate earliest start times
  const earliestStart = new Map<string, number>();
  const earliestFinish = new Map<string, number>();
  
  function calculateEarliestTimes(taskId: string): number {
    if (earliestFinish.has(taskId)) {
      return earliestFinish.get(taskId)!;
    }
    
    const task = taskMap.get(taskId);
    if (!task) return 0;
    
    let maxDependencyFinish = 0;
    for (const depId of task.dependencies) {
      const depFinish = calculateEarliestTimes(depId);
      maxDependencyFinish = Math.max(maxDependencyFinish, depFinish);
    }
    
    const start = maxDependencyFinish;
    const finish = start + task.duration;
    
    earliestStart.set(taskId, start);
    earliestFinish.set(taskId, finish);
    
    return finish;
  }
  
  // Calculate latest start times
  const latestStart = new Map<string, number>();
  const latestFinish = new Map<string, number>();
  
  function calculateLatestTimes(taskId: string): number {
    if (latestStart.has(taskId)) {
      return latestStart.get(taskId)!;
    }
    
    const task = taskMap.get(taskId);
    if (!task) return 0;
    
    // Find tasks that depend on this task
    const dependents = Array.from(taskMap.values()).filter(t => 
      t.dependencies.includes(taskId)
    );
    
    let minDependentStart = Infinity;
    for (const dependent of dependents) {
      const depStart = calculateLatestTimes(dependent.id);
      minDependentStart = Math.min(minDependentStart, depStart);
    }
    
    const finish = minDependentStart === Infinity ? 
      earliestFinish.get(taskId)! : minDependentStart;
    const start = finish - task.duration;
    
    latestStart.set(taskId, start);
    latestFinish.set(taskId, finish);
    
    return start;
  }
  
  // Calculate all times
  tasks.forEach(task => {
    calculateEarliestTimes(task.id);
  });
  
  tasks.forEach(task => {
    calculateLatestTimes(task.id);
  });
  
  // Identify critical path (tasks with zero slack)
  tasks.forEach(task => {
    const early = earliestStart.get(task.id) || 0;
    const late = latestStart.get(task.id) || 0;
    
    if (Math.abs(early - late) < 0.001) { // Account for floating point precision
      criticalPath.add(task.id);
    }
  });
  
  return criticalPath;
}

function GanttChart({ tasks }: GanttChartProps) {
  const { project } = useProjectStore();
  const taskListRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [hoveredTask, setHoveredTask] = useState<GanttTask | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  
  // Calendar manipulation state
  const [viewMode, setViewMode] = useState<'days' | 'weeks' | 'months'>('days');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [zoomLevel, setZoomLevel] = useState(1);
  
  // Synchronized scrolling
  const handleTaskListScroll = () => {
    if (taskListRef.current && timelineRef.current) {
      timelineRef.current.scrollTop = taskListRef.current.scrollTop;
    }
  };
  
  const handleTimelineScroll = () => {
    if (taskListRef.current && timelineRef.current) {
      taskListRef.current.scrollTop = timelineRef.current.scrollTop;
    }
  };

  // Calendar manipulation handlers
  const handlePreviousPeriod = () => {
    const newDate = new Date(currentDate);
    switch (viewMode) {
      case 'days':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'weeks':
        newDate.setDate(newDate.getDate() - 28);
        break;
      case 'months':
        newDate.setMonth(newDate.getMonth() - 3);
        break;
    }
    setCurrentDate(newDate);
  };

  const handleNextPeriod = () => {
    const newDate = new Date(currentDate);
    switch (viewMode) {
      case 'days':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'weeks':
        newDate.setDate(newDate.getDate() + 28);
        break;
      case 'months':
        newDate.setMonth(newDate.getMonth() + 3);
        break;
    }
    setCurrentDate(newDate);
  };

  const handleViewModeChange = (mode: 'days' | 'weeks' | 'months') => {
    setViewMode(mode);
  };
  
  // @epic-1.2-dependencies: Use automatic scheduling based on dependencies
  const { scheduledTasks, schedulingStats } = useAutoSchedule(tasks);
  
  const { ganttTasks, criticalPath, timelineStart, timelineEnd, totalDays } = useMemo(() => {try {
      // Convert scheduled tasks to Gantt format
      const converted: GanttTask[] = scheduledTasks.map(scheduledTask => {
        const originalTask = tasks.find(t => t.id === scheduledTask.id);
        if (!originalTask) {
          console.warn('⚠️ Original task not found for:', scheduledTask.id);
          return null;
        }
        
        // Calculate progress based on status
        const progress = originalTask.status === 'done' ? 100 :
                        originalTask.status === 'done' ? 80 :
                        originalTask.status === 'in_progress' ? 40 : 0;
        
        const ganttTask: GanttTask = {
          id: scheduledTask.id,
          title: scheduledTask.title,
          number: originalTask.number,
          startDate: scheduledTask.scheduledStartDate,
          endDate: scheduledTask.scheduledEndDate,
          duration: scheduledTask.duration,
          dependencies: scheduledTask.dependencies,
          status: originalTask.status,
          isCriticalPath: false,
          progress,
          hasSchedulingConflict: scheduledTask.hasSchedulingConflict,
          conflictReason: scheduledTask.conflictReason,
          assignee: originalTask.userEmail,
          priority: originalTask.priority || 'medium'
        };return ganttTask;
      }).filter(Boolean) as GanttTask[];if (converted.length === 0) {
        console.warn('⚠️ No tasks converted to Gantt format');
        return {
          ganttTasks: [],
          criticalPath: new Set<string>(),
          timelineStart: new Date(),
          timelineEnd: new Date(),
          totalDays: 30
        };
      }
      
      const critical = calculateCriticalPath(converted);// Mark critical path tasks
      converted.forEach(task => {
        task.isCriticalPath = critical.has(task.id);
      });
      
      // Calculate timeline bounds based on view mode and current date
      let timelineStart: Date;
      let timelineEnd: Date;
      let totalDays: number;

      if (viewMode === 'months') {
        // Show 6 months centered around current date
        timelineStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 3, 1);
        timelineEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 3, 0);
        totalDays = differenceInDays(timelineEnd, timelineStart) + 1;
      } else if (viewMode === 'weeks') {
        // Show 8 weeks centered around current date
        timelineStart = addDays(currentDate, -28);
        timelineEnd = addDays(currentDate, 28);
        totalDays = 56;
      } else {
        // Days view - show based on zoom level
        const daysToShow = Math.round(60 / zoomLevel);
        timelineStart = addDays(currentDate, -Math.floor(daysToShow / 2));
        timelineEnd = addDays(currentDate, Math.ceil(daysToShow / 2));
        totalDays = daysToShow;
      }

      // Ensure we include all task dates if they extend beyond our view
      if (converted.length > 0) {
        const earliestTaskDate = new Date(Math.min(...converted.map(t => t.startDate.getTime())));
        const latestTaskDate = new Date(Math.max(...converted.map(t => t.endDate.getTime())));
        
        if (earliestTaskDate < timelineStart) {
          timelineStart = earliestTaskDate;
        }
        if (latestTaskDate > timelineEnd) {
          timelineEnd = latestTaskDate;
        }
        
        totalDays = differenceInDays(timelineEnd, timelineStart) + 1;
      }const result = {
        ganttTasks: converted,
        criticalPath: critical,
        timelineStart,
        timelineEnd,
        totalDays
      };
      
      setDebugInfo({
        inputTasks: tasks.length,
        scheduledTasks: scheduledTasks.length,
        convertedTasks: converted.length,
        criticalPathSize: critical.size,
        timelineStart: timelineStart.toISOString(),
        timelineEnd: timelineEnd.toISOString(),
        totalDays,
        viewMode,
        zoomLevel,
        currentDate: currentDate.toISOString()
      });
      
      return result;
    } catch (error: unknown) {
      console.error('❌ Error processing Gantt data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setDebugInfo({ error: errorMessage });
      return {
        ganttTasks: [],
        criticalPath: new Set<string>(),
        timelineStart: new Date(),
        timelineEnd: new Date(),
        totalDays: 30
      };
    }
  }, [scheduledTasks, schedulingStats, tasks, currentDate, viewMode, zoomLevel]);
  
  // Dynamic timeline headers based on view mode
  const timelineHeaders = useMemo(() => {
    const headers = [];
    let currentHeaderDate = new Date(timelineStart);
    
    // Adjust step size based on view mode
    const stepSize = viewMode === 'months' ? 7 : 1; // Show weeks in month view, days otherwise
    
    while (currentHeaderDate <= timelineEnd) {
      headers.push({
        date: new Date(currentHeaderDate),
        dayNumber: format(currentHeaderDate, 'd'),
        dayName: format(currentHeaderDate, 'EEE'),
        monthWeek: format(currentHeaderDate, 'MMM d'),
        isWeekStart: currentHeaderDate.getDay() === 1,
        isMonthStart: currentHeaderDate.getDate() === 1,
        isToday: format(currentHeaderDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'),
        isWeekend: [0, 6].includes(currentHeaderDate.getDay()),
        viewMode: viewMode
      });
      currentHeaderDate = addDays(currentHeaderDate, stepSize);
    }return headers;
  }, [timelineStart, timelineEnd, viewMode]);
  
  // Handlers that depend on useMemo values
  const handleTodayClick = () => {
    setCurrentDate(new Date());
    // Scroll to today in the timeline
    if (timelineRef.current && totalDays > 0) {
      const todayPosition = (differenceInDays(new Date(), timelineStart) / totalDays) * 100;
      timelineRef.current.scrollLeft = (todayPosition / 100) * timelineRef.current.scrollWidth;
    }
  };

  const handleZoomFit = () => {
    if (timelineRef.current && ganttTasks.length > 0) {
      // Calculate optimal zoom to fit all tasks
      const earliestStart = Math.min(...ganttTasks.map(t => t.startDate.getTime()));
      const latestEnd = Math.max(...ganttTasks.map(t => t.endDate.getTime()));
      const projectSpan = differenceInDays(new Date(latestEnd), new Date(earliestStart));
      
      // Adjust zoom level based on project span
      const optimalZoom = Math.max(0.5, Math.min(2, 60 / projectSpan));
      setZoomLevel(optimalZoom);
    }
  };
  
  const getTaskPosition = (task: GanttTask) => {
    const startOffset = differenceInDays(task.startDate, timelineStart);
    const taskDuration = differenceInDays(task.endDate, task.startDate) + 1;
    
    // Adjust positioning based on view mode and zoom
    const effectiveWidth = viewMode === 'months' ? taskDuration / 7 : taskDuration; // Weeks in month view
    const timelineSpan = viewMode === 'months' ? totalDays / 7 : totalDays;
    
    const position = {
      left: Math.max(0, (startOffset / totalDays) * 100),
      width: Math.max(2, (effectiveWidth / timelineSpan) * 100 * zoomLevel)
    };return position;
  };

  // Professional task bar styling matching the design
  const getTaskBarClass = (task: GanttTask) => {
    const baseClass = "rounded-lg shadow-md transition-all duration-200 hover:shadow-lg cursor-pointer";
    
    if (task.hasSchedulingConflict) {
      return `${baseClass} bg-orange-500 text-white`;
    }
    if (task.isCriticalPath) {
      return `${baseClass} bg-red-500 text-white`;
    }
    
    switch (task.status) {
      case 'done':
        return `${baseClass} bg-green-500 text-white`;
      case 'in_progress':
        return `${baseClass} bg-blue-500 text-white`;
      case 'todo':
        return `${baseClass} bg-gray-500 text-white`;
      default:
        // Match the colors from the image
        const colors = [
          'bg-orange-500', 'bg-pink-500', 'bg-purple-500', 'bg-indigo-500', 
          'bg-blue-500', 'bg-teal-500', 'bg-green-500', 'bg-yellow-500'
        ];
        const colorIndex = task.title.charCodeAt(0) % colors.length;
        return `${baseClass} ${colors[colorIndex]} text-white`;
    }
  };

  // Error boundary for rendering issues
  useEffect(() => {}, [debugInfo, ganttTasks, timelineHeaders]);

  if (ganttTasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg border-2 border-gray-200">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-lg flex items-center justify-center">
            <div className="w-8 h-8 bg-gray-400 rounded"></div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Timeline Data Available</h3>
          <p className="text-gray-600">Add tasks with due dates and dependencies to visualize your project timeline.</p>
          {debugInfo && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-left text-sm">
              <strong>Debug Info:</strong>
              <pre className="mt-1 text-xs">{JSON.stringify(debugInfo, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden">
      {/* Compact Header */}
      <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded"></div>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Project Timeline</h2>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>{schedulingStats.projectDuration} days</span>
                <span>{ganttTasks.length} tasks</span>
                {criticalPath.size > 0 && (
                  <span className="text-red-600 font-medium">{criticalPath.size} critical</span>
                )}
              </div>
            </div>
          </div>
          
          {/* Compact Legend */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>Critical</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>In Progress</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Done</span>
            </div>
          </div>
        </div>
        
        {/* Scheduling conflicts banner */}
        {schedulingStats.hasConflicts && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-orange-500 rounded flex items-center justify-center text-white text-xs font-bold">!</div>
              <span className="text-orange-800 font-medium">
                {schedulingStats.conflictedTasks} task{schedulingStats.conflictedTasks !== 1 ? 's' : ''} automatically rescheduled due to dependencies
              </span>
            </div>
          </div>
        )}
      </div>
      
      {/* Gantt Chart Body */}
      <div className="flex h-[calc(100vh-12rem)] min-h-[400px]">
        {/* Task Info Panel */}
        <div className="w-80 flex-shrink-0 bg-gray-50 border-r border-gray-200 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-100 flex-shrink-0">
            <h3 className="font-medium text-gray-900">Tasks</h3>
          </div>
          
          <div 
            ref={taskListRef}
            className="divide-y divide-gray-200 overflow-y-auto flex-1"
            onScroll={handleTaskListScroll}
          >
            {ganttTasks.map((task) => (
              <div key={`info-${task.id}`} className="px-4 py-5 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 border-l-4 border-transparent hover:border-blue-400">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-600 bg-gradient-to-r from-gray-100 to-gray-200 px-3 py-1.5 rounded-lg border border-gray-300 shadow-sm">
                      {project?.slug}-{task.number}
                    </span>
                    {task.isCriticalPath && (
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full font-bold border border-red-200">
                        🔥 Critical
                      </span>
                    )}
                  </div>
                  <PriorityBadge priority={task.priority} />
                </div>
                
                <h4 className="font-bold text-gray-900 mb-3 leading-tight line-clamp-2 text-sm">
                  {task.title}
                </h4>
                
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between text-xs bg-gray-50 rounded-lg p-2 border border-gray-200">
                    <div className="flex items-center gap-2 text-gray-700">
                      <div className="w-4 h-4 bg-gray-400 rounded-md flex items-center justify-center shadow-sm">
                        <div className="w-2 h-2 bg-white rounded-sm"></div>
                      </div>
                      <span className="font-semibold">
                        {format(task.startDate, 'MMM d')} - {format(task.endDate, 'MMM d')}
                      </span>
                    </div>
                    <span className="bg-white text-gray-800 px-2.5 py-1 rounded-md font-bold tabular-nums shadow-sm border border-gray-200">
                      {task.duration}d
                    </span>
                  </div>
                  
                  {task.assignee && (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
                        {task.assignee.split('@')[0].substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-700 font-semibold truncate max-w-32" title={task.assignee}>
                          {task.assignee.split('@')[0]}
                        </span>
                        <span className="text-xs text-gray-500">Assignee</span>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-600 font-medium">Progress</span>
                      <span className="text-gray-900 font-bold tabular-nums">{task.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                      <div
                        className="bg-gradient-to-r from-blue-400 to-indigo-500 h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  </div>
                  
                  {task.hasSchedulingConflict && task.conflictReason && (
                    <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-xl p-3 shadow-lg">
                      <div className="flex items-center gap-2 text-orange-900 mb-2">
                        <div className="w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                          <div className="text-xs font-bold text-white">!</div>
                        </div>
                        <span className="text-xs font-bold">Automatically Rescheduled</span>
                      </div>
                      <p className="text-xs text-orange-800 leading-relaxed">{task.conflictReason}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Interactive Timeline with Calendar Controls */}
        <div className="flex-1 overflow-x-auto bg-white flex flex-col">
          <div className="min-w-[800px] flex-1 flex flex-col">
            {/* Interactive Calendar Controls Header */}
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h3 className="font-semibold text-gray-900">Timeline View</h3>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleTodayClick}
                    className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors font-medium"
                  >
                    Today
                  </button>
                  <button 
                    onClick={handlePreviousPeriod}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                    title="Previous period"
                  >
                    <div className="w-3 h-3 border-l-2 border-b-2 border-current transform rotate-45"></div>
                  </button>
                  <button 
                    onClick={handleNextPeriod}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                    title="Next period"
                  >
                    <div className="w-3 h-3 border-r-2 border-b-2 border-current transform -rotate-45"></div>
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600 font-medium">View:</label>
                  <select 
                    value={viewMode}
                    onChange={(e) => handleViewModeChange(e.target.value as 'days' | 'weeks' | 'months')}
                    className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleZoomFit}
                    className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors font-medium"
                    title="Zoom to fit all tasks"
                  >
                    Zoom Fit
                  </button>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
                      className="w-6 h-6 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors flex items-center justify-center"
                      title="Zoom out"
                    >
                      −
                    </button>
                    <span className="text-xs text-gray-600 min-w-[3rem] text-center">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button 
                      onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.25))}
                      className="w-6 h-6 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors flex items-center justify-center"
                      title="Zoom in"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Professional Timeline Header */}
            <div className="bg-gradient-to-b from-gray-50 to-gray-100 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
              {/* Month headers */}
              <div className="flex h-12 border-b border-gray-300">
                {timelineHeaders.map((header, headerIndex) => (
                  <div
                    key={`month-${headerIndex}`}
                    className={`flex-1 min-w-[50px] px-3 py-3 text-center text-sm font-semibold ${
                      header.isMonthStart ? 'bg-blue-50 text-blue-900 border-l-2 border-blue-400' : 'text-gray-700'
                    }`}
                    style={{ width: `${100 / totalDays}%` }}
                  >
                    {header.isMonthStart && (
                      <div className="text-blue-900">{format(header.date, 'MMMM yyyy')}</div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Week headers */}
              <div className="flex h-10 border-b border-gray-300">
                {timelineHeaders.map((header, headerIndex) => (
                  <div
                    key={`week-${headerIndex}`}
                    className={`flex-1 min-w-[50px] px-2 py-2 text-center text-xs font-medium ${
                      header.isWeekStart ? 'border-l border-gray-400 text-gray-700' : 'text-gray-500'
                    }`}
                    style={{ width: `${100 / totalDays}%` }}
                  >
                    {header.isWeekStart && (
                      <div>{header.monthWeek}</div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Dynamic headers based on view mode */}
              <div className="flex h-12">
                {timelineHeaders.map((header, headerIndex) => (
                  <div
                    key={`day-${headerIndex}`}
                    className={`flex-1 min-w-[50px] px-2 py-2 text-center text-xs border-r border-gray-200 transition-all duration-200 cursor-pointer ${
                      header.isToday 
                        ? 'bg-blue-500 text-white font-bold shadow-md border-l-2 border-blue-600' 
                        : header.isWeekend && viewMode === 'days'
                        ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        : 'text-gray-700 hover:bg-blue-50'
                    } ${header.isWeekStart ? 'border-l border-gray-400' : ''}`}
                    style={{ 
                      width: viewMode === 'months' ? `${100 / timelineHeaders.length}%` : `${100 / totalDays}%`,
                      minWidth: viewMode === 'months' ? '80px' : '50px'
                    }}
                    onClick={() => setCurrentDate(header.date)}
                    title={`Jump to ${format(header.date, 'MMMM d, yyyy')}`}
                  >
                    {viewMode === 'months' ? (
                      <>
                        <div className="font-bold text-sm">Week {format(header.date, 'w')}</div>
                        <div className="text-xs opacity-75 mt-1">{format(header.date, 'MMM d')}</div>
                      </>
                    ) : viewMode === 'weeks' ? (
                      <>
                        <div className="font-bold text-sm">{header.dayNumber}</div>
                        <div className="text-xs opacity-75 mt-1">{header.dayName}</div>
                      </>
                    ) : (
                      <>
                        <div className="font-bold text-sm">{header.dayNumber}</div>
                        <div className="text-xs opacity-75 mt-1">{header.dayName}</div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Interactive Timeline Task Bars */}
            <div 
              ref={timelineRef}
              className="divide-y divide-gray-100 overflow-y-auto flex-1 bg-white"
              onScroll={handleTimelineScroll}
            >
              {ganttTasks.map((task, taskIndex) => {
                const position = getTaskPosition(task);return (
                  <div key={`timeline-${task.id}`} className="relative px-4 py-3 hover:bg-blue-50 transition-all duration-200 group border-b border-gray-100" style={{ height: '60px' }}>
                    {/* Today indicator */}
                    {timelineHeaders.some(h => h.isToday) && (
                      <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-20 shadow-sm"
                        style={{ 
                          left: `${(differenceInDays(new Date(), timelineStart) / totalDays) * 100}%` 
                        }}
                      />
                    )}
                    
                    {/* Professional Task bar */}
                    <div
                      className={`absolute top-3 h-8 flex items-center px-3 text-white font-medium text-sm shadow-lg transition-all duration-200 group-hover:shadow-xl ${getTaskBarClass(task)}`}
                      style={{
                        left: `${position.left}%`,
                        width: `${position.width}%`,
                        minWidth: '100px'
                      }}
                      onMouseEnter={() => setHoveredTask(task)}
                      onMouseLeave={() => setHoveredTask(null)}
                    >
                      {/* Progress overlay */}
                      <div className="absolute inset-0 rounded-lg overflow-hidden">
                        <div
                          className="h-full bg-white bg-opacity-20 transition-all duration-300"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      
                      {/* Task content */}
                      <div className="relative z-10 flex items-center justify-between w-full">
                        <span className="truncate font-medium text-sm">
                          {task.title.length > 20 ? `${task.title.substring(0, 20)}...` : task.title}
                        </span>
                        <span className="text-xs ml-2 bg-black bg-opacity-30 px-2 py-1 rounded font-bold">
                          {task.progress}%
                        </span>
                      </div>
                      
                      {/* Interactive Hover tooltip */}
                      {hoveredTask?.id === task.id && (
                        <div className="absolute -top-20 left-0 bg-white text-gray-900 px-4 py-3 rounded-lg text-sm whitespace-nowrap z-30 shadow-xl border border-gray-200">
                          <div className="font-semibold mb-2 text-blue-600">{task.title}</div>
                          <div className="text-xs text-gray-600 space-y-1">
                            <div className="flex justify-between gap-4">
                              <span>Duration:</span>
                              <span className="text-gray-900 font-medium">{task.duration} days</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span>Progress:</span>
                              <span className="text-gray-900 font-medium">{task.progress}%</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span>Status:</span>
                              <span className="text-gray-900 font-medium capitalize">{task.status.replace('-', ' ')}</span>
                            </div>
                            {task.assignee && (
                              <div className="flex justify-between gap-4">
                                <span>Assignee:</span>
                                <span className="text-gray-900 font-medium">{task.assignee.split('@')[0]}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Professional Dependency arrows */}
                    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 15 }}>
                      {task.dependencies.map(depId => {
                        const depTask = ganttTasks.find(t => t.id === depId);
                        if (!depTask) return null;
                        
                        const depPosition = getTaskPosition(depTask);
                        const fromEndX = depPosition.left + depPosition.width;
                        const toStartX = position.left;
                        
                        if (fromEndX >= toStartX) return null; // Don't draw if positions overlap
                        
                        return (
                          <line
                            key={depId}
                            x1={`${fromEndX}%`}
                            y1="50%"
                            x2={`${toStartX}%`}
                            y2="50%"
                            stroke={task.isCriticalPath ? "#ef4444" : "#64748b"}
                            strokeWidth="1.5"
                            strokeDasharray={task.isCriticalPath ? "0" : "3,2"}
                            markerEnd="url(#arrowhead)"
                            opacity="0.8"
                          />
                        );
                      })}
                      <defs>
                        <marker
                          id="arrowhead"
                          markerWidth="8"
                          markerHeight="6"
                          refX="7"
                          refY="3"
                          orient="auto"
                        >
                          <polygon points="0 0, 8 3, 0 6" fill="#64748b" opacity="0.8" />
                        </marker>
                      </defs>
                    </svg>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      
      {/* Debug Info Footer (only in development) */}
      {process.env.NODE_ENV === 'development' && debugInfo && (
        <div className="bg-gray-100 px-4 py-2 border-t border-gray-200 text-xs">
          <details>
            <summary className="cursor-pointer font-medium">Debug Info</summary>
            <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-auto max-h-32">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

export default GanttChart; 