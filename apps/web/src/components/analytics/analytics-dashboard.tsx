import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import {
  BarChart,
  LineChart,
  PieChart,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Bar,
  Line,
  Area,
  Pie,
  Cell
} from '../charts/SafeRechartsComponents';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  MessageSquare, 
  Activity, 
  AlertTriangle,
  Download,
  RefreshCw,
  Calendar,
  Clock,
  Hash,
  Zap
} from 'lucide-react';
import { useChatAnalytics } from '../../hooks/useChatAnalytics';
import { usePerformanceMonitoring } from '../../hooks/usePerformanceMonitoring';
import { AdvancedPDFTemplates } from './advanced-pdf-templates';
import { AdvancedMLInsights } from './advanced-ml-insights';
import { logger } from "../../lib/logger";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  icon: React.ElementType;
  description?: string;
}

interface ChartContainerProps {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  change, 
  trend = 'stable', 
  icon: Icon, 
  description 
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Icon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              {description && (
                <p className="text-xs text-gray-500 mt-1">{description}</p>
              )}
            </div>
          </div>
          {change !== undefined && (
            <div className={`flex items-center space-x-1 ${getTrendColor()}`}>
              {getTrendIcon()}
              <span className="text-sm font-medium">
                {Math.abs(change)}%
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const ChartContainer: React.FC<ChartContainerProps> = ({ title, children, actions }) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        {actions && <div className="flex space-x-2">{actions}</div>}
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
};

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16'];

export const AnalyticsDashboard: React.FC = () => {
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '1d' | '1w' | '1m'>('1d');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const { 
    analyticsData, 
    isLoading: analyticsLoading, 
    error: analyticsError,
    getMessageVolumeByPeriod,
    getUserEngagementMetrics,
    getTopChannelsByActivity,
    getTopUsersByEngagement,
    getPeakActivityHours,
    exportAnalyticsData,
    refreshData
  } = useChatAnalytics();

  const {
    performanceData,
    isMonitoring,
    error: performanceError,
    getPerformanceReport,
    exportPerformanceData
  } = usePerformanceMonitoring();

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshData();
      setLastRefresh(new Date());
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, refreshData]);

