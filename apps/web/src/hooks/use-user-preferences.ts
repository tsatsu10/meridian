import { useState, useEffect, useCallback, useRef } from "react";
import { API_BASE_URL, API_URL } from '@/constants/urls';
import useAuth from "@/components/providers/auth-provider/hooks/use-auth";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

// Helper function to sanitize data for JSON serialization
const sanitizeForJSON = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  
  // Handle primitives
  if (typeof obj !== 'object') return obj;
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForJSON(item));
  }
  
  // Handle objects
  const cleaned: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      
      // Skip functions, symbols, and undefined
      if (typeof value === 'function' || typeof value === 'symbol' || value === undefined) {
        continue;
      }
      
      // Skip DOM nodes
      if (value instanceof Element || value instanceof Node) {
        continue;
      }
      
      // Recursively clean nested objects
      cleaned[key] = sanitizeForJSON(value);
    }
  }
  
  return cleaned;
};

// Type definitions for user preferences
export interface DashboardSettings {
  viewMode?: 'standard' | 'custom';
  isEditMode?: boolean;
  productivityChartType?: 'line' | 'bar' | 'area';
  taskChartType?: 'line' | 'bar' | 'area';
  healthChartType?: 'pie' | 'bar' | 'line';
  workspaceHealthChartType?: 'pie' | 'bar' | 'line';
  filters?: any;
  widgets?: any[];
}

export interface UserSettings {
  projectsViewMode?: 'grid' | 'list' | 'board';
  allTasksViewMode?: 'list' | 'kanban' | 'calendar';
  tutorialsCompleted?: string[];
  sidebarCollapsed?: boolean;
  compactMode?: boolean;
  [key: string]: any;
}

export interface UserPreferences {
  id?: string;
  userId?: string;
  pinnedProjects?: string[];
  dashboardLayout?: DashboardSettings;
  theme?: 'light' | 'dark' | 'system';
  notifications?: any;
  settings?: UserSettings;
  createdAt?: Date;
  updatedAt?: Date;
}

// Storage keys for localStorage fallback
const STORAGE_KEYS = {
  PINNED_PROJECTS: 'meridian_pinned_projects',
  PROJECTS_VIEW: 'meridian_projects_view',
  TASKS_VIEW: 'all-tasks-view-mode',
  DASHBOARD_LAYOUT: 'meridian-dashboard-layout',
  SETTINGS: 'meridian-user-settings',
  THEME: 'meridian-theme',
};

