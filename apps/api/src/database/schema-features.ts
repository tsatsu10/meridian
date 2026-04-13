import { pgTable, text, timestamp, integer, boolean, jsonb, serial, uuid, decimal, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ==========================================
// WORKSPACE SETTINGS TABLE
// ==========================================

// Workspace Settings
export const workspaceSettings = pgTable("workspace_settings", {
  id: serial("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  allowGuestInvites: boolean("allow_guest_invites").notNull().default(true),
  requireApprovalForNewMembers: boolean("require_approval_for_new_members").notNull().default(false),
  enableTeamChat: boolean("enable_team_chat").notNull().default(true),
  enableFileSharing: boolean("enable_file_sharing").notNull().default(true),
  enableTimeTracking: boolean("enable_time_tracking").notNull().default(true),
  enableProjectTemplates: boolean("enable_project_templates").notNull().default(true),
  enableAdvancedAnalytics: boolean("enable_advanced_analytics").notNull().default(false),
  enableAutomation: boolean("enable_automation").notNull().default(true),
  enableIntegrations: boolean("enable_integrations").notNull().default(true),
  enableNotifications: boolean("enable_notifications").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: text("created_by"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: text("updated_by"),
}, (table) => ({
  workspaceIdIdx: index("workspace_settings_workspace_id_idx").on(table.workspaceId),
}));

// workspace_invites: single canonical definition in schema.ts (text id, token, inviteeEmail, …).
// Do not re-declare here — it previously conflicted with export * from schema-features in schema.ts.

// ==========================================
// SECURITY & COMPLIANCE TABLES
// ==========================================

// Security Alerts
export const securityAlerts = pgTable("security_alerts", {
  id: serial("id").primaryKey(),
  severity: text("severity").notNull(), // critical, high, medium, low
  type: text("type").notNull(), // failed_login, data_breach, unauthorized_access, suspicious_activity
  description: text("description").notNull(),
  status: text("status").notNull().default("active"), // active, resolved
  resolvedBy: integer("resolved_by"),
  resolvedAt: timestamp("resolved_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Security Metrics History
export const securityMetricsHistory = pgTable("security_metrics_history", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  totalThreats: integer("total_threats").notNull().default(0),
  resolvedThreats: integer("resolved_threats").notNull().default(0),
  criticalAlerts: integer("critical_alerts").notNull().default(0),
  highAlerts: integer("high_alerts").notNull().default(0),
  mediumAlerts: integer("medium_alerts").notNull().default(0),
  lowAlerts: integer("low_alerts").notNull().default(0),
  failedLogins: integer("failed_logins").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Two-Factor Authentication Status
export const twoFactorStatus = pgTable("two_factor_status", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  enabled: boolean("enabled").notNull().default(false),
  enabledAt: timestamp("enabled_at"),
  method: text("method"), // app, sms, email
  backupCodes: jsonb("backup_codes"),
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("two_factor_user_id_idx").on(table.userId),
}));

// GDPR Compliance
export const gdprDataRetentionPolicies = pgTable("gdpr_data_retention_policies", {
  id: serial("id").primaryKey(),
  dataType: text("data_type").notNull(), // user_data, activity_logs, files, etc.
  retentionPeriod: integer("retention_period").notNull(), // in days
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const gdprUserConsent = pgTable("gdpr_user_consent", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  consentType: text("consent_type").notNull(), // data_collection, marketing, analytics, etc.
  consented: boolean("consented").notNull(),
  consentedAt: timestamp("consented_at"),
  revokedAt: timestamp("revoked_at"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("gdpr_consent_user_id_idx").on(table.userId),
}));

export const gdprDataRequests = pgTable("gdpr_data_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  requestType: text("request_type").notNull(), // access, deletion, portability
  status: text("status").notNull().default("pending"), // pending, processing, completed, rejected
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  completedBy: integer("completed_by"),
  notes: text("notes"),
  metadata: jsonb("metadata"),
}, (table) => ({
  userIdIdx: index("gdpr_requests_user_id_idx").on(table.userId),
}));

// User Sessions (enhanced)
export const userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  sessionId: uuid("session_id").notNull().unique(),
  userId: integer("user_id").notNull(),
  deviceInfo: text("device_info"),
  browser: text("browser"),
  os: text("os"),
  ipAddress: text("ip_address"),
  location: text("location"),
  lastActivity: timestamp("last_activity").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  isActive: boolean("is_active").notNull().default(true),
}, (table) => ({
  userIdIdx: index("sessions_user_id_idx").on(table.userId),
  sessionIdIdx: index("sessions_session_id_idx").on(table.sessionId),
}));

// ==========================================
// RISK DETECTION & ALERTS
// ==========================================

// Risk Alerts - Workspace-level risk tracking
export const riskAlerts = pgTable("risk_alerts", {
  id: serial("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  projectId: text("project_id"), // optional - can be null for workspace-level alerts
  alertType: text("alert_type").notNull(), // overdue, blocked, resource_conflict, deadline_risk, dependency_chain, quality_risk
  severity: text("severity").notNull(), // low, medium, high, critical
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"), // active, acknowledged, resolved, dismissed
  riskScore: integer("risk_score"), // 0-100
  affectedTaskCount: integer("affected_task_count").default(0),
  metadata: jsonb("metadata"), // additional context, affected resources, etc.
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: text("resolved_by"),
  resolutionNotes: text("resolution_notes"),
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedBy: text("acknowledged_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  workspaceIdIdx: index("risk_alerts_workspace_id_idx").on(table.workspaceId),
  projectIdIdx: index("risk_alerts_project_id_idx").on(table.projectId),
  statusIdx: index("risk_alerts_status_idx").on(table.status),
  severityIdx: index("risk_alerts_severity_idx").on(table.severity),
  createdAtIdx: index("risk_alerts_created_at_idx").on(table.createdAt),
}));

// Analytics Exports - Track export job status
export const analyticsExports = pgTable("analytics_exports", {
  id: serial("id").primaryKey(),
  exportId: text("export_id").notNull().unique(),
  userId: text("user_id").notNull(),
  workspaceId: text("workspace_id").notNull(),
  exportType: text("export_type").notNull(), // dashboard, project, tasks, time_entries, etc.
  format: text("format").notNull(), // csv, excel, pdf
  filters: jsonb("filters"),
  status: text("status").notNull().default("queued"), // queued, processing, completed, failed
  progress: integer("progress").default(0), // 0-100
  fileUrl: text("file_url"),
  fileSize: integer("file_size"), // in bytes
  error: text("error"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  expiresAt: timestamp("expires_at"), // when the download link expires
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  exportIdIdx: index("analytics_exports_export_id_idx").on(table.exportId),
  userIdIdx: index("analytics_exports_user_id_idx").on(table.userId),
  statusIdx: index("analytics_exports_status_idx").on(table.status),
}));

// ==========================================
// EXECUTIVE DASHBOARD TABLES
// ==========================================

// Revenue Tracking
export const revenueMetrics = pgTable("revenue_metrics", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  mrr: decimal("mrr", { precision: 12, scale: 2 }).notNull().default("0"),
  arr: decimal("arr", { precision: 12, scale: 2 }).notNull().default("0"),
  newRevenue: decimal("new_revenue", { precision: 12, scale: 2 }).notNull().default("0"),
  churnRevenue: decimal("churn_revenue", { precision: 12, scale: 2 }).notNull().default("0"),
  growthRate: decimal("growth_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  dateIdx: index("revenue_metrics_date_idx").on(table.date),
}));

export const projectRevenue = pgTable("project_revenue", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  date: timestamp("date").notNull(),
  revenue: decimal("revenue", { precision: 12, scale: 2 }).notNull().default("0"),
  cost: decimal("cost", { precision: 12, scale: 2 }).notNull().default("0"),
  profit: decimal("profit", { precision: 12, scale: 2 }).notNull().default("0"),
  billingType: text("billing_type"), // fixed, hourly, retainer, etc.
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  projectIdIdx: index("project_revenue_project_id_idx").on(table.projectId),
  dateIdx: index("project_revenue_date_idx").on(table.date),
}));

// Customer Health Scores
export const customerHealth = pgTable("customer_health", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  healthScore: integer("health_score").notNull(), // 0-100
  engagementScore: integer("engagement_score").notNull().default(0),
  satisfactionScore: integer("satisfaction_score").notNull().default(0),
  usageScore: integer("usage_score").notNull().default(0),
  riskLevel: text("risk_level").notNull(), // healthy, at-risk, critical
  lastActivityAt: timestamp("last_activity_at"),
  notes: text("notes"),
  calculatedAt: timestamp("calculated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  customerIdIdx: index("customer_health_customer_id_idx").on(table.customerId),
}));

