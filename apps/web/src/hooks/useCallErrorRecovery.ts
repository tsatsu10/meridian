import { useState, useCallback, useRef } from 'react';
import { logger } from "../lib/logger";

interface CallError {
  id: string;
  type: 'connection' | 'media' | 'permission' | 'network' | 'server' | 'unknown';
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  recoverable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface RecoveryAction {
  id: string;
  type: 'retry' | 'reconnect' | 'refresh' | 'fallback' | 'manual';
  description: string;
  automatic: boolean;
  estimatedTime: number; // seconds
  success?: boolean;
  attempts: number;
  maxAttempts: number;
}

interface RecoveryStrategy {
  errorType: string;
  actions: Omit<RecoveryAction, 'id' | 'attempts' | 'success'>[];
  fallbackMessage: string;
}

export function useCallErrorRecovery() {
  const [errors, setErrors] = useState<CallError[]>([]);
  const [activeRecovery, setActiveRecovery] = useState<RecoveryAction | null>(null);
  const [recoveryHistory, setRecoveryHistory] = useState<RecoveryAction[]>([]);
  const [isRecovering, setIsRecovering] = useState(false);
  
  const recoveryStrategies = useRef<Record<string, RecoveryStrategy>>({
    'connection-failed': {
      errorType: 'connection',
      actions: [
        {
          type: 'retry',
          description: 'Retry connection',
          automatic: true,
          estimatedTime: 3,
          maxAttempts: 3
        },
        {
          type: 'reconnect',
          description: 'Reconnect with new session',
          automatic: true,
          estimatedTime: 5,
          maxAttempts: 2
        },
        {
          type: 'refresh',
          description: 'Refresh page and rejoin',
          automatic: false,
          estimatedTime: 10,
          maxAttempts: 1
        }
      ],
      fallbackMessage: 'Unable to establish connection. Please check your network and try again.'
    },
    'media-permission-denied': {
      errorType: 'permission',
      actions: [
        {
          type: 'manual',
          description: 'Grant camera/microphone permissions',
          automatic: false,
          estimatedTime: 30,
          maxAttempts: 1
        },
        {
          type: 'fallback',
          description: 'Join with audio only',
          automatic: false,
          estimatedTime: 5,
          maxAttempts: 1
        }
      ],
      fallbackMessage: 'Camera/microphone access is required. Please grant permissions and try again.'
    },
    'media-device-error': {
      errorType: 'media',
      actions: [
        {
          type: 'retry',
          description: 'Retry media access',
          automatic: true,
          estimatedTime: 2,
          maxAttempts: 2
        },
        {
          type: 'fallback',
          description: 'Switch to default device',
          automatic: true,
          estimatedTime: 3,
          maxAttempts: 1
        },
        {
          type: 'manual',
          description: 'Check device connections',
          automatic: false,
          estimatedTime: 60,
          maxAttempts: 1
        }
      ],
      fallbackMessage: 'Media device error. Please check your camera and microphone connections.'
    },
    'network-unstable': {
      errorType: 'network',
      actions: [
        {
          type: 'retry',
          description: 'Retry with lower quality',
          automatic: true,
          estimatedTime: 3,
          maxAttempts: 3
        },
        {
          type: 'fallback',
          description: 'Switch to audio only',
          automatic: true,
          estimatedTime: 2,
          maxAttempts: 1
        },
        {
          type: 'manual',
          description: 'Check network connection',
          automatic: false,
          estimatedTime: 30,
          maxAttempts: 1
        }
      ],
      fallbackMessage: 'Network connection is unstable. Consider switching to a more stable connection.'
    },
    'server-error': {
      errorType: 'server',
      actions: [
        {
          type: 'retry',
          description: 'Retry connection to server',
          automatic: true,
          estimatedTime: 5,
          maxAttempts: 3
        },
        {
          type: 'reconnect',
          description: 'Connect to backup server',
          automatic: true,
          estimatedTime: 8,
          maxAttempts: 2
        },
        {
          type: 'manual',
          description: 'Wait for server recovery',
          automatic: false,
          estimatedTime: 300,
          maxAttempts: 1
        }
      ],
      fallbackMessage: 'Server connection failed. Our team has been notified and is working on a fix.'
    }
  });

  // Report a new error
  const reportError = useCallback((error: Omit<CallError, 'id' | 'timestamp'>) => {
    const callError: CallError = {
      ...error,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date()
    };
    
    setErrors(prev => [...prev, callError]);
    
    // Automatically start recovery for recoverable errors
    if (callError.recoverable && callError.severity !== 'low') {
      startRecovery(callError);
    }
    
    return callError;
  }, []);

  // Start recovery process
  const startRecovery = useCallback(async (error: CallError) => {
    if (isRecovering) return;
    
    const strategy = findRecoveryStrategy(error);
    if (!strategy) {
      console.warn('No recovery strategy found for error:', error.type);
      return;
    }
    
    setIsRecovering(true);
    
    // Try each recovery action in sequence
    for (const actionTemplate of strategy.actions) {
      const action: RecoveryAction = {
        ...actionTemplate,
        id: Math.random().toString(36).substr(2, 9),
        attempts: 0
      };
      
      setActiveRecovery(action);
      
      const success = await executeRecoveryAction(action, error);
      
      const completedAction = { ...action, success };
      setRecoveryHistory(prev => [...prev, completedAction]);
      
      if (success) {
        setActiveRecovery(null);
        setIsRecovering(false);
        return;
      }
      
      // If automatic action failed and we're out of attempts, try next action
      if (!action.automatic || action.attempts >= action.maxAttempts) {
        continue;
      }
    }
    
    // All recovery actions failed
    setActiveRecovery(null);
    setIsRecovering(false);
    
    // Report final failure
    reportError({
      type: 'unknown',
      code: 'RECOVERY_FAILED',
      message: `Recovery failed for ${error.type}: ${strategy.fallbackMessage}`,
      recoverable: false,
      severity: 'critical'
    });
  }, [isRecovering]);

  // Execute a specific recovery action
  const executeRecoveryAction = async (action: RecoveryAction, originalError: CallError): Promise<boolean> => {
    let attempts = 0;
    
    while (attempts < action.maxAttempts) {
      attempts++;
      action.attempts = attempts;
      
      try {
        logger.info("Executing recovery action: ${action.type} (attempt ${attempts}/${action.maxAttempts})");
        
        const success = await performRecoveryAction(action, originalError);
        
        if (success) {
          logger.info("Recovery action succeeded: ${action.type}");
          return true;
        }
        
        // Wait before retry (exponential backoff)
        if (attempts < action.maxAttempts) {
          const delay = Math.min(1000 * Math.pow(2, attempts), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
      } catch (error) {
        console.error(`Recovery action failed: ${action.type}`, error);
      }
    }
    
    logger.info("Recovery action exhausted attempts: ${action.type}");
    return false;
  };

  // Perform the actual recovery action
  const performRecoveryAction = async (action: RecoveryAction, originalError: CallError): Promise<boolean> => {
    switch (action.type) {
      case 'retry':
        return await retryOriginalAction(originalError);
        
      case 'reconnect':
        return await attemptReconnection(originalError);
        
      case 'refresh':
        // This would typically reload the page or component
        window.location.reload();
        return true;
        
      case 'fallback':
        return await activateFallbackMode(originalError);
        
      case 'manual':
        // Manual actions require user intervention
        return await waitForManualIntervention(action);
        
      default:
        console.warn(`Unknown recovery action type: ${action.type}`);
        return false;
    }
  };

  // Retry the original failed action
  const retryOriginalAction = async (error: CallError): Promise<boolean> => {
    // This would depend on the specific error type and context
    // For now, simulate a retry attempt
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate success/failure based on error type
    switch (error.type) {
      case 'connection':
        return Math.random() > 0.3; // 70% success rate
      case 'network':
        return Math.random() > 0.5; // 50% success rate
      default:
        return Math.random() > 0.7; // 30% success rate
    }
  };

  // Attempt to reconnect with new session
  const attemptReconnection = async (error: CallError): Promise<boolean> => {
    // This would integrate with the actual call connection logic
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate reconnection attempt
    return Math.random() > 0.4; // 60% success rate
  };

  // Activate fallback mode (e.g., audio-only)
  const activateFallbackMode = async (error: CallError): Promise<boolean> => {
    // This would integrate with call settings to enable fallback mode
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (error.type === 'media' || error.type === 'network') {
      // Audio-only fallback usually succeeds
      return Math.random() > 0.1; // 90% success rate
    }
    
    return Math.random() > 0.5; // 50% success rate for other types
  };

  // Wait for manual user intervention
  const waitForManualIntervention = async (action: RecoveryAction): Promise<boolean> => {
    // This would show UI prompts to the user and wait for their action
    // For now, simulate user taking action after estimated time
    await new Promise(resolve => setTimeout(resolve, action.estimatedTime * 1000));
    
    // Assume user follows instructions correctly most of the time
    return Math.random() > 0.2; // 80% success rate
  };

  // Find appropriate recovery strategy for error
  const findRecoveryStrategy = (error: CallError): RecoveryStrategy | null => {
    // Map error codes to strategy keys
    const strategyMap: Record<string, string> = {
      'CONNECTION_FAILED': 'connection-failed',
      'MEDIA_PERMISSION_DENIED': 'media-permission-denied',
      'MEDIA_DEVICE_ERROR': 'media-device-error',
      'NETWORK_ERROR': 'network-unstable',
      'SERVER_ERROR': 'server-error'
    };
    
    const strategyKey = strategyMap[error.code] || `${error.type}-error`;
    return recoveryStrategies.current[strategyKey] || null;
  };

  // Clear specific error
  const clearError = useCallback((errorId: string) => {
    setErrors(prev => prev.filter(error => error.id !== errorId));
  }, []);

  // Clear all errors
  const clearAllErrors = useCallback(() => {
    setErrors([]);
  }, []);

  // Cancel active recovery
  const cancelRecovery = useCallback(() => {
    setActiveRecovery(null);
    setIsRecovering(false);
  }, []);

  // Get error statistics
  const getErrorStats = useCallback(() => {
    const total = errors.length;
    const byType = errors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const bySeverity = errors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const recoverable = errors.filter(e => e.recoverable).length;
    const resolved = recoveryHistory.filter(a => a.success).length;
    
    return {
      total,
      byType,
      bySeverity,
      recoverable,
      resolved,
      successRate: total > 0 ? (resolved / total) * 100 : 0
    };
  }, [errors, recoveryHistory]);

  // Export error log for debugging
  const exportErrorLog = useCallback(() => {
    const errorLog = {
      errors,
      recoveryHistory,
      timestamp: new Date().toISOString(),
      stats: getErrorStats()
    };
    
    const blob = new Blob([JSON.stringify(errorLog, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `call-error-log-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  }, [errors, recoveryHistory, getErrorStats]);

  return {
    // State
    errors,
    activeRecovery,
    recoveryHistory,
    isRecovering,
    
    // Actions
    reportError,
    startRecovery,
    clearError,
    clearAllErrors,
    cancelRecovery,
    
    // Utilities
    getErrorStats,
    exportErrorLog,
    
    // Computed values
    hasErrors: errors.length > 0,
    hasCriticalErrors: errors.some(e => e.severity === 'critical'),
    criticalErrors: errors.filter(e => e.severity === 'critical'),
    recoverableErrors: errors.filter(e => e.recoverable),
    recentErrors: errors.filter(e => Date.now() - e.timestamp.getTime() < 300000) // Last 5 minutes
  };
}