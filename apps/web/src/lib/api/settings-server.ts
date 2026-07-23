import type { AllSettings } from "@/store/settings";
import type { SettingsValidationError } from "./settings-api";

/**
 * Production Settings API Client
 * @epic-3.2-settings: Real API integration for user settings
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3005";

// Production API client for settings
class ProductionSettingsAPI {
  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    // The real app authenticates via an HttpOnly session cookie set on
    // sign-in (apps/api/src/user/index.ts), not a Bearer token — nothing
    // in the sign-in flow ever populates localStorage/sessionStorage's
    // "auth-token" key, so that branch never actually fired. Every call
    // through this client was hitting the API unauthenticated and 401ing.
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Request failed" }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // :userId is compared against the authenticated user's email server-side
  // (apps/api/src/settings/index.ts), not a database id — callers must pass
  // the user's email.
  async load(userId: string): Promise<Partial<AllSettings>> {
    const response = await this.makeRequest(`/api/settings/${userId}`);
    return response.data as Partial<AllSettings>;
  }

  async updateSection(
    userId: string,
    section: keyof AllSettings,
    updates: Partial<AllSettings[keyof AllSettings]>,
  ): Promise<Partial<AllSettings>> {
    const response = await this.makeRequest(
      `/api/settings/${userId}/${section}`,
      {
        method: "PATCH",
        body: JSON.stringify({ updates }),
      },
    );
    return response.data.settings as Partial<AllSettings>;
  }

  async resetSection(
    userId: string,
    section: keyof AllSettings,
  ): Promise<Partial<AllSettings>> {
    const response = await this.makeRequest(
      `/api/settings/${userId}/${section}/reset`,
      { method: "POST" },
    );
    return response.data as Partial<AllSettings>;
  }

  async validateSettings(
    section: keyof AllSettings,
    settings: Partial<AllSettings[keyof AllSettings]>,
  ): Promise<SettingsValidationError[]> {
    const response = await this.makeRequest(
      `/api/settings/${section}/validate`,
      {
        method: "POST",
        body: JSON.stringify({ settings }),
      },
    );
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
    language: navigator.language.split("-")[0] || "en",
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
    scheduledThemeEnabled: false,
    lightThemeTime: "06:00",
    darkThemeTime: "18:00",
    locationBasedEnabled: false,
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
export const SettingsAPI = {
  async getSettings(userId: string): Promise<AllSettings> {
    try {
      const settings = await api.load(userId);
      return SettingsAPI.mergeWithDefaults(settings);
    } catch (error) {
      console.warn("Settings API unavailable, using local fallback:", error);
      return SettingsAPI.getLocalFallback(userId);
    }
  },

  async updateSettings(
    userId: string,
    section: keyof AllSettings,
    updates: Partial<AllSettings[keyof AllSettings]>,
  ): Promise<{ settings: AllSettings; conflicts?: unknown[] }> {
    try {
      const settings = await api.updateSection(userId, section, updates);
      return {
        settings: SettingsAPI.mergeWithDefaults(settings),
        conflicts: [], // Backend will handle conflict resolution
      };
    } catch (error) {
      console.warn("Settings update failed, using local fallback:", error);
      return SettingsAPI.updateLocalFallback(userId, section, updates);
    }
  },

  async validateSettings(
    section: keyof AllSettings,
    settings: Partial<AllSettings[keyof AllSettings]>,
  ): Promise<SettingsValidationError[]> {
    try {
      return await api.validateSettings(section, settings);
    } catch (error) {
      console.warn(
        "Settings validation API unavailable, using client-side validation",
      );
      return SettingsAPI.clientSideValidation(section, settings);
    }
  },

  async resetSection(
    userId: string,
    section: keyof AllSettings,
  ): Promise<AllSettings> {
    try {
      const settings = await api.resetSection(userId, section);
      return SettingsAPI.mergeWithDefaults(settings);
    } catch (error) {
      console.warn("Settings reset failed, using local fallback:", error);
      const currentSettings = SettingsAPI.getLocalFallback(userId);
      const resetSettings = {
        ...currentSettings,
        [section]: defaultSettings[section],
      };
      SettingsAPI.saveLocalFallback(userId, resetSettings);
      return resetSettings;
    }
  },

  // Fallback methods for offline/error scenarios
  getLocalFallback(userId: string): AllSettings {
    try {
      const stored = localStorage.getItem(`meridian-settings-${userId}`);
      if (stored) {
        const settings = JSON.parse(stored);
        return SettingsAPI.mergeWithDefaults(settings);
      }
    } catch (error) {
      console.warn("Local storage unavailable:", error);
    }
    return { ...defaultSettings };
  },

  async updateLocalFallback(
    userId: string,
    section: keyof AllSettings,
    updates: Partial<AllSettings[keyof AllSettings]>,
  ): Promise<{ settings: AllSettings; conflicts?: unknown[] }> {
    const currentSettings = SettingsAPI.getLocalFallback(userId);
    const updatedSettings = {
      ...currentSettings,
      [section]: {
        ...currentSettings[section],
        ...updates,
      },
    };

    SettingsAPI.saveLocalFallback(userId, updatedSettings);

    return {
      settings: updatedSettings,
      conflicts: [],
    };
  },

  saveLocalFallback(userId: string, settings: AllSettings): void {
    try {
      localStorage.setItem(
        `meridian-settings-${userId}`,
        JSON.stringify(settings),
      );
    } catch (error) {
      console.warn("Failed to save settings locally:", error);
    }
  },

  mergeWithDefaults(settings: Partial<AllSettings>): AllSettings {
    const merged = { ...defaultSettings };

    // Deep merge each section
    for (const [section, values] of Object.entries(settings)) {
      if (section in merged && typeof values === "object" && values !== null) {
        (merged as Record<string, unknown>)[section] = {
          ...merged[section as keyof AllSettings],
          ...values,
        };
      }
    }

    return merged;
  },

  clientSideValidation(
    section: keyof AllSettings,
    settings: Partial<AllSettings[keyof AllSettings]>,
  ): SettingsValidationError[] {
    const errors: SettingsValidationError[] = [];

    // Basic validation rules
    if (section === "profile") {
      const profile = settings as {
        email?: string;
        website?: string;
        name?: string;
        phone?: string;
      };

      if (profile.email && !SettingsAPI.isValidEmail(profile.email)) {
        errors.push({
          field: "email",
          message: "Please enter a valid email address",
          code: "INVALID_EMAIL",
        });
      }

      if (profile.website && !SettingsAPI.isValidUrl(profile.website)) {
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

      if (
        profile.phone &&
        profile.phone.length > 0 &&
        !/^\+?[\d\s\-\(\)]+$/.test(profile.phone)
      ) {
        errors.push({
          field: "phone",
          message: "Please enter a valid phone number",
          code: "INVALID_PHONE",
        });
      }
    }

    if (section === "appearance") {
      const appearance = settings as { fontSize?: number };

      if (
        appearance.fontSize &&
        (appearance.fontSize < 10 || appearance.fontSize > 24)
      ) {
        errors.push({
          field: "fontSize",
          message: "Font size must be between 10 and 24 pixels",
          code: "INVALID_FONT_SIZE",
        });
      }
    }

    return errors;
  },

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  // Development/testing helpers
  clearAllData(userId?: string): void {
    if (userId) {
      localStorage.removeItem(`meridian-settings-${userId}`);
    } else {
      // Clear all Meridian settings from localStorage
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith("meridian-settings-")) {
          localStorage.removeItem(key);
        }
      }
    }
  },

  exportData(userId: string): Record<string, unknown> {
    try {
      const data = localStorage.getItem(`meridian-settings-${userId}`);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },
};
