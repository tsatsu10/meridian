// @epic-4.3-enhanced-dashboards: Advanced chart library with scatter, heatmap, and Gantt charts
// @role-workspace-manager: Full analytics access across all projects
// @role-department-head: Department-scoped analytics and reporting
// @role-project-manager: Project-specific advanced visualization

import { useState, useMemo, useCallback } from "react";
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  TrendingUp, 
  Download, 
  RotateCcw,
  Maximize2,
  Calendar,
  Users,
  Clock
} from "lucide-react";
import { cn } from "@/lib/cn";

export interface ScatterDataPoint {
  x: number;
  y: number;
  z?: number; // For bubble size
  label: string;
  category: string;
  metadata?: Record<string, any>;
}

export interface HeatmapDataPoint {
  x: string;
  y: string;
  value: number;
  label?: string;
  intensity?: 'low' | 'medium' | 'high';
}

export interface GanttDataPoint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  progress: number;
  dependencies?: string[];
  assignee?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'not-started' | 'in_progress' | 'completed' | 'blocked';
}

interface AdvancedChartProps {
  title: string;
  className?: string;
  height?: number;
  onExport?: () => void;
  onDrillDown?: (dataPoint: any) => void;
  fullScreen?: boolean;
  onFullScreenToggle?: () => void;
}

interface ScatterPlotProps extends AdvancedChartProps {
  data: ScatterDataPoint[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  showTrendLine?: boolean;
  colorBy?: 'category' | 'value';
  bubbleMode?: boolean;
}

export function ScatterPlot({
  title,
  data,
  xAxisLabel = "X Axis",
  yAxisLabel = "Y Axis",
  showTrendLine = false,
  colorBy = 'category',
  bubbleMode = false,
  className = "",
  height = 400,
  onExport,
  onDrillDown,
  fullScreen = false,
  onFullScreenToggle
}: ScatterPlotProps) {
  const [zoomDomain, setZoomDomain] = useState<{x?: [number, number], y?: [number, number]}>({});
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const categories = useMemo(() => {
    return Array.from(new Set(data.map(d => d.category)));
  }, [data]);

  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];
  
