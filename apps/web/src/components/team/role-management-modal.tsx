// @epic-3.4-teams: Dedicated role management modal for workspace-wide permissions
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Shield, 
  Users, 
  Search,
  Crown,
  UserMinus,
  UserPlus,
  Settings,
  ChevronDown,
  Edit3,
  Save,
  Lock,
  CheckCircle
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useTeamPermissions } from "@/hooks/useTeamPermissions";

// Icon wrappers to fix TypeScript issues
const ShieldIcon = Shield as React.FC<{ className?: string }>;
const UsersIcon = Users as React.FC<{ className?: string }>;
const SearchIcon = Search as React.FC<{ className?: string }>;
const CrownIcon = Crown as React.FC<{ className?: string }>;
const UserMinusIcon = UserMinus as React.FC<{ className?: string }>;
const UserPlusIcon = UserPlus as React.FC<{ className?: string }>;
const SettingsIcon = Settings as React.FC<{ className?: string }>;
const ChevronDownIcon = ChevronDown as React.FC<{ className?: string }>;
const Edit3Icon = Edit3 as React.FC<{ className?: string }>;
const SaveIcon = Save as React.FC<{ className?: string }>;
const LockIcon = Lock as React.FC<{ className?: string }>;
const CheckCircleIcon = CheckCircle as React.FC<{ className?: string }>;

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Team {
  id: string;
  name: string;
  description: string;
  projectName: string;
  lead: string;
  members: Member[];
  color: string;
}

interface RoleManagementModalProps {
  open: boolean;
  onClose: () => void;
  selectedTeam?: Team | null;
  allTeams?: Team[];
}

const roleHierarchy = [
  { 
    value: "workspace-manager", 
    label: "Workspace Manager", 
    description: "Full workspace control, can manage all teams, projects and members",
    permissions: ["All permissions", "Workspace management", "Project creation/deletion", "Team creation/deletion", "Billing access", "User management", "Integration settings"]
  },
  { 
    value: "department-head", 
    label: "Department Head", 
    description: "Can manage teams and projects within assigned departments",
    permissions: ["Department management", "Team management", "Project oversight", "Member management", "Budget control", "Department analytics"]
  },
  { 
    value: "project-manager", 
    label: "Project Manager", 
    description: "Can manage specific projects and their associated teams",
    permissions: ["Project management", "Team coordination", "Task assignment", "Project analytics", "Resource allocation", "Timeline management"]
  },
  { 
    value: "team-lead", 
    label: "Team Lead", 
    description: "Can manage team members and assign tasks within projects",
    permissions: ["Task assignment", "Team member management", "Team analytics", "Time tracking", "Sprint planning", "Code review"]
  },
  { 
    value: "member", 
    label: "Member", 
    description: "Can view and complete assigned tasks within projects",
    permissions: ["Task completion", "Time tracking", "File access", "Basic collaboration", "Project participation", "Comment on issues"]
  },
  { 
    value: "guest", 
    label: "Guest", 
    description: "Limited access to specific projects or teams",
    permissions: ["View assigned tasks", "Basic file access", "Limited commenting", "Read-only project access"]
  }
];

const views = [
  { id: "overview", label: "Role Overview", icon: ShieldIcon },
  { id: "members", label: "Member Roles", icon: UsersIcon },
  { id: "permissions", label: "Permission Matrix", icon: SettingsIcon }
];

