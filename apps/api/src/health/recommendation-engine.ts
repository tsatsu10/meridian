export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  category: "performance" | "timeline" | "resources" | "quality" | "risk";
  actionItems?: string[];
  estimatedImpact?: number;
}

export interface ProjectHealthMetrics {
  score: number;
  trend: "improving" | "stable" | "declining";
  factors: {
    completionRate: number;
    timelineHealth: number;
    taskHealth: number;
    resourceAllocation: number;
    riskLevel: number;
  };
}

/**
 * Generate smart recommendations based on project health metrics
 */
export function generateRecommendations(
  metrics: ProjectHealthMetrics
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Critical recommendations (score < 40)
  if (metrics.score < 40) {
    recommendations.push({
      id: "critical-health",
      title: "Critical Health Issues Detected",
      description:
        "Project health has fallen below acceptable levels. Immediate action is required to address critical issues.",
      priority: "high",
      category: "risk",
      actionItems: [
        "Schedule emergency team meeting",
        "Review project blockers",
        "Allocate additional resources if needed",
        "Establish daily health checks",
      ],
      estimatedImpact: 30,
    });
  }

  // Completion Rate Issues
  if (metrics.factors.completionRate < 50) {
    recommendations.push({
      id: "low-completion",
      title: "Low Task Completion Rate",
      description:
        `Only ${Math.round(metrics.factors.completionRate)}% of tasks are complete. Consider breaking down large tasks or removing scope.`,
      priority: metrics.factors.completionRate < 25 ? "high" : "medium",
      category: "performance",
      actionItems: [
        "Review task complexity and estimates",
        "Break down incomplete large tasks",
        "Identify and remove blockers",
        "Increase team focus time",
      ],
      estimatedImpact: 15,
    });
  }

  // Timeline Issues
  if (metrics.factors.timelineHealth < 60) {
    recommendations.push({
      id: "timeline-risk",
      title: "Timeline Risk - Deadline at Risk",
      description:
        "Several milestones are approaching or behind schedule. Review timeline and adjust if necessary.",
      priority: metrics.factors.timelineHealth < 40 ? "high" : "medium",
      category: "timeline",
      actionItems: [
        "Reprioritize tasks to critical path items",
        "Identify timeline delays",
        "Communicate status to stakeholders",
        "Adjust deadlines if necessary",
      ],
      estimatedImpact: 20,
    });
  }

  // Task Quality Issues
  if (metrics.factors.taskHealth < 60) {
    recommendations.push({
      id: "task-quality",
      title: "Task Quality Concerns",
      description:
        "Task quality metrics indicate potential issues with deliverables. Consider implementing code review or QA improvements.",
      priority: metrics.factors.taskHealth < 40 ? "high" : "medium",
      category: "quality",
      actionItems: [
        "Implement peer code review process",
        "Increase testing coverage",
        "Document acceptance criteria",
        "Schedule quality improvement sprint",
      ],
      estimatedImpact: 12,
    });
  }

  // Resource Issues
  if (metrics.factors.resourceAllocation < 60) {
    recommendations.push({
      id: "resource-allocation",
      title: "Resource Allocation Imbalance",
      description:
        "Team resources may not be optimally allocated. Review workload distribution and capacity.",
      priority: metrics.factors.resourceAllocation < 40 ? "high" : "medium",
      category: "resources",
      actionItems: [
        "Review team member workload",
        "Redistribute tasks for balance",
        "Consider hiring or outsourcing",
        "Improve task prioritization",
      ],
      estimatedImpact: 18,
    });
  }

  // Risk Level Issues
  if (metrics.factors.riskLevel > 60) {
    recommendations.push({
      id: "high-risk",
      title: "High Risk Level - Action Required",
      description:
        `Risk level is elevated at ${Math.round(100 - metrics.factors.riskLevel)}%. Proactive risk management is critical.`,
      priority: "high",
      category: "risk",
      actionItems: [
        "Conduct risk assessment meeting",
        "Create risk mitigation plan",
        "Assign risk owners",
        "Monitor risks daily",
      ],
      estimatedImpact: 25,
    });
  }

  // Improvement Opportunities
  if (metrics.score >= 70 && metrics.score < 80) {
    recommendations.push({
      id: "optimization-opportunity",
      title: "Optimization Opportunities",
      description:
        "Project is performing well. Consider optimizations to push into excellent territory.",
      priority: "low",
      category: "performance",
      actionItems: [
        "Analyze what's working well",
        "Identify efficiency gains",
        "Mentor team on best practices",
        "Document lessons learned",
      ],
      estimatedImpact: 8,
    });
  }

  // Declining Trend
  if (metrics.trend === "declining") {
    recommendations.push({
      id: "declining-trend",
      title: "Declining Health Trend",
      description:
        "Project health is declining. Investigate root causes and implement corrective actions.",
      priority: "high",
      category: "risk",
      actionItems: [
        "Analyze recent changes",
        "Identify new blockers",
        "Review team dynamics",
        "Adjust project strategy if needed",
      ],
      estimatedImpact: 16,
    });
  }

  // Stable/Improving Trends - Positive message
  if (
    metrics.trend === "improving" &&
    metrics.score > 60
  ) {
    recommendations.push({
      id: "positive-momentum",
      title: "Positive Momentum Maintained",
      description:
        "Great job! Project health is improving. Continue current strategies and maintain team morale.",
      priority: "low",
      category: "performance",
      actionItems: [
        "Share progress with team",
        "Celebrate milestones",
        "Document successful practices",
        "Plan next phase",
      ],
      estimatedImpact: 5,
    });
  }

  // Sort recommendations by priority and impact
  recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const priorityDiff =
      priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return (b.estimatedImpact || 0) - (a.estimatedImpact || 0);
  });

  return recommendations;
}

/**
 * Get recommendation for specific factor
 */
export function getFactorRecommendation(
  factor: string,
  score: number
): string {
  const recommendations: { [key: string]: { [key: string]: string } } = {
    completionRate: {
      critical: "Accelerate task completion - current rate will miss deadline",
      warning: "Monitor completion rate closely",
      improving: "Maintain current velocity",
      excellent: "Maintain excellent completion pace",
    },
    timelineHealth: {
      critical: "Review and adjust timeline - critical path at risk",
      warning: "Some tasks are falling behind schedule",
      improving: "Timeline tracking improving",
      excellent: "Project is ahead of schedule",
    },
    taskHealth: {
      critical: "Quality issues detected - implement immediate review process",
      warning: "Task quality metrics showing decline",
      improving: "Task quality is improving",
      excellent: "High-quality deliverables maintained",
    },
    resourceAllocation: {
      critical:
        "Urgent: Critical resource shortage or misallocation detected",
      warning: "Resource constraints detected",
      improving: "Resource allocation improving",
      excellent: "Optimal resource utilization",
    },
    riskLevel: {
      critical: "Significant risks identified - immediate mitigation needed",
      warning: "Notable risks present - monitor closely",
      improving: "Risk situation stabilizing",
      excellent: "Minimal risks present",
    },
  };

  const level =
    score < 40 ? "critical" : score < 60 ? "warning" : score < 80 ? "improving" : "excellent";

  return recommendations[factor]?.[level] || "Monitor this factor";
}

