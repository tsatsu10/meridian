import { useCallback, useMemo, useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from './index';

export interface UseTeamReturn {
  // State
  currentTeam: any;
  teams: any[];
  members: any[];
  channels: any[];
  meetings: any[];
  activities: any[];
  analytics: any;
  loading: any;
  errors: any;

  // Actions
  loadTeams: () => Promise<any>;
  loadTeam: (teamId: string) => Promise<any>;
  createTeam: (data: any) => Promise<any>;
  updateTeam: (teamId: string, data: any) => Promise<any>;
  deleteTeam: (teamId: string) => Promise<any>;
  
  // Member management
  loadMembers: (teamId: string) => Promise<any>;
  addMember: (teamId: string, userId: string, role: string) => Promise<any>;
  removeMember: (teamId: string, userId: string) => Promise<any>;
  updateMemberRole: (teamId: string, userId: string, role: string) => Promise<any>;
  
  // Channels
  loadChannels: (teamId: string) => Promise<any>;
  createChannel: (teamId: string, data: any) => Promise<any>;
  updateChannel: (channelId: string, data: any) => Promise<any>;
  deleteChannel: (channelId: string) => Promise<any>;
  
  // Meetings
  loadMeetings: (teamId: string) => Promise<any>;
  scheduleMeeting: (teamId: string, data: any) => Promise<any>;
  updateMeeting: (meetingId: string, data: any) => Promise<any>;
  cancelMeeting: (meetingId: string) => Promise<any>;
  
  // Analytics
  loadAnalytics: (teamId: string) => Promise<any>;
  generateReport: (teamId: string, type: string) => Promise<any>;
  
  // Activities
  loadActivities: (teamId: string) => Promise<any>;
  
  // UI actions
  setActiveTeam: (teamId: string | null) => void;
  setFilter: (filter: any) => void;
  setView: (view: string) => void;
  
  // Utilities
  getTeamById: (teamId: string) => any;
  clearErrors: () => void;
  updateTeamLocally: (teamId: string, data: any) => void;
  
  // Reset
  reset: () => void;
}

export function useTeam(): UseTeamReturn {
  const dispatch = useAppDispatch();
  
  // Mock implementation - would use actual selectors
  const teams = useAppSelector(state => state.team?.teams || []);
  const currentTeam = useAppSelector(state => state.team?.currentTeam || null);
  const members = useAppSelector(state => state.team?.members || []);
  const channels = useAppSelector(state => state.team?.channels || []);
  const meetings = useAppSelector(state => state.team?.meetings || []);
  const activities = useAppSelector(state => state.team?.activities || []);
  const analytics = useAppSelector(state => state.team?.analytics || {});
  const loading = useAppSelector(state => state.team?.loading || {});
  const errors = useAppSelector(state => state.team?.errors || {});

  // Action creators
  const handleLoadTeams = useCallback(async () => {
    try {
      // Mock implementation
      const result = await dispatch({ type: 'team/loadTeams' });
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  const handleLoadTeam = useCallback(async (teamId: string) => {
    try {
      const result = await dispatch({ type: 'team/loadTeam', payload: teamId });
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  const handleCreateTeam = useCallback(async (data: any) => {
    try {
      const result = await dispatch({ type: 'team/createTeam', payload: data });
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  const handleUpdateTeam = useCallback(async (teamId: string, data: any) => {
    try {
      const result = await dispatch({ type: 'team/updateTeam', payload: { teamId, data } });
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  const handleDeleteTeam = useCallback(async (teamId: string) => {
    try {
      const result = await dispatch({ type: 'team/deleteTeam', payload: teamId });
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  // Member management
  const handleLoadMembers = useCallback(async (teamId: string) => {
    try {
      const result = await dispatch({ type: 'team/loadMembers', payload: teamId });
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  const handleAddMember = useCallback(async (teamId: string, userId: string, role: string) => {
    try {
      const result = await dispatch({ type: 'team/addMember', payload: { teamId, userId, role } });
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  const handleRemoveMember = useCallback(async (teamId: string, userId: string) => {
    try {
      const result = await dispatch({ type: 'team/removeMember', payload: { teamId, userId } });
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  const handleUpdateMemberRole = useCallback(async (teamId: string, userId: string, role: string) => {
    try {
      const result = await dispatch({ type: 'team/updateMemberRole', payload: { teamId, userId, role } });
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  // Channels
  const handleLoadChannels = useCallback(async (teamId: string) => {
    try {
      const result = await dispatch({ type: 'team/loadChannels', payload: teamId });
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  const handleCreateChannel = useCallback(async (teamId: string, data: any) => {
    try {
      const result = await dispatch({ type: 'team/createChannel', payload: { teamId, data } });
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  const handleUpdateChannel = useCallback(async (channelId: string, data: any) => {
    try {
      const result = await dispatch({ type: 'team/updateChannel', payload: { channelId, data } });
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  const handleDeleteChannel = useCallback(async (channelId: string) => {
    try {
      const result = await dispatch({ type: 'team/deleteChannel', payload: channelId });
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  // Meetings
  const handleLoadMeetings = useCallback(async (teamId: string) => {
    try {
      const result = await dispatch({ type: 'team/loadMeetings', payload: teamId });
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  const handleScheduleMeeting = useCallback(async (teamId: string, data: any) => {
    try {
      const result = await dispatch({ type: 'team/scheduleMeeting', payload: { teamId, data } });
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  const handleUpdateMeeting = useCallback(async (meetingId: string, data: any) => {
    try {
      const result = await dispatch({ type: 'team/updateMeeting', payload: { meetingId, data } });
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  const handleCancelMeeting = useCallback(async (meetingId: string) => {
    try {
      const result = await dispatch({ type: 'team/cancelMeeting', payload: meetingId });
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  // Analytics
  const handleLoadAnalytics = useCallback(async (teamId: string) => {
    try {
      const result = await dispatch({ type: 'team/loadAnalytics', payload: teamId });
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  const handleGenerateReport = useCallback(async (teamId: string, type: string) => {
    try {
      const result = await dispatch({ type: 'team/generateReport', payload: { teamId, type } });
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  // Activities
  const handleLoadActivities = useCallback(async (teamId: string) => {
    try {
      const result = await dispatch({ type: 'team/loadActivities', payload: teamId });
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  // UI actions
  const handleSetActiveTeam = useCallback((teamId: string | null) => {
    dispatch({ type: 'team/setActiveTeam', payload: teamId });
  }, [dispatch]);

  const handleSetFilter = useCallback((filter: any) => {
    dispatch({ type: 'team/setFilter', payload: filter });
  }, [dispatch]);

  const handleSetView = useCallback((view: string) => {
    dispatch({ type: 'team/setView', payload: view });
  }, [dispatch]);

  // Utilities
  const getTeamById = useCallback((teamId: string) => {
    return teams.find(team => team.id === teamId) || null;
  }, [teams]);

  const handleClearErrors = useCallback(() => {
    dispatch({ type: 'team/clearErrors' });
  }, [dispatch]);

  const handleUpdateTeamLocally = useCallback((teamId: string, data: any) => {
    dispatch({ type: 'team/updateTeamLocally', payload: { teamId, data } });
  }, [dispatch]);

  const handleReset = useCallback(() => {
    dispatch({ type: 'team/resetTeam' });
  }, [dispatch]);

  return {
    // State
    currentTeam,
    teams,
    members,
    channels,
    meetings,
    activities,
    analytics,
    loading,
    errors,

    // Actions
    loadTeams: handleLoadTeams,
    loadTeam: handleLoadTeam,
    createTeam: handleCreateTeam,
    updateTeam: handleUpdateTeam,
    deleteTeam: handleDeleteTeam,

    // Member management
    loadMembers: handleLoadMembers,
    addMember: handleAddMember,
    removeMember: handleRemoveMember,
    updateMemberRole: handleUpdateMemberRole,

    // Channels
    loadChannels: handleLoadChannels,
    createChannel: handleCreateChannel,
    updateChannel: handleUpdateChannel,
    deleteChannel: handleDeleteChannel,

    // Meetings
    loadMeetings: handleLoadMeetings,
    scheduleMeeting: handleScheduleMeeting,
    updateMeeting: handleUpdateMeeting,
    cancelMeeting: handleCancelMeeting,

    // Analytics
    loadAnalytics: handleLoadAnalytics,
    generateReport: handleGenerateReport,

    // Activities
    loadActivities: handleLoadActivities,

    // UI actions
    setActiveTeam: handleSetActiveTeam,
    setFilter: handleSetFilter,
    setView: handleSetView,

    // Utilities
    getTeamById,
    clearErrors: handleClearErrors,
    updateTeamLocally: handleUpdateTeamLocally,

    // Reset
    reset: handleReset,
  };
}

// Enhanced hook with team context and automatic loading
export function useTeamWithContext(teamId?: string): UseTeamReturn & {
  isLoading: boolean;
  hasError: boolean;
  retryCount: number;
  retry: () => void;
} {
  const team = useTeam();
  const [retryCount, setRetryCount] = useState(0);

  // Auto-load team data when team ID changes
  useEffect(() => {
    if (teamId && teamId !== team.currentTeam?.id) {
      const loadData = async () => {
        try {
          await team.loadTeam(teamId);
          await Promise.all([
            team.loadMembers(teamId),
            team.loadChannels(teamId),
            team.loadMeetings(teamId),
            team.loadActivities(teamId),
            team.loadAnalytics(teamId),
          ]);
        } catch (error) {
          console.error('Failed to load team:', error);
        }
      };
      
      loadData();
    }
  }, [teamId, team.currentTeam?.id]);

  // Auto-load teams list if empty
  useEffect(() => {
    if (team.teams.length === 0 && !team.loading.teams) {
      team.loadTeams().catch(error => {
        console.error('Failed to load teams:', error);
      });
    }
  }, [team.teams.length, team.loading.teams, team.loadTeams]);

  const isLoading = useMemo(() => {
    return Object.values(team.loading).some(loading => loading);
  }, [team.loading]);

  const hasError = useMemo(() => {
    return Object.values(team.errors).some(error => error !== null);
  }, [team.errors]);

  const retry = useCallback(() => {
    setRetryCount(prev => prev + 1);
    team.clearErrors();
    
    if (teamId) {
      team.loadTeam(teamId).catch(error => {
        console.error('Retry failed:', error);
      });
    } else {
      team.loadTeams().catch(error => {
        console.error('Retry failed:', error);
      });
    }
  }, [teamId, team]);

  return {
    ...team,
    isLoading,
    hasError,
    retryCount,
    retry,
  };
}

// Hook for team collaboration features
export function useTeamCollaboration(teamId: string) {
  const team = useTeam();

  // Auto-load collaboration data
  useEffect(() => {
    if (teamId) {
      const loadData = async () => {
        try {
          await Promise.all([
            team.loadChannels(teamId),
            team.loadActivities(teamId),
          ]);
        } catch (error) {
          console.error('Failed to load team collaboration data:', error);
        }
      };
      
      loadData();
    }
  }, [teamId, team.loadChannels, team.loadActivities]);

  const createQuickChannel = useCallback(async (name: string, description?: string) => {
    return team.createChannel(teamId, {
      name,
      description,
      type: 'text',
      isPrivate: false,
    });
  }, [teamId, team]);

  const scheduleQuickMeeting = useCallback(async (title: string, datetime: Date, duration: number) => {
    return team.scheduleMeeting(teamId, {
      title,
      datetime,
      duration,
      type: 'video',
    });
  }, [teamId, team]);

  const getRecentActivities = useMemo(() => {
    return team.activities.slice(0, 10); // Last 10 activities
  }, [team.activities]);

  return {
    channels: team.channels,
    activities: getRecentActivities,
    meetings: team.meetings,
    loading: {
      channels: team.loading.channels,
      activities: team.loading.activities,
      meetings: team.loading.meetings,
    },
    createQuickChannel,
    scheduleQuickMeeting,
    createChannel: (data: any) => team.createChannel(teamId, data),
    scheduleMeeting: (data: any) => team.scheduleMeeting(teamId, data),
  };
}

// Hook for team analytics
export function useTeamAnalytics(teamId: string) {
  const team = useTeam();

  // Auto-load analytics when team changes
  useEffect(() => {
    if (teamId) {
      team.loadAnalytics(teamId).catch(error => {
        console.error('Failed to load team analytics:', error);
      });
    }
  }, [teamId, team.loadAnalytics]);

  // Auto-refresh analytics periodically
  useEffect(() => {
    if (!teamId) return;

    const interval = setInterval(() => {
      team.loadAnalytics(teamId).catch(error => {
        console.error('Failed to refresh team analytics:', error);
      });
    }, 300000); // Refresh every 5 minutes

    return () => clearInterval(interval);
  }, [teamId, team.loadAnalytics]);

  const generateReport = useCallback(async (type: string) => {
    return team.generateReport(teamId, type);
  }, [teamId, team.generateReport]);

  return {
    analytics: team.analytics,
    loading: team.loading.analytics,
    error: team.errors.analytics,
    generateReport,
    refresh: () => team.loadAnalytics(teamId),
  };
}