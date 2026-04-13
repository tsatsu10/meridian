/**
 * Project Template Types
 * Type definitions for profession-based project templates
 */

export type TemplateDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type DependencyType = 'blocks' | 'blocked_by';

/**
 * Project Template
 * Represents a reusable project template for specific professions
 */
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
  rating: number; // average rating * 10
  ratingCount: number;
  tags: string[];
  settings: Record<string, any>;
  isPublic: boolean;
  isOfficial: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Template Task
 * Represents a task within a project template
 */
export interface TemplateTask {
  id: string;
  templateId: string;
  title: string;
  description?: string;
  position: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedHours?: number;
  suggestedAssigneeRole?: string;
  relativeStartDay?: number; // days after project start
  relativeDueDay?: number; // days after project start
  tags: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Template Subtask
 * Represents a subtask within a template task
 */
export interface TemplateSubtask {
  id: string;
  templateTaskId: string;
  title: string;
  description?: string;
  position: number;
  estimatedHours?: number;
  suggestedAssigneeRole?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Template Dependency
 * Represents a dependency relationship between template tasks
 */
export interface TemplateDependency {
  id: string;
  dependentTaskId: string;
  requiredTaskId: string;
  type: DependencyType;
  createdAt: Date;
}

/**
 * Full Template with Tasks
 * Complete template including all tasks, subtasks, and dependencies
 */
export interface TemplateWithTasks extends ProjectTemplate {
  tasks: (TemplateTask & {
    subtasks: TemplateSubtask[];
    dependencies: TemplateDependency[];
  })[];
}

/**
 * Template Creation Input
 * Data required to create a new template
 */
export interface CreateTemplateInput {
  name: string;
  description: string;
  profession: string;
  industry: string;
  category?: string;
  icon?: string;
  color?: string;
  estimatedDuration?: number;
  difficulty?: TemplateDifficulty;
  tags?: string[];
  settings?: Record<string, any>;
  isPublic?: boolean;
  isOfficial?: boolean;
  tasks?: CreateTemplateTaskInput[];
}

/**
 * Template Task Creation Input
 */
export interface CreateTemplateTaskInput {
  title: string;
  description?: string;
  position: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  estimatedHours?: number;
  suggestedAssigneeRole?: string;
  relativeStartDay?: number;
  relativeDueDay?: number;
  tags?: string[];
  subtasks?: CreateTemplateSubtaskInput[];
  dependencies?: {
    requiredTaskPosition: number; // position of the task it depends on
    type?: DependencyType;
  }[];
}

/**
 * Template Subtask Creation Input
 */
export interface CreateTemplateSubtaskInput {
  title: string;
  description?: string;
  position: number;
  estimatedHours?: number;
  suggestedAssigneeRole?: string;
}

/**
 * Template Filter Options
 */
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
}

/**
 * Template Application Result
 * Result of applying a template to a project
 */
export interface TemplateApplicationResult {
  projectId: string;
  tasksCreated: number;
  subtasksCreated: number;
  dependenciesCreated: number;
  taskIds: string[];
}

/**
 * Template Statistics
 */
export interface TemplateStats {
  totalTemplates: number;
  totalIndustries: number;
  totalProfessions: number;
  mostPopularTemplate: ProjectTemplate | null;
  highestRatedTemplate: ProjectTemplate | null;
  recentlyAdded: ProjectTemplate[];
}


