import { AllSettings } from "./settings";

export interface SettingsPreset {
  id: string;
  name: string;
  description: string;
  persona: string;
  icon: string;
  settings: Partial<AllSettings>;
  popular?: boolean;
}

// @epic-1.1-subtasks @epic-3.2-time @epic-2.1-files
// Sarah wants efficient project management with clear visual feedback
const projectManagerPreset: SettingsPreset = {
  id: "project-manager",
  name: "Project Manager",
  description: "Optimized for project oversight and team coordination",
  persona: "Sarah (PM)",
  icon: "👩‍💼",
  popular: true,
  settings: {
    appearance: {
      theme: "light",
      fontSize: 14,
      density: "comfortable",
      animations: true,
      soundEffects: true,
      highContrast: false,
      reducedMotion: false,
      compactMode: false,
      sidebarCollapsed: false,
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
        taskCompleted: true,
        taskOverdue: true,
        mentions: true,
        comments: true,
        directMessages: true,
        projectUpdates: true,
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
      twoFactorEnabled: true,
      loginNotifications: true,
      sessionTimeout: true,
      deviceTracking: true,
      suspiciousActivityAlerts: true,
    },
    privacy: {
      profileVisibility: true,
      activityTracking: true,
      analyticsOptIn: true,
      marketingOptIn: false,
      dataRetention: true,
      showOnlineStatus: true,
      allowDirectMessages: true,
    },
  },
};

// @epic-3.1-dashboard @epic-2.1-files
// Jennifer needs executive-level insights with minimal distractions
const executivePreset: SettingsPreset = {
  id: "executive",
  name: "Executive",
  description: "High-level overview with essential notifications only",
  persona: "Jennifer (Exec)",
  icon: "👩‍💻",
  popular: true,
  settings: {
    appearance: {
      theme: "system",
      fontSize: 15,
      density: "spacious",
      animations: false,
      soundEffects: false,
      highContrast: false,
      reducedMotion: true,
      compactMode: false,
      sidebarCollapsed: false,
    },
    notifications: {
      email: {
        taskAssigned: false,
        taskCompleted: false,
        taskOverdue: true,
        projectUpdates: true,
        teamInvitations: true,
        weeklyDigest: true,
        mentions: true,
        comments: false,
      },
      push: {
        taskAssigned: false,
        taskCompleted: false,
        taskOverdue: true,
        mentions: true,
        comments: false,
        directMessages: true,
        projectUpdates: true,
      },
      inApp: {
        taskAssigned: false,
        taskCompleted: false,
        taskOverdue: true,
        mentions: true,
        comments: false,
        directMessages: true,
        projectUpdates: true,
        teamActivity: false,
      },
      soundEnabled: false,
    },
    security: {
      twoFactorEnabled: true,
      loginNotifications: true,
      sessionTimeout: true,
      deviceTracking: true,
      suspiciousActivityAlerts: true,
    },
    privacy: {
      profileVisibility: false,
      activityTracking: false,
      analyticsOptIn: false,
      marketingOptIn: false,
      dataRetention: true,
      showOnlineStatus: false,
      allowDirectMessages: false,
    },
  },
};

// @epic-3.2-time @epic-1.2-gantt
// David needs team analytics and workload insights
const teamLeadPreset: SettingsPreset = {
  id: "team-lead",
  name: "Team Lead",
  description: "Team analytics and workload management focused",
  persona: "David (Team Lead)",
  icon: "👨‍💼",
  popular: true,
  settings: {
    appearance: {
      theme: "dark",
      fontSize: 14,
      density: "comfortable",
      animations: true,
      soundEffects: false,
      highContrast: false,
      reducedMotion: false,
      compactMode: false,
      sidebarCollapsed: false,
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
        taskAssigned: false,
        taskCompleted: true,
        taskOverdue: true,
        mentions: true,
        comments: false,
        directMessages: true,
        projectUpdates: true,
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
      soundEnabled: false,
    },
    security: {
      twoFactorEnabled: true,
      loginNotifications: true,
      sessionTimeout: true,
      deviceTracking: true,
      suspiciousActivityAlerts: true,
    },
    privacy: {
      profileVisibility: true,
      activityTracking: true,
      analyticsOptIn: true,
      marketingOptIn: false,
      dataRetention: true,
      showOnlineStatus: true,
      allowDirectMessages: true,
    },
  },
};

