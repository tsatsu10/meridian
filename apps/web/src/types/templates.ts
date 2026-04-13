/**
 * Template Types for Frontend
 */

export type TemplateDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type TemplatePriority = 'low' | 'medium' | 'high' | 'urgent';
export type DependencyType = 'blocks' | 'blocked_by';

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  profession: string;
  industry: string;
  category?: string;
  icon?: string;
  color: string;
  estimatedDuration?: number; // in days
  difficulty: TemplateDifficulty;
  usageCount: number;
  rating: number; // 0-5
  ratingCount: number;
  tags: string[];
  settings: Record<string, any>;
  isPublic: boolean;
  isOfficial: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  taskCount?: number; // Added by list endpoint
}

export interface TemplateTask {
  id: string;
  templateId: string;
  title: string;
  description?: string;
  position: number;
  priority: TemplatePriority;
  estimatedHours?: number;
  suggestedAssigneeRole?: string;
  relativeStartDay?: number;
  relativeDueDay?: number;
  tags: string[];
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  subtasks: TemplateSubtask[];
  dependencies: TemplateDependency[];
}

export interface TemplateSubtask {
  id: string;
  templateTaskId: string;
  title: string;
  description?: string;
  position: number;
  estimatedHours?: number;
  suggestedAssigneeRole?: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateDependency {
  id: string;
  dependentTaskId: string;
  requiredTaskId: string;
  type: DependencyType;
  createdAt: string;
}

export interface TemplateWithTasks extends ProjectTemplate {
  tasks: TemplateTask[];
}

export interface TemplateFilterOptions {
  industry?: string;
  profession?: string;
  category?: string;
  difficulty?: TemplateDifficulty;
  tags?: string[];
  searchQuery?: string;
  isOfficial?: boolean;
  minRating?: number;
  sortBy?: 'popular' | 'recent' | 'rating' | 'name';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface TemplateListResponse {
  templates: ProjectTemplate[];
  total: number;
  limit: number;
  offset: number;
}

export interface TemplateApplicationInput {
  projectId: string;
  workspaceId: string;
  startDate?: string;
  assigneeMapping?: Record<string, string>; // role -> userId
}

export interface TemplateApplicationResult {
  projectId: string;
  tasksCreated: number;
  subtasksCreated: number;
  dependenciesCreated: number;
  taskIds: string[];
}

export interface TemplateStats {
  totalTemplates: number;
  totalIndustries: number;
  totalProfessions: number;
  mostPopularTemplate: ProjectTemplate | null;
  highestRatedTemplate: ProjectTemplate | null;
  recentlyAdded: ProjectTemplate[];
}

// Helper types for grouping
export interface TemplatesByIndustry {
  [industry: string]: ProjectTemplate[];
}

export interface TemplatesByProfession {
  [profession: string]: ProjectTemplate[];
}

