// Consolidated Settings Store
// Combines settings.ts, user-preferences.ts (partially from UI store), and settings-presets.ts
// into a single Zustand store with persistence for all application settings, user preferences, and presets

import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { API_BASE_URL } from "../../constants/urls";

// Core settings interfaces
export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: number;
  density: 'compact' | 'comfortable' | 'spacious';
  animations: boolean;
  soundEffects: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  compactMode: boolean;
  sidebarCollapsed: boolean;
  customTheme?: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    surfaceColor: string;
    textColor: string;
    borderColor: string;
  };
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
    directMessages?: boolean;
    channelMessages?: boolean;
    workflowUpdates?: boolean;
  };
  push: {
    taskAssigned: boolean;
    taskCompleted: boolean;
    taskOverdue: boolean;
    mentions: boolean;
    comments: boolean;
    directMessages: boolean;
    projectUpdates: boolean;
    channelMessages?: boolean;
    workflowUpdates?: boolean;
    emergencyAlerts?: boolean;
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
    channelMessages?: boolean;
    workflowUpdates?: boolean;
    systemAnnouncements?: boolean;
  };
  soundEnabled: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string;   // HH:mm format
    timezone: string;
  };
  channels: Record<string, {
    mentions: boolean;
    allMessages: boolean;
    push: boolean;
    email: boolean;
    sound: boolean;
    keywords: string[];
  }>;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  loginNotifications: boolean;
  sessionTimeout: boolean;
  deviceTracking: boolean;
  suspiciousActivityAlerts: boolean;
  passwordRequirements: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSymbols: boolean;
  };
  trustedDevices: Array<{
    id: string;
    name: string;
    lastUsed: string;
    location?: string;
  }>;
  activeSessions: Array<{
    id: string;
    device: string;
    location: string;
    lastActive: string;
    isCurrent: boolean;
  }>;
}

export interface PrivacySettings {
  profileVisibility: boolean;
  activityTracking: boolean;
  analyticsOptIn: boolean;
  marketingOptIn: boolean;
  dataRetention: boolean;
  showOnlineStatus: boolean;
  allowDirectMessages: boolean;
  searchability: 'public' | 'workspace' | 'private';
  workspaceDiscovery: boolean;
  shareUsageData: boolean;
  personalizedContent: boolean;
}

export interface WorkspaceSettings {
  defaultView: 'kanban' | 'list' | 'calendar' | 'gantt' | 'timeline';
  taskGrouping: 'status' | 'assignee' | 'priority' | 'project' | 'due_date';
  timeFormat: '12h' | '24h';
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  weekStart: 0 | 1; // 0 = Sunday, 1 = Monday
  workingHours: {
    enabled: boolean;
    start: string; // HH:mm
    end: string;   // HH:mm
    days: number[]; // 0-6, where 0 is Sunday
    timezone: string;
  };
  autoSave: boolean;
  confirmations: {
    deleteTask: boolean;
    deleteProject: boolean;
    archiveProject: boolean;
    leaveWorkspace: boolean;
  };
}

export interface IntegrationSettings {
  github: {
    enabled: boolean;
    repositories: string[];
    autoLinkPRs: boolean;
    syncBranches: boolean;
  };
  slack: {
    enabled: boolean;
    channels: string[];
    notifications: boolean;
    autoStatus: boolean;
  };
  calendar: {
    enabled: boolean;
    provider: 'google' | 'outlook' | 'apple';
    syncTasks: boolean;
    reminderMinutes: number;
  };
  email: {
    provider: 'smtp' | 'sendgrid' | 'mailgun';
    templates: Record<string, {
      subject: string;
      body: string;
      enabled: boolean;
    }>;
  };
  webhooks: Array<{
    id: string;
    name: string;
    url: string;
    events: string[];
    enabled: boolean;
    secret?: string;
  }>;
}

export interface AllSettings {
  appearance: AppearanceSettings;
  notifications: NotificationSettings;
  security: SecuritySettings;
  privacy: PrivacySettings;
  workspace: WorkspaceSettings;
  integrations: IntegrationSettings;
}

// Settings preset interface
export interface SettingsPreset {
  id: string;
  name: string;
  description: string;
  persona: string;
  icon: string;
  settings: Partial<AllSettings>;
  popular?: boolean;
  category?: 'role' | 'workflow' | 'accessibility' | 'custom';
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

// Import/Export interfaces
export interface SettingsExport {
  version: string;
  exportedAt: string;
  settings: AllSettings;
  presets?: SettingsPreset[];
  metadata?: Record<string, any>;
}

export interface SettingsImportResult {
  success: boolean;
  imported: {
    settings: boolean;
    presets: number;
  };
  errors: string[];
  warnings: string[];
}

// State interface
export interface ConsolidatedSettingsState extends AllSettings {
  // Preset Management
  availablePresets: SettingsPreset[];
  customPresets: SettingsPreset[];
  currentPreset: string | null;
  presetDirty: boolean; // true if current settings differ from applied preset
  
  // Settings History
  settingsHistory: Array<{
    id: string;
    timestamp: string;
    changes: Partial<AllSettings>;
    source: 'user' | 'preset' | 'import' | 'sync';
    description?: string;
  }>;
  
  // Import/Export
  importing: boolean;
  exporting: boolean;
  importErrors: string[];
  exportUrl: string | null;
  
  // Validation and Conflicts
  validationErrors: Record<string, string[]>;
  unsavedChanges: boolean;
  
  // Loading and Error States
  loading: {
    settings: boolean;
    presets: boolean;
    import: boolean;
    export: boolean;
    validation: boolean;
  };
  
  errors: {
    settings: string | null;
    presets: string | null;
    import: string | null;
    export: string | null;
    validation: string | null;
  };
  
  lastUpdated: string | null;
  lastSynced: string | null;
}

// Store interface with actions
export interface ConsolidatedSettingsStore extends ConsolidatedSettingsState {
  // Core Settings Management
  loadSettings: () => Promise<void>;
  saveSettings: (settings?: Partial<AllSettings>) => Promise<void>;
  updateSettings: (updates: Partial<AllSettings>) => void;
  resetSettings: () => Promise<void>;
  resetToDefaults: () => void;
  
