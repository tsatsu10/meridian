/**
 * Type definitions for Settings Module
 * Replaces 'any' types with proper interfaces
 */

export interface UserSettings {
  userId: string;
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  timezone?: string;
  notifications?: NotificationSettings;
  privacy?: PrivacySettings;
  accessibility?: AccessibilitySettings;
  email?: EmailSettings;
  automation?: AutomationSettings;
  calendar?: CalendarSettings;
  auditLog?: AuditLogSettings;
  backup?: BackupSettings;
}

export interface NotificationSettings {
  email?: boolean;
  push?: boolean;
  inApp?: boolean;
  digest?: 'immediate' | 'hourly' | 'daily' | 'weekly';
  channels?: {
    tasks?: boolean;
    projects?: boolean;
    mentions?: boolean;
    updates?: boolean;
  };
}

export interface PrivacySettings {
  profileVisibility?: 'public' | 'team' | 'private';
  activityTracking?: boolean;
  dataCollection?: boolean;
  thirdPartySharing?: boolean;
}

export interface AccessibilitySettings {
  highContrast?: boolean;
  largeText?: boolean;
  reduceMotion?: boolean;
  screenReader?: boolean;
  keyboardNavigation?: boolean;
}

export interface EmailSettings {
  smtp?: SmtpConfig;
  templates?: EmailTemplate[];
  defaultFrom?: string;
  replyTo?: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AutomationSettings {
  enabled?: boolean;
  rules?: AutomationRule[];
  workflows?: Workflow[];
  triggers?: Trigger[];
}

export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: Trigger;
  conditions: Condition[];
  actions: Action[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Trigger {
  type: 'event' | 'schedule' | 'webhook';
  event?: string;
  schedule?: string;
  webhookUrl?: string;
}

export interface Condition {
  field: string;
  operator: 'equals' | 'contains' | 'greater' | 'less' | 'in' | 'notIn';
  value: any; // Can be string, number, boolean, array
}

export interface Action {
  type: 'email' | 'notification' | 'webhook' | 'task' | 'update';
  params: Record<string, any>;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'delay';
  data: Record<string, any>;
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface CalendarSettings {
  defaultView?: 'day' | 'week' | 'month' | 'year';
  startDay?: 0 | 1 | 2 | 3 | 4 | 5 | 6; // Sunday = 0
  timeFormat?: '12h' | '24h';
  timezone?: string;
  integrations?: CalendarIntegration[];
}

export interface CalendarIntegration {
  id: string;
  type: 'google' | 'outlook' | 'ical';
  name: string;
  enabled: boolean;
  syncInterval?: number;
  lastSync?: Date;
}

export interface AuditLogSettings {
  enabled?: boolean;
  retention?: number; // Days
  events?: AuditEventType[];
  exportFormat?: 'json' | 'csv' | 'pdf';
}

export type AuditEventType = 
  | 'user.login'
  | 'user.logout'
  | 'user.create'
  | 'user.update'
  | 'user.delete'
  | 'project.create'
  | 'project.update'
  | 'project.delete'
  | 'task.create'
  | 'task.update'
  | 'task.delete'
  | 'settings.update';

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  event: AuditEventType;
  resource?: string;
  resourceId?: string;
  changes?: Record<string, { from: any; to: any }>;
  ip?: string;
  userAgent?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface BackupSettings {
  enabled?: boolean;
  frequency?: 'hourly' | 'daily' | 'weekly' | 'monthly';
  retention?: number; // Number of backups to keep
  destinations?: BackupDestination[];
  includeAttachments?: boolean;
  encryption?: boolean;
}

export interface BackupDestination {
  id: string;
  type: 's3' | 'local' | 'ftp' | 'cloud';
  config: Record<string, any>;
  enabled: boolean;
}

export interface Backup {
  id: string;
  filename: string;
  size: number;
  createdAt: Date;
  destination: string;
  status: 'pending' | 'completed' | 'failed';
  verified?: boolean;
}

export interface SettingsValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface SettingsPreset {
  id: string;
  name: string;
  description?: string;
  category: 'personal' | 'team' | 'system';
  settings: Partial<UserSettings>;
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoleDefinition {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  inheritsFrom?: string[]; // Role IDs
  isSystem?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  resource: string;
  actions: ('create' | 'read' | 'update' | 'delete' | 'execute')[];
  conditions?: Record<string, any>;
}

export interface SearchQuery {
  query: string;
  filters?: Record<string, any>;
  sort?: { field: string; order: 'asc' | 'desc' };
  page?: number;
  limit?: number;
}

export interface SearchResult<T = any> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  query: SearchQuery;
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// API Response types
export interface SettingsResponse {
  success: boolean;
  data?: UserSettings;
  error?: string;
  message?: string;
}

export interface AuditLogsResponse {
  success: boolean;
  data?: {
    logs: AuditLog[];
    total: number;
    page: number;
    limit: number;
  };
  error?: string;
}

export interface BackupResponse {
  success: boolean;
  data?: Backup;
  error?: string;
}

export interface ValidationResponse {
  success: boolean;
  data?: SettingsValidationResult;
  error?: string;
}

// Request types
export interface UpdateSettingsRequest {
  settings: Partial<UserSettings>;
  userId?: string;
}

export interface CreateBackupRequest {
  includeAttachments?: boolean;
  destinations?: string[];
  encryption?: boolean;
}

export interface RestoreBackupRequest {
  backupId: string;
  overwrite?: boolean;
}

export interface ExportSettingsRequest {
  format: 'json' | 'yaml';
  includeSecrets?: boolean;
}

export interface ImportSettingsRequest {
  settings: string | object;
  format: 'json' | 'yaml';
  merge?: boolean;
}


