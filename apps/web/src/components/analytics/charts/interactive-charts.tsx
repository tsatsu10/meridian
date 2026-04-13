import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, LineChart, BarChart, AreaChart, PieChart, ScatterPlot, RadialBarChart, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line, Bar, Area, Pie, Cell, Scatter, RadialBar, Brush, ReferenceLine, ReferenceArea, ChartWrapper } from '../charts/ChartWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import { 
  Download, 
  Filter, 
  TrendingUp, 
  BarChart3, 
  PieChart as PieChartIcon,
  Activity,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from 'lucide-react';

interface ChartDataPoint {
  [key: string]: any;
  timestamp?: Date | string;
  value?: number;
  category?: string;
}

interface ChartConfig {
  type: 'line' | 'bar' | 'area' | 'pie' | 'scatter' | 'radial' | 'composed';
  title: string;
  data: ChartDataPoint[];
  xAxisKey: string;
  yAxisKey: string | string[];
  colorScheme?: string[];
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  enableZoom?: boolean;
  enableBrush?: boolean;
  height?: number;
  animations?: boolean;
}

interface InteractiveChartProps extends ChartConfig {
  onDataSelect?: (data: ChartDataPoint) => void;
  onZoomChange?: (domain: [number, number]) => void;
  className?: string;
}

const CHART_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'
];

const THEME_CONFIGS = {
  default: {
    colors: CHART_COLORS,
    grid: '#E5E7EB',
    text: '#374151',
    background: '#FFFFFF'
  },
  dark: {
    colors: ['#60A5FA', '#34D399', '#FBBF24', '#F87171', '#A78BFA'],
    grid: '#374151',
    text: '#D1D5DB',
    background: '#1F2937'
  },
  minimal: {
    colors: ['#000000', '#4B5563', '#9CA3AF'],
    grid: '#F3F4F6',
    text: '#111827',
    background: '#FFFFFF'
  }
};

