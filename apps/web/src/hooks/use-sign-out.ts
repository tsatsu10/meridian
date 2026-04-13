import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { toast } from '@/lib/toast';
import { signOut, quickSignOut, securitySignOut } from '@/services/auth-signout';
import { useAuth } from '@/components/providers/unified-context-provider';
import useWorkspaceStore from '@/store/workspace';

interface UseSignOutOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  skipConfirmation?: boolean;
}

interface SignOutMutationVariables {
  reason?: 'user_initiated' | 'session_expired' | 'security' | 'admin_logout';
  skipConfirmation?: boolean;
  redirectTo?: string;
}

export function useSignOut(options: UseSignOutOptions = {}) {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const { clearWorkspace } = useWorkspaceStore();

  // Main sign out mutation
  const signOutMutation = useMutation({
    mutationFn: async (variables: SignOutMutationVariables = {}) => {
      setIsSigningOut(true);
      
      // Store cleanup functions globally for the auth service to use
      (window as any).queryClient = queryClient;
      (window as any).setAuthUser = setUser;
      (window as any).useWorkspaceStore = useWorkspaceStore;
      
      await signOut({
        skipConfirmation: variables.skipConfirmation || options.skipConfirmation,
        reason: variables.reason || 'user_initiated',
        redirectTo: variables.redirectTo
      });
    },
    onSuccess: () => {
      setIsSigningOut(false);
      options.onSuccess?.();
    },
    onError: (error: Error) => {
      setIsSigningOut(false);
      console.error('Sign out hook error:', error);
      options.onError?.(error);
    }
  });

  // Quick sign out without confirmation
  const quickSignOutMutation = useMutation({
    mutationFn: async () => {
      setIsSigningOut(true);
      (window as any).queryClient = queryClient;
      (window as any).setAuthUser = setUser;
      (window as any).useWorkspaceStore = useWorkspaceStore;
      
      await quickSignOut();
    },
    onSuccess: () => {
      setIsSigningOut(false);
      options.onSuccess?.();
    },
    onError: (error: Error) => {
      setIsSigningOut(false);
      console.error('Quick sign out error:', error);
      options.onError?.(error);
    }
  });

  // Security sign out for sensitive operations
  const securitySignOutMutation = useMutation({
    mutationFn: async () => {
      setIsSigningOut(true);
      (window as any).queryClient = queryClient;
      (window as any).setAuthUser = setUser;
      (window as any).useWorkspaceStore = useWorkspaceStore;
      
      await securitySignOut();
    },
    onSuccess: () => {
      setIsSigningOut(false);
      options.onSuccess?.();
    },
    onError: (error: Error) => {
      setIsSigningOut(false);
      console.error('Security sign out error:', error);
      options.onError?.(error);
    }
  });

  // Utility functions
  const handleSignOut = (variables?: SignOutMutationVariables) => {
    signOutMutation.mutate(variables);
  };

  const handleQuickSignOut = () => {
    quickSignOutMutation.mutate();
  };

  const handleSecuritySignOut = () => {
    securitySignOutMutation.mutate();
  };

  // Check if user has unsaved data
  const hasUnsavedData = () => {
    try {
      // Check for draft messages
      const draftKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('quick-message-draft-')
      );
      
      // Check for active uploads
      const activeUploads = document.querySelectorAll('input[type="file"][data-uploading="true"]');
      
      // Check for dirty forms
      const dirtyForms = document.querySelectorAll('form[data-dirty="true"]');
      
      return draftKeys.length > 0 || activeUploads.length > 0 || dirtyForms.length > 0;
    } catch (error) {
      console.warn('Error checking unsaved data:', error);
      return false;
    }
  };

  // Get unsaved data summary
  const getUnsavedDataSummary = () => {
    try {
      const drafts = Object.keys(localStorage).filter(key => 
        key.startsWith('quick-message-draft-')
      ).length;
      
      const uploads = document.querySelectorAll('input[type="file"][data-uploading="true"]').length;
      
      const forms = document.querySelectorAll('form[data-dirty="true"]').length;
      
      return { drafts, uploads, forms };
    } catch (error) {
      console.warn('Error getting unsaved data summary:', error);
      return { drafts: 0, uploads: 0, forms: 0 };
    }
  };

  return {
    // Mutation objects
    signOut: signOutMutation,
    quickSignOut: quickSignOutMutation,
    securitySignOut: securitySignOutMutation,
    
    // Handler functions
    handleSignOut,
    handleQuickSignOut,
    handleSecuritySignOut,
    
    // State
    isSigningOut: isSigningOut || signOutMutation.isPending || quickSignOutMutation.isPending || securitySignOutMutation.isPending,
    error: signOutMutation.error || quickSignOutMutation.error || securitySignOutMutation.error,
    
    // Utility functions
    hasUnsavedData,
    getUnsavedDataSummary,
  };
}

// Hook for session expiry handling
export function useSessionExpiry() {
  const { handleSecuritySignOut } = useSignOut();
  
  const handleSessionExpired = () => {
    toast.error('Your session has expired. Please sign in again.');
    handleSecuritySignOut();
  };

  const handleUnauthorized = () => {
    toast.error('Access denied. Please sign in again.');
    handleSecuritySignOut();
  };

  return {
    handleSessionExpired,
    handleUnauthorized,
  };
}

// Hook for automatic sign out on inactivity
export function useInactivitySignOut(timeoutMinutes: number = 30) {
  const { handleSignOut } = useSignOut({ skipConfirmation: true });
  
  useState(() => {
    let timeoutId: NodeJS.Timeout;
    
    const resetTimeout = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        toast.warning('You will be signed out due to inactivity in 2 minutes.');
        
        // Give user 2 minutes warning
        setTimeout(() => {
          toast.info('Signing out due to inactivity...');
          handleSignOut({ reason: 'session_expired' });
        }, 2 * 60 * 1000);
      }, timeoutMinutes * 60 * 1000 - 2 * 60 * 1000);
    };

    // Track user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, resetTimeout, true);
    });

    // Initial timeout
    resetTimeout();

    // Cleanup
    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => {
        document.removeEventListener(event, resetTimeout, true);
      });
    };
  });
}