export default function RoleManagementModal({ 
  open, 
  onClose, 
  selectedTeam = null,
  allTeams = []
}: RoleManagementModalProps) {
  const [activeView, setActiveView] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(selectedTeam?.id || null);
  const [editingRoles, setEditingRoles] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [showMemberActions, setShowMemberActions] = useState<string | null>(null);

  // Get permissions for role management
  const globalPermissions = useTeamPermissions();

  // Get all members across teams
  const allMembers = allTeams.flatMap(team => 
    team.members.map(member => ({ 
      ...member, 
      teamId: team.id,
      teamName: team.name, 
      teamColor: team.color,
      projectName: team.projectName
    }))
  );

  // Filter members based on search and selected team
  const filteredMembers = allMembers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTeam = !selectedTeamId || member.teamId === selectedTeamId;
    
    return matchesSearch && matchesTeam;
  });

  // Role distribution stats
  const roleStats = roleHierarchy.map(role => ({
    ...role,
    count: filteredMembers.filter(m => m.role === role.value).length
  }));

  const handleRoleChange = (memberId: string, newRole: string) => {
    setEditingRoles(prev => ({ ...prev, [memberId]: newRole }));
    setHasChanges(true);
  };

  const handleSaveChanges = () => {
    // In real app, this would call API to update rolessetEditingRoles({});
    setHasChanges(false);
  };

  const handleCancelChanges = () => {
    setEditingRoles({});
    setHasChanges(false);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "workspace-manager": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "department-head": return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300";
      case "project-manager": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "team-lead": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "member": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
      case "guest": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const handleMemberAction = (action: string, member: any) => {
    setShowMemberActions(null);
    
    switch (action) {
      case 'edit':
        setSelectedMember(member);// In real app, this would open member edit modal
        break;
      case 'remove':
        if (confirm(`Remove ${member.name} from ${member.teamName}?`)) {// In real app, this would call API to remove member
        }
        break;
      case 'transfer':// In real app, this would open team transfer modal
        break;
      case 'view-profile':// In real app, this would open member profile modal
        break;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <ShieldIcon className="h-5 w-5" />
            <span>Role Management</span>
          </DialogTitle>
          <DialogDescription>
            Manage user roles and permissions across teams and projects.
          </DialogDescription>
        </DialogHeader>

        {/* View Navigation */}
        <div className="flex space-x-1 bg-muted p-1 rounded-lg flex-shrink-0">
          {views.map((view) => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={cn(
                "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                activeView === view.id 
                  ? "bg-background shadow-sm" 
                  : "hover:bg-background/50"
              )}
            >
              <view.icon className="h-4 w-4" />
              <span>{view.label}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Role Overview */}
          {activeView === "overview" && (
            <div className="space-y-6 p-1">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {roleStats.map((role) => (
                  <div key={role.value} className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={getRoleColor(role.value)}>
                        {role.label}
                      </Badge>
                      <span className="text-2xl font-bold">{role.count}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {role.description}
                    </p>
                    <div className="space-y-1">
                      {role.permissions.slice(0, 2).map((permission) => (
                        <div key={permission} className="flex items-center space-x-2 text-xs">
                          <CheckCircleIcon className="h-3 w-3 text-green-500" />
                          <span>{permission}</span>
                        </div>
                      ))}
                      {role.permissions.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{role.permissions.length - 2} more permissions
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-muted/30 rounded-lg">
                <h3 className="font-medium mb-2">Role Hierarchy</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Each role inherits permissions from roles below it in the hierarchy.
                </p>
                <div className="flex items-center space-x-4">
                  {roleHierarchy.map((role, index) => (
                    <div key={role.value} className="flex items-center space-x-2">
                      <Badge className={getRoleColor(role.value)}>
                        {role.label}
                      </Badge>
                      {index < roleHierarchy.length - 1 && (
                        <span className="text-muted-foreground">→</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Member Roles */}
          {activeView === "members" && (
            <div className="space-y-4 p-1">
              {/* Controls */}
              <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search members..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <select
                  value={selectedTeamId || ""}
                  onChange={(e) => setSelectedTeamId(e.target.value || null)}
                  className="px-3 py-2 border border-input bg-background rounded-md text-sm"
                >
                  <option value="">All Teams</option>
                  {allTeams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>

                {hasChanges && (
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={handleCancelChanges}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveChanges}>
                      <SaveIcon className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                )}
              </div>

              {/* Members Table */}
              <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="text-left p-4 font-medium text-sm">Member</th>
                        <th className="text-left p-4 font-medium text-sm">Team</th>
                        <th className="text-left p-4 font-medium text-sm">Project</th>
                        <th className="text-left p-4 font-medium text-sm">Current Role</th>
                        <th className="text-left p-4 font-medium text-sm">New Role</th>
                        <th className="text-left p-4 font-medium text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredMembers.map((member) => (
                        <tr key={member.id} className="hover:bg-muted/50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center space-x-3">
                              <Avatar className="w-8 h-8">
                                <div className="w-full h-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                                  {member.name.charAt(0)}
                                </div>
                              </Avatar>
                              <div>
                                <div className="font-medium">{member.name}</div>
                                <div className="text-sm text-muted-foreground">{member.email}</div>
                              </div>
                            </div>
                          </td>
                          
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              <div className={cn("w-3 h-3 rounded-full", (member as any).teamColor)} />
                              <span className="text-sm">{(member as any).teamName}</span>
                            </div>
                          </td>
                          
                          <td className="p-4">
                            <div className="text-sm">{(member as any).projectName}</div>
                          </td>
                          
                          <td className="p-4">
                            <Badge className={getRoleColor(member.role)}>
                              {member.role}
                            </Badge>
                          </td>

                          <td className="p-4">
                            {globalPermissions.isWorkspaceOwner ? (
                              <select
                                value={editingRoles[member.id] || member.role}
                                onChange={(e) => handleRoleChange(member.id, e.target.value)}
                                className="px-2 py-1 border border-input bg-background rounded text-sm"
                              >
                                {roleHierarchy.map((role) => (
                                  <option key={role.value} value={role.value}>
                                    {role.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                <LockIcon className="h-3 w-3" />
                                <span>No permission</span>
                              </div>
                            )}
                          </td>

                          <td className="p-4">
                            {globalPermissions.isWorkspaceOwner ? (
                              <div className="relative">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => setShowMemberActions(showMemberActions === member.id ? null : member.id)}
                                >
                                  <Edit3Icon className="h-4 w-4" />
                                </Button>
                                
                                {showMemberActions === member.id && (
                                  <div className="absolute right-0 top-10 w-48 bg-background border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg z-10">
                                    <div className="py-1">
                                      <button
                                        onClick={() => handleMemberAction('edit', member)}
                                        className="flex items-center space-x-2 px-4 py-2 text-sm hover:bg-muted w-full text-left"
                                      >
                                        <Edit3Icon className="h-4 w-4" />
                                        <span>Edit Member</span>
                                      </button>
                                      <button
                                        onClick={() => handleMemberAction('view-profile', member)}
                                        className="flex items-center space-x-2 px-4 py-2 text-sm hover:bg-muted w-full text-left"
                                      >
                                        <UsersIcon className="h-4 w-4" />
                                        <span>View Profile</span>
                                      </button>
                                      <button
                                        onClick={() => handleMemberAction('transfer', member)}
                                        className="flex items-center space-x-2 px-4 py-2 text-sm hover:bg-muted w-full text-left"
                                      >
                                        <UserPlusIcon className="h-4 w-4" />
                                        <span>Transfer Team</span>
                                      </button>
                                      <div className="border-t border-zinc-200 dark:border-zinc-800 my-1" />
                                      <button
                                        onClick={() => handleMemberAction('remove', member)}
                                        className="flex items-center space-x-2 px-4 py-2 text-sm hover:bg-muted w-full text-left text-red-600"
                                      >
                                        <UserMinusIcon className="h-4 w-4" />
                                        <span>Remove from Team</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                <LockIcon className="h-3 w-3" />
                                <span>No access</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Permission Matrix */}
          {activeView === "permissions" && (
            <div className="space-y-4 p-1">
              <div className="p-4 bg-muted/30 rounded-lg">
                <h3 className="font-medium mb-2">Permission Matrix</h3>
                <p className="text-sm text-muted-foreground">
                  Detailed view of what each role can do within the workspace and teams.
                </p>
              </div>

              <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <div className="overflow-auto max-h-[500px]">
                  <table className="w-full">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="text-left p-4 font-medium text-sm">Permission</th>
                        {roleHierarchy.map((role) => (
                          <th key={role.value} className="text-center p-4 font-medium text-sm">
                            {role.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {[
                        // Project Management
                        "Create Projects",
                        "Edit Projects",
                        "Delete Projects",
                        "Archive Projects",
                        "Manage Project Settings",
                        "View All Projects",
                        // Team Management
                        "Create Teams",
                        "Delete Teams", 
                        "Manage All Members",
                        // Analytics & Reports
                        "View Team Analytics",
                        "View Project Analytics",
                        "Create Reports",
                        // Task Management
                        "Assign Tasks",
                        "Delete Tasks",
                        "View All Tasks",
                        // General Access
                        "Track Time",
                        "Access Files",
                        "Update Profile",
                        // Workspace
                        "Manage Workspace Settings"
                      ].map((permission) => (
                        <tr key={permission} className="hover:bg-muted/50 transition-colors">
                          <td className="p-4 font-medium">{permission}</td>
                          {roleHierarchy.map((role) => (
                            <td key={role.value} className="p-4 text-center">
                              {/* Owner has all permissions */}
                              {role.value === "Owner" ? (
                                <CheckCircleIcon className="h-5 w-5 text-green-500 mx-auto" />
                              ) : /* Admin permissions */ 
                              role.value === "Admin" && (
                                permission.includes("Create") || 
                                permission.includes("Edit") || 
                                permission.includes("Manage") ||
                                permission.includes("Delete") ||
                                permission.includes("Archive") ||
                                permission.includes("View") ||
                                permission === "Assign Tasks" ||
                                permission === "Track Time" ||
                                permission === "Access Files" ||
                                permission === "Update Profile"
                              ) ? (
                                <CheckCircleIcon className="h-5 w-5 text-green-500 mx-auto" />
                              ) : /* Team Lead permissions */
                              role.value === "Team Lead" && (
                                permission === "View Team Analytics" ||
                                permission === "Create Reports" ||
                                permission === "Assign Tasks" ||
                                permission === "View All Tasks" ||
                                permission === "Track Time" ||
                                permission === "Access Files" ||
                                permission === "Update Profile" ||
                                permission === "View All Projects"
                              ) ? (
                                <CheckCircleIcon className="h-5 w-5 text-green-500 mx-auto" />
                              ) : /* Member permissions */
                              role.value === "Member" && (
                                permission === "View All Tasks" ||
                                permission === "Track Time" ||
                                permission === "Access Files" ||
                                permission === "Update Profile"
                              ) ? (
                                <CheckCircleIcon className="h-5 w-5 text-green-500 mx-auto" />
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Click outside to close dropdown */}
        {showMemberActions && (
          <div 
            className="fixed inset-0 z-0" 
            onClick={() => setShowMemberActions(null)}
          />
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t flex-shrink-0">
          <div className="text-sm text-muted-foreground">
            {filteredMembers.length} members • {allTeams.length} teams
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowMemberActions(null);
                onClose();
              }}
            >
              Close
            </Button>
            {hasChanges && (
              <Button onClick={handleSaveChanges}>
                <SaveIcon className="h-4 w-4 mr-2" />
                Save All Changes
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 