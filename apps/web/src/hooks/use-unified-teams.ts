// Unified Team Management Hooks
// React Query integration with unified team store

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  useUnifiedTeamStore,
  useTeams,
  useMembers,
  useWorkspaceStats,
  useTeamSettings,
  useTeamActions
} from '@/store/unified-team-store';
import { UnifiedTeamAPI } from '@/lib/api/unified-team-api';
import {
  UnifiedTeam,
  UnifiedTeamMember,
  TeamRole,
  WorkspaceStats,
  TeamSettings
} from '@/types/unified-team';
import useWorkspaceStore from '@/store/workspace';
import { useRBACAuth } from '@/lib/permissions/provider';

// Main hook for unified team management
export const useUnifiedTeamManagement = (workspaceId?: string) => {
  const workspace = useWorkspaceStore(state => state.workspace);
  const currentWorkspaceId = workspaceId || workspace?.id;
  
  const {
    setWorkspaceId,
    loadTeams,
    loadMembers,
    loadWorkspaceStats,
    loadTeamSettings,
    refreshAll,
    isLoading,
    isLoadingTeams,
    isLoadingMembers,
    isLoadingStats,
    error
  } = useUnifiedTeamStore();

  const teams = useTeams();
  const members = useMembers();
  const stats = useWorkspaceStats();
  const settings = useTeamSettings();
  const actions = useTeamActions();

  // Initialize workspace and load data
  useEffect(() => {
    if (currentWorkspaceId) {
      setWorkspaceId(currentWorkspaceId);
      refreshAll(currentWorkspaceId);
    }
  }, [currentWorkspaceId, setWorkspaceId, refreshAll]);

  return {
    // Data
    teams,
    members,
    stats,
    settings,
    
    // Loading states
    isLoading,
    isLoadingTeams,
    isLoadingMembers,
    isLoadingStats,
    error,
    
    // Actions
    ...actions,
    refresh: () => refreshAll(currentWorkspaceId),
    
    // Utilities
    workspaceId: currentWorkspaceId,
  };
};

