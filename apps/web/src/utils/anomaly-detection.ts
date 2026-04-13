// @epic-3.1-analytics: Anomaly detection for identifying unusual patterns
// @role-workspace-manager: Early warning system for issues
// @persona-jennifer: Proactive issue identification

export interface Anomaly {
  id: string;
  timestamp: Date;
  metric: string;
  value: number;
  expectedValue: number;
  deviation: number; // Percentage
  severity: "low" | "medium" | "high" | "critical";
  type: "spike" | "drop" | "trend-change" | "outlier";
  description: string;
  recommendation?: string;
}

export interface AnomalyDetectionResult {
  anomalies: Anomaly[];
  totalAnomalies: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  overallHealth: "healthy" | "warning" | "critical";
}

/**
 * Calculate statistical properties of a dataset
 */
function calculateStats(data: number[]): {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  median: number;
} {
  const sorted = [...data].sort((a, b) => a - b);
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  const stdDev = Math.sqrt(variance);
  
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  
  return {
    mean,
    stdDev,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median,
  };
}

/**
 * Detect outliers using statistical methods (Z-score and IQR)
 */
function detectOutliers(data: number[], threshold: number = 3): number[] {
  const stats = calculateStats(data);
  const outlierIndices: number[] = [];
  
  data.forEach((value, index) => {
    // Z-score method
    const zScore = Math.abs((value - stats.mean) / (stats.stdDev || 1));
    if (zScore > threshold) {
      outlierIndices.push(index);
    }
  });
  
  return outlierIndices;
}

/**
 * Detect sudden spikes or drops in metrics
 */
function detectSpikesAndDrops(
  data: number[],
  dates: string[],
  metric: string,
  threshold: number = 0.3 // 30% change
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  
  for (let i = 1; i < data.length; i++) {
    const current = data[i];
    const previous = data[i - 1];
    
    if (previous === 0) continue;
    
    const changeRate = (current - previous) / previous;
    
    if (Math.abs(changeRate) > threshold) {
      const isSpike = changeRate > 0;
      const deviation = Math.abs(changeRate) * 100;
      
      // Determine severity based on deviation
      let severity: Anomaly['severity'];
      if (deviation > 100) severity = "critical";
      else if (deviation > 50) severity = "high";
      else if (deviation > 30) severity = "medium";
      else severity = "low";
      
      anomalies.push({
        id: `anomaly-${Date.now()}-${i}`,
        timestamp: new Date(dates[i]),
        metric,
        value: current,
        expectedValue: previous,
        deviation: Math.round(deviation * 100) / 100,
        severity,
        type: isSpike ? "spike" : "drop",
        description: `${isSpike ? "Unexpected spike" : "Sudden drop"} in ${metric}: ${Math.round(deviation)}% ${isSpike ? "increase" : "decrease"} detected`,
        recommendation: isSpike 
          ? "Investigate the cause of increased activity. This may indicate a surge in workload or system changes."
          : "Immediate attention required. A drop in metrics may indicate team issues, blockers, or resource problems.",
      });
    }
  }
  
  return anomalies;
}

/**
 * Detect trend changes (when direction reverses)
 */
function detectTrendChanges(
  data: number[],
  dates: string[],
  metric: string,
  windowSize: number = 5
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  
  if (data.length < windowSize * 2) return anomalies;
  
  for (let i = windowSize; i < data.length - windowSize; i++) {
    const beforeWindow = data.slice(i - windowSize, i);
    const afterWindow = data.slice(i, i + windowSize);
    
    const beforeTrend = beforeWindow[beforeWindow.length - 1] - beforeWindow[0];
    const afterTrend = afterWindow[afterWindow.length - 1] - afterWindow[0];
    
    // Trend reversal detected
    if ((beforeTrend > 0 && afterTrend < 0) || (beforeTrend < 0 && afterTrend > 0)) {
      const trendChangePercent = Math.abs(afterTrend - beforeTrend) / (Math.abs(beforeTrend) || 1) * 100;
      
      let severity: Anomaly['severity'];
      if (trendChangePercent > 80) severity = "high";
      else if (trendChangePercent > 50) severity = "medium";
      else severity = "low";
      
      anomalies.push({
        id: `anomaly-trend-${Date.now()}-${i}`,
        timestamp: new Date(dates[i]),
        metric,
        value: data[i],
        expectedValue: data[i - 1],
        deviation: Math.round(trendChangePercent),
        severity,
        type: "trend-change",
        description: `Trend reversal detected in ${metric}: from ${beforeTrend > 0 ? "increasing" : "decreasing"} to ${afterTrend > 0 ? "increasing" : "decreasing"}`,
        recommendation: "Monitor closely for continued pattern changes. Review recent changes in team structure, workload, or processes.",
      });
    }
  }
  
  return anomalies;
}

