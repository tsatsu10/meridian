/**
 * Health Factor Calculators
 * Individual calculators for each health factor component
 */

import { HealthFactor, ProjectHealthInput } from '@/types/health';
import {
  COMPLETION_FACTOR_PARAMS,
  TIMELINE_FACTOR_PARAMS,
  TASK_HEALTH_FACTOR_PARAMS,
  RESOURCE_HEALTH_FACTOR_PARAMS,
  RISK_FACTOR_PARAMS,
} from '../health-constants';

/**
 * Calculate completion factor (30% weight)
 * Based on task completion percentage and velocity
 */
export function calculateCompletionFactor(input: ProjectHealthInput): HealthFactor {
  const { totalTasks, completedTasks, recentlyCompletedTasks, timeWindow } = input;

  // Completion percentage (0-100)
  const completionPercentage = totalTasks === 0 ? 100 : (completedTasks / totalTasks) * 100;

  // Velocity calculation: tasks completed per day
  const velocity =
    timeWindow > 0 ? (recentlyCompletedTasks / timeWindow) * 100 : 0;

  // Combine completion and velocity
  const score =
    completionPercentage * COMPLETION_FACTOR_PARAMS.completionWeight +
    Math.min(velocity, 100) * COMPLETION_FACTOR_PARAMS.velocityWeight;

  // Determine trend
  const trend =
    velocity > completionPercentage / 10
      ? 'improving'
      : velocity < completionPercentage / 20
        ? 'declining'
        : 'stable';

  // Generate recommendation
  let recommendation = '';
  if (score < 50) {
    recommendation =
      'Project completion is falling behind. Increase team capacity or remove lower-priority tasks.';
  } else if (score > 90) {
    recommendation =
      'Excellent progress! Maintain current momentum and monitor for any emerging risks.';
  }

  return {
    name: 'Completion',
    score: Math.min(score, 100),
    weight: 0.3,
    trend,
    recommendation,
    lastUpdated: new Date(),
  };
}

/**
 * Calculate timeline factor (25% weight)
 * Based on deadline proximity and progress vs time
 */
export function calculateTimelineFactor(input: ProjectHealthInput): HealthFactor {
  const { daysRemaining, totalDays, completedTasks, totalTasks } = input;

  if (!daysRemaining || !totalDays) {
    return {
      name: 'Timeline',
      score: 75,
      weight: 0.25,
      trend: 'stable',
      recommendation: 'No deadline set',
      lastUpdated: new Date(),
    };
  }

  // Time utilization: time used / time available
  const timeUtilization = (totalDays - daysRemaining) / totalDays;

  // Progress rate: tasks completed / tasks total
  const progressRate = totalTasks === 0 ? 0 : completedTasks / totalTasks;

  // Expected progress at this point
  const expectedProgress = timeUtilization;

  // Calculate score based on progress vs time
  let score = 100;

  if (daysRemaining <= TIMELINE_FACTOR_PARAMS.criticalThresholdDays) {
    // Critical: Less than 7 days remaining
    score -= 30;
  } else if (daysRemaining <= TIMELINE_FACTOR_PARAMS.warnThresholdDays) {
    // Warning: Less than 14 days remaining
    score -= 15;
  }

  // Adjust based on progress vs time relationship
  if (progressRate < expectedProgress * 0.8) {
    // Behind schedule
    score -= (expectedProgress - progressRate) * 50;
  } else if (progressRate > expectedProgress * 1.2) {
    // Ahead of schedule
    score += Math.min((progressRate - expectedProgress) * 25, 20);
  }

  // Ensure score is within bounds
  score = Math.max(0, Math.min(score, 100));

  // Determine trend
  const trend = daysRemaining < totalDays * 0.2 ? 'declining' : 'stable';

  // Generate recommendation
  let recommendation = '';
  if (score < 50) {
    recommendation = `Only ${daysRemaining} days remaining and project is behind schedule. Escalate immediately.`;
  } else if (score < 75) {
    recommendation = `Timeline is at risk with ${daysRemaining} days remaining. Increase pace or extend deadline.`;
  }

  return {
    name: 'Timeline',
    score,
    weight: 0.25,
    trend,
    recommendation,
    lastUpdated: new Date(),
  };
}

