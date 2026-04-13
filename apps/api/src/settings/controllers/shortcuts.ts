import { getDatabase } from "../../database/connection";
import { workspaces } from "../../database/schema";
import { eq } from "drizzle-orm";
import { logger } from "../../utils/logger";
import { createId } from "@paralleldrive/cuid2";

// ===================================
// TYPE DEFINITIONS
// ===================================

export interface KeyboardShortcut {
  id: string;
  workspaceId: string;
  userId: string; // User-specific shortcuts
  action: string; // e.g., 'navigate.dashboard', 'task.create'
  shortcutKeys: string; // e.g., 'Ctrl+Shift+D' or 'g+d'
  description?: string;
  category: string; // 'navigation', 'actions', 'editing', 'view'
  isEnabled: boolean;
  isCustom: boolean; // true if user modified from default
  createdAt: Date;
  updatedAt: Date;
}

export interface ShortcutPreset {
  id: string;
  name: string;
  description: string;
  shortcuts: Omit<KeyboardShortcut, 'id' | 'workspaceId' | 'userId' | 'isCustom' | 'createdAt' | 'updatedAt'>[];
}

// ===================================
// DEFAULT SHORTCUTS
// ===================================

export const DEFAULT_SHORTCUTS: Omit<KeyboardShortcut, 'id' | 'workspaceId' | 'userId' | 'isCustom' | 'createdAt' | 'updatedAt'>[] = [
  // Navigation
  { action: 'navigate.dashboard', shortcutKeys: 'g+d', description: 'Go to Dashboard', category: 'navigation', isEnabled: true },
  { action: 'navigate.projects', shortcutKeys: 'g+p', description: 'Go to Projects', category: 'navigation', isEnabled: true },
  { action: 'navigate.tasks', shortcutKeys: 'g+t', description: 'Go to Tasks', category: 'navigation', isEnabled: true },
  { action: 'navigate.calendar', shortcutKeys: 'g+c', description: 'Go to Calendar', category: 'navigation', isEnabled: true },
  { action: 'navigate.settings', shortcutKeys: 'g+s', description: 'Go to Settings', category: 'navigation', isEnabled: true },
  { action: 'navigate.search', shortcutKeys: '/', description: 'Open Search', category: 'navigation', isEnabled: true },
  { action: 'navigate.search.advanced', shortcutKeys: 'Ctrl+K', description: 'Advanced Search', category: 'navigation', isEnabled: true },
  
  // Actions
  { action: 'project.create', shortcutKeys: 'Ctrl+Shift+P', description: 'New Project', category: 'actions', isEnabled: true },
  { action: 'task.create', shortcutKeys: 'Ctrl+Shift+T', description: 'New Task', category: 'actions', isEnabled: true },
  { action: 'save', shortcutKeys: 'Ctrl+S', description: 'Save', category: 'actions', isEnabled: true },
  { action: 'submit', shortcutKeys: 'Ctrl+Enter', description: 'Quick Submit', category: 'actions', isEnabled: true },
  { action: 'close', shortcutKeys: 'Escape', description: 'Close Dialog', category: 'actions', isEnabled: true },
  { action: 'undo', shortcutKeys: 'Ctrl+Z', description: 'Undo', category: 'actions', isEnabled: true },
  { action: 'redo', shortcutKeys: 'Ctrl+Shift+Z', description: 'Redo', category: 'actions', isEnabled: true },
  
  // Selection
  { action: 'select.all', shortcutKeys: 'Ctrl+A', description: 'Select All', category: 'selection', isEnabled: true },
  { action: 'select.up', shortcutKeys: 'ArrowUp', description: 'Move Up', category: 'selection', isEnabled: true },
  { action: 'select.down', shortcutKeys: 'ArrowDown', description: 'Move Down', category: 'selection', isEnabled: true },
  
  // Editing
  { action: 'edit', shortcutKeys: 'e', description: 'Edit', category: 'editing', isEnabled: true },
  { action: 'delete', shortcutKeys: 'Delete', description: 'Delete', category: 'editing', isEnabled: true },
  { action: 'duplicate', shortcutKeys: 'Ctrl+D', description: 'Duplicate', category: 'editing', isEnabled: true },
  { action: 'archive', shortcutKeys: 'Ctrl+Shift+A', description: 'Archive', category: 'editing', isEnabled: true },
  
  // View
  { action: 'view.sidebar.toggle', shortcutKeys: 'Ctrl+B', description: 'Toggle Sidebar', category: 'view', isEnabled: true },
  { action: 'view.theme.toggle', shortcutKeys: 'Ctrl+Shift+D', description: 'Toggle Dark Mode', category: 'view', isEnabled: true },
  { action: 'view.fullscreen', shortcutKeys: 'F11', description: 'Full Screen', category: 'view', isEnabled: true },
  { action: 'help', shortcutKeys: '?', description: 'Show Shortcuts', category: 'view', isEnabled: true },
];

