// Consolidated settings provider with persistence and validation
import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { z } from 'zod';
import { useAuth } from '@/components/providers/unified-context-provider';
import useWorkspaceStore from '@/store/workspace';

// Settings schema definitions
const ThemeSchema = z.enum(['light', 'dark', 'system']);
const LanguageSchema = z.enum(['en', 'es', 'fr', 'de', 'zh', 'ja']);
const TimezoneSchema = z.string().min(1);
const DateFormatSchema = z.enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'DD MMM YYYY']);
const TimeFormatSchema = z.enum(['12h', '24h']);

const ProfileSettingsSchema = z.object({
  displayName: z.string().min(1).max(100),
  email: z.string().email(),
  bio: z.string().max(500).optional(),
  avatar: z.string().url().optional(),
  jobTitle: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  timezone: TimezoneSchema,
  language: LanguageSchema,
});

const AppearanceSettingsSchema = z.object({
  theme: ThemeSchema,
  compactMode: z.boolean(),
  showAvatars: z.boolean(),
  fontSize: z.enum(['sm', 'md', 'lg']),
  sidebarCollapsed: z.boolean(),
  dateFormat: DateFormatSchema,
  timeFormat: TimeFormatSchema,
  enableAnimations: z.boolean(),
  highContrast: z.boolean(),
});

const NotificationSettingsSchema = z.object({
  email: z.object({
    enabled: z.boolean(),
    mentions: z.boolean(),
    directMessages: z.boolean(),
    taskAssignments: z.boolean(),
    projectUpdates: z.boolean(),
    weeklyDigest: z.boolean(),
    marketingEmails: z.boolean(),
  }),
  push: z.object({
    enabled: z.boolean(),
    mentions: z.boolean(),
    directMessages: z.boolean(),
    taskAssignments: z.boolean(),
    soundEnabled: z.boolean(),
    vibrationEnabled: z.boolean(),
  }),
  inApp: z.object({
    enabled: z.boolean(),
    mentions: z.boolean(),
    directMessages: z.boolean(),
    taskAssignments: z.boolean(),
    soundEffects: z.boolean(),
    desktop: z.boolean(),
  }),
});

const SecuritySettingsSchema = z.object({
  twoFactorEnabled: z.boolean(),
  sessionTimeout: z.number().min(5).max(1440), // minutes
  passwordChangeRequired: z.boolean(),
  loginNotifications: z.boolean(),
  deviceTracking: z.boolean(),
  dataRetention: z.number().min(30).max(2555), // days
});

const IntegrationSettingsSchema = z.object({
  slack: z.object({
    enabled: z.boolean(),
    webhookUrl: z.string().url().optional(),
    channels: z.array(z.string()).optional(),
  }),
  github: z.object({
    enabled: z.boolean(),
    token: z.string().optional(),
    repositories: z.array(z.string()).optional(),
  }),
  googleCalendar: z.object({
    enabled: z.boolean(),
    syncEnabled: z.boolean(),
    calendarId: z.string().optional(),
  }),
  microsoftTeams: z.object({
    enabled: z.boolean(),
    webhookUrl: z.string().url().optional(),
  }),
});

const WorkspaceSettingsSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  defaultRole: z.enum(['viewer', 'member', 'admin']),
  allowGuestAccess: z.boolean(),
  requireApproval: z.boolean(),
  retentionPolicy: z.number().min(30).max(2555),
  backupEnabled: z.boolean(),
  auditLogsEnabled: z.boolean(),
  ssoEnabled: z.boolean(),
  customBranding: z.object({
    logo: z.string().url().optional(),
    primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
    secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  }),
});

const APISettingsSchema = z.object({
  keys: z.array(z.object({
    id: z.string(),
    name: z.string(),
    key: z.string(),
    permissions: z.array(z.string()),
    lastUsed: z.string().optional(),
    expiresAt: z.string().optional(),
  })),
  rateLimitEnabled: z.boolean(),
  webhooks: z.array(z.object({
    id: z.string(),
    name: z.string(),
    url: z.string().url(),
    events: z.array(z.string()),
    enabled: z.boolean(),
  })),
});

