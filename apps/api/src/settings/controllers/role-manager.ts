/**
 * Role Manager Controller
 * Handles custom role creation, permissions, and role templates
 */

import { eq, and } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { workspaceTable, roleAssignmentTable, customPermissionTable } from "../../database/schema";
import { createId } from "@paralleldrive/cuid2";

// Standard permissions grouped by category
export const PERMISSION_CATEGORIES = {
  workspace: {
    name: 'Workspace Management',
    permissions: [
      { id: 'workspace.view', name: 'View workspace', description: 'View workspace information' },
      { id: 'workspace.edit', name: 'Edit workspace', description: 'Modify workspace settings' },
      { id: 'workspace.delete', name: 'Delete workspace', description: 'Delete entire workspace' },
      { id: 'workspace.settings', name: 'Manage settings', description: 'Configure workspace settings' },
    ]
  },
  projects: {
    name: 'Project Management',
    permissions: [
      { id: 'project.view', name: 'View projects', description: 'See all projects' },
      { id: 'project.create', name: 'Create projects', description: 'Create new projects' },
      { id: 'project.edit', name: 'Edit projects', description: 'Modify project details' },
      { id: 'project.delete', name: 'Delete projects', description: 'Remove projects' },
      { id: 'project.archive', name: 'Archive projects', description: 'Archive/unarchive projects' },
    ]
  },
  tasks: {
    name: 'Task Management',
    permissions: [
      { id: 'task.view', name: 'View tasks', description: 'See all tasks' },
      { id: 'task.create', name: 'Create tasks', description: 'Add new tasks' },
      { id: 'task.edit', name: 'Edit tasks', description: 'Modify task details' },
      { id: 'task.delete', name: 'Delete tasks', description: 'Remove tasks' },
      { id: 'task.assign', name: 'Assign tasks', description: 'Assign tasks to users' },
      { id: 'task.status', name: 'Update status', description: 'Change task status' },
    ]
  },
  users: {
    name: 'User Management',
    permissions: [
      { id: 'user.view', name: 'View users', description: 'See user list' },
      { id: 'user.invite', name: 'Invite users', description: 'Send invitations' },
      { id: 'user.edit', name: 'Edit users', description: 'Modify user details' },
      { id: 'user.remove', name: 'Remove users', description: 'Remove users from workspace' },
      { id: 'user.roles', name: 'Manage roles', description: 'Assign and change user roles' },
    ]
  },
  files: {
    name: 'File Management',
    permissions: [
      { id: 'file.view', name: 'View files', description: 'Access files' },
      { id: 'file.upload', name: 'Upload files', description: 'Add new files' },
      { id: 'file.download', name: 'Download files', description: 'Download files' },
      { id: 'file.delete', name: 'Delete files', description: 'Remove files' },
      { id: 'file.share', name: 'Share files', description: 'Share files with others' },
    ]
  },
  reports: {
    name: 'Reports & Analytics',
    permissions: [
      { id: 'report.view', name: 'View reports', description: 'Access analytics and reports' },
      { id: 'report.export', name: 'Export reports', description: 'Download report data' },
      { id: 'report.create', name: 'Create reports', description: 'Build custom reports' },
    ]
  },
  settings: {
    name: 'Settings',
    permissions: [
      { id: 'settings.view', name: 'View settings', description: 'Access settings pages' },
      { id: 'settings.edit', name: 'Edit settings', description: 'Modify settings' },
      { id: 'settings.integrations', name: 'Manage integrations', description: 'Configure integrations' },
      { id: 'settings.billing', name: 'Manage billing', description: 'Access billing and payments' },
    ]
  }
};

