import { getRiskAnalysis } from "./get-risk-analysis";

// @epic-2.4-risk-detection: Get active risk alerts for real-time monitoring
// @persona-sarah: PM needs early warning systems
// @persona-david: Team Lead needs proactive risk management

interface GetRiskAlertsParams {
  workspaceId: string;
  severity?: "low" | "medium" | "high" | "critical";
  type?: "overdue" | "blocked" | "resource_conflict" | "deadline_risk" | "dependency_chain" | "quality_risk";
  limit?: number;
}

export async function getRiskAlerts(params: GetRiskAlertsParams) {
  const { workspaceId, severity, type, limit = 50 } = params;
  
  // Get full risk analysis
  const analysis = await getRiskAnalysis({
    workspaceId,
    timeRange: "30d", // Default to 30 days
    severity,
  });
  
  // Filter by type if specified
  let filteredAlerts = analysis.alerts;
  if (type) {
    filteredAlerts = filteredAlerts.filter(alert => alert.type === type);
  }
  
  // Apply limit
  filteredAlerts = filteredAlerts.slice(0, limit);
  
  return {
    alerts: filteredAlerts,
    total: analysis.alerts.length,
    filtered: filteredAlerts.length,
    summary: analysis.summary,
  };
} 

