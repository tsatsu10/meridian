// Enterprise-grade navigation provider with state management and persistence
import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { useRouter, useLocation } from '@tanstack/react-router';
import useWorkspaceStore from '@/store/workspace';
import { useAuth } from '@/components/providers/unified-context-provider';

// Types for navigation system
export interface NavigationItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  href?: string;
  children?: NavigationItem[];
  badge?: string | number;
  isActive?: boolean;
  permissions?: string[];
  metadata?: Record<string, any>;
}

export interface BreadcrumbItem {
  id: string;
  label: string;
  href?: string;
  isCurrentPage?: boolean;
}

export interface NavigationState {
  // Core navigation state
  isCollapsed: boolean;
  isMobileOpen: boolean;
  activeSection: string;
  
  // Breadcrumb state
  breadcrumbs: BreadcrumbItem[];
  
  // Search state
  searchQuery: string;
  searchResults: any[];
  isSearching: boolean;
  
  // Context awareness
  currentWorkspace: string | null;
  currentProject: string | null;
  currentTeam: string | null;
  
  // User preferences
  preferences: {
    theme: 'light' | 'dark' | 'system';
    sidebarWidth: number;
    compactMode: boolean;
    showBadges: boolean;
  };
}

type NavigationAction =
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_MOBILE_OPEN'; payload: boolean }
  | { type: 'SET_ACTIVE_SECTION'; payload: string }
  | { type: 'SET_BREADCRUMBS'; payload: BreadcrumbItem[] }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_SEARCH_RESULTS'; payload: any[] }
  | { type: 'SET_SEARCHING'; payload: boolean }
  | { type: 'SET_CONTEXT'; payload: Partial<Pick<NavigationState, 'currentWorkspace' | 'currentProject' | 'currentTeam'>> }
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<NavigationState['preferences']> }
  | { type: 'RESTORE_STATE'; payload: Partial<NavigationState> };

const initialState: NavigationState = {
  isCollapsed: false,
  isMobileOpen: false,
  activeSection: 'dashboard',
  breadcrumbs: [],
  searchQuery: '',
  searchResults: [],
  isSearching: false,
  currentWorkspace: null,
  currentProject: null,
  currentTeam: null,
  preferences: {
    theme: 'system',
    sidebarWidth: 280,
    compactMode: false,
    showBadges: true,
  },
};

function navigationReducer(state: NavigationState, action: NavigationAction): NavigationState {
  switch (action.type) {
    case 'TOGGLE_SIDEBAR':
      return { ...state, isCollapsed: !state.isCollapsed };
    
    case 'SET_MOBILE_OPEN':
      return { ...state, isMobileOpen: action.payload };
    
    case 'SET_ACTIVE_SECTION':
      return { ...state, activeSection: action.payload };
    
    case 'SET_BREADCRUMBS':
      return { ...state, breadcrumbs: action.payload };
    
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    
    case 'SET_SEARCH_RESULTS':
      return { ...state, searchResults: action.payload };
    
    case 'SET_SEARCHING':
      return { ...state, isSearching: action.payload };
    
    case 'SET_CONTEXT':
      return { 
        ...state, 
        currentWorkspace: action.payload.currentWorkspace ?? state.currentWorkspace,
        currentProject: action.payload.currentProject ?? state.currentProject,
        currentTeam: action.payload.currentTeam ?? state.currentTeam,
      };
    
    case 'UPDATE_PREFERENCES':
      return { 
        ...state, 
        preferences: { ...state.preferences, ...action.payload } 
      };
    
    case 'RESTORE_STATE':
      return { ...state, ...action.payload };
    
    default:
      return state;
  }
}

interface NavigationContextValue {
  // State
  state: NavigationState;
  
  // Actions
  toggleSidebar: () => void;
  setMobileOpen: (open: boolean) => void;
  setActiveSection: (section: string) => void;
  setBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void;
  setSearchQuery: (query: string) => void;
  setSearching: (searching: boolean) => void;
  updateContext: (context: Partial<Pick<NavigationState, 'currentWorkspace' | 'currentProject' | 'currentTeam'>>) => void;
  updatePreferences: (preferences: Partial<NavigationState['preferences']>) => void;
  
  // Utilities
  navigate: (href: string) => void;
  goBack: () => void;
  goForward: () => void;
  refresh: () => void;
  
  // Search
  performSearch: (query: string) => Promise<void>;
  clearSearch: () => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

// Custom hook for navigation context
export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

// Persistence keys
const STORAGE_KEY = 'meridian_navigation_state';
const PREFERENCES_KEY = 'meridian_navigation_preferences';

interface NavigationProviderProps {
  children: React.ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const router = useRouter();
  const location = useLocation();
  const { workspace } = useWorkspaceStore();
  const { user } = useAuth();
  