// Predefined role templates
export const ROLE_TEMPLATES = {
  viewer: {
    name: 'Viewer',
    description: 'Read-only access to workspace content',
    permissions: [
      'workspace.view',
      'project.view',
      'task.view',
      'file.view',
      'report.view',
    ],
    color: '#6B7280'
  },
  contributor: {
    name: 'Contributor',
    description: 'Can create and edit content',
    permissions: [
      'workspace.view',
      'project.view',
      'project.create',
      'task.view',
      'task.create',
      'task.edit',
      'task.status',
      'file.view',
      'file.upload',
      'file.download',
      'report.view',
    ],
    color: '#3B82F6'
  },
  manager: {
    name: 'Manager',
    description: 'Full project and team management',
    permissions: [
      'workspace.view',
      'workspace.settings',
      'project.view',
      'project.create',
      'project.edit',
      'project.delete',
      'project.archive',
      'task.view',
      'task.create',
      'task.edit',
      'task.delete',
      'task.assign',
      'task.status',
      'user.view',
      'user.invite',
      'user.roles',
      'file.view',
      'file.upload',
      'file.download',
      'file.delete',
      'file.share',
      'report.view',
      'report.export',
      'report.create',
      'settings.view',
    ],
    color: '#8B5CF6'
  },
  administrator: {
    name: 'Administrator',
    description: 'Complete workspace control',
    permissions: Object.values(PERMISSION_CATEGORIES).flatMap(
      category => category.permissions.map(p => p.id)
    ),
    color: '#EF4444'
  }
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

// Get all roles for workspace (custom + predefined)
export async function getRoles(workspaceId: string): Promise<CustomRole[]> {
  const db = getDatabase();
  
  // Get custom roles from database
  const customRoles = await db
    .select()
    .from(customPermissionTable)
    .where(eq(customPermissionTable.workspaceId, workspaceId));
  
  // Get user counts for each role
  const userCounts = await db
    .select({
      role: roleAssignmentTable.role,
      count: db.$count(roleAssignmentTable.role)
    })
    .from(roleAssignmentTable)
    .where(eq(roleAssignmentTable.workspaceId, workspaceId))
    .groupBy(roleAssignmentTable.role);
  
  const countMap = userCounts.reduce((acc, { role, count }) => {
    acc[role] = count;
    return acc;
  }, {} as Record<string, number>);
  
  // Map custom roles
  const customRolesMapped: CustomRole[] = customRoles.map(role => ({
    id: role.id,
    workspaceId: role.workspaceId,
    name: role.roleName,
    description: role.description || '',
    permissions: role.permissions as string[],
    color: role.color || '#3B82F6',
    isCustom: true,
    userCount: countMap[role.roleName] || 0,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt || role.createdAt,
  }));
  
  // Add predefined roles
  const predefinedRoles: CustomRole[] = Object.entries(ROLE_TEMPLATES).map(([key, template]) => ({
    id: `template_${key}`,
    workspaceId: workspaceId,
    name: template.name,
    description: template.description,
    permissions: template.permissions,
    color: template.color,
    isCustom: false,
    basedOn: key,
    userCount: countMap[template.name.toLowerCase()] || 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
  
  return [...customRolesMapped, ...predefinedRoles];
}

// Get single role
export async function getRole(workspaceId: string, roleId: string): Promise<CustomRole | null> {
  // Check if it's a template
  if (roleId.startsWith('template_')) {
    const templateKey = roleId.replace('template_', '');
    const template = (ROLE_TEMPLATES as any)[templateKey];
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
  
  // Get custom role
  const db = getDatabase();
  const [role] = await db
    .select()
    .from(customPermissionTable)
    .where(and(
      eq(customPermissionTable.id, roleId),
      eq(customPermissionTable.workspaceId, workspaceId)
    ))
    .limit(1);
  
  if (!role) return null;
  
  return {
    id: role.id,
    workspaceId: role.workspaceId,
    name: role.roleName,
    description: role.description || '',
    permissions: role.permissions as string[],
    color: role.color || '#3B82F6',
    isCustom: true,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt || role.createdAt,
  };
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
  }
): Promise<CustomRole> {
  const db = getDatabase();
  
  const id = createId();
  const now = new Date();
  
  const [newRole] = await db
    .insert(customPermissionTable)
    .values({
      id,
      workspaceId,
      roleName: data.name,
      description: data.description,
      permissions: data.permissions,
      color: data.color || '#3B82F6',
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  
  return {
    id: newRole.id,
    workspaceId: newRole.workspaceId,
    name: newRole.roleName,
    description: newRole.description || '',
    permissions: newRole.permissions as string[],
    color: newRole.color || '#3B82F6',
    isCustom: true,
    basedOn: data.basedOn,
    createdAt: newRole.createdAt,
    updatedAt: newRole.updatedAt || newRole.createdAt,
  };
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
  }>
): Promise<CustomRole> {
  const db = getDatabase();
  
  const [updated] = await db
    .update(customPermissionTable)
    .set({
      roleName: data.name,
      description: data.description,
      permissions: data.permissions,
      color: data.color,
      updatedAt: new Date(),
    })
    .where(and(
      eq(customPermissionTable.id, roleId),
      eq(customPermissionTable.workspaceId, workspaceId)
    ))
    .returning();
  
  if (!updated) {
    throw new Error('Role not found or not authorized');
  }
  
  return {
    id: updated.id,
    workspaceId: updated.workspaceId,
    name: updated.roleName,
    description: updated.description || '',
    permissions: updated.permissions as string[],
    color: updated.color || '#3B82F6',
    isCustom: true,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt || updated.createdAt,
  };
}

// Delete custom role
export async function deleteRole(workspaceId: string, roleId: string): Promise<void> {
  const db = getDatabase();
  
  // Check if role is being used
  const usersWithRole = await db
    .select()
    .from(roleAssignmentTable)
    .where(and(
      eq(roleAssignmentTable.workspaceId, workspaceId),
      eq(roleAssignmentTable.roleId, roleId)
    ))
    .limit(1);
  
  if (usersWithRole.length > 0) {
    throw new Error('Cannot delete role that is currently assigned to users');
  }
  
  await db
    .delete(customPermissionTable)
    .where(and(
      eq(customPermissionTable.id, roleId),
      eq(customPermissionTable.workspaceId, workspaceId)
    ));
}

// Clone role from template
export async function cloneRole(
  workspaceId: string,
  sourceRoleId: string,
  newName: string
): Promise<CustomRole> {
  const sourceRole = await getRole(workspaceId, sourceRoleId);
  
  if (!sourceRole) {
    throw new Error('Source role not found');
  }
  
  return createRole(workspaceId, {
    name: newName,
    description: `Based on ${sourceRole.name}`,
    permissions: sourceRole.permissions,
    color: sourceRole.color,
    basedOn: sourceRole.isCustom ? undefined : sourceRole.basedOn,
  });
}

// Get all available permissions
export function getAllPermissions() {
  return PERMISSION_CATEGORIES;
}

// Get role templates
export function getRoleTemplates() {
  return ROLE_TEMPLATES;
}


