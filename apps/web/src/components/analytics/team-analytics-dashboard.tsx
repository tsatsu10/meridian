// @epic-3.5-analytics: Phase 3 - Team Analytics Dashboard
// @persona-sarah: PM needs workload and performance insights
// @persona-jennifer: Exec needs high-level team performance view

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Target, 
  Activity, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  BarChart3,
  PieChart,
  LineChart,
  Download,
  Lightbulb,
  Zap,
  Brain,
  Maximize2,
  Filter,
  Calendar,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchApi } from '@/lib/fetch';
import useWorkspaceStore from '@/store/workspace';
import { AdvancedBarChart, InteractiveLineChart, InteractiveDonutChart, InteractiveHeatmap } from './charts/AdvancedCharts';
import ForecastingEngine from './forecasting/ForecastingEngine';
import RealTimeDataStream from './real-time/RealTimeDataStream';
import CustomDashboardConfigurator from './dashboard/CustomDashboardConfigurator';
import { logger } from "../../lib/logger";

interface TeamAnalyticsDashboardProps {
  teamId: string;
  teamName: string;
}

interface WorkloadData {
  teamId: string;
  summary: {
    totalMembers: number;
    totalTasks: number;
    averageCapacity: number;
    balanceScore: number;
    overloadedMembers: number;
    availableMembers: number;
  };
  members: Array<{
    userEmail: string;
    userName: string;
    role: string;
    currentTasks: number;
    capacityPercentage: number;
    stressLevel: 'low' | 'medium' | 'high' | 'critical';
    availabilityStatus: 'available' | 'busy' | 'overloaded' | 'unavailable';
    efficiency: number;
  }>;
  recommendations: Array<{
    type: string;
    priority: string;
    title: string;
    description: string;
    action: string;
  }>;
}

interface PerformanceData {
  teamId: string;
  period: string;
  performance: {
    velocity: number;
    completionRate: number;
    efficiency: number;
    collaborationScore: number;
    totalTasks: number;
    completedTasks: number;
  };
  summary: {
    overallScore: number;
    improvementAreas: string[];
    strengths: string[];
  };
}

interface Insight {
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  recommendations: string[];
  impactScore: number;
  confidenceScore: number;
}

