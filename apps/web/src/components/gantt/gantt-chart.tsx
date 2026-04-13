/**
 * Interactive Gantt Chart Component
 * Phase 3.2 - Gantt Chart & Timeline Visualization
 */

import React, { useState, useEffect, useRef } from 'react';

interface Task {
  id: string;
  title: string;
  startDate: Date | null;
  endDate: Date | null;
  status: string;
  progress: number;
  assigneeId: string | null;
  dependencies: string[];
  isCritical: boolean;
}

interface GanttChartProps {
  projectId: string;
  onTaskClick?: (taskId: string) => void;
  onTaskUpdate?: (taskId: string, updates: any) => void;
  className?: string;
}

const CELL_WIDTH = 40; // Width of one day
const ROW_HEIGHT = 50;
const HEADER_HEIGHT = 60;
const SIDEBAR_WIDTH = 250;

export const GanttChart: React.FC<GanttChartProps> = ({
  projectId,
  onTaskClick,
  onTaskUpdate,
  className = '',
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectStart, setProjectStart] = useState<Date>(new Date());
  const [projectEnd, setProjectEnd] = useState<Date>(new Date());
  const [criticalPath, setCriticalPath] = useState<string[]>([]);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [showCriticalPath, setShowCriticalPath] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetchGanttData();
  }, [projectId]);

  useEffect(() => {
    if (tasks.length > 0 && canvasRef.current) {
      drawDependencyLines();
    }
  }, [tasks, showCriticalPath]);

  const fetchGanttData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/gantt/${projectId}`);
      const data = await response.json();

      const { ganttData } = data;
      
      setTasks(
        ganttData.tasks.map((t: any) => ({
          ...t,
          startDate: t.startDate ? new Date(t.startDate) : null,
          endDate: t.endDate ? new Date(t.endDate) : null,
        }))
      );
      setProjectStart(new Date(ganttData.projectStart));
      setProjectEnd(new Date(ganttData.projectEnd));
      setCriticalPath(ganttData.criticalPath || []);
    } catch (error) {
      console.error('Failed to fetch Gantt data:', error);
    } finally {
      setLoading(false);
    }
  };

  const drawDependencyLines = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw dependency lines
    tasks.forEach((task, taskIndex) => {
      task.dependencies.forEach((depId) => {
        const depTask = tasks.find((t) => t.id === depId);
        if (!depTask) return;

        const depIndex = tasks.indexOf(depTask);

        // Calculate positions
        const depEndX = getTaskEndX(depTask);
        const depY = depIndex * ROW_HEIGHT + ROW_HEIGHT / 2 + HEADER_HEIGHT;

        const taskStartX = getTaskStartX(task);
        const taskY = taskIndex * ROW_HEIGHT + ROW_HEIGHT / 2 + HEADER_HEIGHT;

        // Draw line
        const isCritical =
          showCriticalPath &&
          criticalPath.includes(task.id) &&
          criticalPath.includes(depId);

        ctx.strokeStyle = isCritical ? '#EF4444' : '#94A3B8';
        ctx.lineWidth = isCritical ? 3 : 2;
        ctx.setLineDash(isCritical ? [] : [5, 5]);

        ctx.beginPath();
        ctx.moveTo(depEndX, depY);
        ctx.lineTo(depEndX + 10, depY);
        ctx.lineTo(depEndX + 10, taskY);
        ctx.lineTo(taskStartX - 10, taskY);
        ctx.lineTo(taskStartX, taskY);
        ctx.stroke();

        // Draw arrow
        ctx.beginPath();
        ctx.moveTo(taskStartX, taskY);
        ctx.lineTo(taskStartX - 8, taskY - 5);
        ctx.lineTo(taskStartX - 8, taskY + 5);
        ctx.closePath();
        ctx.fillStyle = isCritical ? '#EF4444' : '#94A3B8';
        ctx.fill();
      });
    });
  };

  const getTaskStartX = (task: Task): number => {
    if (!task.startDate) return SIDEBAR_WIDTH;
    const daysDiff = Math.floor(
      (task.startDate.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24)
    );
    return SIDEBAR_WIDTH + daysDiff * CELL_WIDTH;
  };

  const getTaskEndX = (task: Task): number => {
    if (!task.endDate) return SIDEBAR_WIDTH + CELL_WIDTH;
    const daysDiff = Math.floor(
      (task.endDate.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24)
    );
    return SIDEBAR_WIDTH + daysDiff * CELL_WIDTH;
  };

  const getTaskWidth = (task: Task): number => {
    return getTaskEndX(task) - getTaskStartX(task);
  };

  const handleTaskDragStart = (taskId: string) => {
    setDraggedTask(taskId);
  };

  const handleTaskDragEnd = async () => {
    if (draggedTask && onTaskUpdate) {
      const task = tasks.find((t) => t.id === draggedTask);
      if (task && task.startDate && task.endDate) {
        await fetch(`/api/gantt/tasks/${draggedTask}/dates`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startDate: task.startDate.toISOString(),
            endDate: task.endDate.toISOString(),
          }),
        });
      }
    }
    setDraggedTask(null);
  };

  const getTotalDays = (): number => {
    return Math.ceil(
      (projectEnd.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24)
    );
  };

  const renderTimelineHeader = () => {
    const totalDays = getTotalDays();
    const headers: JSX.Element[] = [];

    for (let i = 0; i <= totalDays; i++) {
      const date = new Date(projectStart);
      date.setDate(date.getDate() + i);

      if (viewMode === 'day' || (viewMode === 'week' && date.getDay() === 1)) {
        headers.push(
          <div
            key={i}
            className="border-r border-gray-200 text-center py-2 text-xs font-medium"
            style={{ width: CELL_WIDTH, minWidth: CELL_WIDTH }}
          >
            <div className="text-gray-900">{date.getDate()}</div>
            <div className="text-gray-500 text-[10px]">
              {date.toLocaleDateString('en-US', { month: 'short' })}
            </div>
          </div>
        );
      }
    }

    return headers;
  };

  const renderTimelineGrid = () => {
    const totalDays = getTotalDays();
    const lines: JSX.Element[] = [];

    for (let i = 0; i <= totalDays; i++) {
      const date = new Date(projectStart);
      date.setDate(date.getDate() + i);

      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const isToday =
        date.toDateString() === new Date().toDateString();

      lines.push(
        <div
          key={i}
          className={`border-r border-gray-100 ${
            isWeekend ? 'bg-gray-50' : ''
          } ${isToday ? 'bg-blue-50 border-blue-300' : ''}`}
          style={{
            width: CELL_WIDTH,
            height: tasks.length * ROW_HEIGHT,
          }}
        />
      );
    }

    return lines;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-600">Loading Gantt chart...</div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* Controls */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Project Timeline</h2>
          <p className="text-sm text-gray-600 mt-1">
            {tasks.length} tasks • {getTotalDays()} days • {criticalPath.length} critical
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showCriticalPath}
              onChange={(e) => setShowCriticalPath(e.target.checked)}
              className="rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <span className="text-sm text-gray-700">Show Critical Path</span>
          </label>

          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {(['day', 'week', 'month'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === mode
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="relative overflow-auto" style={{ maxHeight: '600px' }}>
        {/* Timeline Header */}
        <div
          className="sticky top-0 z-10 bg-white border-b border-gray-300"
          style={{ height: HEADER_HEIGHT }}
        >
          <div className="flex">
            <div
              className="sticky left-0 z-20 bg-gray-50 border-r border-gray-300 flex items-center px-4 font-semibold text-gray-700"
              style={{ width: SIDEBAR_WIDTH, minWidth: SIDEBAR_WIDTH }}
            >
              Task Name
            </div>
            <div className="flex">{renderTimelineHeader()}</div>
          </div>
        </div>

        {/* Chart Body */}
        <div className="relative">
          {/* Background Grid */}
          <div className="absolute inset-0 flex">
            <div style={{ width: SIDEBAR_WIDTH }} />
            <div className="flex">{renderTimelineGrid()}</div>
          </div>

          {/* Dependency Canvas */}
          <canvas
            ref={canvasRef}
            width={(getTotalDays() + 1) * CELL_WIDTH + SIDEBAR_WIDTH}
            height={tasks.length * ROW_HEIGHT + HEADER_HEIGHT}
            className="absolute top-0 left-0 pointer-events-none"
            style={{ zIndex: 1 }}
          />

          {/* Tasks */}
          <div className="relative" style={{ zIndex: 2 }}>
            {tasks.map((task, index) => {
              const taskWidth = getTaskWidth(task);
              const taskLeft = getTaskStartX(task);
              const isCritical = showCriticalPath && criticalPath.includes(task.id);

              return (
                <div
                  key={task.id}
                  className="flex items-center border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  style={{ height: ROW_HEIGHT }}
                >
                  {/* Task Name (Sidebar) */}
                  <div
                    className="sticky left-0 z-10 bg-white px-4 py-2 border-r border-gray-200"
                    style={{ width: SIDEBAR_WIDTH, minWidth: SIDEBAR_WIDTH }}
                  >
                    <div className="font-medium text-gray-900 text-sm truncate">
                      {task.title}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center space-x-2 mt-1">
                      <span>{task.status}</span>
                      {isCritical && (
                        <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-semibold">
                          CRITICAL
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Task Bar */}
                  <div className="relative flex-1" style={{ height: ROW_HEIGHT }}>
                    {task.startDate && task.endDate && (
                      <div
                        className={`absolute cursor-move rounded-lg shadow-md transition-all hover:shadow-lg ${
                          isCritical
                            ? 'bg-gradient-to-r from-red-500 to-red-600'
                            : 'bg-gradient-to-r from-blue-500 to-blue-600'
                        }`}
                        style={{
                          left: taskLeft - SIDEBAR_WIDTH,
                          top: '25%',
                          width: Math.max(taskWidth, 20),
                          height: '50%',
                        }}
                        draggable
                        onDragStart={() => handleTaskDragStart(task.id)}
                        onDragEnd={handleTaskDragEnd}
                        onClick={() => onTaskClick && onTaskClick(task.id)}
                      >
                        {/* Progress Bar */}
                        <div
                          className="absolute inset-0 bg-white bg-opacity-30 rounded-l-lg transition-all"
                          style={{ width: `${task.progress}%` }}
                        />

                        {/* Task Label */}
                        {taskWidth > 80 && (
                          <div className="absolute inset-0 flex items-center px-2 text-white text-xs font-medium">
                            {task.progress}%
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-6 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded" />
            <span className="text-gray-600">Regular Task</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-3 bg-gradient-to-r from-red-500 to-red-600 rounded" />
            <span className="text-gray-600">Critical Path</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-0.5 bg-gray-400" style={{ borderTop: '2px dashed' }} />
            <span className="text-gray-600">Dependency</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-0.5 bg-red-500" />
            <span className="text-gray-600">Critical Dependency</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;

