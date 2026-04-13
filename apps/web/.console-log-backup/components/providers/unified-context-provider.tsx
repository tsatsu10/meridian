/**
 * Unified Context Provider - Phase 2 Provider Restructuring
 * 
 * This consolidates all context providers into a single, manageable provider
 * that eliminates the 7-level nesting and context dependency conflicts.
 */

import React, { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import ErrorBoundary from '@/components/error-boundary';

// Import RBAC Provider and hooks
import { RBACProvider, useRBACAuth } from '@/lib/permissions/provider';
import type { RBACUser } from '@/lib/permissions/context';

// Import notification provider
import { NotificationProvider } from './notification-provider';

// Import existing types
import type { LoggedInUser } from '@/types/user';
import { fetchApi } from '@/lib/fetch';
import { logger } from "../../lib/logger";

// ===== UNIFIED CONTEXT TYPES =====

interface WorkspaceData {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

// Use RBACUser as the unified user type
interface UnifiedUser extends RBACUser {
  // Additional unified context fields if needed
  currentWorkspaceId?: string;
  currentProjectId?: string;
}

interface UnifiedContextType {
  // ===== AUTH STATE =====
  user: UnifiedUser | null | undefined;
  setUser: (user: UnifiedUser | null | undefined) => void;
  signIn: (userData?: LoggedInUser) => Promise<void>;
  signOut: () => Promise<void>;
  
  // ===== WORKSPACE STATE =====
  workspace: WorkspaceData | null;
  setWorkspace: (workspace: WorkspaceData | null) => void;
  
  // ===== PERMISSIONS =====
  hasPermission: (action: string) => boolean;
  canAccessResource: (resource: string, level: string) => boolean;
  
  // ===== SETTINGS =====
  settings: {
    theme: 'light' | 'dark' | 'system';
    sidebarCollapsed: boolean;
    animations: boolean;
  };
  updateSettings: (updates: Partial<typeof settings>) => void;
  
  // ===== REALTIME =====
  isConnected: boolean;
  onlineUsers: string[];
  
  // ===== LOADING STATES =====
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

// ===== CONTEXT CREATION =====

const UnifiedContext = createContext<UnifiedContextType | null>(null);

// ===== PROVIDER COMPONENT =====

interface UnifiedContextProviderProps {
  children: ReactNode;
  queryClient?: QueryClient;
}

// Internal bridge component that uses RBAC
function UnifiedContextBridge({ children, queryClient }: { children: ReactNode; queryClient?: QueryClient }) {
  // Get RBAC context
  const { user: rbacUser, hasPermission, canAccessResource } = useRBACAuth();

  // Convert RBAC user to unified user
  const unifiedUser: UnifiedUser | null | undefined = rbacUser ? {
    ...rbacUser,
    currentWorkspaceId: rbacUser.currentWorkspaceId,
    currentProjectId: rbacUser.currentProjectId,
  } : rbacUser;

  // Bridge RBAC permissions to unified interface
  const bridgedHasPermission = (action: string): boolean => {
    return hasPermission(action as any);
  };

  const bridgedCanAccessResource = (resource: string, level: string): boolean => {
    return canAccessResource(resource as any, level as any);
  };

  // Pass props to the inner component
  return <UnifiedContextInner
    user={unifiedUser}
    hasPermission={bridgedHasPermission}
    canAccessResource={bridgedCanAccessResource}
    queryClient={queryClient}
  >
    {children}
  </UnifiedContextInner>;
}

// Renamed original component
function UnifiedContextInner({
  children,
  user: providedUser,
  hasPermission: providedHasPermission,
  canAccessResource: providedCanAccessResource,
  queryClient: externalQueryClient,
}: {
  children: ReactNode;
  user: UnifiedUser | null | undefined;
  hasPermission: (action: string) => boolean;
  canAccessResource: (resource: string, level: string) => boolean;
  queryClient?: QueryClient;
}) {
  // ===== STATE MANAGEMENT =====

  // Use provided user from RBAC bridge
  const user = providedUser;
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [settings, setSettings] = useState({
    theme: 'light' as const,
    sidebarCollapsed: false,
    animations: true,
  });
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);


  // Create internal QueryClient if not provided
  const queryClient = useMemo(() => {
    return externalQueryClient || new QueryClient({
      defaultOptions: {
        queries: { staleTime: 60 * 1000 },
      },
    });
  }, [externalQueryClient]);

  // ===== INITIALIZATION =====

  useEffect(() => {
    const initializeContext = async () => {
      try {
        logger.info("🔄 Initializing unified context (RBAC bridge)...");
        setIsLoading(true);
        setError(null);

        // Initialize settings from localStorage
        const savedSettings = localStorage.getItem('meridian-unified-settings');
        if (savedSettings) {
          try {
            const parsed = JSON.parse(savedSettings);
            setSettings(prev => ({ ...prev, ...parsed }));
          } catch (e) {
            console.warn('Failed to parse saved settings:', e);
          }
        }

        // Apply theme
        applyTheme(settings.theme);

        setIsInitialized(true);
        logger.info("✅ Unified context initialization completed");
      } catch (err) {
        console.error('❌ Failed to initialize unified context:', err);
        setError(err instanceof Error ? err.message : 'Initialization failed');
      } finally {
        setIsLoading(false);
      }
    };

    initializeContext();
  }, []);

  // ===== HELPER FUNCTIONS =====

  const loadUserWorkspace = async (userId: string) => {
    try {
      const data = await fetchApi('/workspaces', { params: { userId } });
      if (data.workspaces && data.workspaces.length > 0) {
        setWorkspace(data.workspaces[0]);
      }
    } catch (err) {
      console.warn('Failed to load workspace:', err);
    }
  };

  const applyTheme = (theme: 'light' | 'dark' | 'system') => {
    const root = document.documentElement;
    
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
      root.classList.toggle('light', !prefersDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
      root.classList.toggle('light', theme === 'light');
    }
  };

  // ===== ACTION HANDLERS =====

  const signIn = async (userData?: LoggedInUser) => {
    try {
      logger.info("🔄 Starting sign-in process - invalidating queries to trigger auth refresh");
      setIsLoading(true);
      setError(null);

      // Invalidate and refetch the "me" query to update auth state
      // This will trigger the RBAC provider to refresh its user data
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      await queryClient.refetchQueries({ queryKey: ["me"] });

      // Load workspace if userData is provided
      if (userData?.id) {
        await loadUserWorkspace(userData.id);
      }

      logger.info("✅ Sign-in process completed successfully");
    } catch (err) {
      console.error('❌ Sign in failed:', err);
      setError(err instanceof Error ? err.message : 'Sign in failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      try {
        await fetchApi('/user/sign-out', {
          method: 'POST'
        });
      } catch (err) {
        console.warn('Failed to connect to API for sign-out:', err);
        // Continue with local sign-out even if API call fails
      }
      // RBAC handles user clearing
      setWorkspace(null);
      setIsConnected(false);
      setOnlineUsers([]);
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  // Use RBAC-provided permission functions
  const hasPermission = providedHasPermission;
  const canAccessResource = providedCanAccessResource;

  const updateSettings = (updates: Partial<typeof settings>) => {
    setSettings(prev => {
      const newSettings = { ...prev, ...updates };
      
      // Persist to localStorage
      localStorage.setItem('meridian-unified-settings', JSON.stringify(newSettings));
      
      // Apply theme if changed
      if (updates.theme) {
        applyTheme(updates.theme);
      }
      
      return newSettings;
    });
  };

  // ===== CONTEXT VALUE =====

  const contextValue: UnifiedContextType = useMemo(() => ({
    // Auth
    user,
    setUser: () => {}, // No-op since RBAC handles user management
    signIn,
    signOut,

    // Workspace
    workspace,
    setWorkspace,

    // Permissions
    hasPermission,
    canAccessResource,

    // Settings
    settings,
    updateSettings,

    // Realtime
    isConnected,
    onlineUsers,

    // Loading
    isLoading,
    isInitialized,
    error,
  }), [
    user, workspace, settings, isConnected, onlineUsers,
    isLoading, isInitialized, error, hasPermission, canAccessResource
  ]);

  // ===== RENDER =====

  return (
    <ErrorBoundary fallback={<div>Context initialization failed</div>}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <UnifiedContext.Provider value={contextValue}>
            <NotificationProvider>
              {children}
            </NotificationProvider>
          </UnifiedContext.Provider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

// ===== HOOKS =====

export function useUnifiedContext(): UnifiedContextType {
  const context = useContext(UnifiedContext);
  
  if (!context) {
    // Instead of throwing error, return a safe default during initialization
    // This is expected during app initialization and hot reloads
    if (import.meta.env.DEV) {
      console.debug('🔄 useUnifiedContext: Returning safe defaults during initialization');
    }
    return {
      user: null,
      setUser: () => {},
      signIn: async () => {},
      signOut: async () => {},
      workspace: null,
      setWorkspace: () => {},
      settings: { theme: 'light', sidebarCollapsed: false, animations: true },
      updateSettings: () => {},
      isConnected: false,
      onlineUsers: [],
      isLoading: true,
      isInitialized: false,
      error: 'Context not initialized'
    };
  }
  
  return context;
}

// Convenience hooks for specific functionality
export function useAuth() {
  const { user, setUser, signIn, signOut, isLoading, isInitialized } = useUnifiedContext();

  // Provide safe defaults if context is not ready
  return {
    user: isInitialized ? user : null,
    setUser,
    signIn,
    signOut,
    isLoading: !isInitialized || isLoading,
    isInitialized
  };
}

export function useWorkspace() {
  const { workspace, setWorkspace } = useUnifiedContext();
  return { workspace, setWorkspace };
}

export function usePermissions() {
  const { hasPermission, canAccessResource, user } = useUnifiedContext();
  return { hasPermission, canAccessResource, user };
}

export function useSettings() {
  const { settings, updateSettings } = useUnifiedContext();
  return { settings, updateSettings };
}

export function useRealtime() {
  const { isConnected, onlineUsers } = useUnifiedContext();
  return { isConnected, onlineUsers };
}

// ===== MAIN PROVIDER =====

export function UnifiedContextProvider({ children, queryClient }: UnifiedContextProviderProps) {
  return (
    <ErrorBoundary fallback={<div>Provider initialization failed</div>}>
      <QueryClientProvider client={queryClient || new QueryClient()}>
        <TooltipProvider>
          <RBACProvider>
            <UnifiedContextBridge queryClient={queryClient}>
              {children}
            </UnifiedContextBridge>
          </RBACProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default UnifiedContextProvider;