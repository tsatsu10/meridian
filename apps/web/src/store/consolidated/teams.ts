// Consolidated Teams Store
// Combines teamSlice.ts, unified-team-store.ts, and useTeam.ts patterns
// into a single Zustand store with persistence for all team management, member management, and analytics

import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { API_BASE_URL } from "../../constants/urls";

// Core team types
export interface Team {
  id: string;
  name: string;
  description?: string;
  workspaceId: string;
  avatar?: string;
  type: 'development' | 'design' | 'marketing' | 'sales' | 'support' | 'custom';
  visibility: 'public' | 'private' | 'restricted';
  settings: {
    allowSelfJoin: boolean;
    requireApproval: boolean;
    defaultRole: 'member' | 'contributor';
    autoAssignTasks: boolean;
    notificationLevel: 'all' | 'mentions' | 'none';
  };
  metrics: {
    totalMembers: number;
    activeMembers: number;
    completedTasks: number;
    openTasks: number;
    avgTaskCompletion: number;
    productivity: number;
  };
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  ownerId: string;
  isArchived?: boolean;
  status: 'active' | 'inactive' | 'archived';
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: 'owner' | 'lead' | 'member' | 'contributor';
  permissions: string[];
  joinedAt: string;
  lastActiveAt: string;
  addedBy: string;
  status: 'active' | 'inactive' | 'pending';
  workload: {
    capacity: number; // hours per week
    currentHours: number;
    utilization: number; // percentage
  };
  skills: Array<{
    name: string;
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    verified: boolean;
  }>;
  user: {
    id: string;
    email: string;
    displayName: string;
    avatar?: string;
    timezone: string;
    status: 'online' | 'away' | 'busy' | 'offline';
  };
  teamMemberships: Array<{
    teamId: string;
    role: TeamMember['role'];
    joinedAt: string;
  }>;
}

export interface TeamChannel {
  id: string;
  teamId: string;
  name: string;
  description?: string;
  type: 'text' | 'voice' | 'video' | 'announcement';
  isPrivate: boolean;
  members: string[];
  lastMessageAt?: string;
  unreadCount: number;
  createdAt: string;
  createdBy: string;
}

export interface TeamProject {
  id: string;
  name: string;
  status: 'planning' | 'active' | 'completed' | 'on-hold';
  progress: number;
  dueDate?: string;
  teamRole: 'primary' | 'supporting' | 'consulting';
  assignedMembers: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface TeamMeeting {
  id: string;
  title: string;
  type: 'standup' | 'planning' | 'retrospective' | 'review' | 'general';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  startTime: string;
  endTime: string;
  location?: string;
  meetingUrl?: string;
  agenda?: string;
  attendees: Array<{
    userId: string;
    response: 'yes' | 'no' | 'maybe' | 'pending';
    required: boolean;
  }>;
  notes?: string;
  recordings?: Array<{
    id: string;
    url: string;
    duration: number;
  }>;
  createdBy: string;
}

export interface TeamActivity {
  id: string;
  type: 'member_joined' | 'member_left' | 'role_changed' | 'project_assigned' | 'task_completed' | 'meeting_scheduled' | 'channel_created';
  title: string;
  description: string;
  userId: string;
  teamId: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface TeamAnalytics {
  productivity: {
    current: number;
    previous: number;
    trend: 'up' | 'down' | 'stable';
  };
  completion: {
    thisWeek: number;
    lastWeek: number;
    thisMonth: number;
  };
  velocity: {
    current: number;
    average: number;
    trend: 'up' | 'down' | 'stable';
  };
  workload: {
    totalCapacity: number;
    totalUtilization: number;
    averageUtilization: number;
    overloadedMembers: number;
  };
  collaboration: {
    activeChannels: number;
    messagesSent: number;
    meetingsHeld: number;
    projectsActive: number;
  };
  skill: {
    distribution: Record<string, number>;
    gaps: string[];
    strengths: string[];
  };
}

export interface WorkspaceStats {
  totalTeams: number;
  totalMembers: number;
  activeTeams: number;
  activeMembers: number;
  totalProjects: number;
  completedTasks: number;
  averageProductivity: number;
  teamsByType: Record<Team['type'], number>;
}

// Filter and view types
export interface TeamFilter {
  type?: Team['type'] | 'all';
  status?: Team['status'] | 'all';
  visibility?: Team['visibility'] | 'all';
  tags?: string[];
  memberCount?: { min?: number; max?: number };
  productivity?: { min?: number; max?: number };
}

export interface MemberFilter {
  role?: TeamMember['role'] | 'all';
  status?: TeamMember['status'] | 'all';
  skills?: string[];
  utilization?: { min?: number; max?: number };
  teams?: string[];
}

export type TeamViewMode = 'grid' | 'list' | 'kanban' | 'analytics';
export type SortOption = 'name' | 'created' | 'updated' | 'members' | 'activity' | 'productivity';
export type SortOrder = 'asc' | 'desc';

// Action types
export type MemberAction = 'promote' | 'demote' | 'remove' | 'deactivate' | 'activate' | 'resend_invite';
export type TeamAction = 'archive' | 'unarchive' | 'delete' | 'transfer_ownership' | 'duplicate';

// Settings interface
export interface TeamSettings {
  workspaceId: string;
  defaultTeamType: Team['type'];
  defaultVisibility: Team['visibility'];
  requireApprovalForJoin: boolean;
  allowGuestAccess: boolean;
  maxMembersPerTeam: number;
  autoArchiveInactiveTeams: boolean;
  inactivityThresholdDays: number;
  defaultNotificationLevel: Team['settings']['notificationLevel'];
  skillsEnabled: boolean;
  workloadTrackingEnabled: boolean;
  analyticsEnabled: boolean;
}

// State interface
export interface ConsolidatedTeamsState {
  // Core Data
  teams: Team[];
  members: TeamMember[];
  channels: TeamChannel[];
  projects: TeamProject[];
  meetings: TeamMeeting[];
  activities: TeamActivity[];
  
  // Analytics and Stats
  analytics: Record<string, TeamAnalytics>; // teamId -> analytics
  workspaceStats: WorkspaceStats | null;
  
  // Settings
  teamSettings: TeamSettings | null;
  
  // Current Selection
  currentWorkspaceId: string | null;
  activeTeam: Team | null;
  selectedTeamId: string | null;
  selectedMemberId: string | null;
  selectedChannelId: string | null;
  selectedProjectId: string | null;
  selectedMeetingId: string | null;
  
  // View and Filter State
  viewMode: TeamViewMode;
  teamFilter: TeamFilter;
  memberFilter: MemberFilter;
  sortBy: SortOption;
  sortOrder: SortOrder;
  searchQuery: string;
  
  // UI State
  showCreateTeamModal: boolean;
  showEditTeamModal: boolean;
  showInviteMemberModal: boolean;
  showTeamSettingsModal: boolean;
  showMeetingModal: boolean;
  showChannelModal: boolean;
  showInactiveMembers: boolean;
  
  // Real-time State
  onlineMembers: Record<string, {
    userId: string;
    status: 'online' | 'away' | 'busy' | 'offline';
    lastSeen: string;
  }>;
  currentMeetings: TeamMeeting[];
  memberPresence: Record<string, {
    isTyping: boolean;
    currentChannel?: string;
    lastActivity: string;
  }>;
  
  // Loading States
  loading: {
    teams: boolean;
    team: boolean;
    members: boolean;
    channels: boolean;
    projects: boolean;
    meetings: boolean;
    activities: boolean;
    analytics: boolean;
    stats: boolean;
    settings: boolean;
    creating: boolean;
    updating: boolean;
    deleting: boolean;
  };
  
  // Error States
  errors: {
    teams: string | null;
    team: string | null;
    members: string | null;
    channels: string | null;
    projects: string | null;
    meetings: string | null;
    activities: string | null;
    analytics: string | null;
    stats: string | null;
    settings: string | null;
  };
  
  lastUpdated: string | null;
}

// Store interface with actions
export interface ConsolidatedTeamsStore extends ConsolidatedTeamsState {
  // Core Team Management
  loadTeams: (workspaceId?: string, force?: boolean) => Promise<void>;
  loadTeam: (teamId: string) => Promise<Team | null>;
  createTeam: (teamData: Partial<Team>) => Promise<Team | null>;
  updateTeam: (teamId: string, updates: Partial<Team>) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;
  archiveTeam: (teamId: string) => Promise<void>;
  unarchiveTeam: (teamId: string) => Promise<void>;
  duplicateTeam: (teamId: string, newName: string) => Promise<Team | null>;
  transferOwnership: (teamId: string, newOwnerId: string) => Promise<void>;
  
