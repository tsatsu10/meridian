-- =====================================================
-- RBAC Unification Migration - Part 1
-- Create Unified Roles Tables
-- =====================================================
-- Author: AI Code Assistant
-- Date: October 26, 2025
-- Phase: 1 - Database Foundation
-- =====================================================

-- =====================================================
-- ROLES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS "roles" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT NOT NULL DEFAULT 'custom' CHECK ("type" IN ('system', 'custom')),
  "permissions" JSONB,
  "base_role_id" TEXT REFERENCES "roles"("id") ON DELETE SET NULL,
  "color" TEXT DEFAULT '#3B82F6',
  "icon" TEXT,
  "workspace_id" TEXT REFERENCES "workspace"("id") ON DELETE CASCADE,
  "created_by" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "users_count" INTEGER DEFAULT 0 NOT NULL,
  "last_used_at" TIMESTAMP WITH TIME ZONE,
  "is_active" BOOLEAN DEFAULT TRUE NOT NULL,
  "deleted_at" TIMESTAMP WITH TIME ZONE,
  "deleted_by" TEXT REFERENCES "users"("id") ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_roles_type" ON "roles"("type");
CREATE INDEX IF NOT EXISTS "idx_roles_workspace_id" ON "roles"("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_roles_is_active" ON "roles"("is_active");
CREATE INDEX IF NOT EXISTS "idx_roles_created_at" ON "roles"("created_at");

-- =====================================================
-- ROLE ASSIGNMENTS TABLE (UNIFIED)
-- =====================================================

-- First, rename the old table if it exists (for rollback)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'role_assignment') THEN
    ALTER TABLE "role_assignment" RENAME TO "role_assignment_backup";
  END IF;
END $$;

-- Create new unified role_assignments table
CREATE TABLE IF NOT EXISTS "role_assignments" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role_id" TEXT NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
  "workspace_id" TEXT REFERENCES "workspace"("id") ON DELETE CASCADE,
  "project_ids" JSONB,
  "department_ids" JSONB,
  "assigned_by" TEXT NOT NULL REFERENCES "users"("id") ON DELETE SET NULL,
  "assigned_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "expires_at" TIMESTAMP WITH TIME ZONE,
  "reason" TEXT,
  "notes" TEXT,
  "is_active" BOOLEAN DEFAULT TRUE NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_role_assignments_user_id" ON "role_assignments"("user_id");