export default function TeamAnalyticsDashboard({ teamId, teamName }: TeamAnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [workloadData, setWorkloadData] = useState<WorkloadData | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [period, setPeriod] = useState('week');
  const [chartData, setChartData] = useState<any>(null);
  const [forecastData, setForecastData] = useState<any>(null);
  const [drillDownMode, setDrillDownMode] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [realTimeData, setRealTimeData] = useState<any[]>([]);
  const [showConfigurator, setShowConfigurator] = useState(false);

  const { workspace } = useWorkspaceStore();

  useEffect(() => {
    if (teamId) {
      loadAnalyticsData();
    }
  }, [teamId, period]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      // Load workload data
      const workloadResponse = await fetchApi(`/team/${teamId}/workload`);
      setWorkloadData(workloadResponse);

      // Load performance data
      const performanceResponse = await fetchApi(`/team/${teamId}/performance?period=${period}`);
      setPerformanceData(performanceResponse);

      // Load insights
      const insightsResponse = await fetchApi(`/team/${teamId}/insights`);
      setInsights(insightsResponse.insights?.high || []);

      // Prepare chart data
      prepareChartData(workloadResponse, performanceResponse);
      
      // Prepare forecast data
      prepareForecastData(performanceResponse);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const prepareChartData = (workload: WorkloadData, performance: PerformanceData) => {
    const data = {
      workloadDistribution: workload?.members?.map(member => ({
        label: member.userName || 'Unknown',
        value: Math.max(0, member.capacityPercentage || 0),
        color: member.stressLevel === 'critical' ? '#ef4444' : 
               member.stressLevel === 'high' ? '#f97316' : 
               member.stressLevel === 'medium' ? '#eab308' : '#22c55e'
      })).filter(item => item.value > 0) || [],
      performanceMetrics: [
        { label: 'Velocity', value: Math.max(0, performance?.performance.velocity || 0) },
        { label: 'Completion', value: Math.max(0, performance?.performance.completionRate || 0) },
        { label: 'Efficiency', value: Math.max(0, performance?.performance.efficiency || 0) },
        { label: 'Collaboration', value: Math.max(0, performance?.performance.collaborationScore || 0) }
      ],
      taskDistribution: [
        { label: 'Completed', value: Math.max(0, performance?.performance.completedTasks || 0), color: '#22c55e' },
        { label: 'In Progress', value: Math.max(0, (performance?.performance.totalTasks || 0) - (performance?.performance.completedTasks || 0)), color: '#3b82f6' },
        { label: 'Pending', value: Math.max(0, (workload?.summary.totalTasks || 0) - (performance?.performance.totalTasks || 0)), color: '#6b7280' }
      ].filter(item => item.value > 0)
    };
    setChartData(data);
  };

  const prepareForecastData = (performance: PerformanceData) => {
    // Generate sample historical data for forecasting
    const historicalData = [];
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - 30);
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + i);
      
      historicalData.push({
        timestamp: date.toISOString(),
        value: (performance?.performance.velocity || 10) + Math.random() * 5 - 2.5
      });
    }
    
    setForecastData(historicalData);
  };

  const handleDrillDown = (metric: string) => {
    setSelectedMetric(metric);
    setDrillDownMode(true);
  };

  const handleMetricClick = (dataPoint: any) => {
    logger.info("Metric clicked:");
    // Implement drill-down functionality
  };

  const getStressLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high': return <TrendingUp className="h-4 w-4 text-orange-500" />;
      case 'medium': return <Activity className="h-4 w-4 text-yellow-500" />;
      default: return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Team Analytics</h2>
          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-32 rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="bg-gray-200 dark:bg-gray-700 h-4 w-20 rounded"></div>
                  <div className="bg-gray-200 dark:bg-gray-700 h-8 w-16 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {teamName} Analytics
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Comprehensive team performance and workload insights
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md text-sm"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
          </select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Overall Score</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {performanceData?.summary.overallScore || 0}%
                </p>
              </div>
              <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Team Velocity</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {performanceData?.performance.velocity || 0}
                </p>
              </div>
              <div className="h-8 w-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Capacity</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {workloadData?.summary.averageCapacity || 0}%
                </p>
              </div>
              <div className="h-8 w-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Balance Score</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {workloadData?.summary.balanceScore || 0}%
                </p>
              </div>
              <div className="h-8 w-8 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                <Target className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="workload">Workload</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="forecasting">Forecasting</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
          <TabsTrigger value="realtime">Real-time</TabsTrigger>
          <TabsTrigger value="custom">Custom</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Interactive Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {chartData?.performanceMetrics && (
              <AdvancedBarChart
                data={chartData.performanceMetrics}
                title="Performance Metrics"
                height={250}
                interactive={true}
                onBarClick={handleMetricClick}
                colorScheme="gradient"
                showValues={true}
              />
            )}
            
            {chartData?.taskDistribution && (
              <InteractiveDonutChart
                data={chartData.taskDistribution}
                title="Task Distribution"
                centerValue={chartData.taskDistribution.reduce((sum: number, item: any) => sum + item.value, 0).toString()}
                centerLabel="Total Tasks"
                interactive={true}
                onSegmentClick={handleMetricClick}
              />
            )}
          </div>

          {/* Performance Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Performance Metrics</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Completion Rate</span>
                    <span>{performanceData?.performance.completionRate || 0}%</span>
                  </div>
                  <Progress value={performanceData?.performance.completionRate || 0} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Efficiency</span>
                    <span>{performanceData?.performance.efficiency || 0}%</span>
                  </div>
                  <Progress value={performanceData?.performance.efficiency || 0} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Collaboration</span>
                    <span>{performanceData?.performance.collaborationScore || 0}%</span>
                  </div>
                  <Progress value={performanceData?.performance.collaborationScore || 0} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Team Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Available Members</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {workloadData?.summary.availableMembers || 0}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Overloaded Members</span>
                  <Badge variant="secondary" className="bg-red-100 text-red-800">
                    {workloadData?.summary.overloadedMembers || 0}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Tasks</span>
                  <Badge variant="outline">
                    {workloadData?.summary.totalTasks || 0}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Strengths and Areas for Improvement */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Team Strengths</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {performanceData?.summary.strengths?.map((strength, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{strength}</span>
                    </div>
                  )) || <p className="text-sm text-gray-600">No specific strengths identified yet.</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-orange-600">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Improvement Areas</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {performanceData?.summary.improvementAreas?.map((area, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <span className="text-sm">{area}</span>
                    </div>
                  )) || <p className="text-sm text-gray-600">All areas performing well!</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="workload" className="space-y-6">
          {/* Enhanced Workload Visualization */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {chartData?.workloadDistribution && (
              <AdvancedBarChart
                data={chartData.workloadDistribution}
                title="Team Capacity Distribution"
                height={300}
                interactive={true}
                onBarClick={(dataPoint) => handleDrillDown('workload')}
                colorScheme="blue"
                showValues={true}
              />
            )}
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Workload Balance Analysis</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Team Balance Score</span>
                    <Badge variant="outline" className="text-lg font-bold">
                      {workloadData?.summary.balanceScore || 0}%
                    </Badge>
                  </div>
                  <Progress value={workloadData?.summary.balanceScore || 0} className="h-3" />
                  
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {workloadData?.summary.availableMembers || 0}
                      </div>
                      <div className="text-sm text-gray-600">Available</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {workloadData?.summary.overloadedMembers || 0}
                      </div>
                      <div className="text-sm text-gray-600">Overloaded</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Team Workload Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workloadData?.members?.map((member) => (
                  <div key={member.userEmail} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div>
                          <p className="font-medium">{member.userName}</p>
                          <p className="text-sm text-gray-600">{member.role}</p>
                        </div>
                        <Badge className={getStressLevelColor(member.stressLevel)}>
                          {member.stressLevel}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">{member.currentTasks} tasks</p>
                        <p className="text-sm text-gray-600">{member.capacityPercentage}% capacity</p>
                      </div>
                      <div className="w-20">
                        <Progress value={member.capacityPercentage} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Workload Recommendations */}
          {workloadData?.recommendations && workloadData.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lightbulb className="h-5 w-5" />
                  <span>Workload Recommendations</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {workloadData.recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      {getPriorityIcon(rec.priority)}
                      <div className="flex-1">
                        <p className="font-medium text-sm">{rec.title}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{rec.description}</p>
                        <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">{rec.action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {/* Enhanced Performance Metrics */}
          {chartData?.performanceMetrics && (
            <InteractiveLineChart
              data={[
                ...Array.from({length: 7}, (_, i) => ({
                  timestamp: new Date(Date.now() - (6-i) * 24 * 60 * 60 * 1000).toISOString(),
                  value: (performanceData?.performance.velocity || 10) + Math.random() * 3 - 1.5
                })),
              ]}
              title="Performance Trend (Last 7 Days)"
              height={300}
              showTrend={true}
              interactive={true}
              onPointClick={(point) => logger.info("Performance point:")}
            />
          )}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Velocity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {performanceData?.performance.velocity || 0}
                  </div>
                  <p className="text-sm text-gray-600">tasks per week</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Completion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {performanceData?.performance.completionRate || 0}%
                  </div>
                  <p className="text-sm text-gray-600">tasks completed</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Efficiency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {performanceData?.performance.efficiency || 0}%
                  </div>
                  <p className="text-sm text-gray-600">time accuracy</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Tasks Completed</span>
                    <span>{performanceData?.performance.completedTasks} / {performanceData?.performance.totalTasks}</span>
                  </div>
                  <Progress 
                    value={performanceData?.performance.totalTasks ? 
                      (performanceData.performance.completedTasks / performanceData.performance.totalTasks) * 100 : 0
                    } 
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Collaboration Score</span>
                    <span>{performanceData?.performance.collaborationScore}%</span>
                  </div>
                  <Progress value={performanceData?.performance.collaborationScore || 0} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecasting" className="space-y-6">
          {forecastData && (
            <ForecastingEngine
              data={forecastData}
              title="Team Performance Forecasting"
              defaultConfig={{
                algorithm: 'linear_regression',
                horizon: 14,
                confidence_level: 0.9,
                seasonality: true
              }}
              onForecastUpdate={(result) => {
                logger.info("Forecast updated:");
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Correlation Heatmap */}
            <InteractiveHeatmap
              data={[
                { x: 'Velocity', y: 'Efficiency', value: 0.85, intensity: 0.85 },
                { x: 'Velocity', y: 'Collaboration', value: 0.72, intensity: 0.72 },
                { x: 'Velocity', y: 'Completion', value: 0.91, intensity: 0.91 },
                { x: 'Efficiency', y: 'Collaboration', value: 0.68, intensity: 0.68 },
                { x: 'Efficiency', y: 'Completion', value: 0.79, intensity: 0.79 },
                { x: 'Collaboration', y: 'Completion', value: 0.63, intensity: 0.63 },
              ]}
              title="Performance Metrics Correlation"
              colorScale="viridis"
            />
            
            {/* Advanced Insights Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-5" />
                  <span>AI-Powered Insights</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900 dark:text-blue-100">Optimization Opportunity</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Team velocity could increase by 23% with better workload distribution.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-green-900 dark:text-green-100">Strong Performance</h4>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Collaboration score is 15% above industry average.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-orange-900 dark:text-orange-100">Resource Alert</h4>
                      <p className="text-sm text-orange-700 dark:text-orange-300">
                        Predicted capacity shortage in 2 weeks based on current trends.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Drill-down Modal */}
          {drillDownMode && selectedMetric && (
            <Card className="border-2 border-blue-500">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Maximize2 className="h-5 w-5" />
                    <span>Detailed Analysis: {selectedMetric}</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setDrillDownMode(false)}
                  >
                    Close
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Detailed Metrics</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Current Value:</span>
                        <span className="font-medium">85%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Previous Period:</span>
                        <span className="font-medium">78%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Change:</span>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">+9%</Badge>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Contributing Factors</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Improved task completion rate</li>
                      <li>• Better resource allocation</li>
                      <li>• Enhanced team collaboration</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="realtime" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RealTimeDataStream
              teamId={teamId}
              onDataUpdate={(data) => setRealTimeData(data)}
              onConnectionChange={(connected) => {
                logger.info("Real-time connection:");
              }}
            />
            
            {/* Real-time Analytics Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Live Analytics Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {realTimeData.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {realTimeData.filter(d => d.trend === 'up').length}
                        </div>
                        <div className="text-sm text-gray-600">Improving Metrics</div>
                      </div>
                      <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">
                          {realTimeData.filter(d => Math.abs(d.change) > 5).length}
                        </div>
                        <div className="text-sm text-gray-600">Critical Changes</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {realTimeData.filter(d => d.category === 'performance').length}
                        </div>
                        <div className="text-sm text-gray-600">Performance Updates</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          {Math.round(realTimeData.reduce((sum, d) => sum + Math.abs(d.change), 0) / realTimeData.length * 10) / 10}%
                        </div>
                        <div className="text-sm text-gray-600">Avg Volatility</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No real-time data available</p>
                      <p className="text-sm">Enable streaming to see live updates</p>
                    </div>
                  )}
                  
                  {/* Real-time Chart */}
                  {realTimeData.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-medium mb-3">Live Metrics Trend</h4>
                      <InteractiveLineChart
                        data={realTimeData.slice(0, 20).map(d => ({
                          timestamp: d.timestamp,
                          value: d.value,
                          category: d.metric
                        }))}
                        title="Real-time Performance Indicators"
                        height={200}
                        showTrend={true}
                        interactive={true}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Real-time Alerts */}
          {realTimeData.filter(d => Math.abs(d.change) > 10).length > 0 && (
            <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-orange-800 dark:text-orange-200">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Real-time Alerts</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {realTimeData
                    .filter(d => Math.abs(d.change) > 10)
                    .slice(0, 5)
                    .map((alert, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={cn(
                            "w-3 h-3 rounded-full",
                            Math.abs(alert.change) > 20 ? "bg-red-500" : "bg-orange-500"
                          )} />
                          <div>
                            <div className="font-medium text-sm">
                              {alert.metric.replace('_', ' ').toUpperCase()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(alert.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{alert.value}</div>
                          <div className={cn(
                            "text-sm flex items-center",
                            alert.change > 0 ? "text-red-600" : "text-red-600"
                          )}>
                            {alert.change > 0 ? '+' : ''}{alert.change}%
                          </div>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="custom" className="space-y-6">
          <CustomDashboardConfigurator
            teamId={teamId}
            onSave={(layout) => {
              logger.info("Dashboard layout saved:");
              // In a real implementation, save to backend
            }}
            onPreview={(layout) => {
              logger.info("Dashboard preview:");
            }}
          />
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>AI-Generated Insights</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {insights.length > 0 ? (
                <div className="space-y-4">
                  {insights.map((insight, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getPriorityIcon(insight.priority)}
                          <h3 className="font-medium">{insight.title}</h3>
                        </div>
                        <Badge variant="outline" className={cn(
                          insight.priority === 'critical' && 'border-red-500 text-red-700',
                          insight.priority === 'high' && 'border-orange-500 text-orange-700',
                          insight.priority === 'medium' && 'border-yellow-500 text-yellow-700'
                        )}>
                          {insight.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{insight.description}</p>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Recommendations:</p>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside">
                          {insight.recommendations?.map((rec, recIndex) => (
                            <li key={recIndex}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-3">
                        <span>Impact Score: {insight.impactScore}%</span>
                        <span>Confidence: {insight.confidenceScore}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Lightbulb className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No insights available yet.</p>
                  <p className="text-sm text-gray-500">More data needed to generate intelligent recommendations.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}