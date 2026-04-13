// Database schema index - Complete Meridian Platform
// Export all schemas for the entire platform

// Original schemas
export * from './task-integration';
export * from './messages';
export * from './channels';
export * from './users';
export * from './tasks';

// Phase 0-1: Infrastructure & Security
export * from './email-verification';
export * from './files';
export * from './two-factor';

// Phase 2: Core Features
export * from './team-awareness';
export * from './notifications';
export * from './notes';
export * from './presence';

// Phase 3: Advanced Features
export * from './workflows';
export * from './resources';
export * from './reports';
export * from './time-billing';
export * from './integrations';

// Phase 4: Collaboration
export * from './video';
export * from './whiteboard';
export * from './enhanced-chat';

// Phase 6: AI Features
export * from './ai-features';

// Gamification System
export * from './gamification';

// Phase 7: Goals & OKRs
export * from './goals';

// RBAC Unified
export * from './rbac-unified';

// Team Messages
export * from './team-messages';

// Smart Profile Features
export * from './smart-profile';

// Re-export tables with consistent naming
export { users } from './users';
export { tasks } from './tasks';
export { messageTable as messages } from './messages';
export { channels, channelMemberships, directMessageConversations } from './channels';
export { taskChannels, taskComments } from './task-integration';

// Export workspace-related tables from schema-features.ts
export {
  workspaceSettings,
  securityAlerts,
  securityMetricsHistory,
  twoFactorStatus,
  gdprDataRetentionPolicies,
  gdprUserConsent,
  gdprDataRequests,
  userSessions,
  riskAlerts
} from '../schema-features';

// Canonical workspace invites live in ../schema.ts (avoid duplicate table definitions).
export { workspaceInvites, workspaceInvites as workspaceInvitationTable } from '../schema';
export { workspaceSettings as workspaceSettingsTable } from '../schema-features'; 