  // Individual Setting Updates
  updateAppearance: (updates: Partial<AppearanceSettings>) => void;
  updateNotifications: (updates: Partial<NotificationSettings>) => void;
  updateSecurity: (updates: Partial<SecuritySettings>) => void;
  updatePrivacy: (updates: Partial<PrivacySettings>) => void;
  updateWorkspace: (updates: Partial<WorkspaceSettings>) => void;
  updateIntegrations: (updates: Partial<IntegrationSettings>) => void;
  
  // Notification Channel Settings
  updateChannelNotifications: (channelId: string, settings: NotificationSettings['channels'][string]) => void;
  getChannelNotifications: (channelId: string) => NotificationSettings['channels'][string] | null;
  resetChannelNotifications: (channelId: string) => void;
  
  // Preset Management
  loadPresets: () => Promise<void>;
  applyPreset: (presetId: string) => void;
  createPreset: (preset: Omit<SettingsPreset, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updatePreset: (presetId: string, updates: Partial<SettingsPreset>) => void;
  deletePreset: (presetId: string) => void;
  duplicatePreset: (presetId: string, newName: string) => string;
  
  // Preset Utilities
  getPresetById: (id: string) => SettingsPreset | null;
  getPresetsByCategory: (category: SettingsPreset['category']) => SettingsPreset[];
  getPopularPresets: () => SettingsPreset[];
  searchPresets: (query: string) => SettingsPreset[];
  compareWithPreset: (presetId: string) => { differences: Partial<AllSettings>; isDifferent: boolean };
  
  // Import/Export
  exportSettings: (includePresets?: boolean) => Promise<string | null>;
  importSettings: (data: string | SettingsExport) => Promise<SettingsImportResult>;
  downloadSettingsBackup: () => Promise<void>;
  
  // Settings History
  addToHistory: (changes: Partial<AllSettings>, source?: 'user' | 'preset' | 'import' | 'sync', description?: string) => void;
  getSettingsHistory: (limit?: number) => ConsolidatedSettingsState['settingsHistory'];
  revertToHistoryEntry: (historyId: string) => Promise<void>;
  clearHistory: () => void;
  
  // Validation
  validateSettings: (settings?: Partial<AllSettings>) => Record<string, string[]>;
  hasValidationErrors: () => boolean;
  getValidationSummary: () => { errors: number; warnings: number; fields: string[] };
  
  // Utility Functions
  isDefaultValue: (key: keyof AllSettings, subKey?: string) => boolean;
  getChangedSettings: () => Partial<AllSettings>;
  hasUnsavedChanges: () => boolean;
  confirmUnsavedChanges: () => Promise<boolean>;
  
  // Theme and Appearance Helpers
  getComputedTheme: () => 'light' | 'dark';
  applyThemeToDocument: () => void;
  previewTheme: (theme: 'light' | 'dark' | 'system') => void;
  
  // Synchronization
  syncWithServer: () => Promise<void>;
  syncWithWorkspace: (workspaceId: string) => Promise<void>;
  
  // Loading and Error Management
  setLoading: (key: keyof ConsolidatedSettingsState['loading'], value: boolean) => void;
  setError: (key: keyof ConsolidatedSettingsState['errors'], value: string | null) => void;
  clearErrors: () => void;
  clearError: (key: keyof ConsolidatedSettingsState['errors']) => void;
  
  // Cleanup
  cleanup: () => void;
  reset: () => void;
}

// Default settings
const defaultAppearanceSettings: AppearanceSettings = {
  theme: 'system',
  fontSize: 14,
  density: 'comfortable',
  animations: true,
  soundEffects: true,
  highContrast: false,
  reducedMotion: false,
  compactMode: false,
  sidebarCollapsed: false
};

const defaultNotificationSettings: NotificationSettings = {
  email: {
    taskAssigned: true,
    taskCompleted: true,
    taskOverdue: true,
    projectUpdates: true,
    teamInvitations: true,
    weeklyDigest: true,
    mentions: true,
    comments: true,
    directMessages: true,
    channelMessages: false,
    workflowUpdates: true
  },
  push: {
    taskAssigned: true,
    taskCompleted: false,
    taskOverdue: true,
    mentions: true,
    comments: true,
    directMessages: true,
    projectUpdates: true,
    channelMessages: false,
    workflowUpdates: false,
    emergencyAlerts: true
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
    channelMessages: true,
    workflowUpdates: true,
    systemAnnouncements: true
  },
  soundEnabled: true,
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  },
  channels: {}
};

const defaultSecuritySettings: SecuritySettings = {
  twoFactorEnabled: false,
  loginNotifications: true,
  sessionTimeout: true,
  deviceTracking: true,
  suspiciousActivityAlerts: true,
  passwordRequirements: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: false
  },
  trustedDevices: [],
  activeSessions: []
};

const defaultPrivacySettings: PrivacySettings = {
  profileVisibility: true,
  activityTracking: true,
  analyticsOptIn: true,
  marketingOptIn: false,
  dataRetention: true,
  showOnlineStatus: true,
  allowDirectMessages: true,
  searchability: 'workspace',
  workspaceDiscovery: true,
  shareUsageData: false,
  personalizedContent: true
};

const defaultWorkspaceSettings: WorkspaceSettings = {
  defaultView: 'kanban',
  taskGrouping: 'status',
  timeFormat: '12h',
  dateFormat: 'MM/DD/YYYY',
  weekStart: 0,
  workingHours: {
    enabled: false,
    start: '09:00',
    end: '17:00',
    days: [1, 2, 3, 4, 5], // Monday to Friday
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  },
  autoSave: true,
  confirmations: {
    deleteTask: true,
    deleteProject: true,
    archiveProject: true,
    leaveWorkspace: true
  }
};

