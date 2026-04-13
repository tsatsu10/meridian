import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { addNotificationToStore } from "@/hooks/mutations/task/use-auto-status-update";

// @epic-2.4-risk-detection: Admins and Team Leads need proactive risk management
// @epic-2.3-notifications: Risk alerts should appear in all notifications
// @role-admin: Workspace oversight requires early warning of project risks
// @role-team-lead: Team coordination needs operational risk visibility
// @epic-3.2-analytics: Real-time risk detection and analytics
// @epic-1.2-dependencies: Risk analysis for project coordination
// @persona-david: Team Lead needs proactive risk management
// @persona-jennifer: Executive needs project health insights
// @persona-sarah: PM needs early warning systems

// Utility function to generate unique IDs
const generateUniqueId = (prefix: string = ''): string => {
  return `${prefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

interface RiskAlert {
  id: string;
  type: 'overdue' | 'blocked' | 'resource_conflict' | 'deadline_risk' | 'dependency_chain' | 'quality_risk';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  recommendation: string;
  affectedTasks: string[];
  affectedProjects: string[];
  estimatedImpact: string;
  timeToResolve: string;
  createdAt: string;
  dueDate?: string;
  metrics?: {
    tasksAffected: number;
    daysOverdue?: number;
    blockedDuration?: number;
    riskScore: number;
  };
}

interface RiskAnalysisResult {
  overallRiskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  alerts: RiskAlert[];
  summary: {
    totalRisks: number;
    criticalRisks: number;
    highRisks: number;
    mediumRisks: number;
    lowRisks: number;
  };
  trends: {
    riskTrend: 'improving' | 'stable' | 'worsening';
    newRisks: number;
    resolvedRisks: number;
  };
}

// Mock function to analyze project risks
const analyzeProjectRisks = async (
  tasks: any[],
  projects: any[],
  teamMembers: any[]
): Promise<RiskAnalysisResult> => {
  await new Promise(resolve => setTimeout(resolve, 300));

  const alerts: RiskAlert[] = [];
  const now = new Date();

  // 1. Overdue Task Detection
  const overdueTasks = tasks.filter(task => {
    if (!task.dueDate || task.status === 'done') return false;
    return new Date(task.dueDate) < now;
  });

  if (overdueTasks.length > 0) {
    const daysOverdue = Math.max(...overdueTasks.map(task => {
      const diffTime = now.getTime() - new Date(task.dueDate).getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }));

    alerts.push({
      id: generateUniqueId('overdue'),
      type: 'overdue',
      severity: daysOverdue > 7 ? 'critical' : daysOverdue > 3 ? 'high' : 'medium',
      title: `${overdueTasks.length} Overdue Tasks Detected`,
      description: `${overdueTasks.length} tasks are past their due dates, with the oldest being ${daysOverdue} days overdue.`,
      recommendation: "Immediately reassign resources or adjust project timeline. Review task priorities and consider scope reduction.",
      affectedTasks: overdueTasks.map(t => t.id),
      affectedProjects: [...new Set(overdueTasks.map(t => t.projectId))],
      estimatedImpact: daysOverdue > 7 ? "Project timeline at risk, stakeholder confidence affected" : "Potential delays in dependent tasks",
      timeToResolve: daysOverdue > 7 ? "1-2 weeks" : "2-5 days",
      createdAt: new Date().toISOString(),
      metrics: {
        tasksAffected: overdueTasks.length,
        daysOverdue,
        riskScore: Math.min(100, daysOverdue * 10 + overdueTasks.length * 5),
      },
    });
  }

  // 2. Blocked Dependencies Detection
  const blockedTasks = tasks.filter(task => {
    if (task.status === 'done' || !task.dependencies) return false;
    return task.dependencies.some((depId: string) => {
      const depTask = tasks.find(t => t.id === depId);
      return depTask && depTask.status !== 'done';
    });
  });

  if (blockedTasks.length > 0) {
    alerts.push({
      id: generateUniqueId('blocked'),
      type: 'blocked',
      severity: blockedTasks.length > 5 ? 'high' : 'medium',
      title: `${blockedTasks.length} Tasks Blocked by Dependencies`,
      description: `${blockedTasks.length} tasks cannot proceed due to incomplete dependencies, creating potential bottlenecks.`,
      recommendation: "Review dependency chains and consider parallel execution where possible. Prioritize blocking tasks.",
      affectedTasks: blockedTasks.map(t => t.id),
      affectedProjects: [...new Set(blockedTasks.map(t => t.projectId))],
      estimatedImpact: "Workflow bottlenecks, potential cascade delays",
      timeToResolve: "1-2 weeks",
      createdAt: new Date().toISOString(),
      metrics: {
        tasksAffected: blockedTasks.length,
        blockedDuration: 3, // Mock duration
        riskScore: blockedTasks.length * 15,
      },
    });
  }

  // 3. Resource Conflict Detection
  const tasksByAssignee = tasks.reduce((acc: any, task) => {
    if (task.assigneeId && task.status !== 'done') {
      if (!acc[task.assigneeId]) acc[task.assigneeId] = [];
      acc[task.assigneeId].push(task);
    }
    return acc;
  }, {});

  const overloadedAssignees = Object.entries(tasksByAssignee).filter(
    ([_, tasksArray]: [string, any]) => (tasksArray as any[]).length > 8
  );

  if (overloadedAssignees.length > 0) {
    const totalOverloadedTasks = overloadedAssignees.reduce(
      (sum, [_, tasks]) => sum + (tasks as any[]).length, 0
    );

    alerts.push({
      id: generateUniqueId('resource'),
      type: 'resource_conflict',
      severity: totalOverloadedTasks > 20 ? 'high' : 'medium',
      title: `${overloadedAssignees.length} Team Members Overloaded`,
      description: `${overloadedAssignees.length} team members have more than 8 active tasks, risking burnout and quality issues.`,
      recommendation: "Redistribute workload, consider hiring, or adjust project scope. Schedule one-on-ones with overloaded team members.",
      affectedTasks: overloadedAssignees.flatMap(([_, tasks]) => (tasks as any[]).map(t => t.id)),
      affectedProjects: [...new Set(overloadedAssignees.flatMap(([_, tasks]) => (tasks as any[]).map(t => t.projectId)))],
      estimatedImpact: "Team burnout, quality degradation, potential turnover",
      timeToResolve: "2-4 weeks",
      createdAt: new Date().toISOString(),
      metrics: {
        tasksAffected: totalOverloadedTasks,
        riskScore: totalOverloadedTasks * 5,
      },
    });
  }

  // 4. Project Deadline Risk
  projects.forEach(project => {
    if (!project.deadline) return;
    
    const projectTasks = tasks.filter(t => t.projectId === project.id);
    const completedTasks = projectTasks.filter(t => t.status === 'done');
    const remainingTasks = projectTasks.filter(t => t.status !== 'done');
    
    const daysToDeadline = Math.ceil(
      (new Date(project.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    const completionRate = projectTasks.length > 0 ? completedTasks.length / projectTasks.length : 1;
    const estimatedDaysToComplete = remainingTasks.length * 2; // Rough estimate
    
    if (daysToDeadline > 0 && estimatedDaysToComplete > daysToDeadline) {
      alerts.push({
        id: generateUniqueId('deadline'),
        type: 'deadline_risk',
        severity: daysToDeadline < 7 ? 'critical' : daysToDeadline < 14 ? 'high' : 'medium',
        title: `Project "${project.name}" Deadline Risk`,
        description: `Project may miss deadline in ${daysToDeadline} days. ${remainingTasks.length} tasks remaining with estimated ${estimatedDaysToComplete} days needed.`,
        recommendation: "Reduce scope, add resources, or negotiate deadline extension. Focus on critical path tasks.",
        affectedTasks: remainingTasks.map(t => t.id),
        affectedProjects: [project.id],
        estimatedImpact: "Project delivery delay, stakeholder impact, potential penalties",
        timeToResolve: "Immediate action required",
        createdAt: new Date().toISOString(),
        dueDate: project.deadline,
        metrics: {
          tasksAffected: remainingTasks.length,
          riskScore: Math.min(100, (estimatedDaysToComplete - daysToDeadline) * 10),
        },
      });
    }
  });

  // Calculate overall risk score
  const totalRiskScore = alerts.reduce((sum, alert) => sum + (alert.metrics?.riskScore || 0), 0);
  const avgRiskScore = alerts.length > 0 ? totalRiskScore / alerts.length : 0;

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (avgRiskScore > 70 || alerts.some(a => a.severity === 'critical')) riskLevel = 'critical';
  else if (avgRiskScore > 50 || alerts.some(a => a.severity === 'high')) riskLevel = 'high';
  else if (avgRiskScore > 25 || alerts.some(a => a.severity === 'medium')) riskLevel = 'medium';

  // Generate summary
  const summary = {
    totalRisks: alerts.length,
    criticalRisks: alerts.filter(a => a.severity === 'critical').length,
    highRisks: alerts.filter(a => a.severity === 'high').length,
    mediumRisks: alerts.filter(a => a.severity === 'medium').length,
    lowRisks: alerts.filter(a => a.severity === 'low').length,
  };

  return {
    overallRiskScore: Math.round(avgRiskScore),
    riskLevel,
    alerts,
    summary,
    trends: {
      riskTrend: 'stable', // Mock trend
      newRisks: alerts.length,
      resolvedRisks: 0,
    },
  };
};

type RiskDetectionOptions = {
  /** When set, overrides default `tasks.length > 0` gating (caller may combine with idle deferral). */
  enabled?: boolean;
};

/**
 * After first paint, schedule readiness on `requestIdleCallback` (fallback: `setTimeout(0)`)
 * so heavy risk analysis does not compete with dashboard shell work.
 */
function useIdleReady(deferUntilIdle: boolean | undefined): boolean {
  const shouldDefer = deferUntilIdle === true;
  const [ready, setReady] = useState(() => !shouldDefer);

  useEffect(() => {
    if (!shouldDefer) {
      setReady(true);
      return;
    }
    setReady(false);
    let cancelled = false;
    const run = () => {
      if (!cancelled) setReady(true);
    };
    const handle =
      typeof requestIdleCallback !== "undefined"
        ? requestIdleCallback(run, { timeout: 2500 })
        : window.setTimeout(run, 0);
    return () => {
      cancelled = true;
      if (typeof cancelIdleCallback !== "undefined" && typeof handle === "number") {
        cancelIdleCallback(handle);
      } else {
        clearTimeout(handle as ReturnType<typeof setTimeout>);
      }
    };
  }, [shouldDefer]);

  return ready;
}

export default function useRiskDetection(
  tasks: any[] = [],
  projects: any[] = [],
  teamMembers: any[] = [],
  options?: RiskDetectionOptions
) {
  const queryEnabled =
    options?.enabled !== undefined ? options.enabled : tasks.length > 0;

  return useQuery({
    queryKey: ["risk-analysis", tasks.length, projects.length],
    queryFn: () => analyzeProjectRisks(tasks, projects, teamMembers),
    enabled: queryEnabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: queryEnabled ? 10 * 60 * 1000 : false,
    select: (data) => {
      // Add high/critical alerts to notification store
      data.alerts
        .filter(alert => alert.severity === 'high' || alert.severity === 'critical')
        .forEach(alert => {
          addNotificationToStore({
            id: generateUniqueId('risk-'),
            type: 'auto-status-update', // Reuse existing type for now
            title: `🚨 ${alert.title}`,
            message: alert.description,
            data: {
              taskId: alert.affectedTasks[0] || '',
              newStatus: 'risk-detected',
              reason: alert.title,
              triggeredBy: 'risk-analysis',
            },
            timestamp: alert.createdAt,
            isRead: false,
            priority: alert.severity === 'critical' ? 'high' : 'medium',
          });
        });

      return data;
    },
  });
}

export type UseRiskMonitorOptions = {
  /**
   * When true (e.g. `/dashboard` overview), defers enabling the risk query until the browser is idle.
   * Project pages should omit this so risk loads immediately.
   */
  deferUntilIdle?: boolean;
};

// Hook for real-time risk monitoring
export const useRiskMonitor = (
  tasks: any[],
  projects: any[],
  options?: UseRiskMonitorOptions
) => {
  const idleReady = useIdleReady(options?.deferUntilIdle);
  const enabled = (options?.deferUntilIdle ? idleReady : true) && tasks.length > 0;
  const riskData = useRiskDetection(tasks, projects, [], { enabled });

  const criticalRisks = useMemo(() => {
    return riskData.data?.alerts.filter(alert => alert.severity === 'critical') || [];
  }, [riskData.data]);

  const highPriorityRisks = useMemo(() => {
    return riskData.data?.alerts.filter(alert => 
      alert.severity === 'high' || alert.severity === 'critical'
    ) || [];
  }, [riskData.data]);

  return {
    ...riskData,
    criticalRisks,
    highPriorityRisks,
    hasHighRisk: highPriorityRisks.length > 0,
    hasCriticalRisk: criticalRisks.length > 0,
  };
}; 