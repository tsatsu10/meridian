/**
 * Role Manager Controller
 * Handles custom role creation, permissions, and role templates
 */

import { eq, sql } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { workspaceTable, roleAssignmentTable } from "../../database/schema";

// Standard permissions grouped by category
export const PERMISSION_CATEGORIES = {
  workspace: {
    name: "Workspace Management",
    permissions: [
      {
        id: "workspace.view",
        name: "View workspace",
        description: "View workspace information",
      },
      {
        id: "workspace.edit",
        name: "Edit workspace",
        description: "Modify workspace settings",
      },
      {
        id: "workspace.delete",
        name: "Delete workspace",
        description: "Delete entire workspace",
      },
      {
        id: "workspace.settings",
        name: "Manage settings",
        description: "Configure workspace settings",
      },
    ],
  },
  projects: {
    name: "Project Management",
    permissions: [
      {
        id: "project.view",
        name: "View projects",
        description: "See all projects",
      },
      {
        id: "project.create",
        name: "Create projects",
        description: "Create new projects",
      },
      {
        id: "project.edit",
        name: "Edit projects",
        description: "Modify project details",
      },
      {
        id: "project.delete",
        name: "Delete projects",
        description: "Remove projects",
      },
      {
        id: "project.archive",
        name: "Archive projects",
        description: "Archive/unarchive projects",
      },
    ],
  },
  tasks: {
    name: "Task Management",
    permissions: [
      { id: "task.view", name: "View tasks", description: "See all tasks" },
      { id: "task.create", name: "Create tasks", description: "Add new tasks" },
      {
        id: "task.edit",
        name: "Edit tasks",
        description: "Modify task details",
      },
      { id: "task.delete", name: "Delete tasks", description: "Remove tasks" },
      {
        id: "task.assign",
        name: "Assign tasks",
        description: "Assign tasks to users",
      },
      {
        id: "task.status",
        name: "Update status",
        description: "Change task status",
      },
    ],
  },
  users: {
    name: "User Management",
    permissions: [
      { id: "user.view", name: "View users", description: "See user list" },
      {
        id: "user.invite",
        name: "Invite users",
        description: "Send invitations",
      },
      {
        id: "user.edit",
        name: "Edit users",
        description: "Modify user details",
      },
      {
        id: "user.remove",
        name: "Remove users",
        description: "Remove users from workspace",
      },
      {
        id: "user.roles",
        name: "Manage roles",
        description: "Assign and change user roles",
      },
    ],
  },
  files: {
    name: "File Management",
    permissions: [
      { id: "file.view", name: "View files", description: "Access files" },
      { id: "file.upload", name: "Upload files", description: "Add new files" },
      {
        id: "file.download",
        name: "Download files",
        description: "Download files",
      },
      { id: "file.delete", name: "Delete files", description: "Remove files" },
      {
        id: "file.share",
        name: "Share files",
        description: "Share files with others",
      },
    ],
  },
  reports: {
    name: "Reports & Analytics",
    permissions: [
      {
        id: "report.view",
        name: "View reports",
        description: "Access analytics and reports",
      },
      {
        id: "report.export",
        name: "Export reports",
        description: "Download report data",
      },
      {
        id: "report.create",
        name: "Create reports",
        description: "Build custom reports",
      },
    ],
  },
  settings: {
    name: "Settings",
    permissions: [
      {
        id: "settings.view",
        name: "View settings",
        description: "Access settings pages",
      },
      {
        id: "settings.edit",
        name: "Edit settings",
        description: "Modify settings",
      },
      {
        id: "settings.integrations",
        name: "Manage integrations",
        description: "Configure integrations",
      },
      {
        id: "settings.billing",
        name: "Manage billing",
        description: "Access billing and payments",
      },
    ],
  },
};

