import { api } from '@/lib/fetch';

export interface MLInsight {
  id: string;
  type: 'prediction' | 'anomaly' | 'recommendation' | 'pattern' | 'risk';
  title: string;
  description: string;
  confidence: number; // 0-100
  impact: 'low' | 'medium' | 'high' | 'critical';
  actionable: boolean;
  data: Record<string, unknown>;
  aiSuggestions: {
    optimizations: string[];
    alternatives: string[];
    bestPractices: string[];
  };
  createdAt: string;
}

export interface MLPrediction {
  id: string;
  metric: string;
  currentValue: number;
  predictedValue: number;
  timeframe: string; // '1_week', '1_month', '3_months'
  confidence: number;
  factors: string[];
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface MLModel {
  id: string;
  name: string;
  type: 'regression' | 'classification' | 'anomaly_detection' | 'recommendation';
  accuracy: number;
  lastTrained: string;
  features: string[];
  status: 'active' | 'training' | 'inactive';
}

export interface AnalyticsRequest {
  projectId?: string;
  workspaceId?: string;
  timeframe?: '1_week' | '1_month' | '3_months' | '6_months';
  includeInsights?: boolean;
  includePredictions?: boolean;
  includeAnomalies?: boolean;
}

export interface AnalyticsDashboard {
  summary: {
    totalInsights: number;
    totalPredictions: number;
    highPriorityAlerts: number;
    actionableItems: number;
    averageConfidence: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    topRecommendations: {
      title: string;
      impact: string;
      confidence: number;
    }[];
  };
  insights: Record<string, MLInsight[]>;
  predictions: MLPrediction[];
  generatedAt: string;
  params: AnalyticsRequest;
}

export interface TrendData {
  metric: string;
  timeframe: string;
  data: {
    date: string;
    value: number;
  }[];
  trend: 'increasing' | 'decreasing' | 'stable';
  generatedAt: string;
}

export class MLAnalyticsAPI {
  // Get ML insights
  static async getInsights(params: AnalyticsRequest = {}): Promise<{
    success: boolean;
    insights: MLInsight[];
    totalInsights: number;
    highConfidenceInsights: number;
    actionableInsights: number;
  }> {
    const response = await api.post('/analytics/ml/insights', {
      includeInsights: true,
      ...params
    });
    return response.json();
  }

  // Get ML predictions
  static async getPredictions(params: AnalyticsRequest = {}): Promise<{
    success: boolean;
    predictions: MLPrediction[];
    totalPredictions: number;
    highConfidencePredictions: number;
  }> {
    const response = await api.post('/analytics/ml/predictions', {
      includePredictions: true,
      ...params
    });
    return response.json();
  }

  // Get comprehensive analytics dashboard
  static async getDashboard(params: AnalyticsRequest = {}): Promise<{
    success: boolean;
  } & AnalyticsDashboard> {
    const response = await api.post('/analytics/ml/dashboard', {
      includeInsights: true,
      includePredictions: true,
      includeAnomalies: true,
      ...params
    });
    return response.json();
  }

  // Get anomaly detection results
  static async getAnomalies(params: AnalyticsRequest = {}): Promise<{
    success: boolean;
    anomalies: MLInsight[];
    totalAnomalies: number;
    severeAnomalies: number;
    detectedAt: string;
  }> {
    const response = await api.post('/analytics/ml/anomalies', {
      includeAnomalies: true,
      ...params
    });
    return response.json();
  }

  // Get performance trends for a specific metric
  static async getTrends(
    metric: string,
    projectId?: string,
    timeframe: string = '1_month'
  ): Promise<{
    success: boolean;
  } & TrendData> {
    const params = new URLSearchParams({
      timeframe,
      ...(projectId && { projectId })
    });
    
    const response = await api.get(`/analytics/ml/trends/${metric}?${params}`);
    return response.json();
  }

  // Get ML model information
  static async getModels(): Promise<{
    success: boolean;
    models: MLModel[];
    totalModels: number;
    activeModels: number;
    averageAccuracy: number;
  }> {
    const response = await api.get('/analytics/ml/models');
    return response.json();
  }

  // Get insights by type
  static async getInsightsByType(
    type: MLInsight['type'],
    params: AnalyticsRequest = {}
  ): Promise<MLInsight[]> {
    const result = await this.getInsights(params);
    return result.insights.filter(insight => insight.type === type);
  }

  // Get high-priority alerts
  static async getHighPriorityAlerts(params: AnalyticsRequest = {}): Promise<MLInsight[]> {
    const result = await this.getInsights(params);
    return result.insights.filter(
      insight => insight.impact === 'high' || insight.impact === 'critical'
    );
  }

  // Get actionable recommendations
  static async getActionableRecommendations(params: AnalyticsRequest = {}): Promise<MLInsight[]> {
    const result = await this.getInsights(params);
    return result.insights.filter(
      insight => insight.actionable && insight.type === 'recommendation'
    );
  }

