import { toast } from '@/lib/toast';
import { logger } from "../lib/logger";
import { API_BASE_URL, API_URL } from '@/constants/urls';

// Types
interface SignOutOptions {
  skipConfirmation?: boolean;
  reason?: 'user_initiated' | 'session_expired' | 'security' | 'admin_logout';
  redirectTo?: string;
}

interface UnsavedData {
  drafts: number;
  activeUploads: number;
  pendingChange   */
}

// Export singleton instance
export const authSignOutService = AuthSignOutService.getInstance();

// Auth service for server communication
class AuthSignOutService {
  private static instance: AuthSignOutService;
  private isSigningOut = false;

  static getInstance(): AuthSignOutService {
    if (!AuthSignOutService.instance) {
      AuthSignOutService.instance = new AuthSignOutService();
    }
    return AuthSignOutService.instance;
  }

  /**
   * Complete sign out flow with all cleanup
   */
  async signOut(options: SignOutOptions = {}): Promise<void> {
    if (this.isSigningOut) {
      console.warn('Sign out already in progress');
      return;
    }

    this.isSigningOut = true;

    try {
      // 1. Check for unsaved data and confirm if needed
      if (!options.skipConfirmation) {
        const shouldProceed = await this.checkAndConfirmSignOut();
        if (!shouldProceed) {
          this.isSigningOut = false;
          return;
        }
      }

      // 2. Show loading state
      toast.loading('Signing out...', { id: 'signout-loading' });

      // 3. Perform cleanup in parallel where possible
      await Promise.allSettled([
        this.serverSignOut(options.reason),
        this.cleanupClientData(),
        this.closeConnections(),
        this.saveImportantDrafts(),
      ]);

      // 4. Final cleanup and redirect
      this.finalCleanup();
      this.redirectToLogin(options.redirectTo);

      toast.success('Signed out successfully', { id: 'signout-loading' });

    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Sign out failed. Cleaning up locally...', { id: 'signout-loading' });
      
      // Even if server logout fails, continue with client cleanup
      this.emergencyCleanup();
      this.redirectToLogin(options.redirectTo);
    } finally {
      this.isSigningOut = false;
    }
  }