  const filteredData = useMemo(() => {
    if (selectedCategories.length === 0) return data;
    return data.filter(d => selectedCategories.includes(d.category));
  }, [data, selectedCategories]);

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const resetZoom = () => {
    setZoomDomain({});
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={resetZoom}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          {onFullScreenToggle && (
            <Button variant="outline" size="sm" onClick={onFullScreenToggle}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map((category, index) => (
            <Badge
              key={category}
              variant={selectedCategories.length === 0 || selectedCategories.includes(category) ? "default" : "outline"}
              className="cursor-pointer"
              style={{
                backgroundColor: selectedCategories.length === 0 || selectedCategories.includes(category) 
                  ? colors[index % colors.length] 
                  : undefined
              }}
              onClick={() => handleCategoryToggle(category)}
            >
              {category} ({data.filter(d => d.category === category).length})
            </Badge>
          ))}
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={height}>
          <ScatterChart
            data={filteredData}
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              type="number" 
              dataKey="x" 
              name={xAxisLabel}
              domain={zoomDomain.x || ['dataMin', 'dataMax']}
              tick={{ fontSize: 12 }}
              stroke="#666"
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              name={yAxisLabel}
              domain={zoomDomain.y || ['dataMin', 'dataMax']}
              tick={{ fontSize: 12 }}
              stroke="#666"
            />
            <Tooltip 
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                      <p className="font-semibold">{data.label}</p>
                      <p className="text-sm text-gray-600">{xAxisLabel}: {data.x}</p>
                      <p className="text-sm text-gray-600">{yAxisLabel}: {data.y}</p>
                      {bubbleMode && data.z && (
                        <p className="text-sm text-gray-600">Size: {data.z}</p>
                      )}
                      <p className="text-sm text-gray-600">Category: {data.category}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            {categories.map((category, index) => (
              <Scatter
                key={category}
                name={category}
                data={filteredData.filter(d => d.category === category)}
                fill={colors[index % colors.length]}
                onClick={onDrillDown}
                cursor="pointer"
                r={bubbleMode ? undefined : 6}
              />
            ))}
            {showTrendLine && filteredData.length > 1 && (
              <ReferenceLine 
                stroke="#ff7300" 
                strokeDasharray="5 5"
                segment={[
                  { x: Math.min(...filteredData.map(d => d.x)), y: Math.min(...filteredData.map(d => d.y)) },
                  { x: Math.max(...filteredData.map(d => d.x)), y: Math.max(...filteredData.map(d => d.y)) }
                ]}
              />
            )}
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface HeatmapProps extends AdvancedChartProps {
  data: HeatmapDataPoint[];
  colorScheme?: 'blue' | 'green' | 'red' | 'purple';
  showValues?: boolean;
}

export function Heatmap({
  title,
  data,
  colorScheme = 'blue',
  showValues = true,
  className = "",
  height = 400,
  onExport,
  onDrillDown,
  fullScreen = false,
  onFullScreenToggle
}: HeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<HeatmapDataPoint | null>(null);

  const colorSchemes = {
    blue: ['#f0f9ff', '#0ea5e9', '#0369a1', '#1e40af'],
    green: ['#f0fdf4', '#22c55e', '#16a34a', '#15803d'],
    red: ['#fef2f2', '#ef4444', '#dc2626', '#b91c1c'],
    purple: ['#faf5ff', '#a855f7', '#9333ea', '#7c3aed']
  };

  const xLabels = useMemo(() => Array.from(new Set(data.map(d => d.x))), [data]);
  const yLabels = useMemo(() => Array.from(new Set(data.map(d => d.y))), [data]);
  
  const maxValue = useMemo(() => Math.max(...data.map(d => d.value)), [data]);
  const minValue = useMemo(() => Math.min(...data.map(d => d.value)), [data]);

  const getColor = (value: number) => {
    const normalized = (value - minValue) / (maxValue - minValue);
    const colors = colorSchemes[colorScheme];
    if (normalized < 0.25) return colors[0];
    if (normalized < 0.5) return colors[1];
    if (normalized < 0.75) return colors[2];
    return colors[3];
  };

  const cellSize = Math.min(
    (height - 100) / yLabels.length,
    (600 - 100) / xLabels.length
  );

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <div className="flex items-center space-x-2">
          {onFullScreenToggle && (
            <Button variant="outline" size="sm" onClick={onFullScreenToggle}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative overflow-auto">
          <svg width={xLabels.length * cellSize + 100} height={yLabels.length * cellSize + 100}>
            {/* Y-axis labels */}
            {yLabels.map((label, yIndex) => (
              <text
                key={`y-${label}`}
                x={80}
                y={yIndex * cellSize + cellSize / 2 + 50}
                textAnchor="end"
                dominantBaseline="middle"
                className="text-xs fill-gray-600"
              >
                {label}
              </text>
            ))}
            
            {/* X-axis labels */}
            {xLabels.map((label, xIndex) => (
              <text
                key={`x-${label}`}
                x={xIndex * cellSize + cellSize / 2 + 90}
                y={40}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xs fill-gray-600"
              >
                {label}
              </text>
            ))}
            
            {/* Heatmap cells */}
            {data.map((point, index) => {
              const xIndex = xLabels.indexOf(point.x);
              const yIndex = yLabels.indexOf(point.y);
              return (
                <g key={index}>
                  <rect
                    x={xIndex * cellSize + 90}
                    y={yIndex * cellSize + 50}
                    width={cellSize - 2}
                    height={cellSize - 2}
                    fill={getColor(point.value)}
                    stroke="#fff"
                    strokeWidth={1}
                    className="cursor-pointer hover:stroke-gray-400 hover:stroke-2"
                    onClick={() => onDrillDown?.(point)}
                    onMouseEnter={() => setHoveredCell(point)}
                    onMouseLeave={() => setHoveredCell(null)}
                  />
                  {showValues && cellSize > 30 && (
                    <text
                      x={xIndex * cellSize + cellSize / 2 + 90}
                      y={yIndex * cellSize + cellSize / 2 + 50}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-xs fill-white font-medium pointer-events-none"
                    >
                      {point.value}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          
          {/* Tooltip */}
          {hoveredCell && (
            <div className="absolute top-0 left-0 bg-white p-2 border border-gray-200 rounded shadow-lg pointer-events-none z-10">
              <p className="font-semibold">{hoveredCell.label || `${hoveredCell.x} × ${hoveredCell.y}`}</p>
              <p className="text-sm text-gray-600">Value: {hoveredCell.value}</p>
            </div>
          )}
        </div>
        
        {/* Color legend */}
        <div className="flex items-center justify-center mt-4 space-x-4">
          <span className="text-xs text-gray-600">Low</span>
          <div className="flex">
            {colorSchemes[colorScheme].map((color, index) => (
              <div
                key={index}
                className="w-4 h-4 border border-white"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <span className="text-xs text-gray-600">High</span>
        </div>
      </CardContent>
    </Card>
  );
}

interface GanttChartProps extends AdvancedChartProps {
  data: GanttDataPoint[];
  timeRange?: [Date, Date];
  showDependencies?: boolean;
  groupBy?: 'assignee' | 'priority' | 'status' | 'none';
}

export function GanttChart({
  title,
  data,
  timeRange,
  showDependencies = true,
  groupBy = 'none',
  className = "",
  height = 400,
  onExport,
  onDrillDown,
  fullScreen = false,
  onFullScreenToggle
}: GanttChartProps) {
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'days' | 'weeks' | 'months'>('weeks');

  const statusColors = {
    'not-started': '#94a3b8',
    'in_progress': '#3b82f6',
    'completed': '#10b981',
    'blocked': '#ef4444'
  };

  const priorityColors = {
    low: '#84cc16',
    medium: '#f59e0b',
    high: '#ef4444'
  };

  const groupedData = useMemo(() => {
    if (groupBy === 'none') return { 'All Tasks': data };
    
    return data.reduce((groups, task) => {
      const key = task[groupBy] || 'Unassigned';
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
      return groups;
    }, {} as Record<string, GanttDataPoint[]>);
  }, [data, groupBy]);

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <div className="flex items-center space-x-2">
          <Select value={viewMode} onValueChange={(value: 'days' | 'weeks' | 'months') => setViewMode(value)}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="days">Days</SelectItem>
              <SelectItem value="weeks">Weeks</SelectItem>
              <SelectItem value="months">Months</SelectItem>
            </SelectContent>
          </Select>
          {onFullScreenToggle && (
            <Button variant="outline" size="sm" onClick={onFullScreenToggle}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(groupedData).map(([groupName, tasks]) => (
            <div key={groupName} className="space-y-2">
              {groupBy !== 'none' && (
                <h4 className="font-medium text-gray-900 border-b pb-1">{groupName}</h4>
              )}
              <div className="space-y-1">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={cn(
                      "flex items-center p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors",
                      selectedTasks.includes(task.id) && "bg-blue-50 border-blue-200"
                    )}
                    onClick={() => {
                      toggleTaskSelection(task.id);
                      onDrillDown?.(task);
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{task.name}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge 
                              variant="outline" 
                              className="text-xs"
                              style={{ 
                                borderColor: statusColors[task.status],
                                color: statusColors[task.status]
                              }}
                            >
                              {task.status.replace('-', ' ')}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className="text-xs"
                              style={{ 
                                borderColor: priorityColors[task.priority],
                                color: priorityColors[task.priority]
                              }}
                            >
                              {task.priority}
                            </Badge>
                            {task.assignee && (
                              <span className="text-xs text-gray-500">
                                <Users className="h-3 w-3 inline mr-1" />
                                {task.assignee}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(task.startDate).toLocaleDateString()}</span>
                          <span>→</span>
                          <span>{new Date(task.endDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full transition-all duration-300"
                              style={{ 
                                width: `${task.progress}%`,
                                backgroundColor: statusColors[task.status]
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 min-w-[3rem]">{task.progress}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Export all chart types for easy importing
export const AdvancedCharts = {
  ScatterPlot,
  Heatmap,
  GanttChart
}; 