  // Memoized chart data
  const messageVolumeData = useMemo(() => {
    return getMessageVolumeByPeriod(selectedTimeRange).map(data => ({
      time: data.timestamp.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        ...(selectedTimeRange === '1w' || selectedTimeRange === '1m' ? { 
          month: 'short', 
          day: 'numeric' 
        } : {})
      }),
      messages: data.value
    }));
  }, [selectedTimeRange, getMessageVolumeByPeriod]);

  const channelActivityData = useMemo(() => {
    return getTopChannelsByActivity(10).map(channel => ({
      name: channel.channelName,
      messages: channel.totalMessages,
      activeUsers: channel.activeMembers,
      engagement: channel.retentionRate
    }));
  }, [getTopChannelsByActivity]);

  const userEngagementData = useMemo(() => {
    const users = getUserEngagementMetrics();
    return users.slice(0, 10).map(user => ({
      name: user.username,
      score: user.engagementScore,
      messages: user.messagesCount,
      timeSpent: Math.round(user.timeSpent / 1000 / 60) // Convert to minutes
    }));
  }, [getUserEngagementMetrics]);

  const peakHoursData = useMemo(() => {
    return getPeakActivityHours().slice(0, 12).map(data => ({
      hour: `${data.hour}:00`,
      activity: data.activity
    }));
  }, [getPeakActivityHours]);

  const performanceMetricsData = useMemo(() => {
    if (!performanceData) return [];
    
    return [
      { name: 'LCP', value: performanceData.webVitals.lcp, target: 2500 },
      { name: 'FID', value: performanceData.webVitals.fid, target: 100 },
      { name: 'CLS', value: performanceData.webVitals.cls * 1000, target: 100 },
      { name: 'FCP', value: performanceData.webVitals.fcp, target: 1800 },
      { name: 'TTFB', value: performanceData.webVitals.ttfb, target: 600 }
    ];
  }, [performanceData]);

  const handleExport = async (type: 'analytics' | 'performance') => {
    try {
      if (type === 'analytics') {
        await exportAnalyticsData('json', {
          includeRawData: true,
          metrics: ['messages', 'users', 'channels', 'engagement']
        });
      } else {
        await exportPerformanceData('json');
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const isLoading = analyticsLoading || !analyticsData;
  const hasError = analyticsError || performanceError;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Analytics Error</h3>
          <p className="text-gray-600 mb-4">{analyticsError || performanceError}</p>
          <Button onClick={refreshData}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Real-time insights into your workspace activity
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
          </div>
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto-refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('analytics')}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Messages"
          value={analyticsData.overview.totalMessages.toLocaleString()}
          change={analyticsData.overview.messageGrowth}
          trend={analyticsData.overview.messageGrowth > 0 ? 'up' : 'down'}
          icon={MessageSquare}
          description="All time"
        />
        <MetricCard
          title="Active Users"
          value={analyticsData.overview.activeUsers}
          change={analyticsData.overview.userGrowth}
          trend={analyticsData.overview.userGrowth > 0 ? 'up' : 'down'}
          icon={Users}
          description="Currently online"
        />
        <MetricCard
          title="Channels"
          value={analyticsData.overview.totalChannels}
          icon={Hash}
          description="Active workspaces"
        />
        <MetricCard
          title="System Health"
          value={`${analyticsData.overview.systemHealth}%`}
          change={analyticsData.overview.systemHealth > 95 ? 5 : -2}
          trend={analyticsData.overview.systemHealth > 95 ? 'up' : 'down'}
          icon={Zap}
          description="Operational status"
        />
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="messages" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Time Range Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Time Range:</span>
          {(['1h', '1d', '1w', '1m'] as const).map((range) => (
            <Button
              key={range}
              variant={selectedTimeRange === range ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTimeRange(range)}
            >
              {range}
            </Button>
          ))}
        </div>

        <TabsContent value="messages" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartContainer title="Message Volume Over Time">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={messageVolumeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="messages" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>

            <ChartContainer title="Peak Activity Hours">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={peakHoursData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="activity" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          <ChartContainer title="Message Types Distribution">
            <ChartWrapper height={300}>
              <PieChart>
                <Pie
                  data={Object.entries(analyticsData.messageMetrics.byType).map(([type, count]) => ({
                    name: type,
                    value: count
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {Object.keys(analyticsData.messageMetrics.byType).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ChartWrapper>
          </ChartContainer>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartContainer title="Top Users by Engagement">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={userEngagementData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="score" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>

            <ChartContainer title="User Activity Distribution">
              <div className="space-y-4">
                {analyticsData.userEngagement.engagementDistribution.map((dist, index) => (
                  <div key={dist.range} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{dist.range}% engagement</span>
                    <div className="flex items-center space-x-2 flex-1 mx-4">
                      <Progress 
                        value={(dist.count / analyticsData.overview.totalUsers) * 100} 
                        className="flex-1"
                      />
                      <span className="text-sm text-gray-600">{dist.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ChartContainer>
          </div>

          <ChartContainer title="User Retention Cohorts">
            <ChartWrapper height={300}>
              <LineChart data={analyticsData.userEngagement.retentionCohorts.map((cohort, index) => ({
                cohort: cohort.cohort,
                ...cohort.retention.reduce((acc, val, i) => ({ ...acc, [`week${i + 1}`]: val }), {})
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="cohort" />
                <YAxis />
                <Tooltip />
                <Legend />
                {Array.from({ length: 7 }, (_, i) => (
                  <Line 
                    key={i}
                    type="monotone" 
                    dataKey={`week${i + 1}`} 
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ChartWrapper>
          </ChartContainer>
        </TabsContent>

        <TabsContent value="channels" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartContainer title="Channel Activity">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={channelActivityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="messages" fill="#3B82F6" />
                  <Bar dataKey="activeUsers" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>

            <ChartContainer title="Channel Engagement Rates">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={channelActivityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="engagement" 
                    stroke="#F59E0B" 
                    fill="#F59E0B" 
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {getTopChannelsByActivity(3).map((channel, index) => (
              <Card key={channel.channelId}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{channel.channelName}</h4>
                    <Badge variant={channel.channelType === 'private' ? 'secondary' : 'default'}>
                      {channel.channelType}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Messages</span>
                      <span className="font-medium">{channel.totalMessages}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Members</span>
                      <span className="font-medium">{channel.memberCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Active</span>
                      <span className="font-medium">{channel.activeMembers}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {performanceData && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  title="Error Rate"
                  value={`${performanceData.systemHealth.errorRate.toFixed(2)}%`}
                  change={performanceData.systemHealth.errorRate < 1 ? -10 : 15}
                  trend={performanceData.systemHealth.errorRate < 1 ? 'up' : 'down'}
                  icon={AlertTriangle}
                />
                <MetricCard
                  title="Response Time"
                  value={`${performanceData.systemHealth.averageResponseTime}ms`}
                  icon={Activity}
                />
                <MetricCard
                  title="Memory Usage"
                  value={`${performanceData.systemHealth.memoryUsage.toFixed(1)}%`}
                  icon={Activity}
                />
                <MetricCard
                  title="Active Sessions"
                  value={performanceData.systemHealth.activeSessions}
                  icon={Users}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartContainer title="Web Vitals Performance">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={performanceMetricsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3B82F6" />
                      <Bar dataKey="target" fill="#E5E7EB" opacity={0.3} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>

                <ChartContainer 
                  title="Error Trends"
                  actions={
                    <Button size="sm" variant="outline" onClick={() => handleExport('performance')}>
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  }
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={performanceData.errorTracking.errorTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#EF4444" 
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>

              {performanceData.alerts.critical.length > 0 && (
                <Card className="border-red-200 bg-red-50">
                  <CardHeader>
                    <CardTitle className="text-red-800 flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2" />
                      Critical Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {performanceData.alerts.critical.map((alert, index) => (
                        <div key={index} className="flex items-center justify-between bg-white p-3 rounded">
                          <span className="font-medium">{alert.message}</span>
                          <Badge variant="destructive">{alert.severity}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="ai-insights" className="space-y-6">
          <AdvancedMLInsights
            projectData={analyticsData ? [analyticsData] : []}
            teamData={analyticsData ? analyticsData.userEngagement.topUsers : []}
            taskData={analyticsData ? analyticsData.overview : []}
            onInsightAction={(insight, action) => {
              logger.info("Acting on insight ${insight.id} with action: ${action}");
              if (action === 'export') {
                handleExport('ai-insights');
              }
            }}
          />
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <AdvancedPDFTemplates
            onSelectTemplate={(template) => {
              logger.info("Selected template:");
              // Generate report with selected template
            }}
            onCustomizeTemplate={(template) => {
              logger.info("Customizing template:");
              // Open template customization modal
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Real-time Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Real-time Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {analyticsData.realTimeMetrics.activeUsers}
              </div>
              <div className="text-sm text-gray-600">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {analyticsData.realTimeMetrics.messagesPerMinute}
              </div>
              <div className="text-sm text-gray-600">Messages/min</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {analyticsData.realTimeMetrics.averageResponseTime}ms
              </div>
              <div className="text-sm text-gray-600">Avg Response</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {analyticsData.realTimeMetrics.systemLatency}ms
              </div>
              <div className="text-sm text-gray-600">System Latency</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};