// @ts-nocheck
import { eq, and, desc, sql, count } from 'drizzle-orm';
import { getDatabase } from "../../database/connection";
import { 
  taskTable, 
  projectTable, 
  userTable, 
  activityTable,
  milestoneTable 
} from '../../database/schema';
import * as ss from 'simple-statistics';
import { SLR, MLR } from 'ml-regression';
import { kmeans } from 'ml-kmeans';

// Database will be initialized as needed with await getDatabase()

export interface RealMLInsight {
  id: string;
  type: 'prediction' | 'anomaly' | 'recommendation' | 'pattern' | 'risk';
  title: string;
  description: string;
  confidence: number; // 0-100, calculated from statistical measures
  impact: 'low' | 'medium' | 'high' | 'critical';
  actionable: boolean;
  data: {
    rawData?: number[];
    statisticalMeasures?: {
      mean: number;
      median: number;
      standardDeviation: number;
      correlation?: number;
      rSquared?: number;
    };
    modelAccuracy?: number;
    dataPoints: number;
  };
  aiSuggestions: {
    optimizations: string[];
    alternatives: string[];
    bestPractices: string[];
  };
  createdAt: string;
}

export interface RealMLPrediction {
  id: string;
  metric: string;
  currentValue: number;
  predictedValue: number;
  timeframe: string;
  confidence: number; // Based on R-squared and data quality
  factors: string[];
  trend: 'increasing' | 'decreasing' | 'stable';
  modelType: 'linear_regression' | 'polynomial' | 'moving_average';
  trainingDataPoints: number;
}

export class RealMLAnalyticsService {
  
  // Real task completion prediction using linear regression
  static async predictTaskCompletion(projectId?: string, timeframeDays: number = 30): Promise<RealMLPrediction> {
    const db = await getDatabase();
    const tasks = await db.select({
      id: taskTable.id,
      createdAt: taskTable.createdAt,
      updatedAt: taskTable.updatedAt,
      status: taskTable.status,
      projectId: taskTable.projectId
    })
    .from(taskTable)
    .where(projectId ? eq(taskTable.projectId, projectId) : sql`1=1`)
    .orderBy(desc(taskTable.createdAt))
    .limit(1000);

    if (tasks.length < 10) {
      // Not enough data for reliable ML prediction
      return {
        id: `pred_${Date.now()}`,
        metric: 'Task Completion Rate',
        currentValue: 0,
        predictedValue: 0,
        timeframe: `${timeframeDays}_days`,
        confidence: 0,
        factors: ['Insufficient data'],
        trend: 'stable',
        modelType: 'linear_regression',
        trainingDataPoints: tasks.length
      };
    }

    // Prepare time series data
    const completedTasks = tasks.filter(t => t.status === 'done');
    const dailyCompletions = this.groupTasksByDay(completedTasks);
    
    if (dailyCompletions.length < 7) {
      // Need at least a week of data
      return {
        id: `pred_${Date.now()}`,
        metric: 'Task Completion Rate',
        currentValue: completedTasks.length,
        predictedValue: completedTasks.length,
        timeframe: `${timeframeDays}_days`,
        confidence: 20,
        factors: ['Limited historical data'],
        trend: 'stable',
        modelType: 'linear_regression',
        trainingDataPoints: dailyCompletions.length
      };
    }

    // Create regression model
    const x = dailyCompletions.map((_, index) => index); // Day index
    const y = dailyCompletions.map(day => day.completions); // Completions per day
    
    const regression = new SLR(x, y);
    const rSquared = this.calculateRSquared(x, y, regression);
    
    // Predict future completions
    const futureX = dailyCompletions.length + timeframeDays;
    const predictedDailyRate = regression.predict(futureX);
    const currentRate = ss.mean(y.slice(-7)); // Last week average
    
    // Calculate trend
    const recentTrend = ss.linearRegression(
      x.slice(-14).map((val, idx) => [idx, y.slice(-14)[idx]])
    );
    
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (recentTrend.m > 0.1) trend = 'increasing';
    else if (recentTrend.m < -0.1) trend = 'decreasing';
    
    const confidence = Math.min(95, Math.max(10, rSquared * 100));
    
    return {
      id: `pred_${Date.now()}`,
      metric: 'Task Completion Rate',
      currentValue: Math.round(currentRate * 10) / 10,
      predictedValue: Math.round(predictedDailyRate * 10) / 10,
      timeframe: `${timeframeDays}_days`,
      confidence: Math.round(confidence),
      factors: this.identifyCompletionFactors(tasks, rSquared),
      trend,
      modelType: 'linear_regression',
      trainingDataPoints: dailyCompletions.length
    };
  }