export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  type,
  title,
  data,
  xAxisKey,
  yAxisKey,
  colorScheme = CHART_COLORS,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  enableZoom = false,
  enableBrush = false,
  height = 300,
  animations = true,
  onDataSelect,
  onZoomChange,
  className
}) => {
  const [selectedTheme, setSelectedTheme] = useState<keyof typeof THEME_CONFIGS>('default');
  const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const theme = THEME_CONFIGS[selectedTheme];

  // Filter data based on selected category
  const filteredData = useMemo(() => {
    if (selectedCategory === 'all') return data;
    return data.filter(item => item.category === selectedCategory);
  }, [data, selectedCategory]);

  // Get unique categories for filtering
  const categories = useMemo(() => {
    const cats = [...new Set(data.map(item => item.category).filter(Boolean))];
    return cats;
  }, [data]);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{`${xAxisKey}: ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.dataKey}: ${typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Handle zoom
  const handleZoom = (domain: [number, number]) => {
    setZoomDomain(domain);
    onZoomChange?.(domain);
  };

  // Reset zoom
  const resetZoom = () => {
    setZoomDomain(null);
    onZoomChange?.([0, filteredData.length - 1]);
  };

  // Export chart data
  const exportChart = (format: 'png' | 'json' | 'csv') => {
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(filteredData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.toLowerCase().replace(/\s+/g, '-')}-data.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'csv') {
      const headers = Object.keys(filteredData[0] || {});
      const csvContent = [
        headers.join(','),
        ...filteredData.map(row => headers.map(header => row[header]).join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.toLowerCase().replace(/\s+/g, '-')}-data.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Render chart based on type
  const renderChart = () => {
    const commonProps = {
      data: filteredData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
      onClick: onDataSelect
    };

    const xAxisProps = {
      dataKey: xAxisKey,
      tick: { fill: theme.text, fontSize: 12 },
      axisLine: { stroke: theme.grid },
      tickLine: { stroke: theme.grid }
    };

    const yAxisProps = {
      tick: { fill: theme.text, fontSize: 12 },
      axisLine: { stroke: theme.grid },
      tickLine: { stroke: theme.grid }
    };

    const gridProps = showGrid ? {
      strokeDasharray: "3 3",
      stroke: theme.grid
    } : undefined;

    switch (type) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            {showGrid && <CartesianGrid {...gridProps} />}
            <XAxis {...xAxisProps} domain={zoomDomain || undefined} />
            <YAxis {...yAxisProps} />
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend />}
            {Array.isArray(yAxisKey) ? (
              yAxisKey.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colorScheme[index % colorScheme.length]}
                  strokeWidth={2}
                  dot={{ fill: colorScheme[index % colorScheme.length], strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: colorScheme[index % colorScheme.length], strokeWidth: 2 }}
                  animationDuration={animations ? 1000 : 0}
                />
              ))
            ) : (
              <Line
                type="monotone"
                dataKey={yAxisKey}
                stroke={colorScheme[0]}
                strokeWidth={2}
                dot={{ fill: colorScheme[0], strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: colorScheme[0], strokeWidth: 2 }}
                animationDuration={animations ? 1000 : 0}
              />
            )}
            {enableBrush && <Brush dataKey={xAxisKey} height={30} stroke={colorScheme[0]} />}
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            {showGrid && <CartesianGrid {...gridProps} />}
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend />}
            {Array.isArray(yAxisKey) ? (
              yAxisKey.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={colorScheme[index % colorScheme.length]}
                  animationDuration={animations ? 1000 : 0}
                  radius={[2, 2, 0, 0]}
                />
              ))
            ) : (
              <Bar
                dataKey={yAxisKey}
                fill={colorScheme[0]}
                animationDuration={animations ? 1000 : 0}
                radius={[2, 2, 0, 0]}
              />
            )}
            {enableBrush && <Brush dataKey={xAxisKey} height={30} stroke={colorScheme[0]} />}
          </BarChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            {showGrid && <CartesianGrid {...gridProps} />}
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend />}
            {Array.isArray(yAxisKey) ? (
              yAxisKey.map((key, index) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stackId="1"
                  stroke={colorScheme[index % colorScheme.length]}
                  fill={colorScheme[index % colorScheme.length]}
                  fillOpacity={0.6}
                  animationDuration={animations ? 1000 : 0}
                />
              ))
            ) : (
              <Area
                type="monotone"
                dataKey={yAxisKey}
                stroke={colorScheme[0]}
                fill={colorScheme[0]}
                fillOpacity={0.6}
                animationDuration={animations ? 1000 : 0}
              />
            )}
          </AreaChart>
        );

      case 'pie':
        return (
          <PieChart {...commonProps}>
            <Pie
              data={filteredData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey={yAxisKey as string}
              animationDuration={animations ? 1000 : 0}
            >
              {filteredData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colorScheme[index % colorScheme.length]} />
              ))}
            </Pie>
            {showTooltip && <Tooltip />}
          </PieChart>
        );

      case 'scatter':
        return (
          <ScatterPlot {...commonProps}>
            {showGrid && <CartesianGrid {...gridProps} />}
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend />}
            <Scatter
              dataKey={yAxisKey as string}
              fill={colorScheme[0]}
              animationDuration={animations ? 1000 : 0}
            />
          </ScatterPlot>
        );

      case 'radial':
        return (
          <RadialBarChart {...commonProps} innerRadius="20%" outerRadius="90%">
            <RadialBar
              dataKey={yAxisKey as string}
              cornerRadius={10}
              fill={colorScheme[0]}
              animationDuration={animations ? 1000 : 0}
            />
            {showTooltip && <Tooltip />}
          </RadialBarChart>
        );

      default:
        return <div>Unsupported chart type</div>;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            {type === 'line' && <TrendingUp className="h-5 w-5" />}
            {type === 'bar' && <BarChart3 className="h-5 w-5" />}
            {type === 'pie' && <PieChartIcon className="h-5 w-5" />}
            {(type === 'area' || type === 'scatter' || type === 'radial') && <Activity className="h-5 w-5" />}
            <span>{title}</span>
          </CardTitle>

          <div className="flex items-center space-x-2">
            {categories.length > 0 && (
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={selectedTheme} onValueChange={(value: keyof typeof THEME_CONFIGS) => setSelectedTheme(value)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="minimal">Minimal</SelectItem>
              </SelectContent>
            </Select>

            {enableZoom && (
              <div className="flex items-center space-x-1">
                <Button size="sm" variant="outline" onClick={resetZoom}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <Download className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => exportChart('json')}>
                  Export JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportChart('csv')}>
                  Export CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          {renderChart()}
        </ChartWrapper>

        {filteredData.length === 0 && (
          <div className="flex items-center justify-center h-32 text-gray-500">
            No data available for the selected filters
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Pre-configured chart components
export const MessageVolumeChart: React.FC<{
  data: ChartDataPoint[];
  timeRange: string;
}> = ({ data, timeRange }) => (
  <InteractiveChart
    type="line"
    title={`Message Volume (${timeRange})`}
    data={data}
    xAxisKey="time"
    yAxisKey="messages"
    colorScheme={['#3B82F6']}
    enableBrush={timeRange === '1w' || timeRange === '1m'}
    enableZoom={true}
    height={350}
  />
);

export const UserEngagementChart: React.FC<{
  data: ChartDataPoint[];
}> = ({ data }) => (
  <InteractiveChart
    type="bar"
    title="User Engagement Scores"
    data={data}
    xAxisKey="name"
    yAxisKey="score"
    colorScheme={['#10B981']}
    height={300}
  />
);

export const ChannelActivityChart: React.FC<{
  data: ChartDataPoint[];
}> = ({ data }) => (
  <InteractiveChart
    type="composed"
    title="Channel Activity Overview"
    data={data}
    xAxisKey="name"
    yAxisKey={['messages', 'activeUsers']}
    colorScheme={['#3B82F6', '#10B981']}
    height={350}
  />
);

export const ErrorDistributionChart: React.FC<{
  data: ChartDataPoint[];
}> = ({ data }) => (
  <InteractiveChart
    type="pie"
    title="Error Distribution by Category"
    data={data}
    xAxisKey="category"
    yAxisKey="count"
    colorScheme={['#EF4444', '#F59E0B', '#8B5CF6', '#06B6D4']}
    height={300}
  />
);

export const PerformanceMetricsChart: React.FC<{
  data: ChartDataPoint[];
}> = ({ data }) => (
  <InteractiveChart
    type="area"
    title="Performance Metrics Over Time"
    data={data}
    xAxisKey="timestamp"
    yAxisKey={['lcp', 'fid', 'cls']}
    colorScheme={['#3B82F6', '#10B981', '#F59E0B']}
    enableBrush={true}
    height={350}
  />
);

// Chart dashboard component
export const ChartDashboard: React.FC<{
  messageData: ChartDataPoint[];
  userEngagementData: ChartDataPoint[];
  channelData: ChartDataPoint[];
  errorData: ChartDataPoint[];
  performanceData: ChartDataPoint[];
  timeRange: string;
}> = ({
  messageData,
  userEngagementData,
  channelData,
  errorData,
  performanceData,
  timeRange
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MessageVolumeChart data={messageData} timeRange={timeRange} />
            <ChannelActivityChart data={channelData} />
          </div>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <UserEngagementChart data={userEngagementData} />
            <InteractiveChart
              type="scatter"
              title="Engagement vs Activity"
              data={userEngagementData}
              xAxisKey="messages"
              yAxisKey="score"
              colorScheme={['#8B5CF6']}
              height={300}
            />
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <PerformanceMetricsChart data={performanceData} />
        </TabsContent>

        <TabsContent value="errors" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ErrorDistributionChart data={errorData} />
            <InteractiveChart
              type="line"
              title="Error Trends"
              data={errorData}
              xAxisKey="timestamp"
              yAxisKey="count"
              colorScheme={['#EF4444']}
              enableBrush={true}
              height={300}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};