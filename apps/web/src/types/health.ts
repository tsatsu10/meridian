/**
 * Health Calculation Types & Interfaces
 * Advanced project health metrics and scoring system
 */

/**
 * Individual health factor with score and metadata
 */
export interface HealthFactor {
  /** Unique identifier for the factor */
  id: string;
  
  /** Human-readable factor name */
  name: string;
  
  /** Weight in overall calculation (0-1) */
  weight: number;
  
  /** Factor score (0-100, where 100 is best) */
  score: number;
  
  /** Trend direction for this factor */
  trend?: 'improving' | 'stable' | 'declining';
  
  /** Detailed explanation of the score */
  details?: string;
  
  /** Actionable recommendation to improve this factor */
  recommendation?: string;
}

/**
 * Overall project health metrics
 */
export interface ProjectHealthMetrics {
  /** Overall health score (0-100+) */
  overallScore: number;
  
  /** Current health state */
  healthState: 'on-track' | 'at-risk' | 'behind' | 'ahead' | 'critical';
  
  /** Individual factor scores */
  factors: HealthFactor[];
  
  /** Overall trend direction */
  trend: 'improving' | 'stable' | 'declining';
  
  /** When metrics were last calculated */
  lastUpdated: Date;
  
  /** When next review is recommended */
  nextReviewDate?: Date;
  
  /** Risk level assessment */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  
  /** Prioritized recommendations for improvement */
  recommendations: string[];
  
  /** Specific risks identified */
  identifiedRisks?: string[];
}

/**
 * Historical health data for trend analysis
 */
export interface HealthHistory {
  /** Project identifier */
  projectId: string;
  
  /** Timestamp of measurement */
  timestamp: Date;
  
  /** Health score at that time */
  score: number;
  
  /** Health state at that time */
  state: 'on-track' | 'at-risk' | 'behind' | 'ahead' | 'critical';
}

/**
 * Health factor details for breakdown display
 */
export interface HealthFactorDetail {
  /** Factor identifier */
  factorId: string;
  
  /** Component breakdown of score */
  components: {
    name: string;
    value: number;
    weight: number;
  }[];
  
  /** Historical trend for this factor */
  history: {
    date: Date;
    score: number;
  }[];
}

/**
 * Risk indicator for early warning system
 */
export interface RiskIndicator {
  /** Risk identifier */
  id: string;
  
  /** Risk severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  /** Human-readable risk description */
  description: string;
  
  /** Affected area (task, resource, timeline, etc) */
  affectedArea: string;
  
  /** Recommended action */
  recommendedAction: string;
  
  /** When risk was identified */
  detectedAt: Date;
}

/**
 * Health recommendation
 */
export interface HealthRecommendation {
  /** Recommendation identifier */
  id: string;
  
  /** Priority level */
  priority: 'low' | 'medium' | 'high';
  
  /** Related factor(s) */
  relatedFactors: string[];
  
  /** Recommendation text */
  text: string;
  
  /** Estimated effort to implement (hours) */
  estimatedEffort?: number;
  
  /** Expected impact on health score (0-100) */
  expectedImpact?: number;
}

/**
 * Health comparison for multiple projects
 */
export interface HealthComparison {
  /** Average health score across projects */
  averageScore: number;
  
  /** Distribution of health states */
  stateDistribution: {
    'on-track': number;
    'at-risk': number;
    'behind': number;
    'ahead': number;
    'critical': number;
  };
  
  /** Projects at highest risk */
  highestRiskProjects: {
    projectId: string;
    projectName: string;
    score: number;
    riskLevel: string;
  }[];
  
  /** Most common factors affecting health */
  commonFactorIssues: {
    factor: string;
    affectedCount: number;
    averageScore: number;
  }[];
}

/**
 * Health calculation input
 */
export interface ProjectHealthInput {
  projectId: string;
  startDate: Date;
  endDate: Date;
  completedTasks: number;
  totalTasks: number;
  overdueTasks: number;
  blockedTasks: number;
  teamMemberCount: number;
  allocatedHours: number;
  criticalPathTasks: number;
  unmetDependencies: number;
}

/**
 * Health calculation constants
 */
export const HEALTH_WEIGHTS = {
  completion: 0.30,
  timeline: 0.25,
  taskHealth: 0.20,
  resources: 0.15,
  risk: 0.10,
} as const;

export const HEALTH_SCORE_THRESHOLDS = {
  ahead: 110,
  onTrack: 90,
  atRisk: 70,
  behind: 50,
  critical: 0,
} as const;

export const HEALTH_STATE_COLORS = {
  'on-track': '#10b981', // Green
  'at-risk': '#f59e0b', // Amber
  'behind': '#ef4444', // Red
  'ahead': '#3b82f6', // Blue
  'critical': '#8b5cf6', // Purple
} as const;

export const HEALTH_STATE_LABELS = {
  'on-track': 'On Track',
  'at-risk': 'At Risk',
  'behind': 'Behind',
  'ahead': 'Ahead',
  'critical': 'Critical',
} as const;

/**
 * Trend indicators
 */
export const TREND_ICONS = {
  improving: '↑',
  stable: '→',
  declining: '↓',
} as const;

export const TREND_COLORS = {
  improving: '#10b981', // Green
  stable: '#6b7280', // Gray
  declining: '#ef4444', // Red
} as const;

/**
 * Risk levels
 */
export const RISK_LEVEL_THRESHOLD = {
  low: 80,
  medium: 60,
  high: 40,
  critical: 0,
} as const;
