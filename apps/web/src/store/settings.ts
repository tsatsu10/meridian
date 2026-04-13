import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { toast } from "sonner";
import { SETTINGS_PRESETS, SettingsPreset, getPresetById } from "./settings-presets";
import { SettingsAPI, SettingsValidationError } from "@/lib/api/settings-api";

export interface ProfileSettings {
  name: string;
  email: string;
  bio: string;
  location: string;
  website: string;
  timezone: string;
  language: string;
  jobTitle: string;
  company: string;
  phone: string;
  avatar?: string;
  emailVerified?: boolean;
  createdAt?: string;
}

export interface AppearanceSettings {
  theme: "light" | "dark" | "system";
  fontSize: number;
  sidebarCollapsed: boolean;
  density: "compact" | "comfortable" | "spacious";
  animations: boolean;
  soundEffects: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  compactMode: boolean;
}

export interface NotificationSettings {
  email: {
    taskAssigned: boolean;
    taskCompleted: boolean;
    taskOverdue: boolean;
    projectUpdates: boolean;
    teamInvitations: boolean;
    weeklyDigest: boolean;
    mentions: boolean;
    comments: boolean;
  };
  push: {
    taskAssigned: boolean;
    taskCompleted: boolean;
    taskOverdue: boolean;
    mentions: boolean;
    comments: boolean;
    directMessages: boolean;
    projectUpdates: boolean;
  };
  inApp: {
    taskAssigned: boolean;
    taskCompleted: boolean;
    taskOverdue: boolean;
    mentions: boolean;
    comments: boolean;
    directMessages: boolean;
    projectUpdates: boolean;
    teamActivity: boolean;
  };
  soundEnabled: boolean;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  loginNotifications: boolean;
  sessionTimeout: boolean;
  deviceTracking: boolean;
  suspiciousActivityAlerts: boolean;
  smsBackup: boolean;
  rememberDevice: boolean;
}

export interface PrivacySettings {
  profileVisibility: boolean;
  activityTracking: boolean;
  analyticsOptIn: boolean;
  marketingOptIn: boolean;
  dataRetention: boolean;
  showOnlineStatus: boolean;
  allowDirectMessages: boolean;
}

export interface AllSettings {
  profile: ProfileSettings;
  appearance: AppearanceSettings;
  notifications: NotificationSettings;
  security: SecuritySettings;
  privacy: PrivacySettings;
}

interface SettingsStore {
  // State
  settings: AllSettings;
  isLoading: boolean;
  hasUnsavedChanges: boolean;
  lastSaved: string | null;
  recentlyViewed: string[];
  searchQuery: string;
  appliedPreset: string | null;
  validationErrors: Record<string, SettingsValidationError[]>;
  isOnline: boolean;
  syncStatus: {
    connected: boolean;
    pendingUpdates: number;
    lastSync?: string;
  };
  
  // Actions
  updateSettings: <T extends keyof AllSettings>(
    section: T,
    updates: Partial<AllSettings[T]>,
    options?: { validate?: boolean; sync?: boolean }
  ) => Promise<void>;
  resetSection: (section: keyof AllSettings) => Promise<void>;
  resetAllSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  addRecentlyViewed: (section: string) => void;
  
  // Preset actions
  applyPreset: (presetId: string) => Promise<void>;
  getAvailablePresets: () => SettingsPreset[];
  getAppliedPreset: () => SettingsPreset | null;
  clearAppliedPreset: () => void;
  
  // Validation
  validateSettings: <T extends keyof AllSettings>(
    section: T,
    settings: Partial<AllSettings[T]>
  ) => Promise<SettingsValidationError[]>;
  clearValidationErrors: (section?: keyof AllSettings) => void;
  
  // Sync
  forceSyncSettings: () => Promise<void>;
  getSyncStatus: () => {
    connected: boolean;
    pendingUpdates: number;
    lastSync?: string;
  };
  setOnlineStatus: (online: boolean) => void;
  