// ===================================
// SHORTCUT PRESETS
// ===================================

export const SHORTCUT_PRESETS: ShortcutPreset[] = [
  {
    id: 'default',
    name: 'Default (Meridian)',
    description: 'Standard Meridian keyboard shortcuts',
    shortcuts: DEFAULT_SHORTCUTS,
  },
  {
    id: 'vscode',
    name: 'VS Code Style',
    description: 'Shortcuts similar to Visual Studio Code',
    shortcuts: [
      ...DEFAULT_SHORTCUTS.filter(s => !['g+d', 'g+p', 'g+t', 'g+c', 'g+s'].includes(s.shortcutKeys)),
      { action: 'navigate.dashboard', shortcutKeys: 'Ctrl+1', description: 'Go to Dashboard', category: 'navigation', isEnabled: true },
      { action: 'navigate.projects', shortcutKeys: 'Ctrl+2', description: 'Go to Projects', category: 'navigation', isEnabled: true },
      { action: 'navigate.tasks', shortcutKeys: 'Ctrl+3', description: 'Go to Tasks', category: 'navigation', isEnabled: true },
    ],
  },
  {
    id: 'gmail',
    name: 'Gmail Style',
    description: 'Shortcuts similar to Gmail',
    shortcuts: DEFAULT_SHORTCUTS.map(s => {
      if (s.action === 'archive') return { ...s, shortcutKeys: 'e' };
      if (s.action === 'delete') return { ...s, shortcutKeys: '#' };
      return s;
    }),
  },
  {
    id: 'notion',
    name: 'Notion Style',
    description: 'Shortcuts similar to Notion',
    shortcuts: [
      ...DEFAULT_SHORTCUTS,
      { action: 'navigate.search', shortcutKeys: 'Ctrl+P', description: 'Quick Find', category: 'navigation', isEnabled: true },
    ],
  },
];

// ===================================
// CRUD OPERATIONS
// ===================================

/**
 * Get all shortcuts for a user in a workspace
 */
