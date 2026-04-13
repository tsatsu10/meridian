// Report Metrics - what we're measuring
export interface ReportMetric {
  id: string;
  name: string;
  aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'distinct';
  field?: string; // database field to aggregate
  format?: 'number' | 'currency' | 'percentage' | 'duration';
}

// Visualization types for how data is displayed
export interface ReportVisualization {
  type: 'table' | 'bar_chart' | 'line_chart' | 'pie_chart' | 'card' | 'gauge';
  config: {
    title?: string;
    xAxis?: string;
    yAxis?: string;
    groupBy?: string;
    colors?: string[];
    showLegend?: boolean;
    showDataLabels?: boolean;
  };
}

// Report filters for data segmentation
export interface ReportFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in' | 'is_null' | 'is_not_null';
  value: any;
  label?: string;
}

// Main report configuration
export interface ReportConfig {
  id: string;
  name: string;
  description?: string;
  type: 'project_overview' | 'task_analytics' | 'time_tracking' | 'team_performance' | 'workspace_summary' | 'custom';
  dataSource: 'tasks' | 'projects' | 'users' | 'time_entries' | 'workspace_users' | 'teams' | 'milestones';
  metrics: ReportMetric[];
  filters: ReportFilter[];
  groupBy?: string[];
  sortBy?: { field: string; direction: 'asc' | 'desc' }[];
  visualization: ReportVisualization;
  dateRange?: {
    type: 'last_7_days' | 'last_30_days' | 'last_quarter' | 'last_year' | 'custom';
    startDate?: string;
    endDate?: string;
  };
  scope: {
    workspaceId: string;
    projectIds?: string[];
    teamIds?: string[];
    userIds?: string[];
  };
}

// Schedule configuration for automated reports
export interface ScheduleConfig {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'custom';
  cronExpression?: string; // for custom frequencies
  timezone: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  retryPolicy: {
    maxRetries: number;
    retryDelay: number; // in minutes
  };
}

// Alert conditions for automated notifications
export interface AlertCondition {
  metric: string;
  operator: 'greater_than' | 'less_than' | 'equals' | 'percent_change';
  threshold: number;
  message: string;
}

// Delivery configuration for reports
export interface DeliveryConfig {
  methods: ('email' | 'slack' | 'teams' | 'webhook')[];
  email?: {
    recipients: RecipientConfig[];
    subject: string;
    includeAttachment: boolean;
    attachmentFormat: 'pdf' | 'excel' | 'csv';
    bodyTemplate?: string;
  };
  slack?: {
    channelId: string;
    includeChart: boolean;
    message?: string;
  };
  teams?: {
    webhookUrl: string;
    includeChart: boolean;
    message?: string;
  };
  webhook?: {
    url: string;
    method: 'POST' | 'PUT';
    headers?: Record<string, string>;
    payload?: Record<string, any>;
  };
}

// Recipient configuration with different types
export interface RecipientConfig {
  type: 'user' | 'role' | 'team' | 'external';
  identifier: string; // userId, roleName, teamId, or email address
  name?: string;
}

// Database entity types
export interface CustomReport {
  id: string;
  name: string;
  description?: string;
  config: ReportConfig;
  createdBy: string;
  workspaceId: string;
  isTemplate: boolean;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportExecution {
  id: string;
  reportId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  resultData?: any;
  metadata: {
    recordCount: number;
    executionTime: number; // in milliseconds
    fileSizeKB?: number;
    dataQualityScore?: number; // 0-100
  };
  triggeredBy: 'manual' | 'scheduled' | 'api';
  userId?: string;
  deliveryStatus?: {
    email?: 'pending' | 'sent' | 'failed';
    slack?: 'pending' | 'sent' | 'failed';
    teams?: 'pending' | 'sent' | 'failed';
    webhook?: 'pending' | 'sent' | 'failed';
  };
}

export interface ReportSchedule {
  id: string;
  reportId: string;
  config: ScheduleConfig;
  delivery: DeliveryConfig;
  alerts?: AlertCondition[];
  lastExecutionId?: string;
  nextRunAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'project' | 'team' | 'time' | 'analytics' | 'custom';
  config: ReportConfig;
  previewImage?: string;
  usageCount: number;
  rating?: number;
  createdBy: string;
  isPublic: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  bodyTemplate: string; // HTML template with variables
  variables: string[]; // list of available variables
  isDefault: boolean;
  createdBy: string;
  workspaceId: string;
  createdAt: Date;
  updatedAt: Date;
}

// API Request/Response types
export interface CreateReportRequest {
  name: string;
  description?: string;
  config: ReportConfig;
  isTemplate?: boolean;
  tags?: string[];
  schedule?: {
    config: ScheduleConfig;
    delivery: DeliveryConfig;
    alerts?: AlertCondition[];
  };
}

export interface UpdateReportRequest extends Partial<CreateReportRequest> {
  id: string;
}

export interface ExecuteReportRequest {
  reportId: string;
  overrideFilters?: ReportFilter[];
  deliveryConfig?: DeliveryConfig;
}

export interface GetReportsResponse {
  reports: CustomReport[];
  total: number;
  pagination: {
    page: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ReportExecutionResponse {
  execution: ReportExecution;
  downloadUrl?: string;
}

// Utility types
export type ReportStatus = ReportExecution['status'];
export type DeliveryMethod = DeliveryConfig['methods'][number];
export type ReportFrequency = ScheduleConfig['frequency'];
export type VisualizationType = ReportVisualization['type'];
export type MetricAggregation = ReportMetric['aggregation'];
export type FilterOperator = ReportFilter['operator']; 