  // Member Management
  loadMembers: (teamId?: string, workspaceId?: string) => Promise<void>;
  inviteMember: (email: string, role: TeamMember['role'], teamIds?: string[]) => Promise<TeamMember | null>;
  addMemberToTeam: (memberId: string, teamId: string, role?: TeamMember['role']) => Promise<void>;
  removeMemberFromTeam: (memberId: string, teamId: string) => Promise<void>;
  updateMemberRole: (memberId: string, teamId: string, newRole: TeamMember['role']) => Promise<void>;
  updateMemberStatus: (memberId: string, status: TeamMember['status']) => Promise<void>;
  updateMemberSkills: (memberId: string, skills: TeamMember['skills']) => Promise<void>;
  updateMemberWorkload: (memberId: string, workload: TeamMember['workload']) => Promise<void>;
  resendInvite: (email: string) => Promise<void>;
  
  // Channel Management
  loadChannels: (teamId: string) => Promise<void>;
  createChannel: (teamId: string, channelData: Partial<TeamChannel>) => Promise<TeamChannel | null>;
  updateChannel: (channelId: string, updates: Partial<TeamChannel>) => Promise<void>;
  deleteChannel: (channelId: string) => Promise<void>;
  joinChannel: (channelId: string, userId: string) => Promise<void>;
  leaveChannel: (channelId: string, userId: string) => Promise<void>;
  
  // Project Management
  loadProjects: (teamId: string) => Promise<void>;
  assignProjectToTeam: (projectId: string, teamId: string, role: TeamProject['teamRole']) => Promise<void>;
  removeProjectFromTeam: (projectId: string, teamId: string) => Promise<void>;
  updateProjectTeamRole: (projectId: string, teamId: string, role: TeamProject['teamRole']) => Promise<void>;
  
  // Meeting Management
  loadMeetings: (teamId: string) => Promise<void>;
  scheduleMeeting: (teamId: string, meetingData: Partial<TeamMeeting>) => Promise<TeamMeeting | null>;
  updateMeeting: (meetingId: string, updates: Partial<TeamMeeting>) => Promise<void>;
  cancelMeeting: (meetingId: string) => Promise<void>;
  respondToMeeting: (meetingId: string, response: 'yes' | 'no' | 'maybe') => Promise<void>;
  addMeetingNotes: (meetingId: string, notes: string) => Promise<void>;
  
  // Activity Management
  loadActivities: (teamId?: string) => Promise<void>;
  addActivity: (activity: Omit<TeamActivity, 'id' | 'timestamp'>) => void;
  
  // Analytics
  loadAnalytics: (teamId: string, period?: 'week' | 'month' | 'quarter') => Promise<void>;
  loadWorkspaceStats: (workspaceId?: string) => Promise<void>;
  generateTeamReport: (teamId: string, type: 'productivity' | 'workload' | 'skills') => Promise<any>;
  
  // Settings Management
  loadTeamSettings: (workspaceId?: string) => Promise<void>;
  updateTeamSettings: (updates: Partial<TeamSettings>) => Promise<void>;
  
  // Selection and Navigation
  setWorkspaceId: (workspaceId: string) => void;
  setActiveTeam: (teamId: string | null) => void;
  setSelectedTeam: (teamId: string | null) => void;
  setSelectedMember: (memberId: string | null) => void;
  setSelectedChannel: (channelId: string | null) => void;
  setSelectedProject: (projectId: string | null) => void;
  setSelectedMeeting: (meetingId: string | null) => void;
  
  // View and Filter Management
  setViewMode: (mode: TeamViewMode) => void;
  setTeamFilter: (filter: Partial<TeamFilter>) => void;
  setMemberFilter: (filter: Partial<MemberFilter>) => void;
  setSortBy: (sortBy: SortOption) => void;
  setSortOrder: (order: SortOrder) => void;
  setSearchQuery: (query: string) => void;
  clearFilters: () => void;
  
  // UI State Management
  setShowCreateTeamModal: (show: boolean) => void;
  setShowEditTeamModal: (show: boolean) => void;
  setShowInviteMemberModal: (show: boolean) => void;
  setShowTeamSettingsModal: (show: boolean) => void;
  setShowMeetingModal: (show: boolean) => void;
  setShowChannelModal: (show: boolean) => void;
  setShowInactiveMembers: (show: boolean) => void;
  
  // Real-time Management
  updateMemberPresence: (userId: string, presence: ConsolidatedTeamsState['memberPresence'][string]) => void;
  updateOnlineMembers: (members: ConsolidatedTeamsState['onlineMembers']) => void;
  setMemberTyping: (userId: string, channelId: string, isTyping: boolean) => void;
  
  // Bulk Actions
  performMemberAction: (action: MemberAction, memberIds: string[], data?: any) => Promise<void>;
  performTeamAction: (action: TeamAction, teamIds: string[], data?: any) => Promise<void>;
  bulkInviteMembers: (invites: Array<{ email: string; role: TeamMember['role']; teamIds: string[] }>) => Promise<void>;
  
  // Utility Functions
  getTeamById: (teamId: string) => Team | null;
  getMemberById: (memberId: string) => TeamMember | null;
  getChannelById: (channelId: string) => TeamChannel | null;
  getProjectById: (projectId: string) => TeamProject | null;
  getMeetingById: (meetingId: string) => TeamMeeting | null;
  getTeamMembers: (teamId: string) => TeamMember[];
  getMemberTeams: (memberId: string) => Team[];
  getTeamChannels: (teamId: string) => TeamChannel[];
  getTeamProjects: (teamId: string) => TeamProject[];
  getTeamMeetings: (teamId: string) => TeamMeeting[];
  getFilteredTeams: () => Team[];
  getFilteredMembers: () => TeamMember[];
  getMembersByRole: (role: TeamMember['role']) => TeamMember[];
  getTeamsByType: (type: Team['type']) => Team[];
  
  // Data Refresh
  refreshAll: (workspaceId?: string) => Promise<void>;
  refreshTeam: (teamId: string) => Promise<void>;
  refreshMember: (memberId: string) => Promise<void>;
  
  // Error Management
  setError: (key: keyof ConsolidatedTeamsState['errors'], value: string | null) => void;
  clearErrors: () => void;
  clearError: (key: keyof ConsolidatedTeamsState['errors']) => void;
  
  // Loading Management
  setLoading: (key: keyof ConsolidatedTeamsState['loading'], value: boolean) => void;
  
  // Cleanup
  reset: () => void;
  cleanup: () => void;
}

// Default configurations
const defaultTeamSettings: TeamSettings = {
  workspaceId: '',
  defaultTeamType: 'custom',
  defaultVisibility: 'public',
  requireApprovalForJoin: false,
  allowGuestAccess: false,
  maxMembersPerTeam: 100,
  autoArchiveInactiveTeams: false,
  inactivityThresholdDays: 90,
  defaultNotificationLevel: 'mentions',
  skillsEnabled: true,
  workloadTrackingEnabled: true,
  analyticsEnabled: true
};

const defaultTeamFilter: TeamFilter = {
  type: 'all',
  status: 'all',
  visibility: 'all'
};

const defaultMemberFilter: MemberFilter = {
  role: 'all',
  status: 'all'
};

// Initial state
const initialState: ConsolidatedTeamsState = {
  // Core Data
  teams: [],
  members: [],
  channels: [],
  projects: [],
  meetings: [],
  activities: [],
  
  // Analytics and Stats
  analytics: {},
  workspaceStats: null,
  
  // Settings
  teamSettings: null,
  
  // Current Selection
  currentWorkspaceId: null,
  activeTeam: null,
  selectedTeamId: null,
  selectedMemberId: null,
  selectedChannelId: null,
  selectedProjectId: null,
  selectedMeetingId: null,
  
  // View and Filter State
  viewMode: 'grid',
  teamFilter: defaultTeamFilter,
  memberFilter: defaultMemberFilter,
  sortBy: 'name',
  sortOrder: 'asc',
  searchQuery: '',
  
  // UI State
  showCreateTeamModal: false,
  showEditTeamModal: false,
  showInviteMemberModal: false,
  showTeamSettingsModal: false,
  showMeetingModal: false,
  showChannelModal: false,
  showInactiveMembers: false,
  
  // Real-time State
  onlineMembers: {},
  currentMeetings: [],
  memberPresence: {},
  
  // Loading States
  loading: {
    teams: false,
    team: false,
    members: false,
    channels: false,
    projects: false,
    meetings: false,
    activities: false,
    analytics: false,
    stats: false,
    settings: false,
    creating: false,
    updating: false,
    deleting: false
  },
  
  // Error States
  errors: {
    teams: null,
    team: null,
    members: null,
    channels: null,
    projects: null,
    meetings: null,
    activities: null,
    analytics: null,
    stats: null,
    settings: null
  },
  
  lastUpdated: null
};

export const useConsolidatedTeamsStore = create<ConsolidatedTeamsStore>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          ...initialState,