const DataPrivacySettingsSchema = z.object({
  analytics: z.boolean(),
  crashReporting: z.boolean(),
  usageTracking: z.boolean(),
  dataExport: z.object({
    format: z.enum(['json', 'csv', 'xml']),
    includeMetadata: z.boolean(),
  }),
  dataRetention: z.object({
    messages: z.number().min(30).max(2555),
    files: z.number().min(30).max(2555),
    activities: z.number().min(30).max(2555),
  }),
});

// Complete settings interface
export interface Settings {
  profile: z.infer<typeof ProfileSettingsSchema>;
  appearance: z.infer<typeof AppearanceSettingsSchema>;
  notifications: z.infer<typeof NotificationSettingsSchema>;
  security: z.infer<typeof SecuritySettingsSchema>;
  integrations: z.infer<typeof IntegrationSettingsSchema>;
  workspace: z.infer<typeof WorkspaceSettingsSchema>;
  api: z.infer<typeof APISettingsSchema>;
  dataPrivacy: z.infer<typeof DataPrivacySettingsSchema>;
}

// Default settings
const defaultSettings: Settings = {
  profile: {
    displayName: '',
    email: '',
    bio: '',
    avatar: '',
    jobTitle: '',
    department: '',
    location: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: 'en',
  },
  appearance: {
    theme: 'system',
    compactMode: false,
    showAvatars: true,
    fontSize: 'md',
    sidebarCollapsed: false,
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    enableAnimations: true,
    highContrast: false,
  },
  notifications: {
    email: {
      enabled: true,
      mentions: true,
      directMessages: true,
      taskAssignments: true,
      projectUpdates: true,
      weeklyDigest: true,
      marketingEmails: false,
    },
    push: {
      enabled: true,
      mentions: true,
      directMessages: true,
      taskAssignments: true,
      soundEnabled: true,
      vibrationEnabled: true,
    },
    inApp: {
      enabled: true,
      mentions: true,
      directMessages: true,
      taskAssignments: true,
      soundEffects: true,
      desktop: true,
    },
  },
  security: {
    twoFactorEnabled: false,
    sessionTimeout: 480, // 8 hours
    passwordChangeRequired: false,
    loginNotifications: true,
    deviceTracking: true,
    dataRetention: 365,
  },
  integrations: {
    slack: { enabled: false },
    github: { enabled: false },
    googleCalendar: { enabled: false, syncEnabled: false },
    microsoftTeams: { enabled: false },
  },
  workspace: {
    name: '',
    description: '',
    defaultRole: 'member',
    allowGuestAccess: false,
    requireApproval: true,
    retentionPolicy: 365,
    backupEnabled: true,
    auditLogsEnabled: true,
    ssoEnabled: false,
    customBranding: {},
  },
  api: {
    keys: [],
    rateLimitEnabled: true,
    webhooks: [],
  },
  dataPrivacy: {
    analytics: true,
    crashReporting: true,
    usageTracking: false,
    dataExport: {
      format: 'json',
      includeMetadata: true,
    },
    dataRetention: {
      messages: 365,
      files: 365,
      activities: 90,
    },
  },
};

// Actions
type SettingsAction =
  | { type: 'LOAD_SETTINGS'; payload: Partial<Settings> }
  | { type: 'UPDATE_SECTION'; payload: { section: keyof Settings; data: any } }
  | { type: 'UPDATE_FIELD'; payload: { section: keyof Settings; field: string; value: any } }
  | { type: 'RESET_SECTION'; payload: keyof Settings }
  | { type: 'RESET_ALL' }
  | { type: 'SET_LOADING'; payload: { section?: keyof Settings; loading: boolean } }
  | { type: 'SET_ERROR'; payload: { section?: keyof Settings; error: string | null } };

interface SettingsState {
  settings: Settings;
  loading: Partial<Record<keyof Settings, boolean>>;
  errors: Partial<Record<keyof Settings, string | null>>;
  isDirty: Partial<Record<keyof Settings, boolean>>;
}

