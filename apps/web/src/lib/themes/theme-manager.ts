/**
 * 🎨 Theme Manager for Meridian
 * 
 * Handles theme creation, management, import/export, and application
 * Integrates with user preferences and workspace policies
 * 
 * @epic-3.2-themes
 */

import { ThemeDefinition, defaultThemes, applyThemeToDocument } from './color-system';
import { toast } from 'sonner';

export interface CustomTheme extends ThemeDefinition {
  creatorId?: string;
  workspaceId?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  version: string;
}

export interface ThemeExport {
  version: string;
  theme: ThemeDefinition;
  metadata: {
    exportedAt: Date;
    exportedBy?: string;
    source: 'meridian' | 'import';
  };
}

export interface WorkspaceThemePolicy {
  workspaceId: string;
  allowedThemes: string[];
  defaultThemeId?: string;
  enforceTheme: boolean;
  customThemesEnabled: boolean;
  roleBasedDefaults: Record<string, string>;
}

export class ThemeManager {
  private themes: Map<string, ThemeDefinition> = new Map();
  private customThemes: Map<string, CustomTheme> = new Map();
  private currentTheme: ThemeDefinition | null = null;
  private workspacePolicy: WorkspaceThemePolicy | null = null;

  constructor() {
    // Load default themes
    Object.values(defaultThemes).forEach(theme => {
      this.themes.set(theme.id, theme);
    });
    
    // Load custom themes from storage
    this.loadCustomThemes();
  }

  /**
   * Get all available themes
   */
  getAvailableThemes(): ThemeDefinition[] {
    const themes = Array.from(this.themes.values());
    const customThemes = Array.from(this.customThemes.values());
    
    // Filter based on workspace policy if set
    if (this.workspacePolicy) {
      const allowedIds = this.workspacePolicy.allowedThemes;
      return [...themes, ...customThemes].filter(theme => 
        allowedIds.includes(theme.id)
      );
    }
    
    return [...themes, ...customThemes];
  }

  /**
   * Get theme by ID
   */
  getTheme(id: string): ThemeDefinition | null {
    return this.themes.get(id) || this.customThemes.get(id) || null;
  }

  /**
   * Apply theme to the document
   */
  applyTheme(themeId: string): boolean {
    const theme = this.getTheme(themeId);
    if (!theme) {
      toast.error(`Theme "${themeId}" not found`);
      return false;
    }

    // Check workspace policy
    if (this.workspacePolicy?.enforceTheme && 
        !this.workspacePolicy.allowedThemes.includes(themeId)) {
      toast.error('This theme is not allowed in your workspace');
      return false;
    }

    try {
      applyThemeToDocument(theme);
      this.currentTheme = theme;
      
      // Save to local storage
      localStorage.setItem('meridian-current-theme', themeId);
      
      toast.success(`Applied theme: ${theme.name}`);
      return true;
    } catch (error) {
      toast.error('Failed to apply theme');
      console.error('Theme application error:', error);
      return false;
    }
  }