  // Get risk assessment
  static async getRiskAssessment(params: AnalyticsRequest = {}): Promise<{
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
    risks: MLInsight[];
    recommendations: string[];
  }> {
    const result = await this.getInsights(params);
    const risks = result.insights.filter(insight => insight.type === 'risk');
    
    // Calculate overall risk level
    const criticalRisks = risks.filter(r => r.impact === 'critical');
    const highRisks = risks.filter(r => r.impact === 'high');
    
    let overallRisk: 'low' | 'medium' | 'high' | 'critical';
    if (criticalRisks.length > 0) {
      overallRisk = 'critical';
    } else if (highRisks.length >= 2) {
      overallRisk = 'high';
    } else if (risks.length > 0) {
      overallRisk = 'medium';
    } else {
      overallRisk = 'low';
    }

    // Extract recommendations
    const recommendations = risks
      .flatMap(risk => risk.aiSuggestions.optimizations)
      .slice(0, 5); // Top 5 recommendations

    return {
      overallRisk,
      risks,
      recommendations
    };
  }

  // Get productivity insights
  static async getProductivityInsights(params: AnalyticsRequest = {}): Promise<{
    velocityPrediction: MLPrediction | null;
    productivityTrend: TrendData;
    teamEfficiency: number;
    recommendations: MLInsight[];
  }> {
    const [predictions, trends, insights] = await Promise.all([
      this.getPredictions(params),
      this.getTrends('team_velocity', params.projectId, params.timeframe),
      this.getInsightsByType('recommendation', params)
    ]);

    const velocityPrediction = predictions.predictions.find(
      p => p.metric === 'Team Productivity Index'
    ) || null;

    const productivityRecommendations = insights.filter(
      insight => insight.title.toLowerCase().includes('productivity') ||
                 insight.title.toLowerCase().includes('efficiency')
    );

    // Mock team efficiency calculation
    const teamEfficiency = trends.data.length > 0 
      ? Math.round(trends.data.slice(-7).reduce((sum, d) => sum + d.value, 0) / 7)
      : 75;

    return {
      velocityPrediction,
      productivityTrend: trends,
      teamEfficiency,
      recommendations: productivityRecommendations
    };
  }

  // Get quality insights
  static async getQualityInsights(params: AnalyticsRequest = {}): Promise<{
    qualityScore: number;
    qualityTrend: TrendData;
    qualityAnomalies: MLInsight[];
    improvements: MLInsight[];
  }> {
    const [trends, anomalies, recommendations] = await Promise.all([
      this.getTrends('quality_score', params.projectId, params.timeframe),
      this.getAnomalies(params),
      this.getInsightsByType('recommendation', params)
    ]);

    const qualityScore = trends.data.length > 0
      ? Math.round(trends.data[trends.data.length - 1].value)
      : 85;

    const qualityAnomalies = anomalies.anomalies.filter(
      anomaly => anomaly.title.toLowerCase().includes('quality')
    );

    const qualityImprovements = recommendations.filter(
      rec => rec.title.toLowerCase().includes('quality') ||
             rec.description.toLowerCase().includes('quality')
    );

    return {
      qualityScore,
      qualityTrend: trends,
      qualityAnomalies,
      improvements: qualityImprovements
    };
  }

  // Export insights to different formats
  static async exportInsights(
    insights: MLInsight[],
    format: 'json' | 'csv' | 'pdf' = 'json'
  ): Promise<Blob> {
    switch (format) {
      case 'json':
        return new Blob([JSON.stringify(insights, null, 2)], {
          type: 'application/json'
        });
      
      case 'csv':
        const csv = this.convertInsightsToCSV(insights);
        return new Blob([csv], { type: 'text/csv' });
      
      case 'pdf':
        // This would integrate with the PDF API
        throw new Error('PDF export not yet implemented');
      
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  // Convert insights to CSV format
  private static convertInsightsToCSV(insights: MLInsight[]): string {
    const headers = [
      'ID', 'Type', 'Title', 'Description', 'Confidence', 'Impact', 
      'Actionable', 'Created At', 'Optimizations', 'Alternatives', 'Best Practices'
    ];

    const rows = insights.map(insight => [
      insight.id,
      insight.type,
      insight.title,
      insight.description,
      insight.confidence,
      insight.impact,
      insight.actionable,
      insight.createdAt,
      insight.aiSuggestions.optimizations.join('; '),
      insight.aiSuggestions.alternatives.join('; '),
      insight.aiSuggestions.bestPractices.join('; ')
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }

  // Download insights as file
  static async downloadInsights(
    insights: MLInsight[],
    filename: string = 'ml-insights',
    format: 'json' | 'csv' = 'json'
  ): Promise<void> {
    try {
      const blob = await this.exportInsights(insights, format);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading insights:', error);
      throw error;
    }
  }
}

export default MLAnalyticsAPI;