// Hook for team-specific operations
export const useTeamOperations = () => {
  const queryClient = useQueryClient();
  const { createTeam, updateTeam, deleteTeam, performTeamAction } = useTeamActions();

  const createTeamMutation = useMutation({
    mutationFn: (teamData: Partial<UnifiedTeam>) => createTeam(teamData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-stats'] });
    },
  });

  const updateTeamMutation = useMutation({
    mutationFn: ({ teamId, updates }: { teamId: string; updates: Partial<UnifiedTeam> }) =>
      updateTeam(teamId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: (teamId: string) => deleteTeam(teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-stats'] });
    },
  });

  const teamActionMutation = useMutation({
    mutationFn: ({ action, teamId, data }: { action: string; teamId: string; data?: any }) =>
      performTeamAction(action as any, teamId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });

  return {
    createTeam: createTeamMutation.mutateAsync,
    updateTeam: updateTeamMutation.mutateAsync,
    deleteTeam: deleteTeamMutation.mutateAsync,
    performAction: teamActionMutation.mutateAsync,
    
    isCreating: createTeamMutation.isPending,
    isUpdating: updateTeamMutation.isPending,
    isDeleting: deleteTeamMutation.isPending,
    isPerformingAction: teamActionMutation.isPending,
  };
};

// Hook for member-specific operations
export const useMemberOperations = () => {
  const queryClient = useQueryClient();
  const { 
    inviteMember, 
    updateMemberRole, 
    removeMember, 
    resendInvite,
    performMemberAction 
  } = useTeamActions();

  const inviteMemberMutation = useMutation({
    mutationFn: ({ email, role }: { email: string; role: TeamRole }) =>
      inviteMember(email, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-stats'] });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: TeamRole }) =>
      updateMemberRole(memberId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-stats'] });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => removeMember(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-stats'] });
    },
  });

  const resendInviteMutation = useMutation({
    mutationFn: (email: string) => resendInvite(email),
  });

  const memberActionMutation = useMutation({
    mutationFn: ({ action, memberId, data }: { action: string; memberId: string; data?: any }) =>
      performMemberAction(action as any, memberId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });

  return {
    inviteMember: inviteMemberMutation.mutateAsync,
    updateRole: updateRoleMutation.mutateAsync,
    removeMember: removeMemberMutation.mutateAsync,
    resendInvite: resendInviteMutation.mutateAsync,
    performAction: memberActionMutation.mutateAsync,
    
    isInviting: inviteMemberMutation.isPending,
    isUpdatingRole: updateRoleMutation.isPending,
    isRemoving: removeMemberMutation.isPending,
    isResending: resendInviteMutation.isPending,
    isPerformingAction: memberActionMutation.isPending,
  };
};

// Legacy hook adapters for backward compatibility
export const useUnifiedTeams = (workspaceId?: string) => {
  const { teams, isLoadingTeams } = useUnifiedTeamManagement(workspaceId);
  
  return {
    data: teams,
    isLoading: isLoadingTeams,
    error: null, // TODO: Add error handling
  };
};

export const useUnifiedWorkspaceUsers = (workspaceId?: string) => {
  const { members, isLoadingMembers } = useUnifiedTeamManagement(workspaceId);
  
  return {
    data: members,
    isLoading: isLoadingMembers,
    error: null, // TODO: Add error handling
  };
};

export const useUnifiedWorkspaceStats = (workspaceId?: string) => {
  const { stats, isLoadingStats } = useUnifiedTeamManagement(workspaceId);
  
  return {
    data: stats,
    isLoading: isLoadingStats,
    error: null, // TODO: Add error handling
  };
};

// Hook for real-time online status
export const useOnlineMembers = (workspaceId?: string) => {
  const workspace = useWorkspaceStore(state => state.workspace);
  const currentWorkspaceId = workspaceId || workspace?.id;

  // Import RBAC auth hook
  const { user } = useRBACAuth();

  return useQuery({
    queryKey: ['online-members', currentWorkspaceId],
    queryFn: () => UnifiedTeamAPI.getOnlineMembers(currentWorkspaceId!),
    enabled: !!currentWorkspaceId && !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 25000, // Consider stale after 25 seconds
  });
};

// Hook for team settings management
export const useTeamSettingsManagement = (workspaceId?: string) => {
  const workspace = useWorkspaceStore(state => state.workspace);
  const currentWorkspaceId = workspaceId || workspace?.id;
  const queryClient = useQueryClient();
  const { user } = useRBACAuth();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['team-settings', currentWorkspaceId],
    queryFn: () => UnifiedTeamAPI.getTeamSettings(currentWorkspaceId!),
    enabled: !!currentWorkspaceId && !!user,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (updates: Partial<TeamSettings>) =>
      UnifiedTeamAPI.updateTeamSettings(currentWorkspaceId!, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-settings'] });
    },
  });

  return {
    settings,
    isLoading,
    updateSettings: updateSettingsMutation.mutateAsync,
    isUpdating: updateSettingsMutation.isPending,
  };
};

// Hook for filtering and searching
export const useTeamFilters = () => {
  const {
    teamFilter,
    memberFilter,
    searchTerm,
    sortBy,
    sortOrder,
    setTeamFilter,
    setMemberFilter,
    setSearchTerm,
    setSortBy,
    setSortOrder,
    clearFilters,
  } = useUnifiedTeamStore();

  return {
    // Current state
    teamFilter,
    memberFilter,
    searchTerm,
    sortBy,
    sortOrder,
    
    // Actions
    setTeamFilter,
    setMemberFilter,
    setSearchTerm,
    setSortBy,
    setSortOrder,
    clearFilters,
  };
};

// Hook for view mode management
export const useTeamViewMode = () => {
  const {
    viewMode,
    selectedTeamId,
    selectedMemberId,
    setViewMode,
    setSelectedTeam,
    setSelectedMember,
  } = useUnifiedTeamStore();

  return {
    viewMode,
    selectedTeamId,
    selectedMemberId,
    setViewMode,
    setSelectedTeam,
    setSelectedMember,
  };
};