function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    case 'LOAD_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
        isDirty: {},
      };

    case 'UPDATE_SECTION':
      return {
        ...state,
        settings: {
          ...state.settings,
          [action.payload.section]: action.payload.data,
        },
        isDirty: {
          ...state.isDirty,
          [action.payload.section]: true,
        },
        errors: {
          ...state.errors,
          [action.payload.section]: null,
        },
      };

    case 'UPDATE_FIELD': {
      const { section, field, value } = action.payload;
      return {
        ...state,
        settings: {
          ...state.settings,
          [section]: {
            ...state.settings[section],
            [field]: value,
          },
        },
        isDirty: {
          ...state.isDirty,
          [section]: true,
        },
      };
    }

    case 'RESET_SECTION':
      return {
        ...state,
        settings: {
          ...state.settings,
          [action.payload]: defaultSettings[action.payload],
        },
        isDirty: {
          ...state.isDirty,
          [action.payload]: false,
        },
        errors: {
          ...state.errors,
          [action.payload]: null,
        },
      };

    case 'RESET_ALL':
      return {
        ...state,
        settings: defaultSettings,
        isDirty: {},
        errors: {},
      };

    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload.section
          ? { ...state.loading, [action.payload.section]: action.payload.loading }
          : Object.keys(state.loading).reduce(
              (acc, key) => ({ ...acc, [key]: action.payload.loading }),
              {}
            ),
      };

    case 'SET_ERROR':
      return {
        ...state,
        errors: action.payload.section
          ? { ...state.errors, [action.payload.section]: action.payload.error }
          : Object.keys(state.errors).reduce(
              (acc, key) => ({ ...acc, [key]: action.payload.error }),
              {}
            ),
      };

    default:
      return state;
  }
}

// Context
interface SettingsContextValue {
  state: SettingsState;
  
  // Actions
  updateSection: <K extends keyof Settings>(section: K, data: Settings[K]) => Promise<void>;
  updateField: <K extends keyof Settings>(section: K, field: keyof Settings[K], value: any) => void;
  resetSection: (section: keyof Settings) => void;
  resetAll: () => void;
  saveSettings: (section?: keyof Settings) => Promise<void>;
  loadSettings: () => Promise<void>;
  
  // Utilities
  validateSection: <K extends keyof Settings>(section: K, data: Settings[K]) => { success: boolean; errors?: any[] };
  exportSettings: (sections?: (keyof Settings)[]) => string;
  importSettings: (data: string) => Promise<void>;
  
  // Getters
  getSetting: <K extends keyof Settings>(section: K, field?: keyof Settings[K]) => any;
  isDirty: (section?: keyof Settings) => boolean;
  hasErrors: (section?: keyof Settings) => boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

// Hook
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

// Provider
interface SettingsProviderProps {
  children: React.ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const { workspace } = useWorkspaceStore();
  
  const [state, dispatch] = useReducer(settingsReducer, {
    settings: defaultSettings,
    loading: {},
    errors: {},
    isDirty: {},
  });

  // Schema validation mapping
  const schemas = {
    profile: ProfileSettingsSchema,
    appearance: AppearanceSettingsSchema,
    notifications: NotificationSettingsSchema,
    security: SecuritySettingsSchema,
    integrations: IntegrationSettingsSchema,
    workspace: WorkspaceSettingsSchema,
    api: APISettingsSchema,
    dataPrivacy: DataPrivacySettingsSchema,
  };