const defaultIntegrationSettings: IntegrationSettings = {
  github: {
    enabled: false,
    repositories: [],
    autoLinkPRs: true,
    syncBranches: false
  },
  slack: {
    enabled: false,
    channels: [],
    notifications: true,
    autoStatus: false
  },
  calendar: {
    enabled: false,
    provider: 'google',
    syncTasks: false,
    reminderMinutes: 15
  },
  email: {
    provider: 'smtp',
    templates: {}
  },
  webhooks: []
};

const defaultSettings: AllSettings = {
  appearance: defaultAppearanceSettings,
  notifications: defaultNotificationSettings,
  security: defaultSecuritySettings,
  privacy: defaultPrivacySettings,
  workspace: defaultWorkspaceSettings,
  integrations: defaultIntegrationSettings
};

// Built-in presets (from settings-presets.ts)
const builtInPresets: SettingsPreset[] = [
  {
    id: "project-manager",
    name: "Project Manager",
    description: "Optimized for project oversight and team coordination",
    persona: "Sarah (PM)",
    icon: "👩‍💼",
    popular: true,
    category: 'role',
    tags: ['management', 'oversight', 'coordination'],
    settings: {
      appearance: {
        theme: "light",
        fontSize: 14,
        density: "comfortable",
        animations: true,
        soundEffects: true,
        highContrast: false,
        reducedMotion: false,
        compactMode: false,
        sidebarCollapsed: false
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
          comments: true
        },
        push: {
          taskAssigned: true,
          taskCompleted: true,
          taskOverdue: true,
          mentions: true,
          comments: true,
          directMessages: true,
          projectUpdates: true
        },
        inApp: {
          taskAssigned: true,
          taskCompleted: true,
          taskOverdue: true,
          mentions: true,
          comments: true,
          directMessages: true,
          projectUpdates: true,
          teamActivity: true
        },
        soundEnabled: true
      } as Partial<NotificationSettings>,
      security: {
        twoFactorEnabled: true,
        loginNotifications: true,
        sessionTimeout: true,
        deviceTracking: true,
        suspiciousActivityAlerts: true
      } as Partial<SecuritySettings>,
      privacy: {
        profileVisibility: true,
        activityTracking: true,
        analyticsOptIn: true,
        marketingOptIn: false,
        dataRetention: true,
        showOnlineStatus: true,
        allowDirectMessages: true
      } as Partial<PrivacySettings>
    }
  },
  {
    id: "executive",
    name: "Executive",
    description: "High-level overview with essential notifications only",
    persona: "Jennifer (Exec)",
    icon: "👩‍💻",
    popular: true,
    category: 'role',
    tags: ['executive', 'high-level', 'minimal'],
    settings: {
      appearance: {
        theme: "system",
        fontSize: 15,
        density: "spacious",
        animations: false,
        soundEffects: false,
        highContrast: false,
        reducedMotion: true,
        compactMode: false,
        sidebarCollapsed: false
      },
      notifications: {
        email: {
          taskAssigned: false,
          taskCompleted: false,
          taskOverdue: true,
          projectUpdates: true,
          teamInvitations: true,
          weeklyDigest: true,
          mentions: true,
          comments: false
        },
        push: {
          taskAssigned: false,
          taskCompleted: false,
          taskOverdue: true,
          mentions: true,
          comments: false,
          directMessages: true,
          projectUpdates: true
        },
        inApp: {
          taskAssigned: false,
          taskCompleted: false,
          taskOverdue: true,
          mentions: true,
          comments: false,
          directMessages: true,
          projectUpdates: true,
          teamActivity: false
        },
        soundEnabled: false
      } as Partial<NotificationSettings>,
      privacy: {
        profileVisibility: false,
        activityTracking: false,
        analyticsOptIn: false,
        marketingOptIn: false,
        showOnlineStatus: false,
        allowDirectMessages: false
      } as Partial<PrivacySettings>
    }
  },
  {
    id: "developer",
    name: "Developer",
    description: "Minimal distractions with efficient task management",
    persona: "Mike (Dev)",
    icon: "👨‍💻",
    popular: true,
    category: 'role',
    tags: ['developer', 'minimal', 'focus'],
    settings: {
      appearance: {
        theme: "dark",
        fontSize: 13,
        density: "compact",
        animations: false,
        soundEffects: false,
        highContrast: false,
        reducedMotion: true,
        compactMode: true,
        sidebarCollapsed: true
      },
      notifications: {
        email: {
          taskAssigned: true,
          taskCompleted: false,
          taskOverdue: true,
          projectUpdates: false,
          teamInvitations: true,
          weeklyDigest: false,
          mentions: true,
          comments: false
        },
        push: {
          taskAssigned: true,
          taskCompleted: false,
          taskOverdue: true,
          mentions: true,
          comments: false,
          directMessages: false,
          projectUpdates: false
        },
        inApp: {
          taskAssigned: true,
          taskCompleted: false,
          taskOverdue: true,
          mentions: true,
          comments: false,
          directMessages: false,
          projectUpdates: false,
          teamActivity: false
        },
        soundEnabled: false
      } as Partial<NotificationSettings>,
      privacy: {
        profileVisibility: false,
        activityTracking: false,
        analyticsOptIn: false,
        showOnlineStatus: false,
        allowDirectMessages: false
      } as Partial<PrivacySettings>
    }
  },
  {
    id: "designer",
    name: "Designer",
    description: "Visual-first with file sharing and collaboration focus",
    persona: "Lisa (Designer)",
    icon: "👩‍🎨",
    category: 'role',
    tags: ['designer', 'visual', 'collaboration'],
    settings: {
      appearance: {
        theme: "light",
        fontSize: 14,
        density: "spacious",
        animations: true,
        soundEffects: true,
        highContrast: false,
        reducedMotion: false,
        compactMode: false,
        sidebarCollapsed: false
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
          comments: true
        },
        push: {
          taskAssigned: true,
          taskCompleted: false,
          taskOverdue: true,
          mentions: true,
          comments: true,
          directMessages: true,
          projectUpdates: true
        },
        inApp: {
          taskAssigned: true,
          taskCompleted: true,
          taskOverdue: true,
          mentions: true,
          comments: true,
          directMessages: true,
          projectUpdates: true,
          teamActivity: true
        },
        soundEnabled: true
      } as Partial<NotificationSettings>,
      privacy: {
        profileVisibility: true,
        activityTracking: true,
        analyticsOptIn: true,
        marketingOptIn: true,
        showOnlineStatus: true,
        allowDirectMessages: true
      } as Partial<PrivacySettings>
    }
  },
  {
    id: "team-lead",
    name: "Team Lead",
    description: "Team analytics and workload management focused",
    persona: "David (Team Lead)",
    icon: "👨‍💼",
    popular: true,
    category: 'role',
    tags: ['team-lead', 'analytics', 'management'],
    settings: {
      appearance: {
        theme: "dark",
        fontSize: 14,
        density: "comfortable",
        animations: true,
        soundEffects: false,
        highContrast: false,
        reducedMotion: false,
        compactMode: false,
        sidebarCollapsed: false
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
          comments: true
        },
        push: {
          taskAssigned: false,
          taskCompleted: true,
          taskOverdue: true,
          mentions: true,
          comments: false,
          directMessages: true,
          projectUpdates: true
        },
        inApp: {
          taskAssigned: true,
          taskCompleted: true,
          taskOverdue: true,
          mentions: true,
          comments: true,
          directMessages: true,
          projectUpdates: true,
          teamActivity: true
        },
        soundEnabled: false
      } as Partial<NotificationSettings>,
      privacy: {
        profileVisibility: true,
        activityTracking: true,
        analyticsOptIn: true,
        showOnlineStatus: true,
        allowDirectMessages: true
      } as Partial<PrivacySettings>
    }
  },
  {
    id: "minimalist",
    name: "Minimalist",
    description: "Clean, distraction-free experience",
    persona: "Focus-driven user",
    icon: "🎯",
    category: 'workflow',
    tags: ['minimalist', 'focus', 'clean'],
    settings: {
      appearance: {
        theme: "system",
        fontSize: 14,
        density: "compact",
        animations: false,
        soundEffects: false,
        highContrast: false,
        reducedMotion: true,
        compactMode: true,
        sidebarCollapsed: true
      },
      notifications: {
        email: {
          taskAssigned: true,
          taskCompleted: false,
          taskOverdue: true,
          projectUpdates: false,
          teamInvitations: true,
          weeklyDigest: false,
          mentions: true,
          comments: false
        },
        push: {
          taskAssigned: false,
          taskCompleted: false,
          taskOverdue: true,
          mentions: false,
          comments: false,
          directMessages: false,
          projectUpdates: false
        },
        inApp: {
          taskAssigned: true,
          taskCompleted: false,
          taskOverdue: true,
          mentions: true,
          comments: false,
          directMessages: false,
          projectUpdates: false,
          teamActivity: false
        },
        soundEnabled: false
      } as Partial<NotificationSettings>
    }
  },
  {
    id: "collaborator",
    name: "Collaborator",
    description: "Enhanced for team communication and real-time updates",
    persona: "Team-focused user",
    icon: "🤝",
    category: 'workflow',
    tags: ['collaboration', 'team', 'communication'],
    settings: {
      appearance: {
        theme: "light",
        fontSize: 14,
        density: "comfortable",
        animations: true,
        soundEffects: true,
        highContrast: false,
        reducedMotion: false,
        compactMode: false,
        sidebarCollapsed: false
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
          comments: true
        },
        push: {
          taskAssigned: true,
          taskCompleted: true,
          taskOverdue: true,
          mentions: true,
          comments: true,
          directMessages: true,
          projectUpdates: true
        },
        inApp: {
          taskAssigned: true,
          taskCompleted: true,
          taskOverdue: true,
          mentions: true,
          comments: true,
          directMessages: true,
          projectUpdates: true,
          teamActivity: true
        },
        soundEnabled: true
      } as Partial<NotificationSettings>
    }
  },
];