/**
 * Detect statistical outliers
 */
function detectStatisticalOutliers(
  data: number[],
  dates: string[],
  metric: string
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const outlierIndices = detectOutliers(data, 2.5); // 2.5 standard deviations
  const stats = calculateStats(data);
  
  outlierIndices.forEach(index => {
    const value = data[index];
    const deviation = Math.abs((value - stats.mean) / stats.mean) * 100;
    
    let severity: Anomaly['severity'];
    if (deviation > 100) severity = "critical";
    else if (deviation > 75) severity = "high";
    else if (deviation > 50) severity = "medium";
    else severity = "low";
    
    anomalies.push({
      id: `anomaly-outlier-${Date.now()}-${index}`,
      timestamp: new Date(dates[index]),
      metric,
      value,
      expectedValue: stats.mean,
      deviation: Math.round(deviation * 100) / 100,
      severity,
      type: "outlier",
      description: `Statistical outlier detected in ${metric}: value ${Math.round(value)} is ${Math.round(deviation)}% different from average`,
      recommendation: "Verify data accuracy and investigate root causes. This value significantly deviates from normal patterns.",
    });
  });
  
  return anomalies;
}

/**
 * Main anomaly detection function
 */
export function detectAnomalies(
  historicalData: any[],
  metricsToAnalyze: string[] = ['productivity', 'tasksCompleted', 'hoursLogged']
): AnomalyDetectionResult {
  if (!historicalData || historicalData.length < 7) {
    return {
      anomalies: [],
      totalAnomalies: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      overallHealth: "healthy",
    };
  }

  const allAnomalies: Anomaly[] = [];
  const dates = historicalData.map(d => d.date);
  
  // Analyze each metric
  metricsToAnalyze.forEach(metric => {
    const values = historicalData.map(d => Number(d[metric]) || 0);
    
    // Run different detection algorithms
    const spikesAndDrops = detectSpikesAndDrops(values, dates, metric, 0.35);
    const trendChanges = detectTrendChanges(values, dates, metric);
    const outliers = detectStatisticalOutliers(values, dates, metric);
    
    allAnomalies.push(...spikesAndDrops, ...trendChanges, ...outliers);
  });
  
  // Sort by severity and timestamp
  allAnomalies.sort((a, b) => {
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
    if (severityDiff !== 0) return severityDiff;
    return b.timestamp.getTime() - a.timestamp.getTime();
  });
  
  // Count by severity
  const criticalCount = allAnomalies.filter(a => a.severity === "critical").length;
  const highCount = allAnomalies.filter(a => a.severity === "high").length;
  const mediumCount = allAnomalies.filter(a => a.severity === "medium").length;
  const lowCount = allAnomalies.filter(a => a.severity === "low").length;
  
  // Determine overall health
  let overallHealth: "healthy" | "warning" | "critical";
  if (criticalCount > 0 || highCount > 2) {
    overallHealth = "critical";
  } else if (highCount > 0 || mediumCount > 3) {
    overallHealth = "warning";
  } else {
    overallHealth = "healthy";
  }
  
  return {
    anomalies: allAnomalies,
    totalAnomalies: allAnomalies.length,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    overallHealth,
  };
}

/**
 * Get recommendations based on detected anomalies
 */
export function getAnomalyRecommendations(result: AnomalyDetectionResult): string[] {
  const recommendations: string[] = [];
  
  if (result.overallHealth === "critical") {
    recommendations.push("⚠️ Critical anomalies detected. Immediate investigation required.");
  }
  
  if (result.criticalCount > 0) {
    recommendations.push(`${result.criticalCount} critical anomaly detected. Review high-priority alerts immediately.`);
  }
  
  const productivityAnomalies = result.anomalies.filter(a => a.metric === "productivity");
  if (productivityAnomalies.length > 2) {
    recommendations.push("Multiple productivity anomalies detected. Consider reviewing team workload and processes.");
  }
  
  const recentAnomalies = result.anomalies.filter(a => {
    const daysSince = (Date.now() - a.timestamp.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince <= 3;
  });
  
  if (recentAnomalies.length > 0) {
    recommendations.push(`${recentAnomalies.length} anomaly detected in the last 3 days. Monitor for ongoing issues.`);
  }
  
  return recommendations;
}

