/**
 * Health Score Aggregation Algorithm
 * Combines individual factors into overall project health score and state
 */

import {
  HealthFactor,
  ProjectHealthMetrics,
  ProjectHealthInput,
  RiskIndicator,
  HealthRecommendation,
} from '@/types/health';
import {
  getAllFactors,
  getFactorRecommendations,
} from './health-factors';
import {
  HEALTH_SCORE_RANGES,
  TREND_PARAMS,
  RISK_LEVEL_THRESHOLDS,
  HEALTH_COLORS,
  HEALTH_ICONS,
} from '../health-constants';

/**
 * Calculate overall health score from weighted factors
 * Formula: sum(factor.score * factor.weight) for all factors
 */
export function calculateAggregateScore(factors: HealthFactor[]): number {
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  const weightedSum = factors.reduce((sum, f) => sum + f.score * f.weight, 0);

  // Normalize if total weight differs from 1.0
  return totalWeight > 0 ? weightedSum / totalWeight : 75;
}

/**
 * Determine health state from score
 */
export function getHealthState(
  score: number
): 'ahead' | 'on-track' | 'at-risk' | 'behind' | 'critical' {
  if (score >= HEALTH_SCORE_RANGES.ahead.min) {
    return 'ahead';
  } else if (score >= HEALTH_SCORE_RANGES.onTrack.min) {
    return 'on-track';
  } else if (score >= HEALTH_SCORE_RANGES.atRisk.min) {
    return 'at-risk';
  } else if (score >= HEALTH_SCORE_RANGES.behind.min) {
    return 'behind';
  } else {
    return 'critical';
  }
}

/**
 * Determine risk level from score
 */
export function getRiskLevel(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
  if (riskScore >= RISK_LEVEL_THRESHOLDS.low) {
    return 'low';
  } else if (riskScore >= RISK_LEVEL_THRESHOLDS.medium) {
    return 'medium';
  } else if (riskScore >= RISK_LEVEL_THRESHOLDS.high) {
    return 'high';
  } else {
    return 'critical';
  }
}

/**
 * Calculate trend from consecutive health scores
 */
export function calculateTrend(
  currentScore: number,
  history: number[] = []
): 'improving' | 'stable' | 'declining' {
  if (history.length === 0) {
    return 'stable';
  }

  // Calculate average of historical scores with decay for older data
  let weightedSum = currentScore * (1 + TREND_PARAMS.decayPerDay);
  let weightSum = 1 + TREND_PARAMS.decayPerDay;

  history.slice(0, TREND_PARAMS.historyLength).forEach((score, index) => {
    const weight = Math.pow(1 - TREND_PARAMS.decayPerDay / 100, index);
    weightedSum += score * weight;
    weightSum += weight;
  });

  const averageScore = weightedSum / weightSum;
  const difference = currentScore - averageScore;

  if (difference > TREND_PARAMS.improvingThreshold) {
    return 'improving';
  } else if (difference < TREND_PARAMS.decliningThreshold) {
    return 'declining';
  } else {
    return 'stable';
  }
}

/**
 * Identify risk indicators
 */
export function identifyRisks(
  factors: HealthFactor[],
  input: ProjectHealthInput
): RiskIndicator[] {
  const risks: RiskIndicator[] = [];

  // Check each factor for risks
  factors.forEach((factor) => {
    if (factor.score < 50) {
      // Critical risk
      risks.push({
        id: `risk-${factor.name.toLowerCase()}`,
        type: 'critical-factor',
        severity: 'critical',
        factor: factor.name,
        description: `${factor.name} score critically low (${Math.round(factor.score)}/100)`,
        identified_at: new Date(),
        impact: `Project ${factor.name.toLowerCase()} is severely compromised`,
      });
    } else if (factor.score < 70) {
      // High risk
      risks.push({
        id: `risk-${factor.name.toLowerCase()}-warning`,
        type: 'factor-warning',
        severity: 'high',
        factor: factor.name,
        description: `${factor.name} score below acceptable level (${Math.round(factor.score)}/100)`,
        identified_at: new Date(),
        impact: `${factor.name} may impact project success`,
      });
    }
  });

  // Check for specific blockers
  if (input.blockers && input.blockers.length > 0) {
    input.blockers.forEach((blocker, index) => {
      risks.push({
        id: `blocker-${index}`,
        type: 'blocker',
        severity: 'high',
        factor: 'Risk',
        description: `Blocker identified: ${blocker}`,
        identified_at: new Date(),
        impact: 'May prevent task completion',
      });
    });
  }

  // Check for overdue tasks
  if (input.overdueTasks && input.overdueTasks > 0) {
    risks.push({
      id: 'overdue-tasks',
      type: 'overdue-tasks',
      severity: 'high',
      factor: 'Task Health',
      description: `${input.overdueTasks} task${input.overdueTasks > 1 ? 's' : ''} overdue`,
      identified_at: new Date(),
      impact: 'Project timeline at risk',
    });
  }

  // Check for critical path risk
  if (input.criticalPathAtRisk) {
    risks.push({
      id: 'critical-path-risk',
      type: 'critical-path',
      severity: 'critical',
      factor: 'Timeline',
      description: 'Critical path is at risk',
      identified_at: new Date(),
      impact: 'Project deadline may be missed',
    });
  }

  // Check for timeline urgency
  if (input.daysRemaining && input.daysRemaining <= 7) {
    risks.push({
      id: 'timeline-urgent',
      type: 'timeline',
      severity: input.daysRemaining <= 3 ? 'critical' : 'high',
      factor: 'Timeline',
      description: `Only ${input.daysRemaining} days remaining`,
      identified_at: new Date(),
      impact: 'Limited time to complete project',
    });
  }

  return risks;
}

