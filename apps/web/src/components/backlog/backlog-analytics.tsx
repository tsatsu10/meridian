import { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Target,
  Activity,
  Gauge,
  PieChart as PieChartIcon
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { differenceInDays, format } from 'date-fns';
import type { EnhancedTask, BacklogHealth } from '@/types/backlog';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Bar
} from 'recharts';
import { Users } from 'lucide-react';

interface BacklogAnalyticsProps {
  tasks: EnhancedTask[];
  className?: string;
  variant?: 'default' | 'detailed';
}

// @epic-1.2-gantt @persona-jennifer - Executive needs backlog health visibility
export default function BacklogAnalytics({ 
  tasks, 
  className, 
  variant = 'default' 
}: BacklogAnalyticsProps) {
  
  // Calculate comprehensive backlog health metrics
  const healthMetrics: BacklogHealth = useMemo(() => {
    const now = new Date();
    const totalTasks = tasks.length;
    
    if (totalTasks === 0) {
      return {
        totalTasks: 0,
        refinedTasks: 0,
        readyTasks: 0,
        averageAge: 0,
        oldestTask: 0,
        refinementPercentage: 0,
        readyPercentage: 0,
        velocityTrend: 'stable',
        riskLevel: 'low'
      };
    }

    // Calculate refinement status
    const refinedTasks = tasks.filter(task => task.refinementStatus === 'refined').length;
    const readyTasks = tasks.filter(task => task.refinementStatus === 'ready').length;
    
    // Calculate age metrics
    const taskAges = tasks.map(task => {
      const createdDate = new Date(task.createdAt);
      return differenceInDays(now, createdDate);
    });
    
    const averageAge = taskAges.reduce((sum, age) => sum + age, 0) / totalTasks;
    const oldestTask = Math.max(...taskAges);
    
    // Calculate percentages
    const refinementPercentage = Math.round((refinedTasks / totalTasks) * 100);
    const readyPercentage = Math.round((readyTasks / totalTasks) * 100);
    
    // Determine risk level based on age and refinement
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (averageAge > 60 || readyPercentage < 20) riskLevel = 'critical';
    else if (averageAge > 30 || readyPercentage < 40) riskLevel = 'high';
    else if (averageAge > 14 || readyPercentage < 60) riskLevel = 'medium';
    
    return {
      totalTasks,
      refinedTasks,
      readyTasks,
      averageAge: Math.round(averageAge),
      oldestTask,
      refinementPercentage,
      readyPercentage,
      velocityTrend: 'stable', // This would be calculated based on historical data
      riskLevel
    };
  }, [tasks]);

  // Age distribution analysis
  const ageDistribution = useMemo(() => {
    const now = new Date();
    const distribution = {
      new: 0,        // 0-7 days
      recent: 0,     // 8-30 days
      aging: 0,      // 31-60 days
      stale: 0       // 60+ days
    };

    tasks.forEach(task => {
      const age = differenceInDays(now, new Date(task.createdAt));
      if (age <= 7) distribution.new++;
      else if (age <= 30) distribution.recent++;
      else if (age <= 60) distribution.aging++;
      else distribution.stale++;
    });

    return distribution;
  }, [tasks]);

  // Priority distribution
  const priorityDistribution = useMemo(() => {
    const distribution = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    tasks.forEach(task => {
      const priority = task.priority as keyof typeof distribution || 'medium';
      distribution[priority] = (distribution[priority] || 0) + 1;
    });

    return distribution;
  }, [tasks]);

  // Story points analysis
  const storyPointsAnalysis = useMemo(() => {
    const tasksWithPoints = tasks.filter(task => task.storyPoints && task.storyPoints > 0);
    const totalPoints = tasksWithPoints.reduce((sum, task) => sum + (task.storyPoints || 0), 0);
    const averagePoints = tasksWithPoints.length > 0 ? totalPoints / tasksWithPoints.length : 0;
    
    return {
      totalTasks: tasksWithPoints.length,
      totalPoints,
      averagePoints: Math.round(averagePoints * 10) / 10,
      estimatedTasks: (tasks.length - tasksWithPoints.length)
    };
  }, [tasks]);

  const riskColors = {
    low: 'text-green-600 bg-green-100',
    medium: 'text-yellow-600 bg-yellow-100',
    high: 'text-orange-600 bg-orange-100',
    critical: 'text-red-600 bg-red-100'
  };

  // Calculate analytics data
  const analytics = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
    const plannedTasks = tasks.filter(t => t.status === 'planned').length;
    
    const totalStoryPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    const completedPoints = tasks
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    
    const priorityDistribution = tasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const refinementDistribution = tasks.reduce((acc, task) => {
      const status = task.refinementStatus || 'draft';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const assigneeDistribution = tasks.reduce((acc, task) => {
      if (task.userEmail) {
        acc[task.userEmail] = (acc[task.userEmail] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      plannedTasks,
      completionRate: totalTasks ? (completedTasks / totalTasks) * 100 : 0,
      totalStoryPoints,
      completedPoints,
      priorityDistribution,
      refinementDistribution,
      assigneeDistribution
    };
  }, [tasks]);

  // Prepare chart data
  const priorityChartData = Object.entries(analytics.priorityDistribution).map(([name, value]) => ({
    name,
    value
  }));

  const refinementChartData = Object.entries(analytics.refinementDistribution).map(([name, value]) => ({
    name,
    value
  }));

  const COLORS = {
    critical: '#EF4444',
    high: '#F97316',
    medium: '#F59E0B',
    low: '#10B981',
    draft: '#6B7280',
    refined: '#3B82F6',
    ready: '#10B981'
  };

  const renderDetailedView = () => (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Tasks</p>
                <h3 className="text-2xl font-bold mt-1">{analytics.totalTasks}</h3>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="mt-4">
              <Progress value={analytics.completionRate} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2">
                {Math.round(analytics.completionRate)}% completed
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Story Points</p>
                <h3 className="text-2xl font-bold mt-1">
                  {analytics.completedPoints}/{analytics.totalStoryPoints}
                </h3>
              </div>
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="mt-4">
              <Progress 
                value={(analytics.completedPoints / analytics.totalStoryPoints) * 100} 
                className="h-2" 
              />
              <p className="text-sm text-muted-foreground mt-2">
                {Math.round((analytics.completedPoints / analytics.totalStoryPoints) * 100)}% completed
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Task Status</p>
                <h3 className="text-2xl font-bold mt-1">{analytics.inProgressTasks}</h3>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-2 mt-4">
              <div className="flex items-center justify-between text-sm">
                <Badge variant="outline" className="text-xs">In Progress</Badge>
                <span>{analytics.inProgressTasks}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <Badge variant="outline" className="text-xs">Planned</Badge>
                <span>{analytics.plannedTasks}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Team Members</p>
                <h3 className="text-2xl font-bold mt-1">
                  {Object.keys(analytics.assigneeDistribution).length}
                </h3>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="mt-4 space-y-2">
              {Object.entries(analytics.assigneeDistribution)
                .slice(0, 2)
                .map(([email, count]) => (
                  <div key={email} className="flex items-center justify-between text-sm">
                    <span className="truncate max-w-[150px]">{email}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              {Object.keys(analytics.assigneeDistribution).length > 2 && (
                <p className="text-sm text-muted-foreground">
                  +{Object.keys(analytics.assigneeDistribution).length - 2} more
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Priority Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {priorityChartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[entry.name as keyof typeof COLORS] || '#94A3B8'} 
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {priorityChartData.map(({ name, value }) => (
                <div key={name} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[name as keyof typeof COLORS] }} 
                    />
                    <span className="text-sm capitalize">{name}</span>
                  </div>
                  <Badge variant="secondary">{value}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Refinement Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Refinement Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={refinementChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value">
                    {refinementChartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[entry.name as keyof typeof COLORS] || '#94A3B8'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4">
              {refinementChartData.map(({ name, value }) => (
                <div key={name} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[name as keyof typeof COLORS] }} 
                    />
                    <span className="text-sm capitalize">{name}</span>
                  </div>
                  <Badge variant="secondary">{value}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Risk Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* High Priority Tasks */}
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/10">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
                <h4 className="font-medium">High Priority Tasks</h4>
              </div>
              <p className="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">
                {analytics.priorityDistribution.critical || 0}
              </p>
              <p className="text-sm text-red-600/70 dark:text-red-400/70">
                Require immediate attention
              </p>
            </div>

            {/* Unrefined Tasks */}
            <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/10">
              <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                <AlertTriangle className="h-5 w-5" />
                <h4 className="font-medium">Unrefined Tasks</h4>
              </div>
              <p className="mt-2 text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {analytics.refinementDistribution.draft || 0}
              </p>
              <p className="text-sm text-yellow-600/70 dark:text-yellow-400/70">
                Need refinement
              </p>
            </div>

            {/* Unassigned Tasks */}
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/10">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <Users className="h-5 w-5" />
                <h4 className="font-medium">Unassigned Tasks</h4>
              </div>
              <p className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
                {tasks.filter(t => !t.userEmail).length}
              </p>
              <p className="text-sm text-blue-600/70 dark:text-blue-400/70">
                Need assignment
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderDefaultView = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tasks</p>
                <h3 className="text-2xl font-bold mt-1">{analytics.totalTasks}</h3>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
            <Progress value={analytics.completionRate} className="h-2 mt-4" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Points</p>
                <h3 className="text-2xl font-bold mt-1">
                  {analytics.completedPoints}/{analytics.totalStoryPoints}
                </h3>
              </div>
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
            <Progress 
              value={(analytics.completedPoints / analytics.totalStoryPoints) * 100} 
              className="h-2 mt-4" 
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            {Object.entries(analytics.priorityDistribution).map(([priority, count]) => (
              <div key={priority} className="flex items-center justify-between">
                <Badge 
                  variant="outline" 
                  className="text-xs"
                  style={{ 
                    color: COLORS[priority as keyof typeof COLORS],
                    borderColor: COLORS[priority as keyof typeof COLORS] 
                  }}
                >
                  {priority}
                </Badge>
                <span className="text-sm font-medium">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return variant === 'detailed' ? renderDetailedView() : renderDefaultView();
} 