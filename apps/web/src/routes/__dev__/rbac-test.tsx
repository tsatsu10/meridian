/**
 * 🛡️ RBAC Testing Interface
 * 
 * Comprehensive testing page for role-based access control.
 * Allows switching between roles and testing permissions.
 * 
 * @epic-1.1-subtasks - Test team lead subtask management powers
 * @epic-2.1-files - Test file access permissions by role  
 * @epic-3.2-time - Test time tracking permissions
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useRBACAuth } from "@/lib/permissions";
import { useFeatureFlags, useMultiplePermissions, useTeamLeadActions } from "@/lib/permissions/hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  CheckCircle2, 
  XCircle, 
  Crown, 
  Shield, 
  Users, 
  FileText,
  Clock,
  Settings,
  Building,
  Briefcase,
  Eye,
  UserCheck,
  AlertTriangle,

  Zap
} from "lucide-react";
import { toast } from "sonner";
import type { UserRole, PermissionAction } from "@/lib/permissions/types";
import { getRolePermissions } from "@/lib/permissions/definitions";

export const Route = createFileRoute("/__dev__/rbac-test")({
  component: RBACTestPage,
});

// Demo users with different roles for testing
const DEMO_USERS = [
  {
    id: "admin",
    email: "admin@meridian.app", 
    name: "Alice Admin",
    role: "workspace-manager" as UserRole,
    description: "Full workspace control and management",
    department: "Administration"
  },
  {
    id: "sarah-pm",
    email: "sarah.pm@meridian.app",
    name: "Sarah Mitchell", 
    role: "department-head" as UserRole,
    description: "Head of Product Management",
    department: "Product Management"
  },
  {
    id: "david-lead",
    email: "david.lead@meridian.app",
    name: "David Chen",
    role: "department-head" as UserRole, 
    description: "Head of Engineering",
    department: "Engineering"
  },
  {
    id: "jennifer-exec", 
    email: "jennifer.exec@meridian.app",
    name: "Jennifer Williams",
    role: "project-manager" as UserRole,
    description: "Senior Project Manager",
    department: "Product Management"
  },
  {
    id: "lisa-design",
    email: "lisa.design@meridian.app", 
    name: "Lisa Rodriguez",
    role: "team-lead" as UserRole,
    description: "Design Team Lead with subtask powers",
    department: "Design"
  },
  {
    id: "tom-lead",
    email: "teamlead@meridian.app",
    name: "Tom Leadership", 
    role: "team-lead" as UserRole,
    description: "Engineering Team Lead with subtask powers",
    department: "Engineering"
  },
  {
    id: "mike-dev",
    email: "dev@meridian.app",
    name: "Mike Developer",
    role: "member" as UserRole,
    description: "Software Developer",
    department: "Engineering"
  },
  {
    id: "john-client",
    email: "client@external.com",
    name: "John Client", 
    role: "client" as UserRole,
    description: "External client with limited access",
    department: "External"
  },
  {
    id: "jane-contractor",
    email: "contractor@freelance.com",
    name: "Jane Contractor",
    role: "contractor" as UserRole,
    description: "External contractor",
    department: "External"
  },
  {
    id: "guest",
    email: "guest@example.com",
    name: "Guest User",
    role: "guest" as UserRole,
    description: "Limited guest access",
    department: "Public"
  }
];

// Permission categories for organized testing
const PERMISSION_CATEGORIES = [
  {
    category: "🏢 Workspace Management",
    icon: Building,
    permissions: [
      "canManageWorkspace",
      "canViewWorkspace", 
      "canDeleteWorkspace",
      "canManageWorkspaceSettings",
      "canInviteUsers",
      "canRemoveUsers",
      "canManageRoles"
    ] as PermissionAction[]
  },
  {
    category: "📋 Project Management", 
    icon: Briefcase,
    permissions: [
      "canCreateProjects",
      "canEditProjects",
      "canDeleteProjects",
      "canViewAllProjects",
      "canManageProjectTeam",
      "canViewProjectAnalytics"
    ] as PermissionAction[]
  },
  {
    category: "✅ Task Management",
    icon: CheckCircle2,
    permissions: [
      "canCreateTasks",
      "canEditTasks",
      "canDeleteTasks",
      "canViewAllTasks",
      "canAssignTasks",
      "canBulkEditTasks"
    ] as PermissionAction[]
  },
  {
    category: "🔧 Subtask Management (Team Leads)",
    icon: Zap,
    permissions: [
      "canCreateSubtasks",
      "canEditSubtasks", 
      "canDeleteSubtasks",
      "canAssignSubtasks",
      "canManageSubtaskHierarchy"
    ] as PermissionAction[]
  },
  {
    category: "👥 Team Management",
    icon: Users,
    permissions: [
      "canCreateTeams",
      "canEditTeams",
      "canAddMembers",
      "canRemoveMembers",
      "canManageTeamRoles",
      "canAssignTeamLeads"
    ] as PermissionAction[]
  },
  {
    category: "📁 File Management",
    icon: FileText,
    permissions: [
      "canUploadFiles",
      "canDownloadFiles",
      "canDeleteFiles",
      "canShareFiles",
      "canManageFileVersions"
    ] as PermissionAction[]
  },
  {
    category: "⏰ Time Tracking",
    icon: Clock,
    permissions: [
      "canTrackTime",
      "canViewTimeTracking",
      "canEditTimeEntries",
      "canApproveTimeEntries",
      "canManageTimeTracking"
    ] as PermissionAction[]
  },
  {
    category: "📊 Analytics & Reports",
    icon: Eye,
    permissions: [
      "canViewAnalytics",
      "canViewTeamAnalytics",
      "canViewProjectAnalytics",
      "canCreateReports",
      "canExportReports"
    ] as PermissionAction[]
  }
];

function RBACTestPage() {
  const { user, setUser, hasPermission } = useRBACAuth();
  const featureFlags = useFeatureFlags();
  const teamLeadActions = useTeamLeadActions();
  const [selectedRole, setSelectedRole] = useState<string>(user?.role || "member");
  const [testMode, setTestMode] = useState<"permissions" | "features" | "teamlead">("permissions");

  // Test multiple permissions for each category
  const workspacePerms = useMultiplePermissions(PERMISSION_CATEGORIES[0].permissions);
  const projectPerms = useMultiplePermissions(PERMISSION_CATEGORIES[1].permissions);
  const taskPerms = useMultiplePermissions(PERMISSION_CATEGORIES[2].permissions);
  const subtaskPerms = useMultiplePermissions(PERMISSION_CATEGORIES[3].permissions);
  const teamPerms = useMultiplePermissions(PERMISSION_CATEGORIES[4].permissions);
  const filePerms = useMultiplePermissions(PERMISSION_CATEGORIES[5].permissions);
  const timePerms = useMultiplePermissions(PERMISSION_CATEGORIES[6].permissions);
  const analyticsPerms = useMultiplePermissions(PERMISSION_CATEGORIES[7].permissions);

  const allPermResults = [
    { ...PERMISSION_CATEGORIES[0], results: workspacePerms },
    { ...PERMISSION_CATEGORIES[1], results: projectPerms },
    { ...PERMISSION_CATEGORIES[2], results: taskPerms },
    { ...PERMISSION_CATEGORIES[3], results: subtaskPerms },
    { ...PERMISSION_CATEGORIES[4], results: teamPerms },
    { ...PERMISSION_CATEGORIES[5], results: filePerms },
    { ...PERMISSION_CATEGORIES[6], results: timePerms },
    { ...PERMISSION_CATEGORIES[7], results: analyticsPerms }
  ];

  const switchToRole = (roleId: string) => {
    const demoUser = DEMO_USERS.find(u => u.id === roleId);
    if (!demoUser) return;

    // Create department-specific assignments for department heads and team leads
    let departmentIds: string[] = [];
    let projectIds: string[] = [];
    
    switch (demoUser.department) {
      case "Product Management":
        departmentIds = ["dept-product"];
        projectIds = ["proj-web-app", "proj-mobile"];
        break;
      case "Engineering": 
        departmentIds = ["dept-engineering"];
        projectIds = ["proj-api", "proj-infrastructure"];
        break;
      case "Design":
        departmentIds = ["dept-design"];
        projectIds = ["proj-design-system", "proj-ux-research"];
        break;
      case "External":
        departmentIds = [];
        projectIds = demoUser.role === "client" ? ["proj-client-portal"] : [];
        break;
      default:
        departmentIds = ["dept-general"];
        projectIds = [];
    }

    // Update user in context with demo user data
    setUser({
      id: demoUser.id,
      email: demoUser.email,
      name: demoUser.name,
      role: demoUser.role,
      roleAssignment: {
        id: `assignment-${demoUser.id}`,
        role: demoUser.role,
        assignedAt: new Date(),
        assignedBy: "demo-system",
        isActive: true,
        workspaceId: "demo-workspace",
        projectIds,
        departmentIds,
        reason: `Testing as ${demoUser.description} in ${demoUser.department}`,
        updatedAt: new Date()
      },
      permissions: getRolePermissions(roleId as UserRole), // Get proper permissions for the role
      isActive: true,
      lastActiveAt: new Date()
    });

    setSelectedRole(roleId);
    toast.success(`Switched to ${demoUser.name} (${demoUser.role}) - ${demoUser.department}`);
  };

  const testTeamLeadAction = (action: string) => {
    switch (action) {
      case "createSubtask":
        if (teamLeadActions.createSubtask.canExecute) {
          teamLeadActions.createSubtask.action("demo-task-1", {
            title: "Demo Subtask",
            description: "Testing subtask creation",
            assignedTo: user?.id
          });
        } else {
          toast.error("You don't have permission to create subtasks");
        }
        break;
      case "manageHierarchy":
        if (teamLeadActions.reorderSubtasks.canExecute) {
          teamLeadActions.reorderSubtasks.action("demo-task-1", ["sub-1", "sub-2", "sub-3"]);
        } else {
          toast.error("You don't have permission to manage subtask hierarchy");
        }
        break;
      case "bulkAssign":
        if (teamLeadActions.assignSubtask.canExecute) {
          teamLeadActions.assignSubtask.action("sub-1", "team-member-1");
          teamLeadActions.assignSubtask.action("sub-2", "team-member-1");
          toast.success("Bulk assigned subtasks to team member");
        } else {
          toast.error("You don't have permission to assign subtasks");
        }
        break;
      case "analyzeWorkload":
        if (teamLeadActions.manageTeam.canExecute) {
          teamLeadActions.manageTeam.action("demo-team-1", "analyzeWorkload", { 
            metrics: ["productivity", "capacity", "burnout_risk"]
          });
          toast.success("Analyzing team workload...");
        } else {
          toast.error("You don't have permission to analyze team workload");
        }
        break;
      default:
        toast.info(`Testing ${action} action...`);
    }
  };

  return (
    <div className="container mx-auto max-w-7xl p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          🛡️ RBAC Testing Interface
        </h1>
        <p className="text-muted-foreground">
          Test role-based access control by switching between different user roles and checking permissions.
        </p>
      </div>

      {/* Current User Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Current Test User
          </CardTitle>
          <CardDescription>
            Switch between demo users to test different role permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="text-lg font-semibold">{user?.name || "Not logged in"}</div>
                <Badge variant="secondary" className="capitalize">
                  {user?.role || "guest"}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">{user?.email}</div>
              {user?.roleAssignment && (
                <div className="text-xs text-muted-foreground">
                  Department: {user.roleAssignment.departmentIds?.[0] || "None"} • 
                  Assigned: {user.roleAssignment.assignedAt.toLocaleDateString()}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <Select value={selectedRole} onValueChange={switchToRole}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Switch to role..." />
                </SelectTrigger>
                <SelectContent>
                  {DEMO_USERS.map((demoUser) => (
                    <SelectItem key={demoUser.id} value={demoUser.id}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs capitalize">
                          {demoUser.role}
                        </Badge>
                        {demoUser.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Mode Toggle */}
      <Card>
        <CardHeader>
          <CardTitle>Testing Mode</CardTitle>
          <CardDescription>
            Choose what aspect of the RBAC system to test
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              variant={testMode === "permissions" ? "default" : "outline"}
              onClick={() => setTestMode("permissions")}
              className="flex items-center gap-2"
            >
              <Shield className="h-4 w-4" />
              Permission Testing
            </Button>
            <Button
              variant={testMode === "features" ? "default" : "outline"}
              onClick={() => setTestMode("features")}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Feature Flags
            </Button>
            <Button
              variant={testMode === "teamlead" ? "default" : "outline"}
              onClick={() => setTestMode("teamlead")}
              className="flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              Team Lead Actions
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Permission Testing */}
      {testMode === "permissions" && (
        <div className="grid gap-6 md:grid-cols-2">
          {allPermResults.map(({ category, icon: Icon, permissions, results }) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Icon className="h-5 w-5" />
                  {category}
                </CardTitle>
                <CardDescription>
                  {results.hasAll ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      Full access ({results.granted.length}/{permissions.length})
                    </span>
                  ) : results.hasAny ? (
                    <span className="text-yellow-600 flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" />
                      Partial access ({results.granted.length}/{permissions.length})
                    </span>
                  ) : (
                    <span className="text-red-600 flex items-center gap-1">
                      <XCircle className="h-4 w-4" />
                      No access (0/{permissions.length})
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {permissions.map((permission) => {
                    const hasAccess = hasPermission(permission);
                    return (
                      <div
                        key={permission}
                        className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                      >
                        <span className="text-sm font-mono">{permission}</span>
                        {hasAccess ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Feature Flags Testing */}
      {testMode === "features" && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5" />
                Admin Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                ["Admin Access", featureFlags.canAccessAdmin],
                ["Manage Roles", featureFlags.canManageRoles],
                ["View Analytics", featureFlags.canViewAnalytics]
              ].map(([label, enabled]) => (
                <div key={label as string} className="flex items-center justify-between">
                  <span className="text-sm">{label}</span>
                  <Switch checked={enabled as boolean} disabled />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Project Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                ["Create Projects", featureFlags.canCreateProjects],
                ["Edit Projects", featureFlags.canEditProjects],
                ["Delete Projects", featureFlags.canDeleteProjects]
              ].map(([label, enabled]) => (
                <div key={label as string} className="flex items-center justify-between">
                  <span className="text-sm">{label}</span>
                  <Switch checked={enabled as boolean} disabled />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Team Lead Powers
              </CardTitle>
              <CardDescription>
                Special subtask management capabilities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                ["Manage Subtasks", featureFlags.canManageSubtasks],
                ["Create Subtasks", featureFlags.canCreateSubtasks],
                ["Edit Subtasks", featureFlags.canEditSubtasks],
                ["Delete Subtasks", featureFlags.canDeleteSubtasks],
                ["Assign Subtasks", featureFlags.canAssignSubtasks]
              ].map(([label, enabled]) => (
                <div key={label as string} className="flex items-center justify-between">
                  <span className="text-sm">{label}</span>
                  <Switch checked={enabled as boolean} disabled />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Type Flags
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                ["External User", featureFlags.isExternalUser],
                ["Internal User", featureFlags.isInternalUser],
                ["Restricted Access", featureFlags.hasRestrictedAccess]
              ].map(([label, enabled]) => (
                <div key={label as string} className="flex items-center justify-between">
                  <span className="text-sm">{label}</span>
                  <Switch checked={enabled as boolean} disabled />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Team Lead Actions Testing */}
      {testMode === "teamlead" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Team Lead Action Testing
              </CardTitle>
              <CardDescription>
                Test special team lead capabilities for subtask management
              </CardDescription>
            </CardHeader>
            <CardContent>
              {user?.role === "team-lead" ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <Button
                    onClick={() => testTeamLeadAction("createSubtask")}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Create Demo Subtask
                  </Button>
                  <Button
                    onClick={() => testTeamLeadAction("manageHierarchy")}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Manage Subtask Hierarchy
                  </Button>
                  <Button
                    onClick={() => testTeamLeadAction("bulkAssign")}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Users className="h-4 w-4" />
                    Bulk Assign Subtasks
                  </Button>
                  <Button
                    onClick={() => testTeamLeadAction("analyzeWorkload")}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Analyze Team Workload
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Team Lead Role Required</h3>
                  <p className="text-muted-foreground mb-4">
                    Switch to a Team Lead role to test these special actions.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={() => switchToRole("lisa-design")} variant="outline">
                      Switch to Lisa (Design Lead)
                    </Button>
                    <Button onClick={() => switchToRole("tom-lead")} variant="outline">
                      Switch to Tom (Engineering Lead)
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Lead Capabilities Overview */}
          {user?.role === "team-lead" && (
            <Card>
              <CardHeader>
                <CardTitle>Current Team Lead Capabilities</CardTitle>
                <CardDescription>
                  Overview of your special team lead permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <h4 className="font-semibold">✅ Subtask Management</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Create and organize subtasks</li>
                      <li>• Edit existing subtask details</li>
                      <li>• Delete unnecessary subtasks</li>
                      <li>• Assign subtasks to team members</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">🎯 Team Operations</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Manage subtask hierarchy</li>
                      <li>• Bulk operations on subtasks</li>
                      <li>• Analyze team workload</li>
                      <li>• Mentor team members</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Demo Users Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Demo Users Reference</CardTitle>
          <CardDescription>
            Available test users and their roles for RBAC testing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {DEMO_USERS.map((demoUser) => (
              <div
                key={demoUser.id}
                className={`p-4 rounded-lg border transition-colors ${
                  selectedRole === demoUser.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{demoUser.name}</h4>
                  <Badge variant="secondary" className="capitalize text-xs">
                    {demoUser.role}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {demoUser.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {demoUser.department}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => switchToRole(demoUser.id)}
                    disabled={selectedRole === demoUser.id}
                  >
                    {selectedRole === demoUser.id ? "Current" : "Switch"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default RBACTestPage;