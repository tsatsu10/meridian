/**
 * Console Logging Optimizer
 * Optimizes console logging for production builds
 */

// Development-only console wrapper
const createOptimizedConsole = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isVerbose = localStorage?.getItem('verbose-logging') === 'true';

  return {
    log: isDevelopment || isVerbose ? console.log.bind(console) : () => {},
    info: isDevelopment || isVerbose ? console.info.bind(console) : () => {},
    warn: console.warn.bind(console), // Always show warnings
    error: console.error.bind(console), // Always show errors
    debug: isDevelopment && isVerbose ? console.debug.bind(console) : () => {},
    trace: isDevelopment && isVerbose ? console.trace.bind(console) : () => {},
    time: isDevelopment ? console.time.bind(console) : () => {},
    timeEnd: isDevelopment ? console.timeEnd.bind(console) : () => {},
    group: isDevelopment ? console.group.bind(console) : () => {},
    groupEnd: isDevelopment ? console.groupEnd.bind(console) : () => {},
    table: isDevelopment ? console.table.bind(console) : () => {},
  };
};

// Optimized logger with performance tracking
export const logger = {
  ...createOptimizedConsole(),

  // Performance-aware logging
  perf: (label: string, fn: () => void) => {
    if (process.env.NODE_ENV === 'development') {
      const start = performance.now();
      fn();
      const end = performance.now();} else {
      fn();
    }
  },

  // Structured logging for better debugging
  structured: (context: string, data: any, level: 'info' | 'warn' | 'error' = 'info') => {
    if (process.env.NODE_ENV === 'development') {
      console[level](`[${context}]`, data);
    } else if (level === 'error' || level === 'warn') {
      console[level](`[${context}]`, data);
    }
  },

  // Conditional logging based on feature flags
  feature: (feature: string, message: string, data?: any) => {
    const enabledFeatures = localStorage?.getItem('debug-features')?.split(',') || [];
    if (process.env.NODE_ENV === 'development' || enabledFeatures.includes(feature)) {}
  },

  // WebSocket specific logging
  websocket: (event: string, data?: any) => {
    logger.feature('websocket', event, data);
  },

  // API request logging
  api: (method: string, url: string, data?: any) => {
    logger.feature('api', `${method} ${url}`, data);
  },

  // State management logging
  state: (store: string, action: string, data?: any) => {
    logger.feature('state', `${store}: ${action}`, data);
  }
};

// Replace all existing console calls with optimized logger
export const optimizeConsoleUsage = () => {
  if (process.env.NODE_ENV === 'production') {
    // Override global console in production
    const productionConsole = {
      log: () => {},
      info: () => {},
      debug: () => {},
      trace: () => {},
      time: () => {},
      timeEnd: () => {},
      group: () => {},
      groupEnd: () => {},
      table: () => {},
      warn: console.warn.bind(console),
      error: console.error.bind(console),
    };

    // Only replace if we're in a browser environment
    if (typeof window !== 'undefined') {
      Object.assign(console, productionConsole);
    }
  }
};

// Initialize console optimization
optimizeConsoleUsage();