  // Initialize state with persistence
  const [state, dispatch] = useReducer(navigationReducer, initialState, (initial) => {
    if (typeof window === 'undefined') return initial;
    
    try {
      const savedPreferences = localStorage.getItem(PREFERENCES_KEY);
      const savedState = sessionStorage.getItem(STORAGE_KEY);
      
      const restoredState = {
        ...initial,
        ...(savedState ? JSON.parse(savedState) : {}),
        preferences: {
          ...initial.preferences,
          ...(savedPreferences ? JSON.parse(savedPreferences) : {}),
        },
      };
      
      return restoredState;
    } catch (error) {
      console.warn('Failed to restore navigation state:', error);
      return initial;
    }
  });

  // Persist state changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const stateToSave = {
        isCollapsed: state.isCollapsed,
        activeSection: state.activeSection,
        currentWorkspace: state.currentWorkspace,
        currentProject: state.currentProject,
        currentTeam: state.currentTeam,
      };
      
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(state.preferences));
    } catch (error) {
      console.warn('Failed to persist navigation state:', error);
    }
  }, [state.isCollapsed, state.activeSection, state.currentWorkspace, state.currentProject, state.currentTeam, state.preferences]);

  // Update context when workspace changes
  useEffect(() => {
    if (workspace?.id !== state.currentWorkspace) {
      dispatch({ 
        type: 'SET_CONTEXT', 
        payload: { currentWorkspace: workspace?.id || null } 
      });
    }
  }, [workspace?.id, state.currentWorkspace]);

  // Actions
  const toggleSidebar = useCallback(() => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  }, []);

  const setMobileOpen = useCallback((open: boolean) => {
    dispatch({ type: 'SET_MOBILE_OPEN', payload: open });
  }, []);

  const setActiveSection = useCallback((section: string) => {
    dispatch({ type: 'SET_ACTIVE_SECTION', payload: section });
  }, []);

  const setBreadcrumbs = useCallback((breadcrumbs: BreadcrumbItem[]) => {
    dispatch({ type: 'SET_BREADCRUMBS', payload: breadcrumbs });
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
  }, []);

  const setSearching = useCallback((searching: boolean) => {
    dispatch({ type: 'SET_SEARCHING', payload: searching });
  }, []);

  const updateContext = useCallback((context: Partial<Pick<NavigationState, 'currentWorkspace' | 'currentProject' | 'currentTeam'>>) => {
    dispatch({ type: 'SET_CONTEXT', payload: context });
  }, []);

  const updatePreferences = useCallback((preferences: Partial<NavigationState['preferences']>) => {
    dispatch({ type: 'UPDATE_PREFERENCES', payload: preferences });
  }, []);

  // Navigation utilities
  const navigate = useCallback((href: string) => {
    router.navigate({ to: href });
  }, [router]);

  const goBack = useCallback(() => {
    window.history.back();
  }, []);

  const goForward = useCallback(() => {
    window.history.forward();
  }, []);

  const refresh = useCallback(() => {
    window.location.reload();
  }, []);

  // Search functionality
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      dispatch({ type: 'SET_SEARCH_RESULTS', payload: [] });
      return;
    }

    dispatch({ type: 'SET_SEARCHING', payload: true });
    
    try {
      // Implement global search logic here
      // This would integrate with your backend search API
      const searchResults = await new Promise(resolve => {
        setTimeout(() => {
          // Mock search results for now
          const mockResults = [
            { id: '1', type: 'project', title: `Project matching "${query}"`, href: '/dashboard/projects/1' },
            { id: '2', type: 'task', title: `Task matching "${query}"`, href: '/dashboard/tasks/1' },
            { id: '3', type: 'team', title: `Team matching "${query}"`, href: '/dashboard/teams/1' },
          ].filter(item => item.title.toLowerCase().includes(query.toLowerCase()));
          
          resolve(mockResults);
        }, 300);
      });
      
      dispatch({ type: 'SET_SEARCH_RESULTS', payload: searchResults as any[] });
    } catch (error) {
      console.error('Search failed:', error);
      dispatch({ type: 'SET_SEARCH_RESULTS', payload: [] });
    } finally {
      dispatch({ type: 'SET_SEARCHING', payload: false });
    }
  }, []);

  const clearSearch = useCallback(() => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: '' });
    dispatch({ type: 'SET_SEARCH_RESULTS', payload: [] });
  }, []);

  const contextValue: NavigationContextValue = {
    state,
    toggleSidebar,
    setMobileOpen,
    setActiveSection,
    setBreadcrumbs,
    setSearchQuery,
    setSearching,
    updateContext,
    updatePreferences,
    navigate,
    goBack,
    goForward,
    refresh,
    performSearch,
    clearSearch,
  };

  return (
    <NavigationContext.Provider value={contextValue}>
      {children}
    </NavigationContext.Provider>
  );
};

export default NavigationProvider;