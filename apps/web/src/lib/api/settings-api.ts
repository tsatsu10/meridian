import { AllSettings } from "@/store/settings";
import { SettingsPreset } from "@/store/settings-presets";
import { SettingsAPI as ProductionSettingsAPI } from "./settings-server";

// API response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: string;
  version: number;
}

export interface SettingsValidationError {
  field: string;
  message: string;
  code: string;
}

export interface SettingsAuditLog {
  id: string;
  userId: string;
  action: "UPDATE" | "RESET" | "PRESET_APPLIED" | "IMPORT" | "EXPORT";
  section?: keyof AllSettings;
  changes: Record<string, { from: any; to: any }>;
  metadata: {
    userAgent: string;
    ip: string;
    timestamp: string;
    sessionId: string;
  };
}

export interface SettingsSync {
  settings: AllSettings;
  lastModified: string;
  version: number;
  deviceId: string;
  conflictResolution?: "local" | "remote" | "merge";
}

export interface SettingsExport {
  format: "json" | "csv" | "yaml";
  sections?: (keyof AllSettings)[];
  includeMetadata?: boolean;
  compressed?: boolean;
}

export interface SettingsImport {
  data: string | File;
  format: "json" | "csv" | "yaml";
  overwrite?: boolean;
  preview?: boolean;
}

// Cache configuration
const CACHE_CONFIG = {
  TTL: 5 * 60 * 1000, // 5 minutes
  MAX_ENTRIES: 100,
  STORAGE_KEY: "meridian-settings-cache",
};

// API cache implementation
class SettingsCache {
  private cache = new Map<string, { data: any; timestamp: number; version: number }>();
  
  constructor() {
    this.loadFromStorage();
  }

  set(key: string, data: any, version: number = 1): void {
    this.cache.set(key, {
      data: structuredClone(data),
      timestamp: Date.now(),
      version,
    });
    this.cleanup();
    this.saveToStorage();
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if entry is expired
    if (Date.now() - entry.timestamp > CACHE_CONFIG.TTL) {
      this.cache.delete(key);
      this.saveToStorage();
      return null;
    }

    return structuredClone(entry.data) as T;
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
    } else {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    }
    this.saveToStorage();
  }

  private cleanup(): void {
    if (this.cache.size <= CACHE_CONFIG.MAX_ENTRIES) return;

    // Remove oldest entries
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);
    
    const toRemove = entries.slice(0, this.cache.size - CACHE_CONFIG.MAX_ENTRIES);
    toRemove.forEach(([key]) => this.cache.delete(key));
  }

  private saveToStorage(): void {
    try {
      const serializable = Array.from(this.cache.entries());
      localStorage.setItem(CACHE_CONFIG.STORAGE_KEY, JSON.stringify(serializable));
    } catch (error) {
      console.warn("Failed to save cache to storage:", error);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(CACHE_CONFIG.STORAGE_KEY);
      if (stored) {
        const entries = JSON.parse(stored);
        this.cache = new Map(entries);
        this.cleanup(); // Remove expired entries
      }
    } catch (error) {
      console.warn("Failed to load cache from storage:", error);
      this.cache.clear();
    }
  }
}

// Global cache instance
const settingsCache = new SettingsCache();

// API configuration
const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || "http://localhost:3005",
  TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
  USE_PRODUCTION: true, // Use production API with fallback
};

// Helper function to get auth headers
function getAuthHeaders(): HeadersInit {
  // Get the auth token from the authentication system
  const token = localStorage.getItem('auth-token') || sessionStorage.getItem('auth-token');
  const userEmail = localStorage.getItem('user-email') || sessionStorage.getItem('user-email');
  
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  if (userEmail) {
    headers["X-User-Email"] = userEmail;
  }
  
  return headers;
}

// Enhanced fetch with retry logic and error handling
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retryCount = 0
): Promise<ApiResponse<T>> {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data: ApiResponse<T> = await response.json();
    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    // Retry logic for transient errors
    if (retryCount < API_CONFIG.RETRY_ATTEMPTS) {
      const isRetryableError = 
        error instanceof TypeError || // Network error
        (error as any)?.name === "AbortError" || // Timeout
        (error as any)?.status >= 500; // Server error

      if (isRetryableError) {
        await new Promise(resolve => 
          setTimeout(resolve, API_CONFIG.RETRY_DELAY * Math.pow(2, retryCount))
        );
        return apiRequest<T>(endpoint, options, retryCount + 1);
      }
    }

    throw error;
  }
}