CREATE INDEX IF NOT EXISTS "idx_role_assignments_role_id" ON "role_assignments"("role_id");
CREATE INDEX IF NOT EXISTS "idx_role_assignments_workspace_id" ON "role_assignments"("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_role_assignments_is_active" ON "role_assignments"("is_active");
CREATE INDEX IF NOT EXISTS "idx_role_assignments_assigned_at" ON "role_assignments"("assigned_at");

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS "idx_role_assignments_user_active" 
  ON "role_assignments"("user_id", "is_active");

-- =====================================================
-- PERMISSION OVERRIDES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS "permission_overrides" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "permission" TEXT NOT NULL,
  "granted" BOOLEAN NOT NULL,
  "workspace_id" TEXT REFERENCES "workspace"("id") ON DELETE CASCADE,
  "project_id" TEXT,
  "resource_type" TEXT,
  "resource_id" TEXT,
  "reason" TEXT,
  "granted_by" TEXT NOT NULL REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "expires_at" TIMESTAMP WITH TIME ZONE,
  "is_active" BOOLEAN DEFAULT TRUE NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_permission_overrides_user_id" ON "permission_overrides"("user_id");
CREATE INDEX IF NOT EXISTS "idx_permission_overrides_permission" ON "permission_overrides"("permission");
CREATE INDEX IF NOT EXISTS "idx_permission_overrides_is_active" ON "permission_overrides"("is_active");

-- Composite index for permission checks
CREATE INDEX IF NOT EXISTS "idx_permission_overrides_user_permission" 
  ON "permission_overrides"("user_id", "permission", "is_active");

-- =====================================================
-- ROLE AUDIT LOG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS "role_audit_log" (
  "id" TEXT PRIMARY KEY,
  "action" TEXT NOT NULL CHECK ("action" IN (
    'role_created',
    'role_updated',
    'role_deleted',
    'role_assigned',
    'role_removed',
    'permission_granted',
    'permission_revoked',
    'override_added',
    'override_removed'
  )),
  "role_id" TEXT REFERENCES "roles"("id") ON DELETE SET NULL,
  "user_id" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "assignment_id" TEXT REFERENCES "role_assignments"("id") ON DELETE SET NULL,
  "previous_value" JSONB,
  "new_value" JSONB,
  "reason" TEXT,
  "changed_by" TEXT NOT NULL REFERENCES "users"("id") ON DELETE SET NULL,
  "workspace_id" TEXT REFERENCES "workspace"("id") ON DELETE CASCADE,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_role_audit_log_role_id" ON "role_audit_log"("role_id");
CREATE INDEX IF NOT EXISTS "idx_role_audit_log_user_id" ON "role_audit_log"("user_id");
CREATE INDEX IF NOT EXISTS "idx_role_audit_log_action" ON "role_audit_log"("action");
CREATE INDEX IF NOT EXISTS "idx_role_audit_log_timestamp" ON "role_audit_log"("timestamp");

-- =====================================================
-- ROLE TEMPLATES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS "role_templates" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT NOT NULL DEFAULT 'custom' CHECK ("type" IN ('system', 'custom')),
  "permissions" JSONB NOT NULL,
  "color" TEXT DEFAULT '#3B82F6',
  "icon" TEXT,
  "category" TEXT,
  "usage_count" INTEGER DEFAULT 0 NOT NULL,
  "workspace_id" TEXT REFERENCES "workspace"("id") ON DELETE CASCADE,
  "created_by" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "is_active" BOOLEAN DEFAULT TRUE NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_role_templates_type" ON "role_templates"("type");
CREATE INDEX IF NOT EXISTS "idx_role_templates_workspace_id" ON "role_templates"("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_role_templates_category" ON "role_templates"("category");
CREATE INDEX IF NOT EXISTS "idx_role_templates_is_active" ON "role_templates"("is_active");

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Update updated_at timestamp on roles
CREATE OR REPLACE FUNCTION update_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER roles_updated_at
BEFORE UPDATE ON "roles"
FOR EACH ROW
EXECUTE FUNCTION update_roles_updated_at();

-- Update updated_at timestamp on role_assignments
CREATE OR REPLACE FUNCTION update_role_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER role_assignments_updated_at
BEFORE UPDATE ON "role_assignments"
FOR EACH ROW
EXECUTE FUNCTION update_role_assignments_updated_at();

-- Update users_count on roles when assignments change
CREATE OR REPLACE FUNCTION update_role_users_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_active = TRUE THEN
    UPDATE "roles" 
    SET users_count = users_count + 1,
        last_used_at = NOW()
    WHERE id = NEW.role_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_active = FALSE AND NEW.is_active = TRUE THEN
      UPDATE "roles" 
      SET users_count = users_count + 1,
          last_used_at = NOW()
      WHERE id = NEW.role_id;
    ELSIF OLD.is_active = TRUE AND NEW.is_active = FALSE THEN
      UPDATE "roles" 
      SET users_count = users_count - 1
      WHERE id = NEW.role_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.is_active = TRUE THEN
    UPDATE "roles" 
    SET users_count = users_count - 1
    WHERE id = OLD.role_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER role_assignments_update_count
AFTER INSERT OR UPDATE OR DELETE ON "role_assignments"
FOR EACH ROW
EXECUTE FUNCTION update_role_users_count();

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE "roles" IS 'Unified roles table supporting both system and custom roles';
COMMENT ON TABLE "role_assignments" IS 'Links users to roles with optional scoping';
COMMENT ON TABLE "permission_overrides" IS 'Fine-grained permission overrides beyond role permissions';
COMMENT ON TABLE "role_audit_log" IS 'Complete audit trail of all role-related changes';
COMMENT ON TABLE "role_templates" IS 'Pre-defined role templates for quick role creation';

-- =====================================================
-- GRANT PERMISSIONS (adjust as needed for your setup)
-- =====================================================

-- Grant necessary permissions to application user
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'RBAC Unification Migration Part 1 completed successfully';
  RAISE NOTICE 'Created tables: roles, role_assignments, permission_overrides, role_audit_log, role_templates';
  RAISE NOTICE 'Next step: Run migration 002 to seed system roles';
END $$;