          // Core Team Management
          loadTeams: async (workspaceId?: string, force = false) => {
            const currentWorkspaceId = workspaceId || get().currentWorkspaceId;
            if (!currentWorkspaceId) return;

            // Skip if already loaded and not forced
            if (!force && get().teams.length > 0 && get().currentWorkspaceId === currentWorkspaceId) {
              return;
            }

            set((state) => {
              state.loading.teams = true;
              state.errors.teams = null;
            });

            try {
              const response = await fetch(`${API_BASE_URL}/workspaces/${currentWorkspaceId}/teams`, {});

              if (!response.ok) {
                throw new Error('Failed to load teams');
              }

              const data = await response.json();

              set((state) => {
                state.loading.teams = false;
                state.teams = data.teams || [];
                state.currentWorkspaceId = currentWorkspaceId;
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.loading.teams = false;
                state.errors.teams = error instanceof Error ? error.message : 'Failed to load teams';
              });
            }
          },

          loadTeam: async (teamId: string) => {
            set((state) => {
              state.loading.team = true;
              state.errors.team = null;
            });

            try {
              const response = await fetch(`${API_BASE_URL}/teams/${teamId}`, {});

              if (!response.ok) {
                throw new Error('Failed to load team');
              }

              const data = await response.json();

              set((state) => {
                state.loading.team = false;
                
                // Update or add team in the list
                const teamIndex = state.teams.findIndex(t => t.id === teamId);
                if (teamIndex !== -1) {
                  state.teams[teamIndex] = data.team;
                } else {
                  state.teams.push(data.team);
                }
                
                // Set as active team if not already set
                if (!state.activeTeam || state.activeTeam.id !== teamId) {
                  state.activeTeam = data.team;
                  state.selectedTeamId = teamId;
                }
                
                state.lastUpdated = new Date().toISOString();
              });

              return data.team;
            } catch (error) {
              set((state) => {
                state.loading.team = false;
                state.errors.team = error instanceof Error ? error.message : 'Failed to load team';
              });
              return null;
            }
          },

          createTeam: async (teamData: Partial<Team>) => {
            const workspaceId = get().currentWorkspaceId;
            if (!workspaceId) {
              throw new Error('No workspace selected');
            }

            set((state) => {
              state.loading.creating = true;
              state.errors.teams = null;
            });

            try {
              const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/teams`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...teamData, workspaceId })});

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to create team');
              }

              const data = await response.json();

              set((state) => {
                state.loading.creating = false;
                state.teams.unshift(data.team);
                state.lastUpdated = new Date().toISOString();
              });

              // Add activity
              get().addActivity({
                type: 'team_created',
                title: 'Team Created',
                description: `Team "${data.team.name}" was created`,
                userId: 'current-user', // TODO: Get from auth context
                teamId: data.team.id
              });

              return data.team;
            } catch (error) {
              set((state) => {
                state.loading.creating = false;
                state.errors.teams = error instanceof Error ? error.message : 'Failed to create team';
              });
              return null;
            }
          },

          updateTeam: async (teamId: string, updates: Partial<Team>) => {
            set((state) => {
              state.loading.updating = true;
              state.errors.teams = null;
            });

            try {
              const response = await fetch(`${API_BASE_URL}/teams/${teamId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)});

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to update team');
              }

              const data = await response.json();

              set((state) => {
                state.loading.updating = false;
                
                // Update in teams list
                const teamIndex = state.teams.findIndex(t => t.id === teamId);
                if (teamIndex !== -1) {
                  state.teams[teamIndex] = { ...state.teams[teamIndex], ...data.team };
                }
                
                // Update active team if it's the same
                if (state.activeTeam && state.activeTeam.id === teamId) {
                  state.activeTeam = { ...state.activeTeam, ...data.team };
                }
                
                state.lastUpdated = new Date().toISOString();
              });