/**
 * Generate health recommendations
 */
export function generateRecommendations(
  factors: HealthFactor[],
  risks: RiskIndicator[],
  score: number
): HealthRecommendation[] {
  const recommendations: HealthRecommendation[] = [];

  // Sort factors by score to prioritize worst performers
  const sortedFactors = [...factors].sort((a, b) => a.score - b.score);

  // Generate factor-specific recommendations
  sortedFactors.forEach((factor) => {
    const factorRecs = getFactorRecommendations(factor);
    factorRecs.forEach((rec, index) => {
      recommendations.push({
        id: `rec-${factor.name.toLowerCase()}-${index}`,
        category: 'factor-improvement',
        priority:
          factor.score < 50
            ? 'critical'
            : factor.score < 70
              ? 'high'
              : 'medium',
        description: rec,
        factor: factor.name,
        estimated_impact: `Improving ${factor.name} by 10-20 points`,
        action_items: generateActionItems(factor),
      });
    });
  });

  // Add risk-based recommendations
  risks.forEach((risk) => {
    if (risk.severity === 'critical' || risk.severity === 'high') {
      recommendations.push({
        id: `rec-${risk.id}`,
        category: 'risk-mitigation',
        priority: risk.severity === 'critical' ? 'critical' : 'high',
        description: `Address: ${risk.description}`,
        factor: risk.factor,
        estimated_impact: `Reducing risk impact`,
        action_items: [
          'Schedule immediate review',
          'Identify root causes',
          'Create mitigation plan',
          'Assign owner for resolution',
        ],
      });
    }
  });

  // Add overall health recommendations
  if (score < 50) {
    recommendations.unshift({
      id: 'rec-overall-critical',
      category: 'overall',
      priority: 'critical',
      description:
        'Project health is critical. Escalate to stakeholders immediately and implement emergency response plan.',
      factor: 'Overall',
      estimated_impact: 'Prevent project failure',
      action_items: [
        'Schedule executive review',
        'Assess scope reduction options',
        'Identify additional resources',
        'Create recovery plan',
      ],
    });
  } else if (score < 70) {
    recommendations.unshift({
      id: 'rec-overall-at-risk',
      category: 'overall',
      priority: 'high',
      description:
        'Project is at risk. Implement immediate corrective actions to improve health.',
      factor: 'Overall',
      estimated_impact: 'Return to healthy state',
      action_items: [
        'Review project priorities',
        'Identify quick wins',
        'Address top-priority risks',
        'Increase team engagement',
      ],
    });
  }

  // Limit to top 5-10 recommendations
  return recommendations.slice(0, 10);
}

/**
 * Generate specific action items for a factor
 */
function generateActionItems(factor: HealthFactor): string[] {
  const actions: string[] = [];

  switch (factor.name) {
    case 'Completion':
      actions.push('Review task list and reprioritize');
      actions.push('Identify and remove blockers');
      actions.push('Increase team capacity if needed');
      break;
    case 'Timeline':
      actions.push('Re-baseline project schedule');
      actions.push('Assess deadline feasibility');
      actions.push('Identify critical path tasks');
      break;
    case 'Task Health':
      actions.push('Complete overdue tasks first');
      actions.push('Unblock blocked tasks');
      actions.push('Review task dependencies');
      break;
    case 'Resources':
      actions.push('Assess team allocation');
      actions.push('Balance workload across team');
      actions.push('Consider adding/removing team members');
      break;
    case 'Risk':
      actions.push('List and prioritize all blockers');
      actions.push('Create mitigation plans');
      actions.push('Identify owner for each risk');
      break;
  }

  return actions;
}