// Predefined role templates
export const ROLE_TEMPLATES = {
  viewer: {
    name: "Viewer",
    description: "Read-only access to workspace content",
    permissions: [
      "workspace.view",
      "project.view",
      "task.view",
      "file.view",
      "report.view",
    ],
    color: "#6B7280",
  },
  contributor: {
    name: "Contributor",
    description: "Can create and edit content",
    permissions: [
      "workspace.view",
      "project.view",
      "project.create",
      "task.view",
      "task.create",
      "task.edit",
      "task.status",
      "file.view",
      "file.upload",
      "file.download",
      "report.view",
    ],
    color: "#3B82F6",
  },
  manager: {
    name: "Manager",
    description: "Full project and team management",
    permissions: [
      "workspace.view",
      "workspace.settings",
      "project.view",
      "project.create",
      "project.edit",
      "project.delete",
      "project.archive",
      "task.view",
      "task.create",
      "task.edit",
      "task.delete",
      "task.assign",
      "task.status",
      "user.view",
      "user.invite",
      "user.roles",
      "file.view",
      "file.upload",
      "file.download",
      "file.delete",
      "file.share",
      "report.view",
      "report.export",
      "report.create",
      "settings.view",
    ],
    color: "#8B5CF6",
  },
  administrator: {
    name: "Administrator",
    description: "Complete workspace control",
    permissions: Object.values(PERMISSION_CATEGORIES).flatMap((category) =>
      category.permissions.map((p) => p.id),
    ),
    color: "#EF4444",
  },
};

export interface CustomRole {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  permissions: string[];
  color: string;
  isCustom: boolean;
  basedOn?: string; // Template ID this role was based on
  userCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

// NOTE: there is no custom-roles table in the schema (custom_permissions holds
// per-user permission grants, not role definitions), so only the predefined
// role templates exist. A previous revision mapped custom_permissions rows as
// role definitions using columns that don't exist — it could never have worked.
const CUSTOM_ROLES_UNSUPPORTED =
  "Custom roles are not supported: the schema has no custom-roles table";

// Get all roles for workspace (predefined templates with usage counts)
export async function getRoles(workspaceId: string): Promise<CustomRole[]> {
  const db = getDatabase();

  // Get user counts for each role
  const userCounts = await db
    .select({
      role: roleAssignmentTable.role,
      count: sql<number>`count(*)`,
    })
    .from(roleAssignmentTable)
    .where(eq(roleAssignmentTable.workspaceId, workspaceId))
    .groupBy(roleAssignmentTable.role);

  const countMap = userCounts.reduce(
    (acc, { role, count }) => {
      acc[role] = Number(count);
      return acc;
    },
    {} as Record<string, number>,
  );

  // Predefined roles only — see CUSTOM_ROLES_UNSUPPORTED above
  const predefinedRoles: CustomRole[] = Object.entries(ROLE_TEMPLATES).map(
    ([key, template]) => ({
      id: `template_${key}`,
      workspaceId: workspaceId,
      name: template.name,
      description: template.description,
      permissions: template.permissions,
      color: template.color,
      isCustom: false,
      basedOn: key,
      userCount: countMap[key] ?? countMap[template.name.toLowerCase()] ?? 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  );

  return predefinedRoles;
}

// Get single role
export async function getRole(
  workspaceId: string,
  roleId: string,
): Promise<CustomRole | null> {
  // Check if it's a template
  if (roleId.startsWith("template_")) {
    const templateKey = roleId.replace("template_", "");
    const template = ROLE_TEMPLATES[templateKey as keyof typeof ROLE_TEMPLATES];
    if (template) {
      return {
        id: roleId,
        workspaceId,
        name: template.name,
        description: template.description,
        permissions: template.permissions,
        color: template.color,
        isCustom: false,
        basedOn: templateKey,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }

  // No custom-roles storage exists — see CUSTOM_ROLES_UNSUPPORTED
  return null;
}

// Create custom role
export async function createRole(
  workspaceId: string,
  data: {
    name: string;
    description: string;
    permissions: string[];
    color?: string;
    basedOn?: string;
  },
): Promise<CustomRole> {
  throw new Error(CUSTOM_ROLES_UNSUPPORTED);
}

// Update custom role
export async function updateRole(
  workspaceId: string,
  roleId: string,
  data: Partial<{
    name: string;
    description: string;
    permissions: string[];
    color: string;
  }>,
): Promise<CustomRole> {
  throw new Error(CUSTOM_ROLES_UNSUPPORTED);
}

// Delete custom role
export async function deleteRole(
  workspaceId: string,
  roleId: string,
): Promise<void> {
  throw new Error(CUSTOM_ROLES_UNSUPPORTED);
}

// Clone role from template
export async function cloneRole(
  workspaceId: string,
  sourceRoleId: string,
  newName: string,
): Promise<CustomRole> {
  throw new Error(CUSTOM_ROLES_UNSUPPORTED);
}

// Get all available permissions
export function getAllPermissions() {
  return PERMISSION_CATEGORIES;
}

// Get role templates
export function getRoleTemplates() {
  return ROLE_TEMPLATES;
}