export function useUserPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Track if preferences have been loaded to prevent re-loading
  const hasLoadedRef = useRef(false);

  // Load preferences from API on mount
  useEffect(() => {
    if (!user?.email) {
      setIsLoading(false);
      return;
    }

    // Only load once per user
    if (hasLoadedRef.current) {
      return;
    }

    const loadPreferences = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/user-preferences?userEmail=${encodeURIComponent(user.email)}`,
          { credentials: 'include' }
        );

        if (response.ok) {
          const data = await response.json();
          setPreferences(data);
          
          // Cache in localStorage for offline access
          cacheToLocalStorage(data);
          hasLoadedRef.current = true;
        } else {
          // Fallback to localStorage
          loadFromLocalStorage();
          hasLoadedRef.current = true;
        }
      } catch (error) {
        console.error("Failed to load user preferences:", error);
        loadFromLocalStorage();
        hasLoadedRef.current = true;
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, [user?.email]);

  // Load from localStorage fallback
  const loadFromLocalStorage = () => {
    try {
      const cached: UserPreferences = {
        pinnedProjects: JSON.parse(localStorage.getItem(STORAGE_KEYS.PINNED_PROJECTS) || '[]'),
        settings: {
          projectsViewMode: localStorage.getItem(STORAGE_KEYS.PROJECTS_VIEW) as any,
          allTasksViewMode: localStorage.getItem(STORAGE_KEYS.TASKS_VIEW) as any,
          ...JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || '{}'),
        },
        dashboardLayout: JSON.parse(localStorage.getItem(STORAGE_KEYS.DASHBOARD_LAYOUT) || '{}'),
        theme: localStorage.getItem(STORAGE_KEYS.THEME) as any,
      };
      setPreferences(cached);
    } catch (error) {
      console.error("Failed to load from localStorage:", error);
    }
  };

  // Cache to localStorage
  const cacheToLocalStorage = (prefs: UserPreferences) => {
    try {
      if (prefs.pinnedProjects) {
        localStorage.setItem(STORAGE_KEYS.PINNED_PROJECTS, JSON.stringify(prefs.pinnedProjects));
      }
      if (prefs.settings?.projectsViewMode) {
        localStorage.setItem(STORAGE_KEYS.PROJECTS_VIEW, prefs.settings.projectsViewMode);
      }
      if (prefs.settings?.allTasksViewMode) {
        localStorage.setItem(STORAGE_KEYS.TASKS_VIEW, prefs.settings.allTasksViewMode);
      }
      if (prefs.dashboardLayout) {
        localStorage.setItem(STORAGE_KEYS.DASHBOARD_LAYOUT, JSON.stringify(prefs.dashboardLayout));
      }
      if (prefs.settings) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(prefs.settings));
      }
      if (prefs.theme) {
        localStorage.setItem(STORAGE_KEYS.THEME, prefs.theme);
      }
    } catch (error) {
      console.error("Failed to cache to localStorage:", error);
    }
  };

  // Debounce timer ref
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Save preferences to API (debounced)
  const savePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
    if (!user?.email) return;

    // Update local state immediately for responsive UI (use functional update)
    setPreferences(prev => {
      const updated = { ...prev, ...updates };
      cacheToLocalStorage(updated);
      return updated;
    });

    // Clear any pending save
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // Debounce the API call
    saveTimerRef.current = setTimeout(async () => {
      setIsSyncing(true);

      try {
        // Sanitize updates to remove non-serializable data
        const sanitizedUpdates = sanitizeForJSON(updates);
        
        const requestBody = {
          userEmail: user.email,
          ...sanitizedUpdates,
        };
        logger.debug('[Preferences] Saving to API:', requestBody);
        logger.debug('[Preferences] Updates keys:', Object.keys(sanitizedUpdates));
        
        // Validate we have data to send
        if (Object.keys(sanitizedUpdates).length === 0) {
          console.warn('[Preferences] No valid data to save, skipping API call');
          return;
        }
        
        // Stringify with error handling
        let bodyString: string;
        try {
          bodyString = JSON.stringify(requestBody);
          logger.debug('[Preferences] JSON body length:', bodyString.length);
          logger.debug('[Preferences] JSON body preview:', bodyString.substring(0, 200));
          
          // Validate the string is not empty
          if (!bodyString || bodyString.length < 10) {
            console.error('[Preferences] Body string too short:', bodyString);
            throw new Error('Invalid body string generated');
          }
          
          // Validate it's valid JSON by parsing it back
          JSON.parse(bodyString);
          logger.debug('[Preferences] JSON validation: PASSED');
        } catch (stringifyError) {
          console.error('[Preferences] Failed to stringify/validate request body:', stringifyError);
          console.error('[Preferences] Original updates:', updates);
          console.error('[Preferences] Sanitized updates:', sanitizedUpdates);
          throw new Error('Invalid data structure in preferences');
        }
        
        logger.debug('[Preferences] About to send fetch request...');
        const response = await fetch(`${API_BASE_URL}/user-preferences`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Content-Length': bodyString.length.toString(),
          },
          credentials: 'include',
          body: bodyString,
        });
        logger.debug('[Preferences] Fetch completed, status:', response.status);

        logger.debug('[Preferences] Response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[Preferences] Error response:', errorText);
          throw new Error(`Failed to save preferences: ${response.status} ${errorText}`);
        }

        const saved = await response.json();
        logger.debug('[Preferences] Successfully saved:', saved);
        // Don't update local state from server response to avoid race conditions
        // Local state was already updated optimistically (line 180-184)
      } catch (error) {
        console.error("Failed to save preferences:", error);
        // Preferences are already saved to localStorage, so data isn't lost
        // Only log the error, don't show user notification for background saves
      } finally {
        setIsSyncing(false);
      }
    }, 1000); // Wait 1 second before saving to API
  }, [user?.email]); // Removed preferences and isSyncing from dependencies

  // Update specific preference fields (using refs to avoid stale closures)
  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;

  const updateProjectsViewMode = useCallback((mode: 'grid' | 'list' | 'board') => {
    const newSettings = { ...preferencesRef.current.settings, projectsViewMode: mode };
    savePreferences({ settings: newSettings });
  }, [savePreferences]);

  const updateAllTasksViewMode = useCallback((mode: 'list' | 'kanban' | 'calendar') => {
    const newSettings = { ...preferencesRef.current.settings, allTasksViewMode: mode };
    savePreferences({ settings: newSettings });
  }, [savePreferences]);

  const updateDashboardLayout = useCallback((layout: Partial<DashboardSettings>) => {
    const newLayout = { ...preferencesRef.current.dashboardLayout, ...layout };
    savePreferences({ dashboardLayout: newLayout });
  }, [savePreferences]);

  const updateSettings = useCallback((settings: Partial<UserSettings>) => {
    const newSettings = { ...preferencesRef.current.settings, ...settings };
    savePreferences({ settings: newSettings });
  }, [savePreferences]);

  const updateTheme = useCallback((theme: 'light' | 'dark' | 'system') => {
    savePreferences({ theme });
  }, [savePreferences]);

  return {
    preferences,
    isLoading,
    isSyncing,
    
    // Getters
    projectsViewMode: preferences.settings?.projectsViewMode || 'grid',
    allTasksViewMode: preferences.settings?.allTasksViewMode || 'list',
    dashboardLayout: preferences.dashboardLayout || {},
    theme: preferences.theme || 'system',
    
    // Setters
    updateProjectsViewMode,
    updateAllTasksViewMode,
    updateDashboardLayout,
    updateSettings,
    updateTheme,
    savePreferences,
  };
}

