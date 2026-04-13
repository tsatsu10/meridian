import { useAppSelector, useAppDispatch } from '../hooks/index';
import { useUIStore as useUIStoreZustand } from '../consolidated/ui';
import { useTasksStore as useTasksStoreZustand } from '../consolidated/tasks';
import { useConsolidatedCommunicationStore } from '../consolidated/communication';
import { useConsolidatedSettingsStore } from '../consolidated/settings';
import { useConsolidatedCacheStore } from '../consolidated/cache';
import { useConsolidatedTeamsStore } from '../consolidated/teams';
import { logger } from "../../lib/logger";

type MigrationPhase = 'legacy' | 'transition' | 'consolidated';

interface MigrationConfig {
  phase: MigrationPhase;
  enabledStores: {
    ui: boolean;
    tasks: boolean;
    communication: boolean;
    settings: boolean;
    cache: boolean;
    teams: boolean;
  };
  featureFlags: {
    useNewTasksSystem: boolean;
    useNewCommunicationSystem: boolean;
    useNewUISystem: boolean;
    useNewSettingsSystem: boolean;
    useNewCacheSystem: boolean;
    useNewTeamsSystem: boolean;
  };
}

const DEFAULT_MIGRATION_CONFIG: MigrationConfig = {
  phase: 'transition',
  enabledStores: {
    ui: true,
    tasks: true,
    communication: true,
    settings: true,
    cache: true,
    teams: true,
  },
  featureFlags: {
    useNewTasksSystem: true,
    useNewCommunicationSystem: true,
    useNewUISystem: true,
    useNewSettingsSystem: true,
    useNewCacheSystem: true,
    useNewTeamsSystem: true,
  },
};

class MigrationManager {
  private config: MigrationConfig = DEFAULT_MIGRATION_CONFIG;
  private migrationCallbacks: Array<() => void> = [];

  setConfig(config: Partial<MigrationConfig>): void {
    this.config = { ...this.config, ...config };
    this.notifyMigrationChange();
  }

  getConfig(): MigrationConfig {
    return this.config;
  }

  setPhase(phase: MigrationPhase): void {
    this.config.phase = phase;
    
    if (phase === 'legacy') {
      // Disable all new stores
      this.config.enabledStores = Object.keys(this.config.enabledStores).reduce(
        (acc, key) => ({ ...acc, [key]: false }),
        {} as typeof this.config.enabledStores
      );
      this.config.featureFlags = Object.keys(this.config.featureFlags).reduce(
        (acc, key) => ({ ...acc, [key]: false }),
        {} as typeof this.config.featureFlags
      );
    } else if (phase === 'consolidated') {
      // Enable all new stores
      this.config.enabledStores = Object.keys(this.config.enabledStores).reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {} as typeof this.config.enabledStores
      );
      this.config.featureFlags = Object.keys(this.config.featureFlags).reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {} as typeof this.config.featureFlags
      );
    }
    
    this.notifyMigrationChange();
  }

  onMigrationChange(callback: () => void): () => void {
    this.migrationCallbacks.push(callback);
    return () => {
      const index = this.migrationCallbacks.indexOf(callback);
      if (index > -1) {
        this.migrationCallbacks.splice(index, 1);
      }
    };
  }

  private notifyMigrationChange(): void {
    this.migrationCallbacks.forEach(callback => callback());
  }
}

export const migrationManager = new MigrationManager();

export function useUIStore() {
  const config = migrationManager.getConfig();
  const dispatch = useAppDispatch();

  // Use imported Zustand store hook
  const zustandStore = useUIStoreZustand();

  // Legacy Redux selector fallbacks
  const legacyTheme = useAppSelector(state => state.ui?.theme);
  const legacySidebar = useAppSelector(state => state.ui?.sidebar);
  const legacyModals = useAppSelector(state => state.ui?.modals);

  if (!config.featureFlags.useNewUISystem || config.phase === 'legacy') {
    return {
      ...zustandStore,
      // Override with legacy Redux actions
      setTheme: (theme: any) => dispatch({ type: 'ui/setTheme', payload: theme }),
      toggleSidebar: () => dispatch({ type: 'ui/toggleSidebar' }),
      openModal: (modal: any) => dispatch({ type: 'ui/openModal', payload: modal }),
      closeModal: (modalId: string) => dispatch({ type: 'ui/closeModal', payload: modalId }),
      // Use legacy state when available
      theme: legacyTheme || zustandStore.theme,
      sidebar: legacySidebar || zustandStore.sidebar,
      modals: legacyModals || zustandStore.modals,
    };
  }

  return zustandStore;
}

