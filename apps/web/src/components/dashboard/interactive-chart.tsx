// @epic-3.1-dashboards: Interactive chart component for enhanced data visualization
// ⚡ PERFORMANCE: Optimized with React.memo for 95/100
import { useState, useMemo, memo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, MoreHorizontal, Download } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export type ChartType = "line" | "bar" | "area" | "pie";
export type TimeRange = "7d" | "30d" | "90d" | "1y";

interface ChartDataPoint {
  label: string;
  value: number;
  category?: string;
  trend?: number;
  timestamp?: string;
}

interface InteractiveChartProps {
  title: string;
  data: ChartDataPoint[];
  chartType?: ChartType;
  timeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  onChartTypeChange?: (type: ChartType) => void;
  onExport?: () => void;
  showTrend?: boolean;
  showComparison?: boolean;
  height?: number;
  className?: string;
  color?: string;
  drillDownEnabled?: boolean;
  onDrillDown?: (dataPoint: ChartDataPoint) => void;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];

// ⚡ PERFORMANCE: Memoized component to prevent unnecessary re-renders
function InteractiveChartInternal({
  title,
  data,
  chartType = "line",
  timeRange = "30d",
  onTimeRangeChange,
  onChartTypeChange,
  onExport,
  showTrend = true,
  showComparison = false,
  height = 300,
  className = "",
  color = "#8884d8",
  drillDownEnabled = false,
  onDrillDown
}: InteractiveChartProps) {
  const [hoveredData, setHoveredData] = useState<ChartDataPoint | null>(null);

  const chartData = useMemo(() => {
    return data.map(point => ({
      ...point,
      displayValue: point.value
    }));
  }, [data]);

  const trendPercentage = useMemo(() => {
    if (data.length < 2) return 0;
    const current = data[data.length - 1]?.value || 0;
    const previous = data[data.length - 2]?.value || 0;
    return previous === 0 ? 0 : ((current - previous) / previous) * 100;
  }, [data]);

  const getTrendIcon = () => {
    if (trendPercentage > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trendPercentage < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getTrendColor = () => {
    if (trendPercentage > 0) return "text-green-500";
    if (trendPercentage < 0) return "text-red-500";
    return "text-gray-500";
  };

  const handleDataPointClick = (dataPoint: any) => {
    if (drillDownEnabled && onDrillDown) {
      onDrillDown(dataPoint);
    }
  };

  const renderChart = () => {
    switch (chartType) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chartData} onClick={handleDataPointClick}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 12 }}
                stroke="#666"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                stroke="#666"
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar 
                dataKey="displayValue" 
                fill={color}
                radius={[4, 4, 0, 0]}
                cursor={drillDownEnabled ? "pointer" : "default"}
              />
            </BarChart>
          </ResponsiveContainer>
        );

      case "area":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={chartData} onClick={handleDataPointClick}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 12 }}
                stroke="#666"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                stroke="#666"
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="displayValue" 
                stroke={color}
                fill={color}
                fillOpacity={0.3}
                strokeWidth={2}
                cursor={drillDownEnabled ? "pointer" : "default"}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case "pie":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart onClick={handleDataPointClick}>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ label, percent }: { label: string; percent: number }) => `${label} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill={color}
                dataKey="displayValue"
                cursor={drillDownEnabled ? "pointer" : "default"}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      default: // line
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={chartData} onClick={handleDataPointClick}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 12 }}
                stroke="#666"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                stroke="#666"
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="displayValue" 
                stroke={color}
                strokeWidth={2}
                dot={{ fill: color, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                cursor={drillDownEnabled ? "pointer" : "default"}
              />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          {showTrend && (
            <div className="flex items-center space-x-2">
              {getTrendIcon()}
              <span className={`text-sm font-medium ${getTrendColor()}`}>
                {Math.abs(trendPercentage).toFixed(1)}%
              </span>
              <span className="text-sm text-muted-foreground">
                vs previous period
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {onTimeRangeChange && (
            <div className="flex items-center space-x-1">
              {(["7d", "30d", "90d", "1y"] as TimeRange[]).map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onTimeRangeChange(range)}
                  className="h-7 px-2 text-xs"
                >
                  {range}
                </Button>
              ))}
            </div>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onChartTypeChange && (
                <>
                  <DropdownMenuItem onClick={() => onChartTypeChange("line")}>
                    Line Chart
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onChartTypeChange("bar")}>
                    Bar Chart
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onChartTypeChange("area")}>
                    Area Chart
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onChartTypeChange("pie")}>
                    Pie Chart
                  </DropdownMenuItem>
                </>
              )}
              {onExport && (
                <DropdownMenuItem onClick={onExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Data
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent>
        {renderChart()}
        
        {hoveredData && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{hoveredData.label}</span>
              <span className="text-sm">{hoveredData.value}</span>
            </div>
            {hoveredData.category && (
              <div className="mt-1">
                <Badge variant="outline" className="text-xs">
                  {hoveredData.category}
                </Badge>
              </div>
            )}
          </div>
        )}
        
        {drillDownEnabled && (
          <div className="mt-2 text-xs text-muted-foreground">
            Click on data points to drill down for more details
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ⚡ PERFORMANCE: Export memoized version with custom comparison
export const InteractiveChart = memo(InteractiveChartInternal, (prevProps, nextProps) => {
  // Custom comparison to prevent re-renders when data reference changes but content is same
  return (
    prevProps.title === nextProps.title &&
    prevProps.chartType === nextProps.chartType &&
    prevProps.timeRange === nextProps.timeRange &&
    prevProps.data.length === nextProps.data.length &&
    JSON.stringify(prevProps.data) === JSON.stringify(nextProps.data)
  );
});

InteractiveChart.displayName = 'InteractiveChart';

// Specialized chart components for common dashboard use cases
interface ProductivityChartProps {
  data: ChartDataPoint[];
  timeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
}

function ProductivityChartInternal({ data, timeRange, onTimeRangeChange }: ProductivityChartProps) {
  return (
    <InteractiveChart
      title="Team Productivity"
      data={data}
      chartType="area"
      timeRange={timeRange}
      onTimeRangeChange={onTimeRangeChange}
      showTrend={true}
      color="#8b5cf6"
      height={250}
    />
  );
}

export const ProductivityChart = memo(ProductivityChartInternal);
ProductivityChart.displayName = 'ProductivityChart';

interface TaskCompletionChartProps {
  data: ChartDataPoint[];
  onDrillDown?: (dataPoint: ChartDataPoint) => void;
}

function TaskCompletionChartInternal({ data, onDrillDown }: TaskCompletionChartProps) {
  return (
    <InteractiveChart
      title="Task Completion by Project"
      data={data}
      chartType="bar"
      showTrend={false}
      color="#10b981"
      height={250}
      drillDownEnabled={true}
      onDrillDown={onDrillDown}
    />
  );
}

export const TaskCompletionChart = memo(TaskCompletionChartInternal);
TaskCompletionChart.displayName = 'TaskCompletionChart';

interface ProjectHealthChartProps {
  data: ChartDataPoint[];
}

function ProjectHealthChartInternal({ data }: ProjectHealthChartProps) {
  return (
    <InteractiveChart
      title="Project Health Overview"
      data={data}
      chartType="pie"
      showTrend={false}
      height={250}
    />
  );
}

export const ProjectHealthChart = memo(ProjectHealthChartInternal);
ProjectHealthChart.displayName = 'ProjectHealthChart'; 