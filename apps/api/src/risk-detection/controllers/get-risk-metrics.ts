import { getRiskAnalysis } from "./get-risk-analysis";

// @epic-2.4-risk-detection: Risk metrics and KPIs for executive dashboards
// @persona-jennifer: Executive needs project health insights
// @epic-3.2-analytics: Real-time risk detection and analytics

interface GetRiskMetricsParams {
  workspaceId: string;
  timeRange?: "7d" | "30d" | "90d" | "1y" | "all";
}

export async function getRiskMetrics(params: GetRiskMetricsParams) {
  const { workspaceId, timeRange = "30d" } = params;
  
  // Get risk analysis for the specified time range
  const analysis = await getRiskAnalysis({
    workspaceId,
    timeRange,
  });
  
  // Calculate additional metrics
  const criticalAlerts = analysis.alerts.filter(a => a.severity === 'critical');
  const highAlerts = analysis.alerts.filter(a => a.severity === 'high');
  const mediumAlerts = analysis.alerts.filter(a => a.severity === 'medium');
  const lowAlerts = analysis.alerts.filter(a => a.severity === 'low');
  
  // Calculate risk distribution by type
  const riskByType = analysis.alerts.reduce((acc, alert) => {
    acc[alert.type] = (acc[alert.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Calculate average risk score by severity
  const avgRiskScoreBySeverity = {
    critical: criticalAlerts.length > 0 ? criticalAlerts.reduce((sum, a) => sum + (a.metrics?.riskScore || 0), 0) / criticalAlerts.length : 0,
    high: highAlerts.length > 0 ? highAlerts.reduce((sum, a) => sum + (a.metrics?.riskScore || 0), 0) / highAlerts.length : 0,
    medium: mediumAlerts.length > 0 ? mediumAlerts.reduce((sum, a) => sum + (a.metrics?.riskScore || 0), 0) / mediumAlerts.length : 0,
    low: lowAlerts.length > 0 ? lowAlerts.reduce((sum, a) => sum + (a.metrics?.riskScore || 0), 0) / lowAlerts.length : 0,
  };
  
  // Calculate risk velocity (new risks per day)
  const now = new Date();
  const recentAlerts = analysis.alerts.filter(alert => {
    const alertDate = new Date(alert.createdAt);
    const daysDiff = (now.getTime() - alertDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7; // Last 7 days
  });
  
  const riskVelocity = recentAlerts.length / 7; // Average per day
  
  return {
    overallRiskScore: analysis.overallRiskScore,
    riskLevel: analysis.riskLevel,
    summary: analysis.summary,
    riskByType,
    avgRiskScoreBySeverity,
    riskVelocity,
    timeRange,
    lastUpdated: new Date().toISOString(),
    metrics: {
      totalAlerts: analysis.alerts.length,
      criticalAlerts: criticalAlerts.length,
      highAlerts: highAlerts.length,
      mediumAlerts: mediumAlerts.length,
      lowAlerts: lowAlerts.length,
      recentAlerts: recentAlerts.length,
      riskTrend: analysis.trends.riskTrend,
    },
  };
} 