/**
 * Calculate task health factor (20% weight)
 * Based on overdue and blocked tasks
 */
export function calculateTaskHealthFactor(input: ProjectHealthInput): HealthFactor {
  const { overdueTasks, blockedTasks, totalTasks, tasksWithMissedWarnings } = input;

  if (totalTasks === 0) {
    return {
      name: 'Task Health',
      score: 100,
      weight: 0.2,
      trend: 'stable',
      recommendation: 'No tasks to monitor',
      lastUpdated: new Date(),
    };
  }

  // Start with full score
  let score = 100;

  // Apply penalties for overdue tasks
  const overduePercentage = (overdueTasks / totalTasks) * 100;
  score -= overduePercentage * TASK_HEALTH_FACTOR_PARAMS.overduePenalty;

  // Apply penalties for blocked tasks
  const blockedPercentage = (blockedTasks / totalTasks) * 100;
  score -= blockedPercentage * TASK_HEALTH_FACTOR_PARAMS.blockedPenalty;

  // Apply penalties for tasks with missed warnings
  const missedWarnings = tasksWithMissedWarnings || 0;
  const missedPercentage = (missedWarnings / totalTasks) * 100;
  score -= missedPercentage * 10;

  // Ensure score is within bounds
  score = Math.max(
    TASK_HEALTH_FACTOR_PARAMS.taskHealthMin,
    Math.min(score, TASK_HEALTH_FACTOR_PARAMS.taskHealthMax)
  );

  // Determine trend
  const trend =
    overdueTasks > 0 || blockedTasks > 0 ? 'declining' : 'improving';

  // Generate recommendation
  let recommendation = '';
  if (overdueTasks > 0) {
    recommendation = `${overdueTasks} overdue task${overdueTasks > 1 ? 's' : ''}. Prioritize completion immediately.`;
  } else if (blockedTasks > 0) {
    recommendation = `${blockedTasks} blocked task${blockedTasks > 1 ? 's' : ''}. Remove blockers to resume progress.`;
  } else {
    recommendation = 'All tasks on track!';
  }

  return {
    name: 'Task Health',
    score,
    weight: 0.2,
    trend,
    recommendation,
    lastUpdated: new Date(),
  };
}

/**
 * Calculate resource health factor (15% weight)
 * Based on team allocation and capacity
 */
export function calculateResourceHealthFactor(input: ProjectHealthInput): HealthFactor {
  const { teamMembers = [], allocatedHours = 0, requiredHours = 0 } = input;

  if (teamMembers.length === 0) {
    return {
      name: 'Resources',
      score: 50,
      weight: 0.15,
      trend: 'stable',
      recommendation: 'No team members assigned',
      lastUpdated: new Date(),
    };
  }

  // Calculate team capacity
  const totalCapacity =
    teamMembers.length *
    RESOURCE_HEALTH_FACTOR_PARAMS.hoursPerMemberDay *
    30; // Monthly capacity

  // Utilization rate
  const utilizationRate = requiredHours / totalCapacity;

  // Determine score based on utilization
  let score = 100;
  const { optimalUtilizationMin, optimalUtilizationMax } =
    RESOURCE_HEALTH_FACTOR_PARAMS;

  if (utilizationRate < optimalUtilizationMin) {
    // Underutilized
    const underUtil = optimalUtilizationMin - utilizationRate;
    score -= underUtil * RESOURCE_HEALTH_FACTOR_PARAMS.underutilizedPenalty;
  } else if (utilizationRate > optimalUtilizationMax) {
    // Overutilized
    const overUtil = utilizationRate - optimalUtilizationMax;
    score -= overUtil * RESOURCE_HEALTH_FACTOR_PARAMS.overutilizedPenalty;
  }

  // Ensure score is within bounds
  score = Math.max(0, Math.min(score, 100));

  // Determine trend
  const trend = utilizationRate > optimalUtilizationMax ? 'declining' : 'stable';

  // Generate recommendation
  let recommendation = '';
  if (utilizationRate < optimalUtilizationMin) {
    recommendation = `Team is ${Math.round((1 - utilizationRate) * 100)}% underutilized. Consider expanding scope or reducing team size.`;
  } else if (utilizationRate > optimalUtilizationMax) {
    recommendation = `Team is ${Math.round((utilizationRate - 1) * 100)}% overutilized. Add team members or extend timeline.`;
  } else {
    recommendation = 'Team utilization is optimal!';
  }

  return {
    name: 'Resources',
    score,
    weight: 0.15,
    trend,
    recommendation,
    lastUpdated: new Date(),
  };
}

