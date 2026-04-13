import { getDatabase } from "../../database/connection";
import { workspaces } from "../../database/schema";
import { eq } from "drizzle-orm";
import { logger } from "../../utils/logger";
import { createId } from "@paralleldrive/cuid2";

// ===================================
// TYPE DEFINITIONS
// ===================================

export interface ThemeColors {
  // Primary colors
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  
  // Background colors
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  
  // UI element colors
  muted: string;
  mutedForeground: string;
  border: string;
  input: string;
  ring: string;
  
  // Status colors
  destructive: string;
  destructiveForeground: string;
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
  info: string;
  infoForeground: string;
}

export interface ThemeTypography {
  fontFamily: string;
  fontSizeBase: number; // in pixels
  fontSizeSmall: number;
  fontSizeLarge: number;
  fontSizeHeading: number;
  lineHeight: number;
  letterSpacing: number;
  fontWeightNormal: number;
  fontWeightMedium: number;
  fontWeightBold: number;
}

export interface ThemeSpacing {
  borderRadius: 'sharp' | 'rounded' | 'pill'; // 0, 0.5rem, 9999px
  borderRadiusValue: string;
  componentSpacing: 'compact' | 'normal' | 'spacious';
  containerMaxWidth: string;
  shadowIntensity: 'none' | 'subtle' | 'normal' | 'strong';
}

export interface CustomTheme {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  isActive: boolean;
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BrandingSettings {
  workspaceId: string;
  logoUrl?: string;
  faviconUrl?: string;
  loginBackgroundUrl?: string;
  customCss?: string;
  updatedAt: Date;
}

// ===================================
// DEFAULT THEME TEMPLATES
// ===================================

const DEFAULT_COLORS: ThemeColors = {
  primary: '#3B82F6',
  primaryForeground: '#FFFFFF',
  secondary: '#6366F1',
  secondaryForeground: '#FFFFFF',
  accent: '#8B5CF6',
  accentForeground: '#FFFFFF',
  background: '#FFFFFF',
  foreground: '#0F172A',
  card: '#FFFFFF',
  cardForeground: '#0F172A',
  popover: '#FFFFFF',
  popoverForeground: '#0F172A',
  muted: '#F1F5F9',
  mutedForeground: '#64748B',
  border: '#E2E8F0',
  input: '#E2E8F0',
  ring: '#3B82F6',
  destructive: '#EF4444',
  destructiveForeground: '#FFFFFF',
  success: '#10B981',
  successForeground: '#FFFFFF',
  warning: '#F59E0B',
  warningForeground: '#FFFFFF',
  info: '#3B82F6',
  infoForeground: '#FFFFFF',
};

const DEFAULT_TYPOGRAPHY: ThemeTypography = {
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSizeBase: 14,
  fontSizeSmall: 12,
  fontSizeLarge: 16,
  fontSizeHeading: 24,
  lineHeight: 1.5,
  letterSpacing: 0,
  fontWeightNormal: 400,
  fontWeightMedium: 500,
  fontWeightBold: 700,
};

const DEFAULT_SPACING: ThemeSpacing = {
  borderRadius: 'rounded',
  borderRadiusValue: '0.5rem',
  componentSpacing: 'normal',
  containerMaxWidth: '1280px',
  shadowIntensity: 'normal',
};

export const THEME_TEMPLATES = {
  default: {
    name: 'Default (Blue)',
    colors: DEFAULT_COLORS,
    typography: DEFAULT_TYPOGRAPHY,
    spacing: DEFAULT_SPACING,
  },
  dark: {
    name: 'Dark Mode',
    colors: {
      ...DEFAULT_COLORS,
      background: '#0F172A',
      foreground: '#F1F5F9',
      card: '#1E293B',
      cardForeground: '#F1F5F9',
      popover: '#1E293B',
      popoverForeground: '#F1F5F9',
      muted: '#334155',
      mutedForeground: '#94A3B8',
      border: '#334155',
      input: '#334155',
    },
    typography: DEFAULT_TYPOGRAPHY,
    spacing: DEFAULT_SPACING,
  },
  nord: {
    name: 'Nord',
    colors: {
      ...DEFAULT_COLORS,
      primary: '#5E81AC',
      secondary: '#81A1C1',
      accent: '#88C0D0',
      background: '#2E3440',
      foreground: '#ECEFF4',
      card: '#3B4252',
      cardForeground: '#ECEFF4',
      destructive: '#BF616A',
      success: '#A3BE8C',
      warning: '#EBCB8B',
    },
    typography: DEFAULT_TYPOGRAPHY,
    spacing: DEFAULT_SPACING,
  },
  material: {
    name: 'Material Design',
    colors: {
      ...DEFAULT_COLORS,
      primary: '#6200EE',
      secondary: '#03DAC6',
      accent: '#BB86FC',
      background: '#FAFAFA',
      foreground: '#212121',
    },
    typography: {
      ...DEFAULT_TYPOGRAPHY,
      fontFamily: 'Roboto, sans-serif',
    },
    spacing: {
      ...DEFAULT_SPACING,
      borderRadius: 'sharp',
      borderRadiusValue: '4px',
    },
  },
  fluent: {
    name: 'Fluent Design',
    colors: {
      ...DEFAULT_COLORS,
      primary: '#0078D4',
      secondary: '#106EBE',
      accent: '#50E6FF',
      background: '#FFFFFF',
      foreground: '#201F1E',
    },
    typography: {
      ...DEFAULT_TYPOGRAPHY,
      fontFamily: 'Segoe UI, sans-serif',
    },
    spacing: DEFAULT_SPACING,
  },
};

// ===================================
// CRUD OPERATIONS
// ===================================

/**
 * Get all themes for a workspace
 */
export async function getThemes(workspaceId: string): Promise<CustomTheme[]> {
  const db = getDatabase();
  logger.info(`Fetching themes for workspace: ${workspaceId}`);

  try {
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId));

