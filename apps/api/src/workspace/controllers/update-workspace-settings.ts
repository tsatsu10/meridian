/**
 * Update Workspace Settings Controller
 * Updates workspace configuration with validation
 */

import { eq, and } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import {
  workspaceTable,
  workspaceMembers,
  userTable,
} from "../../database/schema";
import { ForbiddenError, NotFoundError } from "../../core/ErrorHandler";

/**
 * Roles allowed to edit workspace settings, besides the workspace owner.
 *
 * The check here used to be `role !== "admin" && role !== "manager"`, which
 * did not match the roles this app actually stores. `workspace_members.role`
 * holds: admin, member, workspace-manager, guest, project-manager, team-lead,
 * project-viewer, department-head — and bare "manager" appears nowhere at all.
 * So `workspace-manager`, the top of ROLE_HIERARCHY (10, "OWNER LEVEL"), was
 * rejected while the lower legacy `admin` passed, and any workspace-manager
 * who did not also happen to own the workspace could not edit its settings.
 *
 * `admin` and `manager` are kept because they are legacy values already in the
 * data (29 `admin` rows) that the previous check admitted; dropping them here
 * would revoke access people currently have.
 */
const WORKSPACE_SETTINGS_ROLES = new Set([
  "workspace-manager",
  "admin",
  "manager",
]);

export interface UpdateWorkspaceSettingsInput {
  // Basic Info
  name?: string;
  description?: string;
  slug?: string;

  // Member Settings
  allowMemberInvites?: boolean;
  requireAdminApproval?: boolean;
  enableGuestAccess?: boolean;
  autoRemoveInactive?: boolean;
  inactivityDays?: number;
  maxMembers?: number | null;

  // Project Defaults
  defaultProjectVisibility?: "private" | "team" | "workspace";
  defaultTaskPriority?: "low" | "medium" | "high" | "urgent";
  enableTimeTracking?: boolean;
  requireTaskApproval?: boolean;

  // Workspace Preferences
  workingDays?: string[];
  workingHoursStart?: string;
  workingHoursEnd?: string;
  timezone?: string;
  dateFormat?: string;
  timeFormat?: "12h" | "24h";

  // Feature Flags
  enableAutomation?: boolean;
  enableCalendar?: boolean;
  enableMessaging?: boolean;
  enableAnalytics?: boolean;

  // Branding
  primaryColor?: string;
  accentColor?: string;
  customDomain?: string | null;
}

export default async function updateWorkspaceSettings(
  userEmail: string,
  workspaceId: string,
  updates: UpdateWorkspaceSettingsInput,
) {
  const db = getDatabase();

  // Verify user is workspace owner or admin
  const [membership] = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userEmail, userEmail),
      ),
    )
    .limit(1);

  if (!membership) {
    throw new ForbiddenError("Access denied: Not a workspace member");
  }

  // `role` is nullable; a member without one is not privileged and falls
  // through to the owner check below, as it did before.
  if (!membership.role || !WORKSPACE_SETTINGS_ROLES.has(membership.role)) {
    // Check if user is workspace owner
    const [workspace] = await db
      .select()
      .from(workspaceTable)
      .where(eq(workspaceTable.id, workspaceId))
      .limit(1);

    if (!workspace) {
      throw new NotFoundError("Workspace", workspaceId);
    }

    const [owner] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, userEmail))
      .limit(1);

    if (!owner || workspace.ownerId !== owner.id) {
      throw new ForbiddenError(
        "Access denied: Only workspace owners or admins can update settings",
      );
    }
  }

  // Separate basic fields from settings
  const basicUpdates: Record<string, unknown> = {};
  const settingsUpdates: Record<string, unknown> = {};

  // Basic fields that go directly to workspace table
  if (updates.name !== undefined) basicUpdates.name = updates.name;
  if (updates.description !== undefined)
    basicUpdates.description = updates.description;
  if (updates.slug !== undefined) basicUpdates.slug = updates.slug;

  // Everything else goes to settings JSONB
  const settingsFields = [
    "allowMemberInvites",
    "requireAdminApproval",
    "enableGuestAccess",
    "autoRemoveInactive",
    "inactivityDays",
    "maxMembers",
    "defaultProjectVisibility",
    "defaultTaskPriority",
    "enableTimeTracking",
    "requireTaskApproval",
    "workingDays",
    "workingHoursStart",
    "workingHoursEnd",
    "timezone",
    "dateFormat",
    "timeFormat",
    "enableAutomation",
    "enableCalendar",
    "enableMessaging",
    "enableAnalytics",
    "primaryColor",
    "accentColor",
    "customDomain",
  ];

  for (const field of settingsFields) {
    if (updates[field as keyof UpdateWorkspaceSettingsInput] !== undefined) {
      settingsUpdates[field] =
        updates[field as keyof UpdateWorkspaceSettingsInput];
    }
  }

  // Get current workspace to merge settings
  const [currentWorkspace] = await db
    .select()
    .from(workspaceTable)
    .where(eq(workspaceTable.id, workspaceId))
    .limit(1);

  if (!currentWorkspace) {
    throw new Error("Workspace not found");
  }

  const currentSettings =
    (currentWorkspace.settings as Record<string, unknown>) || {};
  const mergedSettings = { ...currentSettings, ...settingsUpdates };

  // Update workspace
  const [updatedWorkspace] = await db
    .update(workspaceTable)
    .set({
      ...basicUpdates,
      ...(Object.keys(settingsUpdates).length > 0
        ? { settings: mergedSettings }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(workspaceTable.id, workspaceId))
    .returning();

  return updatedWorkspace;
}
