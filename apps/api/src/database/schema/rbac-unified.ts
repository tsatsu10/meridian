/**
 * 🛡️ Unified RBAC Schema
 * 
 * Complete schema for unified role-based access control system.
 * Supports both system roles (built-in) and custom roles (user-defined).
 * 
 * @epic RBAC-Unification
 * @phase Phase-1
 */

import { pgTable, text, json, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users, workspaceTable } from "../schema";

// ==========================================
// UNIFIED ROLES TABLE
// ==========================================

/**
 * Roles Table - Unified for both system and custom roles
 * 
 * System roles (type='system'):
 * - Pre-defined roles like 'workspace-manager', 'team-lead', 'member'
 * - Permissions loaded from ROLE_PERMISSIONS constant
 * - Cannot be deleted
 * - workspace_id is NULL (global)
 * 
 * Custom roles (type='custom'):
 * - User-created roles specific to an organization
 * - Permissions stored in database
 * - Can be edited and deleted
 * - workspace_id links to specific workspace
 */
export const roles = pgTable("roles", {
  // Primary Key
  id: text("id")
    .$defaultFn(() => createId())
    .primaryKey(),
  
  // Basic Information
  name: text("name")
    .notNull(),
  
  description: text("description"),
  
  // Role Type
  type: text("type", { enum: ["system", "custom"] })
    .notNull()
    .default("custom"),
  
  // Permissions
  // For system roles: NULL (use ROLE_PERMISSIONS constant)
  // For custom roles: Array of permission strings
  permissions: json("permissions")
    .$type<string[]>(),
  
  // Role Inheritance
  // Custom roles can inherit from templates or other roles
  baseRoleId: text("base_role_id")
    .references(() => roles.id, { onDelete: "set null" }),
  
  // Visual Customization
  color: text("color")
    .default("#3B82F6"), // Default blue
  
  icon: text("icon"), // Optional icon identifier
  
  // Workspace Context
  // NULL for system roles (global)
  // Set for custom roles (workspace-specific)
  workspaceId: text("workspace_id")
    .references(() => workspaceTable.id, { onDelete: "cascade" }),
  
  // Metadata
  createdBy: text("created_by")
    .references(() => users.id, { onDelete: "set null" }),
  
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  
  // Usage Statistics
  usersCount: integer("users_count")
    .default(0)
    .notNull(),
  
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  
  // Status
  isActive: boolean("is_active")
    .default(true)
    .notNull(),
  
  // Soft Delete
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  
  deletedBy: text("deleted_by")
    .references(() => users.id, { onDelete: "set null" }),
});

// ==========================================
// ROLE ASSIGNMENTS TABLE
// ==========================================

/**
 * Role Assignments - Links users to roles
 * 
 * Unified assignment table that works for both system and custom roles.
 * Supports context-specific scoping (workspace, project, department).
 */
