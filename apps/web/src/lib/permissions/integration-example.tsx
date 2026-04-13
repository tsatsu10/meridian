/**
 * @epic-1.1-rbac Integration Example
 * 
 * This file shows how to integrate the RBAC system with your existing Meridian app.
 * It wraps your existing AuthProvider with the new RBACProvider.
 */

import React from "react";
import { RBACProvider, RequirePermission, RequireRole, PermissionDebug } from "./index";

// ===== APP INTEGRATION EXAMPLE =====

/**
 * Step 1: Wrap your existing app structure with RBACProvider
 * 
 * Update your main app file to include RBAC:
 */
export function AppWithRBAC({ children }: { children: React.ReactNode }) {
  return (
    // Your existing AuthProvider stays the same - RBAC wraps it
    <RBACProvider>
      {children}
      
      {/* Add permission debug in development */}
      {process.env.NODE_ENV === 'development' && <PermissionDebug />}
    </RBACProvider>
  );
}

// ===== USAGE EXAMPLES =====

/**
 * Example 1: Protecting UI elements with permissions
 */
export function TaskManagementExample() {
  return (
    <div className="task-management">
      <h2>Task Management</h2>
      
      {/* Only show create button if user can create tasks */}
      <RequirePermission action="canCreateTasks">
        <button>Create New Task</button>
      </RequirePermission>
      
      {/* Only show assign button if user can assign tasks */}
      <RequirePermission action="canAssignTasks">
        <button>Assign Task</button>
      </RequirePermission>
      
      {/* Team leads can CRUD subtasks */}
      <RequireRole role="team-lead" minimum>
        <div className="subtask-controls">
          <button>Create Subtask</button>
          <button>Edit Subtasks</button>
          <button>Delete Subtask</button>
        </div>
      </RequireRole>
    </div>
  );
}

/**
 * Example 2: Role-based navigation
 */
export function NavigationExample() {
  return (
    <nav className="sidebar">
      {/* Everyone can see dashboard */}
      <a href="/dashboard">Dashboard</a>
      
      {/* Only members and above can see tasks */}
      <RequireRole role="member" minimum>
        <a href="/tasks">Tasks</a>
      </RequireRole>
      
      {/* Only team leads and above can see team management */}
      <RequireRole role="team-lead" minimum>
        <a href="/teams">Team Management</a>
      </RequireRole>
      
      {/* Only project managers and above can see projects */}
      <RequireRole role="project-manager" minimum>
        <a href="/projects">Projects</a>
      </RequireRole>
      
      {/* Only workspace managers can see settings */}
      <RequireRole role="workspace-manager">
        <a href="/settings">Workspace Settings</a>
      </RequireRole>
    </nav>
  );
}

/**
 * Example 3: Using hooks for dynamic behavior
 */
export function DynamicContentExample() {
  // Import these hooks in your components
  // import { usePermission, useRole, useRBACAuth } from "@/lib/permissions";
  
  // const canEdit = usePermission("canEditTasks");
  // const { role, level } = useRole();
  // const { user } = useRBACAuth();
  
  return (
    <div className="dynamic-content">
      {/* Your component logic here */}
      <p>This example shows how to use hooks - see comments above</p>
    </div>
  );
}

// ===== INTEGRATION CHECKLIST =====

/**
 * INTEGRATION CHECKLIST:
 * 
 * ✅ 1. Wrap your app with RBACProvider (keep existing AuthProvider)
 * ✅ 2. Replace manual permission checks with permission guards
 * ✅ 3. Use RequirePermission for action-based protection
 * ✅ 4. Use RequireRole for role-based protection  
 * ✅ 5. Use hooks (usePermission, useRole) for dynamic behavior
 * ✅ 6. Add PermissionDebug in development
 * 
 * TODO - Backend Integration:
 * □ 7. Update API to store role assignments in database
 * □ 8. Add role assignment endpoints (/api/roles/assign, /api/roles/remove)
 * □ 9. Update user endpoints to return role information
 * □ 10. Add middleware to check permissions on API routes
 * □ 11. Add audit logging for role changes
 * □ 12. Add role assignment validation
 * 
 * TODO - UI Enhancements:
 * □ 13. Create role management admin interface
 * □ 14. Add role assignment forms
 * □ 15. Create permission overview dashboard
 * □ 16. Add user invitation with role selection
 * □ 17. Add role transition workflows
 * □ 18. Create permission error boundaries
 */

export default AppWithRBAC; 