-- =====================================================
-- RBAC Unification ROLLBACK Script
-- =====================================================
-- Author: AI Code Assistant
-- Date: October 26, 2025
-- WARNING: This will UNDO all RBAC unification changes!
-- =====================================================

-- ⚠️  WARNING: Only run this if the migration failed!
-- This script will:
-- 1. Restore the old role_assignment table
-- 2. Drop the new unified tables
-- 3. Restore the system to pre-migration state

BEGIN;

-- =====================================================
-- STEP 1: Verify backup exists before proceeding
-- =====================================================

DO $$
DECLARE
  backup_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'role_assignment_backup'
  ) INTO backup_exists;
  
  IF NOT backup_exists THEN
    RAISE EXCEPTION '❌ ABORT: role_assignment_backup table not found! Cannot safely rollback.';
  END IF;
  
  RAISE NOTICE '✅ Backup table verified. Proceeding with rollback...';
END $$;

-- =====================================================
-- STEP 2: Drop triggers first
-- =====================================================

RAISE NOTICE 'Dropping triggers...';

DROP TRIGGER IF EXISTS roles_updated_at ON "roles";
DROP TRIGGER IF EXISTS role_assignments_updated_at ON "role_assignments";
DROP TRIGGER IF EXISTS role_assignments_update_count ON "role_assignments";

DROP FUNCTION IF EXISTS update_roles_updated_at();
DROP FUNCTION IF EXISTS update_role_assignments_updated_at();
DROP FUNCTION IF EXISTS update_role_users_count();

RAISE NOTICE '✅ Triggers dropped';

-- =====================================================
-- STEP 3: Drop new unified tables
-- =====================================================

RAISE NOTICE 'Dropping unified tables...';

DROP TABLE IF EXISTS "role_audit_log" CASCADE;
DROP TABLE IF EXISTS "role_templates" CASCADE;
DROP TABLE IF EXISTS "permission_overrides" CASCADE;
DROP TABLE IF EXISTS "role_assignments" CASCADE;
DROP TABLE IF EXISTS "roles" CASCADE;

RAISE NOTICE '✅ Unified tables dropped';

-- =====================================================
-- STEP 4: Restore old role_assignment table
-- =====================================================

RAISE NOTICE 'Restoring original role_assignment table...';

ALTER TABLE "role_assignment_backup" RENAME TO "role_assignment";

RAISE NOTICE '✅ Original table restored';

-- =====================================================
-- STEP 5: Verify rollback
-- =====================================================

DO $$
DECLARE
  old_table_exists BOOLEAN;
  new_table_exists BOOLEAN;
  assignment_count INTEGER;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'role_assignment'
  ) INTO old_table_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'role_assignments'
  ) INTO new_table_exists;
  
  IF old_table_exists AND NOT new_table_exists THEN
    SELECT COUNT(*) INTO assignment_count FROM "role_assignment";
    
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '✅ ROLLBACK SUCCESSFUL';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'System restored to pre-migration state';
    RAISE NOTICE 'Original role_assignment table: RESTORED';
    RAISE NOTICE 'Role assignments preserved: %', assignment_count;
    RAISE NOTICE '';
    RAISE NOTICE 'All unified RBAC tables have been removed';
    RAISE NOTICE '==============================================';
  ELSE
    RAISE EXCEPTION '❌ Rollback verification failed!';
  END IF;
END $$;

COMMIT;

-- =====================================================
-- POST-ROLLBACK NOTES
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'POST-ROLLBACK ACTION ITEMS';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
  RAISE NOTICE '1. Verify application is working with old schema';
  RAISE NOTICE '2. Review migration logs to identify issues';
  RAISE NOTICE '3. Fix migration issues before retrying';
  RAISE NOTICE '4. Test migration in staging environment';
  RAISE NOTICE '5. Only retry in production after successful staging test';
  RAISE NOTICE '';
  RAISE NOTICE 'Note: Old data has been preserved';
  RAISE NOTICE 'No data loss should have occurred';
  RAISE NOTICE '==============================================';
END $$;

