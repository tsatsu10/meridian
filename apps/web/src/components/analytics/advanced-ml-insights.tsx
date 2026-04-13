// Phase 6 Enhancement: Advanced ML-Powered Analytics Insights
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  AlertTriangle, 
  CheckCircle,
  Users,
  Clock,
  Zap,
  Eye,
  Download,
  RefreshCw,
  Lightbulb,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  Cpu,
  Loader2
} from 'lucide-react';
import { LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { MLAnalyticsAPI, type MLInsight, type MLPrediction, type AnalyticsDashboard } from '@/services/ml-analytics-api';
import { toast } from '@/lib/toast';

interface PredictiveModel {
  id: string;
  name: string;
  type: 'regression' | 'classification' | 'clustering' | 'time_series';
  accuracy: number;
  lastTrained: Date;
  dataPoints: number;
  features: string[];
  predictions: any[];
}

interface AdvancedMLInsightsProps {
  projectId?: string;
  workspaceId?: string;
  timeframe?: '1_week' | '1_month' | '3_months' | '6_months';
  onInsightAction?: (insight: MLInsight, action: string) => void;
  className?: string;
}

const sampleInsights: MLInsight[] = [
  {
    id: 'productivity-trend',
    type: 'prediction',
    category: 'productivity',
    title: 'Team Productivity Forecast',
    description: 'Based on current trends, team productivity is expected to increase by 15% next month',
    confidence: 87,
    impact: 'high',
    actionable: true,
    data: {
      currentTrend: 'increasing',
      predictedGrowth: 15,
      factors: ['reduced_meetings', 'new_tools', 'team_experience']
    },
    insights: [
      'Meeting reduction has contributed to 8% productivity gain',
      'New automation tools are showing positive adoption',
      'Team experience level is at an all-time high'
    ],
    recommendations: [
      'Continue current meeting reduction strategy',
      'Invest in additional automation tools',
      'Consider expanding team responsibilities'
    ],
    created: new Date()
  },
  {
    id: 'quality-anomaly',
    type: 'anomaly',
    category: 'quality',
    title: 'Quality Score Anomaly Detected',
    description: 'Unusual pattern in code quality metrics for the mobile development team',
    confidence: 94,
    impact: 'medium',
    actionable: true,
    data: {
      affectedTeam: 'Mobile Development',
      metricType: 'code_quality',
      deviation: -23,
      timeline: 'last_2_weeks'
    },
    insights: [
      'Code review time has decreased by 40%',
      'Technical debt accumulation rate increased',
      'Sprint velocity prioritized over quality gates'
    ],
    recommendations: [
      'Reinforce code review processes',
      'Allocate dedicated technical debt sprints',
      'Balance velocity and quality metrics in team KPIs'
    ],
    created: new Date()
  },
  {
    id: 'resource-optimization',
    type: 'recommendation',
    category: 'resource',
    title: 'Resource Allocation Optimization',
    description: 'ML analysis suggests reallocating 2 developers from Team A to Team B for optimal throughput',
    confidence: 76,
    impact: 'high',
    actionable: true,
    data: {
      sourceTeam: 'Team A',
      targetTeam: 'Team B',
      suggestedCount: 2,
      expectedImprovement: 28
    },
    insights: [
      'Team A has 30% idle capacity in current sprint',
      'Team B is bottlenecked with critical features',
      'Skills overlap analysis shows good compatibility'
    ],
    recommendations: [
      'Temporary reallocation for 2-3 sprints',
      'Cross-training to increase team flexibility',
      'Regular capacity utilization reviews'
    ],
    created: new Date()
  },
  {
    id: 'risk-assessment',
    type: 'risk',
    category: 'timeline',
    title: 'Project Deadline Risk',
    description: 'High probability (78%) that Project Phoenix will exceed deadline by 2-3 weeks',
    confidence: 78,
    impact: 'critical',
    actionable: true,
    data: {
      project: 'Project Phoenix',
      riskLevel: 'high',
      delayPrediction: { min: 2, max: 3, unit: 'weeks' },
      riskFactors: ['scope_creep', 'dependency_delays', 'resource_constraints']
    },
    insights: [
      'Scope has increased by 25% without timeline adjustment',
      '3 external dependencies are behind schedule',
      'Key developer will be unavailable for 1 week'
    ],
    recommendations: [
      'Immediate scope review and prioritization',
      'Escalate dependency delays with external teams',
      'Identify backup resources or adjust timeline'
    ],
    created: new Date()
  },
  {
    id: 'pattern-collaboration',
    type: 'pattern',
    category: 'performance',
    title: 'Collaboration Pattern Analysis',
    description: 'Teams with daily standups show 32% better task completion rates',
    confidence: 91,
    impact: 'medium',
    actionable: true,
    data: {
      pattern: 'daily_standups',
      correlation: 0.78,
      improvement: 32,
      sampleSize: 156
    },
    insights: [
      'Daily communication reduces blockers by 45%',
      'Early problem identification saves 2.3 days per issue',
      'Team alignment scores improve with regular check-ins'
    ],
    recommendations: [
      'Implement daily standups for all teams',
      'Focus on blocker identification and resolution',
      'Track alignment metrics to measure effectiveness'
    ],
    created: new Date()
  }
];

const predictiveModels: PredictiveModel[] = [
  {
    id: 'sprint-velocity',
    name: 'Sprint Velocity Predictor',
    type: 'regression',
    accuracy: 89.3,
    lastTrained: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    dataPoints: 1247,
    features: ['team_size', 'story_points', 'technical_debt', 'external_dependencies'],
    predictions: [
      { sprint: 'Sprint 23', predicted: 42, actual: null, confidence: 0.89 },
      { sprint: 'Sprint 24', predicted: 45, actual: null, confidence: 0.87 },
      { sprint: 'Sprint 25', predicted: 43, actual: null, confidence: 0.85 }
    ]
  },
  {
    id: 'quality-predictor',
    name: 'Code Quality Forecaster',
    type: 'classification',
    accuracy: 94.1,
    lastTrained: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    dataPoints: 2156,
    features: ['complexity', 'review_time', 'author_experience', 'change_size'],
    predictions: [
      { category: 'High Quality', probability: 0.73 },
      { category: 'Medium Quality', probability: 0.22 },
      { category: 'Low Quality', probability: 0.05 }
    ]
  },
  {
    id: 'resource-optimizer',
    name: 'Resource Allocation Optimizer',
    type: 'clustering',
    accuracy: 82.7,
    lastTrained: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    dataPoints: 892,
    features: ['skills', 'workload', 'availability', 'project_priority'],
    predictions: [
      { cluster: 'High Performers', members: 8, utilization: 0.92 },
      { cluster: 'Balanced Team', members: 12, utilization: 0.78 },
      { cluster: 'Development Focus', members: 6, utilization: 0.85 }
    ]
  }
];


// TensorFlow.js Model Training and Prediction
async function trainProductivityModel(data: any[]) {
  const xs = tf.tensor2d(data.map((d, i) => [i]), [data.length, 1]);
  const ys = tf.tensor2d(data.map(d => [d.productivity]), [data.length, 1]);

  const model = tf.sequential();
  model.add(tf.layers.dense({ units: 1, inputShape: [1] }));

  model.compile({ loss: 'meanSquaredError', optimizer: 'sgd' });

  await model.fit(xs, ys, { epochs: 50 });
  return model;
}

function predictNextProductivity(model: tf.LayersModel, lastIndex: number) {
  const nextIndex = tf.tensor2d([[lastIndex + 1]]);
  const prediction = model.predict(nextIndex) as tf.Tensor;
  return prediction.dataSync()[0];
}

// Simple Anomaly Detection Algorithm
function detectProductivityAnomaly(data: any[]): MLInsight | null {
  if (data.length < 5) return null; // Need enough data to calculate average

  const recentProductivityValues = data.slice(-5).map(d => d.productivity);
  const sum = recentProductivityValues.reduce((a, b) => a + b, 0);
  const average = sum / recentProductivityValues.length;

  const lastValue = data[data.length - 1].productivity;

  // Define a threshold for anomaly (e.g., 20% deviation from average)
  const anomalyThreshold = 0.20;

  if (Math.abs((lastValue - average) / average) > anomalyThreshold) {
    return {
      id: `productivity-anomaly-${Date.now()}`,
      type: 'anomaly',
      category: 'productivity',
      title: 'Productivity Anomaly Detected',
      description: `Latest productivity (${lastValue.toFixed(2)}) deviates significantly from recent average (${average.toFixed(2)}).`,
      confidence: 90,
      impact: 'high',
      actionable: true,
      data: { lastValue, average, deviation: (lastValue - average) / average },
      insights: ['Sudden change in productivity detected.'],
      recommendations: ['Investigate recent changes or external factors affecting productivity.'],
      created: new Date(),
    };
  }

  return null;
}

// Simple Pattern Recognition Algorithm
function detectProductivityPattern(data: any[]): MLInsight | null {
  if (data.length < 5) return null; // Need at least 5 data points to detect a trend

  const recentData = data.slice(-5); // Look at the last 5 data points
  let increasingCount = 0;
  let decreasingCount = 0;

  for (let i = 1; i < recentData.length; i++) {
    if (recentData[i].productivity > recentData[i - 1].productivity) {
      increasingCount++;
    } else if (recentData[i].productivity < recentData[i - 1].productivity) {
      decreasingCount++;
    }
  }

  if (increasingCount >= 4) {
    return {
      id: `productivity-pattern-increasing-${Date.now()}`,
      type: 'pattern',
      category: 'productivity',
      title: 'Consistent Productivity Increase Detected',
      description: 'Productivity has consistently increased over the last 5 periods.',
      confidence: 85,
      impact: 'medium',
      actionable: true,
      data: { trend: 'increasing', periods: 5 },
      insights: ['Team is showing sustained growth in productivity.'],
      recommendations: ['Analyze factors contributing to this growth and replicate them.'],
      created: new Date(),
    };
  } else if (decreasingCount >= 4) {
    return {
      id: `productivity-pattern-decreasing-${Date.now()}`,
      type: 'pattern',
      category: 'productivity',
      title: 'Consistent Productivity Decrease Detected',
      description: 'Productivity has consistently decreased over the last 5 periods.',
      confidence: 80,
      impact: 'high',
      actionable: true,
      data: { trend: 'decreasing', periods: 5 },
      insights: ['Team productivity is consistently declining.'],
      recommendations: ['Investigate potential blockers or issues affecting productivity.'],
      created: new Date(),
    };
  }

  return null;
}

export function AdvancedMLInsights({ 
  projectId,
  workspaceId,
  timeframe = '1_month',
  onInsightAction,
  className 
}: AdvancedMLInsightsProps) {
  const [selectedInsightType, setSelectedInsightType] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch ML analytics dashboard data
  const { 
    data: dashboardData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['ml-analytics-dashboard', projectId, workspaceId, timeframe],
    queryFn: () => MLAnalyticsAPI.getDashboard({
      projectId,
      workspaceId,
      timeframe,
      includeInsights: true,
      includePredictions: true,
      includeAnomalies: true
    }),
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  const { data: trendsData } = useQuery({
    queryKey: ['ml-trends', 'team_velocity', projectId, timeframe],
    queryFn: () => MLAnalyticsAPI.getTrends('team_velocity', projectId, timeframe),
  });

  const filteredInsights = useMemo(() => {
    if (selectedCategory === 'all') return insights;
    return insights.filter(insight => insight.category === selectedCategory);
  }, [insights, selectedCategory]);

  const getInsightIcon = (type: MLInsight['type']) => {
    switch (type) {
      case 'prediction': return TrendingUp;
      case 'anomaly': return AlertTriangle;
      case 'recommendation': return Lightbulb;
      case 'pattern': return Activity;
      case 'risk': return AlertTriangle;
      default: return Brain;
    }
  };

  const getImpactColor = (impact: MLInsight['impact']) => {
    switch (impact) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const refreshInsights = async () => {
    setIsRefreshing(true);
    try {
      // Train model and predict next productivity
      const model = await trainProductivityModel(timeSeriesData);
      const lastIndex = timeSeriesData.length - 1;
      const predictedProductivity = predictNextProductivity(model, lastIndex);

      const newInsight: MLInsight = {
        id: `productivity-prediction-${Date.now()}`,
        type: 'prediction',
        category: 'productivity',
        title: 'Next Period Productivity Prediction',
        description: `Predicted productivity for the next period: ${predictedProductivity.toFixed(2)}`,
        confidence: 90, // Placeholder confidence
        impact: 'medium',
        actionable: true,
        data: { predictedProductivity },
        insights: [`Based on historical data, the model predicts a productivity of ${predictedProductivity.toFixed(2)} for the upcoming period.`],
        recommendations: ['Monitor actual productivity against prediction', 'Adjust resources if deviation is significant'],
        created: new Date(),
      };

      setInsights(prevInsights => {
        const updatedInsights = [
          newInsight,
          ...prevInsights.filter(i => i.id !== 'productivity-trend' && i.type !== 'pattern') // Remove old sample prediction and existing patterns
        ];

        const patternInsight = detectProductivityPattern(timeSeriesData);
        if (patternInsight) {
          updatedInsights.push(patternInsight);
        }

        const anomalyInsight = detectProductivityAnomaly(timeSeriesData);
        if (anomalyInsight) {
          updatedInsights.push(anomalyInsight);
        }
        return updatedInsights;
      });

    } catch (error) {
      console.error("Error refreshing insights:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="w-6 h-6 text-purple-600" />
              Advanced ML Insights
            </h2>
            <p className="text-muted-foreground">
              AI-powered analytics with predictive insights and recommendations
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="productivity">Productivity</SelectItem>
                <SelectItem value="quality">Quality</SelectItem>
                <SelectItem value="timeline">Timeline</SelectItem>
                <SelectItem value="resource">Resource</SelectItem>
                <SelectItem value="performance">Performance</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={refreshInsights}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <Tabs defaultValue="insights" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="insights">AI Insights</TabsTrigger>
            <TabsTrigger value="predictions">Predictions</TabsTrigger>
            <TabsTrigger value="models">ML Models</TabsTrigger>
            <TabsTrigger value="trends">Trend Analysis</TabsTrigger>
          </TabsList>

          {/* AI Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-600" />
                    <div>
                      <div className="text-2xl font-bold">{insights.length}</div>
                      <div className="text-sm text-muted-foreground">Active Insights</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <div>
                      <div className="text-2xl font-bold">
                        {insights.filter(i => i.impact === 'critical' || i.impact === 'high').length}
                      </div>
                      <div className="text-sm text-muted-foreground">High Priority</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-green-600" />
                    <div>
                      <div className="text-2xl font-bold">
                        {Math.round(insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Avg Confidence</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <div>
                      <div className="text-2xl font-bold">
                        {insights.filter(i => i.actionable).length}
                      </div>
                      <div className="text-sm text-muted-foreground">Actionable</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Insights List */}
            <div className="space-y-4">
              {filteredInsights.map((insight) => {
                const IconComponent = getInsightIcon(insight.type);
                return (
                  <Card key={insight.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                            <IconComponent className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <CardTitle className="text-lg">{insight.title}</CardTitle>
                              <Badge variant="outline" className="capitalize">
                                {insight.type}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground">{insight.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getImpactColor(insight.impact)}`}>
                            {insight.impact} impact
                          </div>
                          <Badge variant="secondary">
                            {insight.confidence}% confidence
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Confidence Bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Confidence Level</span>
                          <span>{insight.confidence}%</span>
                        </div>
                        <Progress value={insight.confidence} className="h-2" />
                      </div>

                      {/* Key Insights */}
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          Key Insights
                        </h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {insight.insights.map((item, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Recommendations */}
                      {insight.recommendations.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-1">
                            <Lightbulb className="w-4 h-4" />
                            Recommendations
                          </h4>
                          <ul className="text-sm space-y-1">
                            {insight.recommendations.map((rec, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Actions */}
                      {insight.actionable && (
                        <div className="flex gap-2 pt-2">
                          <Button 
                            size="sm" 
                            onClick={() => onInsightAction(insight, 'implement')}
                          >
                            <Zap className="w-4 h-4 mr-1" />
                            Take Action
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => onInsightAction(insight, 'dismiss')}
                          >
                            Dismiss
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => onInsightAction(insight, 'export')}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Export
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Predictions Tab */}
          <TabsContent value="predictions" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sprint Velocity Prediction */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Sprint Velocity Forecast
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <RechartsLine data={timeSeriesData.slice(-10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{fontSize: 12}} />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="velocity" stroke="#3b82f6" strokeWidth={2} />
                    </RechartsLine>
                  </ResponsiveContainer>
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Prediction:</strong> Next sprint velocity: 42-45 story points (89% confidence)
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Quality Prediction */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Quality Score Prediction
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={predictiveModels[1].predictions}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" tick={{fontSize: 12}} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="probability" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>Prediction:</strong> 73% probability of high quality output in next release
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Risk Factors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Risk Factor Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Schedule Risk</span>
                      <Badge variant="destructive">High</Badge>
                    </div>
                    <Progress value={78} className="h-2 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      78% probability of deadline slippage
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Quality Risk</span>
                      <Badge variant="secondary">Medium</Badge>
                    </div>
                    <Progress value={45} className="h-2 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      45% risk of quality issues
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Resource Risk</span>
                      <Badge variant="outline">Low</Badge>
                    </div>
                    <Progress value={23} className="h-2 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      23% risk of resource constraints
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ML Models Tab */}
          <TabsContent value="models" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {predictiveModels.map((model) => (
                <Card key={model.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Cpu className="w-5 h-5" />
                      {model.name}
                    </CardTitle>
                    <Badge variant="outline" className="w-fit">
                      {model.type}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Accuracy</span>
                        <span className="font-medium">{model.accuracy}%</span>
                      </div>
                      <Progress value={model.accuracy} className="h-2" />
                    </div>

                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Data Points:</span>
                        <span>{model.dataPoints.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Trained:</span>
                        <span>{model.lastTrained.toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Features:</span>
                        <span>{model.features.length}</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <h4 className="font-medium mb-2">Features</h4>
                      <div className="flex flex-wrap gap-1">
                        {model.features.map((feature) => (
                          <Badge key={feature} variant="secondary" className="text-xs">
                            {feature.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <Button variant="outline" size="sm" className="w-full">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Retrain Model
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Trend Analysis Tab */}
          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Multi-Metric Trend Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <RechartsLine data={timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{fontSize: 12}} />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="productivity" stroke="#3b82f6" strokeWidth={2} name="Productivity" />
                    <Line type="monotone" dataKey="quality" stroke="#10b981" strokeWidth={2} name="Quality" />
                    <Line type="monotone" dataKey="velocity" stroke="#f59e0b" strokeWidth={2} name="Velocity" />
                  </RechartsLine>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Correlation Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <span className="text-sm">Productivity ↔ Quality</span>
                      <Badge variant="default">Strong (0.78)</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                      <span className="text-sm">Velocity ↔ Quality</span>
                      <Badge variant="secondary">Moderate (0.45)</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                      <span className="text-sm">Productivity ↔ Velocity</span>
                      <Badge variant="outline">Weak (0.23)</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Seasonal Patterns</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      Monday productivity 15% higher than average
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      Quality scores peak mid-sprint
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                      Velocity drops 8% in final week of month
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full" />
                      Sprint retrospectives improve next sprint by 12%
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}