/**
 * Calculate complete project health metrics
 */
export function calculateProjectHealth(
  input: ProjectHealthInput,
  previousHistory: number[] = []
): ProjectHealthMetrics {
  // Calculate all factors
  const factors = getAllFactors(input);

  // Calculate aggregate score
  const overallScore = calculateAggregateScore(factors);

  // Determine health state
  const healthState = getHealthState(overallScore);

  // Get risk factor specifically
  const riskFactor = factors.find((f) => f.name === 'Risk');
  const riskScore = riskFactor?.score || 75;
  const riskLevel = getRiskLevel(riskScore);

  // Calculate trend
  const trend = calculateTrend(overallScore, previousHistory);

  // Identify risks
  const risks = identifyRisks(factors, input);

  // Generate recommendations
  const recommendations = generateRecommendations(factors, risks, overallScore);

  // Format factors for display
  const formattedFactors = factors.map((f) => ({
    name: f.name,
    score: Math.round(f.score * 10) / 10,
    weight: f.weight,
    trend: f.trend,
    icon: getFactorIcon(f.name),
    color: getFactorColor(f.name, f.score),
  }));

  return {
    projectId: input.projectId,
    overallScore: Math.round(overallScore * 10) / 10,
    healthState,
    healthStateLabel: getHealthStateLabel(healthState),
    healthStateIcon: HEALTH_ICONS[healthState],
    factors: formattedFactors,
    trend,
    riskLevel,
    riskScore: Math.round(riskScore * 10) / 10,
    risks,
    recommendations,
    lastCalculated: new Date(),
    scoreHistory: [...previousHistory.slice(-9), overallScore],
  };
}

/**
 * Get color for health state
 */
export function getHealthStateColor(state: string): string {
  return HEALTH_COLORS[state as keyof typeof HEALTH_COLORS] || HEALTH_COLORS.neutral;
}

/**
 * Get color for factor based on name and score
 */
function getFactorColor(name: string, score: number): string {
  if (score >= 90) return '#10b981'; // Green
  if (score >= 70) return '#f59e0b'; // Amber
  if (score >= 50) return '#ef4444'; // Red
  return '#8b5cf6'; // Purple
}

/**
 * Get icon for factor
 */
function getFactorIcon(name: string): string {
  switch (name) {
    case 'Completion':
      return '📊';
    case 'Timeline':
      return '⏰';
    case 'Task Health':
      return '✓';
    case 'Resources':
      return '👥';
    case 'Risk':
      return '⚠';
    default:
      return '•';
  }
}

/**
 * Get human-readable label for health state
 */
function getHealthStateLabel(
  state: 'ahead' | 'on-track' | 'at-risk' | 'behind' | 'critical'
): string {
  const labels = {
    ahead: 'Ahead',
    'on-track': 'On Track',
    'at-risk': 'At Risk',
    behind: 'Behind',
    critical: 'Critical',
  };
  return labels[state];
}

/**
 * Compare health metrics across multiple projects
 */
export function compareProjectsHealth(
  metrics: ProjectHealthMetrics[]
): {
  healthiest: ProjectHealthMetrics;
  riskiest: ProjectHealthMetrics;
  averageScore: number;
  trendSummary: string;
} {
  if (metrics.length === 0) {
    throw new Error('No projects to compare');
  }

  const sorted = [...metrics].sort((a, b) => b.overallScore - a.overallScore);
  const averageScore =
    metrics.reduce((sum, m) => sum + m.overallScore, 0) / metrics.length;

  const improvingCount = metrics.filter((m) => m.trend === 'improving').length;
  const decliningCount = metrics.filter((m) => m.trend === 'declining').length;

  let trendSummary = 'Overall trend is stable';
  if (improvingCount > decliningCount) {
    trendSummary = `Portfolio improving (${improvingCount} projects)`;
  } else if (decliningCount > improvingCount) {
    trendSummary = `Portfolio declining (${decliningCount} projects)`;
  }

  return {
    healthiest: sorted[0],
    riskiest: sorted[sorted.length - 1],
    averageScore: Math.round(averageScore * 10) / 10,
    trendSummary,
  };
}
