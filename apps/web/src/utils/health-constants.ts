/**
 * Health Calculation Constants
 * Weights, thresholds, and configuration for health scoring
 */

/**
 * Factor weights in overall health calculation
 * Total must equal 1.0
 */
export const HEALTH_FACTOR_WEIGHTS = {
  completion: 0.30,    // Task completion progress
  timeline: 0.25,      // Timeline adherence
  taskHealth: 0.20,    // Overdue/blocked tasks
  resources: 0.15,     // Team allocation and capacity
  risk: 0.10,          // Blockers, dependencies, risks
} as const;

/**
 * Health score thresholds for state classification
 */
export const HEALTH_SCORE_RANGES = {
  ahead: { min: 110, max: 200, label: 'Ahead', severity: 'good' },
  onTrack: { min: 90, max: 109, label: 'On Track', severity: 'good' },
  atRisk: { min: 70, max: 89, label: 'At Risk', severity: 'warning' },
  behind: { min: 50, max: 69, label: 'Behind', severity: 'danger' },
  critical: { min: 0, max: 49, label: 'Critical', severity: 'critical' },
} as const;

/**
 * Completion factor calculation parameters
 */
export const COMPLETION_FACTOR_PARAMS = {
  velocityWeight: 0.40,          // Weight of velocity in completion score
  completionWeight: 0.60,        // Weight of percentage in completion score
  minVelocityTasks: 5,           // Minimum tasks to calculate velocity
  velocityDecayDays: 7,          // Days to look back for velocity
} as const;

/**
 * Timeline factor calculation parameters
 */
export const TIMELINE_FACTOR_PARAMS = {
  criticalThresholdDays: 7,      // Days remaining for critical status
  warnThresholdDays: 14,         // Days remaining for warning
  optimalUtilization: 0.5,       // Optimal time utilization (50%)
  timelineDecayFactor: 1.2,      // Multiplier for time-based penalty
} as const;

/**
 * Task health factor calculation parameters
 */
export const TASK_HEALTH_FACTOR_PARAMS = {
  overduePenalty: 0.60,          // Penalty weight for overdue tasks
  blockedPenalty: 0.40,          // Penalty weight for blocked tasks
  warningDaysBefore: 2,          // Days before due date to warn
  taskHealthMin: 0,              // Minimum health score
  taskHealthMax: 100,            // Maximum health score
} as const;

/**
 * Resource health factor calculation parameters
 */
export const RESOURCE_HEALTH_FACTOR_PARAMS = {
  optimalUtilizationMin: 0.70,   // Minimum optimal utilization (70%)
  optimalUtilizationMax: 0.90,   // Maximum optimal utilization (90%)
  underutilizedPenalty: 20,      // Penalty for underutilization
  overutilizedPenalty: 30,       // Penalty for overutilization
  hoursPerMemberDay: 8,          // Standard hours per team member per day
} as const;

/**
 * Risk factor calculation parameters
 */
export const RISK_FACTOR_PARAMS = {
  blockerPenalty: 5,             // Points lost per blocker
  criticalPathPenalty: 15,       // Points lost if critical path at risk
  dependencyPenalty: 3,          // Points lost per unmet dependency
  maxRiskScore: 100,             // Maximum risk score
  minRiskScore: 0,               // Minimum risk score
} as const;

/**
 * Trend calculation parameters
 */
export const TREND_PARAMS = {
  stableThreshold: 5,            // Points margin for stable trend
  historyLength: 5,              // Number of historical points to consider
  improvingThreshold: 5,         // Minimum improvement to consider improving
  decliningThreshold: -5,        // Maximum decline to consider declining
  decayPerDay: 0.5,              // How much older data is weighted
} as const;

/**
 * Risk level thresholds
 */
export const RISK_LEVEL_THRESHOLDS = {
  low: 80,                       // >= 80: Low risk
  medium: 60,                    // 60-79: Medium risk
  high: 40,                      // 40-59: High risk
  critical: 0,                   // < 40: Critical risk
} as const;

/**
 * Health review schedule
 */
export const HEALTH_REVIEW_SCHEDULE = {
  stableProject: 7,              // Days between reviews for stable projects
  atRiskProject: 3,              // Days between reviews for at-risk projects
  behindProject: 1,              // Days between reviews for behind projects
  criticalProject: 0.5,          // Days between reviews for critical projects (daily)
} as const;

/**
 * Color scheme for health visualization
 */
export const HEALTH_COLORS = {
  ahead: '#3b82f6',              // Blue
  onTrack: '#10b981',            // Green
  atRisk: '#f59e0b',             // Amber
  behind: '#ef4444',             // Red
  critical: '#8b5cf6',           // Purple
  neutral: '#6b7280',            // Gray
} as const;

/**
 * Icons for health states
 */
export const HEALTH_ICONS = {
  ahead: '⚡',                    // Lightning bolt
  onTrack: '✓',                  // Checkmark
  atRisk: '⚠',                   // Warning
  behind: '✗',                   // X
  critical: '‼',                 // Double exclamation
} as const;

/**
 * Trend indicators
 */
export const TREND_INDICATORS = {
  improving: { icon: '↑', label: 'Improving', color: '#10b981' },
  stable: { icon: '→', label: 'Stable', color: '#6b7280' },
  declining: { icon: '↓', label: 'Declining', color: '#ef4444' },
} as const;

/**
 * Recommendation priority colors
 */
export const RECOMMENDATION_COLORS = {
  low: '#d1d5db',                // Gray
  medium: '#fbbf24',             // Amber
  high: '#f87171',               // Red
  critical: '#dc2626',           // Dark Red
} as const;

/**
 * Default health metrics for new projects
 */
export const DEFAULT_HEALTH_METRICS = {
  overallScore: 75,
  healthState: 'on-track' as const,
  factors: [],
  trend: 'stable' as const,
  riskLevel: 'medium' as const,
  recommendations: [],
} as const;

/**
 * Performance thresholds
 */
export const PERFORMANCE_THRESHOLDS = {
  calculationTimeMs: 100,        // Max time for health calculation (ms)
  batchCalculationMs: 500,       // Max time for batch calculation (ms)
  cacheValidityMinutes: 5,       // Cache validity period
} as const;

/**
 * Validation rules
 */
export const VALIDATION_RULES = {
  minProjectDurationDays: 1,
  maxProjectDurationDays: 1825,  // ~5 years
  minTeamMembers: 1,
  maxTeamMembers: 1000,
  minTasks: 0,
  maxTasks: 10000,
} as const;

/**
 * Common recommendations templates
 */
export const RECOMMENDATION_TEMPLATES = {
  slowProgress: 'Increase team velocity: Consider adding team members or removing blockers.',
  timeline: 'Timeline at risk: Review task prioritization and dependencies.',
  overdueTasks: 'Address overdue tasks immediately to prevent project delays.',
  underutilized: 'Team is underutilized: Allocate more tasks or extend project scope.',
  overutilized: 'Team is overutilized: Consider removing scope or adding resources.',
  riskFound: 'Critical risks identified: Schedule immediate review meeting.',
  noRisk: 'Project health is strong: Continue current pace.',
} as const;