// Settings API implementation
export class SettingsAPI {
  // Get user settings with caching
  static async getSettings(userId: string, useCache = true): Promise<AllSettings> {
    // Try production API first, fallback to local storage if needed
    if (API_CONFIG.USE_PRODUCTION) {
      try {
        return await ProductionSettingsAPI.getSettings(userId);
      } catch (error) {
        console.warn("Production API unavailable, using local fallback:", error);
      }
    }

    const cacheKey = `settings:${userId}`;
    
    if (useCache) {
      const cached = settingsCache.get<AllSettings>(cacheKey);
      if (cached) return cached;
    }

    try {
      const response = await apiRequest<AllSettings>(`/settings/${userId}`);
      
      if (response.success) {
        settingsCache.set(cacheKey, response.data, response.version);
        return response.data;
      }
      
      throw new Error(response.message || "Failed to fetch settings");
    } catch (error) {
      console.warn("Backend API unavailable, using production fallback:", error);
      // Fallback to production settings API with local storage
      return await ProductionSettingsAPI.getSettings(userId);
    }
  }

  // Update settings with optimistic updates and conflict resolution
  static async updateSettings(
    userId: string,
    section: keyof AllSettings,
    updates: Partial<AllSettings[keyof AllSettings]>,
    version?: number
  ): Promise<{ settings: AllSettings; conflicts?: any[] }> {
    // Try production API first
    if (API_CONFIG.USE_PRODUCTION) {
      try {
        return await ProductionSettingsAPI.updateSettings(userId, section, updates);
      } catch (error) {
        console.warn("Production API unavailable, using local fallback:", error);
      }
    }

    try {
      const response = await apiRequest<{ settings: AllSettings; conflicts?: any[] }>(
        `/settings/${userId}/${section}`,
        {
          method: "PATCH",
          body: JSON.stringify({ updates, version }),
        }
      );

      if (response.success) {
        // Update cache
        const cacheKey = `settings:${userId}`;
        settingsCache.set(cacheKey, response.data.settings, response.version);
        
        return response.data;
      }
      
      throw new Error(response.message || "Failed to update settings");
    } catch (error) {
      console.warn("Backend API unavailable, using production fallback:", error);
      // Fallback to production settings API
      return await ProductionSettingsAPI.updateSettings(userId, section, updates);
    }
  }

  // Validate settings before saving
  static async validateSettings(
    section: keyof AllSettings,
    settings: Partial<AllSettings[keyof AllSettings]>
  ): Promise<SettingsValidationError[]> {
    // Try production API first
    if (API_CONFIG.USE_PRODUCTION) {
      try {
        return await ProductionSettingsAPI.validateSettings(section, settings);
      } catch (error) {
        console.warn("Production API unavailable, using local fallback:", error);
      }
    }

    try {
      const response = await apiRequest<SettingsValidationError[]>(
        `/settings/${section}/validate`,
        {
          method: "POST",
          body: JSON.stringify({ settings }),
        }
      );

      if (response.success) {
        return response.data;
      }
      
      throw new Error(response.message || "Failed to validate settings");
    } catch (error) {
      console.warn("Backend API unavailable, using production fallback:", error);
      // Fallback to production settings API
      return await ProductionSettingsAPI.validateSettings(section, settings);
    }
  }

  // Apply preset with server-side validation
  static async applyPreset(
    userId: string,
    presetId: string,
    customizations?: Partial<AllSettings>
  ): Promise<{ settings: AllSettings; applied: SettingsPreset }> {
    const response = await apiRequest<{ settings: AllSettings; applied: SettingsPreset }>(
      `/settings/${userId}/preset/${presetId}`,
      {
        method: "POST",
        body: JSON.stringify({ customizations }),
      }
    );

    if (response.success) {
      // Invalidate cache to force refresh
      settingsCache.invalidate(`settings:${userId}`);
      return response.data;
    }
    
    throw new Error(response.message || "Failed to apply preset");
  }

  // Sync settings across devices
  static async syncSettings(
    userId: string,
    localSettings: AllSettings,
    lastSynced?: string
  ): Promise<SettingsSync> {
    const response = await apiRequest<SettingsSync>(`/settings/${userId}/sync`, {
      method: "POST",
      body: JSON.stringify({
        settings: localSettings,
        lastSynced,
        deviceId: this.getDeviceId(),
      }),
    });

    if (response.success) {
      // Update cache with synced settings
      const cacheKey = `settings:${userId}`;
      settingsCache.set(cacheKey, response.data.settings, response.data.version);
      
      return response.data;
    }
    
    throw new Error(response.message || "Failed to sync settings");
  }

