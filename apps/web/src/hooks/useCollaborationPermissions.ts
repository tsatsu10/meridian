/**
 * 🤝 Collaboration Permissions Hook
 *
 * Integrates team permissions with real-time collaboration features
 * Provides granular control over live editing, cursors, presence, and discussions
 */

import { useMemo } from 'react';
import { useTeamPermissions, type TeamRole, type TeamPermissions } from './useTeamPermissions';
import { useAuth } from '@/components/providers/auth-provider';
import { useWorkspacePermission } from './useWorkspacePermission';

export interface CollaborationPermissions {
  // ========== LIVE CURSORS & PRESENCE ==========
  canShowCursor: boolean;              // Display cursor position to others
  canSeeCursors: boolean;              // View others' cursor positions
  canUsePresenceIndicators: boolean;   // Show/view presence status
  canSetPresenceStatus: boolean;       // Change own presence status
  canViewPresenceDetails: boolean;     // See detailed presence info (device, location, etc.)
  canReceivePresenceNotifications: boolean; // Get notified of presence changes

  // ========== COLLABORATIVE EDITING ==========
  canCollaborativeEdit: boolean;       // Participate in real-time editing
  canEditTasks: boolean;              // Edit task content collaboratively
  canEditProjects: boolean;           // Edit project details collaboratively
  canEditDocuments: boolean;          // Edit shared documents
  canViewEditHistory: boolean;        // See edit history and changes
  canUndoRedoCollaborative: boolean;  // Use undo/redo in collaborative mode
  canResolveConflicts: boolean;       // Resolve editing conflicts
  canLockResources: boolean;          // Lock resources for exclusive editing
  canViewEditIndicators: boolean;     // See who's editing what

  // ========== ACTIVITY STREAMS ==========
  canViewActivityStream: boolean;     // Access activity feeds
  canContributeToActivity: boolean;   // Generate activity items
  canFilterActivity: boolean;         // Use activity filters and search
  canExportActivity: boolean;         // Export activity data
  canReceiveActivityNotifications: boolean; // Get activity notifications
  canViewDetailedActivity: boolean;   // See comprehensive activity details
  canModerateActivity: boolean;       // Moderate/hide inappropriate activity

  // ========== REAL-TIME DISCUSSIONS ==========
  canParticipateInDiscussions: boolean; // Join discussion threads
  canCreateDiscussionThreads: boolean; // Start new discussion threads
  canReplyToDiscussions: boolean;     // Reply to existing threads
  canReactToMessages: boolean;        // Add emoji reactions
  canMentionUsers: boolean;           // Use @mentions in discussions
  canUseHashtags: boolean;           // Use #hashtags for topics
  canEditOwnMessages: boolean;        // Edit own discussion messages
  canDeleteOwnMessages: boolean;      // Delete own discussion messages
  canModerateDiscussions: boolean;    // Moderate discussions (delete others' messages)
  canPinMessages: boolean;            // Pin important messages
  canViewDiscussionHistory: boolean;  // Access discussion history
  canReceiveDiscussionNotifications: boolean; // Get discussion notifications

  // ========== TEAM INSIGHTS & ANALYTICS ==========
  canViewTeamInsights: boolean;       // Access collaboration analytics
  canViewMemberPerformance: boolean;  // See individual member stats
  canViewCollaborationMetrics: boolean; // See collaboration health metrics
  canViewProductivityInsights: boolean; // Access productivity analytics
  canGenerateReports: boolean;        // Generate collaboration reports
  canExportInsights: boolean;         // Export analytics data
  canReceiveInsightNotifications: boolean; // Get AI-generated insights
  canConfigureInsights: boolean;      // Configure insight generation

  // ========== RESOURCE ACCESS ==========
  canAccessSharedWorkspace: boolean;  // Access collaborative workspace
  canJoinCollaborationSessions: boolean; // Join active collaboration sessions
  canCreateCollaborationSessions: boolean; // Start new collaboration sessions
  canInviteToSessions: boolean;       // Invite others to sessions
  canManageSessionSettings: boolean;  // Configure session parameters
  canRecordSessions: boolean;         // Record collaboration sessions
  canViewSessionHistory: boolean;     // Access past session data

