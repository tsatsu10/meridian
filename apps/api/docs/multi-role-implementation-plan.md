# 🎯 Multi-Role Implementation Plan for Meridian

## 📋 Overview

This document outlines the implementation strategy for supporting multiple user roles within the same workspace, where a user can have different roles across different projects.

## 🎯 Requirements

- **User A** can be a `member` in Project 1
- **User A** can be a `team-lead` in Project 2  
- **User A** can be a `project-manager` in Project 3
- All within the same workspace
- Proper permission resolution and role hierarchy
- Clear role precedence and context awareness

## 🗄️ Database Schema Changes

### **Enhanced Role Assignment Strategy**

The current schema already supports this with modifications needed in the logic:

```sql
-- Current role_assignment table structure (Good foundation)
CREATE TABLE role_assignment (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  role TEXT NOT NULL,
  assignedBy TEXT NOT NULL,
  assignedAt INTEGER NOT NULL,
  expiresAt INTEGER,
  isActive INTEGER DEFAULT 1,
  
  -- Context scope (Key for multi-role support)
  workspaceId TEXT,
  projectIds TEXT, -- JSON array: ["proj1", "proj2"] or NULL for workspace-level
  departmentIds TEXT, -- JSON array or NULL
  
  -- Metadata
  reason TEXT,
  restrictions TEXT,
  notes TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);
```

### **Key Changes Needed**

1. **Stop deactivating previous assignments** - Allow multiple active assignments
2. **Enhanced context scoping** - Clear workspace vs project vs department scope
3. **Role precedence rules** - Define which role takes precedence in conflicts

## 🔧 Implementation Strategy

### **1. Role Assignment Logic**

```typescript
// NEW: Enhanced role assignment that supports multiple roles
interface RoleAssignmentRequest {
  userId: string;
  role: UserRole;
  scope: {
    workspaceId?: string;    // Workspace-level role
    projectIds?: string[];   // Project-specific role
    departmentIds?: string[]; // Department-specific role
  };
  assignedBy: string;
  reason?: string;
  expiresAt?: Date;
}

// STRATEGY: Don't deactivate previous assignments, validate scope conflicts
const assignRole = async (request: RoleAssignmentRequest) => {
  // 1. Check for existing conflicting assignments
  const existingAssignments = await getActiveRoleAssignments(request.userId);
  
  // 2. Validate scope conflicts
  const conflicts = checkScopeConflicts(existingAssignments, request);
  if (conflicts.length > 0) {
    // Handle conflicts: either update existing or reject
    throw new Error(`Role conflicts detected: ${conflicts.join(', ')}`);
  }
  
  // 3. Create new assignment without deactivating others
  const newAssignment = {
    id: createId(),
    userId: request.userId,
    role: request.role,
    assignedBy: request.assignedBy,
    assignedAt: new Date(),
    expiresAt: request.expiresAt,
    isActive: true,
    workspaceId: request.scope.workspaceId,
    projectIds: request.scope.projectIds ? JSON.stringify(request.scope.projectIds) : null,
    departmentIds: request.scope.departmentIds ? JSON.stringify(request.scope.departmentIds) : null,
    reason: request.reason,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  await db.insert(roleAssignmentTable).values(newAssignment);
  return newAssignment;
};
```

### **2. Enhanced Permission Resolution**

```typescript
// NEW: Multi-role permission checking
interface UserPermissionContext {
  userId: string;
  workspaceId?: string;
  projectId?: string;
  departmentId?: string;
}

const getUserEffectivePermissions = async (context: UserPermissionContext) => {
  // 1. Get all active role assignments for user
  const assignments = await db
    .select()
    .from(roleAssignmentTable)
    .where(
      and(
        eq(roleAssignmentTable.userId, context.userId),
        eq(roleAssignmentTable.isActive, true),
        or(
          isNull(roleAssignmentTable.expiresAt),
          gt(roleAssignmentTable.expiresAt, new Date())
        )
      )
    );

  // 2. Filter assignments by context scope
  const relevantAssignments = filterAssignmentsByContext(assignments, context);
  
  // 3. Apply role hierarchy - highest role wins
  const effectiveRole = resolveRoleHierarchy(relevantAssignments);
  
  // 4. Get base permissions
  const basePermissions = getRolePermissions(effectiveRole);
  
  // 5. Apply any custom permissions (overrides)
  const customPermissions = await getCustomPermissions(context.userId, context);
  
  // 6. Merge permissions (custom overrides base)
  return mergePermissions(basePermissions, customPermissions);
};

const filterAssignmentsByContext = (assignments: RoleAssignment[], context: UserPermissionContext) => {
  return assignments.filter(assignment => {
    // Workspace-level roles apply everywhere in the workspace
    if (!assignment.projectIds && !assignment.departmentIds) {
      return assignment.workspaceId === context.workspaceId;
    }
    
    // Project-specific roles
    if (assignment.projectIds && context.projectId) {
      const projectIds = JSON.parse(assignment.projectIds);
      return projectIds.includes(context.projectId);
    }
    
    // Department-specific roles
    if (assignment.departmentIds && context.departmentId) {
      const departmentIds = JSON.parse(assignment.departmentIds);
      return departmentIds.includes(context.departmentId);
    }
    
    return false;
  });
};

const resolveRoleHierarchy = (assignments: RoleAssignment[]): UserRole => {
  if (assignments.length === 0) return 'guest';
  if (assignments.length === 1) return assignments[0].role as UserRole;
  
  // Multiple assignments - take the highest level role
  return assignments.reduce((highest, current) => {
    const currentLevel = ROLE_HIERARCHY[current.role as UserRole];
    const highestLevel = ROLE_HIERARCHY[highest];
    return currentLevel > highestLevel ? current.role as UserRole : highest;
  }, assignments[0].role as UserRole);
};
```

