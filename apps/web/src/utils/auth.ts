/**
 * Authentication Utilities - Secure Cookie-Based Auth
 * 
 * SECURITY: This file implements secure authentication utilities that work
 * with httpOnly cookies instead of localStorage tokens.
 */

import { store } from '../store';
import type { RootState } from '../store';
import { checkAuthStatus, signOut, updateLastActivity } from '../store/slices/authSlice';

// Session timeout warning threshold (15 minutes before timeout)
const SESSION_WARNING_THRESHOLD = 15 * 60 * 1000; // 15 minutes
const SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour
const ACTIVITY_CHECK_INTERVAL = 60 * 1000; // Check every minute

/**
 * Initialize authentication system
 * This should be called when the app starts
 */
export const initializeAuth = async (): Promise<void> => {
  try {
    // Try to restore authentication state from server
    await store.dispatch(checkAuthStatus()).unwrap();
    
    // Start session monitoring
    startSessionMonitoring();
  } catch (error) {
    // Failed to restore auth state - user needs to login
    console.error('Failed to initialize auth:', error);
    // Don't throw - allow app to load in unauthenticated state
  }
};

/**
 * Start monitoring user activity and session timeout
 */
export const startSessionMonitoring = (): void => {
  // Check for user activity
  const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
  
  const updateActivity = () => {
    store.dispatch(updateLastActivity());
    localStorage.setItem('lastActivity', new Date().toISOString());
  };
  
  // Add event listeners for user activity
  activityEvents.forEach(event => {
    document.addEventListener(event, updateActivity, { passive: true });
  });
  
  // Start session timeout checking
  const sessionCheckInterval = setInterval(() => {
    checkSessionTimeout();
  }, ACTIVITY_CHECK_INTERVAL);
  
  // Store interval ID for cleanup
  (window as any).sessionCheckInterval = sessionCheckInterval;
};

/**
 * Stop session monitoring (call on logout or app unmount)
 */
export const stopSessionMonitoring = (): void => {
  const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
  
  const updateActivity = () => {
    store.dispatch(updateLastActivity());
    localStorage.setItem('lastActivity', new Date().toISOString());
  };
  
  // Remove event listeners
  activityEvents.forEach(event => {
    document.removeEventListener(event, updateActivity);
  });
  
  // Clear interval
  if ((window as any).sessionCheckInterval) {
    clearInterval((window as any).sessionCheckInterval);
    delete (window as any).sessionCheckInterval;
  }
};

/**
 * Check if session is approaching timeout and handle accordingly
 */
const checkSessionTimeout = (): void => {
  const state = store.getState() as RootState;
  const { isAuthenticated, lastActivity, sessionWarning } = state.auth;
  
  if (!isAuthenticated || !lastActivity) return;
  
  const lastActivityTime = new Date(lastActivity).getTime();
  const now = new Date().getTime();
  const timeSinceActivity = now - lastActivityTime;
  const timeUntilTimeout = SESSION_TIMEOUT - timeSinceActivity;
  
  // If session has expired, sign out
  if (timeUntilTimeout <= 0) {store.dispatch(signOut(false)); // allDevices = false
    return;
  }
  
  // If approaching timeout and not already warning, show warning
  if (timeUntilTimeout <= SESSION_WARNING_THRESHOLD && !sessionWarning) {store.dispatch({ type: 'auth/setSessionWarning', payload: true });
    
    // Show session timeout warning to user
    showSessionTimeoutWarning(Math.ceil(timeUntilTimeout / 1000));
  }
  
  // If warning was shown but user became active, clear warning
  if (timeUntilTimeout > SESSION_WARNING_THRESHOLD && sessionWarning) {
    store.dispatch({ type: 'auth/setSessionWarning', payload: false });
  }
};

/**
 * Show session timeout warning to user
 */
const showSessionTimeoutWarning = (secondsRemaining: number): void => {
  // This would typically trigger a modal or notification
  // For now, just log it - integrate with your notification system
  console.warn(`Session will expire in ${Math.ceil(secondsRemaining / 60)} minutes`);
  
  // You could dispatch an action to show a modal:
  // store.dispatch(showModal({ type: 'SESSION_WARNING', secondsRemaining }));
};

/**
 * Extend current session
 */
export const extendSession = async (): Promise<boolean> => {
  try {
    await store.dispatch(checkAuthStatus()).unwrap();
    store.dispatch({ type: 'auth/setSessionWarning', payload: false });
    return true;
  } catch (error) {
    console.error('Failed to extend session:', error);
    return false;
  }
};

/**
 * Check if user has specific permission
 */
export const hasPermission = (permission: string): boolean => {
  const state = store.getState() as RootState;
  const permissions = state.auth.user?.permissions || [];
  return permissions.includes(permission) || permissions.includes('*');
};

/**
 * Check if user has specific role
 */
export const hasRole = (role: string): boolean => {
  const state = store.getState() as RootState;
  return state.auth.user?.role === role;
};

/**
 * Get current user information
 */
export const getCurrentUser = () => {
  const state = store.getState() as RootState;
  return state.auth.user;
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  const state = store.getState() as RootState;
  return state.auth.isAuthenticated;
};

/**
 * Logout user and clean up
 */
export const logout = async (): Promise<void> => {
  stopSessionMonitoring();
  await store.dispatch(signOut(false)); // allDevices = false
  
  // Clear non-sensitive local storage
  localStorage.removeItem('lastActivity');
  localStorage.removeItem('trustedDevices');
};

/**
 * Format time remaining in session
 */
export const formatTimeRemaining = (milliseconds: number): string => {
  const minutes = Math.ceil(milliseconds / (60 * 1000));
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
};

// Export constants for use in components
export const AUTH_CONSTANTS = {
  SESSION_TIMEOUT,
  SESSION_WARNING_THRESHOLD,
  ACTIVITY_CHECK_INTERVAL
};