  // ========== COMMUNICATION INTEGRATION ==========
  canUseIntegratedChat: boolean;      // Use built-in chat features
  canStartVideoCalls: boolean;        // Initiate video collaboration
  canShareScreen: boolean;            // Share screen during collaboration
  canUseVoiceChat: boolean;          // Use voice communication
  canShareFiles: boolean;            // Share files during collaboration
  canAnnotateSharedContent: boolean; // Add annotations to shared content

  // ========== ADMINISTRATION ==========
  canManageCollaborationSettings: boolean; // Configure collaboration features
  canViewCollaborationAudit: boolean; // Access collaboration audit logs
  canManagePermissions: boolean;      // Modify collaboration permissions
  canBanUsers: boolean;              // Temporarily ban users from collaboration
  canMonitorSessions: boolean;       // Monitor active collaboration sessions
  canConfigureNotifications: boolean; // Set up notification preferences
}

interface Team {
  id: string;
  name: string;
  members: Array<{
    id: string;
    email: string;
    role: string;
    isActive?: boolean;
  }>;
  lead: string;
  isArchived?: boolean;
}

const COLLABORATION_ROLE_PERMISSIONS: Record<TeamRole, CollaborationPermissions> = {
  owner: {
    // Full collaboration permissions for workspace owners
    canShowCursor: true,
    canSeeCursors: true,
    canUsePresenceIndicators: true,
    canSetPresenceStatus: true,
    canViewPresenceDetails: true,
    canReceivePresenceNotifications: true,
    canCollaborativeEdit: true,
    canEditTasks: true,
    canEditProjects: true,
    canEditDocuments: true,
    canViewEditHistory: true,
    canUndoRedoCollaborative: true,
    canResolveConflicts: true,
    canLockResources: true,
    canViewEditIndicators: true,
    canViewActivityStream: true,
    canContributeToActivity: true,
    canFilterActivity: true,
    canExportActivity: true,
    canReceiveActivityNotifications: true,
    canViewDetailedActivity: true,
    canModerateActivity: true,
    canParticipateInDiscussions: true,
    canCreateDiscussionThreads: true,
    canReplyToDiscussions: true,
    canReactToMessages: true,
    canMentionUsers: true,
    canUseHashtags: true,
    canEditOwnMessages: true,
    canDeleteOwnMessages: true,
    canModerateDiscussions: true,
    canPinMessages: true,
    canViewDiscussionHistory: true,
    canReceiveDiscussionNotifications: true,
    canViewTeamInsights: true,
    canViewMemberPerformance: true,
    canViewCollaborationMetrics: true,
    canViewProductivityInsights: true,
    canGenerateReports: true,
    canExportInsights: true,
    canReceiveInsightNotifications: true,
    canConfigureInsights: true,
    canAccessSharedWorkspace: true,
    canJoinCollaborationSessions: true,
    canCreateCollaborationSessions: true,
    canInviteToSessions: true,
    canManageSessionSettings: true,
    canRecordSessions: true,
    canViewSessionHistory: true,
    canUseIntegratedChat: true,
    canStartVideoCalls: true,
    canShareScreen: true,
    canUseVoiceChat: true,
    canShareFiles: true,
    canAnnotateSharedContent: true,
    canManageCollaborationSettings: true,
    canViewCollaborationAudit: true,
    canManagePermissions: true,
    canBanUsers: true,
    canMonitorSessions: true,
    canConfigureNotifications: true,
  },
  admin: {
    // Administrative collaboration permissions
    canShowCursor: true,
    canSeeCursors: true,
    canUsePresenceIndicators: true,
    canSetPresenceStatus: true,
    canViewPresenceDetails: true,
    canReceivePresenceNotifications: true,
    canCollaborativeEdit: true,
    canEditTasks: true,
    canEditProjects: true,
    canEditDocuments: true,
    canViewEditHistory: true,
    canUndoRedoCollaborative: true,
    canResolveConflicts: true,
    canLockResources: true,
    canViewEditIndicators: true,
    canViewActivityStream: true,
    canContributeToActivity: true,
    canFilterActivity: true,
    canExportActivity: true,
    canReceiveActivityNotifications: true,
    canViewDetailedActivity: true,
    canModerateActivity: true,
    canParticipateInDiscussions: true,
    canCreateDiscussionThreads: true,
    canReplyToDiscussions: true,
    canReactToMessages: true,
    canMentionUsers: true,
    canUseHashtags: true,
    canEditOwnMessages: true,
    canDeleteOwnMessages: true,
    canModerateDiscussions: true,
    canPinMessages: true,
    canViewDiscussionHistory: true,
    canReceiveDiscussionNotifications: true,
    canViewTeamInsights: true,
    canViewMemberPerformance: true,
    canViewCollaborationMetrics: true,
    canViewProductivityInsights: true,
    canGenerateReports: true,
    canExportInsights: true,
    canReceiveInsightNotifications: true,
    canConfigureInsights: false,        // Cannot configure insights
    canAccessSharedWorkspace: true,
    canJoinCollaborationSessions: true,
    canCreateCollaborationSessions: true,
    canInviteToSessions: true,
    canManageSessionSettings: true,
    canRecordSessions: true,
    canViewSessionHistory: true,
    canUseIntegratedChat: true,
    canStartVideoCalls: true,
    canShareScreen: true,
    canUseVoiceChat: true,
    canShareFiles: true,
    canAnnotateSharedContent: true,
    canManageCollaborationSettings: false, // Cannot manage global settings
    canViewCollaborationAudit: true,
    canManagePermissions: false,        // Cannot manage permissions
    canBanUsers: true,
    canMonitorSessions: true,
    canConfigureNotifications: true,
  },
  "team-lead": {
    // Team leadership collaboration permissions
    canShowCursor: true,
    canSeeCursors: true,
    canUsePresenceIndicators: true,
    canSetPresenceStatus: true,
    canViewPresenceDetails: true,
    canReceivePresenceNotifications: true,
    canCollaborativeEdit: true,
    canEditTasks: true,
    canEditProjects: true,
    canEditDocuments: true,
    canViewEditHistory: true,
    canUndoRedoCollaborative: true,
    canResolveConflicts: true,
    canLockResources: true,
    canViewEditIndicators: true,
    canViewActivityStream: true,
    canContributeToActivity: true,
    canFilterActivity: true,
    canExportActivity: true,
    canReceiveActivityNotifications: true,
    canViewDetailedActivity: true,
    canModerateActivity: false,         // Cannot moderate activity
    canParticipateInDiscussions: true,
    canCreateDiscussionThreads: true,
    canReplyToDiscussions: true,
    canReactToMessages: true,
    canMentionUsers: true,
    canUseHashtags: true,
    canEditOwnMessages: true,
    canDeleteOwnMessages: true,
    canModerateDiscussions: false,      // Cannot moderate discussions
    canPinMessages: true,
    canViewDiscussionHistory: true,
    canReceiveDiscussionNotifications: true,
    canViewTeamInsights: true,
    canViewMemberPerformance: true,
    canViewCollaborationMetrics: true,
    canViewProductivityInsights: true,
    canGenerateReports: true,
    canExportInsights: true,
    canReceiveInsightNotifications: true,
    canConfigureInsights: false,
    canAccessSharedWorkspace: true,
    canJoinCollaborationSessions: true,
    canCreateCollaborationSessions: true,
    canInviteToSessions: true,
    canManageSessionSettings: true,
    canRecordSessions: false,           // Cannot record sessions
    canViewSessionHistory: true,
    canUseIntegratedChat: true,
    canStartVideoCalls: true,
    canShareScreen: true,
    canUseVoiceChat: true,
    canShareFiles: true,
    canAnnotateSharedContent: true,
    canManageCollaborationSettings: false,
    canViewCollaborationAudit: false,   // Cannot view audit logs
    canManagePermissions: false,
    canBanUsers: false,                 // Cannot ban users
    canMonitorSessions: false,          // Cannot monitor sessions
    canConfigureNotifications: true,
  },
  senior: {
    // Senior member collaboration permissions
    canShowCursor: true,
    canSeeCursors: true,
    canUsePresenceIndicators: true,
    canSetPresenceStatus: true,
    canViewPresenceDetails: true,
    canReceivePresenceNotifications: true,
    canCollaborativeEdit: true,
    canEditTasks: true,
    canEditProjects: true,
    canEditDocuments: true,
    canViewEditHistory: true,
    canUndoRedoCollaborative: true,
    canResolveConflicts: true,
    canLockResources: false,            // Cannot lock resources
    canViewEditIndicators: true,
    canViewActivityStream: true,
    canContributeToActivity: true,
    canFilterActivity: true,
    canExportActivity: true,
    canReceiveActivityNotifications: true,
    canViewDetailedActivity: true,
    canModerateActivity: false,
    canParticipateInDiscussions: true,
    canCreateDiscussionThreads: true,
    canReplyToDiscussions: true,
    canReactToMessages: true,
    canMentionUsers: true,
    canUseHashtags: true,
    canEditOwnMessages: true,
    canDeleteOwnMessages: true,
    canModerateDiscussions: false,
    canPinMessages: false,              // Cannot pin messages
    canViewDiscussionHistory: true,
    canReceiveDiscussionNotifications: true,
    canViewTeamInsights: true,
    canViewMemberPerformance: false,    // Cannot view member performance
    canViewCollaborationMetrics: true,
    canViewProductivityInsights: true,
    canGenerateReports: true,
    canExportInsights: false,           // Cannot export insights
    canReceiveInsightNotifications: true,
    canConfigureInsights: false,
    canAccessSharedWorkspace: true,
    canJoinCollaborationSessions: true,
    canCreateCollaborationSessions: true,
    canInviteToSessions: true,
    canManageSessionSettings: false,    // Cannot manage session settings
    canRecordSessions: false,
    canViewSessionHistory: true,
    canUseIntegratedChat: true,
    canStartVideoCalls: true,
    canShareScreen: true,
    canUseVoiceChat: true,
    canShareFiles: true,
    canAnnotateSharedContent: true,
    canManageCollaborationSettings: false,
    canViewCollaborationAudit: false,
    canManagePermissions: false,
    canBanUsers: false,
    canMonitorSessions: false,
    canConfigureNotifications: true,
  },
  member: {
    // Standard member collaboration permissions
    canShowCursor: true,
    canSeeCursors: true,
    canUsePresenceIndicators: true,
    canSetPresenceStatus: true,
    canViewPresenceDetails: true,
    canReceivePresenceNotifications: true,
    canCollaborativeEdit: true,
    canEditTasks: true,
    canEditProjects: false,             // Cannot edit projects
    canEditDocuments: true,
    canViewEditHistory: true,
    canUndoRedoCollaborative: true,
    canResolveConflicts: false,         // Cannot resolve conflicts
    canLockResources: false,
    canViewEditIndicators: true,
    canViewActivityStream: true,
    canContributeToActivity: true,
    canFilterActivity: true,
    canExportActivity: false,           // Cannot export activity
    canReceiveActivityNotifications: true,
    canViewDetailedActivity: false,     // Cannot view detailed activity
    canModerateActivity: false,
    canParticipateInDiscussions: true,
    canCreateDiscussionThreads: true,
    canReplyToDiscussions: true,
    canReactToMessages: true,
    canMentionUsers: true,
    canUseHashtags: true,
    canEditOwnMessages: true,
    canDeleteOwnMessages: true,
    canModerateDiscussions: false,
    canPinMessages: false,
    canViewDiscussionHistory: true,
    canReceiveDiscussionNotifications: true,
    canViewTeamInsights: false,         // Cannot view team insights
    canViewMemberPerformance: false,
    canViewCollaborationMetrics: false, // Cannot view collaboration metrics
    canViewProductivityInsights: false, // Cannot view productivity insights
    canGenerateReports: false,          // Cannot generate reports
    canExportInsights: false,
    canReceiveInsightNotifications: true,
    canConfigureInsights: false,
    canAccessSharedWorkspace: true,
    canJoinCollaborationSessions: true,
    canCreateCollaborationSessions: false, // Cannot create sessions
    canInviteToSessions: false,         // Cannot invite to sessions
    canManageSessionSettings: false,
    canRecordSessions: false,
    canViewSessionHistory: false,       // Cannot view session history
    canUseIntegratedChat: true,
    canStartVideoCalls: false,          // Cannot start video calls
    canShareScreen: true,
    canUseVoiceChat: true,
    canShareFiles: true,
    canAnnotateSharedContent: true,
    canManageCollaborationSettings: false,
    canViewCollaborationAudit: false,
    canManagePermissions: false,
    canBanUsers: false,
    canMonitorSessions: false,
    canConfigureNotifications: true,
  },
  viewer: {
    // Read-only collaboration permissions
    canShowCursor: false,               // Cannot show cursor
    canSeeCursors: true,
    canUsePresenceIndicators: true,
    canSetPresenceStatus: true,
    canViewPresenceDetails: false,      // Cannot view presence details
    canReceivePresenceNotifications: true,
    canCollaborativeEdit: false,        // Cannot collaborate in editing
    canEditTasks: false,
    canEditProjects: false,
    canEditDocuments: false,
    canViewEditHistory: true,
    canUndoRedoCollaborative: false,
    canResolveConflicts: false,
    canLockResources: false,
    canViewEditIndicators: true,
    canViewActivityStream: true,
    canContributeToActivity: false,     // Cannot contribute to activity
    canFilterActivity: true,
    canExportActivity: false,
    canReceiveActivityNotifications: true,
    canViewDetailedActivity: false,
    canModerateActivity: false,
    canParticipateInDiscussions: false, // Cannot participate in discussions
    canCreateDiscussionThreads: false,
    canReplyToDiscussions: false,
    canReactToMessages: false,          // Cannot react to messages
    canMentionUsers: false,
    canUseHashtags: false,
    canEditOwnMessages: false,
    canDeleteOwnMessages: false,
    canModerateDiscussions: false,
    canPinMessages: false,
    canViewDiscussionHistory: true,
    canReceiveDiscussionNotifications: false, // No discussion notifications
    canViewTeamInsights: false,
    canViewMemberPerformance: false,
    canViewCollaborationMetrics: false,
    canViewProductivityInsights: false,
    canGenerateReports: false,
    canExportInsights: false,
    canReceiveInsightNotifications: false, // No insight notifications
    canConfigureInsights: false,
    canAccessSharedWorkspace: true,
    canJoinCollaborationSessions: false, // Cannot join sessions
    canCreateCollaborationSessions: false,
    canInviteToSessions: false,
    canManageSessionSettings: false,
    canRecordSessions: false,
    canViewSessionHistory: false,
    canUseIntegratedChat: false,        // Cannot use chat
    canStartVideoCalls: false,
    canShareScreen: false,
    canUseVoiceChat: false,
    canShareFiles: false,
    canAnnotateSharedContent: false,    // Cannot annotate
    canManageCollaborationSettings: false,
    canViewCollaborationAudit: false,
    canManagePermissions: false,
    canBanUsers: false,
    canMonitorSessions: false,
    canConfigureNotifications: true,
  },
  guest: {
    // Minimal collaboration permissions for external users
    canShowCursor: false,
    canSeeCursors: false,               // Cannot see cursors
    canUsePresenceIndicators: false,    // Cannot use presence
    canSetPresenceStatus: false,
    canViewPresenceDetails: false,
    canReceivePresenceNotifications: false,
    canCollaborativeEdit: false,
    canEditTasks: false,
    canEditProjects: false,
    canEditDocuments: false,
    canViewEditHistory: false,          // Cannot view edit history
    canUndoRedoCollaborative: false,
    canResolveConflicts: false,
    canLockResources: false,
    canViewEditIndicators: false,       // Cannot see edit indicators
    canViewActivityStream: false,       // Cannot view activity
    canContributeToActivity: false,
    canFilterActivity: false,
    canExportActivity: false,
    canReceiveActivityNotifications: false,
    canViewDetailedActivity: false,
    canModerateActivity: false,
    canParticipateInDiscussions: false,
    canCreateDiscussionThreads: false,
    canReplyToDiscussions: false,
    canReactToMessages: false,
    canMentionUsers: false,
    canUseHashtags: false,
    canEditOwnMessages: false,
    canDeleteOwnMessages: false,
    canModerateDiscussions: false,
    canPinMessages: false,
    canViewDiscussionHistory: false,    // Cannot view discussions
    canReceiveDiscussionNotifications: false,
    canViewTeamInsights: false,
    canViewMemberPerformance: false,
    canViewCollaborationMetrics: false,
    canViewProductivityInsights: false,
    canGenerateReports: false,
    canExportInsights: false,
    canReceiveInsightNotifications: false,
    canConfigureInsights: false,
    canAccessSharedWorkspace: false,    // Cannot access workspace
    canJoinCollaborationSessions: false,
    canCreateCollaborationSessions: false,
    canInviteToSessions: false,
    canManageSessionSettings: false,
    canRecordSessions: false,
    canViewSessionHistory: false,
    canUseIntegratedChat: false,
    canStartVideoCalls: false,
    canShareScreen: false,
    canUseVoiceChat: false,
    canShareFiles: false,
    canAnnotateSharedContent: false,
    canManageCollaborationSettings: false,
    canViewCollaborationAudit: false,
    canManagePermissions: false,
    canBanUsers: false,
    canMonitorSessions: false,
    canConfigureNotifications: false,
  },
};