              // Add activity
              get().addActivity({
                type: 'team_updated',
                title: 'Team Updated',
                description: `Team settings were updated`,
                userId: 'current-user', // TODO: Get from auth context
                teamId
              });
            } catch (error) {
              set((state) => {
                state.loading.updating = false;
                state.errors.teams = error instanceof Error ? error.message : 'Failed to update team';
              });
            }
          },

          deleteTeam: async (teamId: string) => {
            set((state) => {
              state.loading.deleting = true;
              state.errors.teams = null;
            });

            try {
              const response = await fetch(`${API_BASE_URL}/teams/${teamId}`, {
                method: 'DELETE'});

              if (!response.ok) {
                throw new Error('Failed to delete team');
              }

              set((state) => {
                state.loading.deleting = false;
                state.teams = state.teams.filter(t => t.id !== teamId);
                
                // Clear active team if it was deleted
                if (state.activeTeam && state.activeTeam.id === teamId) {
                  state.activeTeam = null;
                  state.selectedTeamId = null;
                }
                
                // Remove related data
                state.members = state.members.filter(m => m.teamId !== teamId);
                state.channels = state.channels.filter(c => c.teamId !== teamId);
                state.meetings = state.meetings.filter(m => 
                  !m.attendees.some(a => state.getTeamMembers(teamId).some(member => member.userId === a.userId))
                );
                delete state.analytics[teamId];
                
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.loading.deleting = false;
                state.errors.teams = error instanceof Error ? error.message : 'Failed to delete team';
              });
            }
          },

          archiveTeam: async (teamId: string) => {
            await get().updateTeam(teamId, { status: 'archived', isArchived: true });
          },

          unarchiveTeam: async (teamId: string) => {
            await get().updateTeam(teamId, { status: 'active', isArchived: false });
          },

          duplicateTeam: async (teamId: string, newName: string) => {
            const originalTeam = get().getTeamById(teamId);
            if (!originalTeam) {
              throw new Error('Team not found');
            }

            const duplicateData: Partial<Team> = {
              ...originalTeam,
              name: newName,
              description: `Copy of ${originalTeam.name}`,
              // Reset metrics and IDs will be generated by server
              metrics: {
                totalMembers: 0,
                activeMembers: 0,
                completedTasks: 0,
                openTasks: 0,
                avgTaskCompletion: 0,
                productivity: 0
              }
            };

            delete (duplicateData as any).id;
            delete (duplicateData as any).createdAt;
            delete (duplicateData as any).updatedAt;

            return await get().createTeam(duplicateData);
          },

          transferOwnership: async (teamId: string, newOwnerId: string) => {
            await get().updateTeam(teamId, { ownerId: newOwnerId });
            
            // Update member roles
            await get().updateMemberRole(newOwnerId, teamId, 'owner');
          },

          // Member Management
          loadMembers: async (teamId?: string, workspaceId?: string) => {
            const endpoint = teamId 
              ? `${API_BASE_URL}/teams/${teamId}/members`
              : `${API_BASE_URL}/workspaces/${workspaceId || get().currentWorkspaceId}/members`;

            set((state) => {
              state.loading.members = true;
              state.errors.members = null;
            });

            try {
              const response = await fetch(endpoint, {});

              if (!response.ok) {
                throw new Error('Failed to load members');
              }

              const data = await response.json();

              set((state) => {
                state.loading.members = false;
                
                if (teamId) {
                  // Replace members for specific team
                  state.members = state.members.filter(m => m.teamId !== teamId);
                  state.members.push(...(data.members || []));
                } else {
                  // Replace all members
                  state.members = data.members || [];
                }
                
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.loading.members = false;
                state.errors.members = error instanceof Error ? error.message : 'Failed to load members';
              });
            }
          },

          inviteMember: async (email: string, role: TeamMember['role'], teamIds?: string[]) => {
            const workspaceId = get().currentWorkspaceId;
            if (!workspaceId) {
              throw new Error('No workspace selected');
            }

            set((state) => {
              state.loading.creating = true;
              state.errors.members = null;
            });

            try {
              const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/invites`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, role, teamIds })});

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to invite member');
              }

              const data = await response.json();

              set((state) => {
                state.loading.creating = false;
                
                if (data.member) {
                  state.members.push(data.member);
                }
                
                state.lastUpdated = new Date().toISOString();
              });

              return data.member || null;
            } catch (error) {
              set((state) => {
                state.loading.creating = false;
                state.errors.members = error instanceof Error ? error.message : 'Failed to invite member';
              });
              return null;
            }
          },

          addMemberToTeam: async (memberId: string, teamId: string, role = 'member' as TeamMember['role']) => {
            set((state) => {
              state.loading.updating = true;
              state.errors.members = null;
            });

            try {
              const response = await fetch(`${API_BASE_URL}/teams/${teamId}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ memberId, role })});

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to add member to team');
              }

              set((state) => {
                state.loading.updating = false;
                
                // Update member's team memberships
                const memberIndex = state.members.findIndex(m => m.id === memberId);
                if (memberIndex !== -1) {
                  const teamMembership = { teamId, role, joinedAt: new Date().toISOString() };
                  if (state.members[memberIndex].teamMemberships) {
                    state.members[memberIndex].teamMemberships.push(teamMembership);
                  } else {
                    state.members[memberIndex].teamMemberships = [teamMembership];
                  }
                }
                
                // Update team metrics
                const teamIndex = state.teams.findIndex(t => t.id === teamId);
                if (teamIndex !== -1) {
                  state.teams[teamIndex].metrics.totalMembers++;
                  state.teams[teamIndex].metrics.activeMembers++;
                }
                
                state.lastUpdated = new Date().toISOString();
              });

              // Add activity
              get().addActivity({
                type: 'member_joined',
                title: 'Member Joined Team',
                description: `A member was added to the team`,
                userId: 'current-user', // TODO: Get from auth context
                teamId
              });
            } catch (error) {
              set((state) => {
                state.loading.updating = false;
                state.errors.members = error instanceof Error ? error.message : 'Failed to add member to team';
              });
            }
          },

          removeMemberFromTeam: async (memberId: string, teamId: string) => {
            set((state) => {
              state.loading.updating = true;
              state.errors.members = null;
            });

            try {
              const response = await fetch(`${API_BASE_URL}/teams/${teamId}/members/${memberId}`, {
                method: 'DELETE'});

              if (!response.ok) {
                throw new Error('Failed to remove member from team');
              }

              set((state) => {
                state.loading.updating = false;
                
                // Update member's team memberships
                const memberIndex = state.members.findIndex(m => m.id === memberId);
                if (memberIndex !== -1 && state.members[memberIndex].teamMemberships) {
                  state.members[memberIndex].teamMemberships = 
                    state.members[memberIndex].teamMemberships.filter(tm => tm.teamId !== teamId);
                }
                
                // Update team metrics
                const teamIndex = state.teams.findIndex(t => t.id === teamId);
                if (teamIndex !== -1) {
                  state.teams[teamIndex].metrics.totalMembers--;
                  state.teams[teamIndex].metrics.activeMembers--;
                }
                
                state.lastUpdated = new Date().toISOString();
              });

              // Add activity
              get().addActivity({
                type: 'member_left',
                title: 'Member Left Team',
                description: `A member was removed from the team`,
                userId: 'current-user', // TODO: Get from auth context
                teamId
              });
            } catch (error) {
              set((state) => {
                state.loading.updating = false;
                state.errors.members = error instanceof Error ? error.message : 'Failed to remove member from team';
              });
            }
          },

          updateMemberRole: async (memberId: string, teamId: string, newRole: TeamMember['role']) => {
            set((state) => {
              state.loading.updating = true;
              state.errors.members = null;
            });

            try {
              const response = await fetch(`${API_BASE_URL}/teams/${teamId}/members/${memberId}/role`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole })});

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to update member role');
              }

              set((state) => {
                state.loading.updating = false;
                
                // Update member's team membership role
                const memberIndex = state.members.findIndex(m => m.id === memberId);
                if (memberIndex !== -1 && state.members[memberIndex].teamMemberships) {
                  const teamMembershipIndex = state.members[memberIndex].teamMemberships
                    .findIndex(tm => tm.teamId === teamId);
                  if (teamMembershipIndex !== -1) {
                    state.members[memberIndex].teamMemberships[teamMembershipIndex].role = newRole;
                  }
                }
                
                // If it's the main team for this member, update the primary role too
                if (state.members[memberIndex] && state.members[memberIndex].teamId === teamId) {
                  state.members[memberIndex].role = newRole;
                }
                
                state.lastUpdated = new Date().toISOString();
              });

              // Add activity
              get().addActivity({
                type: 'role_changed',
                title: 'Member Role Changed',
                description: `Member role was updated to ${newRole}`,
                userId: 'current-user', // TODO: Get from auth context
                teamId
              });
            } catch (error) {
              set((state) => {
                state.loading.updating = false;
                state.errors.members = error instanceof Error ? error.message : 'Failed to update member role';
              });
            }
          },

          updateMemberStatus: async (memberId: string, status: TeamMember['status']) => {
            set((state) => {
              const memberIndex = state.members.findIndex(m => m.id === memberId);
              if (memberIndex !== -1) {
                state.members[memberIndex].status = status;
                state.lastUpdated = new Date().toISOString();
              }
            });

            try {
              const response = await fetch(`${API_BASE_URL}/members/${memberId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })});

              if (!response.ok) {
                throw new Error('Failed to update member status');
              }
            } catch (error) {
              set((state) => {
                state.errors.members = error instanceof Error ? error.message : 'Failed to update member status';
              });
            }
          },

          updateMemberSkills: async (memberId: string, skills: TeamMember['skills']) => {
            set((state) => {
              const memberIndex = state.members.findIndex(m => m.id === memberId);
              if (memberIndex !== -1) {
                state.members[memberIndex].skills = skills;
                state.lastUpdated = new Date().toISOString();
              }
            });

            try {
              const response = await fetch(`${API_BASE_URL}/members/${memberId}/skills`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ skills })});

              if (!response.ok) {
                throw new Error('Failed to update member skills');
              }
            } catch (error) {
              set((state) => {
                state.errors.members = error instanceof Error ? error.message : 'Failed to update member skills';
              });
            }
          },

          updateMemberWorkload: async (memberId: string, workload: TeamMember['workload']) => {
            set((state) => {
              const memberIndex = state.members.findIndex(m => m.id === memberId);
              if (memberIndex !== -1) {
                state.members[memberIndex].workload = workload;
                state.lastUpdated = new Date().toISOString();
              }
            });

            try {
              const response = await fetch(`${API_BASE_URL}/members/${memberId}/workload`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workload })});

              if (!response.ok) {
                throw new Error('Failed to update member workload');
              }
            } catch (error) {
              set((state) => {
                state.errors.members = error instanceof Error ? error.message : 'Failed to update member workload';
              });
            }
          },

          resendInvite: async (email: string) => {
            try {
              const response = await fetch(`${API_BASE_URL}/invites/resend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })});

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to resend invite');
              }
            } catch (error) {
              set((state) => {
                state.errors.members = error instanceof Error ? error.message : 'Failed to resend invite';
              });
            }
          },

          // Channel Management
          loadChannels: async (teamId: string) => {
            set((state) => {
              state.loading.channels = true;
              state.errors.channels = null;
            });

            try {
              const response = await fetch(`${API_BASE_URL}/teams/${teamId}/channels`, {});

              if (!response.ok) {
                throw new Error('Failed to load channels');
              }

              const data = await response.json();

              set((state) => {
                state.loading.channels = false;
                // Replace channels for this team
                state.channels = state.channels.filter(c => c.teamId !== teamId);
                state.channels.push(...(data.channels || []));
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.loading.channels = false;
                state.errors.channels = error instanceof Error ? error.message : 'Failed to load channels';
              });
            }
          },

          createChannel: async (teamId: string, channelData: Partial<TeamChannel>) => {
            set((state) => {
              state.loading.creating = true;
              state.errors.channels = null;
            });

            try {
              const response = await fetch(`${API_BASE_URL}/teams/${teamId}/channels`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...channelData, teamId })});

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to create channel');
              }

              const data = await response.json();

              set((state) => {
                state.loading.creating = false;
                state.channels.push(data.channel);
                state.lastUpdated = new Date().toISOString();
              });

              // Add activity
              get().addActivity({
                type: 'channel_created',
                title: 'Channel Created',
                description: `Channel "${data.channel.name}" was created`,
                userId: 'current-user', // TODO: Get from auth context
                teamId
              });

              return data.channel;
            } catch (error) {
              set((state) => {
                state.loading.creating = false;
                state.errors.channels = error instanceof Error ? error.message : 'Failed to create channel';
              });
              return null;
            }
          },

          updateChannel: async (channelId: string, updates: Partial<TeamChannel>) => {
            set((state) => {
              state.loading.updating = true;
              state.errors.channels = null;
            });

            try {
              const response = await fetch(`${API_BASE_URL}/channels/${channelId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)});

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to update channel');
              }

              const data = await response.json();

              set((state) => {
                state.loading.updating = false;
                const channelIndex = state.channels.findIndex(c => c.id === channelId);
                if (channelIndex !== -1) {
                  state.channels[channelIndex] = { ...state.channels[channelIndex], ...data.channel };
                }
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.loading.updating = false;
                state.errors.channels = error instanceof Error ? error.message : 'Failed to update channel';
              });
            }
          },

          deleteChannel: async (channelId: string) => {
            set((state) => {
              state.loading.deleting = true;
              state.errors.channels = null;
            });

            try {
              const response = await fetch(`${API_BASE_URL}/channels/${channelId}`, {
                method: 'DELETE'});

              if (!response.ok) {
                throw new Error('Failed to delete channel');
              }

              set((state) => {
                state.loading.deleting = false;
                state.channels = state.channels.filter(c => c.id !== channelId);
                
                // Clear selected channel if it was deleted
                if (state.selectedChannelId === channelId) {
                  state.selectedChannelId = null;
                }
                
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.loading.deleting = false;
                state.errors.channels = error instanceof Error ? error.message : 'Failed to delete channel';
              });
            }
          },

          joinChannel: async (channelId: string, userId: string) => {
            try {
              const response = await fetch(`${API_BASE_URL}/channels/${channelId}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })});

              if (!response.ok) {
                throw new Error('Failed to join channel');
              }

              set((state) => {
                const channelIndex = state.channels.findIndex(c => c.id === channelId);
                if (channelIndex !== -1 && !state.channels[channelIndex].members.includes(userId)) {
                  state.channels[channelIndex].members.push(userId);
                }
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.errors.channels = error instanceof Error ? error.message : 'Failed to join channel';
              });
            }
          },

          leaveChannel: async (channelId: string, userId: string) => {
            try {
              const response = await fetch(`${API_BASE_URL}/channels/${channelId}/leave`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })});

              if (!response.ok) {
                throw new Error('Failed to leave channel');
              }

              set((state) => {
                const channelIndex = state.channels.findIndex(c => c.id === channelId);
                if (channelIndex !== -1) {
                  state.channels[channelIndex].members = state.channels[channelIndex].members.filter(id => id !== userId);
                }
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.errors.channels = error instanceof Error ? error.message : 'Failed to leave channel';
              });
            }
          },

          // Project Management
          loadProjects: async (teamId: string) => {
            set((state) => {
              state.loading.projects = true;
              state.errors.projects = null;
            });

            try {
              const response = await fetch(`${API_BASE_URL}/teams/${teamId}/projects`, {});

              if (!response.ok) {
                throw new Error('Failed to load projects');
              }

              const data = await response.json();

              set((state) => {
                state.loading.projects = false;
                // Replace projects for this team
                state.projects = state.projects.filter(p => 
                  !p.assignedMembers.some(memberId => 
                    state.getTeamMembers(teamId).some(member => member.id === memberId)
                  )
                );
                state.projects.push(...(data.projects || []));
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.loading.projects = false;
                state.errors.projects = error instanceof Error ? error.message : 'Failed to load projects';
              });
            }
          },

          assignProjectToTeam: async (projectId: string, teamId: string, role: TeamProject['teamRole']) => {
            try {
              const response = await fetch(`${API_BASE_URL}/projects/${projectId}/teams`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teamId, role })});

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to assign project to team');
              }

              const data = await response.json();

              set((state) => {
                const existingIndex = state.projects.findIndex(p => p.id === projectId);
                if (existingIndex !== -1) {
                  state.projects[existingIndex] = data.project;
                } else {
                  state.projects.push(data.project);
                }
                state.lastUpdated = new Date().toISOString();
              });

              // Add activity
              get().addActivity({
                type: 'project_assigned',
                title: 'Project Assigned',
                description: `Project was assigned to the team as ${role}`,
                userId: 'current-user', // TODO: Get from auth context
                teamId
              });
            } catch (error) {
              set((state) => {
                state.errors.projects = error instanceof Error ? error.message : 'Failed to assign project to team';
              });
            }
          },

          removeProjectFromTeam: async (projectId: string, teamId: string) => {
            try {
              const response = await fetch(`${API_BASE_URL}/projects/${projectId}/teams/${teamId}`, {
                method: 'DELETE'});

              if (!response.ok) {
                throw new Error('Failed to remove project from team');
              }

              set((state) => {
                state.projects = state.projects.filter(p => p.id !== projectId);
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.errors.projects = error instanceof Error ? error.message : 'Failed to remove project from team';
              });
            }
          },

          updateProjectTeamRole: async (projectId: string, teamId: string, role: TeamProject['teamRole']) => {
            try {
              const response = await fetch(`${API_BASE_URL}/projects/${projectId}/teams/${teamId}/role`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role })});

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to update project team role');
              }

              set((state) => {
                const projectIndex = state.projects.findIndex(p => p.id === projectId);
                if (projectIndex !== -1) {
                  state.projects[projectIndex].teamRole = role;
                }
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.errors.projects = error instanceof Error ? error.message : 'Failed to update project team role';
              });
            }
          },

          // Meeting Management
          loadMeetings: async (teamId: string) => {
            set((state) => {
              state.loading.meetings = true;
              state.errors.meetings = null;
            });

            try {
              const response = await fetch(`${API_BASE_URL}/teams/${teamId}/meetings`, {});

              if (!response.ok) {
                throw new Error('Failed to load meetings');
              }

              const data = await response.json();

              set((state) => {
                state.loading.meetings = false;
                // Replace meetings for this team
                const teamMemberIds = state.getTeamMembers(teamId).map(m => m.userId);
                state.meetings = state.meetings.filter(m => 
                  !m.attendees.some(a => teamMemberIds.includes(a.userId))
                );
                state.meetings.push(...(data.meetings || []));
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.loading.meetings = false;
                state.errors.meetings = error instanceof Error ? error.message : 'Failed to load meetings';
              });
            }
          },

          scheduleMeeting: async (teamId: string, meetingData: Partial<TeamMeeting>) => {
            set((state) => {
              state.loading.creating = true;
              state.errors.meetings = null;
            });

            try {
              const response = await fetch(`${API_BASE_URL}/teams/${teamId}/meetings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(meetingData)});

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to schedule meeting');
              }

              const data = await response.json();

              set((state) => {
                state.loading.creating = false;
                state.meetings.push(data.meeting);
                
                // Add to current meetings if it's starting soon
                const startTime = new Date(data.meeting.startTime);
                const now = new Date();
                const diffHours = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
                
                if (diffHours <= 1 && diffHours >= 0) {
                  state.currentMeetings.push(data.meeting);
                }
                
                state.lastUpdated = new Date().toISOString();
              });

              // Add activity
              get().addActivity({
                type: 'meeting_scheduled',
                title: 'Meeting Scheduled',
                description: `Meeting "${data.meeting.title}" was scheduled`,
                userId: 'current-user', // TODO: Get from auth context
                teamId
              });

              return data.meeting;
            } catch (error) {
              set((state) => {
                state.loading.creating = false;
                state.errors.meetings = error instanceof Error ? error.message : 'Failed to schedule meeting';
              });
              return null;
            }
          },

          updateMeeting: async (meetingId: string, updates: Partial<TeamMeeting>) => {
            set((state) => {
              state.loading.updating = true;
              state.errors.meetings = null;
            });

            try {
              const response = await fetch(`${API_BASE_URL}/meetings/${meetingId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)});

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to update meeting');
              }

              const data = await response.json();

              set((state) => {
                state.loading.updating = false;
                
                // Update in meetings list
                const meetingIndex = state.meetings.findIndex(m => m.id === meetingId);
                if (meetingIndex !== -1) {
                  state.meetings[meetingIndex] = { ...state.meetings[meetingIndex], ...data.meeting };
                }
                
                // Update in current meetings if applicable
                const currentIndex = state.currentMeetings.findIndex(m => m.id === meetingId);
                if (currentIndex !== -1) {
                  state.currentMeetings[currentIndex] = { ...state.currentMeetings[currentIndex], ...data.meeting };
                }
                
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.loading.updating = false;
                state.errors.meetings = error instanceof Error ? error.message : 'Failed to update meeting';
              });
            }
          },

          cancelMeeting: async (meetingId: string) => {
            await get().updateMeeting(meetingId, { status: 'cancelled' });
          },

          respondToMeeting: async (meetingId: string, response: 'yes' | 'no' | 'maybe') => {
            try {
              const apiResponse = await fetch(`${API_BASE_URL}/meetings/${meetingId}/response`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ response })});

              if (!apiResponse.ok) {
                const error = await apiResponse.json();
                throw new Error(error.message || 'Failed to respond to meeting');
              }

              set((state) => {
                const currentUserId = 'current-user'; // TODO: Get from auth context
                
                // Update in meetings list
                const meetingIndex = state.meetings.findIndex(m => m.id === meetingId);
                if (meetingIndex !== -1) {
                  const attendeeIndex = state.meetings[meetingIndex].attendees.findIndex(a => a.userId === currentUserId);
                  if (attendeeIndex !== -1) {
                    state.meetings[meetingIndex].attendees[attendeeIndex].response = response;
                  }
                }
                
                // Update in current meetings
                const currentIndex = state.currentMeetings.findIndex(m => m.id === meetingId);
                if (currentIndex !== -1) {
                  const attendeeIndex = state.currentMeetings[currentIndex].attendees.findIndex(a => a.userId === currentUserId);
                  if (attendeeIndex !== -1) {
                    state.currentMeetings[currentIndex].attendees[attendeeIndex].response = response;
                  }
                }
                
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.errors.meetings = error instanceof Error ? error.message : 'Failed to respond to meeting';
              });
            }
          },

          addMeetingNotes: async (meetingId: string, notes: string) => {
            await get().updateMeeting(meetingId, { notes });
          },

          // Activity Management
          loadActivities: async (teamId?: string) => {
            set((state) => {
              state.loading.activities = true;
              state.errors.activities = null;
            });

            try {
              const endpoint = teamId 
                ? `${API_BASE_URL}/teams/${teamId}/activities`
                : `${API_BASE_URL}/workspaces/${get().currentWorkspaceId}/activities`;
                
              const response = await fetch(endpoint, {});

              if (!response.ok) {
                throw new Error('Failed to load activities');
              }

              const data = await response.json();

              set((state) => {
                state.loading.activities = false;
                
                if (teamId) {
                  // Replace activities for specific team
                  state.activities = state.activities.filter(a => a.teamId !== teamId);
                  state.activities.push(...(data.activities || []));
                } else {
                  // Replace all activities
                  state.activities = data.activities || [];
                }
                
                // Sort by timestamp
                state.activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.loading.activities = false;
                state.errors.activities = error instanceof Error ? error.message : 'Failed to load activities';
              });
            }
          },

          addActivity: (activity: Omit<TeamActivity, 'id' | 'timestamp'>) => {
            const newActivity: TeamActivity = {
              ...activity,
              id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              timestamp: new Date().toISOString()
            };

            set((state) => {
              state.activities.unshift(newActivity);
              
              // Keep only last 100 activities
              if (state.activities.length > 100) {
                state.activities.splice(100);
              }
            });
          },

          // Analytics
          loadAnalytics: async (teamId: string, period = 'month' as 'week' | 'month' | 'quarter') => {
            set((state) => {
              state.loading.analytics = true;
              state.errors.analytics = null;
            });

            try {
              const response = await fetch(`${API_BASE_URL}/teams/${teamId}/analytics?period=${period}`, {});

              if (!response.ok) {
                throw new Error('Failed to load analytics');
              }

              const data = await response.json();

              set((state) => {
                state.loading.analytics = false;
                state.analytics[teamId] = data.analytics;
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.loading.analytics = false;
                state.errors.analytics = error instanceof Error ? error.message : 'Failed to load analytics';
              });
            }
          },

          loadWorkspaceStats: async (workspaceId?: string) => {
            const currentWorkspaceId = workspaceId || get().currentWorkspaceId;
            if (!currentWorkspaceId) return;

            set((state) => {
              state.loading.stats = true;
              state.errors.stats = null;
            });

            try {
              const response = await fetch(`${API_BASE_URL}/workspaces/${currentWorkspaceId}/stats`, {});

              if (!response.ok) {
                throw new Error('Failed to load workspace stats');
              }

              const data = await response.json();

              set((state) => {
                state.loading.stats = false;
                state.workspaceStats = data.stats;
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.loading.stats = false;
                state.errors.stats = error instanceof Error ? error.message : 'Failed to load workspace stats';
              });
            }
          },

          generateTeamReport: async (teamId: string, type: 'productivity' | 'workload' | 'skills') => {
            try {
              const response = await fetch(`${API_BASE_URL}/teams/${teamId}/reports/${type}`, {});

              if (!response.ok) {
                throw new Error(`Failed to generate ${type} report`);
              }

              return await response.json();
            } catch (error) {
              set((state) => {
                state.errors.analytics = error instanceof Error ? error.message : `Failed to generate ${type} report`;
              });
              return null;
            }
          },

          // Settings Management
          loadTeamSettings: async (workspaceId?: string) => {
            const currentWorkspaceId = workspaceId || get().currentWorkspaceId;
            if (!currentWorkspaceId) return;

            set((state) => {
              state.loading.settings = true;
              state.errors.settings = null;
            });

            try {
              const response = await fetch(`${API_BASE_URL}/workspaces/${currentWorkspaceId}/team-settings`, {});

              if (!response.ok) {
                throw new Error('Failed to load team settings');
              }

              const data = await response.json();

              set((state) => {
                state.loading.settings = false;
                state.teamSettings = { ...defaultTeamSettings, ...data.settings };
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.loading.settings = false;
                state.errors.settings = error instanceof Error ? error.message : 'Failed to load team settings';
                
                // Use default settings if loading fails
                state.teamSettings = { ...defaultTeamSettings, workspaceId: currentWorkspaceId };
              });
            }
          },

          updateTeamSettings: async (updates: Partial<TeamSettings>) => {
            const workspaceId = get().currentWorkspaceId;
            if (!workspaceId) return;

            set((state) => {
              state.loading.settings = true;
              state.errors.settings = null;
            });

            try {
              const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/team-settings`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)});

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to update team settings');
              }

              set((state) => {
                state.loading.settings = false;
                state.teamSettings = { ...state.teamSettings, ...updates } as TeamSettings;
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.loading.settings = false;
                state.errors.settings = error instanceof Error ? error.message : 'Failed to update team settings';
              });
            }
          },

          // Selection and Navigation
          setWorkspaceId: (workspaceId: string) => {
            set((state) => {
              state.currentWorkspaceId = workspaceId;
              
              // Clear data when switching workspaces
              state.teams = [];
              state.members = [];
              state.channels = [];
              state.projects = [];
              state.meetings = [];
              state.activities = [];
              state.analytics = {};
              state.workspaceStats = null;
              state.activeTeam = null;
              state.selectedTeamId = null;
              state.selectedMemberId = null;
            });
            
            // Load data for new workspace
            get().refreshAll(workspaceId);
          },

          setActiveTeam: (teamId: string | null) => {
            set((state) => {
              state.selectedTeamId = teamId;
              state.activeTeam = teamId ? state.getTeamById(teamId) : null;
            });
            
            // Load team-specific data
            if (teamId) {
              get().loadMembers(teamId);
              get().loadChannels(teamId);
              get().loadProjects(teamId);
              get().loadMeetings(teamId);
              get().loadActivities(teamId);
              get().loadAnalytics(teamId);
            }
          },

          setSelectedTeam: (teamId: string | null) => {
            set((state) => {
              state.selectedTeamId = teamId;
            });
          },

          setSelectedMember: (memberId: string | null) => {
            set((state) => {
              state.selectedMemberId = memberId;
            });
          },

          setSelectedChannel: (channelId: string | null) => {
            set((state) => {
              state.selectedChannelId = channelId;
            });
          },

          setSelectedProject: (projectId: string | null) => {
            set((state) => {
              state.selectedProjectId = projectId;
            });
          },

          setSelectedMeeting: (meetingId: string | null) => {
            set((state) => {
              state.selectedMeetingId = meetingId;
            });
          },

          // View and Filter Management
          setViewMode: (mode: TeamViewMode) => {
            set((state) => {
              state.viewMode = mode;
            });
          },

          setTeamFilter: (filter: Partial<TeamFilter>) => {
            set((state) => {
              state.teamFilter = { ...state.teamFilter, ...filter };
            });
          },

          setMemberFilter: (filter: Partial<MemberFilter>) => {
            set((state) => {
              state.memberFilter = { ...state.memberFilter, ...filter };
            });
          },

          setSortBy: (sortBy: SortOption) => {
            set((state) => {
              state.sortBy = sortBy;
            });
          },

          setSortOrder: (order: SortOrder) => {
            set((state) => {
              state.sortOrder = order;
            });
          },

          setSearchQuery: (query: string) => {
            set((state) => {
              state.searchQuery = query;
            });
          },

          clearFilters: () => {
            set((state) => {
              state.teamFilter = defaultTeamFilter;
              state.memberFilter = defaultMemberFilter;
              state.searchQuery = '';
              state.sortBy = 'name';
              state.sortOrder = 'asc';
            });
          },

          // UI State Management
          setShowCreateTeamModal: (show: boolean) => {
            set((state) => {
              state.showCreateTeamModal = show;
            });
          },

          setShowEditTeamModal: (show: boolean) => {
            set((state) => {
              state.showEditTeamModal = show;
            });
          },

          setShowInviteMemberModal: (show: boolean) => {
            set((state) => {
              state.showInviteMemberModal = show;
            });
          },

          setShowTeamSettingsModal: (show: boolean) => {
            set((state) => {
              state.showTeamSettingsModal = show;
            });
          },

          setShowMeetingModal: (show: boolean) => {
            set((state) => {
              state.showMeetingModal = show;
            });
          },

          setShowChannelModal: (show: boolean) => {
            set((state) => {
              state.showChannelModal = show;
            });
          },

          setShowInactiveMembers: (show: boolean) => {
            set((state) => {
              state.showInactiveMembers = show;
            });
          },

          // Real-time Management
          updateMemberPresence: (userId: string, presence: ConsolidatedTeamsState['memberPresence'][string]) => {
            set((state) => {
              state.memberPresence[userId] = presence;
            });
          },

          updateOnlineMembers: (members: ConsolidatedTeamsState['onlineMembers']) => {
            set((state) => {
              state.onlineMembers = members;
            });
          },

          setMemberTyping: (userId: string, channelId: string, isTyping: boolean) => {
            set((state) => {
              if (!state.memberPresence[userId]) {
                state.memberPresence[userId] = {
                  isTyping: false,
                  lastActivity: new Date().toISOString()
                };
              }
              
              state.memberPresence[userId].isTyping = isTyping;
              state.memberPresence[userId].currentChannel = isTyping ? channelId : undefined;
              state.memberPresence[userId].lastActivity = new Date().toISOString();
            });
          },

          // Bulk Actions
          performMemberAction: async (action: MemberAction, memberIds: string[], data?: any) => {
            const promises = memberIds.map(async (memberId) => {
              switch (action) {
                case 'promote':
                  if (data?.teamId && data?.role) {
                    return get().updateMemberRole(memberId, data.teamId, data.role);
                  }
                  break;
                case 'demote':
                  if (data?.teamId) {
                    return get().updateMemberRole(memberId, data.teamId, 'member');
                  }
                  break;
                case 'remove':
                  if (data?.teamId) {
                    return get().removeMemberFromTeam(memberId, data.teamId);
                  }
                  break;
                case 'deactivate':
                  return get().updateMemberStatus(memberId, 'inactive');
                case 'activate':
                  return get().updateMemberStatus(memberId, 'active');
                case 'resend_invite':
                  const member = get().getMemberById(memberId);
                  if (member) {
                    return get().resendInvite(member.user.email);
                  }
                  break;
              }
            });

            await Promise.all(promises);
          },

          performTeamAction: async (action: TeamAction, teamIds: string[], data?: any) => {
            const promises = teamIds.map(async (teamId) => {
              switch (action) {
                case 'archive':
                  return get().archiveTeam(teamId);
                case 'unarchive':
                  return get().unarchiveTeam(teamId);
                case 'delete':
                  return get().deleteTeam(teamId);
                case 'transfer_ownership':
                  if (data?.newOwnerId) {
                    return get().transferOwnership(teamId, data.newOwnerId);
                  }
                  break;
                case 'duplicate':
                  if (data?.newName) {
                    return get().duplicateTeam(teamId, data.newName);
                  }
                  break;
              }
            });

            await Promise.all(promises);
          },

          bulkInviteMembers: async (invites: Array<{ email: string; role: TeamMember['role']; teamIds: string[] }>) => {
            const promises = invites.map(invite => 
              get().inviteMember(invite.email, invite.role, invite.teamIds)
            );

            await Promise.all(promises);
          },

          // Utility Functions
          getTeamById: (teamId: string) => {
            return get().teams.find(team => team.id === teamId) || null;
          },

          getMemberById: (memberId: string) => {
            return get().members.find(member => member.id === memberId) || null;
          },

          getChannelById: (channelId: string) => {
            return get().channels.find(channel => channel.id === channelId) || null;
          },

          getProjectById: (projectId: string) => {
            return get().projects.find(project => project.id === projectId) || null;
          },

          getMeetingById: (meetingId: string) => {
            return get().meetings.find(meeting => meeting.id === meetingId) || null;
          },

          getTeamMembers: (teamId: string) => {
            return get().members.filter(member => 
              member.teamId === teamId || 
              member.teamMemberships?.some(tm => tm.teamId === teamId)
            );
          },

          getMemberTeams: (memberId: string) => {
            const member = get().getMemberById(memberId);
            if (!member) return [];
            
            const teamIds = member.teamMemberships?.map(tm => tm.teamId) || [member.teamId];
            return get().teams.filter(team => teamIds.includes(team.id));
          },

          getTeamChannels: (teamId: string) => {
            return get().channels.filter(channel => channel.teamId === teamId);
          },

          getTeamProjects: (teamId: string) => {
            const teamMembers = get().getTeamMembers(teamId);
            const memberIds = teamMembers.map(m => m.id);
            
            return get().projects.filter(project => 
              project.assignedMembers.some(id => memberIds.includes(id))
            );
          },

          getTeamMeetings: (teamId: string) => {
            const teamMembers = get().getTeamMembers(teamId);
            const memberIds = teamMembers.map(m => m.userId);
            
            return get().meetings.filter(meeting => 
              meeting.attendees.some(attendee => memberIds.includes(attendee.userId))
            );
          },

          getFilteredTeams: () => {
            const state = get();
            let filtered = [...state.teams];

            // Apply search query
            if (state.searchQuery) {
              const query = state.searchQuery.toLowerCase();
              filtered = filtered.filter(team =>
                team.name.toLowerCase().includes(query) ||
                team.description?.toLowerCase().includes(query) ||
                team.tags.some(tag => tag.toLowerCase().includes(query))
              );
            }

            // Apply filters
            if (state.teamFilter.type && state.teamFilter.type !== 'all') {
              filtered = filtered.filter(team => team.type === state.teamFilter.type);
            }

            if (state.teamFilter.status && state.teamFilter.status !== 'all') {
              filtered = filtered.filter(team => team.status === state.teamFilter.status);
            }

            if (state.teamFilter.visibility && state.teamFilter.visibility !== 'all') {
              filtered = filtered.filter(team => team.visibility === state.teamFilter.visibility);
            }

            if (state.teamFilter.tags && state.teamFilter.tags.length > 0) {
              filtered = filtered.filter(team =>
                state.teamFilter.tags!.some(tag => team.tags.includes(tag))
              );
            }

            if (state.teamFilter.memberCount) {
              const { min, max } = state.teamFilter.memberCount;
              filtered = filtered.filter(team => {
                const count = team.metrics.totalMembers;
                return (!min || count >= min) && (!max || count <= max);
              });
            }

            if (state.teamFilter.productivity) {
              const { min, max } = state.teamFilter.productivity;
              filtered = filtered.filter(team => {
                const productivity = team.metrics.productivity;
                return (!min || productivity >= min) && (!max || productivity <= max);
              });
            }

            // Apply sorting
            filtered.sort((a, b) => {
              let aValue: any, bValue: any;
              
              switch (state.sortBy) {
                case 'name':
                  aValue = a.name.toLowerCase();
                  bValue = b.name.toLowerCase();
                  break;
                case 'created':
                  aValue = new Date(a.createdAt).getTime();
                  bValue = new Date(b.createdAt).getTime();
                  break;
                case 'updated':
                  aValue = new Date(a.updatedAt).getTime();
                  bValue = new Date(b.updatedAt).getTime();
                  break;
                case 'members':
                  aValue = a.metrics.totalMembers;
                  bValue = b.metrics.totalMembers;
                  break;
                case 'activity':
                  // Sort by last activity (placeholder)
                  aValue = new Date(a.updatedAt).getTime();
                  bValue = new Date(b.updatedAt).getTime();
                  break;
                case 'productivity':
                  aValue = a.metrics.productivity;
                  bValue = b.metrics.productivity;
                  break;
                default:
                  return 0;
              }

              if (typeof aValue === 'string') {
                return state.sortOrder === 'asc' 
                  ? aValue.localeCompare(bValue)
                  : bValue.localeCompare(aValue);
              } else {
                return state.sortOrder === 'asc' 
                  ? aValue - bValue 
                  : bValue - aValue;
              }
            });

            return filtered;
          },

          getFilteredMembers: () => {
            const state = get();
            let filtered = [...state.members];

            // Apply search query
            if (state.searchQuery) {
              const query = state.searchQuery.toLowerCase();
              filtered = filtered.filter(member =>
                member.user.displayName.toLowerCase().includes(query) ||
                member.user.email.toLowerCase().includes(query) ||
                member.skills.some(skill => skill.name.toLowerCase().includes(query))
              );
            }

            // Apply filters
            if (state.memberFilter.role && state.memberFilter.role !== 'all') {
              filtered = filtered.filter(member => member.role === state.memberFilter.role);
            }

            if (state.memberFilter.status && state.memberFilter.status !== 'all') {
              filtered = filtered.filter(member => member.status === state.memberFilter.status);
            }

            if (state.memberFilter.skills && state.memberFilter.skills.length > 0) {
              filtered = filtered.filter(member =>
                state.memberFilter.skills!.some(skill =>
                  member.skills.some(memberSkill => memberSkill.name.toLowerCase().includes(skill.toLowerCase()))
                )
              );
            }

            if (state.memberFilter.utilization) {
              const { min, max } = state.memberFilter.utilization;
              filtered = filtered.filter(member => {
                const utilization = member.workload.utilization;
                return (!min || utilization >= min) && (!max || utilization <= max);
              });
            }

            if (state.memberFilter.teams && state.memberFilter.teams.length > 0) {
              filtered = filtered.filter(member =>
                state.memberFilter.teams!.some(teamId =>
                  member.teamId === teamId ||
                  member.teamMemberships?.some(tm => tm.teamId === teamId)
                )
              );
            }

            // Hide inactive members if setting is off
            if (!state.showInactiveMembers) {
              filtered = filtered.filter(member => member.status !== 'inactive');
            }

            return filtered;
          },

          getMembersByRole: (role: TeamMember['role']) => {
            return get().members.filter(member => member.role === role);
          },

          getTeamsByType: (type: Team['type']) => {
            return get().teams.filter(team => team.type === type);
          },

          // Data Refresh
          refreshAll: async (workspaceId?: string) => {
            const currentWorkspaceId = workspaceId || get().currentWorkspaceId;
            if (!currentWorkspaceId) return;

            await Promise.all([
              get().loadTeams(currentWorkspaceId, true),
              get().loadMembers(undefined, currentWorkspaceId),
              get().loadWorkspaceStats(currentWorkspaceId),
              get().loadTeamSettings(currentWorkspaceId),
              get().loadActivities(),
            ]);
          },

          refreshTeam: async (teamId: string) => {
            await Promise.all([
              get().loadTeam(teamId),
              get().loadMembers(teamId),
              get().loadChannels(teamId),
              get().loadProjects(teamId),
              get().loadMeetings(teamId),
              get().loadActivities(teamId),
              get().loadAnalytics(teamId),
            ]);
          },

          refreshMember: async (memberId: string) => {
            // Refresh member data by reloading all members
            await get().loadMembers();
          },

          // Error Management
          setError: (key: keyof ConsolidatedTeamsState['errors'], value: string | null) => {
            set((state) => {
              state.errors[key] = value;
            });
          },

          clearErrors: () => {
            set((state) => {
              state.errors = {
                teams: null,
                team: null,
                members: null,
                channels: null,
                projects: null,
                meetings: null,
                activities: null,
                analytics: null,
                stats: null,
                settings: null
              };
            });
          },

          clearError: (key: keyof ConsolidatedTeamsState['errors']) => {
            set((state) => {
              state.errors[key] = null;
            });
          },

          // Loading Management
          setLoading: (key: keyof ConsolidatedTeamsState['loading'], value: boolean) => {
            set((state) => {
              state.loading[key] = value;
            });
          },

          // Cleanup
          reset: () => {
            set(() => ({ ...initialState }));
          },

          cleanup: () => {
            set((state) => {
              state.selectedTeamId = null;
              state.selectedMemberId = null;
              state.selectedChannelId = null;
              state.selectedProjectId = null;
              state.selectedMeetingId = null;
              state.activeTeam = null;
              state.showCreateTeamModal = false;
              state.showEditTeamModal = false;
              state.showInviteMemberModal = false;
              state.showTeamSettingsModal = false;
              state.showMeetingModal = false;
              state.showChannelModal = false;
            });
          }
        }))
      ),
      {
        name: 'consolidated-teams-store',
        partialize: (state) => ({
          // Persist teams, members, and settings
          teams: state.teams,
          members: state.members,
          teamSettings: state.teamSettings,
          currentWorkspaceId: state.currentWorkspaceId,
          selectedTeamId: state.selectedTeamId,
          viewMode: state.viewMode,
          teamFilter: state.teamFilter,
          memberFilter: state.memberFilter,
          sortBy: state.sortBy,
          sortOrder: state.sortOrder,
          showInactiveMembers: state.showInactiveMembers,
          // Don't persist real-time data, loading states, or errors
        }),
        version: 1
      }
    ),
    {
      name: 'consolidated-teams-store'
    }
  )
);

// Selector hooks for optimized re-renders
export const useTeamsStore = useConsolidatedTeamsStore;

// Specialized selector hooks
export const useTeams = () => useConsolidatedTeamsStore((state) => state.getFilteredTeams());
export const useMembers = () => useConsolidatedTeamsStore((state) => state.getFilteredMembers());
export const useActiveTeam = () => useConsolidatedTeamsStore((state) => state.activeTeam);
export const useSelectedTeam = () => useConsolidatedTeamsStore((state) => {
  const selectedId = state.selectedTeamId;
  return selectedId ? state.getTeamById(selectedId) : null;
});
export const useSelectedMember = () => useConsolidatedTeamsStore((state) => {
  const selectedId = state.selectedMemberId;
  return selectedId ? state.getMemberById(selectedId) : null;
});
export const useTeamMembers = (teamId?: string) => useConsolidatedTeamsStore((state) => {
  return teamId ? state.getTeamMembers(teamId) : [];
});
export const useTeamChannels = (teamId?: string) => useConsolidatedTeamsStore((state) => {
  return teamId ? state.getTeamChannels(teamId) : [];
});
export const useTeamProjects = (teamId?: string) => useConsolidatedTeamsStore((state) => {
  return teamId ? state.getTeamProjects(teamId) : [];
});
export const useTeamMeetings = (teamId?: string) => useConsolidatedTeamsStore((state) => {
  return teamId ? state.getTeamMeetings(teamId) : [];
});
export const useTeamAnalytics = (teamId?: string) => useConsolidatedTeamsStore((state) => {
  return teamId ? state.analytics[teamId] : null;
});
export const useWorkspaceStats = () => useConsolidatedTeamsStore((state) => state.workspaceStats);
export const useTeamSettings = () => useConsolidatedTeamsStore((state) => state.teamSettings);
export const useOnlineMembers = () => useConsolidatedTeamsStore((state) => state.onlineMembers);
export const useCurrentMeetings = () => useConsolidatedTeamsStore((state) => state.currentMeetings);
export const useTeamActivities = () => useConsolidatedTeamsStore((state) => state.activities);

export default useConsolidatedTeamsStore;