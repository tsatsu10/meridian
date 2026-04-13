// Unified Team Management Store
// This consolidates all team and user state management

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { toast } from '@/lib/toast';
import { 
  UnifiedTeamMember, 
  UnifiedTeam, 
  WorkspaceStats, 
  TeamFilter, 
  MemberFilter,
  TeamViewMode,
  SortOption,
  SortOrder,
  TeamRole,
  TeamSettings,
  MemberAction,
  TeamAction
} from '@/types/unified-team';
import { UnifiedTeamAPI } from '@/lib/api/unified-team-api';

interface UnifiedTeamState {
  // Data State
  teams: UnifiedTeam[];
  members: UnifiedTeamMember[];
  workspaceStats: WorkspaceStats | null;
  teamSettings: TeamSettings | null;
  onlineMembers: { userId: string; status: string; lastSeen: string }[];
  
  // UI State
  currentWorkspaceId: string | null;
  viewMode: TeamViewMode;
  selectedTeamId: string | null;
  selectedMemberId: string | null;
  
  // Filter & Search State
  teamFilter: TeamFilter;
  memberFilter: MemberFilter;
  sortBy: SortOption;
  sortOrder: SortOrder;
  searchTerm: string;
  
  // Loading States
  isLoading: boolean;
  isLoadingTeams: boolean;
  isLoadingMembers: boolean;
  isLoadingStats: boolean;
  
  // Error State
  error: string | null;
  
  // Actions
  setWorkspaceId: (workspaceId: string) => void;
  setViewMode: (mode: TeamViewMode) => void;
  setSelectedTeam: (teamId: string | null) => void;
  setSelectedMember: (memberId: string | null) => void;
  
  // Filter & Search Actions
  setTeamFilter: (filter: Partial<TeamFilter>) => void;
  setMemberFilter: (filter: Partial<MemberFilter>) => void;
  setSortBy: (sortBy: SortOption) => void;
  setSortOrder: (order: SortOrder) => void;
  setSearchTerm: (term: string) => void;
  clearFilters: () => void;
  
  // Data Loading Actions
  loadTeams: (workspaceId?: string) => Promise<void>;
  loadMembers: (workspaceId?: string) => Promise<void>;
  loadWorkspaceStats: (workspaceId?: string) => Promise<void>;
  loadTeamSettings: (workspaceId?: string) => Promise<void>;
  loadOnlineMembers: (workspaceId?: string) => Promise<void>;
  refreshAll: (workspaceId?: string) => Promise<void>;
  
  // Team Management Actions
  createTeam: (teamData: Partial<UnifiedTeam>) => Promise<UnifiedTeam | null>;
  updateTeam: (teamId: string, updates: Partial<UnifiedTeam>) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;
  archiveTeam: (teamId: string) => Promise<void>;
  
  // Member Management Actions
  inviteMember: (email: string, role: TeamRole) => Promise<UnifiedTeamMember | null>;
  updateMemberRole: (memberId: string, newRole: TeamRole) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  resendInvite: (email: string) => Promise<void>;
  
  // Team Membership Actions
  addMemberToTeam: (memberId: string, teamId: string, role?: TeamRole) => Promise<void>;
  removeMemberFromTeam: (memberId: string, teamId: string) => Promise<void>;
  updateTeamMemberRole: (memberId: string, teamId: string, role: TeamRole) => Promise<void>;
  
  // Settings Actions
  updateTeamSettings: (settings: Partial<TeamSettings>) => Promise<void>;
  
  // Utility Actions
  performMemberAction: (action: MemberAction, memberId: string, data?: any) => Promise<void>;
  performTeamAction: (action: TeamAction, teamId: string, data?: any) => Promise<void>;
  
  // Selectors (computed values)
  getFilteredTeams: () => UnifiedTeam[];
  getFilteredMembers: () => UnifiedTeamMember[];
  getTeamById: (teamId: string) => UnifiedTeam | undefined;
  getMemberById: (memberId: string) => UnifiedTeamMember | undefined;
  getTeamMembers: (teamId: string) => UnifiedTeamMember[];
  getMembersByRole: (role: TeamRole) => UnifiedTeamMember[];
}

