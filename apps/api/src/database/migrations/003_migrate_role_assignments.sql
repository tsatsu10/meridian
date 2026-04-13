-- =====================================================
-- RBAC Unification Migration - Part 3
-- Migrate Existing Role Assignments
-- =====================================================
-- Author: AI Code Assistant
-- Date: October 26, 2025
-- Phase: 1 - Database Foundation
-- =====================================================

-- =====================================================
-- MIGRATE EXISTING ROLE ASSIGNMENTS
-- =====================================================

-- This migration handles two scenarios:
-- 1. If role_assignment_backup exists (old table was renamed)
-- 2. If custom_permission table exists (old RBAC system)

DO $$
DECLARE
  backup_exists BOOLEAN;
  old_rbac_exists BOOLEAN;
  migrated_count INTEGER := 0;
BEGIN
  -- Check if backup table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'role_assignment_backup'
  ) INTO backup_exists;
  
  -- Check if old RBAC tables exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'custom_permission'
  ) INTO old_rbac_exists;
  
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Starting Role Assignment Migration';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
  
  -- =====================================================
  -- SCENARIO 1: Migrate from role_assignment_backup
  -- =====================================================
  
  IF backup_exists THEN
    RAISE NOTICE 'Found role_assignment_backup table';
    RAISE NOTICE 'Migrating existing role assignments...';
    
    -- Migrate old assignments to new unified table
    INSERT INTO "role_assignments" (
      "id",
      "user_id",
      "role_id",
      "workspace_id",
      "project_ids",
      "department_ids",
      "assigned_by",
      "assigned_at",
      "expires_at",
      "reason",
      "notes",
      "is_active",
      "created_at",
      "updated_at"
    )
    SELECT
      COALESCE("id", gen_random_uuid()::text),
      "user_id",
      "role", -- Old role field becomes role_id
      "workspace_id",
      "project_ids",
      "department_ids",
      COALESCE("assigned_by", "user_id"), -- Use user_id if assigned_by is null
      COALESCE("assigned_at", "created_at", NOW()),
      "expires_at",
      "reason",
      "notes",
      COALESCE("is_active", TRUE),
      COALESCE("created_at", NOW()),
      COALESCE("updated_at", NOW())
    FROM "role_assignment_backup"
    WHERE "role" IN (
      'workspace-manager',
      'department-head',
      'workspace-viewer',
      'project-manager',
      'project-viewer',
      'team-lead',
      'member',
      'client',
      'contractor',
      'stakeholder',
      'guest'
    )
    ON CONFLICT (id) DO NOTHING;
    
    GET DIAGNOSTICS migrated_count = ROW_COUNT;
    RAISE NOTICE '✅ Migrated % role assignments from backup', migrated_count;
    
  ELSE
    RAISE NOTICE 'No role_assignment_backup table found - this might be a fresh installation';
  END IF;
  
  -- =====================================================
  -- SCENARIO 2: Migrate from old RBAC system
  -- =====================================================
  
  IF old_rbac_exists THEN
    RAISE NOTICE '';
    RAISE NOTICE 'Found old RBAC custom_permission table';
    RAISE NOTICE 'Migrating permission overrides...';
    
    -- Migrate custom permissions if table exists
    INSERT INTO "permission_overrides" (
      "id",
      "user_id",
      "permission",
      "granted",
      "workspace_id",
      "project_id",
      "resource_type",
      "resource_id",
      "reason",
      "granted_by",
      "created_at",
      "expires_at",
      "is_active"
    )
    SELECT
      COALESCE("id", gen_random_uuid()::text),
      "user_id",
      "permission",
      "granted",
      "workspace_id",
      "project_id",
      "resource_type",
      "resource_id",
      "reason",
      COALESCE("assigned_by", "user_id"),
      COALESCE("created_at", NOW()),
      "expires_at",
      TRUE
    FROM "custom_permission"
    WHERE "user_id" IS NOT NULL
    ON CONFLICT (id) DO NOTHING;
    
    GET DIAGNOSTICS migrated_count = ROW_COUNT;
    RAISE NOTICE '✅ Migrated % permission overrides', migrated_count;
  END IF;
  
  -- =====================================================
  -- SCENARIO 3: Create default assignments for users without roles
  -- =====================================================
  
  RAISE NOTICE '';
  RAISE NOTICE 'Ensuring all users have role assignments...';
  
  -- Assign 'member' role to any users without assignments
  INSERT INTO "role_assignments" (
    "id",
    "user_id",
    "role_id",
    "workspace_id",
    "assigned_by",
    "assigned_at",
    "reason",
    "is_active",
    "created_at",
    "updated_at"
  )
  SELECT
    gen_random_uuid()::text,
    u."id",
    'member', -- Default to member role
    NULL, -- No specific workspace (yet)
    u."id", -- Self-assigned
    NOW(),
    'Auto-assigned during RBAC unification migration',
    TRUE,
    NOW(),
    NOW()
  FROM "users" u
  WHERE NOT EXISTS (
    SELECT 1 FROM "role_assignments" ra
    WHERE ra."user_id" = u."id" AND ra."is_active" = TRUE
  )
  AND u."id" IS NOT NULL;
  
  GET DIAGNOSTICS migrated_count = ROW_COUNT;
  RAISE NOTICE '✅ Created default role assignments for % users', migrated_count;
  
END $$;

-- =====================================================
-- UPDATE ROLE STATISTICS
-- =====================================================

-- Recalculate users_count for all roles
UPDATE "roles" r
SET users_count = (
  SELECT COUNT(*)
  FROM "role_assignments" ra
  WHERE ra.role_id = r.id AND ra.is_active = TRUE
);

-- =====================================================
-- VERIFY MIGRATION
-- =====================================================

DO $$
DECLARE
  total_assignments INTEGER;
  total_overrides INTEGER;
  total_roles INTEGER;
  users_without_roles INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_assignments FROM "role_assignments" WHERE is_active = TRUE;
  SELECT COUNT(*) INTO total_overrides FROM "permission_overrides" WHERE is_active = TRUE;
  SELECT COUNT(*) INTO total_roles FROM "roles";
  SELECT COUNT(*) INTO users_without_roles FROM "users" u
    WHERE NOT EXISTS (
      SELECT 1 FROM "role_assignments" ra
      WHERE ra.user_id = u.id AND ra.is_active = TRUE
    );
  
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Migration Verification';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Total roles in system: %', total_roles;
  RAISE NOTICE 'Active role assignments: %', total_assignments;
  RAISE NOTICE 'Active permission overrides: %', total_overrides;
  RAISE NOTICE 'Users without roles: %', users_without_roles;
  RAISE NOTICE '';
  
  IF users_without_roles = 0 THEN
    RAISE NOTICE '✅ All users have role assignments';
  ELSE
    RAISE WARNING '⚠️  % users do not have role assignments', users_without_roles;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Migration Part 3 completed successfully';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Verify data in new tables';
  RAISE NOTICE '  2. Test application with new schema';
  RAISE NOTICE '  3. Deploy updated middleware and services';
  RAISE NOTICE '  4. Monitor for any issues';
  RAISE NOTICE '  5. After verification, run cleanup migration';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE "role_assignments" IS 'Migrated and unified role assignments - includes data from role_assignment_backup';

