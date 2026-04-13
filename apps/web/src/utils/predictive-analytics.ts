// @epic-3.1-analytics: Predictive analytics engine for forecasting trends
// @role-workspace-manager: Executive-level forecasting and planning
// @persona-jennifer: Strategic decision-making with predictions

export interface TimeSeriesDataPoint {
  date: string;
  productivity: number;
  tasksCompleted: number;
  hoursLogged: number;
  activeMembers?: number;
  activeUsers?: number;
  timestamp?: number;
  tasksCreated?: number;
  burnRate?: number;
  velocity?: number;
  qualityMetrics?: {
    defects: number;
    rework: number;
    customerFeedback: number;
  };
}

export interface Prediction {
  date: string;
  value: number;
  confidence: number; // 0-100
  trend: "up" | "down" | "stable";
}

export interface PredictionResult {
  metric: string;
  predictions: Prediction[];
  accuracy: number; // 0-100
  trend: "increasing" | "decreasing" | "stable";
  changeRate: number; // Percentage change per period
}

/**
 * Calculate simple moving average for smoothing
 */
function calculateMovingAverage(data: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < window - 1) {
      result.push(data[i]);
    } else {
      const sum = data.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / window);
    }
  }
  return result;
}

/**
 * Calculate linear regression for trend prediction
 */
function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  const x = Array.from({ length: n }, (_, i) => i);
  
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  return { slope, intercept };
}

/**
 * Calculate exponential smoothing for better predictions
 */