// NPS/CSAT Surveys
export const satisfactionSurveys = pgTable("satisfaction_surveys", {
  id: serial("id").primaryKey(),
  surveyType: text("survey_type").notNull(), // nps, csat
  userId: integer("user_id"),
  customerId: integer("customer_id"),
  score: integer("score").notNull(),
  feedback: text("feedback"),
  category: text("category"), // promoter, passive, detractor (for NPS)
  sentAt: timestamp("sent_at"),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  surveyTypeIdx: index("surveys_type_idx").on(table.surveyType),
  userIdIdx: index("surveys_user_id_idx").on(table.userId),
}));

// Financial Metrics
export const financialMetrics = pgTable("financial_metrics", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  totalBudget: decimal("total_budget", { precision: 12, scale: 2 }).notNull().default("0"),
  totalActual: decimal("total_actual", { precision: 12, scale: 2 }).notNull().default("0"),
  variance: decimal("variance", { precision: 12, scale: 2 }).notNull().default("0"),
  burnRate: decimal("burn_rate", { precision: 12, scale: 2 }).notNull().default("0"),
  cashInflow: decimal("cash_inflow", { precision: 12, scale: 2 }).notNull().default("0"),
  cashOutflow: decimal("cash_outflow", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  dateIdx: index("financial_metrics_date_idx").on(table.date),
}));