    if (!workspace) {
      throw new Error("Workspace not found");
    }

    // Get themes from workspace settings JSONB
    const themes = (workspace.settings as any)?.customThemes || [];
    
    return themes;
  } catch (error) {
    logger.error(`Failed to fetch themes: ${error}`);
    throw error;
  }
}

/**
 * Get a single theme by ID
 */
export async function getTheme(workspaceId: string, themeId: string): Promise<CustomTheme | null> {
  const themes = await getThemes(workspaceId);
  return themes.find(t => t.id === themeId) || null;
}

/**
 * Create a new custom theme
 */
export async function createTheme(
  workspaceId: string,
  userEmail: string,
  themeData: {
    name: string;
    description?: string;
    colors: ThemeColors;
    typography: ThemeTypography;
    spacing: ThemeSpacing;
    isPublic?: boolean;
  }
): Promise<CustomTheme> {
  const db = getDatabase();
  logger.info(`Creating theme for workspace: ${workspaceId}`);

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const newTheme: CustomTheme = {
    id: createId(),
    workspaceId,
    name: themeData.name,
    description: themeData.description,
    colors: themeData.colors,
    typography: themeData.typography,
    spacing: themeData.spacing,
    isActive: false,
    isPublic: themeData.isPublic || false,
    createdBy: userEmail,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const existingThemes = (workspace.settings as any)?.customThemes || [];
  const updatedThemes = [...existingThemes, newTheme];

  await db
    .update(workspaces)
    .set({
      settings: {
        ...(workspace.settings as any),
        customThemes: updatedThemes,
      },
    })
    .where(eq(workspaces.id, workspaceId));

  logger.info(`Theme created: ${newTheme.id}`);
  return newTheme;
}

/**
 * Update an existing theme
 */
export async function updateTheme(
  workspaceId: string,
  themeId: string,
  updates: Partial<Omit<CustomTheme, 'id' | 'workspaceId' | 'createdBy' | 'createdAt'>>
): Promise<CustomTheme> {
  const db = getDatabase();
  logger.info(`Updating theme: ${themeId}`);

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const existingThemes = (workspace.settings as any)?.customThemes || [];
  const themeIndex = existingThemes.findIndex((t: CustomTheme) => t.id === themeId);

  if (themeIndex === -1) {
    throw new Error("Theme not found");
  }

  const updatedTheme = {
    ...existingThemes[themeIndex],
    ...updates,
    updatedAt: new Date(),
  };

  existingThemes[themeIndex] = updatedTheme;

  await db
    .update(workspaces)
    .set({
      settings: {
        ...(workspace.settings as any),
        customThemes: existingThemes,
      },
    })
    .where(eq(workspaces.id, workspaceId));

  logger.info(`Theme updated: ${themeId}`);
  return updatedTheme;
}

/**
 * Delete a theme
 */
export async function deleteTheme(workspaceId: string, themeId: string): Promise<void> {
  const db = getDatabase();
  logger.info(`Deleting theme: ${themeId}`);

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const existingThemes = (workspace.settings as any)?.customThemes || [];
  const updatedThemes = existingThemes.filter((t: CustomTheme) => t.id !== themeId);

  await db
    .update(workspaces)
    .set({
      settings: {
        ...(workspace.settings as any),
        customThemes: updatedThemes,
      },
    })
    .where(eq(workspaces.id, workspaceId));

  logger.info(`Theme deleted: ${themeId}`);
}

/**
 * Clone a theme
 */
export async function cloneTheme(
  workspaceId: string,
  themeId: string,
  userEmail: string,
  newName: string
): Promise<CustomTheme> {
  const originalTheme = await getTheme(workspaceId, themeId);
  
  if (!originalTheme) {
    throw new Error("Theme not found");
  }

  return createTheme(workspaceId, userEmail, {
    name: newName,
    description: `Clone of ${originalTheme.name}`,
    colors: originalTheme.colors,
    typography: originalTheme.typography,
    spacing: originalTheme.spacing,
    isPublic: false,
  });
}

/**
 * Apply a theme (set as active)
 */
export async function applyTheme(workspaceId: string, themeId: string): Promise<void> {
  const db = getDatabase();
  logger.info(`Applying theme: ${themeId}`);

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const existingThemes = (workspace.settings as any)?.customThemes || [];
  
  // Deactivate all themes, activate the selected one
  const updatedThemes = existingThemes.map((t: CustomTheme) => ({
    ...t,
    isActive: t.id === themeId,
  }));

  await db
    .update(workspaces)
    .set({
      settings: {
        ...(workspace.settings as any),
        customThemes: updatedThemes,
      },
    })
    .where(eq(workspaces.id, workspaceId));

  logger.info(`Theme applied: ${themeId}`);
}

/**
 * Get branding settings
 */
export async function getBrandingSettings(workspaceId: string): Promise<BrandingSettings> {
  const db = getDatabase();
  logger.info(`Fetching branding settings for workspace: ${workspaceId}`);

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const branding = (workspace.settings as any)?.branding || {};
  
  return {
    workspaceId,
    logoUrl: branding.logoUrl || workspace.logo,
    faviconUrl: branding.faviconUrl,
    loginBackgroundUrl: branding.loginBackgroundUrl,
    customCss: branding.customCss,
    updatedAt: new Date(branding.updatedAt || workspace.updatedAt),
  };
}

/**
 * Update branding settings
 */
export async function updateBrandingSettings(
  workspaceId: string,
  updates: Partial<Omit<BrandingSettings, 'workspaceId' | 'updatedAt'>>
): Promise<BrandingSettings> {
  const db = getDatabase();
  logger.info(`Updating branding settings for workspace: ${workspaceId}`);

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const currentBranding = (workspace.settings as any)?.branding || {};
  const updatedBranding = {
    ...currentBranding,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  // Also update workspace logo if provided
  const workspaceUpdates: any = {
    settings: {
      ...(workspace.settings as any),
      branding: updatedBranding,
    },
  };

  if (updates.logoUrl !== undefined) {
    workspaceUpdates.logo = updates.logoUrl;
  }

  await db
    .update(workspaces)
    .set(workspaceUpdates)
    .where(eq(workspaces.id, workspaceId));

  logger.info(`Branding settings updated for workspace: ${workspaceId}`);
  
  return getBrandingSettings(workspaceId);
}