  // Real anomaly detection using statistical methods
  static async detectAnomalies(projectId?: string): Promise<RealMLInsight[]> {
    const db = await getDatabase();
    const activities = await db.select()
      .from(activityTable)
      .where(projectId ? eq(activityTable.projectId, projectId) : sql`1=1`)
      .orderBy(desc(activityTable.createdAt))
      .limit(500);

    if (activities.length < 30) {
      return [{
        id: `anomaly_${Date.now()}`,
        type: 'anomaly',
        title: 'Insufficient Data for Anomaly Detection',
        description: 'Need at least 30 data points for reliable anomaly detection',
        confidence: 0,
        impact: 'low',
        actionable: false,
        data: { dataPoints: activities.length },
        aiSuggestions: {
          optimizations: ['Collect more activity data'],
          alternatives: ['Monitor key metrics manually'],
          bestPractices: ['Establish baseline metrics first']
        },
        createdAt: new Date().toISOString()
      }];
    }

    // Group activities by day and calculate daily metrics
    const dailyMetrics = this.calculateDailyMetrics(activities);
    const anomalies: RealMLInsight[] = [];

    // Detect activity volume anomalies using z-score
    const activityCounts = dailyMetrics.map(d => d.activityCount);
    const mean = ss.mean(activityCounts);
    const stdDev = ss.standardDeviation(activityCounts);
    
    dailyMetrics.forEach((day, index) => {
      const zScore = Math.abs((day.activityCount - mean) / stdDev);
      
      if (zScore > 2.5) { // Significant anomaly
        const isHigh = day.activityCount > mean;
        anomalies.push({
          id: `anomaly_activity_${Date.now()}_${index}`,
          type: 'anomaly',
          title: `${isHigh ? 'Unusually High' : 'Unusually Low'} Activity Volume`,
          description: `Detected ${day.activityCount} activities on ${day.date}, which is ${Math.round(zScore * 10) / 10} standard deviations from normal (${Math.round(mean)})`,
          confidence: Math.min(95, Math.round(zScore * 30)),
          impact: zScore > 3 ? 'high' : 'medium',
          actionable: true,
          data: {
            rawData: activityCounts,
            statisticalMeasures: {
              mean,
              median: ss.median(activityCounts),
              standardDeviation: stdDev,
            },
            dataPoints: activityCounts.length
          },
          aiSuggestions: {
            optimizations: isHigh 
              ? ['Analyze what caused increased activity', 'Ensure team isn\'t overworked']
              : ['Investigate potential blockers', 'Check team availability'],
            alternatives: ['Set up automated monitoring', 'Create activity baselines'],
            bestPractices: ['Monitor activity patterns regularly', 'Set up alerts for significant deviations']
          },
          createdAt: new Date().toISOString()
        });
      }
    });

    // Detect task completion rate anomalies
    const completionRates = dailyMetrics.map(d => d.completionRate);
    const completionMean = ss.mean(completionRates.filter(r => !isNaN(r)));
    const completionStdDev = ss.standardDeviation(completionRates.filter(r => !isNaN(r)));
    
    dailyMetrics.forEach((day, index) => {
      if (!isNaN(day.completionRate)) {
        const zScore = Math.abs((day.completionRate - completionMean) / completionStdDev);
        
        if (zScore > 2 && day.completionRate < completionMean) {
          anomalies.push({
            id: `anomaly_completion_${Date.now()}_${index}`,
            type: 'anomaly',
            title: 'Low Task Completion Rate Detected',
            description: `Completion rate of ${Math.round(day.completionRate * 100)}% on ${day.date} is significantly below normal (${Math.round(completionMean * 100)}%)`,
            confidence: Math.min(90, Math.round(zScore * 35)),
            impact: zScore > 2.5 ? 'high' : 'medium',
            actionable: true,
            data: {
              rawData: completionRates,
              statisticalMeasures: {
                mean: completionMean,
                median: ss.median(completionRates.filter(r => !isNaN(r))),
                standardDeviation: completionStdDev,
              },
              dataPoints: completionRates.filter(r => !isNaN(r)).length
            },
            aiSuggestions: {
              optimizations: ['Review task complexity', 'Check for blockers', 'Assess team capacity'],
              alternatives: ['Adjust sprint planning', 'Redistribute workload'],
              bestPractices: ['Regular retrospectives', 'Continuous process improvement']
            },
            createdAt: new Date().toISOString()
          });
        }
      }
    });

    return anomalies;
  }

