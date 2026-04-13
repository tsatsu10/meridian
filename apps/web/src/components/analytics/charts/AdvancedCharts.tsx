// @epic-3.5-analytics: Advanced Interactive Charts for Phase 3 Analytics
// Enhanced data visualization with drill-down capabilities

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  LineChart,
  ZoomIn,
  Filter,
  Download,
  Maximize2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  metadata?: Record<string, any>;
}

interface TimeSeriesPoint {
  timestamp: string;
  value: number;
  category?: string;
}

interface AdvancedBarChartProps {
  data: ChartDataPoint[];
  title: string;
  height?: number;
  interactive?: boolean;
  onBarClick?: (dataPoint: ChartDataPoint) => void;
  showValues?: boolean;
  colorScheme?: 'blue' | 'green' | 'purple' | 'gradient';
}

interface LineChartProps {
  data: TimeSeriesPoint[];
  title: string;
  height?: number;
  showTrend?: boolean;
  interactive?: boolean;
  onPointClick?: (point: TimeSeriesPoint) => void;
}

interface DonutChartProps {
  data: ChartDataPoint[];
  title: string;
  centerValue?: string;
  centerLabel?: string;
  interactive?: boolean;
  onSegmentClick?: (segment: ChartDataPoint) => void;
}

interface HeatmapProps {
  data: Array<{
    x: string;
    y: string;
    value: number;
    intensity: number;
  }>;
  title: string;
  colorScale?: 'blue' | 'green' | 'red' | 'viridis';
}

