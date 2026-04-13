import { getRiskAnalysis } from "./get-risk-analysis";
import { getDatabase } from "../../database/connection";
import { riskAlerts } from "../../database/schema-features";
import { eq, and, gte, lte, desc, sql, count } from "drizzle-orm";

// @epic-2.4-risk-detection: Risk trends analysis for strategic planning
// @persona-jennifer: Executive needs project health insights
// @epic-3.2-analytics: Real-time risk detection and analytics

interface GetRiskTrendsParams {
  workspaceId: string;
  timeRange?: "7d" | "30d" | "90d" | "1y" | "all";
  granularity?: "daily" | "weekly" | "monthly";
}

interface RiskTrendPoint {
  date: string;
  riskScore: number;
  totalAlerts: number;
  criticalAlerts: number;
  highAlerts: number;
  mediumAlerts: number;
  lowAlerts: number;
}

export async function getRiskTrends(params: GetRiskTrendsParams) {
  const { workspaceId, timeRange = "30d", granularity = "daily" } = params;
  const db = getDatabase();
  
  // Calculate date range
  const now = new Date();
  let startDate = new Date();
  
  switch (timeRange) {
    case "7d":
      startDate.setDate(now.getDate() - 7);
      break;
    case "30d":
      startDate.setDate(now.getDate() - 30);
      break;
    case "90d":
      startDate.setDate(now.getDate() - 90);
      break;
    case "1y":
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    case "all":
      startDate = new Date(0); // Beginning of time
      break;
  }
  
  // Fetch all risk alerts in the time range
  const alerts = await db
    .select()
    .from(riskAlerts)
    .where(
      and(
        eq(riskAlerts.workspaceId, workspaceId),
        gte(riskAlerts.createdAt, startDate)
      )
    )
    .orderBy(riskAlerts.createdAt);
  
  // Group alerts by date based on granularity
  const trendsByDate = new Map<string, RiskTrendPoint>();
  
  // Determine granularity interval
  let truncateFormat: string;
  let dataPoints: number;
  let intervalMs: number;
  
  switch (granularity) {
    case "daily":
      truncateFormat = "day";
      dataPoints = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
      intervalMs = 24 * 60 * 60 * 1000;
      break;
    case "weekly":
      truncateFormat = "week";
      dataPoints = timeRange === "7d" ? 1 : timeRange === "30d" ? 4 : 12;
      intervalMs = 7 * 24 * 60 * 60 * 1000;
      break;
    case "monthly":
      truncateFormat = "month";
      dataPoints = timeRange === "7d" ? 1 : timeRange === "30d" ? 1 : 3;
      intervalMs = 30 * 24 * 60 * 60 * 1000;
      break;
    default:
      truncateFormat = "day";
      dataPoints = 30;
      intervalMs = 24 * 60 * 60 * 1000;
  }
  
  // Initialize all time periods with zero counts
  for (let i = dataPoints - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * intervalMs);
    const dateKey = date.toISOString().split('T')[0];
    trendsByDate.set(dateKey, {
      date: dateKey,
      riskScore: 0,
      totalAlerts: 0,
      criticalAlerts: 0,
      highAlerts: 0,
      mediumAlerts: 0,
      lowAlerts: 0,
    });
  }
  
  // Aggregate alerts into time periods
  for (const alert of alerts) {
    const alertDate = new Date(alert.createdAt);
    let dateKey: string;
    
    if (granularity === "weekly") {
      // Get start of week
      const weekStart = new Date(alertDate);
      weekStart.setDate(alertDate.getDate() - alertDate.getDay());
      dateKey = weekStart.toISOString().split('T')[0];
    } else if (granularity === "monthly") {
      // Get start of month
      dateKey = new Date(alertDate.getFullYear(), alertDate.getMonth(), 1).toISOString().split('T')[0];
    } else {
      // Daily
      dateKey = alertDate.toISOString().split('T')[0];
    }
    
    let trend = trendsByDate.get(dateKey);
    if (!trend) {
      // If exact key not found, find the closest period
      const periods = Array.from(trendsByDate.keys()).sort();
      const closestPeriod = periods.find(p => p >= dateKey) || periods[periods.length - 1];
      trend = trendsByDate.get(closestPeriod!);
    }
    
    if (trend) {
      trend.totalAlerts++;
      trend.riskScore += (alert.riskScore || 0);
      
      // Count by severity
      switch (alert.severity) {
        case "critical":
          trend.criticalAlerts++;
          break;
        case "high":
          trend.highAlerts++;
          break;
        case "medium":
          trend.mediumAlerts++;
          break;
        case "low":
          trend.lowAlerts++;
          break;
      }
    }
  }
  
  // Calculate average risk scores for each period
  const trends = Array.from(trendsByDate.values()).map(trend => ({
    ...trend,
    riskScore: trend.totalAlerts > 0 
      ? Math.round(trend.riskScore / trend.totalAlerts) 
      : 0,
  }));
  
  // Calculate trend direction
  if (trends.length >= 7) {
    const recentScores = trends.slice(-7).map(t => t.riskScore);
    const olderScores = trends.slice(0, 7).map(t => t.riskScore);
    
    const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const olderAvg = olderScores.reduce((a, b) => a + b, 0) / olderScores.length;
    
    let trendDirection: 'improving' | 'stable' | 'worsening' = 'stable';
    if (recentAvg > olderAvg + 5) trendDirection = 'worsening';
    else if (recentAvg < olderAvg - 5) trendDirection = 'improving';
    
    return {
      trends,
      granularity,
      timeRange,
      trendDirection,
      summary: {
        currentRiskScore: trends[trends.length - 1]?.riskScore || 0,
        averageRiskScore: trends.reduce((sum, t) => sum + t.riskScore, 0) / trends.length,
        peakRiskScore: Math.max(...trends.map(t => t.riskScore)),
        totalDataPoints: trends.length,
      },
    };
  }
  
  // Not enough data for trend analysis
  return {
    trends,
    granularity,
    timeRange,
    trendDirection: 'stable' as const,
    summary: {
      currentRiskScore: trends[trends.length - 1]?.riskScore || 0,
      averageRiskScore: trends.reduce((sum, t) => sum + t.riskScore, 0) / (trends.length || 1),
      peakRiskScore: Math.max(...trends.map(t => t.riskScore), 0),
      totalDataPoints: trends.length,
    },
  };
} 