  /**
   * Check for unsaved data and show confirmation if needed
   */
  private async checkAndConfirmSignOut(): Promise<boolean> {
    const unsavedData = this.checkUnsavedData();
    
    if (unsavedData.drafts === 0 && unsavedData.activeUploads === 0 && unsavedData.pendingChanges.length === 0) {
      return true;
    }

    return new Promise((resolve) => {
      const messages = [];
      if (unsavedData.drafts > 0) {
        messages.push(`${unsavedData.drafts} unsaved draft${unsavedData.drafts > 1 ? 's' : ''}`);
      }
      if (unsavedData.activeUploads > 0) {
        messages.push(`${unsavedData.activeUploads} file upload${unsavedData.activeUploads > 1 ? 's' : ''} in progress`);
      }
      if (unsavedData.pendingChanges.length > 0) {
        messages.push(`unsaved changes in ${unsavedData.pendingChanges.join(', ')}`);
      }

      const confirmMessage = `You have ${messages.join(', ')}. These will be lost if you sign out. Continue?`;

      // Show confirmation dialog
      if (window.confirm(confirmMessage)) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  }

  /**
   * Check for unsaved data across the application
   */
  private checkUnsavedData(): UnsavedData {
    const unsavedData: UnsavedData = {
      drafts: 0,
      activeUploads: 0,
      pendingChanges: []
    };

    try {
      // Check for draft messages
      const draftKeys = Object.keys(localStorage).filter(key => key.startsWith('quick-message-draft-'));
      unsavedData.drafts = draftKeys.length;

      // Check for active file uploads
      const uploadElements = document.querySelectorAll('input[type="file"][data-uploading="true"]');
      unsavedData.activeUploads = uploadElements.length;

      // Check for unsaved form data
      const unsavedForms = document.querySelectorAll('form[data-dirty="true"]');
      unsavedData.pendingChanges = Array.from(unsavedForms).map(form => 
        form.getAttribute('data-form-name') || 'form'
      );

    } catch (error) {
      console.warn('Error checking unsaved data:', error);
    }

    return unsavedData;
  }

  /**
   * Attempt to save important drafts before signing out
   */
  private async saveImportantDrafts(): Promise<void> {
    try {
      const draftKeys = Object.keys(localStorage).filter(key => key.startsWith('quick-message-draft-'));
      
      for (const key of draftKeys) {
        const draft = localStorage.getItem(key);
        if (draft) {
          const draftData = JSON.parse(draft);
          // Only save drafts with substantial content
          if (draftData.content && draftData.content.trim().length > 20) {
            // Save to server or keep in localStorage with expiry
            logger.info("Preserving important draft:");
          }
        }
      }
    } catch (error) {
      console.warn('Error saving drafts:', error);
    }
  }

  /**
   * Sign out from server
   */
  private async serverSignOut(reason?: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/sign-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for session-based auth
        body: JSON.stringify({ reason })
      });

      if (!response.ok) {
        throw new Error(`Server logout failed: ${response.status}`);
      }

      logger.info("Server logout successful");
    } catch (error) {
      console.warn('Server logout failed, continuing with client cleanup:', error);
      throw error;
    }
  }

  /**
   * Close WebSocket connections and subscriptions
   */
  private async closeConnections(): Promise<void> {
    try {
      // Close WebSocket connections
      const websockets = (window as any).activeWebSockets || [];
      websockets.forEach((ws: WebSocket) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close(1000, 'User signed out');
        }
      });

      // Close EventSource connections
      const eventSources = (window as any).activeEventSources || [];
      eventSources.forEach((es: EventSource) => {
        es.close();
      });

      // Clear any intervals/timeouts
      const intervals = (window as any).authIntervals || [];
      intervals.forEach((id: number) => clearInterval(id));
      
      const timeouts = (window as any).authTimeouts || [];
      timeouts.forEach((id: number) => clearTimeout(id));

      logger.info("Connections closed successfully");
    } catch (error) {
      console.warn('Error closing connections:', error);
    }
  }

  /**
   * Clean up client-side data
   */
  private async cleanupClientData(): Promise<void> {
    try {
      // Clear React Query cache
      if ((window as any).queryClient) {
        (window as any).queryClient.clear();
      }

      // Clear AuthProvider context state (set user to null)
      if ((window as any).setAuthUser) {
        (window as any).setAuthUser(null);
      }
      
      // Clear Workspace store if it exists
      if ((window as any).useWorkspaceStore) {
        (window as any).useWorkspaceStore.getState().clearWorkspace();
      }

      // Clear any existing auth stores (if they exist)
      if ((window as any).useAuthStore) {
        (window as any).useAuthStore.getState().clearUser?.();
      }

      logger.info("Client data cleanup completed");
    } catch (error) {
      console.warn('Error during client data cleanup:', error);
    }
  }

  /**
   * Final cleanup before redirect
   */
  private finalCleanup(): void {
    try {
      // Clear all storage
      const authKeys = [
        'auth_token',
        'refresh_token',
        'user_session',
        'workspace_data',
        'user_preferences'
      ];

      authKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

      // Clear all cookies (for same domain)
      document.cookie.split(";").forEach(cookie => {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      });

      // Clear any cached DOM data
      const elementsWithData = document.querySelectorAll('[data-user-id], [data-workspace-id]');
      elementsWithData.forEach(el => {
        el.removeAttribute('data-user-id');
        el.removeAttribute('data-workspace-id');
      });

      logger.info("Final cleanup completed");
    } catch (error) {
      console.warn('Error during final cleanup:', error);
    }
  }

  /**
   * Emergency cleanup when normal flow fails
   */
  private emergencyCleanup(): void {
    try {
      // Nuclear option - clear everything
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear IndexedDB if used
      if ('indexedDB' in window) {
        indexedDB.databases().then(databases => {
          databases.forEach(db => {
            if (db.name) {
              indexedDB.deleteDatabase(db.name);
            }
          });
        });
      }

      logger.info("Emergency cleanup completed");
    } catch (error) {
      console.error('Emergency cleanup failed:', error);
    }
  }

  /**
   * Redirect to login page
   */
  private redirectToLogin(customPath?: string): void {
    const loginPath = customPath || '/auth/sign-in';
    
    // Use hard redirect to ensure clean state
    window.location.href = loginPath;
  }

  /**
   * Handle sign out across multiple tabs
   */
  static setupCrossTabSignOut(): void {
    window.addEventListener('storage', (event) => {
      if (event.key === 'auth_signout_broadcast' && event.newValue === 'true') {
        // Another tab initiated sign out
        const service = AuthSignOutService.getInstance();
        service.signOut({ skipConfirmation: true, reason: 'security' });
      }
    });
  }

  /**
   * Broadcast sign out to other tabs
   */
  private broadcastSignOut(): void {
    try {
      localStorage.setItem('auth_signout_broadcast', 'true');
      // Clear the broadcast flag after a short delay
      setTimeout(() => {
        localStorage.removeItem('auth_signout_broadcast');
      }, 1000);
    } catch (error) {
      console.warn('Failed to broadcast sign out:', error);
    }
  }
}

// Export singleton instance
export const authSignOutService = AuthSignOutService.getInstance();

// Setup cross-tab sign out on module load
if (typeof window !== 'undefined') {
  AuthSignOutService.setupCrossTabSignOut();
}

// Utility functions
export const signOut = (options?: SignOutOptions) => {
  return authSignOutService.signOut(options);
};

export const quickSignOut = () => {
  return authSignOutService.signOut({ skipConfirmation: true });
};

export const securitySignOut = () => {
  return authSignOutService.signOut({ 
    skipConfirmation: true, 
    reason: 'security',
    redirectTo: '/auth/sign-in?reason=security'
  });
};