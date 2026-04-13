/**
 * Safe Toast Utility - Replaces all Sonner imports
 * This ensures no React context errors occur
 */

import { logger } from './logger';

interface ToastOptions {
  duration?: number;
  id?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  cancel?: {
    label: string;
    onClick: () => void;
  };
  onAutoClose?: () => void;
  onDismiss?: () => void;
}

// Global toast functions that work outside React context
const createToastFunction = (type: 'success' | 'error' | 'warning' | 'info') => {
  return (message: string, _options?: ToastOptions) => {
    // Use the global toast function from minimal-toast
    if (typeof window !== 'undefined' && (window as any).toast) {
      return (window as any).toast[type](message);
    } else {
      // Fallback to console for server-side rendering
      logger.info(`Toast ${type}: ${message}`);
      return `toast-${Date.now()}`;
    }
  };
};

// Main toast function
const toast = (message: string, options?: ToastOptions) => {
  return createToastFunction('info')(message, options);
};

// Attach methods to main toast function
toast.success = createToastFunction('success');
toast.error = createToastFunction('error');
toast.warning = createToastFunction('warning');
toast.info = createToastFunction('info');

// Additional Sonner-compatible methods
toast.loading = (message: string, options?: ToastOptions) => {
  return toast.info(`⏳ ${message}`, options);
};

toast.promise = <T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: any) => string);
  }
) => {
  toast.loading(messages.loading);
  
  promise
    .then((data) => {
      const successMessage = typeof messages.success === 'function' 
        ? messages.success(data) 
        : messages.success;
      toast.success(successMessage);
    })
    .catch((error) => {
      const errorMessage = typeof messages.error === 'function' 
        ? messages.error(error) 
        : messages.error;
      toast.error(errorMessage);
    });

  return promise;
};

toast.dismiss = (_id?: string) => {
  // Implementation not needed for our simple toast system
  // The toasts auto-dismiss after their duration
};

toast.custom = (_jsx: any, options?: ToastOptions) => {
  // Fallback to regular toast for custom JSX
  return toast('Custom notification', options);
};

// Export the toast function
export { toast };

// Default export for compatibility
export default toast;