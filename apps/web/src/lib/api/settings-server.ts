import { AllSettings } from "@/store/settings";
import type { SettingsValidationError } from "./settings-api";

/**
 * Production Settings API Client
 * @epic-3.2-settings: Real API integration for user settings
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3005";

// Production API client for settings
class ProductionSettingsAPI {
  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem("auth-token") || sessionStorage.getItem("auth-token");
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Request failed" }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async save(userId: string, settings: AllSettings): Promise<void> {
    await this.makeRequest(`/api/users/${userId}/settings`, {
      method: "PUT",
      body: JSON.stringify(settings),
    });
  }

  async load(userId: string): Promise<AllSettings | null> {
    try {
      return await this.makeRequest(`/api/users/${userId}/settings`);
    } catch (error) {
      if (error instanceof Error && error.message.includes("404")) {
        return null; // User settings not found, will use defaults
      }
      throw error;
    }
  }

  async validateSettings(
    section: keyof AllSettings,
    settings: Partial<AllSettings[keyof AllSettings]>
  ): Promise<SettingsValidationError[]> {
    const response = await this.makeRequest(`/api/settings/${section}/validate`, {
      method: "POST",
      body: JSON.stringify({ settings }),
    });
    return response.data || response;
  }
}

const api = new ProductionSettingsAPI();

// Default settings for new users
const defaultSettings: AllSettings = {
  profile: {
    name: "",
    email: "",
    bio: "",
    location: "",
    website: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    language: navigator.language.split('-')[0] || "en",
    jobTitle: "",
    company: "",
    phone: "",
    avatar: "",
    emailVerified: false,
    createdAt: new Date().toISOString(),
  },
  appearance: {
    theme: "system",
    fontSize: 14,
    sidebarCollapsed: false,
    density: "comfortable",
    animations: true,
    soundEffects: false,
    highContrast: false,
    reducedMotion: false,
    compactMode: false,
  },
  notifications: {
    email: {
      taskAssigned: true,
      taskCompleted: true,
      taskOverdue: true,
      projectUpdates: true,
      teamInvitations: true,
      weeklyDigest: true,
      mentions: true,
      comments: true,
    },
    push: {
      taskAssigned: true,
      taskCompleted: false,
      taskOverdue: true,
      mentions: true,
      comments: true,
      directMessages: true,
      projectUpdates: false,
    },
    inApp: {
      taskAssigned: true,
      taskCompleted: true,
      taskOverdue: true,
      mentions: true,
      comments: true,
      directMessages: true,
      projectUpdates: true,
      teamActivity: true,
    },
    soundEnabled: true,
  },
  security: {
    twoFactorEnabled: false,
    loginNotifications: true,
    sessionTimeout: true,
    deviceTracking: true,
    suspiciousActivityAlerts: true,
    smsBackup: false,
    rememberDevice: false,
  },
  privacy: {
    profileVisibility: true,
    activityTracking: true,
    analyticsOptIn: false,
    marketingOptIn: false,
    dataRetention: true,
    showOnlineStatus: true,
    allowDirectMessages: true,
  },
};

// Production API interface with fallback support
export class SettingsAPI {
  static async getSettings(userId: string): Promise<AllSettings> {
    try {
      const settings = await api.load(userId);
      if (settings) {
        // Merge with defaults to ensure all required fields exist
        return this.mergeWithDefaults(settings);
      }
      
      // Initialize with defaults for new users
      const newSettings = { ...defaultSettings };
      await api.save(userId, newSettings);
      return newSettings;
    } catch (error) {
      console.warn("Settings API unavailable, using local fallback:", error);
      return this.getLocalFallback(userId);
    }
  }

  static async updateSettings(
    userId: string,
    section: keyof AllSettings,
    updates: Partial<AllSettings[keyof AllSettings]>
  ): Promise<{ settings: AllSettings; conflicts?: any[] }> {
    try {
      const currentSettings = await this.getSettings(userId);
      const updatedSettings = {
        ...currentSettings,
        [section]: {
          ...currentSettings[section],
          ...updates,
        },
      };
      
      await api.save(userId, updatedSettings);
      
      return {
        settings: updatedSettings,
        conflicts: [], // Backend will handle conflict resolution
      };
    } catch (error) {
      console.warn("Settings update failed, using local fallback:", error);
      return this.updateLocalFallback(userId, section, updates);
    }
  }

  static async validateSettings(
    section: keyof AllSettings,
    settings: Partial<AllSettings[keyof AllSettings]>
  ): Promise<SettingsValidationError[]> {
    try {
      return await api.validateSettings(section, settings);
    } catch (error) {
      console.warn("Settings validation API unavailable, using client-side validation");
      return this.clientSideValidation(section, settings);
    }
  }

  static async resetSection(userId: string, section: keyof AllSettings): Promise<AllSettings> {
    const currentSettings = await this.getSettings(userId);
    const resetSettings = {
      ...currentSettings,
      [section]: defaultSettings[section],
    };
    
    try {
      await api.save(userId, resetSettings);
    } catch (error) {
      console.warn("Settings reset failed, using local fallback:", error);
      this.saveLocalFallback(userId, resetSettings);
    }
    
    return resetSettings;
  }

  // Fallback methods for offline/error scenarios
  private static getLocalFallback(userId: string): AllSettings {
    try {
      const stored = localStorage.getItem(`meridian-settings-${userId}`);
      if (stored) {
        const settings = JSON.parse(stored);
        return this.mergeWithDefaults(settings);
      }
    } catch (error) {
      console.warn("Local storage unavailable:", error);
    }
    return { ...defaultSettings };
  }

  private static async updateLocalFallback(
    userId: string,
    section: keyof AllSettings,
    updates: Partial<AllSettings[keyof AllSettings]>
  ): Promise<{ settings: AllSettings; conflicts?: any[] }> {
    const currentSettings = this.getLocalFallback(userId);
    const updatedSettings = {
      ...currentSettings,
      [section]: {
        ...currentSettings[section],
        ...updates,
      },
    };
    
    this.saveLocalFallback(userId, updatedSettings);
    
    return {
      settings: updatedSettings,
      conflicts: [],
    };
  }

  private static saveLocalFallback(userId: string, settings: AllSettings): void {
    try {
      localStorage.setItem(`meridian-settings-${userId}`, JSON.stringify(settings));
    } catch (error) {
      console.warn("Failed to save settings locally:", error);
    }
  }

  private static mergeWithDefaults(settings: Partial<AllSettings>): AllSettings {
    const merged = { ...defaultSettings };
    
    // Deep merge each section
    for (const [section, values] of Object.entries(settings)) {
      if (section in merged && typeof values === 'object' && values !== null) {
        merged[section as keyof AllSettings] = {
          ...merged[section as keyof AllSettings],
          ...values,
        } as any;
      }
    }
    
    return merged;
  }

  private static clientSideValidation(
    section: keyof AllSettings,
    settings: Partial<AllSettings[keyof AllSettings]>
  ): SettingsValidationError[] {
    const errors: SettingsValidationError[] = [];
    
    // Basic validation rules
    if (section === "profile") {
      const profile = settings as any;
      
      if (profile.email && !this.isValidEmail(profile.email)) {
        errors.push({
          field: "email",
          message: "Please enter a valid email address",
          code: "INVALID_EMAIL",
        });
      }
      
      if (profile.website && !this.isValidUrl(profile.website)) {
        errors.push({
          field: "website",
          message: "Please enter a valid URL",
          code: "INVALID_URL",
        });
      }
      
      if (profile.name && profile.name.length < 2) {
        errors.push({
          field: "name",
          message: "Name must be at least 2 characters long",
          code: "NAME_TOO_SHORT",
        });
      }

      if (profile.phone && profile.phone.length > 0 && !/^\+?[\d\s\-\(\)]+$/.test(profile.phone)) {
        errors.push({
          field: "phone",
          message: "Please enter a valid phone number",
          code: "INVALID_PHONE",
        });
      }
    }
    
    if (section === "appearance") {
      const appearance = settings as any;
      
      if (appearance.fontSize && (appearance.fontSize < 10 || appearance.fontSize > 24)) {
        errors.push({
          field: "fontSize",
          message: "Font size must be between 10 and 24 pixels",
          code: "INVALID_FONT_SIZE",
        });
      }
    }
    
    return errors;
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Development/testing helpers
  static clearAllData(userId?: string): void {
    if (userId) {
      localStorage.removeItem(`meridian-settings-${userId}`);
    } else {
      // Clear all Meridian settings from localStorage
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('meridian-settings-')) {
          localStorage.removeItem(key);
        }
      });
    }
  }

  static exportData(userId: string): Record<string, any> {
    try {
      const data = localStorage.getItem(`meridian-settings-${userId}`);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }
} 