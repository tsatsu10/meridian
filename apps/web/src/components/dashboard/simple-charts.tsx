// @epic-3.1-dashboards: Simple chart components for enhanced data visualization
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

export type TimeRange = "7d" | "30d" | "90d" | "1y";

interface ChartDataPoint {
  label: string;
  value: number;
  category?: string;
  trend?: number;
}

interface SimpleChartProps {
  title: string;
  data: ChartDataPoint[];
  timeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  showTrend?: boolean;
  height?: number;
  className?: string;
  color?: string;
}

// Simple Bar Chart Component
export function SimpleBarChart({
  title,
  data,
  timeRange = "30d",
  onTimeRangeChange,
  showTrend = true,
  height = 200,
  className = "",
  color = "#8884d8"
}: SimpleChartProps) {
  const maxValue = Math.max(...data.map(d => d.value));
  
  const trendPercentage = useMemo(() => {
    if (data.length < 2) return 0;
    const current = data[data.length - 1]?.value || 0;
    const previous = data[data.length - 2]?.value || 0;
    return previous === 0 ? 0 : ((current - previous) / previous) * 100;
  }, [data]);

  const getTrendIcon = () => {
    if (trendPercentage > 0) return "↗️";
    if (trendPercentage < 0) return "↘️";
    return "➡️";
  };

  const getTrendColor = () => {
    if (trendPercentage > 0) return "text-green-500";
    if (trendPercentage < 0) return "text-red-500";
    return "text-gray-500";
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          {showTrend && (
            <div className="flex items-center space-x-2">
              <span className="text-sm">{getTrendIcon()}</span>
              <span className={`text-sm font-medium ${getTrendColor()}`}>
                {Math.abs(trendPercentage).toFixed(1)}%
              </span>
              <span className="text-sm text-muted-foreground">
                vs previous period
              </span>
            </div>
          )}
        </div>
        
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
      </CardHeader>
      
      <CardContent>
        <div className="space-y-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm font-medium truncate">{item.label}</span>
              <div className="flex items-center space-x-2 flex-1 ml-4">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(item.value / maxValue) * 100}%`,
                      backgroundColor: color
                    }}
                  />
                </div>
                <span className="text-sm text-muted-foreground min-w-[3rem] text-right">
                  {item.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Simple Line Chart Component
export function SimpleLineChart({
  title,
  data,
  timeRange = "30d",
  onTimeRangeChange,
  showTrend = true,
  height = 200,
  className = "",
  color = "#8884d8"
}: SimpleChartProps) {
  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  
  const trendPercentage = useMemo(() => {
    if (data.length < 2) return 0;
    const current = data[data.length - 1]?.value || 0;
    const previous = data[data.length - 2]?.value || 0;
    return previous === 0 ? 0 : ((current - previous) / previous) * 100;
  }, [data]);

  const getTrendIcon = () => {
    if (trendPercentage > 0) return "↗️";
    if (trendPercentage < 0) return "↘️";
    return "➡️";
  };

  const getTrendColor = () => {
    if (trendPercentage > 0) return "text-green-500";
    if (trendPercentage < 0) return "text-red-500";
    return "text-gray-500";
  };

  // Calculate SVG path for line chart
  const svgWidth = 300;
  const svgHeight = height - 40;
  const padding = 20;
  
  const points = data.map((point, index) => {
    const x = padding + (index / (data.length - 1)) * (svgWidth - 2 * padding);
    const y = svgHeight - padding - ((point.value - minValue) / (maxValue - minValue)) * (svgHeight - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          {showTrend && (
            <div className="flex items-center space-x-2">
              <span className="text-sm">{getTrendIcon()}</span>
              <span className={`text-sm font-medium ${getTrendColor()}`}>
                {Math.abs(trendPercentage).toFixed(1)}%
              </span>
              <span className="text-sm text-muted-foreground">
                vs previous period
              </span>
            </div>
          )}
        </div>
        
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
      </CardHeader>
      
      <CardContent>
        <div className="w-full">
          <svg width="100%" height={height} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
            {/* Grid lines */}
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#f0f0f0" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            {/* Line */}
            <polyline
              fill="none"
              stroke={color}
              strokeWidth="2"
              points={points}
            />
            
            {/* Data points */}
            {data.map((point, index) => {
              const x = padding + (index / (data.length - 1)) * (svgWidth - 2 * padding);
              const y = svgHeight - padding - ((point.value - minValue) / (maxValue - minValue)) * (svgHeight - 2 * padding);
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="3"
                  fill={color}
                  className="hover:r-5 transition-all cursor-pointer"
                />
              );
            })}
          </svg>
        </div>
        
        {/* Labels */}
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          {data.map((point, index) => (
            <span key={index} className="truncate">
              {point.label}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Simple Donut Chart Component
export function SimpleDonutChart({
  title,
  data,
  height = 200,
  className = ""
}: Omit<SimpleChartProps, 'timeRange' | 'onTimeRangeChange' | 'showTrend'>) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];
  
  let currentAngle = 0;
  const radius = 60;
  const center = 80;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center space-x-4">
          <svg width={center * 2} height={center * 2}>
            {data.map((item, index) => {
              const angle = (item.value / total) * 360;
              const startAngle = currentAngle;
              const endAngle = currentAngle + angle;
              
              const x1 = center + radius * Math.cos((startAngle * Math.PI) / 180);
              const y1 = center + radius * Math.sin((startAngle * Math.PI) / 180);
              const x2 = center + radius * Math.cos((endAngle * Math.PI) / 180);
              const y2 = center + radius * Math.sin((endAngle * Math.PI) / 180);
              
              const largeArc = angle > 180 ? 1 : 0;
              
              const pathData = [
                `M ${center} ${center}`,
                `L ${x1} ${y1}`,
                `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
                'Z'
              ].join(' ');
              
              currentAngle += angle;
              
              return (
                <path
                  key={index}
                  d={pathData}
                  fill={colors[index % colors.length]}
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                />
              );
            })}
            
            {/* Inner circle for donut effect */}
            <circle
              cx={center}
              cy={center}
              r={radius * 0.6}
              fill="white"
            />
          </svg>
          
          <div className="space-y-2">
            {data.map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <span className="text-sm">{item.label}</span>
                <Badge variant="outline" className="text-xs">
                  {((item.value / total) * 100).toFixed(1)}%
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Specialized chart components for common dashboard use cases
export function ProductivityChart({ data, timeRange, onTimeRangeChange }: {
  data: ChartDataPoint[];
  timeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
}) {
  return (
    <SimpleLineChart
      title="Team Productivity"
      data={data}
      timeRange={timeRange}
      onTimeRangeChange={onTimeRangeChange}
      showTrend={true}
      color="#8b5cf6"
      height={250}
    />
  );
}

export function TaskCompletionChart({ data }: {
  data: ChartDataPoint[];
}) {
  return (
    <SimpleBarChart
      title="Task Completion by Project"
      data={data}
      showTrend={false}
      color="#10b981"
      height={250}
    />
  );
}

export function ProjectHealthChart({ data }: {
  data: ChartDataPoint[];
}) {
  return (
    <SimpleDonutChart
      title="Project Health Overview"
      data={data}
      height={250}
    />
  );
} 