const initialState: ConsolidatedSettingsState = {
  ...defaultSettings,
  
  // Preset Management
  availablePresets: builtInPresets,
  customPresets: [],
  currentPreset: null,
  presetDirty: false,
  
  // Settings History
  settingsHistory: [],
  
  // Import/Export
  importing: false,
  exporting: false,
  importErrors: [],
  exportUrl: null,
  
  // Validation and Conflicts
  validationErrors: {},
  unsavedChanges: false,
  
  // Loading and Error States
  loading: {
    settings: false,
    presets: false,
    import: false,
    export: false,
    validation: false
  },
  
  errors: {
    settings: null,
    presets: null,
    import: null,
    export: null,
    validation: null
  },
  
  lastUpdated: null,
  lastSynced: null
};

export const useConsolidatedSettingsStore = create<ConsolidatedSettingsStore>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          ...initialState,

          // Core Settings Management
          loadSettings: async () => {
            set((state) => {
              state.loading.settings = true;
              state.errors.settings = null;
            });

            try {
              const response = await fetch(`${API_BASE_URL}/users/settings`, {});

              if (!response.ok) {
                throw new Error('Failed to load settings');
              }

              const data = await response.json();

              set((state) => {
                state.loading.settings = false;
                
                // Merge loaded settings with defaults
                Object.keys(defaultSettings).forEach(key => {
                  const settingsKey = key as keyof AllSettings;
                  if (data.settings[settingsKey]) {
                    state[settingsKey] = { ...defaultSettings[settingsKey], ...data.settings[settingsKey] };
                  }
                });
                
                state.lastUpdated = new Date().toISOString();
                state.lastSynced = new Date().toISOString();
                state.unsavedChanges = false;
              });
            } catch (error) {
              set((state) => {
                state.loading.settings = false;
                state.errors.settings = error instanceof Error ? error.message : 'Failed to load settings';
              });
            }
          },

          saveSettings: async (settings?: Partial<AllSettings>) => {
            const currentState = get();
            const settingsToSave = settings || {
              appearance: currentState.appearance,
              notifications: currentState.notifications,
              security: currentState.security,
              privacy: currentState.privacy,
              workspace: currentState.workspace,
              integrations: currentState.integrations
            };

            set((state) => {
              state.loading.settings = true;
              state.errors.settings = null;
            });

            try {
              const response = await fetch(`${API_BASE_URL}/users/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings: settingsToSave })});

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to save settings');
              }

              set((state) => {
                state.loading.settings = false;
                state.lastUpdated = new Date().toISOString();
                state.lastSynced = new Date().toISOString();
                state.unsavedChanges = false;
                
                // Add to history
                state.settingsHistory.unshift({
                  id: `save-${Date.now()}`,
                  timestamp: new Date().toISOString(),
                  changes: settingsToSave,
                  source: 'user',
                  description: 'Manual save'
                });
                
                // Keep only last 50 history entries
                if (state.settingsHistory.length > 50) {
                  state.settingsHistory.splice(50);
                }
              });
            } catch (error) {
              set((state) => {
                state.loading.settings = false;
                state.errors.settings = error instanceof Error ? error.message : 'Failed to save settings';
              });
            }
          },

          updateSettings: (updates: Partial<AllSettings>) => {
            set((state) => {
              Object.keys(updates).forEach(key => {
                const settingsKey = key as keyof AllSettings;
                if (updates[settingsKey]) {
                  state[settingsKey] = { ...state[settingsKey], ...updates[settingsKey] };
                }
              });
              state.unsavedChanges = true;
              state.lastUpdated = new Date().toISOString();
              
              // Check if current settings differ from applied preset
              if (state.currentPreset) {
                const preset = [...state.availablePresets, ...state.customPresets].find(p => p.id === state.currentPreset);
                if (preset) {
                  const comparison = get().compareWithPreset(preset.id);
                  state.presetDirty = comparison.isDifferent;
                }
              }
            });
          },

          resetSettings: async () => {
            set((state) => {
              state.loading.settings = true;
            });

            try {
              const response = await fetch(`${API_BASE_URL}/users/settings/reset`, {
                method: 'POST'});

              if (!response.ok) {
                throw new Error('Failed to reset settings');
              }

              set((state) => {
                state.loading.settings = false;
                Object.assign(state, defaultSettings);
                state.currentPreset = null;
                state.presetDirty = false;
                state.unsavedChanges = false;
                state.lastUpdated = new Date().toISOString();
                state.lastSynced = new Date().toISOString();
                
                state.settingsHistory.unshift({
                  id: `reset-${Date.now()}`,
                  timestamp: new Date().toISOString(),
                  changes: defaultSettings,
                  source: 'user',
                  description: 'Reset to defaults'
                });
              });
            } catch (error) {
              set((state) => {
                state.loading.settings = false;
                state.errors.settings = error instanceof Error ? error.message : 'Failed to reset settings';
              });
            }
          },

          resetToDefaults: () => {
            set((state) => {
              Object.assign(state, defaultSettings);
              state.currentPreset = null;
              state.presetDirty = false;
              state.unsavedChanges = true;
              state.lastUpdated = new Date().toISOString();
              
              state.settingsHistory.unshift({
                id: `defaults-${Date.now()}`,
                timestamp: new Date().toISOString(),
                changes: defaultSettings,
                source: 'user',
                description: 'Reset to default values'
              });
            });
          },

          // Individual Setting Updates
          updateAppearance: (updates: Partial<AppearanceSettings>) => {
            set((state) => {
              state.appearance = { ...state.appearance, ...updates };
              state.unsavedChanges = true;
              state.lastUpdated = new Date().toISOString();
            });
            
            // Apply theme immediately
            get().applyThemeToDocument();
          },

          updateNotifications: (updates: Partial<NotificationSettings>) => {
            set((state) => {
              state.notifications = { ...state.notifications, ...updates };
              state.unsavedChanges = true;
              state.lastUpdated = new Date().toISOString();
            });
          },

          updateSecurity: (updates: Partial<SecuritySettings>) => {
            set((state) => {
              state.security = { ...state.security, ...updates };
              state.unsavedChanges = true;
              state.lastUpdated = new Date().toISOString();
            });
          },

          updatePrivacy: (updates: Partial<PrivacySettings>) => {
            set((state) => {
              state.privacy = { ...state.privacy, ...updates };
              state.unsavedChanges = true;
              state.lastUpdated = new Date().toISOString();
            });
          },

          updateWorkspace: (updates: Partial<WorkspaceSettings>) => {
            set((state) => {
              state.workspace = { ...state.workspace, ...updates };
              state.unsavedChanges = true;
              state.lastUpdated = new Date().toISOString();
            });
          },

          updateIntegrations: (updates: Partial<IntegrationSettings>) => {
            set((state) => {
              state.integrations = { ...state.integrations, ...updates };
              state.unsavedChanges = true;
              state.lastUpdated = new Date().toISOString();
            });
          },

          // Notification Channel Settings
          updateChannelNotifications: (channelId: string, settings: NotificationSettings['channels'][string]) => {
            set((state) => {
              state.notifications.channels[channelId] = settings;
              state.unsavedChanges = true;
              state.lastUpdated = new Date().toISOString();
            });
          },

          getChannelNotifications: (channelId: string) => {
            return get().notifications.channels[channelId] || null;
          },

          resetChannelNotifications: (channelId: string) => {
            set((state) => {
              delete state.notifications.channels[channelId];
              state.unsavedChanges = true;
              state.lastUpdated = new Date().toISOString();
            });
          },

          // Preset Management
          loadPresets: async () => {
            set((state) => {
              state.loading.presets = true;
              state.errors.presets = null;
            });

            try {
              const response = await fetch(`${API_BASE_URL}/users/settings/presets`, {});

              if (!response.ok) {
                throw new Error('Failed to load presets');
              }

              const data = await response.json();

              set((state) => {
                state.loading.presets = false;
                state.customPresets = data.presets || [];
              });
            } catch (error) {
              set((state) => {
                state.loading.presets = false;
                state.errors.presets = error instanceof Error ? error.message : 'Failed to load presets';
              });
            }
          },

          applyPreset: (presetId: string) => {
            const preset = [...get().availablePresets, ...get().customPresets].find(p => p.id === presetId);
            if (!preset) return;

            set((state) => {
              // Apply preset settings
              Object.keys(preset.settings).forEach(key => {
                const settingsKey = key as keyof AllSettings;
                if (preset.settings[settingsKey]) {
                  state[settingsKey] = { ...state[settingsKey], ...preset.settings[settingsKey] };
                }
              });

              state.currentPreset = presetId;
              state.presetDirty = false;
              state.unsavedChanges = true;
              state.lastUpdated = new Date().toISOString();

              state.settingsHistory.unshift({
                id: `preset-${Date.now()}`,
                timestamp: new Date().toISOString(),
                changes: preset.settings,
                source: 'preset',
                description: `Applied preset: ${preset.name}`
              });
            });

            // Apply theme immediately
            get().applyThemeToDocument();
          },

          createPreset: (preset: Omit<SettingsPreset, 'id' | 'createdAt' | 'updatedAt'>) => {
            const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const now = new Date().toISOString();

            const newPreset: SettingsPreset = {
              ...preset,
              id,
              category: preset.category || 'custom',
              createdAt: now,
              updatedAt: now
            };

            set((state) => {
              state.customPresets.push(newPreset);
              state.lastUpdated = new Date().toISOString();
            });

            return id;
          },

          updatePreset: (presetId: string, updates: Partial<SettingsPreset>) => {
            set((state) => {
              const presetIndex = state.customPresets.findIndex(p => p.id === presetId);
              if (presetIndex !== -1) {
                state.customPresets[presetIndex] = {
                  ...state.customPresets[presetIndex],
                  ...updates,
                  updatedAt: new Date().toISOString()
                };
                state.lastUpdated = new Date().toISOString();
              }
            });
          },

          deletePreset: (presetId: string) => {
            set((state) => {
              state.customPresets = state.customPresets.filter(p => p.id !== presetId);
              if (state.currentPreset === presetId) {
                state.currentPreset = null;
                state.presetDirty = false;
              }
              state.lastUpdated = new Date().toISOString();
            });
          },

          duplicatePreset: (presetId: string, newName: string) => {
            const originalPreset = [...get().availablePresets, ...get().customPresets].find(p => p.id === presetId);
            if (!originalPreset) return '';

            return get().createPreset({
              ...originalPreset,
              name: newName,
              description: `Copy of ${originalPreset.name}`
            });
          },

          // Preset Utilities
          getPresetById: (id: string) => {
            return [...get().availablePresets, ...get().customPresets].find(p => p.id === id) || null;
          },

          getPresetsByCategory: (category: SettingsPreset['category']) => {
            return [...get().availablePresets, ...get().customPresets].filter(p => p.category === category);
          },

          getPopularPresets: () => {
            return [...get().availablePresets, ...get().customPresets].filter(p => p.popular);
          },

          searchPresets: (query: string) => {
            const lowerQuery = query.toLowerCase();
            return [...get().availablePresets, ...get().customPresets].filter(preset =>
              preset.name.toLowerCase().includes(lowerQuery) ||
              preset.description.toLowerCase().includes(lowerQuery) ||
              preset.persona.toLowerCase().includes(lowerQuery) ||
              preset.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
            );
          },

          compareWithPreset: (presetId: string) => {
            const preset = get().getPresetById(presetId);
            if (!preset) return { differences: {}, isDifferent: false };

            const currentSettings = {
              appearance: get().appearance,
              notifications: get().notifications,
              security: get().security,
              privacy: get().privacy,
              workspace: get().workspace,
              integrations: get().integrations
            };

            const differences: Partial<AllSettings> = {};
            let isDifferent = false;

            Object.keys(preset.settings).forEach(key => {
              const settingsKey = key as keyof AllSettings;
              const presetValue = preset.settings[settingsKey];
              const currentValue = currentSettings[settingsKey];

              if (presetValue && JSON.stringify(presetValue) !== JSON.stringify(currentValue)) {
                differences[settingsKey] = currentValue;
                isDifferent = true;
              }
            });

            return { differences, isDifferent };
          },

          // Import/Export
          exportSettings: async (includePresets = false) => {
            set((state) => {
              state.exporting = true;
              state.errors.export = null;
              state.exportUrl = null;
            });

            try {
              const currentState = get();
              const exportData: SettingsExport = {
                version: '1.0.0',
                exportedAt: new Date().toISOString(),
                settings: {
                  appearance: currentState.appearance,
                  notifications: currentState.notifications,
                  security: { ...currentState.security, trustedDevices: [], activeSessions: [] }, // Exclude sensitive data
                  privacy: currentState.privacy,
                  workspace: currentState.workspace,
                  integrations: currentState.integrations
                },
                metadata: {
                  userAgent: navigator.userAgent,
                  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                }
              };

              if (includePresets) {
                exportData.presets = currentState.customPresets;
              }

              const dataStr = JSON.stringify(exportData, null, 2);
              const blob = new Blob([dataStr], { type: 'application/json' });
              const url = URL.createObjectURL(blob);

              set((state) => {
                state.exporting = false;
                state.exportUrl = url;
              });

              return url;
            } catch (error) {
              set((state) => {
                state.exporting = false;
                state.errors.export = error instanceof Error ? error.message : 'Failed to export settings';
              });
              return null;
            }
          },

          importSettings: async (data: string | SettingsExport) => {
            set((state) => {
              state.importing = true;
              state.errors.import = null;
              state.importErrors = [];
            });

            try {
              let importData: SettingsExport;
              
              if (typeof data === 'string') {
                importData = JSON.parse(data);
              } else {
                importData = data;
              }

              const result: SettingsImportResult = {
                success: true,
                imported: {
                  settings: false,
                  presets: 0
                },
                errors: [],
                warnings: []
              };

              // Validate import data
              if (!importData.version || !importData.settings) {
                throw new Error('Invalid settings export format');
              }

              // Import settings
              if (importData.settings) {
                // Validate settings structure
                const validation = get().validateSettings(importData.settings);
                if (Object.keys(validation).length > 0) {
                  result.warnings.push('Some imported settings have validation issues and were skipped');
                  
                  // Import only valid settings
                  const validSettings: Partial<AllSettings> = {};
                  Object.keys(importData.settings).forEach(key => {
                    const settingsKey = key as keyof AllSettings;
                    if (!validation[settingsKey]) {
                      validSettings[settingsKey] = importData.settings[settingsKey];
                    }
                  });
                  
                  get().updateSettings(validSettings);
                } else {
                  get().updateSettings(importData.settings);
                }
                
                result.imported.settings = true;
              }

              // Import custom presets
              if (importData.presets && Array.isArray(importData.presets)) {
                importData.presets.forEach(preset => {
                  try {
                    // Generate new ID to avoid conflicts
                    get().createPreset({
                      ...preset,
                      name: `${preset.name} (Imported)`
                    });
                    result.imported.presets++;
                  } catch (error) {
                    result.warnings.push(`Failed to import preset: ${preset.name}`);
                  }
                });
              }

              set((state) => {
                state.importing = false;
                state.lastUpdated = new Date().toISOString();
                
                state.settingsHistory.unshift({
                  id: `import-${Date.now()}`,
                  timestamp: new Date().toISOString(),
                  changes: importData.settings,
                  source: 'import',
                  description: 'Settings imported from backup'
                });
              });

              return result;
            } catch (error) {
              const result: SettingsImportResult = {
                success: false,
                imported: {
                  settings: false,
                  presets: 0
                },
                errors: [error instanceof Error ? error.message : 'Import failed'],
                warnings: []
              };

              set((state) => {
                state.importing = false;
                state.errors.import = result.errors[0];
                state.importErrors = result.errors;
              });

              return result;
            }
          },

          downloadSettingsBackup: async () => {
            const exportUrl = await get().exportSettings(true);
            if (exportUrl) {
              const link = document.createElement('a');
              link.href = exportUrl;
              link.download = `meridian-settings-backup-${new Date().toISOString().split('T')[0]}.json`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(exportUrl);
            }
          },

          // Settings History
          addToHistory: (changes: Partial<AllSettings>, source = 'user', description?: string) => {
            set((state) => {
              state.settingsHistory.unshift({
                id: `${source}-${Date.now()}`,
                timestamp: new Date().toISOString(),
                changes,
                source,
                description
              });
              
              // Keep only last 50 entries
              if (state.settingsHistory.length > 50) {
                state.settingsHistory.splice(50);
              }
            });
          },

          getSettingsHistory: (limit = 20) => {
            return get().settingsHistory.slice(0, limit);
          },

          revertToHistoryEntry: async (historyId: string) => {
            const entry = get().settingsHistory.find(h => h.id === historyId);
            if (!entry) return;

            get().updateSettings(entry.changes);
            
            set((state) => {
              state.settingsHistory.unshift({
                id: `revert-${Date.now()}`,
                timestamp: new Date().toISOString(),
                changes: entry.changes,
                source: 'user',
                description: `Reverted to: ${entry.description || 'Previous state'}`
              });
            });
          },

          clearHistory: () => {
            set((state) => {
              state.settingsHistory = [];
            });
          },

          // Validation
          validateSettings: (settings?: Partial<AllSettings>) => {
            const settingsToValidate = settings || get();
            const errors: Record<string, string[]> = {};

            // Validate appearance settings
            if (settingsToValidate.appearance) {
              const { fontSize, density, theme } = settingsToValidate.appearance;
              if (fontSize && (fontSize < 10 || fontSize > 24)) {
                errors.appearance = errors.appearance || [];
                errors.appearance.push('Font size must be between 10 and 24');
              }
              if (density && !['compact', 'comfortable', 'spacious'].includes(density)) {
                errors.appearance = errors.appearance || [];
                errors.appearance.push('Invalid density value');
              }
              if (theme && !['light', 'dark', 'system'].includes(theme)) {
                errors.appearance = errors.appearance || [];
                errors.appearance.push('Invalid theme value');
              }
            }

            // Validate workspace settings
            if (settingsToValidate.workspace) {
              const { timeFormat, dateFormat, weekStart } = settingsToValidate.workspace;
              if (timeFormat && !['12h', '24h'].includes(timeFormat)) {
                errors.workspace = errors.workspace || [];
                errors.workspace.push('Invalid time format');
              }
              if (dateFormat && !['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'].includes(dateFormat)) {
                errors.workspace = errors.workspace || [];
                errors.workspace.push('Invalid date format');
              }
              if (weekStart !== undefined && ![0, 1].includes(weekStart)) {
                errors.workspace = errors.workspace || [];
                errors.workspace.push('Invalid week start day');
              }
            }

            set((state) => {
              state.validationErrors = errors;
            });

            return errors;
          },

          hasValidationErrors: () => {
            return Object.keys(get().validationErrors).length > 0;
          },

          getValidationSummary: () => {
            const errors = get().validationErrors;
            const errorCount = Object.values(errors).reduce((sum, errs) => sum + errs.length, 0);
            const fields = Object.keys(errors);
            
            return {
              errors: errorCount,
              warnings: 0, // TODO: Implement warnings
              fields
            };
          },

          // Utility Functions
          isDefaultValue: (key: keyof AllSettings, subKey?: string) => {
            const currentValue = get()[key];
            const defaultValue = defaultSettings[key];
            
            if (subKey) {
              return JSON.stringify((currentValue as any)?.[subKey]) === JSON.stringify((defaultValue as any)?.[subKey]);
            }
            
            return JSON.stringify(currentValue) === JSON.stringify(defaultValue);
          },

          getChangedSettings: () => {
            const current = get();
            const changes: Partial<AllSettings> = {};
            
            Object.keys(defaultSettings).forEach(key => {
              const settingsKey = key as keyof AllSettings;
              if (JSON.stringify(current[settingsKey]) !== JSON.stringify(defaultSettings[settingsKey])) {
                changes[settingsKey] = current[settingsKey];
              }
            });
            
            return changes;
          },

          hasUnsavedChanges: () => {
            return get().unsavedChanges;
          },

          confirmUnsavedChanges: async () => {
            if (!get().unsavedChanges) return true;
            
            // In a real implementation, this would show a modal
            return window.confirm('You have unsaved changes. Do you want to continue without saving?');
          },

          // Theme and Appearance Helpers
          getComputedTheme: () => {
            const theme = get().appearance.theme;
            if (theme === 'system') {
              return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }
            return theme;
          },

          applyThemeToDocument: () => {
            const computedTheme = get().getComputedTheme();
            const customTheme = get().appearance.customTheme;
            
            document.documentElement.setAttribute('data-theme', computedTheme);
            
            if (customTheme) {
              const root = document.documentElement.style;
              root.setProperty('--primary-color', customTheme.primaryColor);
              root.setProperty('--secondary-color', customTheme.secondaryColor);
              root.setProperty('--accent-color', customTheme.accentColor);
              root.setProperty('--background-color', customTheme.backgroundColor);
              root.setProperty('--surface-color', customTheme.surfaceColor);
              root.setProperty('--text-color', customTheme.textColor);
              root.setProperty('--border-color', customTheme.borderColor);
            }
          },

          previewTheme: (theme: 'light' | 'dark' | 'system') => {
            document.documentElement.setAttribute('data-theme-preview', theme === 'system' ? 
              (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme);
            
            // Reset preview after 5 seconds
            setTimeout(() => {
              document.documentElement.removeAttribute('data-theme-preview');
            }, 5000);
          },

          // Synchronization
          syncWithServer: async () => {
            await get().saveSettings();
            await get().loadSettings();
          },

          syncWithWorkspace: async (workspaceId: string) => {
            try {
              const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/settings/sync`, {
                method: 'POST'});

              if (!response.ok) {
                throw new Error('Failed to sync with workspace');
              }

              const data = await response.json();
              
              if (data.settings) {
                get().updateSettings(data.settings);
              }
            } catch (error) {
              set((state) => {
                state.errors.settings = error instanceof Error ? error.message : 'Failed to sync with workspace';
              });
            }
          },

          // Loading and Error Management
          setLoading: (key: keyof ConsolidatedSettingsState['loading'], value: boolean) => {
            set((state) => {
              state.loading[key] = value;
            });
          },

          setError: (key: keyof ConsolidatedSettingsState['errors'], value: string | null) => {
            set((state) => {
              state.errors[key] = value;
            });
          },

          clearErrors: () => {
            set((state) => {
              state.errors = {
                settings: null,
                presets: null,
                import: null,
                export: null,
                validation: null
              };
            });
          },

          clearError: (key: keyof ConsolidatedSettingsState['errors']) => {
            set((state) => {
              state.errors[key] = null;
            });
          },

          // Cleanup
          cleanup: () => {
            // Clean up any URLs or timers
            const exportUrl = get().exportUrl;
            if (exportUrl) {
              URL.revokeObjectURL(exportUrl);
            }
            
            set((state) => {
              state.exportUrl = null;
            });
          },

          reset: () => {
            set(() => ({ ...initialState }));
          }
        }))
      ),
      {
        name: 'consolidated-settings-store',
        partialize: (state) => ({
          // Persist all settings
          appearance: state.appearance,
          notifications: state.notifications,
          security: {
            ...state.security,
            trustedDevices: [], // Don't persist sensitive device data
            activeSessions: []
          },
          privacy: state.privacy,
          workspace: state.workspace,
          integrations: {
            ...state.integrations,
            webhooks: state.integrations.webhooks.map(webhook => ({
              ...webhook,
              secret: undefined, // Don't persist webhook secrets
            }))
          },
          customPresets: state.customPresets,
          currentPreset: state.currentPreset,
          settingsHistory: state.settingsHistory.slice(0, 10), // Keep only recent history
        }),
        version: 1
      }
    ),
    {
      name: 'consolidated-settings-store'
    }
  )
);