export const roleAssignments = pgTable("role_assignments", {
  // Primary Key
  id: text("id")
    .$defaultFn(() => createId())
    .primaryKey(),
  
  // User and Role
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  
  roleId: text("role_id")
    .notNull()
    .references(() => roles.id, { onDelete: "cascade" }),
  
  // Context Scoping
  workspaceId: text("workspace_id")
    .references(() => workspaceTable.id, { onDelete: "cascade" }),
  
  // Optional: Limit role to specific projects
  projectIds: json("project_ids")
    .$type<string[]>(),
  
  // Optional: Limit role to specific departments
  departmentIds: json("department_ids")
    .$type<string[]>(),
  
  // Assignment Metadata
  assignedBy: text("assigned_by")
    .notNull()
    .references(() => users.id, { onDelete: "set null" }),
  
  assignedAt: timestamp("assigned_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  
  // Optional Expiration
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  
  // Reason for Assignment (audit trail)
  reason: text("reason"),
  
  // Additional Notes
  notes: text("notes"),
  
  // Status
  isActive: boolean("is_active")
    .default(true)
    .notNull(),
  
  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ==========================================
// PERMISSION OVERRIDES TABLE
// ==========================================

/**
 * Permission Overrides - Temporary or permanent permission grants/revokes
 * 
 * Allows fine-grained permission control beyond role definitions.
 * Overrides take precedence over role permissions.
 */
export const permissionOverrides = pgTable("permission_overrides", {
  // Primary Key
  id: text("id")
    .$defaultFn(() => createId())
    .primaryKey(),
  
  // User
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  
  // Permission
  permission: text("permission")
    .notNull(), // e.g., 'canDeleteProjects', 'project.delete'
  
  // Grant or Revoke
  granted: boolean("granted")
    .notNull(), // true = grant, false = revoke
  
  // Context (optional)
  workspaceId: text("workspace_id")
    .references(() => workspaceTable.id, { onDelete: "cascade" }),
  
  projectId: text("project_id"),
  
  resourceType: text("resource_type"), // 'project', 'task', 'file', etc.
  
  resourceId: text("resource_id"),
  
  // Metadata
  reason: text("reason"),
  
  grantedBy: text("granted_by")
    .notNull()
    .references(() => users.id, { onDelete: "set null" }),
  
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  
  // Optional Expiration
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  
  // Status
  isActive: boolean("is_active")
    .default(true)
    .notNull(),
});

// ==========================================
// ROLE AUDIT LOG TABLE
// ==========================================

/**
 * Role Audit Log - Complete history of role-related changes
 * 
 * Tracks all role and permission changes for compliance and debugging.
 */
export const roleAuditLog = pgTable("role_audit_log", {
  // Primary Key
  id: text("id")
    .$defaultFn(() => createId())
    .primaryKey(),
  
  // What Changed
  action: text("action", {
    enum: [
      "role_created",
      "role_updated",
      "role_deleted",
      "role_assigned",
      "role_removed",
      "permission_granted",
      "permission_revoked",
      "override_added",
      "override_removed",
    ],
  }).notNull(),
  
  // Entities Involved
  roleId: text("role_id")
    .references(() => roles.id, { onDelete: "set null" }),
  
  userId: text("user_id")
    .references(() => users.id, { onDelete: "set null" }),
  
  assignmentId: text("assignment_id")
    .references(() => roleAssignments.id, { onDelete: "set null" }),
  
  // Change Details
  previousValue: json("previous_value"),
  
  newValue: json("new_value"),
  
  // Metadata
  reason: text("reason"),
  
  changedBy: text("changed_by")
    .notNull()
    .references(() => users.id, { onDelete: "set null" }),
  
  workspaceId: text("workspace_id")
    .references(() => workspaceTable.id, { onDelete: "cascade" }),
  
  // Technical Details
  ipAddress: text("ip_address"),
  
  userAgent: text("user_agent"),
  
  // Timestamp
  timestamp: timestamp("timestamp", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ==========================================
// ROLE TEMPLATES TABLE
// ==========================================

/**
 * Role Templates - Pre-defined role configurations
 * 
 * Built-in and custom templates for quick role creation.
 */
export const roleTemplates = pgTable("role_templates", {
  // Primary Key
  id: text("id")
    .$defaultFn(() => createId())
    .primaryKey(),
  
  // Template Information
  name: text("name")
    .notNull(),
  
  description: text("description"),
  
  // Template Type
  type: text("type", { enum: ["system", "custom"] })
    .notNull()
    .default("custom"),
  
  // Template Configuration
  permissions: json("permissions")
    .$type<string[]>()
    .notNull(),
  
  // Visual
  color: text("color")
    .default("#3B82F6"),
  
  icon: text("icon"),
  
  // Category
  category: text("category"), // 'viewer', 'contributor', 'manager', 'admin'
  
  // Usage
  usageCount: integer("usage_count")
    .default(0)
    .notNull(),
  
  // Workspace Context
  workspaceId: text("workspace_id")
    .references(() => workspaceTable.id, { onDelete: "cascade" }),
  
  // Metadata
  createdBy: text("created_by")
    .references(() => users.id, { onDelete: "set null" }),
  
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  
  // Status
  isActive: boolean("is_active")
    .default(true)
    .notNull(),
});

// ==========================================
// TYPE EXPORTS
// ==========================================

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;

export type RoleAssignment = typeof roleAssignments.$inferSelect;
export type NewRoleAssignment = typeof roleAssignments.$inferInsert;

export type PermissionOverride = typeof permissionOverrides.$inferSelect;
export type NewPermissionOverride = typeof permissionOverrides.$inferInsert;

export type RoleAuditLog = typeof roleAuditLog.$inferSelect;
export type NewRoleAuditLog = typeof roleAuditLog.$inferInsert;

export type RoleTemplate = typeof roleTemplates.$inferSelect;
export type NewRoleTemplate = typeof roleTemplates.$inferInsert;

// ==========================================
// MIGRATION NOTES
// ==========================================

/**
 * Migration Strategy:
 * 
 * 1. Create these tables alongside existing RBAC tables
 * 2. Seed system roles into 'roles' table
 * 3. Migrate custom roles (if any) from old tables
 * 4. Update 'role_assignments' to include 'role_id' field
 * 5. Backfill 'role_id' from existing 'role' string field
 * 6. Once verified, deprecate old 'role' field
 * 7. Update all application code to use new schema
 * 8. After grace period, remove old tables
 * 
 * Rollback Strategy:
 * 
 * 1. Keep old tables during migration period
 * 2. Dual-write to both old and new schemas
 * 3. If issues arise, switch reads back to old tables
 * 4. Fix issues in new schema
 * 5. Switch reads back to new schema
 * 6. Once stable, stop dual-write and remove old tables
 */