  // Real pattern recognition using clustering
  static async identifyPatterns(projectId?: string): Promise<RealMLInsight[]> {
    const db = await getDatabase();
    const tasks = await db.select({
      id: taskTable.id,
      title: taskTable.title,
      status: taskTable.status,
      priority: taskTable.priority,
      createdAt: taskTable.createdAt,
      updatedAt: taskTable.updatedAt,
      assigneeId: taskTable.assigneeId
    })
    .from(taskTable)
    .where(projectId ? eq(taskTable.projectId, projectId) : sql`1=1`)
    .limit(200);

    if (tasks.length < 20) {
      return [{
        id: `pattern_${Date.now()}`,
        type: 'pattern',
        title: 'Insufficient Data for Pattern Analysis',
        description: 'Need at least 20 tasks for meaningful pattern recognition',
        confidence: 0,
        impact: 'low',
        actionable: false,
        data: { dataPoints: tasks.length },
        aiSuggestions: {
          optimizations: ['Create more tasks to establish patterns'],
          alternatives: ['Manual pattern observation'],
          bestPractices: ['Track task creation and completion consistently']
        },
        createdAt: new Date().toISOString()
      }];
    }

    // Prepare data for clustering - convert tasks to numerical features
    const taskFeatures = tasks.map(task => {
      const createdAt = new Date(task.createdAt);
      const updatedAt = new Date(task.updatedAt);
      const dayOfWeek = createdAt.getDay();
      const hourOfDay = createdAt.getHours();
      const completionTime = (updatedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60); // hours
      
      return [
        dayOfWeek,
        hourOfDay,
        task.priority === 'high' ? 2 : task.priority === 'medium' ? 1 : 0,
        task.status === 'done' ? 1 : 0,
        Math.min(completionTime, 168) // Cap at 1 week
      ];
    });

    // Perform k-means clustering
    const k = Math.min(5, Math.floor(tasks.length / 10)); // Reasonable number of clusters
    const clusters = kmeans(taskFeatures, k);
    
    // Analyze clusters for patterns
    const patterns: RealMLInsight[] = [];
    
    clusters.clusters.forEach((cluster, clusterIndex) => {
      if (cluster.length < 3) return; // Skip small clusters
      
      const clusterTasks = cluster.map(pointIndex => tasks[pointIndex]);
      const clusterFeatures = cluster.map(pointIndex => taskFeatures[pointIndex]);
      
      // Analyze cluster characteristics
      const avgDayOfWeek = ss.mean(clusterFeatures.map(f => f[0]));
      const avgHourOfDay = ss.mean(clusterFeatures.map(f => f[1]));
      const avgPriority = ss.mean(clusterFeatures.map(f => f[2]));
      const completionRate = ss.mean(clusterFeatures.map(f => f[3]));
      const avgCompletionTime = ss.mean(clusterFeatures.map(f => f[4]));
      
      // Generate insights based on cluster characteristics
      let title = '';
      let description = '';
      let suggestions: string[] = [];
      
      if (avgDayOfWeek < 1.5) { // Weekend tasks
        title = 'Weekend Task Creation Pattern';
        description = `Identified ${cluster.length} tasks typically created on weekends with ${Math.round(completionRate * 100)}% completion rate`;
        suggestions = ['Consider workload distribution', 'Review weekend work policies'];
      } else if (avgHourOfDay > 18) { // Late evening tasks
        title = 'After-Hours Task Creation Pattern';
        description = `Found ${cluster.length} tasks created after 6 PM with ${Math.round(avgCompletionTime * 10) / 10} hour average completion time`;
        suggestions = ['Monitor work-life balance', 'Consider task scheduling'];
      } else if (avgPriority > 1.5 && completionRate < 0.7) { // High priority, low completion
        title = 'High-Priority Low-Completion Pattern';
        description = `Detected ${cluster.length} high-priority tasks with only ${Math.round(completionRate * 100)}% completion rate`;
        suggestions = ['Review priority assignment criteria', 'Analyze completion blockers'];
      } else if (avgCompletionTime > 48) { // Long completion times
        title = 'Extended Completion Time Pattern';
        description = `Found ${cluster.length} tasks with average completion time of ${Math.round(avgCompletionTime)} hours`;
        suggestions = ['Break down complex tasks', 'Improve estimation accuracy'];
      } else {
        title = `Task Cluster ${clusterIndex + 1} Pattern`;
        description = `Identified ${cluster.length} tasks with similar characteristics`;
        suggestions = ['Analyze for optimization opportunities'];
      }
      
      patterns.push({
        id: `pattern_cluster_${Date.now()}_${clusterIndex}`,
        type: 'pattern',
        title,
        description,
        confidence: Math.min(90, Math.max(20, cluster.length * 10)), // Confidence based on cluster size
        impact: cluster.length > 10 ? 'medium' : 'low',
        actionable: true,
        data: {
          rawData: clusterFeatures.flat(),
          statisticalMeasures: {
            mean: avgCompletionTime,
            median: ss.median(clusterFeatures.map(f => f[4])),
            standardDeviation: ss.standardDeviation(clusterFeatures.map(f => f[4])),
          },
          dataPoints: cluster.length
        },
        aiSuggestions: {
          optimizations: suggestions,
          alternatives: ['Manual task analysis', 'Team feedback sessions'],
          bestPractices: ['Regular pattern monitoring', 'Data-driven process improvement']
        },
        createdAt: new Date().toISOString()
      });
    });

    return patterns;
  }