function exponentialSmoothing(data: number[], alpha: number = 0.3): number[] {
  const result: number[] = [data[0]];
  for (let i = 1; i < data.length; i++) {
    result.push(alpha * data[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

/**
 * Predict future values using multiple methods and ensemble approach
 */
export function predictFutureTrends(
  historicalData: any[], // Accept any type to be flexible
  periodsAhead: number = 7,
  metric: string = 'productivity'
): PredictionResult {
  if (!historicalData || historicalData.length < 3) {
    // Not enough data for meaningful predictions
    return {
      metric,
      predictions: [],
      accuracy: 0,
      trend: "stable",
      changeRate: 0,
    };
  }

  // Extract values for the specified metric
  const values = historicalData.map(d => Number(d[metric]) || 0);
  const dates = historicalData.map(d => d.date);
  
  // Apply smoothing for better predictions
  const smoothedValues = exponentialSmoothing(values);
  
  // Calculate linear regression
  const { slope, intercept } = linearRegression(smoothedValues);
  
  // Generate predictions
  const predictions: Prediction[] = [];
  const startIndex = values.length;
  const lastValue = smoothedValues[smoothedValues.length - 1];
  
  for (let i = 0; i < periodsAhead; i++) {
    const futureIndex = startIndex + i;
    const predictedValue = slope * futureIndex + intercept;
    
    // Calculate confidence based on recent trend stability
    const recentVariance = calculateVariance(smoothedValues.slice(-Math.min(7, smoothedValues.length)));
    const confidence = Math.max(30, Math.min(95, 100 - (recentVariance * 10)));
    
    // Determine trend direction
    let trend: "up" | "down" | "stable";
    if (i === 0) {
      const diff = predictedValue - lastValue;
      trend = Math.abs(diff) < 1 ? "stable" : diff > 0 ? "up" : "down";
    } else {
      const diff = predictedValue - (slope * (futureIndex - 1) + intercept);
      trend = Math.abs(diff) < 1 ? "stable" : diff > 0 ? "up" : "down";
    }
    
    // Generate future date
    const lastDate = new Date(dates[dates.length - 1]);
    const futureDate = new Date(lastDate);
    futureDate.setDate(futureDate.getDate() + (i + 1));
    
    predictions.push({
      date: futureDate.toISOString().split('T')[0],
      value: Math.max(0, Math.round(predictedValue * 100) / 100), // Ensure non-negative
      confidence: Math.round(confidence),
      trend,
    });
  }
  
  // Calculate overall trend
  const avgChangeRate = (slope / (values.reduce((a, b) => a + b, 0) / values.length)) * 100;
  const overallTrend: "increasing" | "decreasing" | "stable" = 
    Math.abs(avgChangeRate) < 2 ? "stable" : avgChangeRate > 0 ? "increasing" : "decreasing";
  
  // Estimate accuracy based on historical fit
  const accuracy = calculateAccuracy(values, smoothedValues);
  
  return {
    metric,
    predictions,
    accuracy: Math.round(accuracy),
    trend: overallTrend,
    changeRate: Math.round(avgChangeRate * 100) / 100,
  };
}

/**
 * Calculate variance for confidence intervals
 */
function calculateVariance(data: number[]): number {
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const squaredDiffs = data.map(value => Math.pow(value - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / data.length;
}

/**
 * Calculate prediction accuracy by comparing smoothed vs actual
 */
function calculateAccuracy(actual: number[], predicted: number[]): number {
  if (actual.length !== predicted.length || actual.length === 0) return 0;
  
  const errors = actual.map((val, i) => Math.abs(val - predicted[i]) / (val || 1));
  const meanError = errors.reduce((a, b) => a + b, 0) / errors.length;
  
  return Math.max(0, Math.min(100, (1 - meanError) * 100));
}

/**
 * Predict resource capacity needs
 */
export function predictResourceNeeds(
  historicalData: any[], // Accept any type to be flexible
  targetProductivity: number = 80
): {
  currentCapacity: number;
  projectedCapacity: number;
  recommendedIncrease: number;
  timeline: string;
} {
  if (!historicalData || historicalData.length < 3) {
    return {
      currentCapacity: 0,
      projectedCapacity: 0,
      recommendedIncrease: 0,
      timeline: "Insufficient data",
    };
  }

  const recentData = historicalData.slice(-7); // Last 7 periods
  const avgProductivity = recentData.reduce((sum, d) => sum + d.productivity, 0) / recentData.length;
  const avgActiveMembers = recentData.reduce((sum, d) => sum + ((d.activeMembers || d.activeUsers) || 0), 0) / recentData.length;
  
  const currentCapacity = avgActiveMembers;
  const productivityGap = targetProductivity - avgProductivity;
  
  let projectedCapacity = currentCapacity;
  let recommendedIncrease = 0;
  
  if (productivityGap > 5) {
    // Need more resources
    recommendedIncrease = Math.ceil((productivityGap / 100) * currentCapacity);
    projectedCapacity = currentCapacity + recommendedIncrease;
  } else if (productivityGap < -10) {
    // Potentially over-resourced
    recommendedIncrease = Math.floor((productivityGap / 100) * currentCapacity);
    projectedCapacity = currentCapacity + recommendedIncrease;
  }
  
  const timeline = Math.abs(recommendedIncrease) > 0 
    ? `Within ${Math.ceil(Math.abs(recommendedIncrease) / 2)} weeks`
    : "No immediate action needed";
  
  return {
    currentCapacity: Math.round(currentCapacity),
    projectedCapacity: Math.round(projectedCapacity),
    recommendedIncrease: Math.round(recommendedIncrease),
    timeline,
  };
}

/**
 * Identify seasonal patterns in the data
 */
export function detectSeasonalPatterns(
  historicalData: any[], // Accept any type to be flexible
  metric: string = 'productivity'
): {
  hasPattern: boolean;
  patternType: "weekly" | "monthly" | "none";
  peakDays: string[];
  lowDays: string[];
} {
  if (!historicalData || historicalData.length < 14) {
    return {
      hasPattern: false,
      patternType: "none",
      peakDays: [],
      lowDays: [],
    };
  }

  const values = historicalData.map(d => Number(d[metric]) || 0);
  const dates = historicalData.map(d => new Date(d.date));
  
  // Check for weekly patterns (day of week)
  const dayOfWeekData: { [key: number]: number[] } = {};
  dates.forEach((date, i) => {
    const dayOfWeek = date.getDay();
    if (!dayOfWeekData[dayOfWeek]) dayOfWeekData[dayOfWeek] = [];
    dayOfWeekData[dayOfWeek].push(values[i]);
  });
  
  const dayOfWeekAvgs: { [key: number]: number } = {};
  Object.keys(dayOfWeekData).forEach(day => {
    const dayNum = parseInt(day);
    dayOfWeekAvgs[dayNum] = dayOfWeekData[dayNum].reduce((a, b) => a + b, 0) / dayOfWeekData[dayNum].length;
  });
  
  const avgValues = Object.values(dayOfWeekAvgs);
  const overallAvg = avgValues.reduce((a, b) => a + b, 0) / avgValues.length;
  const variance = calculateVariance(avgValues);
  
  // If variance is significant, we have a pattern
  const hasPattern = variance > (overallAvg * 0.1);
  
  if (!hasPattern) {
    return {
      hasPattern: false,
      patternType: "none",
      peakDays: [],
      lowDays: [],
    };
  }
  
  // Identify peak and low days
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const peakDays: string[] = [];
  const lowDays: string[] = [];
  
  Object.entries(dayOfWeekAvgs).forEach(([day, avg]) => {
    if (avg > overallAvg * 1.1) {
      peakDays.push(dayNames[parseInt(day)]);
    } else if (avg < overallAvg * 0.9) {
      lowDays.push(dayNames[parseInt(day)]);
    }
  });
  
  return {
    hasPattern: true,
    patternType: "weekly",
    peakDays,
    lowDays,
  };
}

