import { 
  useUIStore, 
  useTasksStore, 
  useCommunicationStore, 
  useSettingsStore, 
  useCacheStore, 
  useTeamsStore 
} from './compatibility-layer';

// Legacy hook names - these provide backwards compatibility
export const useUI = useUIStore;
export const useTasks = useTasksStore;
export const useCommunication = useCommunicationStore;
export const useSettings = useSettingsStore;
export const useCache = useCacheStore;
export const useTeam = useTeamsStore;
export const useTeams = useTeamsStore; // Alias for plural

// Specific legacy Redux hooks with compatibility layer
export function useTheme() {
  const store = useUIStore();
  return {
    theme: store.theme,
    setTheme: store.setTheme,
    toggleDarkMode: store.toggleDarkMode,
    isDark: store.theme.mode === 'dark',
    isLight: store.theme.mode === 'light',
  };
}

export function useSidebar() {
  const store = useUIStore();
  return {
    sidebar: store.sidebar,
    isCollapsed: store.sidebar.isCollapsed,
    width: store.sidebar.width,
    toggleSidebar: store.toggleSidebar,
    setSidebarWidth: store.setSidebarWidth,
    collapseSidebar: () => store.setSidebar({ isCollapsed: true }),
    expandSidebar: () => store.setSidebar({ isCollapsed: false }),
  };
}

export function useModals() {
  const store = useUIStore();
  return {
    modals: store.modals,
    activeModals: store.modals.filter(modal => modal.isOpen),
    openModal: store.openModal,
    closeModal: store.closeModal,
    closeAllModals: store.closeAllModals,
    isAnyModalOpen: store.modals.some(modal => modal.isOpen),
  };
}

export function useToasts() {
  const store = useUIStore();
  return {
    toasts: store.toasts,
    addToast: store.addToast,
    removeToast: store.removeToast,
    clearToasts: store.clearToasts,
    addSuccess: (message: string) => store.addToast({ type: 'success', message }),
    addError: (message: string) => store.addToast({ type: 'error', message }),
    addWarning: (message: string) => store.addToast({ type: 'warning', message }),
    addInfo: (message: string) => store.addToast({ type: 'info', message }),
  };
}

export function useTaskFilters() {
  const store = useTasksStore();
  return {
    filters: store.filters,
    setFilters: store.setFilters,
    clearFilters: store.clearFilters,
    filteredTasks: store.getFilteredTasks(),
    setStatus: (status: string) => store.setFilters({ status }),
    setPriority: (priority: string) => store.setFilters({ priority }),
    setAssignee: (assignee: string) => store.setFilters({ assignee }),
    setSearch: (search: string) => store.setFilters({ search }),
  };
}

export function useTaskComments() {
  const store = useTasksStore();
  return {
    comments: store.comments,
    loadTaskComments: store.loadTaskComments,
    addTaskComment: store.addTaskComment,
    updateTaskComment: store.updateTaskComment,
    deleteTaskComment: store.deleteTaskComment,
    loadingComments: store.loading.comments,
  };
}

export function useMessages() {
  const store = useCommunicationStore();
  return {
    messages: store.messages,
    sendMessage: store.sendMessage,
    loadMessages: store.loadMessages,
    editMessage: store.editMessage,
    deleteMessage: store.deleteMessage,
    loadingMessages: store.loading.messages,
    optimisticMessages: store.optimisticMessages,
  };
}

export function useChannels() {
  const store = useCommunicationStore();
  return {
    channels: store.channels,
    currentChannel: store.currentChannel,
    createChannel: store.createChannel,
    updateChannel: store.updateChannel,
    deleteChannel: store.deleteChannel,
    joinChannel: store.joinChannel,
    leaveChannel: store.leaveChannel,
    setCurrentChannel: store.setCurrentChannel,
    loadingChannels: store.loading.channels,
  };
}

export function usePresence() {
  const store = useCommunicationStore();
  return {
    userPresence: store.userPresence,
    presence: store.presence,
    updateUserPresence: store.updateUserPresence,
    setUserStatus: store.setUserStatus,
    startTyping: store.startTyping,
    stopTyping: store.stopTyping,
    isTyping: (userId: string, channelId: string) => 
      store.typingUsers[channelId]?.some(user => user.userId === userId) || false,
  };
}

export function useUserPreferences() {
  const store = useSettingsStore();
  return {
    preferences: store.preferences,
    updatePreferences: (updates: any) => store.updateSettings({ preferences: updates }),
    theme: store.theme,
    notifications: store.notifications.preferences,
    privacy: store.privacy,
  };
}

export function useNotificationSettings() {
  const store = useSettingsStore();
  return {
    settings: store.notifications,
    updateSettings: (updates: any) => 
      store.updateSettings({ notifications: { ...store.notifications, ...updates } }),
    preferences: store.notifications.preferences,
    channels: store.notifications.channels,
    isEnabled: (type: string) => store.notifications.preferences[type] || false,
    enable: (type: string) => 
      store.updateSettings({ 
        notifications: { 
          ...store.notifications, 
          preferences: { ...store.notifications.preferences, [type]: true } 
        } 
      }),
    disable: (type: string) => 
      store.updateSettings({ 
        notifications: { 
          ...store.notifications, 
          preferences: { ...store.notifications.preferences, [type]: false } 
        } 
      }),
  };
}

export function useTeamMembers() {
  const store = useTeamsStore();
  return {
    members: store.members,
    loadMembers: store.loadMembers,
    inviteMember: store.inviteMember,
    removeMember: store.removeMember,
    updateMemberRole: store.updateMemberRole,
    loadingMembers: store.loading.members,
    getMemberById: (memberId: string) => 
      store.members.find(member => member.id === memberId),
    getMembersByRole: (role: string) => 
      store.members.filter(member => member.role === role),
  };
}

export function useTeamAnalytics() {
  const store = useTeamsStore();
  return {
    analytics: store.analytics,
    loadAnalytics: store.loadAnalytics,
    generateTeamReport: store.generateTeamReport,
    loadingAnalytics: store.loading.analytics,
    productivity: store.analytics.productivity,
    workload: store.analytics.workload,
    skills: store.analytics.skills,
  };
}

// Legacy selector functions for components that access state directly
export function selectTheme(state: any) {
  const store = useUIStore();
  return store.theme;
}

export function selectTasks(state: any) {
  const store = useTasksStore();
  return store.tasks;
}

export function selectCurrentChannel(state: any) {
  const store = useCommunicationStore();
  return store.currentChannel;
}

export function selectTeams(state: any) {
  const store = useTeamsStore();
  return store.teams;
}

// Migration helper hooks
export function useLegacyCompat() {
  return {
    // UI
    useTheme,
    useSidebar,
    useModals,
    useToasts,
    
    // Tasks
    useTaskFilters,
    useTaskComments,
    
    // Communication
    useMessages,
    useChannels,
    usePresence,
    
    // Settings
    useUserPreferences,
    useNotificationSettings,
    
    // Teams
    useTeamMembers,
    useTeamAnalytics,
    
    // Selectors
    selectTheme,
    selectTasks,
    selectCurrentChannel,
    selectTeams,
  };
}