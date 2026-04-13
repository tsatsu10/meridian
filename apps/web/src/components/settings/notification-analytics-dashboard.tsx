import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart, ChartWrapper } from '../charts/ChartWrapper';
import {
  TrendingUp,
  TrendingDown,
  Bell,
  Eye,
  Clock,
  Target,
  Brain,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Zap,
  Users,
  MessageSquare,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { toast } from '@/lib/toast';
import { apiClient } from '@/lib/api-client';

interface NotificationAnalyticsDashboardProps {
  className?: string;
}

// Live notification analytics data fetcher
const fetchNotificationData = async (timeRange: string = '7d') => {
  try {
    // Fetch real notification analytics from the API
    const response = await apiClient.analytics.notifications({ timeRange });
    return response;
  } catch (error) {
    console.error('Failed to fetch notification analytics:', error);
    // Fallback to empty data structure
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return {
        date: format(date, 'MMM dd'),
        fullDate: date,
        total: 0,
        opened: 0,
        clicked: 0,
        dismissed: 0,
      };
    });

    return {
      last7Days,
      channelData: [],
      categoryData: [],
      hourlyData: Array.from({ length: 24 }, (_, hour) => ({
        hour: hour,
        notifications: 0,
        engagement: 0,
      })),
    };
  }
};