// Advanced Bar Chart with hover effects and click interactions
export function AdvancedBarChart({ 
  data, 
  title, 
  height = 300, 
  interactive = true, 
  onBarClick, 
  showValues = true,
  colorScheme = 'blue' 
}: AdvancedBarChartProps) {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [selectedBar, setSelectedBar] = useState<number | null>(null);

  const validData = data.filter(d => d && typeof d.value === 'number' && !isNaN(d.value));
  const maxValue = validData.length > 0 ? Math.max(...validData.map(d => d.value)) : 1;
  const colorPalette = {
    blue: ['#dbeafe', '#3b82f6', '#1d4ed8'],
    green: ['#dcfce7', '#22c55e', '#15803d'],
    purple: ['#f3e8ff', '#a855f7', '#7c3aed'],
    gradient: ['#fef3c7', '#f59e0b', '#d97706']
  };

  const getBarColor = (index: number, value: number) => {
    const colors = colorPalette[colorScheme];
    if (selectedBar === index) return colors[2];
    if (hoveredBar === index) return colors[1];
    
    // Gradient based on value
    const intensity = value / maxValue;
    if (intensity > 0.7) return colors[2];
    if (intensity > 0.4) return colors[1];
    return colors[0];
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>{title}</span>
          </div>
          {interactive && (
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {validData.length === 0 ? (
          <div className="flex items-center justify-center" style={{ height }}>
            <div className="text-center text-gray-500">
              <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No data available</p>
            </div>
          </div>
        ) : (
          <div className="relative" style={{ height }}>
            <svg width="100%" height="100%" viewBox="0 0 400 300" className="overflow-visible">
              {validData.map((item, index) => {
              const safeValue = Math.max(0, item.value || 0);
              // Use viewBox coordinates (400x300) instead of percentages
              const barHeight = maxValue > 0 ? (safeValue / maxValue) * (300 - 60) : 0;
              const barWidth = Math.max(20, validData.length > 0 ? (400 / validData.length) - 2 : 90);
              const x = validData.length > 0 ? (index * (400 / validData.length)) + 1 : 5;
              const y = 300 - Math.max(0, barHeight) - 40;

              return (
                <g key={index}>
                  {/* Bar */}
                  <rect
                    x={Math.max(0, x)}
                    y={Math.max(0, y)}
                    width={Math.max(0, barWidth)}
                    height={Math.max(0, barHeight)}
                    fill={getBarColor(index, safeValue)}
                    className={cn(
                      "transition-all duration-200",
                      interactive && "cursor-pointer hover:opacity-80"
                    )}
                    onMouseEnter={() => interactive && setHoveredBar(index)}
                    onMouseLeave={() => interactive && setHoveredBar(null)}
                    onClick={() => {
                      if (interactive) {
                        setSelectedBar(selectedBar === index ? null : index);
                        onBarClick?.(item);
                      }
                    }}
                  />
                  
                  {/* Value label */}
                  {showValues && (
                    <text
                      x={x + barWidth/2}
                      y={Math.max(15, y - 5)}
                      textAnchor="middle"
                      className="text-xs fill-gray-600 dark:fill-gray-400"
                    >
                      {safeValue}
                    </text>
                  )}
                  
                  {/* X-axis label */}
                  <text
                    x={x + barWidth/2}
                    y={290} // Use viewBox height minus margin
                    textAnchor="middle"
                    className="text-xs fill-gray-600 dark:fill-gray-400"
                  >
                    {(item.label || '').length > 8 ? `${item.label.slice(0, 8)}...` : (item.label || '')}
                  </text>
                </g>
              );
            })}
          </svg>
          
          {/* Tooltip */}
          {hoveredBar !== null && hoveredBar < validData.length && (
            <div className="absolute bg-black text-white px-2 py-1 rounded text-sm pointer-events-none z-10"
                 style={{
                   left: `${(hoveredBar * (100 / validData.length)) + 50}%`,
                   top: '20px'
                 }}>
              {validData[hoveredBar]?.label || 'Unknown'}: {validData[hoveredBar]?.value || 0}
            </div>
          )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Interactive Line Chart with trend analysis
export function InteractiveLineChart({ 
  data, 
  title, 
  height = 300, 
  showTrend = true, 
  interactive = true, 
  onPointClick 
}: LineChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [selectedRange, setSelectedRange] = useState<[number, number] | null>(null);

  const sortedData = useMemo(() => 
    [...data].filter(d => d && typeof d.value === 'number' && !isNaN(d.value) && d.timestamp)
              .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [data]
  );

  const maxValue = sortedData.length > 0 ? Math.max(...sortedData.map(d => d.value)) : 100;
  const minValue = sortedData.length > 0 ? Math.min(...sortedData.map(d => d.value)) : 0;

  // Calculate trend line
  const trendPoints = useMemo(() => {
    if (!showTrend || sortedData.length < 2) return null;
    
    const n = sortedData.length;
    const sumX = sortedData.reduce((sum, _, i) => sum + i, 0);
    const sumY = sortedData.reduce((sum, d) => sum + d.value, 0);
    const sumXY = sortedData.reduce((sum, d, i) => sum + i * d.value, 0);
    const sumXX = sortedData.reduce((sum, _, i) => sum + i * i, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return [
      { x: 0, y: intercept },
      { x: n - 1, y: slope * (n - 1) + intercept }
    ];
  }, [sortedData, showTrend]);

  const getPointPosition = (index: number, value: number) => {
    // Use absolute coordinates instead of percentages for SVG viewBox
    const x = sortedData.length > 1 ? (index / (sortedData.length - 1)) * 400 : 200; // Use viewBox width
    const range = maxValue - minValue;
    const y = range > 0 ? ((maxValue - value) / range) * (300 - 80) + 40 : 150; // Use viewBox height
    return { x: Math.max(0, Math.min(400, x)), y: Math.max(40, Math.min(260, y)) };
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <LineChart className="h-5 w-5" />
            <span>{title}</span>
          </div>
          <div className="flex items-center space-x-2">
            {showTrend && (
              <Badge variant="outline" className="text-xs">
                Trend: {trendPoints && trendPoints[1].y > trendPoints[0].y ? (
                  <TrendingUp className="h-3 w-3 text-green-500 ml-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500 ml-1" />
                )}
              </Badge>
            )}
            <Button variant="outline" size="sm">
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedData.length === 0 ? (
          <div className="flex items-center justify-center" style={{ height }}>
            <div className="text-center text-gray-500">
              <LineChart className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No data available</p>
            </div>
          </div>
        ) : (
          <div className="relative" style={{ height }}>
            <svg width="100%" height="100%" viewBox="0 0 400 300" className="overflow-visible">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
              <line
                key={ratio}
                x1="0"
                y1={40 + ratio * (300 - 80)} // Use viewBox height (300) instead of height
                x2="400" // Use viewBox width (400) instead of percentage
                y2={40 + ratio * (300 - 80)}
                stroke="#e5e7eb"
                strokeWidth="1"
                className="dark:stroke-gray-700"
              />
            ))}
            
            {/* Trend line */}
            {trendPoints && (
              <line
                x1={(trendPoints[0].x / (sortedData.length - 1)) * 400} // Convert to absolute coordinates
                y1={((maxValue - trendPoints[0].y) / (maxValue - minValue)) * (300 - 80) + 40}
                x2={(trendPoints[1].x / (sortedData.length - 1)) * 400} // Convert to absolute coordinates
                y2={((maxValue - trendPoints[1].y) / (maxValue - minValue)) * (300 - 80) + 40}
                stroke="#6366f1"
                strokeWidth="2"
                strokeDasharray="5,5"
                opacity="0.7"
              />
            )}
            
            {/* Data line */}
            <path
              d={`M ${sortedData.map((d, i) => {
                const pos = getPointPosition(i, d.value);
                // getPointPosition now returns absolute coordinates
                return `${pos.x} ${pos.y}`;
              }).join(' L ')}`}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="3"
              className="drop-shadow-sm"
            />
            
            {/* Data points */}
            {sortedData.map((point, index) => {
              const pos = getPointPosition(index, point.value);
              const isHovered = hoveredPoint === index;
              // getPointPosition now returns absolute coordinates
              
              return (
                <circle
                  key={index}
                  cx={pos.x}
                  cy={pos.y}
                  r={isHovered ? 8 : 5}
                  fill="#3b82f6"
                  stroke="white"
                  strokeWidth="2"
                  className={cn(
                    "transition-all duration-200",
                    interactive && "cursor-pointer hover:fill-blue-600"
                  )}
                  onMouseEnter={() => interactive && setHoveredPoint(index)}
                  onMouseLeave={() => interactive && setHoveredPoint(null)}
                  onClick={() => {
                    if (interactive && onPointClick) {
                      onPointClick(point);
                    }
                  }}
                />
              );
            })}
            
            {/* Y-axis labels */}
            {[maxValue, (maxValue + minValue) / 2, minValue].map((value, index) => (
              <text
                key={index}
                x="5"
                y={40 + index * (300 - 80) / 2} // Use viewBox height instead of dynamic height
                className="text-xs fill-gray-600 dark:fill-gray-400"
                dominantBaseline="middle"
              >
                {Math.round(value)}
              </text>
            ))}
          </svg>
          
          {/* Tooltip */}
          {hoveredPoint !== null && (
            <div className="absolute bg-black text-white px-3 py-2 rounded text-sm pointer-events-none z-10"
                 style={{
                   left: `${(hoveredPoint / (sortedData.length - 1)) * 100}%`,
                   top: '10px',
                   transform: 'translateX(-50%)'
                 }}>
              <div>{new Date(sortedData[hoveredPoint].timestamp).toLocaleDateString()}</div>
              <div className="font-bold">{sortedData[hoveredPoint].value}</div>
            </div>
          )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Interactive Donut Chart with center value display
export function InteractiveDonutChart({ 
  data, 
  title, 
  centerValue, 
  centerLabel, 
  interactive = true, 
  onSegmentClick 
}: DonutChartProps) {
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null);

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const centerX = 150;
  const centerY = 150;
  const radius = 100;
  const innerRadius = 60;

  let currentAngle = 0;
  const segments = data.map((item, index) => {
    const angle = (item.value / total) * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle += angle;

    const largeArcFlag = angle > Math.PI ? 1 : 0;
    
    const x1 = centerX + radius * Math.cos(startAngle);
    const y1 = centerY + radius * Math.sin(startAngle);
    const x2 = centerX + radius * Math.cos(endAngle);
    const y2 = centerY + radius * Math.sin(endAngle);
    
    const innerX1 = centerX + innerRadius * Math.cos(startAngle);
    const innerY1 = centerY + innerRadius * Math.sin(startAngle);
    const innerX2 = centerX + innerRadius * Math.cos(endAngle);
    const innerY2 = centerY + innerRadius * Math.sin(endAngle);

    const pathData = [
      `M ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      `L ${innerX2} ${innerY2}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerX1} ${innerY1}`,
      'Z'
    ].join(' ');

    return {
      pathData,
      color: item.color || `hsl(${(index * 360) / data.length}, 70%, 50%)`,
      item,
      index,
      percentage: ((item.value / total) * 100).toFixed(1)
    };
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <PieChart className="h-5 w-5" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-6">
          <div className="relative">
            <svg width="300" height="300" className="overflow-visible">
              {segments.map((segment) => (
                <path
                  key={segment.index}
                  d={segment.pathData}
                  fill={segment.color}
                  className={cn(
                    "transition-all duration-200",
                    interactive && "cursor-pointer",
                    hoveredSegment === segment.index && "opacity-80 transform scale-105",
                    selectedSegment === segment.index && "stroke-white stroke-2"
                  )}
                  onMouseEnter={() => interactive && setHoveredSegment(segment.index)}
                  onMouseLeave={() => interactive && setHoveredSegment(null)}
                  onClick={() => {
                    if (interactive) {
                      setSelectedSegment(selectedSegment === segment.index ? null : segment.index);
                      onSegmentClick?.(segment.item);
                    }
                  }}
                />
              ))}
              
              {/* Center text */}
              <text
                x={centerX}
                y={centerY - 10}
                textAnchor="middle"
                className="text-2xl font-bold fill-gray-900 dark:fill-gray-100"
              >
                {centerValue || total}
              </text>
              <text
                x={centerX}
                y={centerY + 15}
                textAnchor="middle"
                className="text-sm fill-gray-600 dark:fill-gray-400"
              >
                {centerLabel || 'Total'}
              </text>
            </svg>
          </div>
          
          {/* Legend */}
          <div className="space-y-2">
            {segments.map((segment) => (
              <div 
                key={segment.index}
                className={cn(
                  "flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors",
                  hoveredSegment === segment.index && "bg-gray-100 dark:bg-gray-800",
                  selectedSegment === segment.index && "bg-blue-50 dark:bg-blue-900/20"
                )}
                onMouseEnter={() => setHoveredSegment(segment.index)}
                onMouseLeave={() => setHoveredSegment(null)}
                onClick={() => setSelectedSegment(selectedSegment === segment.index ? null : segment.index)}
              >
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: segment.color }}
                />
                <span className="text-sm">{segment.item.label}</span>
                <Badge variant="secondary" className="text-xs">
                  {segment.percentage}%
                </Badge>
              </div>
            ))}
          </div>
        </div>
        
        {/* Detailed view for selected segment */}
        {selectedSegment !== null && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100">
              {segments[selectedSegment].item.label}
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Value: {segments[selectedSegment].item.value} ({segments[selectedSegment].percentage}% of total)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Heatmap visualization for correlation analysis
export function InteractiveHeatmap({ data, title, colorScale = 'blue' }: HeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{x: string, y: string, value: number} | null>(null);

  const xLabels = Array.from(new Set(data.map(d => d.x)));
  const yLabels = Array.from(new Set(data.map(d => d.y)));
  const maxIntensity = Math.max(...data.map(d => d.intensity));

  const getColor = (intensity: number) => {
    const normalizedIntensity = intensity / maxIntensity;
    const colorMaps = {
      blue: `rgba(59, 130, 246, ${normalizedIntensity})`,
      green: `rgba(34, 197, 94, ${normalizedIntensity})`,
      red: `rgba(239, 68, 68, ${normalizedIntensity})`,
      viridis: `rgba(${Math.round(68 + normalizedIntensity * 187)}, ${Math.round(1 + normalizedIntensity * 254)}, ${Math.round(84 + normalizedIntensity * 171)}, ${normalizedIntensity})`
    };
    return colorMaps[colorScale];
  };

  const cellWidth = 300 / xLabels.length;
  const cellHeight = 200 / yLabels.length;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <svg width="400" height="280">
            {data.map((cell, index) => {
              const xIndex = xLabels.indexOf(cell.x);
              const yIndex = yLabels.indexOf(cell.y);
              
              return (
                <rect
                  key={index}
                  x={50 + xIndex * cellWidth}
                  y={30 + yIndex * cellHeight}
                  width={cellWidth - 1}
                  height={cellHeight - 1}
                  fill={getColor(cell.intensity)}
                  stroke="#fff"
                  strokeWidth="1"
                  className="cursor-pointer transition-opacity hover:opacity-80"
                  onMouseEnter={() => setHoveredCell(cell)}
                  onMouseLeave={() => setHoveredCell(null)}
                />
              );
            })}
            
            {/* X-axis labels */}
            {xLabels.map((label, index) => (
              <text
                key={index}
                x={50 + index * cellWidth + cellWidth / 2}
                y={250}
                textAnchor="middle"
                className="text-xs fill-gray-600 dark:fill-gray-400"
              >
                {label}
              </text>
            ))}
            
            {/* Y-axis labels */}
            {yLabels.map((label, index) => (
              <text
                key={index}
                x={40}
                y={30 + index * cellHeight + cellHeight / 2}
                textAnchor="end"
                dominantBaseline="middle"
                className="text-xs fill-gray-600 dark:fill-gray-400"
              >
                {label}
              </text>
            ))}
          </svg>
          
          {/* Tooltip */}
          {hoveredCell && (
            <div className="absolute bg-black text-white px-3 py-2 rounded text-sm pointer-events-none z-10"
                 style={{ left: '50%', top: '10px', transform: 'translateX(-50%)' }}>
              <div>{hoveredCell.x} × {hoveredCell.y}</div>
              <div className="font-bold">Value: {hoveredCell.value}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}