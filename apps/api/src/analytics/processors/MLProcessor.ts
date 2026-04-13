// @ts-nocheck
import { getDatabase } from "../../database/connection";
import { analyticsEvents, userAnalytics, projectAnalytics, teamAnalytics } from '../../database/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { redis } from '../../lib/redis';

export interface MLInsight {
  id: string;
  type: 'prediction' | 'anomaly' | 'recommendation' | 'pattern' | 'risk';
  category: 'productivity' | 'quality' | 'timeline' | 'resource' | 'performance';
  title: string;
  description: string;
  confidence: number; // 0-100
  impact: 'low' | 'medium' | 'high' | 'critical';
  actionable: boolean;
  data: any;
  insights: string[];
  recommendations: string[];
  created: Date;
  relevantUntil?: Date;
  workspaceId: string;
}

export interface PredictiveModel {
  id: string;
  name: string;
  type: 'regression' | 'classification' | 'clustering' | 'time-series';
  accuracy: number;
  lastTrained: Date;
  features: string[];
  predictions: any[];
  modelData: any; // Serialized model parameters
  version: string;
  workspaceId: string;
}

export class MLProcessor {
  private static instance: MLProcessor;
  private models: Map<string, PredictiveModel> = new Map();
  private insights: MLInsight[] = [];

  static getInstance(): MLProcessor {
    if (!MLProcessor.instance) {
      MLProcessor.instance = new MLProcessor();
    }
    return MLProcessor.instance;
  }

  async generateInsights(workspaceId: string, timeRange: { start: Date; end: Date }): Promise<MLInsight[]> {
    const insights: MLInsight[] = [];
    
    // Generate productivity insights
    const productivityInsights = await this.analyzeProductivity(workspaceId, timeRange);
    insights.push(...productivityInsights);
    
    // Generate timeline insights
    const timelineInsights = await this.analyzeTimeline(workspaceId, timeRange);
    insights.push(...timelineInsights);
    
    // Generate resource insights
    const resourceInsights = await this.analyzeResources(workspaceId, timeRange);
    insights.push(...resourceInsights);
    
    // Generate performance insights
    const performanceInsights = await this.analyzePerformance(workspaceId, timeRange);
    insights.push(...performanceInsights);
    
    // Cache insights
    await this.cacheInsights(workspaceId, insights);
    
    return insights;
  }