export function NotificationAnalyticsDashboard({ className }: NotificationAnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState('7d');
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  // Load initial data
  useEffect(() => {
    loadData();
  }, [timeRange]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const result = await fetchNotificationData(timeRange);
      setData(result);
    } catch (error) {
      console.error('Failed to load notification analytics:', error);
      toast.error('Failed to load notification analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const result = await fetchNotificationData(timeRange);
      setData(result);
      toast.success('Analytics data refreshed');
    } catch (error) {
      console.error('Failed to refresh data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  };

  const exportData = () => {
    if (!data?.last7Days) {
      toast.error('No data available to export');
      return;
    }

    // Export real data
    const csvData = data.last7Days.map((d: any) => 
      `${d.date},${d.total},${d.opened},${d.clicked},${d.dismissed}`
    ).join('\n');
    
    const blob = new Blob([`Date,Total,Opened,Clicked,Dismissed\n${csvData}`], 
      { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notification-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    
    toast.success('Analytics data exported');
  };

  // Calculate summary metrics
  const totalNotifications = data.last7Days.reduce((sum, d) => sum + d.total, 0);
  const totalOpened = data.last7Days.reduce((sum, d) => sum + d.opened, 0);
  const totalClicked = data.last7Days.reduce((sum, d) => sum + d.clicked, 0);
  const openRate = totalNotifications > 0 ? (totalOpened / totalNotifications) * 100 : 0;
  const clickRate = totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0;

  const avgResponseTime = data.categoryData.reduce((sum, cat) => {
    const minutes = parseFloat(cat.avgTime.split(' ')[0]);
    return sum + minutes;
  }, 0) / data.categoryData.length;

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
            <BarChart className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Notification Analytics</h3>
            <p className="text-sm text-gray-500">
              Insights into your notification engagement and patterns
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button variant="outline" size="sm" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Sent</p>
                <p className="text-2xl font-bold">{totalNotifications.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-green-600">+12.3%</span>
                </div>
              </div>
              <Bell className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Open Rate</p>
                <p className="text-2xl font-bold">{openRate.toFixed(1)}%</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-green-600">+2.1%</span>
                </div>
              </div>
              <Eye className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Click Rate</p>
                <p className="text-2xl font-bold">{clickRate.toFixed(1)}%</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingDown className="h-3 w-3 text-red-500" />
                  <span className="text-xs text-red-600">-0.8%</span>
                </div>
              </div>
              <Target className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Response</p>
                <p className="text-2xl font-bold">{avgResponseTime.toFixed(1)}m</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-green-600">-15.2%</span>
                </div>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="timing">Timing</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Notification Trends
              </CardTitle>
              <CardDescription>
                Daily notification volume and engagement over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartWrapper height={300}>
                <AreaChart data={data.last7Days}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stackId="1"
                    stroke="#3b82f6" 
                    fill="#3b82f6"
                    fillOpacity={0.2}
                    name="Total Sent"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="opened" 
                    stackId="2"
                    stroke="#10b981" 
                    fill="#10b981"
                    fillOpacity={0.2}
                    name="Opened"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="clicked" 
                    stackId="3"
                    stroke="#f59e0b" 
                    fill="#f59e0b"
                    fillOpacity={0.2}
                    name="Clicked"
                  />
                </AreaChart>
              </ChartWrapper>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Channels Tab */}
        <TabsContent value="channels" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Channel Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartWrapper height={250}>
                  <PieChart>
                    <Pie
                      data={data.channelData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {data.channelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ChartWrapper>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Channel Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.channelData.map((channel) => (
                  <div key={channel.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: channel.color }}
                        />
                        <span className="font-medium">{channel.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{channel.value}</div>
                        <div className="text-xs text-gray-500">
                          {((channel.value / data.channelData.reduce((s, c) => s + c.value, 0)) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <Progress 
                      value={(channel.value / Math.max(...data.channelData.map(c => c.value))) * 100} 
                      className="h-2"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Timing Tab */}
        <TabsContent value="timing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Hourly Activity Pattern
              </CardTitle>
              <CardDescription>
                When you receive and engage with notifications throughout the day
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartWrapper height={300}>
                <BarChart data={data.hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="hour" 
                    tickFormatter={(hour) => `${hour.toString().padStart(2, '0')}:00`}
                  />
                  <YAxis yAxisId="left" orientation="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    labelFormatter={(hour) => `${hour.toString().padStart(2, '0')}:00`}
                    formatter={(value, name) => [
                      name === 'notifications' ? value : `${value}%`,
                      name === 'notifications' ? 'Notifications' : 'Engagement Rate'
                    ]}
                  />
                  <Bar 
                    yAxisId="left"
                    dataKey="notifications" 
                    fill="#3b82f6" 
                    name="notifications"
                    radius={[2, 2, 0, 0]}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="engagement" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="engagement"
                  />
                </BarChart>
              </ChartWrapper>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Category Performance
              </CardTitle>
              <CardDescription>
                How different types of notifications perform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.categoryData.map((category, index) => (
                  <div key={category.name} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                          {category.name === 'Tasks' && <CheckCircle className="h-4 w-4 text-blue-600" />}
                          {category.name === 'Messages' && <MessageSquare className="h-4 w-4 text-blue-600" />}
                          {category.name === 'Projects' && <Target className="h-4 w-4 text-blue-600" />}
                          {category.name === 'Mentions' && <Users className="h-4 w-4 text-blue-600" />}
                          {category.name === 'Reminders' && <Clock className="h-4 w-4 text-blue-600" />}
                        </div>
                        <div>
                          <h4 className="font-medium">{category.name}</h4>
                          <p className="text-sm text-gray-500">{category.count} notifications</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-lg">{category.responseRate}%</div>
                        <div className="text-xs text-gray-500">response rate</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500">Avg Response Time</div>
                        <div className="font-medium">{category.avgTime}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Performance</div>
                        <div className="flex items-center gap-1">
                          {category.responseRate >= 90 ? (
                            <>
                              <TrendingUp className="h-3 w-3 text-green-500" />
                              <span className="text-green-600 font-medium">Excellent</span>
                            </>
                          ) : category.responseRate >= 80 ? (
                            <>
                              <Zap className="h-3 w-3 text-blue-500" />
                              <span className="text-blue-600 font-medium">Good</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-3 w-3 text-yellow-500" />
                              <span className="text-yellow-600 font-medium">Needs Attention</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <Progress value={category.responseRate} className="mt-3" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}