export const useUnifiedTeamStore = create<UnifiedTeamState>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial State
        teams: [],
        members: [],
        workspaceStats: null,
        teamSettings: null,
        onlineMembers: [],
        currentWorkspaceId: null,
        viewMode: 'teams',
        selectedTeamId: null,
        selectedMemberId: null,
        teamFilter: {},
        memberFilter: {},
        sortBy: 'name',
        sortOrder: 'asc',
        searchTerm: '',
        isLoading: false,
        isLoadingTeams: false,
        isLoadingMembers: false,
        isLoadingStats: false,
        error: null,

        // Basic Setters
        setWorkspaceId: (workspaceId) =>
          set((state) => {
            state.currentWorkspaceId = workspaceId;
          }),

        setViewMode: (mode) =>
          set((state) => {
            state.viewMode = mode;
          }),

        setSelectedTeam: (teamId) =>
          set((state) => {
            state.selectedTeamId = teamId;
          }),

        setSelectedMember: (memberId) =>
          set((state) => {
            state.selectedMemberId = memberId;
          }),

        // Filter & Search Actions
        setTeamFilter: (filter) =>
          set((state) => {
            state.teamFilter = { ...state.teamFilter, ...filter };
          }),

        setMemberFilter: (filter) =>
          set((state) => {
            state.memberFilter = { ...state.memberFilter, ...filter };
          }),

        setSortBy: (sortBy) =>
          set((state) => {
            state.sortBy = sortBy;
          }),

        setSortOrder: (order) =>
          set((state) => {
            state.sortOrder = order;
          }),

        setSearchTerm: (term) =>
          set((state) => {
            state.searchTerm = term;
          }),

        clearFilters: () =>
          set((state) => {
            state.teamFilter = {};
            state.memberFilter = {};
            state.sortBy = 'name';
            state.sortOrder = 'asc';
            state.searchTerm = '';
          }),

        // Data Loading Actions
        loadTeams: async (workspaceId) => {
          const wsId = workspaceId || get().currentWorkspaceId;
          if (!wsId) return;

          set((state) => {
            state.isLoadingTeams = true;
            state.error = null;
          });

          try {
            const teams = await UnifiedTeamAPI.getTeams(wsId);
            set((state) => {
              state.teams = teams;
              state.isLoadingTeams = false;
            });
          } catch (error) {
            console.error('Failed to load teams:', error);
            set((state) => {
              state.error = 'Failed to load teams';
              state.isLoadingTeams = false;
            });
            toast.error('Failed to load teams');
          }
        },

        loadMembers: async (workspaceId) => {
          const wsId = workspaceId || get().currentWorkspaceId;
          if (!wsId) return;

          set((state) => {
            state.isLoadingMembers = true;
            state.error = null;
          });

          try {
            const members = await UnifiedTeamAPI.getWorkspaceMembers(wsId);
            set((state) => {
              state.members = members;
              state.isLoadingMembers = false;
            });
          } catch (error) {
            console.error('Failed to load members:', error);
            set((state) => {
              state.error = 'Failed to load members';
              state.isLoadingMembers = false;
            });
            toast.error('Failed to load members');
          }
        },

        loadWorkspaceStats: async (workspaceId) => {
          const wsId = workspaceId || get().currentWorkspaceId;
          if (!wsId) return;

          set((state) => {
            state.isLoadingStats = true;
          });

          try {
            const stats = await UnifiedTeamAPI.getWorkspaceStats(wsId);
            set((state) => {
              state.workspaceStats = stats;
              state.isLoadingStats = false;
            });
          } catch (error) {
            console.error('Failed to load workspace stats:', error);
            set((state) => {
              state.isLoadingStats = false;
            });
          }
        },

        loadTeamSettings: async (workspaceId) => {
          const wsId = workspaceId || get().currentWorkspaceId;
          if (!wsId) return;

          try {
            const settings = await UnifiedTeamAPI.getTeamSettings(wsId);
            set((state) => {
              state.teamSettings = settings;
            });
          } catch (error) {
            console.error('Failed to load team settings:', error);
          }
        },

        loadOnlineMembers: async (workspaceId) => {
          const wsId = workspaceId || get().currentWorkspaceId;
          if (!wsId) return;

          try {
            const onlineMembers = await UnifiedTeamAPI.getOnlineMembers(wsId);
            set((state) => {
              state.onlineMembers = onlineMembers;
              // Update member status based on online data
              state.members.forEach(member => {
                const onlineData = onlineMembers.find(om => om.userId === member.id);
                if (onlineData) {
                  member.status = onlineData.status as any;
                  member.lastActive = onlineData.lastSeen;
                }
              });
            });
          } catch (error) {
            console.error('Failed to load online members:', error);
          }
        },

        refreshAll: async (workspaceId) => {
          const wsId = workspaceId || get().currentWorkspaceId;
          if (!wsId) return;

          set((state) => {
            state.isLoading = true;
          });

          try {
            await Promise.all([
              get().loadTeams(wsId),
              get().loadMembers(wsId),
              get().loadWorkspaceStats(wsId),
              get().loadTeamSettings(wsId),
              get().loadOnlineMembers(wsId),
            ]);
          } finally {
            set((state) => {
              state.isLoading = false;
            });
          }
        },

        // Team Management Actions
        createTeam: async (teamData) => {
          try {
            const newTeam = await UnifiedTeamAPI.createTeam(teamData);
            set((state) => {
              state.teams.push(newTeam);
            });
            toast.success(`Team "${newTeam.name}" created successfully`);
            get().loadWorkspaceStats(); // Refresh stats
            return newTeam;
          } catch (error) {
            console.error('Failed to create team:', error);
            toast.error('Failed to create team');
            return null;
          }
        },

        updateTeam: async (teamId, updates) => {
          try {
            const updatedTeam = await UnifiedTeamAPI.updateTeam(teamId, updates);
            set((state) => {
              const index = state.teams.findIndex(t => t.id === teamId);
              if (index !== -1) {
                state.teams[index] = updatedTeam;
              }
            });
            toast.success('Team updated successfully');
          } catch (error) {
            console.error('Failed to update team:', error);
            toast.error('Failed to update team');
          }
        },

        deleteTeam: async (teamId) => {
          try {
            await UnifiedTeamAPI.deleteTeam(teamId);
            set((state) => {
              state.teams = state.teams.filter(t => t.id !== teamId);
              if (state.selectedTeamId === teamId) {
                state.selectedTeamId = null;
              }
            });
            toast.success('Team deleted successfully');
            get().loadWorkspaceStats(); // Refresh stats
          } catch (error) {
            console.error('Failed to delete team:', error);
            toast.error('Failed to delete team');
          }
        },

        archiveTeam: async (teamId) => {
          try {
            await get().updateTeam(teamId, { status: 'archived' });
            toast.success('Team archived successfully');
          } catch (error) {
            console.error('Failed to archive team:', error);
            toast.error('Failed to archive team');
          }
        },

        // Member Management Actions
        inviteMember: async (email, role) => {
          const wsId = get().currentWorkspaceId;
          if (!wsId) return null;

          try {
            const newMember = await UnifiedTeamAPI.inviteMember(email, role, wsId);
            set((state) => {
              state.members.push(newMember);
            });
            toast.success(`Invitation sent to ${email}`);
            get().loadWorkspaceStats(); // Refresh stats
            return newMember;
          } catch (error) {
            console.error('Failed to invite member:', error);
            toast.error('Failed to send invitation');
            return null;
          }
        },

        updateMemberRole: async (memberId, newRole) => {
          try {
            const updatedMember = await UnifiedTeamAPI.updateMemberRole(memberId, newRole);
            set((state) => {
              const index = state.members.findIndex(m => m.id === memberId);
              if (index !== -1) {
                state.members[index] = updatedMember;
              }
            });
            toast.success('Member role updated successfully');
            get().loadWorkspaceStats(); // Refresh stats
          } catch (error) {
            console.error('Failed to update member role:', error);
            toast.error('Failed to update member role');
          }
        },

        removeMember: async (memberId) => {
          try {
            await UnifiedTeamAPI.removeMember(memberId);
            set((state) => {
              state.members = state.members.filter(m => m.id !== memberId);
              if (state.selectedMemberId === memberId) {
                state.selectedMemberId = null;
              }
            });
            toast.success('Member removed successfully');
            get().loadWorkspaceStats(); // Refresh stats
          } catch (error) {
            console.error('Failed to remove member:', error);
            toast.error('Failed to remove member');
          }
        },

        resendInvite: async (email) => {
          try {
            await UnifiedTeamAPI.resendInvite(email);
            toast.success(`Invitation resent to ${email}`);
          } catch (error) {
            console.error('Failed to resend invite:', error);
            toast.error('Failed to resend invitation');
          }
        },

        // Team Membership Actions
        addMemberToTeam: async (memberId, teamId, role = 'member') => {
          try {
            await UnifiedTeamAPI.addMemberToTeam(memberId, teamId, role);
            // Refresh data to get updated team memberships
            await get().loadTeams();
            await get().loadMembers();
            toast.success('Member added to team successfully');
          } catch (error) {
            console.error('Failed to add member to team:', error);
            toast.error('Failed to add member to team');
          }
        },

        removeMemberFromTeam: async (memberId, teamId) => {
          try {
            await UnifiedTeamAPI.removeMemberFromTeam(memberId, teamId);
            // Refresh data to get updated team memberships
            await get().loadTeams();
            await get().loadMembers();
            toast.success('Member removed from team successfully');
          } catch (error) {
            console.error('Failed to remove member from team:', error);
            toast.error('Failed to remove member from team');
          }
        },

        updateTeamMemberRole: async (memberId, teamId, role) => {
          try {
            await UnifiedTeamAPI.updateTeamMemberRole(memberId, teamId, role);
            // Refresh data to get updated roles
            await get().loadTeams();
            await get().loadMembers();
            toast.success('Team member role updated successfully');
          } catch (error) {
            console.error('Failed to update team member role:', error);
            toast.error('Failed to update team member role');
          }
        },

        // Settings Actions
        updateTeamSettings: async (settings) => {
          const wsId = get().currentWorkspaceId;
          if (!wsId) return;

          try {
            const updatedSettings = await UnifiedTeamAPI.updateTeamSettings(wsId, settings);
            set((state) => {
              state.teamSettings = updatedSettings;
            });
            toast.success('Team settings updated successfully');
          } catch (error) {
            console.error('Failed to update team settings:', error);
            toast.error('Failed to update team settings');
          }
        },

        // Utility Actions
        performMemberAction: async (action, memberId, data) => {
          const member = get().getMemberById(memberId);
          if (!member) return;

          switch (action) {
            case 'invite':
              await get().inviteMember(data.email, data.role);
              break;
            case 'activate':
            case 'deactivate':
              await get().updateMemberRole(memberId, member.role);
              break;
            case 'remove':
              await get().removeMember(memberId);
              break;
            case 'update_role':
              await get().updateMemberRole(memberId, data.role);
              break;
            case 'resend_invite':
              await get().resendInvite(member.email);
              break;
            case 'assign_to_team':
              await get().addMemberToTeam(memberId, data.teamId, data.role);
              break;
            case 'remove_from_team':
              await get().removeMemberFromTeam(memberId, data.teamId);
              break;
            default:
              console.warn(`Unknown member action: ${action}`);
          }
        },

        performTeamAction: async (action, teamId, data) => {
          switch (action) {
            case 'create':
              await get().createTeam(data);
              break;
            case 'update':
              await get().updateTeam(teamId, data);
              break;
            case 'delete':
              await get().deleteTeam(teamId);
              break;
            case 'archive':
              await get().archiveTeam(teamId);
              break;
            case 'add_member':
              await get().addMemberToTeam(data.memberId, teamId, data.role);
              break;
            case 'remove_member':
              await get().removeMemberFromTeam(data.memberId, teamId);
              break;
            case 'update_member_role':
              await get().updateTeamMemberRole(data.memberId, teamId, data.role);
              break;
            default:
              console.warn(`Unknown team action: ${action}`);
          }
        },

        // Selectors (computed values)
        getFilteredTeams: () => {
          const { teams, teamFilter, searchTerm, sortBy, sortOrder } = get();
          
          // Ensure teams is always an array to prevent filter errors
          if (!teams || !Array.isArray(teams)) {
            console.warn('Teams is not an array, returning empty array');
            return [];
          }
          
          const filtered = teams.filter(team => {
            const matchesSearch = !searchTerm || 
              team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              team.description.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesType = !teamFilter.teamType || team.type === teamFilter.teamType;
            const matchesProject = !teamFilter.projectId || team.projectId === teamFilter.projectId;
            const matchesStatus = !teamFilter.status || team.status === teamFilter.status;
            const matchesPerformance = !teamFilter.minPerformance || team.performance >= teamFilter.minPerformance;
            const matchesWorkload = !teamFilter.maxWorkload || team.workload <= teamFilter.maxWorkload;
            
            return matchesSearch && matchesType && matchesProject && matchesStatus && matchesPerformance && matchesWorkload;
          });

          // Sort teams
          filtered.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
              case 'performance':
                comparison = b.performance - a.performance;
                break;
              case 'workload':
                comparison = b.workload - a.workload;
                break;
              case 'members':
                comparison = b.memberCount - a.memberCount;
                break;
              case 'recent':
                comparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
                break;
              default:
                comparison = a.name.localeCompare(b.name);
            }
            return sortOrder === 'desc' ? comparison : -comparison;
          });

          return filtered;
        },

        getFilteredMembers: () => {
          const { members, memberFilter, searchTerm } = get();
          
          // Ensure members is always an array to prevent filter errors
          if (!members || !Array.isArray(members)) {
            console.warn('Members is not an array, returning empty array');
            return [];
          }
          
          return members.filter(member => {
            const matchesSearch = !searchTerm ||
              member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
              member.role.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesRole = !memberFilter.role || member.role === memberFilter.role;
            const matchesStatus = !memberFilter.status || member.status === memberFilter.status;
            const matchesAvailability = !memberFilter.availability || member.availability === memberFilter.availability;
            const matchesMembershipStatus = !memberFilter.membershipStatus || member.membershipStatus === memberFilter.membershipStatus;
            const matchesTeam = !memberFilter.teamId || member.teamMemberships.some(tm => tm.teamId === memberFilter.teamId);
            const matchesPerformance = !memberFilter.minPerformance || member.performance.performanceScore >= memberFilter.minPerformance;
            const matchesWorkload = !memberFilter.maxWorkload || member.workload.currentLoad <= memberFilter.maxWorkload;
            
            return matchesSearch && matchesRole && matchesStatus && matchesAvailability && 
                   matchesMembershipStatus && matchesTeam && matchesPerformance && matchesWorkload;
          });
        },

        getTeamById: (teamId) => {
          return get().teams.find(team => team.id === teamId);
        },

        getMemberById: (memberId) => {
          return get().members.find(member => member.id === memberId);
        },

        getTeamMembers: (teamId) => {
          return get().members.filter(member => 
            member.teamMemberships.some(tm => tm.teamId === teamId)
          );
        },

        getMembersByRole: (role) => {
          return get().members.filter(member => member.role === role);
        },
      }))
    ),
    {
      name: 'unified-team-store',
    }
  )
);

