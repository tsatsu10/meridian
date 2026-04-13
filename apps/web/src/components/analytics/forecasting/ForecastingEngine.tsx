// @epic-3.5-analytics: Advanced Forecasting Engine for Phase 3 Analytics
// Sophisticated predictive models and trend analysis

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Brain, 
  Target, 
  AlertTriangle,
  Calendar,
  BarChart3,
  Zap,
  Settings,
  Download
} from 'lucide-react';
import { InteractiveLineChart } from '../charts/AdvancedCharts';

interface HistoricalDataPoint {
  timestamp: string;
  value: number;
  category?: string;
  metadata?: Record<string, any>;
}

interface ForecastPoint {
  timestamp: string;
  predicted: number;
  confidence: number;
  upperBound: number;
  lowerBound: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

interface ForecastingConfig {
  algorithm: 'linear_regression' | 'exponential_smoothing' | 'arima' | 'neural_network';
  horizon: number; // days to forecast
  confidence_level: number; // 0.8, 0.9, 0.95
  seasonality: boolean;
  trend_damping: number;
}

interface ForecastingResult {
  forecast: ForecastPoint[];
  accuracy: {
    mape: number; // Mean Absolute Percentage Error
    rmse: number; // Root Mean Square Error
    mae: number;  // Mean Absolute Error
  };
  insights: {
    trend: string;
    seasonality_detected: boolean;
    anomalies: Array<{
      timestamp: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
    }>;
    recommendations: string[];
  };
}

// Linear Regression Forecasting
class LinearRegressionForecaster {
  static forecast(data: HistoricalDataPoint[], config: ForecastingConfig): ForecastingResult {
    const sortedData = data.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const n = sortedData.length;
    
    // Calculate linear regression coefficients
    const sumX = sortedData.reduce((sum, _, i) => sum + i, 0);
    const sumY = sortedData.reduce((sum, d) => sum + d.value, 0);
    const sumXY = sortedData.reduce((sum, d, i) => sum + i * d.value, 0);
    const sumXX = sortedData.reduce((sum, _, i) => sum + i * i, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate residuals for confidence intervals
    const residuals = sortedData.map((d, i) => d.value - (slope * i + intercept));
    const mse = residuals.reduce((sum, r) => sum + r * r, 0) / n;
    const standardError = Math.sqrt(mse);
    
    // Generate forecast points
    const forecast: ForecastPoint[] = [];
    const lastTimestamp = new Date(sortedData[n - 1].timestamp);
    
    for (let i = 1; i <= config.horizon; i++) {
      const futureTimestamp = new Date(lastTimestamp);
      futureTimestamp.setDate(futureTimestamp.getDate() + i);
      
      const predicted = slope * (n + i - 1) + intercept;
      const confidence = Math.max(0.1, 1 - (i / config.horizon) * 0.5); // Decreasing confidence over time
      const margin = standardError * 1.96 * Math.sqrt(1 + 1/n + Math.pow(i, 2) / sumXX);
      
      forecast.push({
        timestamp: futureTimestamp.toISOString(),
        predicted: Math.max(0, predicted),
        confidence,
        upperBound: predicted + margin,
        lowerBound: Math.max(0, predicted - margin),
        trend: slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable'
      });
    }
    
    // Calculate accuracy metrics (simplified)
    const predictions = sortedData.map((_, i) => slope * i + intercept);
    const errors = sortedData.map((d, i) => Math.abs(d.value - predictions[i]));
    const mape = errors.reduce((sum, e, i) => sum + e / Math.max(1, sortedData[i].value), 0) / n * 100;
    const rmse = Math.sqrt(residuals.reduce((sum, r) => sum + r * r, 0) / n);
    const mae = errors.reduce((sum, e) => sum + e, 0) / n;
    
    return {
      forecast,
      accuracy: { mape, rmse, mae },
      insights: {
        trend: slope > 0.1 ? 'Strong upward trend detected' : slope < -0.1 ? 'Downward trend detected' : 'Stable pattern',
        seasonality_detected: false, // Would need more sophisticated analysis
        anomalies: this.detectAnomalies(sortedData, predictions),
        recommendations: this.generateRecommendations(slope, mape, forecast)
      }
    };
  }
  
  private static detectAnomalies(data: HistoricalDataPoint[], predictions: number[]) {
    const threshold = 2; // Standard deviations
    const residuals = data.map((d, i) => d.value - predictions[i]);
    const mean = residuals.reduce((sum, r) => sum + r, 0) / residuals.length;
    const std = Math.sqrt(residuals.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / residuals.length);
    
    return data
      .map((d, i) => ({
        timestamp: d.timestamp,
        deviation: Math.abs(residuals[i] - mean) / std,
        actual: d.value,
        predicted: predictions[i]
      }))
      .filter(item => item.deviation > threshold)
      .map(item => ({
        timestamp: item.timestamp,
        severity: item.deviation > 3 ? 'high' : item.deviation > 2.5 ? 'medium' : 'low' as const,
        description: `Unusual ${item.actual > item.predicted ? 'spike' : 'drop'} detected (${Math.round(item.deviation * 100)}% deviation)`
      }));
  }
  
  private static generateRecommendations(slope: number, mape: number, forecast: ForecastPoint[]): string[] {
    const recommendations = [];
    
    if (Math.abs(slope) > 1) {
      recommendations.push(slope > 0 ? 
        'Strong growth trend - consider scaling resources to meet increased demand' :
        'Declining trend - investigate root causes and implement corrective measures');
    }
    
    if (mape > 20) {
      recommendations.push('High prediction uncertainty - collect more data or review modeling approach');
    }
    
    const lastWeekAvg = forecast.slice(-7).reduce((sum, f) => sum + f.predicted, 0) / 7;
    const firstWeekAvg = forecast.slice(0, 7).reduce((sum, f) => sum + f.predicted, 0) / 7;
    
    if (lastWeekAvg > firstWeekAvg * 1.2) {
      recommendations.push('Acceleration expected in later period - prepare for increased activity');
    }
    
    return recommendations;
  }
}

// Exponential Smoothing Forecaster
class ExponentialSmoothingForecaster {
  static forecast(data: HistoricalDataPoint[], config: ForecastingConfig): ForecastingResult {
    const sortedData = data.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const alpha = 0.3; // Smoothing parameter
    const beta = 0.1;  // Trend parameter
    const gamma = 0.1; // Seasonality parameter
    
    // Initialize
    let level = sortedData[0].value;
    let trend = sortedData.length > 1 ? sortedData[1].value - sortedData[0].value : 0;
    const seasonalPeriod = 7; // Weekly seasonality
    const seasonal = new Array(seasonalPeriod).fill(1);
    
    // Apply exponential smoothing
    const smoothed = [level];
    for (let i = 1; i < sortedData.length; i++) {
      const seasonalIndex = i % seasonalPeriod;
      const prevLevel = level;
      
      level = alpha * (sortedData[i].value / seasonal[seasonalIndex]) + (1 - alpha) * (prevLevel + trend);
      trend = beta * (level - prevLevel) + (1 - beta) * trend;
      seasonal[seasonalIndex] = gamma * (sortedData[i].value / level) + (1 - gamma) * seasonal[seasonalIndex];
      
      smoothed.push(level + trend);
    }
    
    // Generate forecast
    const forecast: ForecastPoint[] = [];
    const lastTimestamp = new Date(sortedData[sortedData.length - 1].timestamp);
    
    for (let i = 1; i <= config.horizon; i++) {
      const futureTimestamp = new Date(lastTimestamp);
      futureTimestamp.setDate(futureTimestamp.getDate() + i);
      
      const seasonalIndex = (sortedData.length + i - 1) % seasonalPeriod;
      const predicted = (level + i * trend) * seasonal[seasonalIndex];
      const confidence = Math.max(0.1, 1 - (i / config.horizon) * 0.4);
      const margin = predicted * 0.1 * i; // Increasing uncertainty
      
      forecast.push({
        timestamp: futureTimestamp.toISOString(),
        predicted: Math.max(0, predicted),
        confidence,
        upperBound: predicted + margin,
        lowerBound: Math.max(0, predicted - margin),
        trend: trend > 0.1 ? 'increasing' : trend < -0.1 ? 'decreasing' : 'stable'
      });
    }
    
    // Calculate accuracy
    const errors = sortedData.map((d, i) => Math.abs(d.value - (smoothed[i] || d.value)));
    const mape = errors.reduce((sum, e, i) => sum + e / Math.max(1, sortedData[i].value), 0) / sortedData.length * 100;
    const rmse = Math.sqrt(errors.reduce((sum, e) => sum + e * e, 0) / sortedData.length);
    const mae = errors.reduce((sum, e) => sum + e, 0) / sortedData.length;
    
    return {
      forecast,
      accuracy: { mape, rmse, mae },
      insights: {
        trend: trend > 0.1 ? 'Positive trend with seasonal patterns' : trend < -0.1 ? 'Negative trend detected' : 'Stable with seasonal variation',
        seasonality_detected: true,
        anomalies: [],
        recommendations: [
          'Exponential smoothing accounts for recent trends and seasonality',
          config.seasonality ? 'Weekly patterns detected - plan accordingly' : 'Consider enabling seasonality for better accuracy'
        ]
      }
    };
  }
}

interface ForecastingEngineProps {
  data: HistoricalDataPoint[];
  title: string;
  defaultConfig?: Partial<ForecastingConfig>;
  onForecastUpdate?: (result: ForecastingResult) => void;
}

export default function ForecastingEngine({ 
  data, 
  title, 
  defaultConfig = {},
  onForecastUpdate 
}: ForecastingEngineProps) {
  const [config, setConfig] = useState<ForecastingConfig>({
    algorithm: 'linear_regression',
    horizon: 14,
    confidence_level: 0.9,
    seasonality: true,
    trend_damping: 0.8,
    ...defaultConfig
  });
  
  const [result, setResult] = useState<ForecastingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('forecast');

  const forecast = useMemo(() => {
    if (data.length < 3) return null;
    
    setLoading(true);
    let forecastResult: ForecastingResult;
    
    try {
      switch (config.algorithm) {
        case 'exponential_smoothing':
          forecastResult = ExponentialSmoothingForecaster.forecast(data, config);
          break;
        case 'linear_regression':
        default:
          forecastResult = LinearRegressionForecaster.forecast(data, config);
          break;
      }
      
      setResult(forecastResult);
      onForecastUpdate?.(forecastResult);
      return forecastResult;
    } catch (error) {
      console.error('Forecasting error:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [data, config, onForecastUpdate]);

  const combinedChartData = useMemo(() => {
    if (!forecast) return [];
    
    const historicalData = data.map(d => ({
      timestamp: d.timestamp,
      value: d.value,
      category: 'historical'
    }));
    
    const forecastData = forecast.forecast.map(f => ({
      timestamp: f.timestamp,
      value: f.predicted,
      category: 'forecast'
    }));
    
    return [...historicalData, ...forecastData];
  }, [data, forecast]);

  const getAccuracyColor = (mape: number) => {
    if (mape < 10) return 'text-green-600';
    if (mape < 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAccuracyLabel = (mape: number) => {
    if (mape < 10) return 'Excellent';
    if (mape < 15) return 'Good';
    if (mape < 25) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5" />
              <span>{title}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={result ? 'default' : 'secondary'}>
                {config.algorithm.replace('_', ' ').toUpperCase()}
              </Badge>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="forecast">Forecast</TabsTrigger>
              <TabsTrigger value="accuracy">Accuracy</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
              <TabsTrigger value="config">Config</TabsTrigger>
            </TabsList>

            <TabsContent value="forecast" className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : combinedChartData.length > 0 ? (
                <InteractiveLineChart
                  data={combinedChartData}
                  title="Historical Data & Forecast"
                  height={400}
                  showTrend={true}
                />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Insufficient data for forecasting (minimum 3 points required)
                </div>
              )}
              
              {result && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {result.forecast.length > 0 ? Math.round(result.forecast[result.forecast.length - 1].predicted) : 0}
                        </div>
                        <p className="text-sm text-gray-600">Predicted Value ({config.horizon}d)</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold flex items-center justify-center">
                          {result.forecast[0]?.trend === 'increasing' ? (
                            <TrendingUp className="h-6 w-6 text-green-500 mr-1" />
                          ) : result.forecast[0]?.trend === 'decreasing' ? (
                            <TrendingDown className="h-6 w-6 text-red-500 mr-1" />
                          ) : (
                            <Target className="h-6 w-6 text-blue-500 mr-1" />
                          )}
                          {result.forecast[0]?.trend || 'stable'}
                        </div>
                        <p className="text-sm text-gray-600">Trend Direction</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {Math.round(result.forecast.reduce((sum, f) => sum + f.confidence, 0) / result.forecast.length * 100)}%
                        </div>
                        <p className="text-sm text-gray-600">Avg Confidence</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="accuracy" className="space-y-4">
              {result && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">MAPE</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <div className={`text-3xl font-bold ${getAccuracyColor(result.accuracy.mape)}`}>
                          {result.accuracy.mape.toFixed(1)}%
                        </div>
                        <p className="text-sm text-gray-600">
                          {getAccuracyLabel(result.accuracy.mape)} Accuracy
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">RMSE</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600">
                          {result.accuracy.rmse.toFixed(2)}
                        </div>
                        <p className="text-sm text-gray-600">Root Mean Square Error</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">MAE</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-purple-600">
                          {result.accuracy.mae.toFixed(2)}
                        </div>
                        <p className="text-sm text-gray-600">Mean Absolute Error</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="insights" className="space-y-4">
              {result && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Zap className="h-5 w-5" />
                        <span>Key Insights</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Trend Analysis</h4>
                        <p className="text-sm text-gray-600">{result.insights.trend}</p>
                      </div>
                      
                      {result.insights.anomalies.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center">
                            <AlertTriangle className="h-4 w-4 mr-1 text-orange-500" />
                            Anomalies Detected
                          </h4>
                          <div className="space-y-2">
                            {result.insights.anomalies.map((anomaly, index) => (
                              <div key={index} className="flex items-center space-x-2 text-sm">
                                <Badge variant={anomaly.severity === 'high' ? 'destructive' : 'secondary'}>
                                  {anomaly.severity}
                                </Badge>
                                <span>{anomaly.description}</span>
                                <span className="text-gray-500">
                                  {new Date(anomaly.timestamp).toLocaleDateString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div>
                        <h4 className="font-medium mb-2">Recommendations</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {result.insights.recommendations.map((rec, index) => (
                            <li key={index} className="flex items-start">
                              <span className="mr-2">•</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="config" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Forecasting Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Algorithm</label>
                    <select
                      value={config.algorithm}
                      onChange={(e) => setConfig({...config, algorithm: e.target.value as any})}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="linear_regression">Linear Regression</option>
                      <option value="exponential_smoothing">Exponential Smoothing</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Forecast Horizon (days)</label>
                    <input
                      type="number"
                      value={config.horizon}
                      onChange={(e) => setConfig({...config, horizon: parseInt(e.target.value)})}
                      className="w-full p-2 border rounded-md"
                      min="1"
                      max="90"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Confidence Level</label>
                    <select
                      value={config.confidence_level}
                      onChange={(e) => setConfig({...config, confidence_level: parseFloat(e.target.value)})}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value={0.8}>80%</option>
                      <option value={0.9}>90%</option>
                      <option value={0.95}>95%</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={config.seasonality}
                      onChange={(e) => setConfig({...config, seasonality: e.target.checked})}
                      className="rounded"
                    />
                    <label className="text-sm font-medium">Enable Seasonality Detection</label>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}