// Selector hooks for optimized re-renders
export const useSettingsStore = useConsolidatedSettingsStore;

// Specialized selector hooks
export const useAppearanceSettings = () => useConsolidatedSettingsStore((state) => state.appearance);
export const useNotificationSettings = () => useConsolidatedSettingsStore((state) => state.notifications);
export const useSecuritySettings = () => useConsolidatedSettingsStore((state) => state.security);
export const usePrivacySettings = () => useConsolidatedSettingsStore((state) => state.privacy);
export const useWorkspaceSettings = () => useConsolidatedSettingsStore((state) => state.workspace);
export const useIntegrationSettings = () => useConsolidatedSettingsStore((state) => state.integrations);
export const useSettingsPresets = () => useConsolidatedSettingsStore((state) => ({
  available: state.availablePresets,
  custom: state.customPresets,
  current: state.currentPreset,
  dirty: state.presetDirty
}));
export const useSettingsValidation = () => useConsolidatedSettingsStore((state) => ({
  errors: state.validationErrors,
  hasErrors: Object.keys(state.validationErrors).length > 0,
  unsavedChanges: state.unsavedChanges
}));
export const useTheme = () => {
  const appearance = useAppearanceSettings();
  const getComputedTheme = useConsolidatedSettingsStore((state) => state.getComputedTheme);
  
  return {
    theme: appearance.theme,
    computedTheme: getComputedTheme(),
    customTheme: appearance.customTheme,
    fontSize: appearance.fontSize,
    density: appearance.density,
    animations: appearance.animations,
    reducedMotion: appearance.reducedMotion
  };
};

export default useConsolidatedSettingsStore;