### **3. Role Context Management**

```typescript
// NEW: Context-aware role management
interface UserRoleContext {
  userId: string;
  workspaceId: string;
  currentProjectId?: string;
  currentDepartmentId?: string;
}

const getUserRolesInContext = async (context: UserRoleContext) => {
  const assignments = await db
    .select()
    .from(roleAssignmentTable)
    .where(
      and(
        eq(roleAssignmentTable.userId, context.userId),
        eq(roleAssignmentTable.isActive, true),
        eq(roleAssignmentTable.workspaceId, context.workspaceId)
      )
    );

  return {
    workspaceRole: getWorkspaceRole(assignments),
    projectRoles: getProjectRoles(assignments),
    departmentRoles: getDepartmentRoles(assignments),
    effectiveRole: resolveEffectiveRole(assignments, context),
  };
};

// Helper to get the effective role for current context
const resolveEffectiveRole = (assignments: RoleAssignment[], context: UserRoleContext): UserRole => {
  const relevantAssignments = filterAssignmentsByContext(assignments, {
    userId: context.userId,
    workspaceId: context.workspaceId,
    projectId: context.currentProjectId,
    departmentId: context.currentDepartmentId,
  });
  
  return resolveRoleHierarchy(relevantAssignments);
};
```

## 🎨 Frontend Implementation

### **1. Role Selection Component**

```typescript
// NEW: Multi-role context switcher
interface RoleSwitcherProps {
  userId: string;
  workspaceId: string;
  currentProjectId?: string;
  onRoleContextChange: (context: RoleContext) => void;
}

const RoleSwitcher: React.FC<RoleSwitcherProps> = ({ 
  userId, 
  workspaceId, 
  currentProjectId, 
  onRoleContextChange 
}) => {
  const { data: userRoles } = useQuery({
    queryKey: ['user-roles', userId, workspaceId],
    queryFn: () => getUserRolesInContext({ userId, workspaceId, currentProjectId })
  });

  return (
    <Select onValueChange={onRoleContextChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select role context" />
      </SelectTrigger>
      <SelectContent>
        {/* Workspace-level role */}
        {userRoles?.workspaceRole && (
          <SelectItem value={`workspace:${workspaceId}`}>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">{userRoles.workspaceRole}</Badge>
              <span>Workspace Level</span>
            </div>
          </SelectItem>
        )}
        
        {/* Project-specific roles */}
        {userRoles?.projectRoles.map(({ projectId, role }) => (
          <SelectItem key={projectId} value={`project:${projectId}`}>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">{role}</Badge>
              <span>{getProjectName(projectId)}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
```

### **2. Role Management Interface**

```typescript
// NEW: Multi-role assignment interface
const UserRoleManagement: React.FC<{ userId: string }> = ({ userId }) => {
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<UserRole>('member');

  const assignProjectRole = useMutation({
    mutationFn: async ({ role, projectIds }: { role: UserRole; projectIds: string[] }) => {
      return await assignRole({
        userId,
        role,
        scope: { projectIds },
        assignedBy: currentUser.id,
        reason: `Assigned ${role} role to ${projectIds.length} project(s)`
      });
    },
    onSuccess: () => {
      toast.success('Role assigned successfully');
      refetch();
    }
  });

  return (
    <div className="space-y-4">
      <div>
        <label>Select Role</label>
        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="member">Member</SelectItem>
            <SelectItem value="team-lead">Team Lead</SelectItem>
            <SelectItem value="project-manager">Project Manager</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label>Select Projects</label>
        <MultiSelect
          value={selectedProjects}
          onChange={setSelectedProjects}
          options={availableProjects}
        />
      </div>

      <Button 
        onClick={() => assignProjectRole.mutate({ 
          role: selectedRole, 
          projectIds: selectedProjects 
        })}
        disabled={selectedProjects.length === 0}
      >
        Assign Role to Projects
      </Button>
    </div>
  );
};
```