export const projectFinancials = pgTable("project_financials", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  budget: decimal("budget", { precision: 12, scale: 2 }).notNull().default("0"),
  actualCost: decimal("actual_cost", { precision: 12, scale: 2 }).notNull().default("0"),
  revenue: decimal("revenue", { precision: 12, scale: 2 }).notNull().default("0"),
  profitMargin: decimal("profit_margin", { precision: 5, scale: 2 }).notNull().default("0"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  projectIdIdx: index("project_financials_project_id_idx").on(table.projectId),
}));

// ROI Tracking
export const roiMetrics = pgTable("roi_metrics", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id"),
  name: text("name").notNull(),
  investment: decimal("investment", { precision: 12, scale: 2 }).notNull(),
  returns: decimal("returns", { precision: 12, scale: 2 }).notNull(),
  roi: decimal("roi", { precision: 5, scale: 2 }).notNull(),
  period: text("period"), // monthly, quarterly, yearly
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  projectIdIdx: index("roi_metrics_project_id_idx").on(table.projectId),
}));

// ==========================================
// AUTOMATION & MONITORING TABLES
// ==========================================

// Automation Rules
export const automationRules = pgTable("automation_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  trigger: text("trigger").notNull(), // task_created, task_completed, time_based, etc.
  conditions: jsonb("conditions").notNull(),
  actions: jsonb("actions").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  priority: integer("priority").notNull().default(0),
  executionCount: integer("execution_count").notNull().default(0),
  lastExecutedAt: timestamp("last_executed_at"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const automationExecutions = pgTable("automation_executions", {
  id: serial("id").primaryKey(),
  ruleId: integer("rule_id").notNull(),
  status: text("status").notNull(), // success, failed, pending
  triggeredBy: text("triggered_by"),
  executionTime: integer("execution_time"), // in milliseconds
  result: jsonb("result"),
  error: text("error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  ruleIdIdx: index("automation_executions_rule_id_idx").on(table.ruleId),
}));

// API Usage Tracking
export const apiUsageMetrics = pgTable("api_usage_metrics", {
  id: serial("id").primaryKey(),
  endpoint: text("endpoint").notNull(),
  method: text("method").notNull(),
  userId: integer("user_id"),
  statusCode: integer("status_code").notNull(),
  responseTime: integer("response_time").notNull(), // in milliseconds
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
}, (table) => ({
  endpointIdx: index("api_usage_endpoint_idx").on(table.endpoint),
  timestampIdx: index("api_usage_timestamp_idx").on(table.timestamp),
}));

export const apiRateLimits = pgTable("api_rate_limits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  endpoint: text("endpoint"),
  limit: integer("limit").notNull().default(1000),
  window: integer("window").notNull().default(3600), // in seconds
  currentUsage: integer("current_usage").notNull().default(0),
  resetAt: timestamp("reset_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("api_rate_limits_user_id_idx").on(table.userId),
}));

// Scheduled Reports
export const scheduledReports = pgTable("scheduled_reports", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  reportType: text("report_type").notNull(), // revenue, customer_health, security, etc.
  frequency: text("frequency").notNull(), // daily, weekly, monthly
  format: text("format").notNull(), // pdf, csv, excel
  recipients: jsonb("recipients").notNull(), // array of email addresses
  filters: jsonb("filters"),
  isActive: boolean("is_active").notNull().default(true),
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const reportExecutions = pgTable("report_executions", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").notNull(),
  status: text("status").notNull(), // success, failed, pending
  fileUrl: text("file_url"),
  error: text("error"),
  executionTime: integer("execution_time"), // in milliseconds
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  reportIdIdx: index("report_executions_report_id_idx").on(table.reportId),
}));

// ==========================================
// RELATIONS
// ==========================================

export const twoFactorStatusRelations = relations(twoFactorStatus, ({ one }) => ({
  user: one(twoFactorStatus, {
    fields: [twoFactorStatus.userId],
    references: [twoFactorStatus.id],
  }),
}));

export const automationRulesRelations = relations(automationRules, ({ many }) => ({
  executions: many(automationExecutions),
}));

export const automationExecutionsRelations = relations(automationExecutions, ({ one }) => ({
  rule: one(automationRules, {
    fields: [automationExecutions.ruleId],
    references: [automationRules.id],
  }),
}));

export const scheduledReportsRelations = relations(scheduledReports, ({ many }) => ({
  executions: many(reportExecutions),
}));

export const reportExecutionsRelations = relations(reportExecutions, ({ one }) => ({
  report: one(scheduledReports, {
    fields: [reportExecutions.reportId],
    references: [scheduledReports.id],
  }),
}));


