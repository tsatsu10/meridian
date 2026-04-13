export type MetricDataType = "number" | "percentage" | "currency" | "time" | "count";

export type MetricCategory = "project" | "task" | "team" | "time" | "custom";

export type MetricAggregation = "sum" | "average" | "min" | "max" | "count" | "last" | "first";

export type MetricTimeframe = "1h" | "24h" | "7d" | "30d" | "90d" | "1y" | "all";

export interface MetricDefinition {
  id: string;
  name: string;
  description: string;
  category: MetricCategory;
  dataType: MetricDataType;
  aggregation: MetricAggregation;
  defaultTimeframe: MetricTimeframe;
  formula?: string; // SQL-like formula for calculated metrics
  dependencies?: string[]; // IDs of metrics this metric depends on
  tags?: string[];
  unit?: string;
  thresholds?: {
    warning?: number;
    critical?: number;
  };
}

export interface MetricValue {
  metricId: string;
  value: number;
  timestamp: string;
  timeframe: MetricTimeframe;
  context?: {
    workspaceId?: string;
    projectId?: string;
    userId?: string;
    teamId?: string;
    [key: string]: unknown;
  };
}

export interface MetricQuery {
  metricIds: string[];
  timeframe: MetricTimeframe;
  aggregation?: MetricAggregation;
  filters?: {
    workspaceId?: string;
    projectId?: string;
    userId?: string;
    teamId?: string;
    startDate?: string;
    endDate?: string;
    [key: string]: unknown;
  };
  groupBy?: string[];
}

export interface MetricResult {
  metricId: string;
  data: {
    value: number;
    timestamp: string;
    [key: string]: unknown;
  }[];
  aggregatedValue?: number;
  metadata?: {
    unit?: string;
    thresholds?: {
      warning?: number;
      critical?: number;
    };
    [key: string]: unknown;
  };
} 