  // Real productivity forecasting using multiple regression
  static async forecastProductivity(projectId?: string, timeframeDays: number = 30): Promise<RealMLPrediction> {
    const db = await getDatabase();
    const tasks = await db.select({
      id: taskTable.id,
      createdAt: taskTable.createdAt,
      updatedAt: taskTable.updatedAt,
      status: taskTable.status,
      priority: taskTable.priority,
      assigneeId: taskTable.assigneeId
    })
    .from(taskTable)
    .where(projectId ? eq(taskTable.projectId, projectId) : sql`1=1`)
    .orderBy(desc(taskTable.createdAt))
    .limit(500);

    if (tasks.length < 50) {
      return {
        id: `forecast_${Date.now()}`,
        metric: 'Team Productivity Index',
        currentValue: 0,
        predictedValue: 0,
        timeframe: `${timeframeDays}_days`,
        confidence: 0,
        factors: ['Insufficient historical data'],
        trend: 'stable',
        modelType: 'linear_regression',
        trainingDataPoints: tasks.length
      };
    }

    // Calculate weekly productivity metrics
    const weeklyMetrics = this.calculateWeeklyProductivity(tasks);
    
    if (weeklyMetrics.length < 4) {
      return {
        id: `forecast_${Date.now()}`,
        metric: 'Team Productivity Index',
        currentValue: weeklyMetrics[0]?.productivity || 0,
        predictedValue: weeklyMetrics[0]?.productivity || 0,
        timeframe: `${timeframeDays}_days`,
        confidence: 20,
        factors: ['Limited weekly data'],
        trend: 'stable',
        modelType: 'linear_regression',
        trainingDataPoints: weeklyMetrics.length
      };
    }

    // Prepare multiple regression data
    const X = weeklyMetrics.map((week, index) => [
      index, // Time trend
      week.tasksCreated, // Task creation rate
      week.tasksCompleted, // Task completion rate
      week.highPriorityRatio, // Priority distribution
      week.teamSize // Team size factor
    ]);
    
    const y = weeklyMetrics.map(week => week.productivity);

    // Use multiple linear regression
    const mlr = new MLR(X, y);
    const rSquared = this.calculateMLRSquared(X, y, mlr);
    
    // Predict future productivity
    const currentWeek = weeklyMetrics[0];
    const futureWeek = weeklyMetrics.length;
    const futureX = [
      futureWeek,
      currentWeek.tasksCreated,
      currentWeek.tasksCompleted,
      currentWeek.highPriorityRatio,
      currentWeek.teamSize
    ];
    
    const predictedProductivity = mlr.predict(futureX);
    const currentProductivity = ss.mean(y.slice(-2)); // Last 2 weeks average
    
    // Determine trend
    const recentValues = y.slice(-4);
    const trendSlope = ss.linearRegression(
      recentValues.map((val, idx) => [idx, val])
    ).m;
    
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (trendSlope > 0.05) trend = 'increasing';
    else if (trendSlope < -0.05) trend = 'decreasing';
    
    const confidence = Math.min(85, Math.max(15, rSquared * 100));
    
    return {
      id: `forecast_${Date.now()}`,
      metric: 'Team Productivity Index',
      currentValue: Math.round(currentProductivity * 100) / 100,
      predictedValue: Math.round(predictedProductivity * 100) / 100,
      timeframe: `${timeframeDays}_days`,
      confidence: Math.round(confidence),
      factors: this.identifyProductivityFactors(weeklyMetrics, rSquared),
      trend,
      modelType: 'polynomial',
      trainingDataPoints: weeklyMetrics.length
    };
  }