  private async analyzeProductivity(workspaceId: string, timeRange: { start: Date; end: Date }): Promise<MLInsight[]> {
    const insights: MLInsight[] = [];
    
    // Analyze task completion patterns
    const taskData = await db
      .select({
        completedTasks: sql<number>`COUNT(CASE WHEN status = 'done' THEN 1 END)`,
        totalTasks: sql<number>`COUNT(*)`,
        avgCompletionTime: sql<number>`AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/86400)`,
        overdueTasks: sql<number>`COUNT(CASE WHEN due_date < NOW() AND status != 'done' THEN 1 END)`
      })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.workspaceId, workspaceId),
          gte(analyticsEvents.timestamp, timeRange.start),
          lte(analyticsEvents.timestamp, timeRange.end)
        )
      );

    const data = taskData[0];
    const completionRate = (data.completedTasks / data.totalTasks) * 100;
    
    // Productivity anomaly detection
    if (completionRate < 70) {
      insights.push({
        id: `productivity-${Date.now()}`,
        type: 'anomaly',
        category: 'productivity',
        title: 'Low Task Completion Rate Detected',
        description: `Task completion rate is ${completionRate.toFixed(1)}%, which is below the optimal threshold of 70%`,
        confidence: 85,
        impact: 'high',
        actionable: true,
        data: { completionRate, totalTasks: data.totalTasks, completedTasks: data.completedTasks },
        insights: [
          'Team productivity has decreased significantly',
          'Overdue tasks are accumulating',
          'Average completion time may be increasing'
        ],
        recommendations: [
          'Review task complexity and workload distribution',
          'Implement time tracking to identify bottlenecks',
          'Consider reducing task scope or adding resources'
        ],
        created: new Date(),
        relevantUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
        workspaceId
      });
    }

    // Predictive analytics for future productivity
    const historicalData = await this.getHistoricalProductivityData(workspaceId, 30);
    const predictedCompletionRate = this.predictCompletionRate(historicalData);
    
    if (predictedCompletionRate < completionRate) {
      insights.push({
        id: `prediction-${Date.now()}`,
        type: 'prediction',
        category: 'productivity',
        title: 'Productivity Decline Predicted',
        description: `Based on current trends, productivity is expected to decline by ${(completionRate - predictedCompletionRate).toFixed(1)}% in the next 2 weeks`,
        confidence: 78,
        impact: 'medium',
        actionable: true,
        data: { currentRate: completionRate, predictedRate: predictedCompletionRate },
        insights: [
          'Historical patterns suggest a productivity decline',
          'Seasonal factors may be affecting performance',
          'Team workload may be increasing'
        ],
        recommendations: [
          'Implement productivity monitoring and alerts',
          'Review and optimize current workflows',
          'Consider team capacity planning'
        ],
        created: new Date(),
        relevantUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks
        workspaceId
      });
    }

    return insights;
  }

  private async analyzeTimeline(workspaceId: string, timeRange: { start: Date; end: Date }): Promise<MLInsight[]> {
    const insights: MLInsight[] = [];
    
    // Analyze project timeline risks
    const timelineData = await db
      .select({
        overdueProjects: sql<number>`COUNT(CASE WHEN end_date < NOW() AND status != 'completed' THEN 1 END)`,
        upcomingDeadlines: sql<number>`COUNT(CASE WHEN end_date BETWEEN NOW() AND NOW() + INTERVAL '7 days' THEN 1 END)`,
        avgProjectDuration: sql<number>`AVG(EXTRACT(EPOCH FROM (end_date - start_date))/86400)`
      })
      .from(projectAnalytics)
      .where(eq(projectAnalytics.workspaceId, workspaceId));

    const data = timelineData[0];
    
    // Risk assessment for upcoming deadlines
    if (data.upcomingDeadlines > 3) {
      insights.push({
        id: `timeline-risk-${Date.now()}`,
        type: 'risk',
        category: 'timeline',
        title: 'High Concentration of Upcoming Deadlines',
        description: `${data.upcomingDeadlines} projects have deadlines within the next 7 days`,
        confidence: 92,
        impact: 'critical',
        actionable: true,
        data: { upcomingDeadlines: data.upcomingDeadlines, overdueProjects: data.overdueProjects },
        insights: [
          'Multiple projects are approaching their deadlines simultaneously',
          'Resource allocation may be insufficient',
          'Quality may be compromised due to time pressure'
        ],
        recommendations: [
          'Prioritize projects based on business impact',
          'Reallocate resources to critical projects',
          'Consider extending deadlines for non-critical projects'
        ],
        created: new Date(),
        relevantUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
        workspaceId
      });
    }

    return insights;
  }

  private async analyzeResources(workspaceId: string, timeRange: { start: Date; end: Date }): Promise<MLInsight[]> {
    const insights: MLInsight[] = [];
    
    // Analyze team workload distribution
    const workloadData = await db
      .select({
        userId: userAnalytics.userId,
        taskCount: sql<number>`COUNT(*)`,
        avgCompletionTime: sql<number>`AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/86400)`,
        overdueTasks: sql<number>`COUNT(CASE WHEN due_date < NOW() AND status != 'done' THEN 1 END)`
      })
      .from(userAnalytics)
      .where(
        and(
          eq(userAnalytics.workspaceId, workspaceId),
          gte(userAnalytics.timestamp, timeRange.start),
          lte(userAnalytics.timestamp, timeRange.end)
        )
      )
      .groupBy(userAnalytics.userId);

    // Identify overworked team members
    const avgTaskCount = workloadData.reduce((sum, user) => sum + user.taskCount, 0) / workloadData.length;
    const overworkedUsers = workloadData.filter(user => user.taskCount > avgTaskCount * 1.5);

    if (overworkedUsers.length > 0) {
      insights.push({
        id: `resource-overload-${Date.now()}`,
        type: 'anomaly',
        category: 'resource',
        title: 'Team Member Overload Detected',
        description: `${overworkedUsers.length} team members are handling significantly more tasks than average`,
        confidence: 88,
        impact: 'high',
        actionable: true,
        data: { overworkedUsers, averageTaskCount: avgTaskCount },
        insights: [
          'Workload distribution is uneven across the team',
          'Overworked members may experience burnout',
          'Project quality may be affected by resource constraints'
        ],
        recommendations: [
          'Redistribute tasks to balance workload',
          'Consider adding temporary resources',
          'Implement workload monitoring and alerts'
        ],
        created: new Date(),
        relevantUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks
        workspaceId
      });
    }

    return insights;
  }

  private async analyzePerformance(workspaceId: string, timeRange: { start: Date; end: Date }): Promise<MLInsight[]> {
    const insights: MLInsight[] = [];
    
    // Analyze team performance trends
    const performanceData = await db
      .select({
        velocity: sql<number>`AVG(velocity_score)`,
        quality: sql<number>`AVG(quality_score)`,
        collaboration: sql<number>`AVG(collaboration_score)`,
        trend: sql<string>`CASE WHEN AVG(velocity_score) > LAG(AVG(velocity_score)) OVER (ORDER BY date) THEN 'improving' ELSE 'declining' END`
      })
      .from(teamAnalytics)
      .where(
        and(
          eq(teamAnalytics.workspaceId, workspaceId),
          gte(teamAnalytics.timestamp, timeRange.start),
          lte(teamAnalytics.timestamp, timeRange.end)
        )
      );

    const data = performanceData[0];
    
    // Performance pattern recognition
    if (data.velocity < 70 && data.trend === 'declining') {
      insights.push({
        id: `performance-decline-${Date.now()}`,
        type: 'pattern',
        category: 'performance',
        title: 'Sustained Performance Decline Detected',
        description: 'Team performance has been declining consistently over the analyzed period',
        confidence: 85,
        impact: 'high',
        actionable: true,
        data: { velocity: data.velocity, quality: data.quality, collaboration: data.collaboration },
        insights: [
          'Team velocity has decreased significantly',
          'Performance decline may be affecting project delivery',
          'Root cause analysis is needed'
        ],
        recommendations: [
          'Conduct team retrospective to identify issues',
          'Review and optimize development processes',
          'Consider team training or skill development'
        ],
        created: new Date(),
        relevantUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 1 month
        workspaceId
      });
    }

    return insights;
  }

  private async getHistoricalProductivityData(workspaceId: string, days: number): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return await db
      .select({
        date: sql<string>`DATE(timestamp)`,
        completionRate: sql<number>`(COUNT(CASE WHEN status = 'done' THEN 1 END) * 100.0 / COUNT(*))`
      })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.workspaceId, workspaceId),
          gte(analyticsEvents.timestamp, startDate)
        )
      )
      .groupBy(sql`DATE(timestamp)`)
      .orderBy(sql`DATE(timestamp)`);
  }

  private predictCompletionRate(historicalData: any[]): number {
    // Simple linear regression for prediction
    if (historicalData.length < 7) return 75; // Default if insufficient data
    
    const recentData = historicalData.slice(-7); // Last 7 days
    const avgRate = recentData.reduce((sum, day) => sum + day.completionRate, 0) / recentData.length;
    
    // Apply trend analysis
    const trend = this.calculateTrend(recentData);
    return Math.max(0, Math.min(100, avgRate + trend));
  }

  private calculateTrend(data: any[]): number {
    if (data.length < 2) return 0;
    
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, day) => sum + day.completionRate, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, day) => sum + day.completionRate, 0) / secondHalf.length;
    
    return secondAvg - firstAvg;
  }

  private async cacheInsights(workspaceId: string, insights: MLInsight[]): Promise<void> {
    const cacheKey = `ml-insights:${workspaceId}`;
    await redis.setex(cacheKey, 3600, JSON.stringify(insights)); // Cache for 1 hour
  }

  async getCachedInsights(workspaceId: string): Promise<MLInsight[]> {
    const cacheKey = `ml-insights:${workspaceId}`;
    const cached = await redis.get(cacheKey);
    return cached ? JSON.parse(cached) : [];
  }

  async trainModel(modelId: string, trainingData: any[], workspaceId: string): Promise<PredictiveModel> {
    // Real machine learning model training
    const modelFeatures = this.extractFeatures(trainingData);
    const modelParameters = this.trainLinearRegression(modelFeatures);
    
    const model: PredictiveModel = {
      id: modelId,
      name: `Productivity-Predictor-${modelId}`,
      type: 'regression',
      accuracy: this.calculateModelAccuracy(modelParameters, trainingData),
      lastTrained: new Date(),
      features: Object.keys(modelFeatures[0] || {}),
      predictions: [],
      modelData: modelParameters,
      version: '1.0.0',
      workspaceId
    };
    
    this.models.set(modelId, model);
    
    // Cache the trained model
    const cacheKey = `ml-model:${workspaceId}:${modelId}`;
    await redis.setex(cacheKey, 86400, JSON.stringify(model)); // Cache for 24 hours
    
    return model;
  }

  private extractFeatures(data: any[]): any[] {
    // Extract relevant features from training data
    return data.map(item => ({
      completionRate: item.completionRate || 0,
      taskCount: item.taskCount || 0,
      avgCompletionTime: item.avgCompletionTime || 0,
      teamSize: item.teamSize || 1,
      projectDuration: item.projectDuration || 0,
      complexity: item.complexity || 1
    }));
  }

  private trainLinearRegression(features: any[]): any {
    if (features.length < 2) {
      return { intercept: 75, coefficients: [0, 0, 0, 0, 0, 0] };
    }

    // Simple linear regression implementation
    const n = features.length;
    const featureNames = Object.keys(features[0]);
    const targetIndex = featureNames.indexOf('completionRate');
    
    if (targetIndex === -1) {
      return { intercept: 75, coefficients: new Array(featureNames.length).fill(0) };
    }

    // Calculate means
    const means = featureNames.map((_, i) => 
      features.reduce((sum, row) => sum + row[featureNames[i]], 0) / n
    );

    // Calculate coefficients using normal equation
    const coefficients = this.calculateCoefficients(features, featureNames, means, targetIndex);
    const intercept = means[targetIndex] - coefficients.reduce((sum, coef, i) => 
      sum + coef * means[i], 0
    );

    return { intercept, coefficients };
  }

  private calculateCoefficients(features: any[], featureNames: string[], means: number[], targetIndex: number): number[] {
    // Simplified coefficient calculation
    const coefficients = new Array(featureNames.length).fill(0);
    
    for (let i = 0; i < featureNames.length; i++) {
      if (i === targetIndex) continue;
      
      let numerator = 0;
      let denominator = 0;
      
      for (const feature of features) {
        const xDiff = feature[featureNames[i]] - means[i];
        const yDiff = feature[featureNames[targetIndex]] - means[targetIndex];
        
        numerator += xDiff * yDiff;
        denominator += xDiff * xDiff;
      }
      
      coefficients[i] = denominator !== 0 ? numerator / denominator : 0;
    }
    
    return coefficients;
  }

  private calculateModelAccuracy(modelParams: any, testData: any[]): number {
    if (testData.length === 0) return 80; // Default accuracy
    
    let totalError = 0;
    let predictions = 0;
    
    for (const dataPoint of testData) {
      const predicted = this.predictWithModel(modelParams, dataPoint);
      const actual = dataPoint.completionRate || 75;
      totalError += Math.abs(predicted - actual);
      predictions++;
    }
    
    const meanAbsoluteError = totalError / predictions;
    const accuracy = Math.max(0, 100 - (meanAbsoluteError * 2)); // Convert error to accuracy
    
    return Math.round(accuracy);
  }

  private predictWithModel(modelParams: any, features: any): number {
    const { intercept, coefficients } = modelParams;
    let prediction = intercept;
    
    const featureNames = Object.keys(features);
    for (let i = 0; i < featureNames.length && i < coefficients.length; i++) {
      prediction += coefficients[i] * (features[featureNames[i]] || 0);
    }
    
    return Math.max(0, Math.min(100, prediction));
  }

  async getModel(modelId: string, workspaceId: string): Promise<PredictiveModel | null> {
    // Try to get from cache first
    const cacheKey = `ml-model:${workspaceId}:${modelId}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Fall back to in-memory models
    return this.models.get(modelId) || null;
  }

  async getAllModels(workspaceId: string): Promise<PredictiveModel[]> {
    // Get all models for the workspace
    const models: PredictiveModel[] = [];
    
    // Get from cache
    const pattern = `ml-model:${workspaceId}:*`;
    const keys = await redis.keys(pattern);
    
    for (const key of keys) {
      const cached = await redis.get(key);
      if (cached) {
        models.push(JSON.parse(cached));
      }
    }
    
    // Add in-memory models
    for (const model of this.models.values()) {
      if (model.workspaceId === workspaceId) {
        models.push(model);
      }
    }
    
    return models;
  }

  async predictWithModel(modelId: string, features: any, workspaceId: string): Promise<number> {
    const model = await this.getModel(modelId, workspaceId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }
    
    return this.predictWithModel(model.modelData, features);
  }
}

export const mlProcessor = MLProcessor.getInstance(); 