  // Auto-save
  enableAutoSave: () => void;
  disableAutoSave: () => void;
  
  // Performance
  batchUpdate: (updates: Array<{
    section: keyof AllSettings;
    updates: Partial<AllSettings[keyof AllSettings]>;
  }>) => Promise<void>;
  
  // Initialize with user data
  initialize: (userId: string, workspaceId?: string) => Promise<void>;
}

// Default settings
const defaultSettings: AllSettings = {
  profile: {
    name: "",
    email: "",
    bio: "",
    location: "",
    website: "",
    timezone: "UTC",
    language: "en",
    jobTitle: "",
    company: "",
    phone: "",
  },
  appearance: {
    theme: "system",
    fontSize: 14,
    sidebarCollapsed: false,
    density: "comfortable",
    animations: true,
    soundEffects: false,
    highContrast: false,
    reducedMotion: false,
    compactMode: false,
  },
  notifications: {
    email: {
      taskAssigned: true,
      taskCompleted: true,
      taskOverdue: true,
      projectUpdates: true,
      teamInvitations: true,
      weeklyDigest: true,
      mentions: true,
      comments: true,
    },
    push: {
      taskAssigned: true,
      taskCompleted: false,
      taskOverdue: true,
      mentions: true,
      comments: true,
      directMessages: true,
      projectUpdates: false,
    },
    inApp: {
      taskAssigned: true,
      taskCompleted: true,
      taskOverdue: true,
      mentions: true,
      comments: true,
      directMessages: true,
      projectUpdates: true,
      teamActivity: true,
    },
    soundEnabled: true,
  },
  security: {
    twoFactorEnabled: false,
    loginNotifications: true,
    sessionTimeout: true,
    deviceTracking: true,
    suspiciousActivityAlerts: true,
    smsBackup: false,
    rememberDevice: false,
  },
  privacy: {
    profileVisibility: true,
    activityTracking: true,
    analyticsOptIn: false,
    marketingOptIn: false,
    dataRetention: true,
    showOnlineStatus: true,
    allowDirectMessages: true,
  },
};

// Auto-save functionality
let autoSaveTimeout: NodeJS.Timeout | null = null;
const AUTO_SAVE_DELAY = 2000; // 2 seconds

// User ID for API calls (should be set from auth context)
let currentUserId: string | null = null;
let isInitialized = false; // Flag to prevent multiple initializations

