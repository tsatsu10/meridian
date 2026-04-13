/**
 * Minimal toast implementation that replaces Sonner
 * 100% safe from React context issues
 */
import * as React from "react";

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

let toastId = 0;
const toasts: Toast[] = [];
const listeners: Set<(toasts: Toast[]) => void> = new Set();

const notify = (message: string, type: Toast['type'] = 'info', duration = 4000) => {
  const id = `toast-${++toastId}`;
  const toast: Toast = { id, message, type, duration };
  
  toasts.push(toast);
  listeners.forEach(listener => listener([...toasts]));
  
  if (duration > 0) {
    setTimeout(() => {
      const index = toasts.findIndex(t => t.id === id);
      if (index > -1) {
        toasts.splice(index, 1);
        listeners.forEach(listener => listener([...toasts]));
      }
    }, duration);
  }
  
  return id;
};

// Global toast functions
(window as any).toast = {
  success: (message: string) => notify(message, 'success'),
  error: (message: string) => notify(message, 'error'),
  warning: (message: string) => notify(message, 'warning'),
  info: (message: string) => notify(message, 'info'),
};

export const Toaster = () => {
  const [currentToasts, setCurrentToasts] = React.useState<Toast[]>([]);
  
  React.useEffect(() => {
    const listener = (toasts: Toast[]) => setCurrentToasts(toasts);
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);
  
  if (currentToasts.length === 0) return null;
  
  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      maxWidth: '400px'
    }}>
      {currentToasts.map(toast => (
        <div
          key={toast.id}
          style={{
            padding: '12px 16px',
            borderRadius: '6px',
            color: 'white',
            fontSize: '14px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            animation: 'slideIn 0.3s ease',
            backgroundColor: toast.type === 'success' ? '#22c55e' :
                           toast.type === 'error' ? '#ef4444' :
                           toast.type === 'warning' ? '#f59e0b' : '#3b82f6'
          }}
        >
          {toast.message}
        </div>
      ))}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default { Toaster };