export async function getShortcuts(workspaceId: string, userId: string): Promise<KeyboardShortcut[]> {
  const db = getDatabase();
  logger.info(`Fetching shortcuts for user ${userId} in workspace: ${workspaceId}`);

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const shortcuts = (workspace.settings as any)?.shortcuts?.[userId] || [];

  // If user has no custom shortcuts, return defaults
  if (shortcuts.length === 0) {
    return DEFAULT_SHORTCUTS.map(s => ({
      id: createId(),
      workspaceId,
      userId,
      ...s,
      isCustom: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  return shortcuts;
}

/**
 * Get a single shortcut
 */
export async function getShortcut(
  workspaceId: string,
  userId: string,
  shortcutId: string
): Promise<KeyboardShortcut | null> {
  const shortcuts = await getShortcuts(workspaceId, userId);
  return shortcuts.find(s => s.id === shortcutId) || null;
}

/**
 * Create/update shortcuts for a user
 */
export async function updateShortcuts(
  workspaceId: string,
  userId: string,
  shortcuts: Partial<KeyboardShortcut>[]
): Promise<KeyboardShortcut[]> {
  const db = getDatabase();
  logger.info(`Updating shortcuts for user ${userId} in workspace: ${workspaceId}`);

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const existingShortcuts = await getShortcuts(workspaceId, userId);
  
  // Merge updates with existing shortcuts
  const updatedShortcuts = existingShortcuts.map(existing => {
    const update = shortcuts.find(s => s.action === existing.action);
    if (update) {
      return {
        ...existing,
        ...update,
        isCustom: true,
        updatedAt: new Date(),
      };
    }
    return existing;
  });

  const allShortcuts = (workspace.settings as any)?.shortcuts || {};
  allShortcuts[userId] = updatedShortcuts;

  await db
    .update(workspaces)
    .set({
      settings: {
        ...(workspace.settings as any),
        shortcuts: allShortcuts,
      },
    })
    .where(eq(workspaces.id, workspaceId));

  logger.info(`Shortcuts updated for user ${userId}`);
  return updatedShortcuts;
}

/**
 * Update a single shortcut
 */
export async function updateShortcut(
  workspaceId: string,
  userId: string,
  shortcutId: string,
  updates: Partial<Omit<KeyboardShortcut, 'id' | 'workspaceId' | 'userId' | 'createdAt'>>
): Promise<KeyboardShortcut> {
  const db = getDatabase();
  logger.info(`Updating shortcut ${shortcutId} for user ${userId}`);

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const allShortcuts = (workspace.settings as any)?.shortcuts || {};
  const userShortcuts = allShortcuts[userId] || await getShortcuts(workspaceId, userId);
  
  const shortcutIndex = userShortcuts.findIndex((s: KeyboardShortcut) => s.id === shortcutId);
  if (shortcutIndex === -1) {
    throw new Error("Shortcut not found");
  }

  userShortcuts[shortcutIndex] = {
    ...userShortcuts[shortcutIndex],
    ...updates,
    isCustom: true,
    updatedAt: new Date(),
  };

  allShortcuts[userId] = userShortcuts;

  await db
    .update(workspaces)
    .set({
      settings: {
        ...(workspace.settings as any),
        shortcuts: allShortcuts,
      },
    })
    .where(eq(workspaces.id, workspaceId));

  logger.info(`Shortcut updated: ${shortcutId}`);
  return userShortcuts[shortcutIndex];
}

/**
 * Delete a shortcut (disable it)
 */
export async function deleteShortcut(
  workspaceId: string,
  userId: string,
  shortcutId: string
): Promise<void> {
  logger.info(`Disabling shortcut ${shortcutId} for user ${userId}`);
  
  await updateShortcut(workspaceId, userId, shortcutId, { isEnabled: false });
}

/**
 * Reset shortcuts to defaults
 */
export async function resetShortcuts(workspaceId: string, userId: string): Promise<KeyboardShortcut[]> {
  const db = getDatabase();
  logger.info(`Resetting shortcuts for user ${userId} in workspace: ${workspaceId}`);

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const allShortcuts = (workspace.settings as any)?.shortcuts || {};
  delete allShortcuts[userId];

  await db
    .update(workspaces)
    .set({
      settings: {
        ...(workspace.settings as any),
        shortcuts: allShortcuts,
      },
    })
    .where(eq(workspaces.id, workspaceId));

  logger.info(`Shortcuts reset for user ${userId}`);
  
  // Return defaults
  return DEFAULT_SHORTCUTS.map(s => ({
    id: createId(),
    workspaceId,
    userId,
    ...s,
    isCustom: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

/**
 * Apply a preset to user shortcuts
 */
export async function applyPreset(
  workspaceId: string,
  userId: string,
  presetId: string
): Promise<KeyboardShortcut[]> {
  logger.info(`Applying preset ${presetId} for user ${userId}`);

  const preset = SHORTCUT_PRESETS.find(p => p.id === presetId);
  if (!preset) {
    throw new Error("Preset not found");
  }

  const shortcuts = preset.shortcuts.map(s => ({
    id: createId(),
    workspaceId,
    userId,
    ...s,
    isCustom: presetId !== 'default',
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  const db = getDatabase();
  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const allShortcuts = (workspace.settings as any)?.shortcuts || {};
  allShortcuts[userId] = shortcuts;

  await db
    .update(workspaces)
    .set({
      settings: {
        ...(workspace.settings as any),
        shortcuts: allShortcuts,
      },
    })
    .where(eq(workspaces.id, workspaceId));

  logger.info(`Preset ${presetId} applied for user ${userId}`);
  return shortcuts;
}

/**
 * Get available presets
 */
export function getPresets(): ShortcutPreset[] {
  return SHORTCUT_PRESETS;
}