// Performance monitoring
let lastUpdateTime = 0;
const UPDATE_THROTTLE_MS = 100; // Prevent rapid updates

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      // Initial state
      settings: defaultSettings,
      isLoading: false,
      hasUnsavedChanges: false,
      lastSaved: null,
      recentlyViewed: [],
      searchQuery: "",
      appliedPreset: null,
      validationErrors: {},
      isOnline: navigator.onLine,
      syncStatus: {
        connected: false,
        pendingUpdates: 0,
      },

      // Initialize with user data
      initialize: async (userId: string, workspaceId?: string) => {
        // Prevent duplicate initialization
        if (isInitialized && currentUserId === userId) {return;
        }currentUserId = userId;
        isInitialized = true;
        
        set({ isLoading: true });

        try {
          // Load user settings with timeout protection
          const loadPromise = Promise.race([
            SettingsAPI.getSettings(userId, true), // Use cache by default
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error("Settings load timeout")), 5000)
            )
          ]);

          const loadedSettings = await loadPromise as AllSettings;

          set({
            settings: loadedSettings || defaultSettings,
            isLoading: false,
            hasUnsavedChanges: false,
            lastSaved: new Date().toISOString(),
          });// Initialize sync service for real-time updates (optional feature)
          if (workspaceId) {
            try {
              // const syncService = getSyncService(); // Removed getSyncService
              // if (syncService) { // Removed getSyncService
              //// Removed getSyncService
              //   // Sync service integration can be enhanced later // Removed getSyncService
              //   // For now, just ensure the store works without it // Removed getSyncService
              // } // Removed getSyncService
            } catch (error) {
              console.warn("Sync service unavailable:", error);
              // Continue without real-time sync - this is optional
            }
          }
        } catch (error) {
          console.error("Failed to initialize settings:", error);
          // Fall back to local defaults - don't show error toast to avoid console spam
          set({ 
            settings: defaultSettings, // Use default settings as fallback
            isLoading: false,
            lastSaved: null,
            hasUnsavedChanges: false, // Don't mark as changed since these are defaults
          });
          
          // Only show toast in development mode to avoid spamming users
          if (import.meta.env.DEV) {
            console.warn("⚠️ Settings API unavailable, using defaults");
          }
        }
      },

      updateSettings: async <T extends keyof AllSettings>(
        section: T,
        updates: Partial<AllSettings[T]>,
        options: { validate?: boolean; sync?: boolean } = { validate: true, sync: true }
      ) => {
        // Performance throttling to prevent excessive updates
        const now = Date.now();
        if (now - lastUpdateTime < UPDATE_THROTTLE_MS) {
          // Debounce rapid updates
          if (autoSaveTimeout) {
            clearTimeout(autoSaveTimeout);
          }
          autoSaveTimeout = setTimeout(() => {
            get().updateSettings(section, updates, options);
          }, UPDATE_THROTTLE_MS);
          return;
        }
        lastUpdateTime = now;

        const currentSettings = get().settings;
        const updatedSectionSettings = {
          ...currentSettings[section],
          ...updates,
        };

        // Validate if requested
        if (options.validate) {
          try {
            const errors = await get().validateSettings(section, updatedSectionSettings);
            if (errors.length > 0) {
              set(state => ({
                validationErrors: {
                  ...state.validationErrors,
                  [section]: errors,
                }
              }));
              toast.error(`Validation failed: ${errors[0].message}`);
              return;
            } else {
              // Clear validation errors for this section
              set(state => ({
                validationErrors: {
                  ...state.validationErrors,
                  [section]: [],
                }
              }));
            }
          } catch (error) {
            console.error("Validation failed:", error);
            // Continue with update but show warning
            toast.warning("Could not validate settings. Changes saved locally.");
          }
        }

        const updatedSettings = {
          ...currentSettings,
          [section]: updatedSectionSettings,
        };

        set({
          settings: updatedSettings,
          hasUnsavedChanges: true,
          appliedPreset: null, // Clear applied preset when manually changing settings
        });

        // Send to sync service
        if (options.sync) {
          // const syncService = getSyncService(); // Removed getSyncService
          // if (syncService) { // Removed getSyncService
          //   syncService.sendUpdate(section, updates); // Removed getSyncService
          // } // Removed getSyncService
        }

        // Auto-save after delay
        if (autoSaveTimeout) {
          clearTimeout(autoSaveTimeout);
        }
        
        autoSaveTimeout = setTimeout(async () => {
          await get().saveSettings();
        }, AUTO_SAVE_DELAY);
      },

      saveSettings: async () => {
        if (!currentUserId) {
          if (import.meta.env.DEV) {
            console.warn("⚠️ No user session found for saving settings");
          }
          return;
        }

        set({ isLoading: true });
        
        try {
          // Save all sections that have changed
          const { settings, hasUnsavedChanges } = get();
          
          if (!hasUnsavedChanges) {
            set({ isLoading: false });
            return;
          }

          // For now, save the entire settings object
          // In a real implementation, you'd track which sections changed
          await SettingsAPI.updateSettings(currentUserId, "profile", settings.profile);
          await SettingsAPI.updateSettings(currentUserId, "appearance", settings.appearance);
          await SettingsAPI.updateSettings(currentUserId, "notifications", settings.notifications);
          await SettingsAPI.updateSettings(currentUserId, "security", settings.security);
          await SettingsAPI.updateSettings(currentUserId, "privacy", settings.privacy);
          
          set({
            hasUnsavedChanges: false,
            lastSaved: new Date().toISOString(),
            isLoading: false,
          });
          
          // Update sync status
          // const syncService = getSyncService(); // Removed getSyncService
          // if (syncService) { // Removed getSyncService
          //   const status = syncService.getSyncStatus(); // Removed getSyncService
          //   set(state => ({ // Removed getSyncService
          //     syncStatus: { // Removed getSyncService
          //       ...state.syncStatus, // Removed getSyncService
          //       pendingUpdates: status.pendingUpdates, // Removed getSyncService
          //       lastSync: new Date().toISOString(), // Removed getSyncService
          //     } // Removed getSyncService
          //   })); // Removed getSyncService
          // } // Removed getSyncService
          
          toast.success("Settings saved successfully");
        } catch (error) {
          set({ 
            isLoading: false,
            // Don't clear hasUnsavedChanges so user can retry
          });
          console.error("Save failed:", error);
          
          // Only show error toast in development mode or if explicitly user-triggered
          if (import.meta.env.DEV) {
            toast.error("Failed to save settings - API unavailable");
          } else {
            console.warn("⚠️ Settings save failed, changes preserved locally");
          }
          
          // Don't throw error to prevent app crashes
        }
      },

      batchUpdate: async (updates) => {
        if (!currentUserId) return;

        set({ isLoading: true });
        
        try {
          const { settings } = get();
          let newSettings = { ...settings };

          // Apply all updates
          for (const update of updates) {
            newSettings[update.section] = {
              ...newSettings[update.section],
              ...update.updates,
            } as any;
          }

          set({
            settings: newSettings,
            hasUnsavedChanges: true,
            isLoading: false,
          });

          // Send all updates to sync service
          // const syncService = getSyncService(); // Removed getSyncService
          // if (syncService) { // Removed getSyncService
          //   updates.forEach(update => { // Removed getSyncService
          //     syncService.sendUpdate(update.section, update.updates); // Removed getSyncService
          //   }); // Removed getSyncService
          // } // Removed getSyncService

          // Auto-save
          setTimeout(async () => {
            await get().saveSettings();
          }, AUTO_SAVE_DELAY);

          toast.success(`Updated ${updates.length} settings sections`);
        } catch (error) {
          set({ isLoading: false });
          console.error("Batch update failed:", error);
          toast.error("Failed to update settings");
        }
      },

      validateSettings: async <T extends keyof AllSettings>(
        section: T,
        settings: Partial<AllSettings[T]>
      ): Promise<SettingsValidationError[]> => {
        try {
          return await SettingsAPI.validateSettings(section, settings);
        } catch (error) {
          console.error("Validation API failed:", error);
          return [];
        }
      },

      clearValidationErrors: (section?: keyof AllSettings) => {
        set(state => {
          if (section) {
            return {
              validationErrors: {
                ...state.validationErrors,
                [section]: [],
              }
            };
          } else {
            return { validationErrors: {} };
          }
        });
      },

      resetSection: async (section: keyof AllSettings) => {
        if (!currentUserId) return;

        try {
          const newSettings = await SettingsAPI.resetSection(currentUserId, section);
          
          set({
            settings: newSettings,
            hasUnsavedChanges: false,
            appliedPreset: null,
            lastSaved: new Date().toISOString(),
          });

          // Send reset to sync service
          // const syncService = getSyncService(); // Removed getSyncService
          // if (syncService) { // Removed getSyncService
          //   syncService.sendReset(section); // Removed getSyncService
          // } // Removed getSyncService

          toast.success(`${section} settings reset to defaults`);
        } catch (error) {
          console.error("Reset failed:", error);
          // Fall back to local reset
          const currentSettings = get().settings;
          set({
            settings: {
              ...currentSettings,
              [section]: defaultSettings[section],
            },
            hasUnsavedChanges: true,
            appliedPreset: null,
          });
          toast.warning(`${section} settings reset locally. Will sync when connection is restored.`);
        }
      },

      resetAllSettings: async () => {
        if (!currentUserId) return;

        try {
          // Reset all sections via API
          for (const section of Object.keys(defaultSettings) as (keyof AllSettings)[]) {
            await SettingsAPI.resetSection(currentUserId, section);
          }

          set({
            settings: defaultSettings,
            hasUnsavedChanges: false,
            appliedPreset: null,
            lastSaved: new Date().toISOString(),
            validationErrors: {},
          });

          toast.success("All settings reset to defaults");
        } catch (error) {
          console.error("Reset all failed:", error);
          // Fall back to local reset
          set({
            settings: defaultSettings,
            hasUnsavedChanges: true,
            appliedPreset: null,
            validationErrors: {},
          });
          toast.warning("Settings reset locally. Will sync when connection is restored.");
        }
      },

      setSearchQuery: (query: string) => {
        set({ searchQuery: query });
      },

      addRecentlyViewed: (section: string) => {
        const { recentlyViewed } = get();
        const updated = [section, ...recentlyViewed.filter(s => s !== section)].slice(0, 5);
        set({ recentlyViewed: updated });
      },

      // Preset functionality
      applyPreset: async (presetId: string) => {
        if (!currentUserId) return;

        const preset = getPresetById(presetId);
        if (!preset) {
          toast.error("Preset not found");
          return;
        }

        set({ isLoading: true });

        try {
          const result = await SettingsAPI.applyPreset(currentUserId, presetId);

          set({
            settings: result.settings,
            hasUnsavedChanges: false,
            appliedPreset: presetId,
            isLoading: false,
            lastSaved: new Date().toISOString(),
          });

          // Send preset application to sync service
          // const syncService = getSyncService(); // Removed getSyncService
          // if (syncService) { // Removed getSyncService
          //   syncService.sendPresetApplied(presetId, preset.name); // Removed getSyncService
          // } // Removed getSyncService

          toast.success(`Applied ${preset.name} preset`);
        } catch (error) {
          set({ isLoading: false });
          console.error("Preset application failed:", error);
          toast.error("Failed to apply preset");
        }
      },

      getAvailablePresets: () => {
        return SETTINGS_PRESETS;
      },

      getAppliedPreset: () => {
        const { appliedPreset } = get();
        return appliedPreset ? getPresetById(appliedPreset) || null : null;
      },

      clearAppliedPreset: () => {
        set({ appliedPreset: null });
      },

      // Sync functionality
      forceSyncSettings: async () => {
        // const syncService = getSyncService(); // Removed getSyncService
        // if (syncService) { // Removed getSyncService
        //   await syncService.forceSync(); // Removed getSyncService
        //   const status = syncService.getSyncStatus(); // Removed getSyncService
        //   set(state => ({ // Removed getSyncService
        //     syncStatus: { // Removed getSyncService
        //       ...state.syncStatus, // Removed getSyncService
        //       connected: status.connected, // Removed getSyncService
        //       pendingUpdates: status.pendingUpdates, // Removed getSyncService
        //       lastSync: new Date().toISOString(), // Removed getSyncService
        //     } // Removed getSyncService
        //   })); // Removed getSyncService
        // } // Removed getSyncService
      },

      getSyncStatus: () => {
        return get().syncStatus;
      },

      setOnlineStatus: (online: boolean) => {
        set({ isOnline: online });
      },

      enableAutoSave: () => {
        // Auto-save is enabled by default
      },

      disableAutoSave: () => {
        if (autoSaveTimeout) {
          clearTimeout(autoSaveTimeout);
          autoSaveTimeout = null;
        }
      },
    }),
    {
      name: "meridian-settings",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        settings: state.settings,
        recentlyViewed: state.recentlyViewed,
        lastSaved: state.lastSaved,
        appliedPreset: state.appliedPreset,
        // Don't persist validation errors or sync status
      }),
      onRehydrateStorage: () => (state) => {
        // Update online status on rehydration
        if (state) {
          state.isOnline = navigator.onLine;
        }
      },
    }
  )
); 