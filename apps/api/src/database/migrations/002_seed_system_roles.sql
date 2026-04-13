-- =====================================================
-- RBAC Unification Migration - Part 2
-- Seed System Roles
-- =====================================================
-- Author: AI Code Assistant
-- Date: October 26, 2025
-- Phase: 1 - Database Foundation
-- =====================================================

-- =====================================================
-- INSERT SYSTEM ROLES
-- =====================================================

-- These are the 11 built-in system roles
-- Their permissions are defined in code (ROLE_PERMISSIONS constant)
-- workspace_id is NULL (they're global)
-- permissions field is NULL (loaded from constant)

INSERT INTO "roles" (
  "id",
  "name",
  "description",
  "type",
  "permissions",
  "workspace_id",
  "color",
  "created_at",
  "updated_at",
  "is_active"
) VALUES
  (
    'workspace-manager',
    'Workspace Manager',
    'Full workspace control including billing, user management, and all administrative functions',
    'system',
    NULL, -- Permissions loaded from ROLE_PERMISSIONS constant
    NULL, -- Global role
    '#8B5CF6', -- Purple
    NOW(),
    NOW(),
    TRUE
  ),
  (
    'department-head',
    'Department Head',
    'Multi-project oversight with department management capabilities',
    'system',
    NULL,
    NULL,
    '#F59E0B', -- Amber
    NOW(),
    NOW(),
    TRUE
  ),
  (
    'workspace-viewer',
    'Workspace Viewer',
    'Read-only access to workspace content and analytics',
    'system',
    NULL,
    NULL,
    '#6B7280', -- Gray
    NOW(),
    NOW(),
    TRUE
  ),
  (
    'project-manager',
    'Project Manager',
    'Full control over assigned projects including planning, team management, and execution',
    'system',
    NULL,
    NULL,
    '#3B82F6', -- Blue
    NOW(),
    NOW(),
    TRUE
  ),
  (
    'project-viewer',
    'Project Viewer',
    'Read-only access to assigned projects for stakeholder visibility',
    'system',
    NULL,
    NULL,
    '#9CA3AF', -- Light Gray
    NOW(),
    NOW(),
    TRUE
  ),
  (
    'team-lead',
    'Team Lead',
    'Team coordination with performance analytics and resource allocation',
    'system',
    NULL,
    NULL,
    '#10B981', -- Green
    NOW(),
    NOW(),
    TRUE
  ),
  (
    'member',
    'Member',
    'Standard task management and collaboration access (default role)',
    'system',
    NULL,
    NULL,
    '#14B8A6', -- Teal
    NOW(),
    NOW(),
    TRUE
  ),
  (
    'client',
    'Client',
    'External client access for project collaboration and updates',
    'system',
    NULL,
    NULL,
    '#EC4899', -- Pink
    NOW(),
    NOW(),
    TRUE
  ),
  (
    'contractor',
    'Contractor',
    'Temporary contractor access for specific projects',
    'system',
    NULL,
    NULL,
    '#F97316', -- Orange
    NOW(),
    NOW(),
    TRUE
  ),
  (
    'stakeholder',
    'Stakeholder',
    'Stakeholder visibility for project updates and reports',
    'system',
    NULL,
    NULL,
    '#A855F7', -- Purple
    NOW(),
    NOW(),
    TRUE
  ),
  (
    'guest',
    'Guest',
    'Limited temporary access (fallback role)',
    'system',
    NULL,
    NULL,
    '#78716C', -- Stone
    NOW(),
    NOW(),
    TRUE
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- INSERT SYSTEM ROLE TEMPLATES
-- =====================================================

-- These templates help users create custom roles based on common patterns

INSERT INTO "role_templates" (
  "id",
  "name",
  "description",
  "type",
  "permissions",
  "color",
  "category",
  "workspace_id",
  "created_at",
  "updated_at",
  "is_active"
) VALUES
  (
    'template-viewer',
    'Viewer',
    'Read-only access to workspace content',
    'system',
    '["workspace.view","project.view","task.view","file.view","report.view"]'::jsonb,
    '#6B7280',
    'viewer',
    NULL,
    NOW(),
    NOW(),
    TRUE
  ),
  (
    'template-contributor',
    'Contributor',
    'Can create and edit content but not delete',
    'system',
    '["workspace.view","project.view","project.create","task.view","task.create","task.edit","task.status","file.view","file.upload","file.download","report.view"]'::jsonb,
    '#3B82F6',
    'contributor',
    NULL,
    NOW(),
    NOW(),
    TRUE
  ),
  (
    'template-manager',
    'Manager',
    'Full project and team management',
    'system',
    '["workspace.view","workspace.settings","project.view","project.create","project.edit","project.delete","project.archive","task.view","task.create","task.edit","task.delete","task.assign","task.status","user.view","user.invite","user.roles","file.view","file.upload","file.download","file.delete","file.share","report.view","report.export","report.create","settings.view"]'::jsonb,
    '#8B5CF6',
    'manager',
    NULL,
    NOW(),
    NOW(),
    TRUE
  ),
  (
    'template-administrator',
    'Administrator',
    'Complete workspace control',
    'system',
    '["workspace.view","workspace.edit","workspace.delete","workspace.settings","project.view","project.create","project.edit","project.delete","project.archive","task.view","task.create","task.edit","task.delete","task.assign","task.status","user.view","user.invite","user.edit","user.remove","user.roles","file.view","file.upload","file.download","file.delete","file.share","report.view","report.export","report.create","settings.view","settings.edit","settings.integrations","settings.billing"]'::jsonb,
    '#EF4444',
    'administrator',
    NULL,
    NOW(),
    NOW(),
    TRUE
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- VERIFY SYSTEM ROLES
-- =====================================================

DO $$
DECLARE
  role_count INTEGER;
  template_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO role_count FROM "roles" WHERE type = 'system';
  SELECT COUNT(*) INTO template_count FROM "role_templates" WHERE type = 'system';
  
  RAISE NOTICE 'System roles created: %', role_count;
  RAISE NOTICE 'System templates created: %', template_count;
  
  IF role_count = 11 THEN
    RAISE NOTICE '✅ All 11 system roles successfully created';
  ELSE
    RAISE WARNING '⚠️  Expected 11 system roles but found %', role_count;
  END IF;
  
  IF template_count = 4 THEN
    RAISE NOTICE '✅ All 4 system templates successfully created';
  ELSE
    RAISE WARNING '⚠️  Expected 4 system templates but found %', template_count;
  END IF;
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'RBAC Unification Migration Part 2 completed';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'System Roles:';
  RAISE NOTICE '  1. workspace-manager  (Full control)';
  RAISE NOTICE '  2. department-head    (Multi-project oversight)';
  RAISE NOTICE '  3. workspace-viewer   (Read-only workspace)';
  RAISE NOTICE '  4. project-manager    (Project control)';
  RAISE NOTICE '  5. project-viewer     (Read-only project)';
  RAISE NOTICE '  6. team-lead          (Team coordination)';
  RAISE NOTICE '  7. member             (Standard access - DEFAULT)';
  RAISE NOTICE '  8. client             (External client)';
  RAISE NOTICE '  9. contractor         (Temporary contractor)';
  RAISE NOTICE ' 10. stakeholder        (Stakeholder visibility)';
  RAISE NOTICE ' 11. guest              (Limited access - FALLBACK)';
  RAISE NOTICE '';
  RAISE NOTICE 'Role Templates:';
  RAISE NOTICE '  1. Viewer';
  RAISE NOTICE '  2. Contributor';
  RAISE NOTICE '  3. Manager';
  RAISE NOTICE '  4. Administrator';
  RAISE NOTICE '';
  RAISE NOTICE 'Next step: Run migration 003 to migrate existing assignments';
  RAISE NOTICE '==============================================';
END $$;

