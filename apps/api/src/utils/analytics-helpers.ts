/**
 * Shared Analytics Helper Functions
 * Consolidates duplicated analytics utilities across controllers
 */

export type TimeRangeType = '7d' | '30d' | '90d' | '1y' | 'all';

export interface TimeRangeInfo {
  daysBack: number;
  startDate: Date;
  endDate: Date;
}

/**
 * Convert time range string to number of days
 * Consolidates getDaysBack functions from multiple controllers
 */
export function getDaysBack(range: TimeRangeType): number {
  switch (range) {
    case '7d': return 7;
    case '30d': return 30;
    case '90d': return 90;
    case '1y': return 365;
    case 'all': return 365 * 10; // 10 years for "all time"
    default: return 30;
  }
}

/**
 * Calculate date range information for analytics queries
 */
export function getTimeRangeInfo(timeRange: TimeRangeType = '30d'): TimeRangeInfo {
  const now = new Date();
  const daysBack = getDaysBack(timeRange);
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - daysBack);
  
  return {
    daysBack,
    startDate,
    endDate: now
  };
}

/**
 * Generate date labels for time series data
 */
export function generateDateLabels(daysBack: number): string[] {
  const labels: string[] = [];
  const now = new Date();
  
  for (let i = daysBack - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    labels.push(dateStr);
  }
  
  return labels;
}

/**
 * Check if a date falls within a specific day
 */
export function isDateInDay(date: Date, targetDate: Date): boolean {
  return date.toISOString().split('T')[0] === targetDate.toISOString().split('T')[0];
}

/**
 * Calculate project health score based on completion and overdue ratios
 */
export function calculateProjectHealth(completion: number, overdueRatio: number): 'good' | 'warning' | 'critical' {
  if (overdueRatio > 0.3 || completion < 30) {
    return 'critical';
  } else if (overdueRatio > 0.1 || completion < 70) {
    return 'warning';
  }
  return 'good';
}

/**
 * Calculate task completion percentage safely
 */
export function calculateCompletionRate(completed: number, total: number): number {
  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

/**
 * Calculate percentage with precision (for more precise calculations)
 */
export function calculatePercentage(value: number, total: number, precision: number = 0): number {
  if (total === 0) return 0;
  const multiplier = Math.pow(10, precision);
  return Math.round((value / total) * 100 * multiplier) / multiplier;
}

/**
 * Calculate efficiency rate with precision
 */
export function calculateEfficiency(actual: number, estimated: number, precision: number = 2): number {
  if (estimated === 0) return 0;
  const multiplier = Math.pow(10, precision);
  return Math.round((actual / estimated) * 100 * multiplier) / multiplier;
}

/**
 * Calculate utilization percentage
 */
export function calculateUtilization(used: number, available: number): number {
  return Math.min(100, Math.max(0, calculatePercentage(used, available)));
}

/**
 * Calculate task velocity (tasks completed per week)
 */
export function calculateVelocity(completedTasks: number, projectAgeInDays: number): number {
  const projectAgeInWeeks = Math.max(1, projectAgeInDays / 7);
  return Math.round((completedTasks / projectAgeInWeeks) * 100) / 100;
}

/**
 * Calculate productivity score
 */
export function calculateProductivity(completed: number, totalHours: number, precision: number = 2): number {
  if (totalHours === 0) return 0;
  const multiplier = Math.pow(10, precision);
  return Math.round((completed / totalHours) * multiplier) / multiplier;
}

/**
 * Calculate team utilization based on hours worked vs available hours
 */
export function calculateTeamUtilization(totalHours: number, teamSize: number, weeksInPeriod: number = 4): number {
  const availableHours = teamSize * 40 * weeksInPeriod; // 40 hours per week
  return calculateUtilization(totalHours, availableHours);
}

/**
 * Safe division with fallback
 */
export function safeDivide(numerator: number, denominator: number, fallback: number = 0): number {
  return denominator !== 0 ? numerator / denominator : fallback;
}

/**
 * Round to specified decimal places
 */
export function roundToPrecision(value: number, precision: number = 2): number {
  const multiplier = Math.pow(10, precision);
  return Math.round(value * multiplier) / multiplier;
}

