import { createFileRoute } from "@tanstack/react-router";
import { useRBACAuth } from "@/lib/permissions";
import { useProjectPermissions } from "@/lib/permissions/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Settings, Users, Folder, Trash2, Archive, Copy, Calendar, DollarSign, BarChart3, Upload, Download, Edit3, Plus, Eye } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/__dev__/project-manager-test")({
  component: ProjectManagerTestPage,
});

function ProjectManagerTestPage() {
  const { hasPermission, user, currentRole } = useRBACAuth();
  const projectPermissions = useProjectPermissions();

  // Project Manager Permission Matrix
  const projectManagerPermissions = [
    // Project Management Core
    { key: "canCreateProjects", label: "Create Projects", icon: Plus, category: "Project Management" },
    { key: "canEditProjects", label: "Edit Projects", icon: Edit3, category: "Project Management" },
    { key: "canDeleteProjects", label: "Delete Projects", icon: Trash2, category: "Project Management" },
    { key: "canArchiveProjects", label: "Archive Projects", icon: Archive, category: "Project Management" },
    { key: "canCloneProjects", label: "Clone Projects", icon: Copy, category: "Project Management" },
    { key: "canManageProjectSettings", label: "Manage Project Settings", icon: Settings, category: "Project Management" },
    
    // Team & People Management
    { key: "canManageProjectTeam", label: "Manage Project Team", icon: Users, category: "Team Management" },
    { key: "canAssignProjectManagers", label: "Assign Project Managers", icon: Users, category: "Team Management" },
    { key: "canInviteToProject", label: "Invite to Project", icon: Users, category: "Team Management" },
    { key: "canRemoveFromProject", label: "Remove from Project", icon: Users, category: "Team Management" },
    
    // Budget & Finance
    { key: "canViewProjectBudget", label: "View Project Budget", icon: Eye, category: "Financial Management" },
    { key: "canManageProjectBudget", label: "Manage Project Budget", icon: DollarSign, category: "Financial Management" },
    
    // Task Management
    { key: "canCreateTasks", label: "Create Tasks", icon: Plus, category: "Task Management" },
    { key: "canEditTasks", label: "Edit Tasks", icon: Edit3, category: "Task Management" },
    { key: "canDeleteTasks", label: "Delete Tasks", icon: Trash2, category: "Task Management" },
    { key: "canAssignTasks", label: "Assign Tasks", icon: Users, category: "Task Management" },
    { key: "canAssignTasksToMembers", label: "Assign Tasks to Members", icon: Users, category: "Task Management" },
    { key: "canReassignTasks", label: "Reassign Tasks", icon: Users, category: "Task Management" },
    { key: "canUnassignTasks", label: "Unassign Tasks", icon: Users, category: "Task Management" },
    
    // Subtask Management (Team Lead inherited)
    { key: "canCreateSubtasks", label: "Create Subtasks", icon: Plus, category: "Subtask Management" },
    { key: "canEditSubtasks", label: "Edit Subtasks", icon: Edit3, category: "Subtask Management" },
    { key: "canDeleteSubtasks", label: "Delete Subtasks", icon: Trash2, category: "Subtask Management" },
    { key: "canAssignSubtasks", label: "Assign Subtasks", icon: Users, category: "Subtask Management" },
    { key: "canManageSubtaskHierarchy", label: "Manage Subtask Hierarchy", icon: Folder, category: "Subtask Management" },
    
    // Bulk Operations
    { key: "canBulkEditTasks", label: "Bulk Edit Tasks", icon: Edit3, category: "Bulk Operations" },
    { key: "canBulkAssignTasks", label: "Bulk Assign Tasks", icon: Users, category: "Bulk Operations" },
    { key: "canImportTasks", label: "Import Tasks", icon: Upload, category: "Bulk Operations" },
    { key: "canExportTasks", label: "Export Tasks", icon: Download, category: "Bulk Operations" },
    
    // Analytics & Reporting
    { key: "canViewProjectAnalytics", label: "View Project Analytics", icon: BarChart3, category: "Analytics & Reporting" },
    { key: "canCreateReports", label: "Create Reports", icon: BarChart3, category: "Analytics & Reporting" },
    { key: "canScheduleReports", label: "Schedule Reports", icon: Calendar, category: "Analytics & Reporting" },
    
    // Communication
    { key: "canCreateProjectAnnouncements", label: "Create Project Announcements", icon: Users, category: "Communication" },
    { key: "canModerateProjectDiscussion", label: "Moderate Project Discussion", icon: Users, category: "Communication" },
  ];

  const categories = [...new Set(projectManagerPermissions.map(p => p.category))];

  const testProjectManagerAction = (action: string) => {
    switch (action) {
      case "createProject":
        if (hasPermission("canCreateProjects")) {
          toast.success("✅ Project Manager: Can create new projects");
        } else {
          toast.error("❌ Project Manager: Cannot create projects");
        }
        break;
      case "manageTeam":
        if (hasPermission("canManageProjectTeam")) {
          toast.success("✅ Project Manager: Can manage project team");
        } else {
          toast.error("❌ Project Manager: Cannot manage project team");
        }
        break;
      case "manageBudget":
        if (hasPermission("canManageProjectBudget")) {
          toast.success("✅ Project Manager: Can manage project budget");
        } else {
          toast.error("❌ Project Manager: Cannot manage project budget");
        }
        break;
      case "bulkOperations":
        if (hasPermission("canBulkEditTasks") && hasPermission("canBulkAssignTasks")) {
          toast.success("✅ Project Manager: Can perform bulk task operations");
        } else {
          toast.error("❌ Project Manager: Cannot perform bulk task operations");
        }
        break;
      case "subtasks":
        if (hasPermission("canCreateSubtasks") && hasPermission("canManageSubtaskHierarchy")) {
          toast.success("✅ Project Manager: Has full subtask management (inherited from Team Lead)");
        } else {
          toast.error("❌ Project Manager: Missing subtask management permissions");
        }
        break;
      default:
        toast.info(`Testing ${action} action...`);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">🛡️ Project Manager Permissions Test</h1>
        <p className="text-muted-foreground">
          Comprehensive testing interface for project manager role permissions and capabilities
        </p>
      </div>

      {/* Current User Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Current User Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">User Email</p>
              <p className="text-sm text-muted-foreground">{user?.email || "Not logged in"}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Current Role</p>
              <Badge variant={currentRole === "project-manager" ? "default" : "secondary"}>
                {currentRole || "No role assigned"}
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Project Manager Status</p>
              <Badge variant={currentRole === "project-manager" ? "default" : "destructive"}>
                {currentRole === "project-manager" ? "✅ Active Project Manager" : "❌ Not Project Manager"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permission Categories */}
      {categories.map((category) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-lg">{category}</CardTitle>
            <CardDescription>
              Project manager permissions for {category.toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projectManagerPermissions
                .filter(p => p.category === category)
                .map((permission) => {
                  const Icon = permission.icon;
                  const hasAccess = hasPermission(permission.key as any);
                  
                  return (
                    <div
                      key={permission.key}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        hasAccess 
                          ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950" 
                          : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${hasAccess ? "text-green-600" : "text-red-600"}`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{permission.label}</p>
                        <p className="text-xs text-muted-foreground">{permission.key}</p>
                      </div>
                      {hasAccess ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Action Testing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Project Manager Action Tests
          </CardTitle>
          <CardDescription>
            Test key project manager workflows and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button
              onClick={() => testProjectManagerAction("createProject")}
              variant="outline"
              className="h-auto flex-col gap-2 p-4"
            >
              <Plus className="h-5 w-5" />
              <div className="text-center">
                <p className="font-medium">Create Project</p>
                <p className="text-xs text-muted-foreground">Test project creation</p>
              </div>
            </Button>

            <Button
              onClick={() => testProjectManagerAction("manageTeam")}
              variant="outline"
              className="h-auto flex-col gap-2 p-4"
            >
              <Users className="h-5 w-5" />
              <div className="text-center">
                <p className="font-medium">Manage Team</p>
                <p className="text-xs text-muted-foreground">Test team management</p>
              </div>
            </Button>

            <Button
              onClick={() => testProjectManagerAction("manageBudget")}
              variant="outline"
              className="h-auto flex-col gap-2 p-4"
            >
              <DollarSign className="h-5 w-5" />
              <div className="text-center">
                <p className="font-medium">Manage Budget</p>
                <p className="text-xs text-muted-foreground">Test budget management</p>
              </div>
            </Button>

            <Button
              onClick={() => testProjectManagerAction("bulkOperations")}
              variant="outline"
              className="h-auto flex-col gap-2 p-4"
            >
              <Edit3 className="h-5 w-5" />
              <div className="text-center">
                <p className="font-medium">Bulk Operations</p>
                <p className="text-xs text-muted-foreground">Test bulk task operations</p>
              </div>
            </Button>

            <Button
              onClick={() => testProjectManagerAction("subtasks")}
              variant="outline"
              className="h-auto flex-col gap-2 p-4"
            >
              <Folder className="h-5 w-5" />
              <div className="text-center">
                <p className="font-medium">Subtask Management</p>
                <p className="text-xs text-muted-foreground">Test subtask controls</p>
              </div>
            </Button>

            <Button
              onClick={() => testProjectManagerAction("analytics")}
              variant="outline"
              className="h-auto flex-col gap-2 p-4"
            >
              <BarChart3 className="h-5 w-5" />
              <div className="text-center">
                <p className="font-medium">Analytics</p>
                <p className="text-xs text-muted-foreground">Test analytics access</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Permission Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Permission Summary</CardTitle>
          <CardDescription>
            Overall project manager permission status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {categories.map((category) => {
                const categoryPermissions = projectManagerPermissions.filter(p => p.category === category);
                const grantedPermissions = categoryPermissions.filter(p => hasPermission(p.key as any));
                const percentage = Math.round((grantedPermissions.length / categoryPermissions.length) * 100);
                
                return (
                  <div key={category} className="text-center space-y-2">
                    <p className="text-sm font-medium">{category}</p>
                    <div className="text-2xl font-bold">
                      {grantedPermissions.length}/{categoryPermissions.length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {percentage}% granted
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 