// @epic-1.1-subtasks @epic-3.2-time
// Mike wants efficient task management with minimal distractions
const developerPreset: SettingsPreset = {
  id: "developer",
  name: "Developer",
  description: "Minimal distractions with efficient task management",
  persona: "Mike (Dev)",
  icon: "👨‍💻",
  popular: true,
  settings: {
    appearance: {
      theme: "dark",
      fontSize: 13,
      density: "compact",
      animations: false,
      soundEffects: false,
      highContrast: false,
      reducedMotion: true,
      compactMode: true,
      sidebarCollapsed: true,
    },
    notifications: {
      email: {
        taskAssigned: true,
        taskCompleted: false,
        taskOverdue: true,
        projectUpdates: false,
        teamInvitations: true,
        weeklyDigest: false,
        mentions: true,
        comments: false,
      },
      push: {
        taskAssigned: true,
        taskCompleted: false,
        taskOverdue: true,
        mentions: true,
        comments: false,
        directMessages: false,
        projectUpdates: false,
      },
      inApp: {
        taskAssigned: true,
        taskCompleted: false,
        taskOverdue: true,
        mentions: true,
        comments: false,
        directMessages: false,
        projectUpdates: false,
        teamActivity: false,
      },
      soundEnabled: false,
    },
    security: {
      twoFactorEnabled: true,
      loginNotifications: false,
      sessionTimeout: false,
      deviceTracking: false,
      suspiciousActivityAlerts: true,
    },
    privacy: {
      profileVisibility: false,
      activityTracking: false,
      analyticsOptIn: false,
      marketingOptIn: false,
      dataRetention: false,
      showOnlineStatus: false,
      allowDirectMessages: false,
    },
  },
};

// @epic-2.1-files @epic-1.1-subtasks
// Lisa needs file sharing and version control with visual feedback
const designerPreset: SettingsPreset = {
  id: "designer",
  name: "Designer",
  description: "Visual-first with file sharing and collaboration focus",
  persona: "Lisa (Designer)",
  icon: "👩‍🎨",
  settings: {
    appearance: {
      theme: "light",
      fontSize: 14,
      density: "spacious",
      animations: true,
      soundEffects: true,
      highContrast: false,
      reducedMotion: false,
      compactMode: false,
      sidebarCollapsed: false,
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
        projectUpdates: true,
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
    },
    privacy: {
      profileVisibility: true,
      activityTracking: true,
      analyticsOptIn: true,
      marketingOptIn: true,
      dataRetention: true,
      showOnlineStatus: true,
      allowDirectMessages: true,
    },
  },
};

// Additional presets for common scenarios
const minimalistPreset: SettingsPreset = {
  id: "minimalist",
  name: "Minimalist",
  description: "Clean, distraction-free experience",
  persona: "Focus-driven user",
  icon: "🎯",
  settings: {
    appearance: {
      theme: "system",
      fontSize: 14,
      density: "compact",
      animations: false,
      soundEffects: false,
      highContrast: false,
      reducedMotion: true,
      compactMode: true,
      sidebarCollapsed: true,
    },
    notifications: {
      email: {
        taskAssigned: true,
        taskCompleted: false,
        taskOverdue: true,
        projectUpdates: false,
        teamInvitations: true,
        weeklyDigest: false,
        mentions: true,
        comments: false,
      },
      push: {
        taskAssigned: false,
        taskCompleted: false,
        taskOverdue: true,
        mentions: false,
        comments: false,
        directMessages: false,
        projectUpdates: false,
      },
      inApp: {
        taskAssigned: true,
        taskCompleted: false,
        taskOverdue: true,
        mentions: true,
        comments: false,
        directMessages: false,
        projectUpdates: false,
        teamActivity: false,
      },
      soundEnabled: false,
    },
  },
};

const collaboratorPreset: SettingsPreset = {
  id: "collaborator",
  name: "Collaborator",
  description: "Enhanced for team communication and real-time updates",
  persona: "Team-focused user",
  icon: "🤝",
  settings: {
    appearance: {
      theme: "light",
      fontSize: 14,
      density: "comfortable",
      animations: true,
      soundEffects: true,
      highContrast: false,
      reducedMotion: false,
      compactMode: false,
      sidebarCollapsed: false,
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
        taskCompleted: true,
        taskOverdue: true,
        mentions: true,
        comments: true,
        directMessages: true,
        projectUpdates: true,
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
  },
};

export const SETTINGS_PRESETS: SettingsPreset[] = [
  projectManagerPreset,
  executivePreset,
  teamLeadPreset,
  developerPreset,
  designerPreset,
  minimalistPreset,
  collaboratorPreset,
];

export const POPULAR_PRESETS = SETTINGS_PRESETS.filter(preset => preset.popular);

export function getPresetById(id: string): SettingsPreset | undefined {
  return SETTINGS_PRESETS.find(preset => preset.id === id);
}

export function getPresetsByPersona(persona: string): SettingsPreset[] {
  return SETTINGS_PRESETS.filter(preset => preset.persona.includes(persona));
} 