export function useTasksStore() {
  const config = migrationManager.getConfig();
  const dispatch = useAppDispatch();

  // Use imported Zustand store hook
  const zustandStore = useTasksStoreZustand();
  
  // Legacy Redux selector fallbacks
  const legacyTasks = useAppSelector(state => state.tasks?.tasks);
  const legacyLoading = useAppSelector(state => state.tasks?.loading);
  const legacyFilters = useAppSelector(state => state.tasks?.filters);
  
  if (!config.featureFlags.useNewTasksSystem || config.phase === 'legacy') {
    return {
      ...zustandStore,
      // Override with legacy Redux actions
      loadTasks: async (params?: any) => {
        dispatch({ type: 'tasks/loadTasks', payload: params });
      },
      createTask: async (data: any) => {
        const result = await dispatch({ type: 'tasks/createTask', payload: data });
        return result.payload;
      },
      updateTask: async (taskId: string, data: any) => {
        await dispatch({ type: 'tasks/updateTask', payload: { taskId, data } });
      },
      // Use legacy state when available
      tasks: legacyTasks || zustandStore.tasks,
      loading: legacyLoading || zustandStore.loading,
      filters: legacyFilters || zustandStore.filters,
    };
  }
  
  return zustandStore;
}

export function useCommunicationStore() {
  const config = migrationManager.getConfig();
  const dispatch = useAppDispatch();

  // Use imported Zustand store hook
  const zustandStore = useConsolidatedCommunicationStore();
  
  // Legacy Redux selector fallbacks
  const legacyMessages = useAppSelector(state => state.communication?.messages);
  const legacyChannels = useAppSelector(state => state.communication?.channels);
  const legacyPresence = useAppSelector(state => state.communication?.presence);
  
  if (!config.featureFlags.useNewCommunicationSystem || config.phase === 'legacy') {
    return {
      ...zustandStore,
      // Override with legacy Redux actions
      sendMessage: async (channelId: string, content: string, options?: any) => {
        const result = await dispatch({ 
          type: 'communication/sendMessage', 
          payload: { channelId, content, options } 
        });
        return result.payload;
      },
      loadMessages: async (channelId: string, options?: any) => {
        await dispatch({ 
          type: 'communication/loadMessages', 
          payload: { channelId, options } 
        });
      },
      // Use legacy state when available
      messages: legacyMessages || zustandStore.messages,
      channels: legacyChannels || zustandStore.channels,
      presence: legacyPresence || zustandStore.presence,
    };
  }
  
  return zustandStore;
}

export function useSettingsStore() {
  const config = migrationManager.getConfig();
  const zustandStore = useConsolidatedSettingsStore();
  const dispatch = useAppDispatch();
  
  // Legacy Redux selector fallbacks
  const legacySettings = useAppSelector(state => state.settings);
  const legacyPreferences = useAppSelector(state => state.userPreferences);
  
  if (!config.featureFlags.useNewSettingsSystem || config.phase === 'legacy') {
    return {
      ...zustandStore,
      // Override with legacy Redux actions
      updateSettings: (updates: any) => {
        dispatch({ type: 'settings/updateSettings', payload: updates });
      },
      loadSettings: async () => {
        await dispatch({ type: 'settings/loadSettings' });
      },
      // Use legacy state when available
      theme: legacySettings?.theme || zustandStore.theme,
      notifications: legacySettings?.notifications || zustandStore.notifications,
      preferences: legacyPreferences || zustandStore.preferences,
    };
  }
  
  return zustandStore;
}

export function useCacheStore() {
  const config = migrationManager.getConfig();
  const zustandStore = useConsolidatedCacheStore();
  
  if (!config.featureFlags.useNewCacheSystem || config.phase === 'legacy') {
    // Fallback to simple localStorage-based cache for legacy mode
    return {
      ...zustandStore,
      get: <T = any>(key: string): T | null => {
        try {
          const item = localStorage.getItem(`cache_${key}`);
          return item ? JSON.parse(item) : null;
        } catch {
          return null;
        }
      },
      set: <T = any>(key: string, value: T): boolean => {
        try {
          localStorage.setItem(`cache_${key}`, JSON.stringify(value));
          return true;
        } catch {
          return false;
        }
      },
      remove: (key: string): boolean => {
        try {
          localStorage.removeItem(`cache_${key}`);
          return true;
        } catch {
          return false;
        }
      },
    };
  }
  
  return zustandStore;
}