  // Export settings
  static async exportSettings(
    userId: string,
    options: SettingsExport
  ): Promise<{ data: string; filename: string; mimeType: string }> {
    const response = await apiRequest<{ data: string; filename: string; mimeType: string }>(
      `/settings/${userId}/export`,
      {
        method: "POST",
        body: JSON.stringify(options),
      }
    );

    if (response.success) {
      return response.data;
    }
    
    throw new Error(response.message || "Failed to export settings");
  }

  // Import settings with validation
  static async importSettings(
    userId: string,
    options: SettingsImport
  ): Promise<{ 
    preview?: AllSettings; 
    imported?: AllSettings; 
    warnings?: string[];
    errors?: SettingsValidationError[];
  }> {
    const formData = new FormData();
    
    if (options.data instanceof File) {
      formData.append("file", options.data);
    } else {
      formData.append("data", options.data);
    }
    
    formData.append("format", options.format);
    formData.append("overwrite", String(options.overwrite || false));
    formData.append("preview", String(options.preview || false));

    const response = await apiRequest<{
      preview?: AllSettings;
      imported?: AllSettings;
      warnings?: string[];
      errors?: SettingsValidationError[];
    }>(`/settings/${userId}/import`, {
      method: "POST",
      body: formData,
      headers: {}, // Don't set Content-Type for FormData
    });

    if (response.success) {
      // Invalidate cache if settings were actually imported
      if (response.data.imported) {
        settingsCache.invalidate(`settings:${userId}`);
      }
      return response.data;
    }
    
    throw new Error(response.message || "Failed to import settings");
  }

  // Get audit logs
  static async getAuditLogs(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      section?: keyof AllSettings;
      action?: SettingsAuditLog["action"];
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<{ logs: SettingsAuditLog[]; total: number }> {
    const params = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    });

    const response = await apiRequest<{ logs: SettingsAuditLog[]; total: number }>(
      `/settings/${userId}/audit?${params.toString()}`
    );

    if (response.success) {
      return response.data;
    }
    
    throw new Error(response.message || "Failed to fetch audit logs");
  }

  // Reset settings section
  static async resetSection(
    userId: string,
    section: keyof AllSettings
  ): Promise<AllSettings> {
    // Try production API first
    if (API_CONFIG.USE_PRODUCTION) {
      try {
        return await ProductionSettingsAPI.resetSection(userId, section);
      } catch (error) {
        console.warn("Production API unavailable, using local fallback:", error);
      }
    }

    try {
      const response = await apiRequest<AllSettings>(
        `/settings/${userId}/${section}/reset`,
        { method: "POST" }
      );

      if (response.success) {
        // Update cache
        const cacheKey = `settings:${userId}`;
        settingsCache.set(cacheKey, response.data, response.version);
        
        return response.data;
      }
      
      throw new Error(response.message || "Failed to reset settings");
    } catch (error) {
      console.warn("Backend API unavailable, using production fallback:", error);
      // Fallback to production settings API
      return await ProductionSettingsAPI.resetSection(userId, section);
    }
  }

  // Get available presets (cached)
  static async getPresets(useCache = true): Promise<SettingsPreset[]> {
    const cacheKey = "presets:available";
    
    if (useCache) {
      const cached = settingsCache.get<SettingsPreset[]>(cacheKey);
      if (cached) return cached;
    }

    const response = await apiRequest<SettingsPreset[]>("/settings/presets");
    
    if (response.success) {
      settingsCache.set(cacheKey, response.data);
      return response.data;
    }
    
    throw new Error(response.message || "Failed to fetch presets");
  }

  // Utility: Generate or get device ID
  private static getDeviceId(): string {
    const key = "meridian-device-id";
    let deviceId = localStorage.getItem(key);
    
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(key, deviceId);
    }
    
    return deviceId;
  }

  // Utility: Clear all caches
  static clearCache(): void {
    settingsCache.invalidate();
  }

  // Utility: Health check
  static async healthCheck(): Promise<boolean> {
    try {
      const response = await apiRequest<{ status: string }>("/health");
      return response.success && response.data.status === "ok";
    } catch {
      return false;
    }
  }
} 