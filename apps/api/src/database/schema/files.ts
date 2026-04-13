/**
 * File Storage Database Schema
 * Tracks uploaded files, metadata, and relationships
 * Phase 0 - Day 4 Implementation
 */

import { createId } from "@paralleldrive/cuid2";
import { pgTable, text, timestamp, integer, boolean, json } from "drizzle-orm/pg-core";
import { users } from "./users";
import { workspaces, projects } from "../schema";
import { tasks } from "./tasks";

/**
 * Files Table
 * Stores all uploaded files with metadata
 */
export const files = pgTable("files", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  
  // File identification
  fileName: text("file_name").notNull(), // Safe filename used in storage
  originalName: text("original_name").notNull(), // Original filename from upload
  fileId: text("file_id").notNull().unique(), // Unique identifier
  
  // File properties
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(), // Size in bytes
  extension: text("extension"),
  
  // Storage information
  storageProvider: text("storage_provider").notNull(), // 's3', 'cloudinary', 'local'
  url: text("url").notNull(), // Public URL
  thumbnailUrl: text("thumbnail_url"), // Thumbnail URL for images
  storageKey: text("storage_key"), // S3 key or local path
  publicId: text("public_id"), // Cloudinary public ID
  
  // Security
  virusScanStatus: text("virus_scan_status").default("pending"), // 'pending', 'clean', 'infected', 'failed'
  virusScanResult: json("virus_scan_result"), // Scan details
  scannedAt: timestamp("scanned_at", { withTimezone: true }),
  
  // Relationships
  uploadedBy: text("uploaded_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: text("project_id")
    .references(() => projects.id, { onDelete: "set null" }),
  taskId: text("task_id")
    .references(() => tasks.id, { onDelete: "set null" }),
  
  // Metadata
  description: text("description"),
  tags: json("tags").$type<string[]>(),
  metadata: json("metadata").$type<Record<string, any>>(), // Additional metadata
  
  // Access control
  isPublic: boolean("is_public").default(false).notNull(),
  accessType: text("access_type").default("workspace"), // 'workspace', 'project', 'task', 'private'
  
  // Version control
  version: integer("version").default(1).notNull(),
  parentFileId: text("parent_file_id"), // For file versions
  
  // Status
  isDeleted: boolean("is_deleted").default(false).notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedBy: text("deleted_by").references(() => users.id, { onDelete: "set null" }),
  
  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * File Shares Table
 * Tracks file sharing and access permissions
 */
export const fileShares = pgTable("file_shares", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  
  // File relation
  fileId: text("file_id")
    .notNull()
    .references(() => files.id, { onDelete: "cascade" }),
  
  // Shared with
  sharedWithUserId: text("shared_with_user_id")
    .references(() => users.id, { onDelete: "cascade" }),
  sharedWithEmail: text("shared_with_email"), // For external sharing
  
  // Permissions
  canView: boolean("can_view").default(true).notNull(),
  canDownload: boolean("can_download").default(true).notNull(),
  canEdit: boolean("can_edit").default(false).notNull(),
  canDelete: boolean("can_delete").default(false).notNull(),
  
  // Share settings
  shareToken: text("share_token").unique(), // For public sharing
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  passwordProtected: boolean("password_protected").default(false).notNull(),
  passwordHash: text("password_hash"),
  
  // Tracking
  sharedBy: text("shared_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessCount: integer("access_count").default(0).notNull(),
  lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
  
  // Status
  isRevoked: boolean("is_revoked").default(false).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  
  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * File Comments Table
 * Comments and annotations on files
 */
export const fileComments = pgTable("file_comments", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  
  // File relation
  fileId: text("file_id")
    .notNull()
    .references(() => files.id, { onDelete: "cascade" }),
  
  // Comment content
  content: text("content").notNull(),
  
  // Position (for annotations on images/PDFs)
  positionX: integer("position_x"),
  positionY: integer("position_y"),
  page: integer("page"), // For multi-page documents
  
  // User relation
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  
  // Threading
  parentCommentId: text("parent_comment_id"),
  
  // Status
  isResolved: boolean("is_resolved").default(false).notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolvedBy: text("resolved_by").references(() => users.id, { onDelete: "set null" }),
  
  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * File Activity Log
 * Audit trail for file operations
 */
export const fileActivityLog = pgTable("file_activity_log", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  
  // File relation
  fileId: text("file_id")
    .notNull()
    .references(() => files.id, { onDelete: "cascade" }),
  
  // Activity details
  activityType: text("activity_type").notNull(), // 'upload', 'download', 'view', 'edit', 'delete', 'share', 'comment'
  activityDetails: json("activity_details").$type<Record<string, any>>(),
  
  // User relation
  userId: text("user_id")
    .references(() => users.id, { onDelete: "set null" }),
  
  // Metadata
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  
  // Timestamp
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * File Versions Table
 * Track file version history
 */
export const fileVersions = pgTable("file_versions", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  
  // File relation
  fileId: text("file_id")
    .notNull()
    .references(() => files.id, { onDelete: "cascade" }),
  
  // Version info
  version: integer("version").notNull(),
  fileName: text("file_name").notNull(),
  url: text("url").notNull(),
  size: integer("size").notNull(),
  
  // Change details
  changeDescription: text("change_description"),
  changedBy: text("changed_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  
  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Type exports
export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;

export type FileShare = typeof fileShares.$inferSelect;
export type NewFileShare = typeof fileShares.$inferInsert;

export type FileComment = typeof fileComments.$inferSelect;
export type NewFileComment = typeof fileComments.$inferInsert;

export type FileActivityLog = typeof fileActivityLog.$inferSelect;
export type NewFileActivityLog = typeof fileActivityLog.$inferInsert;

export type FileVersion = typeof fileVersions.$inferSelect;
export type NewFileVersion = typeof fileVersions.$inferInsert;