export function useCollaborationPermissions(team?: Team | null) {
  const { user } = useAuth();
  const { userRole, permissions: teamPermissions, isWorkspaceOwner } = useTeamPermissions(team);

  const collaborationPermissions = useMemo(() => {
    return COLLABORATION_ROLE_PERMISSIONS[userRole];
  }, [userRole]);

  // Check if user can perform a specific collaboration action
  const canPerformCollaborationAction = useMemo(() => {
    return (action: keyof CollaborationPermissions) => {
      // Always allow workspace owners
      if (isWorkspaceOwner) return true;

      // Check collaboration-specific permission
      return collaborationPermissions[action];
    };
  }, [collaborationPermissions, isWorkspaceOwner]);

  // Check if user can collaborate on a specific resource type
  const canCollaborateOnResource = useMemo(() => {
    return (resourceType: 'task' | 'project' | 'document' | 'discussion') => {
      switch (resourceType) {
        case 'task':
          return collaborationPermissions.canEditTasks && teamPermissions.canEditTasks;
        case 'project':
          return collaborationPermissions.canEditProjects && teamPermissions.canEditProjects;
        case 'document':
          return collaborationPermissions.canEditDocuments && teamPermissions.canShareFiles;
        case 'discussion':
          return collaborationPermissions.canParticipateInDiscussions && teamPermissions.canSendMessages;
        default:
          return false;
      }
    };
  }, [collaborationPermissions, teamPermissions]);

  // Get notification preferences based on permissions
  const getNotificationPermissions = useMemo(() => {
    return {
      presence: collaborationPermissions.canReceivePresenceNotifications,
      activity: collaborationPermissions.canReceiveActivityNotifications,
      discussions: collaborationPermissions.canReceiveDiscussionNotifications,
      insights: collaborationPermissions.canReceiveInsightNotifications,
    };
  }, [collaborationPermissions]);

  // Check if user should see collaboration features
  const shouldShowCollaborationFeatures = useMemo(() => {
    return {
      liveCursors: collaborationPermissions.canSeeCursors || collaborationPermissions.canShowCursor,
      presenceIndicators: collaborationPermissions.canUsePresenceIndicators,
      activityStream: collaborationPermissions.canViewActivityStream,
      discussions: collaborationPermissions.canParticipateInDiscussions || collaborationPermissions.canViewDiscussionHistory,
      teamInsights: collaborationPermissions.canViewTeamInsights,
      collaborativeEditing: collaborationPermissions.canCollaborativeEdit,
    };
  }, [collaborationPermissions]);

  return {
    userRole,
    teamPermissions,
    collaborationPermissions,
    canPerformCollaborationAction,
    canCollaborateOnResource,
    getNotificationPermissions,
    shouldShowCollaborationFeatures,
    isWorkspaceOwner,
  };
}

// Export types for use in components
export type { CollaborationPermissions, TeamRole };