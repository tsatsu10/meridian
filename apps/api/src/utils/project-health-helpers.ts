/**
 * Project Health Calculation Utilities
 * Consolidates health score calculations used across analytics controllers
 */

import { calculateCompletionRate, calculateVelocity, roundToPrecision } from './analytics-helpers';

export type ProjectHealthLevel = 'excellent' | 'good' | 'warning' | 'critical' | 'at_risk';
export type SimpleHealthLevel = 'good' | 'warning' | 'critical';

export interface ProjectHealthData {
  id: string;
  name: string;
  slug?: string;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  teamSize: number;
  createdAt: Date;
  dueDate?: Date | null;
}

export interface ProjectHealthMetrics extends ProjectHealthData {
  completion: number;
  health: ProjectHealthLevel;
  velocity: number;
  daysRemaining: number | null;
  avgTimePerTask: number;
  riskScore: number;
}

/**
 * Calculate comprehensive project health score (0-100)
 */
export function calculateHealthScore(
  completionRate: number,
  overdueRatio: number,
  velocityScore: number = 50,
  teamSizeBonus: number = 0
): number {
  // Base score from completion rate (40% weight)
  const completionScore = completionRate * 0.4;
  
  // On-time delivery score (30% weight) - penalize overdue tasks
  const onTimeScore = Math.max(0, (1 - overdueRatio) * 30);
  
  // Velocity score (20% weight) - normalized velocity performance
  const velocityBonus = Math.min(20, velocityScore * 0.2);
  
  // Team size bonus (10% weight) - larger teams get slight bonus for coordination
  const teamBonus = Math.min(10, teamSizeBonus);
  
  return Math.round(completionScore + onTimeScore + velocityBonus + teamBonus);
}

/**
 * Determine health level from health score (enhanced version)
 */
export function getHealthLevel(healthScore: number): ProjectHealthLevel {
  if (healthScore >= 85) return 'excellent';
  if (healthScore >= 75) return 'good';
  if (healthScore >= 60) return 'warning';
  if (healthScore >= 40) return 'critical';
  return 'at_risk';
}

/**
 * Determine simple health level from completion and overdue ratios
 */
export function getSimpleHealthLevel(completion: number, overdueRatio: number): SimpleHealthLevel {
  if (overdueRatio > 0.3 || completion < 30) {
    return 'critical';
  } else if (overdueRatio > 0.1 || completion < 70) {
    return 'warning';
  }
  return 'good';
}

/**
 * Calculate project velocity (tasks completed per week)
 */
export function calculateProjectVelocity(completedTasks: number, createdAt: Date): number {
  const projectAgeInDays = Math.max(1, (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  return calculateVelocity(completedTasks, projectAgeInDays);
}

/**
 * Calculate days remaining until project due date
 */
export function calculateDaysRemaining(dueDate?: Date | null): number | null {
  if (!dueDate) return null;
  const now = new Date();
  const diffTime = dueDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Generate comprehensive project health metrics
 */
export function calculateProjectHealth(project: ProjectHealthData): ProjectHealthMetrics {
  const completion = calculateCompletionRate(project.completedTasks, project.totalTasks);
  const overdueRatio = project.totalTasks > 0 ? project.overdueTasks / project.totalTasks : 0;
  const velocity = calculateProjectVelocity(project.completedTasks, project.createdAt);
  const daysRemaining = calculateDaysRemaining(project.dueDate);
  
  // Calculate health score with team size consideration
  const teamSizeBonus = Math.min(project.teamSize * 2, 10); // Max 10 point bonus
  const velocityScore = Math.min(velocity * 10, 100); // Normalize velocity to 0-100
  const healthScore = calculateHealthScore(completion, overdueRatio, velocityScore, teamSizeBonus);
  
  // Calculate risk score (inverse of health score with additional factors)
  const riskScore = Math.max(0, 100 - healthScore + (overdueRatio * 30));

  return {
    ...project,
    completion,
    health: getHealthLevel(healthScore),
    velocity: roundToPrecision(velocity),
    daysRemaining,
    avgTimePerTask: 0, // Will be calculated separately if time data available
    riskScore: Math.round(riskScore),
  };
}

/**
 * Calculate burndown trend
 */
export function calculateBurndownTrend(
  completedTasks: number,
  totalTasks: number,
  daysRemaining: number | null,
  targetVelocity: number = 1
): 'ahead' | 'on_track' | 'behind' | 'critical' {
  if (!daysRemaining || daysRemaining <= 0) return 'critical';
  
  const remainingTasks = totalTasks - completedTasks;
  const requiredVelocity = remainingTasks / (daysRemaining / 7); // Tasks per week needed
  
  if (requiredVelocity <= targetVelocity * 0.8) return 'ahead';
  if (requiredVelocity <= targetVelocity * 1.2) return 'on_track';
  if (requiredVelocity <= targetVelocity * 2) return 'behind';
  return 'critical';
}

/**
 * Batch calculate health for multiple projects
 */
export function calculateMultipleProjectHealth(projects: ProjectHealthData[]): ProjectHealthMetrics[] {
  return projects.map(calculateProjectHealth);
}

/**
 * Get projects by health level
 */
export function filterProjectsByHealth(
  projects: ProjectHealthMetrics[],
  healthLevel: ProjectHealthLevel | ProjectHealthLevel[]
): ProjectHealthMetrics[] {
  const levels = Array.isArray(healthLevel) ? healthLevel : [healthLevel];
  return projects.filter(project => levels.includes(project.health));
}

/**
 * Calculate team health distribution
 */
export function calculateHealthDistribution(projects: ProjectHealthMetrics[]) {
  const distribution = {
    excellent: 0,
    good: 0,
    warning: 0,
    critical: 0,
    at_risk: 0,
  };

  projects.forEach(project => {
    distribution[project.health]++;
  });

  return {
    ...distribution,
    total: projects.length,
    percentages: {
      excellent: calculateCompletionRate(distribution.excellent, projects.length),
      good: calculateCompletionRate(distribution.good, projects.length),
      warning: calculateCompletionRate(distribution.warning, projects.length),
      critical: calculateCompletionRate(distribution.critical, projects.length),
      at_risk: calculateCompletionRate(distribution.at_risk, projects.length),
    },
  };
}

