/**
 * Consolidated Auth Store - Phase 3 Implementation
 * 
 * Single source of truth for authentication, user state, and RBAC
 * Replaces: authSlice.ts, user-preferences.ts, RBAC provider state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LoggedInUser } from '@/types/user';
import type { UserRole, AllPermissions } from '@/lib/permissions/types';
import { getRolePermissions } from '@/lib/permissions/definitions';
import { API_BASE_URL, API_URL } from '@/constants/urls';
import { logger } from "../../lib/logger";

// ===== TYPES =====

export interface UnifiedUser extends LoggedInUser {
  role: UserRole;
  permissions: AllPermissions;
  isActive: boolean;
  lastActiveAt: Date;
  currentWorkspaceId?: string;
  currentProjectId?: string;
}

interface AuthStore {
  // ===== STATE =====
  user: UnifiedUser | null | undefined;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // ===== SESSION DATA =====
  sessionToken: string | null;
  refreshToken: string | null;
  sessionExpiry: Date | null;
  
  // ===== CONTEXT =====
  currentWorkspaceId: string | undefined;
  currentProjectId: string | undefined;
  
  // ===== ACTIONS =====
  // Authentication
  signIn: (credentials?: { email: string; password: string } | LoggedInUser) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  initializeFromSession: () => Promise<void>;
  
  // User management
  setUser: (user: UnifiedUser | null | undefined) => void;
  updateUser: (updates: Partial<UnifiedUser>) => void;
  updateProfile: (profile: Partial<LoggedInUser>) => Promise<void>;
  
  // Role and permissions
  assignRole: (role: UserRole) => void;
  updatePermissions: (permissions: AllPermissions) => void;
  hasPermission: (action: string) => boolean;
  canAccessResource: (resource: string, level: string) => boolean;
  
  // Context management
  setWorkspaceContext: (workspaceId: string) => void;
  setProjectContext: (projectId: string) => void;
  clearContext: () => void;
  
  // Utilities
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

// ===== HELPER FUNCTIONS =====

const determineUserRole = (user: LoggedInUser): UserRole => {
  const email = user.email?.toLowerCase() || '';
  
  // Development/demo role assignment
  if (email.includes('admin') || email.includes('manager') || 
      email === 'elidegbotse@gmail.com' || email === 'demo@example.com') {
    return 'workspace-manager';
  }
  
  if (email.includes('head') || email.includes('director')) {
    return 'department-head';
  }
  
  if (email.includes('pm') || email.includes('project')) {
    return 'project-manager';
  }
  
  if (email.includes('lead') || email.includes('senior')) {
    return 'team-lead';
  }
  
  return 'member';
};

const createUnifiedUser = (userData: LoggedInUser): UnifiedUser => {
  const role = determineUserRole(userData);
  const permissions = getRolePermissions(role);
  
  return {
    ...userData,
    role,
    permissions,
    isActive: true,
    lastActiveAt: new Date()
  };
};

const isTokenExpired = (expiry: Date | null): boolean => {
  if (!expiry) return true;
  return new Date() >= expiry;
};

// ===== STORE IMPLEMENTATION =====

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // ===== INITIAL STATE =====
      user: undefined,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      sessionToken: null,
      refreshToken: null,
      sessionExpiry: null,
      currentWorkspaceId: undefined,
      currentProjectId: undefined,

      // ===== AUTHENTICATION ACTIONS =====
      
      signIn: async (credentials) => {
        try {
          set({ isLoading: true, error: null });

          if (credentials && 'email' in credentials) {
            // Sign in with credentials
            const response = await fetch(`${API_BASE_URL}/users/sign-in`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(credentials)
            });

            if (!response.ok) {
              throw new Error('Sign in failed');
            }

            const data = await response.json();
            if (data.user) {
              const unifiedUser = createUnifiedUser(data.user);
              set({
                user: unifiedUser,
                isAuthenticated: true,
                sessionToken: data.sessionToken,
                refreshToken: data.refreshToken,
                sessionExpiry: data.sessionExpiry ? new Date(data.sessionExpiry) : null,
                error: null
              });
            }
          } else if (credentials) {
            // Direct user data (from existing session)
            const unifiedUser = createUnifiedUser(credentials);
            set({
              user: unifiedUser,
              isAuthenticated: true,
              error: null
            });
          } else {
            // Refresh from server
            await get().initializeFromSession();
          }
        } catch (error) {
          console.error('Sign in failed:', error);
          set({
            user: null,
            isAuthenticated: false,
            error: error instanceof Error ? error.message : 'Sign in failed'
          });
        } finally {
          set({ isLoading: false });
        }
      },

      signOut: async () => {
        try {
          // Call logout endpoint
          await fetch(`${API_BASE_URL}/users/sign-out`, {
            method: 'POST'});
        } catch (error) {
          console.warn('Logout API call failed:', error);
        } finally {
          // Clear all auth state
          set({
            user: null,
            isAuthenticated: false,
            sessionToken: null,
            refreshToken: null,
            sessionExpiry: null,
            currentWorkspaceId: undefined,
            currentProjectId: undefined,
            error: null
          });
        }
      },

      refreshSession: async () => {
        const { refreshToken } = get();
        
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        try {
          const response = await fetch(`${API_BASE_URL}/users/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
          });

          if (!response.ok) {
            throw new Error('Token refresh failed');
          }

          const data = await response.json();
          set({
            sessionToken: data.sessionToken,
            sessionExpiry: data.sessionExpiry ? new Date(data.sessionExpiry) : null
          });
        } catch (error) {
          console.error('Session refresh failed:', error);
          // Clear auth state on refresh failure
          get().signOut();
          throw error;
        }
      },

      initializeFromSession: async () => {
        try {
          set({ isLoading: true, error: null });

          const response = await fetch(`${API_BASE_URL}/me`, {});

          if (response.ok) {
            const data = await response.json();
            if (data?.user) {
              const unifiedUser = createUnifiedUser(data.user);
              set({
                user: unifiedUser,
                isAuthenticated: true,
                error: null
              });
            } else {
              set({
                user: null,
                isAuthenticated: false
              });
            }
          } else {
            set({
              user: null,
              isAuthenticated: false
            });
          }
        } catch (error) {
          console.error('Session initialization failed:', error);
          set({
            user: null,
            isAuthenticated: false,
            error: error instanceof Error ? error.message : 'Session initialization failed'
          });
        } finally {
          set({ isLoading: false });
        }
      },

      // ===== USER MANAGEMENT =====

      setUser: (user) => {
        set({
          user,
          isAuthenticated: !!user
        });
      },

      updateUser: (updates) => {
        const { user } = get();
        if (user) {
          const updatedUser = { ...user, ...updates, lastActiveAt: new Date() };
          set({ user: updatedUser });
        }
      },

      updateProfile: async (profile) => {
        const { user } = get();
        if (!user) throw new Error('No user to update');

        try {
          const response = await fetch(`${API_BASE_URL}/users/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profile)
          });

          if (!response.ok) {
            throw new Error('Profile update failed');
          }

          const updatedData = await response.json();
          get().updateUser(updatedData);
        } catch (error) {
          console.error('Profile update failed:', error);
          throw error;
        }
      },

      // ===== ROLE AND PERMISSIONS =====

      assignRole: (role) => {
        const { user } = get();
        if (user) {
          const permissions = getRolePermissions(role);
          get().updateUser({ role, permissions });
        }
      },

      updatePermissions: (permissions) => {
        get().updateUser({ permissions });
      },

      hasPermission: (action) => {
        const { user } = get();
        if (!user || !user.permissions) return false;
        return (user.permissions as any)[action] === true;
      },

      canAccessResource: (resource, level) => {
        const { user } = get();
        if (!user) return false;
        
        const roleLevel = {
          'guest': 0,
          'member': 1,
          'team-lead': 2,
          'project-manager': 3,
          'department-head': 4,
          'workspace-manager': 5
        }[user.role] || 0;

        const requiredLevel = {
          'read': 1,
          'write': 2,
          'admin': 4
        }[level] || 0;

        return roleLevel >= requiredLevel;
      },

      // ===== CONTEXT MANAGEMENT =====

      setWorkspaceContext: (workspaceId) => {
        set({ currentWorkspaceId: workspaceId });
        get().updateUser({ currentWorkspaceId: workspaceId });
      },

      setProjectContext: (projectId) => {
        set({ currentProjectId: projectId });
        get().updateUser({ currentProjectId: projectId });
      },

      clearContext: () => {
        set({
          currentWorkspaceId: undefined,
          currentProjectId: undefined
        });
        get().updateUser({
          currentWorkspaceId: undefined,
          currentProjectId: undefined
        });
      },

      // ===== UTILITIES =====

      clearError: () => {
        set({ error: null });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      }
    }),
    {
      name: 'meridian-auth',
      partialize: (state) => ({
        user: state.user,
        sessionToken: state.sessionToken,
        refreshToken: state.refreshToken,
        sessionExpiry: state.sessionExpiry,
        currentWorkspaceId: state.currentWorkspaceId,
        currentProjectId: state.currentProjectId
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Check if session is expired
          if (state.sessionExpiry && isTokenExpired(state.sessionExpiry)) {
            logger.info("Session expired, clearing auth state");
            state.signOut();
          } else {
            // Restore authentication state
            state.isAuthenticated = !!state.user;
          }
        }
      }
    }
  )
);

// ===== CONVENIENCE HOOKS =====

export const useAuth = () => {
  const store = useAuthStore();
  return {
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    error: store.error,
    signIn: store.signIn,
    signOut: store.signOut,
    setUser: store.setUser,
    updateProfile: store.updateProfile
  };
};

export const usePermissions = () => {
  const store = useAuthStore();
  return {
    user: store.user,
    hasPermission: store.hasPermission,
    canAccessResource: store.canAccessResource,
    assignRole: store.assignRole
  };
};

export const useAuthContext = () => {
  const store = useAuthStore();
  return {
    currentWorkspaceId: store.currentWorkspaceId,
    currentProjectId: store.currentProjectId,
    setWorkspaceContext: store.setWorkspaceContext,
    setProjectContext: store.setProjectContext,
    clearContext: store.clearContext
  };
};

export default useAuthStore;