  /**
   * Create a new custom theme
   */
  async createTheme(
    themeData: Omit<ThemeDefinition, 'id'>,
    options: {
      workspaceId?: string;
      isPublic?: boolean;
      tags?: string[];
    } = {}
  ): Promise<string | null> {
    try {
      const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const customTheme: CustomTheme = {
        ...themeData,
        id,
        creatorId: 'current-user', // Would get from auth context
        workspaceId: options.workspaceId,
        isPublic: options.isPublic || false,
        tags: options.tags || [],
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.customThemes.set(id, customTheme);
      await this.saveCustomThemes();
      
      toast.success(`Created theme: ${themeData.name}`);
      return id;
    } catch (error) {
      toast.error('Failed to create theme');
      console.error('Theme creation error:', error);
      return null;
    }
  }

  /**
   * Update an existing custom theme
   */
  async updateTheme(
    themeId: string,
    updates: Partial<ThemeDefinition>
  ): Promise<boolean> {
    const theme = this.customThemes.get(themeId);
    if (!theme) {
      toast.error('Theme not found or cannot be modified');
      return false;
    }

    try {
      const updatedTheme: CustomTheme = {
        ...theme,
        ...updates,
        updatedAt: new Date(),
      };

      this.customThemes.set(themeId, updatedTheme);
      await this.saveCustomThemes();
      
      // Re-apply if it's the current theme
      if (this.currentTheme?.id === themeId) {
        this.applyTheme(themeId);
      }
      
      toast.success(`Updated theme: ${updatedTheme.name}`);
      return true;
    } catch (error) {
      toast.error('Failed to update theme');
      console.error('Theme update error:', error);
      return false;
    }
  }

  /**
   * Delete a custom theme
   */
  async deleteTheme(themeId: string): Promise<boolean> {
    const theme = this.customThemes.get(themeId);
    if (!theme) {
      toast.error('Theme not found or cannot be deleted');
      return false;
    }

    try {
      this.customThemes.delete(themeId);
      await this.saveCustomThemes();
      
      // Switch to default theme if deleting current theme
      if (this.currentTheme?.id === themeId) {
        this.applyTheme('light');
      }
      
      toast.success(`Deleted theme: ${theme.name}`);
      return true;
    } catch (error) {
      toast.error('Failed to delete theme');
      console.error('Theme deletion error:', error);
      return false;
    }
  }

  /**
   * Export theme to JSON
   */
  exportTheme(themeId: string): ThemeExport | null {
    const theme = this.getTheme(themeId);
    if (!theme) {
      toast.error('Theme not found');
      return null;
    }

    const exportData: ThemeExport = {
      version: '1.0',
      theme,
      metadata: {
        exportedAt: new Date(),
        exportedBy: 'current-user', // Would get from auth context
        source: 'meridian',
      },
    };

    return exportData;
  }

  /**
   * Import theme from JSON
   */
  async importTheme(
    exportData: ThemeExport,
    options: {
      workspaceId?: string;
      overwrite?: boolean;
    } = {}
  ): Promise<string | null> {
    try {
      // Validate export data
      if (!exportData.theme || !exportData.theme.name) {
        toast.error('Invalid theme data');
        return null;
      }

      // Check if theme already exists
      const existingTheme = Array.from(this.customThemes.values())
        .find(t => t.name === exportData.theme.name);

      if (existingTheme && !options.overwrite) {
        toast.error('Theme with this name already exists');
        return null;
      }

      // Generate new ID for imported theme
      const id = `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const customTheme: CustomTheme = {
        ...exportData.theme,
        id,
        creatorId: 'current-user',
        workspaceId: options.workspaceId,
        isPublic: false,
        tags: ['imported'],
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.customThemes.set(id, customTheme);
      await this.saveCustomThemes();
      
      toast.success(`Imported theme: ${exportData.theme.name}`);
      return id;
    } catch (error) {
      toast.error('Failed to import theme');
      console.error('Theme import error:', error);
      return null;
    }
  }

  /**
   * Set workspace theme policy
   */
  setWorkspacePolicy(policy: WorkspaceThemePolicy): void {
    this.workspacePolicy = policy;
  }

  /**
   * Get theme recommendations based on user role
   */
  getThemeRecommendations(userRole: string): ThemeDefinition[] {
    // Role-based theme recommendations
    const roleThemes: Record<string, string[]> = {
      'workspace-manager': ['dark', 'professional-dark'],
      'department-head': ['light', 'executive-light'],
      'project-manager': ['light', 'productivity-blue'],
      'team-lead': ['light', 'collaboration-green'],
      'member': ['light', 'dark'],
      'project-viewer': ['light', 'minimal-light'],
    };

    const recommendedIds = roleThemes[userRole] || ['light', 'dark'];
    return recommendedIds
      .map(id => this.getTheme(id))
      .filter(Boolean) as ThemeDefinition[];
  }

  /**
   * Auto-apply theme based on time of day
   */
  autoApplyTimeBasedTheme(): void {
    const hour = new Date().getHours();
    const isDaytime = hour >= 6 && hour < 18;
    
    const autoTheme = isDaytime ? 'light' : 'dark';
    this.applyTheme(autoTheme);
  }

  /**
   * Load custom themes from storage
   */
  private loadCustomThemes(): void {
    try {
      const stored = localStorage.getItem('meridian-custom-themes');
      if (stored) {
        const themes = JSON.parse(stored) as CustomTheme[];
        themes.forEach(theme => {
          this.customThemes.set(theme.id, theme);
        });
      }
    } catch (error) {
      console.error('Failed to load custom themes:', error);
    }
  }

  /**
   * Save custom themes to storage
   */
  private async saveCustomThemes(): Promise<void> {
    try {
      const themes = Array.from(this.customThemes.values());
      localStorage.setItem('meridian-custom-themes', JSON.stringify(themes));
    } catch (error) {
      console.error('Failed to save custom themes:', error);
      throw error;
    }
  }

  /**
   * Get current theme
   */
  getCurrentTheme(): ThemeDefinition | null {
    return this.currentTheme;
  }

  /**
   * Search themes by name or tags
   */
  searchThemes(query: string): ThemeDefinition[] {
    const searchTerm = query.toLowerCase();
    const allThemes = this.getAvailableThemes();
    
    return allThemes.filter(theme => {
      const nameMatch = theme.name.toLowerCase().includes(searchTerm);
      const descMatch = theme.description?.toLowerCase().includes(searchTerm);
      const customTheme = this.customThemes.get(theme.id);
      const tagMatch = customTheme?.tags?.some(tag => 
        tag.toLowerCase().includes(searchTerm)
      );
      
      return nameMatch || descMatch || tagMatch;
    });
  }
}

// Export singleton instance
export const themeManager = new ThemeManager(); 