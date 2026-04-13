import { getDatabase } from "../../database/connection";
import { workspaces } from "../../database/schema";
import { eq } from "drizzle-orm";
import { logger } from "../../utils/logger";
import { createId } from "@paralleldrive/cuid2";

// ===================================
// TYPE DEFINITIONS
// ===================================

export interface FilterCondition {
  field: string; // e.g., 'status', 'priority', 'assignee'
  operator: '=' | '!=' | '~' | '>' | '<' | 'between' | 'in' | 'isEmpty' | 'isNotEmpty';
  value: any;
}

export interface FilterGroup {
  logic: 'AND' | 'OR' | 'NOT';
  conditions: FilterCondition[];
  groups?: FilterGroup[]; // Nested groups
}

export interface SavedFilter {
  id: string;
  workspaceId: string;
  userId: string;
  name: string;
  description?: string;
  filterType: 'projects' | 'tasks' | 'users' | 'messages' | 'files';
  filterConfig: FilterGroup;
  isPinned: boolean;
  isPublic: boolean; // Share with workspace
  usageCount: number;
  lastUsed?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface FilterTemplate {
  id: string;
  name: string;
  description: string;
  filterType: 'projects' | 'tasks' | 'users' | 'messages' | 'files';
  filterConfig: FilterGroup;
  category: string;
}

// ===================================
// FILTER TEMPLATES
// ===================================

export const FILTER_TEMPLATES: FilterTemplate[] = [
  // Project filters
  {
    id: 'projects-active',
    name: 'Active Projects',
    description: 'All projects that are currently active',
    filterType: 'projects',
    category: 'Projects',
    filterConfig: {
      logic: 'AND',
      conditions: [
        { field: 'status', operator: '=', value: 'active' },
      ],
    },
  },
  {
    id: 'projects-my-projects',
    name: 'My Projects',
    description: 'Projects where I am the owner or member',
    filterType: 'projects',
    category: 'Projects',
    filterConfig: {
      logic: 'OR',
      conditions: [
        { field: 'owner', operator: '=', value: '$currentUser' },
        { field: 'members', operator: '~', value: '$currentUser' },
      ],
    },
  },
  
  // Task filters
  {
    id: 'tasks-my-tasks',
    name: 'My Tasks',
    description: 'Tasks assigned to me',
    filterType: 'tasks',
    category: 'Tasks',
    filterConfig: {
      logic: 'AND',
      conditions: [
        { field: 'assignee', operator: '=', value: '$currentUser' },
      ],
    },
  },
  {
    id: 'tasks-overdue',
    name: 'Overdue Tasks',
    description: 'Tasks that are past their due date',
    filterType: 'tasks',
    category: 'Tasks',
    filterConfig: {
      logic: 'AND',
      conditions: [
        { field: 'dueDate', operator: '<', value: '$now' },
        { field: 'status', operator: '!=', value: 'completed' },
      ],
    },
  },
  {
    id: 'tasks-high-priority',
    name: 'High Priority',
    description: 'Tasks with high or urgent priority',
    filterType: 'tasks',
    category: 'Tasks',
    filterConfig: {
      logic: 'AND',
      conditions: [
        { field: 'priority', operator: 'in', value: ['high', 'urgent'] },
        { field: 'status', operator: '!=', value: 'completed' },
      ],
    },
  },
  {
    id: 'tasks-unassigned',
    name: 'Unassigned Tasks',
    description: 'Tasks with no assignee',
    filterType: 'tasks',
    category: 'Tasks',
    filterConfig: {
      logic: 'AND',
      conditions: [
        { field: 'assignee', operator: 'isEmpty', value: null },
        { field: 'status', operator: '!=', value: 'completed' },
      ],
    },
  },
  {
    id: 'tasks-recently-updated',
    name: 'Recently Updated',
    description: 'Tasks updated in the last 7 days',
    filterType: 'tasks',
    category: 'Tasks',
    filterConfig: {
      logic: 'AND',
      conditions: [
        { field: 'updatedAt', operator: '>', value: '$7daysAgo' },
      ],
    },
  },
  {
    id: 'tasks-completed-this-week',
    name: 'Completed This Week',
    description: 'Tasks completed this week',
    filterType: 'tasks',
    category: 'Tasks',
    filterConfig: {
      logic: 'AND',
      conditions: [
        { field: 'status', operator: '=', value: 'completed' },
        { field: 'completedAt', operator: '>', value: '$weekStart' },
      ],
    },
  },
  
  // User filters
  {
    id: 'users-active-members',
    name: 'Active Members',
    description: 'Users with active status',
    filterType: 'users',
    category: 'Users',
    filterConfig: {
      logic: 'AND',
      conditions: [
        { field: 'status', operator: '=', value: 'active' },
        { field: 'role', operator: '!=', value: 'guest' },
      ],
    },
  },
  
  // Message filters
  {
    id: 'messages-unread',
    name: 'Unread Messages',
    description: 'Messages I haven\'t read yet',
    filterType: 'messages',
    category: 'Messages',
    filterConfig: {
      logic: 'AND',
      conditions: [
        { field: 'isRead', operator: '=', value: false },
      ],
    },
  },
  {
    id: 'messages-with-attachments',
    name: 'With Attachments',
    description: 'Messages that have file attachments',
    filterType: 'messages',
    category: 'Messages',
    filterConfig: {
      logic: 'AND',
      conditions: [
        { field: 'hasAttachments', operator: '=', value: true },
      ],
    },
  },
];

// ===================================
// CRUD OPERATIONS
// ===================================

/**
 * Get all saved filters for a user
 */
export async function getSavedFilters(
  workspaceId: string,
  userId: string,
  filterType?: string
): Promise<SavedFilter[]> {
  const db = getDatabase();
  logger.info(`Fetching saved filters for user ${userId} in workspace: ${workspaceId}`);

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  let filters = (workspace.settings as any)?.savedFilters || [];
  
  // Filter by user or public filters
  filters = filters.filter((f: SavedFilter) => 
    f.userId === userId || f.isPublic
  );

  // Filter by type if specified
  if (filterType) {
    filters = filters.filter((f: SavedFilter) => f.filterType === filterType);
  }

  // Sort by pinned, then usage count, then last used
  filters.sort((a: SavedFilter, b: SavedFilter) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    if (a.usageCount !== b.usageCount) return b.usageCount - a.usageCount;
    if (a.lastUsed && b.lastUsed) {
      return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
    }
    return 0;
  });

