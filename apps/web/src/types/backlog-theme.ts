/**
 * 🎨 Backlog Theme Types
 * 
 * Type definitions for backlog themes/categories
 */

export interface BacklogTheme {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  color: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateThemeInput {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateThemeInput {
  name?: string;
  description?: string;
  color?: string;
}

export interface ThemeApiResponse {
  success: boolean;
  data?: BacklogTheme | BacklogTheme[];
  message?: string;
  error?: string;
}

