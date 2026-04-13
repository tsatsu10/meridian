/**
 * Production Configuration
 * Production-ready feature management and configuration
 */

export const PRODUCTION_CONFIG = {
  // Production API configuration
  useProductionAPI: import.meta.env.VITE_USE_PRODUCTION_API !== "false",
  
  // Enable debug features only in development
  debugMode: import.meta.env.VITE_DEBUG_MODE === "true" && import.meta.env.DEV,
  
  // Production features - all enabled
  features: {
    // Core system features
    settingsSync: true,
    validationSystem: true,
    themeSync: true,
    
    // Team management features
    teamManagement: true,
    permissionMatrix: true,
    approvalWorkflows: true,
    guestAccess: true,
    teamHierarchy: true,
    
    // Data and integrations
    dataExport: true,
    dataImport: true,
    integrations: true,
    
    // Advanced features
    apiAccess: true,
    advancedAnalytics: true,
    realTimeCollaboration: true,
    workflowAutomation: true,
  },
  
  // Production API endpoints
  api: {
    baseURL: import.meta.env.VITE_API_URL || "https://api.meridian.com",
    timeout: 15000,
    retries: 3,
    rateLimit: {
      requests: 100,
      windowMs: 60000, // 1 minute
    },
  },
  
  // Storage keys for production
  storage: {
    settings: "meridian-settings",
    teamManagement: "meridian-team-management",
    productionSettings: "meridian-production-settings",
    userPreferences: "meridian-user-preferences",
    workspaceCache: "meridian-workspace-cache",
  },
  
  // Production user context
  production: {
    requireAuthentication: true,
    enableAnalytics: true,
    enableErrorReporting: true,
    enablePerformanceMonitoring: true,
  },
};

// Utility functions
export function isDevelopment(): boolean {
  return import.meta.env.DEV;
}

export function isFeatureEnabled(feature: keyof typeof PRODUCTION_CONFIG.features): boolean {
  return PRODUCTION_CONFIG.features[feature];
}

export function getApiConfig() {
  return PRODUCTION_CONFIG.api;
}

export function getStorageKey(key: keyof typeof PRODUCTION_CONFIG.storage): string {
  return PRODUCTION_CONFIG.storage[key];
}

// Production helpers
export function clearAllProductionData(): void {
  if (isDevelopment()) {
    console.warn("clearAllProductionData() should only be used in development");
    return;
  }
  
  // Only clear non-essential data in production
  const nonEssentialKeys = ['workspaceCache'];
  nonEssentialKeys.forEach(key => {
    if (key in PRODUCTION_CONFIG.storage) {
      localStorage.removeItem(PRODUCTION_CONFIG.storage[key as keyof typeof PRODUCTION_CONFIG.storage]);
    }
  });}

export function logFeatureStatus(): void {
  if (!PRODUCTION_CONFIG.debugMode) return;
  
  console.group("🚀 Meridian Feature Status");
  Object.entries(PRODUCTION_CONFIG.features).forEach(([feature, enabled]) => {});
  console.groupEnd();
}

// Initialize production features
if (isDevelopment() && PRODUCTION_CONFIG.debugMode) {logFeatureStatus();
  
  // Add global development helpers
  (window as any).MeridianDev = {
    clearData: clearAllProductionData,
    logFeatures: logFeatureStatus,
    config: PRODUCTION_CONFIG,
  };
} 