// Export hooks for easier usage
export const useTeams = () => useUnifiedTeamStore(state => state.getFilteredTeams());
export const useMembers = () => useUnifiedTeamStore(state => state.getFilteredMembers());
export const useWorkspaceStats = () => useUnifiedTeamStore(state => state.workspaceStats);
export const useTeamSettings = () => useUnifiedTeamStore(state => state.teamSettings);
export const useTeamById = (teamId: string) => useUnifiedTeamStore(state => state.getTeamById(teamId));
export const useMemberById = (memberId: string) => useUnifiedTeamStore(state => state.getMemberById(memberId));
export const useTeamMembers = (teamId: string) => useUnifiedTeamStore(state => state.getTeamMembers(teamId));
export const useMembersByRole = (role: TeamRole) => useUnifiedTeamStore(state => state.getMembersByRole(role));

// Export actions for easier usage
export const useTeamActions = () => {
  const store = useUnifiedTeamStore();
  return {
    // Data loading
    loadTeams: store.loadTeams,
    loadMembers: store.loadMembers,
    refreshAll: store.refreshAll,
    
    // Team management
    createTeam: store.createTeam,
    updateTeam: store.updateTeam,
    deleteTeam: store.deleteTeam,
    
    // Member management
    inviteMember: store.inviteMember,
    updateMemberRole: store.updateMemberRole,
    removeMember: store.removeMember,
    
    // Utility actions
    performTeamAction: store.performTeamAction,
    performMemberAction: store.performMemberAction,
  };
};