  // Load settings on mount
  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  // API functions
  const loadSettings = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: { loading: true } });
    
    try {
      // Load from localStorage and API
      const localSettings = localStorage.getItem('meridian_user_settings');
      const parsedLocal = localSettings ? JSON.parse(localSettings) : {};
      
      // TODO: Load from API
      // const apiSettings = await fetchSettings();
      
      const mergedSettings = { ...defaultSettings, ...parsedLocal };
      dispatch({ type: 'LOAD_SETTINGS', payload: mergedSettings });
    } catch (error) {
      console.error('Failed to load settings:', error);
      dispatch({ type: 'SET_ERROR', payload: { error: 'Failed to load settings' } });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: { loading: false } });
    }
  }, []);

  const saveSettings = useCallback(async (section?: keyof Settings) => {
    const sectionsToSave = section ? [section] : Object.keys(state.isDirty).filter(s => state.isDirty[s as keyof Settings]);
    
    for (const sectionKey of sectionsToSave) {
      const sectionName = sectionKey as keyof Settings;
      dispatch({ type: 'SET_LOADING', payload: { section: sectionName, loading: true } });
      
      try {
        // Validate section
        const validation = validateSection(sectionName, state.settings[sectionName]);
        if (!validation.success) {
          throw new Error(`Validation failed for ${sectionName}`);
        }
        
        // Save to localStorage
        localStorage.setItem('meridian_user_settings', JSON.stringify(state.settings));
        
        // TODO: Save to API
        // await saveSettingsToAPI(sectionName, state.settings[sectionName]);
        
        dispatch({ type: 'SET_LOADING', payload: { section: sectionName, loading: false } });
      } catch (error) {
        console.error(`Failed to save ${sectionName} settings:`, error);
        dispatch({ 
          type: 'SET_ERROR', 
          payload: { section: sectionName, error: `Failed to save ${sectionName} settings` } 
        });
      }
    }
  }, [state.settings, state.isDirty]);

  const updateSection = useCallback(async <K extends keyof Settings>(
    section: K, 
    data: Settings[K]
  ) => {
    const validation = validateSection(section, data);
    if (!validation.success) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: { section, error: 'Validation failed' } 
      });
      return;
    }
    
    dispatch({ type: 'UPDATE_SECTION', payload: { section, data } });
    await saveSettings(section);
  }, [saveSettings]);

  const updateField = useCallback(<K extends keyof Settings>(
    section: K, 
    field: keyof Settings[K], 
    value: any
  ) => {
    dispatch({ type: 'UPDATE_FIELD', payload: { section, field: field as string, value } });
  }, []);

  const resetSection = useCallback((section: keyof Settings) => {
    dispatch({ type: 'RESET_SECTION', payload: section });
  }, []);

  const resetAll = useCallback(() => {
    dispatch({ type: 'RESET_ALL' });
    localStorage.removeItem('meridian_user_settings');
  }, []);

  const validateSection = useCallback(<K extends keyof Settings>(
    section: K, 
    data: Settings[K]
  ) => {
    const schema = schemas[section];
    const result = schema.safeParse(data);
    return {
      success: result.success,
      errors: result.success ? undefined : result.error.errors,
    };
  }, [schemas]);

  const exportSettings = useCallback((sections?: (keyof Settings)[]) => {
    const settingsToExport = sections 
      ? sections.reduce((acc, section) => ({ ...acc, [section]: state.settings[section] }), {})
      : state.settings;
    
    return JSON.stringify(settingsToExport, null, 2);
  }, [state.settings]);

  const importSettings = useCallback(async (data: string) => {
    try {
      const parsedData = JSON.parse(data);
      
      // Validate all sections
      for (const [section, sectionData] of Object.entries(parsedData)) {
        if (section in schemas) {
          const validation = validateSection(section as keyof Settings, sectionData);
          if (!validation.success) {
            throw new Error(`Invalid data for section: ${section}`);
          }
        }
      }
      
      dispatch({ type: 'LOAD_SETTINGS', payload: parsedData });
      await saveSettings();
    } catch (error) {
      console.error('Failed to import settings:', error);
      throw error;
    }
  }, [saveSettings, validateSection]);

  const getSetting = useCallback(<K extends keyof Settings>(
    section: K, 
    field?: keyof Settings[K]
  ) => {
    return field ? state.settings[section][field] : state.settings[section];
  }, [state.settings]);

  const isDirty = useCallback((section?: keyof Settings) => {
    return section 
      ? Boolean(state.isDirty[section])
      : Object.values(state.isDirty).some(Boolean);
  }, [state.isDirty]);

  const hasErrors = useCallback((section?: keyof Settings) => {
    return section
      ? Boolean(state.errors[section])
      : Object.values(state.errors).some(Boolean);
  }, [state.errors]);

  const contextValue: SettingsContextValue = {
    state,
    updateSection,
    updateField,
    resetSection,
    resetAll,
    saveSettings,
    loadSettings,
    validateSection,
    exportSettings,
    importSettings,
    getSetting,
    isDirty,
    hasErrors,
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsProvider;