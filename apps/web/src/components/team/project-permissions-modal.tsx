// @epic-3.4-teams: Project-specific permissions management modal
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Shield, 
  Users,
  Lock,
  Unlock,
  Settings,
  Eye,
  Edit,
  Trash2,
  Plus,
  Save,
  RotateCcw,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { cn } from "@/lib/cn";
import { toast } from "sonner";

// Icon wrappers
const ShieldIcon = Shield as React.FC<{ className?: string }>;
const UsersIcon = Users as React.FC<{ className?: string }>;
const LockIcon = Lock as React.FC<{ className?: string }>;
const UnlockIcon = Unlock as React.FC<{ className?: string }>;
const SettingsIcon = Settings as React.FC<{ className?: string }>;
const EyeIcon = Eye as React.FC<{ className?: string }>;
const EditIcon = Edit as React.FC<{ className?: string }>;
const Trash2Icon = Trash2 as React.FC<{ className?: string }>;
const PlusIcon = Plus as React.FC<{ className?: string }>;
const SaveIcon = Save as React.FC<{ className?: string }>;
const RotateCcwIcon = RotateCcw as React.FC<{ className?: string }>;
const AlertTriangleIcon = AlertTriangle as React.FC<{ className?: string }>;
const CheckCircleIcon = CheckCircle as React.FC<{ className?: string }>;

interface ProjectPermission {
  id: string;
  category: string;
  name: string;
  description: string;
  icon: React.FC<{ className?: string }>;
  defaultValue: boolean;
}

interface RolePermissions {
  [roleId: string]: {
    [permissionId: string]: boolean;
  };
}

interface ProjectRole {
  id: string;
  name: string;
  description: string;
  color: string;
  memberCount: number;
  isSystemRole: boolean;
}

interface ProjectPermissionsModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  roles: ProjectRole[];
  permissions: RolePermissions;
  onPermissionsUpdated?: (permissions: RolePermissions) => void;
}

// Define project-specific permissions
const projectPermissions: ProjectPermission[] = [
  // Task Management
  { 
    id: "task.create", 
    category: "Task Management", 
    name: "Create Tasks", 
    description: "Create new tasks in the project",
    icon: PlusIcon,
    defaultValue: true 
  },
  { 
    id: "task.edit", 
    category: "Task Management", 
    name: "Edit Tasks", 
    description: "Modify existing tasks and their details",
    icon: EditIcon,
    defaultValue: true 
  },
  { 
    id: "task.delete", 
    category: "Task Management", 
    name: "Delete Tasks", 
    description: "Remove tasks from the project",
    icon: Trash2Icon,
    defaultValue: false 
  },
  { 
    id: "task.assign", 
    category: "Task Management", 
    name: "Assign Tasks", 
    description: "Assign tasks to team members",
    icon: UsersIcon,
    defaultValue: false 
  },
  { 
    id: "task.view_all", 
    category: "Task Management", 
    name: "View All Tasks", 
    description: "See all tasks regardless of assignment",
    icon: EyeIcon,
    defaultValue: true 
  },

  // Project Management
  { 
    id: "project.edit", 
    category: "Project Management", 
    name: "Edit Project", 
    description: "Modify project settings and details",
    icon: SettingsIcon,
    defaultValue: false 
  },
  { 
    id: "project.delete", 
    category: "Project Management", 
    name: "Delete Project", 
    description: "Permanently delete the project",
    icon: Trash2Icon,
    defaultValue: false 
  },
  { 
    id: "project.archive", 
    category: "Project Management", 
    name: "Archive Project", 
    description: "Archive completed or cancelled projects",
    icon: SettingsIcon,
    defaultValue: false 
  },
  { 
    id: "project.clone", 
    category: "Project Management", 
    name: "Clone Project", 
    description: "Create a copy of the project structure",
    icon: PlusIcon,
    defaultValue: false 
  },
  { 
    id: "project.manage_members", 
    category: "Project Management", 
    name: "Manage Members", 
    description: "Add, remove, and manage project members",
    icon: UsersIcon,
    defaultValue: false 
  },
  { 
    id: "project.manage_budget", 
    category: "Project Management", 
    name: "Manage Budget", 
    description: "Control project budget and financial tracking",
    icon: SettingsIcon,
    defaultValue: false 
  },
  { 
    id: "project.view_analytics", 
    category: "Project Management", 
    name: "View Analytics", 
    description: "Access project analytics and reports",
    icon: EyeIcon,
    defaultValue: false 
  },

  // Time Tracking
  { 
    id: "time.log", 
    category: "Time Tracking", 
    name: "Log Time", 
    description: "Track time spent on tasks",
    icon: EditIcon,
    defaultValue: true 
  },
  { 
    id: "time.view_all", 
    category: "Time Tracking", 
    name: "View All Time Logs", 
    description: "See time logs from all team members",
    icon: EyeIcon,
    defaultValue: false 
  },
  { 
    id: "time.edit_all", 
    category: "Time Tracking", 
    name: "Edit Time Logs", 
    description: "Modify time logs from any team member",
    icon: EditIcon,
    defaultValue: false 
  },

  // File Management
  { 
    id: "file.upload", 
    category: "File Management", 
    name: "Upload Files", 
    description: "Upload files to the project",
    icon: PlusIcon,
    defaultValue: true 
  },
  { 
    id: "file.delete", 
    category: "File Management", 
    name: "Delete Files", 
    description: "Remove files from the project",
    icon: Trash2Icon,
    defaultValue: false 
  },
  { 
    id: "file.manage_all", 
    category: "File Management", 
    name: "Manage All Files", 
    description: "Edit and organize all project files",
    icon: SettingsIcon,
    defaultValue: false 
  },

  // Communication
  { 
    id: "comm.post", 
    category: "Communication", 
    name: "Post Messages", 
    description: "Send messages in project channels",
    icon: EditIcon,
    defaultValue: true 
  },
  { 
    id: "comm.moderate", 
    category: "Communication", 
    name: "Moderate Discussions", 
    description: "Delete messages and manage discussions",
    icon: ShieldIcon,
    defaultValue: false 
  },
];

// @epic-1.1-rbac: Updated system roles to align with current user role system
const systemRoles: ProjectRole[] = [
  { 
    id: "workspace-manager", 
    name: "Workspace Manager", 
    description: "Full workspace control and management",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    memberCount: 0,
    isSystemRole: true
  },
  { 
    id: "department-head", 
    name: "Department Head", 
    description: "Department oversight across multiple projects",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    memberCount: 0,
    isSystemRole: true
  },
  { 
    id: "project-manager", 
    name: "Project Manager", 
    description: "Full control over assigned projects",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    memberCount: 0,
    isSystemRole: true
  },
  { 
    id: "team-lead", 
    name: "Team Lead", 
    description: "Team coordination and task assignment",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    memberCount: 0,
    isSystemRole: true
  },
  { 
    id: "member", 
    name: "Member", 
    description: "Standard team member with basic participation",
    color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
    memberCount: 0,
    isSystemRole: true
  },
  { 
    id: "project-viewer", 
    name: "Project Viewer", 
    description: "Read-only project access",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    memberCount: 0,
    isSystemRole: true
  },
  { 
    id: "workspace-viewer", 
    name: "Workspace Viewer", 
    description: "Read-only workspace access",
    color: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
    memberCount: 0,
    isSystemRole: true
  },
  { 
    id: "client", 
    name: "Client", 
    description: "External client with project visibility",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    memberCount: 0,
    isSystemRole: true
  },
  { 
    id: "contractor", 
    name: "Contractor", 
    description: "External contractor with specific project access",
    color: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
    memberCount: 0,
    isSystemRole: true
  },
  { 
    id: "stakeholder", 
    name: "Stakeholder", 
    description: "External stakeholder with project visibility",
    color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
    memberCount: 0,
    isSystemRole: true
  },
  { 
    id: "guest", 
    name: "Guest", 
    description: "Temporary access with limited permissions",
    color: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
    memberCount: 0,
    isSystemRole: true
  },
];

export default function ProjectPermissionsModal({ 
  open, 
  onClose, 
  projectId,
  projectName,
  roles: propRoles,
  permissions: initialPermissions,
  onPermissionsUpdated
}: ProjectPermissionsModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "roles" | "permissions">("overview");
  const [selectedRole, setSelectedRole] = useState<string>("workspace-manager");
  const [permissions, setPermissions] = useState<RolePermissions>(initialPermissions);
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Merge system roles with provided roles
  const roles = [...systemRoles, ...propRoles.filter(r => !r.isSystemRole)];

  // Group permissions by category
  const permissionsByCategory = projectPermissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, ProjectPermission[]>);

  const handlePermissionChange = (roleId: string, permissionId: string, value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        [permissionId]: value
      }
    }));
    setHasChanges(true);
  };

  const handleSaveChanges = async () => {
    setIsLoading(true);
    try {
      // Simulate API call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onPermissionsUpdated?.(permissions);
      setHasChanges(false);
      toast.success("Permissions updated successfully");
    } catch (error) {
      toast.error("Failed to update permissions");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetToDefaults = () => {
    const defaultPermissions: RolePermissions = {};
    
    roles.forEach(role => {
      defaultPermissions[role.id] = {};
      projectPermissions.forEach(permission => {
        // Set defaults based on role type
        if (role.id === "workspace-manager") {
          defaultPermissions[role.id][permission.id] = true;
        } else if (role.id === "department-head" || role.id === "project-manager") {
          defaultPermissions[role.id][permission.id] = permission.category !== "Project Management" || permission.id === "project.view_analytics";
        } else if (role.id === "project-viewer" || role.id === "workspace-viewer" || role.id === "stakeholder" || role.id === "guest") {
          defaultPermissions[role.id][permission.id] = permission.name.includes("View") || permission.name.includes("Log Time");
        } else {
          defaultPermissions[role.id][permission.id] = permission.defaultValue;
        }
      });
    });
    
    setPermissions(defaultPermissions);
    setHasChanges(true);
    toast.info("Reset to default permissions");
  };

  const getPermissionCount = (roleId: string) => {
    return Object.values(permissions[roleId] || {}).filter(Boolean).length;
  };

  const getRoleIcon = (roleId: string) => {
    switch (roleId) {
      case "workspace-manager": return <ShieldIcon className="w-4 h-4" />;
      case "department-head": return <SettingsIcon className="w-4 h-4" />;
      case "project-manager": return <SettingsIcon className="w-4 h-4" />;
      case "team-lead": return <UsersIcon className="w-4 h-4" />;
      case "member": return <EditIcon className="w-4 h-4" />;
      case "project-viewer": return <EyeIcon className="w-4 h-4" />;
      case "workspace-viewer": return <EyeIcon className="w-4 h-4" />;
      case "client": return <EditIcon className="w-4 h-4" />;
      case "contractor": return <EditIcon className="w-4 h-4" />;
      case "stakeholder": return <EyeIcon className="w-4 h-4" />;
      case "guest": return <EyeIcon className="w-4 h-4" />;
      default: return <UsersIcon className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <ShieldIcon className="h-5 w-5" />
            <span>Project Permissions</span>
          </DialogTitle>
          <DialogDescription>
            Manage role-based permissions for {projectName}
          </DialogDescription>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800">
          {[
            { id: "overview", label: "Overview" },
            { id: "roles", label: "Roles" },
            { id: "permissions", label: "Permissions Matrix" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-1">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Roles Summary */}
                <div className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                  <h3 className="text-lg font-medium mb-3 flex items-center space-x-2">
                    <UsersIcon className="w-5 h-5" />
                    <span>Project Roles</span>
                  </h3>
                  <div className="space-y-2">
                    {roles.map(role => (
                      <div key={role.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getRoleIcon(role.id)}
                          <span className="text-sm font-medium">{role.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {getPermissionCount(role.id)} permissions
                          </Badge>
                          <Badge className={cn("text-xs", role.color)}>
                            {role.memberCount} members
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Permission Categories */}
                <div className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                  <h3 className="text-lg font-medium mb-3 flex items-center space-x-2">
                    <ShieldIcon className="w-5 h-5" />
                    <span>Permission Categories</span>
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(permissionsByCategory).map(([category, perms]) => (
                      <div key={category} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{category}</span>
                        <Badge variant="outline" className="text-xs">
                          {perms.length} permissions
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <h3 className="text-lg font-medium mb-3">Quick Actions</h3>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={handleResetToDefaults}>
                    <RotateCcwIcon className="w-4 h-4 mr-2" />
                    Reset to Defaults
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab("permissions")}>
                    <EditIcon className="w-4 h-4 mr-2" />
                    Edit Permissions
                  </Button>
                </div>
              </div>

              {/* Pending Changes Alert */}
              {hasChanges && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    <span className="font-medium text-amber-800 dark:text-amber-200">Unsaved Changes</span>
                  </div>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                    You have made changes to the permissions. Don't forget to save them.
                  </p>
                  <Button size="sm" onClick={handleSaveChanges} disabled={isLoading}>
                    <SaveIcon className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Roles Tab */}
          {activeTab === "roles" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Project Roles</h3>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(role => (
                      <SelectItem key={role.id} value={role.id}>
                        <div className="flex items-center space-x-2">
                          {getRoleIcon(role.id)}
                          <span>{role.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {roles.map(role => (
                <div
                  key={role.id}
                  className={cn(
                    "p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg",
                    selectedRole === role.id ? "ring-2 ring-primary" : ""
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {getRoleIcon(role.id)}
                      <div>
                        <div className="font-medium">{role.name}</div>
                        <div className="text-sm text-muted-foreground">{role.description}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {getPermissionCount(role.id)} permissions
                      </Badge>
                      <Badge className={cn("text-xs", role.color)}>
                        {role.memberCount} members
                      </Badge>
                    </div>
                  </div>

                  {/* Role permissions summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {Object.entries(permissionsByCategory).map(([category, perms]) => {
                      const activePerms = perms.filter(p => permissions[role.id]?.[p.id]);
                      return (
                        <div key={category} className="text-center p-2 bg-muted/50 rounded">
                          <div className="text-sm font-medium">{activePerms.length}/{perms.length}</div>
                          <div className="text-xs text-muted-foreground">{category}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Permissions Matrix Tab */}
          {activeTab === "permissions" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Permissions Matrix</h3>
                <div className="flex items-center space-x-2">
                  {hasChanges && (
                    <Badge variant="secondary" className="text-xs">
                      Unsaved changes
                    </Badge>
                  )}
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map(role => (
                        <SelectItem key={role.id} value={role.id}>
                          <div className="flex items-center space-x-2">
                            {getRoleIcon(role.id)}
                            <span>{role.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {Object.entries(permissionsByCategory).map(([category, perms]) => (
                <div key={category} className="border border-zinc-200 dark:border-zinc-700 rounded-lg">
                  <div className="p-3 border-b border-zinc-200 dark:border-zinc-700 bg-muted/50">
                    <h4 className="font-medium">{category}</h4>
                  </div>
                  <div className="p-3 space-y-3">
                    {perms.map(permission => (
                      <div key={permission.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <permission.icon className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium text-sm">{permission.name}</div>
                            <div className="text-xs text-muted-foreground">{permission.description}</div>
                          </div>
                        </div>
                        <Switch
                          checked={permissions[selectedRole]?.[permission.id] || false}
                          onCheckedChange={(value) => 
                            handlePermissionChange(selectedRole, permission.id, value)
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between pt-4 border-t">
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {hasChanges && (
              <Button variant="outline" onClick={handleResetToDefaults}>
                <RotateCcwIcon className="w-4 h-4 mr-2" />
                Reset
              </Button>
            )}
          </div>
          
          {hasChanges && (
            <Button onClick={handleSaveChanges} disabled={isLoading}>
              <SaveIcon className="w-4 h-4 mr-2" />
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 