## 🔒 Permission Resolution Rules

### **Role Precedence Hierarchy**

1. **Workspace-level roles** apply to entire workspace
2. **Project-specific roles** override workspace roles for that project
3. **Department-specific roles** apply to department projects
4. **Custom permissions** override all role-based permissions
5. **Higher hierarchy levels** always win in conflicts

### **Permission Resolution Algorithm**

```typescript
const checkPermission = async (
  userId: string,
  permission: string,
  context: { workspaceId?: string; projectId?: string }
): Promise<boolean> => {
  // 1. Get all relevant role assignments
  const assignments = await getRelevantAssignments(userId, context);
  
  // 2. Resolve effective role using hierarchy
  const effectiveRole = resolveRoleHierarchy(assignments);
  
  // 3. Check base permission
  const basePermissions = getRolePermissions(effectiveRole);
  let hasPermission = basePermissions[permission] || false;
  
  // 4. Apply custom permission overrides
  const customOverride = await getCustomPermissionOverride(userId, permission, context);
  if (customOverride !== null) {
    hasPermission = customOverride;
  }
  
  return hasPermission;
};
```

## 🚀 Migration Strategy

### **1. Database Migration**

```sql
-- No schema changes needed, but update logic:
-- 1. Stop the deactivation of previous role assignments
-- 2. Add unique constraints for scope conflicts
-- 3. Add indexes for performance

CREATE INDEX idx_role_assignment_user_workspace ON role_assignment(userId, workspaceId);
CREATE INDEX idx_role_assignment_user_project ON role_assignment(userId, projectIds);
CREATE INDEX idx_role_assignment_active ON role_assignment(isActive, expiresAt);
```

### **2. API Changes**

```typescript
// NEW: Enhanced role assignment endpoint
POST /rbac/assign-project-role
{
  "userId": "user123",
  "role": "team-lead",
  "projectIds": ["proj1", "proj2"],
  "reason": "Promoting to team lead for Alpha and Beta projects"
}

// NEW: Get user's roles across projects
GET /rbac/user-roles/:userId?workspaceId=ws123
Response: {
  "workspaceRole": "member",
  "projectRoles": [
    { "projectId": "proj1", "role": "team-lead" },
    { "projectId": "proj2", "role": "project-manager" }
  ],
  "effectiveRole": "project-manager" // highest level
}

// ENHANCED: Permission check with context
POST /rbac/permissions/check
{
  "userId": "user123",
  "permission": "canAssignTasks",
  "context": {
    "workspaceId": "ws123",
    "projectId": "proj1"
  }
}
```

## 📊 UI/UX Considerations

### **Role Context Indicator**

- Show current effective role in header/sidebar
- Provide role switcher for users with multiple roles
- Clear indication of permissions available in current context

### **Role Management Dashboard**

- Visual matrix of user roles across projects
- Easy assignment/removal of project-specific roles
- Role conflict detection and resolution

### **Permission-Based UI**

- Components that adapt based on effective role in current context
- Clear indication when permissions are inherited vs. project-specific
- Graceful degradation when switching between role contexts

## ✅ Implementation Checklist

- [ ] **Database**: Add indexes for multi-role queries
- [ ] **API**: Update role assignment logic to support multiple roles
- [ ] **API**: Enhance permission checking for context-aware resolution
- [ ] **Frontend**: Create role context management components
- [ ] **Frontend**: Update permission hooks for multi-role support
- [ ] **Frontend**: Build role assignment interface
- [ ] **Testing**: Add comprehensive multi-role test scenarios
- [ ] **Documentation**: Update role documentation and examples

## 🎯 Example Scenarios

### **Scenario 1: User with Multiple Project Roles**

```
User: john@company.com
Workspace: Company Workspace

Assignments:
- workspace-level: member
- Project Alpha: team-lead  
- Project Beta: project-manager
- Project Gamma: member (inherits from workspace)

When viewing Project Alpha → Effective Role: team-lead
When viewing Project Beta → Effective Role: project-manager  
When viewing Project Gamma → Effective Role: member
When viewing workspace dashboard → Effective Role: project-manager (highest)
```

### **Scenario 2: Permission Resolution**

```
Permission Check: canAssignTasks
Context: Project Alpha

Resolution:
1. Check project-specific role: team-lead
2. team-lead permissions: canAssignTasks = true
3. Check custom overrides: none
4. Result: true
```

This implementation provides a flexible, scalable multi-role system that maintains clear permission boundaries while supporting complex organizational structures. 