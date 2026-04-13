/**
 * Toast Notification Component
 * Real-time in-app notification toasts
 * Phase 2.2 - Smart Notifications System
 */

import React, { useState, useEffect } from 'react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number; // ms, 0 = no auto-dismiss
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastNotificationProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  className?: string;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({
  toasts,
  onDismiss,
  position = 'top-right',
  className = '',
}) => {
  useEffect(() => {
    // Auto-dismiss toasts with duration
    toasts.forEach((toast) => {
      if (toast.duration && toast.duration > 0) {
        const timer = setTimeout(() => {
          onDismiss(toast.id);
        }, toast.duration);

        return () => clearTimeout(timer);
      }
    });
  }, [toasts, onDismiss]);

  const getPositionClasses = () => {
    const positions = {
      'top-right': 'top-4 right-4',
      'top-left': 'top-4 left-4',
      'bottom-right': 'bottom-4 right-4',
      'bottom-left': 'bottom-4 left-4',
    };
    return positions[position];
  };

  const getTypeStyles = (type: Toast['type']) => {
    const styles = {
      success: {
        icon: '✅',
        bg: 'bg-green-50',
        border: 'border-green-500',
        text: 'text-green-900',
        iconBg: 'bg-green-100',
      },
      error: {
        icon: '❌',
        bg: 'bg-red-50',
        border: 'border-red-500',
        text: 'text-red-900',
        iconBg: 'bg-red-100',
      },
      warning: {
        icon: '⚠️',
        bg: 'bg-yellow-50',
        border: 'border-yellow-500',
        text: 'text-yellow-900',
        iconBg: 'bg-yellow-100',
      },
      info: {
        icon: 'ℹ️',
        bg: 'bg-blue-50',
        border: 'border-blue-500',
        text: 'text-blue-900',
        iconBg: 'bg-blue-100',
      },
    };
    return styles[type];
  };

  if (toasts.length === 0) return null;

  return (
    <div
      className={`fixed ${getPositionClasses()} z-50 space-y-3 max-w-sm w-full ${className}`}
    >
      {toasts.map((toast) => {
        const styles = getTypeStyles(toast.type);

        return (
          <div
            key={toast.id}
            className={`${styles.bg} ${styles.border} border-l-4 rounded-lg shadow-lg p-4 animate-slide-in-right`}
            role="alert"
          >
            <div className="flex items-start space-x-3">
              {/* Icon */}
              <div className={`${styles.iconBg} rounded-full p-2 flex-shrink-0`}>
                <span className="text-lg">{styles.icon}</span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={`font-semibold ${styles.text} text-sm`}>{toast.title}</p>
                {toast.message && (
                  <p className={`mt-1 ${styles.text} text-sm opacity-90`}>{toast.message}</p>
                )}

                {/* Action Button */}
                {toast.actionLabel && toast.onAction && (
                  <button
                    onClick={toast.onAction}
                    className={`mt-2 text-sm font-medium ${styles.text} underline hover:no-underline`}
                  >
                    {toast.actionLabel}
                  </button>
                )}
              </div>

              {/* Dismiss Button */}
              <button
                onClick={() => onDismiss(toast.id)}
                className={`${styles.text} opacity-60 hover:opacity-100 transition-opacity flex-shrink-0`}
                aria-label="Dismiss"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Toast Context Provider & Hook
 * Use this to show toasts from anywhere in your app
 */

interface ToastContextValue {
  showToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: Toast = {
      id,
      duration: 5000, // Default 5 seconds
      ...toast,
    };

    setToasts((prev) => [...prev, newToast]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <ToastNotification toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

/**
 * Usage Example:
 * 
 * // 1. Wrap your app with ToastProvider
 * <ToastProvider>
 *   <App />
 * </ToastProvider>
 * 
 * // 2. Use in any component
 * const { showToast } = useToast();
 * 
 * showToast({
 *   type: 'success',
 *   title: 'Task completed!',
 *   message: 'Your task has been marked as done.',
 *   duration: 5000,
 * });
 * 
 * // With action button
 * showToast({
 *   type: 'info',
 *   title: 'New message',
 *   message: 'You have a new comment on your task.',
 *   actionLabel: 'View',
 *   onAction: () => navigate('/task/123'),
 *   duration: 0, // Won't auto-dismiss
 * });
 */

export default ToastNotification;