export function useTeamsStore() {
  const config = migrationManager.getConfig();
  const zustandStore = useConsolidatedTeamsStore();
  const dispatch = useAppDispatch();
  
  // Legacy Redux selector fallbacks
  const legacyTeams = useAppSelector(state => state.team?.teams);
  const legacyCurrentTeam = useAppSelector(state => state.team?.currentTeam);
  const legacyMembers = useAppSelector(state => state.team?.members);
  
  if (!config.featureFlags.useNewTeamsSystem || config.phase === 'legacy') {
    return {
      ...zustandStore,
      // Override with legacy Redux actions
      loadTeams: async (workspaceId?: string) => {
        await dispatch({ type: 'team/loadTeams', payload: workspaceId });
      },
      createTeam: async (data: any) => {
        const result = await dispatch({ type: 'team/createTeam', payload: data });
        return result.payload;
      },
      updateTeam: async (teamId: string, data: any) => {
        await dispatch({ type: 'team/updateTeam', payload: { teamId, data } });
      },
      // Use legacy state when available
      teams: legacyTeams || zustandStore.teams,
      currentTeam: legacyCurrentTeam || zustandStore.currentTeam,
      members: legacyMembers || zustandStore.members,
    };
  }
  
  return zustandStore;
}

export function useDataMigration() {
  return {
    migrateUIData: () => {
      const legacyTheme = localStorage.getItem('theme');
      const legacySidebar = localStorage.getItem('sidebarCollapsed');
      
      if (legacyTheme || legacySidebar) {
        // Use Zustand store directly
        
        if (legacyTheme) {
          uiStore.setTheme({ mode: legacyTheme as any });
          localStorage.removeItem('theme');
        }
        
        if (legacySidebar) {
          uiStore.setSidebar({ 
            isCollapsed: JSON.parse(legacySidebar) 
          });
          localStorage.removeItem('sidebarCollapsed');
        }
      }
    },
    
    migrateSettingsData: () => {
      const legacyNotifications = localStorage.getItem('notificationSettings');
      const legacyPreferences = localStorage.getItem('userPreferences');
      
      if (legacyNotifications || legacyPreferences) {
        const settingsStore = useConsolidatedSettings.getState();
        
        if (legacyNotifications) {
          const notifications = JSON.parse(legacyNotifications);
          settingsStore.updateSettings({ notifications });
          localStorage.removeItem('notificationSettings');
        }
        
        if (legacyPreferences) {
          const preferences = JSON.parse(legacyPreferences);
          settingsStore.updateSettings({ preferences });
          localStorage.removeItem('userPreferences');
        }
      }
    },
    
    clearLegacyData: () => {
      // Clear old Redux persist data
      localStorage.removeItem('persist:root');
      localStorage.removeItem('persist:ui');
      localStorage.removeItem('persist:tasks');
      localStorage.removeItem('persist:communication');
      localStorage.removeItem('persist:settings');
      localStorage.removeItem('persist:team');
      
      // Clear old individual store data
      const keysToRemove = Object.keys(localStorage).filter(key => 
        key.startsWith('zustand-') && !key.includes('-consolidated')
      );
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
    },
    
    migrateAllData: () => {
      const { migrateUIData, migrateSettingsData } = useDataMigration();
      
      try {
        migrateUIData();
        migrateSettingsData();
        logger.info("Data migration completed successfully");
        return true;
      } catch (error) {
        console.error('Data migration failed:', error);
        return false;
      }
    }
  };
}

export function useMigrationStatus() {
  return {
    getPhase: () => migrationManager.getConfig().phase,
    setPhase: (phase: MigrationPhase) => migrationManager.setPhase(phase),
    getConfig: () => migrationManager.getConfig(),
    updateConfig: (config: Partial<MigrationConfig>) => migrationManager.setConfig(config),
    
    // Migration phase helpers
    isLegacy: () => migrationManager.getConfig().phase === 'legacy',
    isTransition: () => migrationManager.getConfig().phase === 'transition',
    isConsolidated: () => migrationManager.getConfig().phase === 'consolidated',
    
    // Feature flag helpers
    canUseNewUI: () => migrationManager.getConfig().featureFlags.useNewUISystem,
    canUseNewTasks: () => migrationManager.getConfig().featureFlags.useNewTasksSystem,
    canUseNewCommunication: () => migrationManager.getConfig().featureFlags.useNewCommunicationSystem,
    canUseNewSettings: () => migrationManager.getConfig().featureFlags.useNewSettingsSystem,
    canUseNewCache: () => migrationManager.getConfig().featureFlags.useNewCacheSystem,
    canUseNewTeams: () => migrationManager.getConfig().featureFlags.useNewTeamsSystem,
  };
}

export type { MigrationPhase, MigrationConfig };
export { DEFAULT_MIGRATION_CONFIG };