/**
 * Calculate risk factor (10% weight)
 * Based on blockers, dependencies, and critical path
 */
export function calculateRiskFactor(input: ProjectHealthInput): HealthFactor {
  const {
    blockers = [],
    unmetDependencies = 0,
    criticalPathAtRisk = false,
  } = input;

  // Start with full score
  let score = RISK_FACTOR_PARAMS.maxRiskScore;

  // Apply penalty for each blocker
  score -= blockers.length * RISK_FACTOR_PARAMS.blockerPenalty;

  // Apply penalty for unmet dependencies
  score -= unmetDependencies * RISK_FACTOR_PARAMS.dependencyPenalty;

  // Apply critical path penalty
  if (criticalPathAtRisk) {
    score -= RISK_FACTOR_PARAMS.criticalPathPenalty;
  }

  // Ensure score is within bounds
  score = Math.max(
    RISK_FACTOR_PARAMS.minRiskScore,
    Math.min(score, RISK_FACTOR_PARAMS.maxRiskScore)
  );

  // Determine trend and risk level
  const trend =
    blockers.length > 0 || criticalPathAtRisk ? 'declining' : 'stable';
  const riskLevel =
    score < 40 ? 'critical' : score < 60 ? 'high' : score < 80 ? 'medium' : 'low';

  // Generate recommendation
  let recommendation = '';
  if (blockers.length > 0) {
    recommendation = `${blockers.length} blocker${blockers.length > 1 ? 's' : ''} found: ${blockers.slice(0, 2).join(', ')}. Remove immediately.`;
  } else if (criticalPathAtRisk) {
    recommendation =
      'Critical path is at risk. Review task dependencies and timeline.';
  } else if (unmetDependencies > 0) {
    recommendation = `${unmetDependencies} unmet dependencies. Coordinate with dependent teams.`;
  } else {
    recommendation = 'No significant risks identified.';
  }

  return {
    name: 'Risk',
    score,
    weight: 0.1,
    trend,
    recommendation,
    lastUpdated: new Date(),
  };
}

/**
 * Get all factors in order of weight
 */
export function getAllFactors(input: ProjectHealthInput): HealthFactor[] {
  return [
    calculateCompletionFactor(input),
    calculateTimelineFactor(input),
    calculateTaskHealthFactor(input),
    calculateResourceHealthFactor(input),
    calculateRiskFactor(input),
  ].sort((a, b) => b.weight - a.weight);
}

/**
 * Validate health factor scores are within bounds
 */
export function validateFactorScore(score: number): number {
  return Math.max(0, Math.min(score, 100));
}

/**
 * Calculate factor-specific recommendations
 */
export function getFactorRecommendations(factor: HealthFactor): string[] {
  const recommendations: string[] = [];

  if (factor.recommendation) {
    recommendations.push(factor.recommendation);
  }

  // Add trend-based recommendations
  if (factor.trend === 'declining') {
    recommendations.push(
      `${factor.name} factor is declining. Investigate and take corrective action.`
    );
  }

  return recommendations;
}