  // Helper methods for real calculations
  private static groupTasksByDay(tasks: any[]): { date: string; completions: number }[] {
    const dayGroups = new Map<string, number>();
    
    tasks.forEach(task => {
      const date = new Date(task.updatedAt).toISOString().split('T')[0];
      dayGroups.set(date, (dayGroups.get(date) || 0) + 1);
    });
    
    return Array.from(dayGroups.entries())
      .map(([date, completions]) => ({ date, completions }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private static calculateRSquared(x: number[], y: number[], regression: any): number {
    const yMean = ss.mean(y);
    const totalSumSquares = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const residualSumSquares = x.reduce((sum, xi, i) => {
      const predicted = regression.predict(xi);
      return sum + Math.pow(y[i] - predicted, 2);
    }, 0);
    
    return Math.max(0, 1 - (residualSumSquares / totalSumSquares));
  }

  private static calculateMLRSquared(X: number[][], y: number[], mlr: any): number {
    const yMean = ss.mean(y);
    const totalSumSquares = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const residualSumSquares = X.reduce((sum, xi, i) => {
      const predicted = mlr.predict(xi);
      return sum + Math.pow(y[i] - predicted, 2);
    }, 0);
    
    return Math.max(0, 1 - (residualSumSquares / totalSumSquares));
  }

  private static calculateDailyMetrics(activities: any[]) {
    const dayGroups = new Map<string, any[]>();
    
    activities.forEach(activity => {
      const date = new Date(activity.createdAt).toISOString().split('T')[0];
      if (!dayGroups.has(date)) {
        dayGroups.set(date, []);
      }
      dayGroups.get(date)!.push(activity);
    });
    
    return Array.from(dayGroups.entries()).map(([date, dayActivities]) => {
      const completions = dayActivities.filter(a => a.type?.includes('complet')).length;
      const total = dayActivities.length;
      
      return {
        date,
        activityCount: total,
        completionRate: total > 0 ? completions / total : 0
      };
    }).sort((a, b) => a.date.localeCompare(b.date));
  }

  private static calculateWeeklyProductivity(tasks: any[]) {
    const weekGroups = new Map<string, any[]>();
    
    tasks.forEach(task => {
      const date = new Date(task.createdAt);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weekGroups.has(weekKey)) {
        weekGroups.set(weekKey, []);
      }
      weekGroups.get(weekKey)!.push(task);
    });
    
    return Array.from(weekGroups.entries()).map(([week, weekTasks]) => {
      const completed = weekTasks.filter(t => t.status === 'done').length;
      const created = weekTasks.length;
      const highPriority = weekTasks.filter(t => t.priority === 'high').length;
      const uniqueAssignees = new Set(weekTasks.map(t => t.assigneeId)).size;
      
      return {
        week,
        tasksCreated: created,
        tasksCompleted: completed,
        productivity: created > 0 ? completed / created : 0,
        highPriorityRatio: created > 0 ? highPriority / created : 0,
        teamSize: uniqueAssignees
      };
    }).sort((a, b) => b.week.localeCompare(a.week)); // Most recent first
  }

  private static identifyCompletionFactors(tasks: any[], modelAccuracy: number): string[] {
    const factors = [];
    
    if (modelAccuracy > 0.7) {
      factors.push('Strong historical pattern');
    } else {
      factors.push('Variable completion patterns');
    }
    
    const priorities = tasks.map(t => t.priority);
    const highPriorityRatio = priorities.filter(p => p === 'high').length / priorities.length;
    
    if (highPriorityRatio > 0.3) {
      factors.push('High priority task load');
    }
    
    const uniqueAssignees = new Set(tasks.map(t => t.assigneeId)).size;
    if (uniqueAssignees > 5) {
      factors.push('Large team distribution');
    } else if (uniqueAssignees < 3) {
      factors.push('Small team concentration');
    }
    
    return factors;
  }

  private static identifyProductivityFactors(weeklyMetrics: any[], modelAccuracy: number): string[] {
    const factors = [];
    
    if (modelAccuracy > 0.6) {
      factors.push('Predictable productivity patterns');
    } else {
      factors.push('Variable productivity factors');
    }
    
    const avgTeamSize = ss.mean(weeklyMetrics.map(w => w.teamSize));
    if (avgTeamSize > 8) {
      factors.push('Large team coordination');
    } else if (avgTeamSize < 4) {
      factors.push('Small team dynamics');
    }
    
    const avgHighPriorityRatio = ss.mean(weeklyMetrics.map(w => w.highPriorityRatio));
    if (avgHighPriorityRatio > 0.4) {
      factors.push('High priority focus');
    }
    
    return factors;
  }
}