  return filters;
}

/**
 * Get a single saved filter
 */
export async function getSavedFilter(
  workspaceId: string,
  userId: string,
  filterId: string
): Promise<SavedFilter | null> {
  const filters = await getSavedFilters(workspaceId, userId);
  const filter = filters.find(f => f.id === filterId);
  
  if (!filter) {
    return null;
  }

  // Check access
  if (filter.userId !== userId && !filter.isPublic) {
    throw new Error("Access denied");
  }

  return filter;
}

/**
 * Create a new saved filter
 */
export async function createSavedFilter(
  workspaceId: string,
  userId: string,
  filterData: {
    name: string;
    description?: string;
    filterType: 'projects' | 'tasks' | 'users' | 'messages' | 'files';
    filterConfig: FilterGroup;
    isPinned?: boolean;
    isPublic?: boolean;
  }
): Promise<SavedFilter> {
  const db = getDatabase();
  logger.info(`Creating saved filter for user ${userId} in workspace: ${workspaceId}`);

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const newFilter: SavedFilter = {
    id: createId(),
    workspaceId,
    userId,
    name: filterData.name,
    description: filterData.description,
    filterType: filterData.filterType,
    filterConfig: filterData.filterConfig,
    isPinned: filterData.isPinned || false,
    isPublic: filterData.isPublic || false,
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const existingFilters = (workspace.settings as any)?.savedFilters || [];
  const updatedFilters = [...existingFilters, newFilter];

  await db
    .update(workspaces)
    .set({
      settings: {
        ...(workspace.settings as any),
        savedFilters: updatedFilters,
      },
    })
    .where(eq(workspaces.id, workspaceId));

  logger.info(`Saved filter created: ${newFilter.id}`);
  return newFilter;
}

/**
 * Update a saved filter
 */
export async function updateSavedFilter(
  workspaceId: string,
  userId: string,
  filterId: string,
  updates: Partial<Omit<SavedFilter, 'id' | 'workspaceId' | 'userId' | 'createdAt' | 'usageCount'>>
): Promise<SavedFilter> {
  const db = getDatabase();
  logger.info(`Updating saved filter: ${filterId}`);

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const existingFilters = (workspace.settings as any)?.savedFilters || [];
  const filterIndex = existingFilters.findIndex((f: SavedFilter) => f.id === filterId);

  if (filterIndex === -1) {
    throw new Error("Filter not found");
  }

  // Check ownership
  if (existingFilters[filterIndex].userId !== userId) {
    throw new Error("Access denied");
  }

  const updatedFilter = {
    ...existingFilters[filterIndex],
    ...updates,
    updatedAt: new Date(),
  };

  existingFilters[filterIndex] = updatedFilter;

  await db
    .update(workspaces)
    .set({
      settings: {
        ...(workspace.settings as any),
        savedFilters: existingFilters,
      },
    })
    .where(eq(workspaces.id, workspaceId));

  logger.info(`Saved filter updated: ${filterId}`);
  return updatedFilter;
}

/**
 * Delete a saved filter
 */
export async function deleteSavedFilter(
  workspaceId: string,
  userId: string,
  filterId: string
): Promise<void> {
  const db = getDatabase();
  logger.info(`Deleting saved filter: ${filterId}`);

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const existingFilters = (workspace.settings as any)?.savedFilters || [];
  const filter = existingFilters.find((f: SavedFilter) => f.id === filterId);

  if (!filter) {
    throw new Error("Filter not found");
  }

  // Check ownership
  if (filter.userId !== userId) {
    throw new Error("Access denied");
  }

  const updatedFilters = existingFilters.filter((f: SavedFilter) => f.id !== filterId);

  await db
    .update(workspaces)
    .set({
      settings: {
        ...(workspace.settings as any),
        savedFilters: updatedFilters,
      },
    })
    .where(eq(workspaces.id, workspaceId));

  logger.info(`Saved filter deleted: ${filterId}`);
}

/**
 * Clone a saved filter
 */
export async function cloneSavedFilter(
  workspaceId: string,
  userId: string,
  filterId: string,
  newName: string
): Promise<SavedFilter> {
  const originalFilter = await getSavedFilter(workspaceId, userId, filterId);
  
  if (!originalFilter) {
    throw new Error("Filter not found");
  }

  return createSavedFilter(workspaceId, userId, {
    name: newName,
    description: `Clone of ${originalFilter.name}`,
    filterType: originalFilter.filterType,
    filterConfig: originalFilter.filterConfig,
    isPinned: false,
    isPublic: false,
  });
}

/**
 * Record filter usage
 */
export async function recordFilterUsage(
  workspaceId: string,
  userId: string,
  filterId: string
): Promise<void> {
  const db = getDatabase();
  logger.info(`Recording usage for filter: ${filterId}`);

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const existingFilters = (workspace.settings as any)?.savedFilters || [];
  const filterIndex = existingFilters.findIndex((f: SavedFilter) => f.id === filterId);

  if (filterIndex === -1) {
    return; // Silently fail if filter not found
  }

  existingFilters[filterIndex].usageCount = (existingFilters[filterIndex].usageCount || 0) + 1;
  existingFilters[filterIndex].lastUsed = new Date();

  await db
    .update(workspaces)
    .set({
      settings: {
        ...(workspace.settings as any),
        savedFilters: existingFilters,
      },
    })
    .where(eq(workspaces.id, workspaceId));

  logger.info(`Filter usage recorded: ${filterId}`);
}

/**
 * Get filter templates
 */
export function getFilterTemplates(filterType?: string): FilterTemplate[] {
  if (filterType) {
    return FILTER_TEMPLATES.filter(t => t.filterType === filterType);
  }
  return FILTER_TEMPLATES;
}


