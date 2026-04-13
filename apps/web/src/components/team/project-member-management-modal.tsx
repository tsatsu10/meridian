// @epic-3.4-teams: Project member management modal for settings page
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Users, 
  Search,
  Crown,
  UserMinus,
  UserPlus,
  Settings,
  Mail,
  Check,
  X,
  AlertTriangle,
  Shield,
  Clock,
  Activity
} from "lucide-react";
import { cn } from "@/lib/cn";
import { toast } from "sonner";
import type { WorkspaceUser } from "@/types/workspace-user";

// Icon wrappers to fix TypeScript issues
const UsersIcon = Users as React.FC<{ className?: string }>;
const SearchIcon = Search as React.FC<{ className?: string }>;
const CrownIcon = Crown as React.FC<{ className?: string }>;
const UserMinusIcon = UserMinus as React.FC<{ className?: string }>;
const UserPlusIcon = UserPlus as React.FC<{ className?: string }>;
const SettingsIcon = Settings as React.FC<{ className?: string }>;
const MailIcon = Mail as React.FC<{ className?: string }>;
const CheckIcon = Check as React.FC<{ className?: string }>;
const XIcon = X as React.FC<{ className?: string }>;
const AlertTriangleIcon = AlertTriangle as React.FC<{ className?: string }>;
const ShieldIcon = Shield as React.FC<{ className?: string }>;
const ClockIcon = Clock as React.FC<{ className?: string }>;
const ActivityIcon = Activity as React.FC<{ className?: string }>;

interface ProjectMember extends WorkspaceUser {
  projectRole?: string;
  joinDate?: string;
  lastActive?: string;
  tasksCount?: number;
  hoursLogged?: number;
}

interface ProjectMemberManagementModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  projectMembers: ProjectMember[];
  availableUsers: WorkspaceUser[];
  onMemberAdded?: (member: ProjectMember) => void;
  onMemberRemoved?: (memberId: string) => void;
  onMemberRoleChanged?: (memberId: string, newRole: string) => void;
}

// @epic-1.1-rbac: Updated project roles to align with current user role system
const projectRoles = [
  { value: "workspace-manager", label: "Workspace Manager", description: "Full workspace control and management", icon: CrownIcon },
  { value: "department-head", label: "Department Head", description: "Department oversight across multiple projects", icon: ShieldIcon },
  { value: "project-manager", label: "Project Manager", description: "Full control over assigned projects", icon: SettingsIcon },
  { value: "team-lead", label: "Team Lead", description: "Team coordination and task assignment", icon: UsersIcon },
  { value: "member", label: "Member", description: "Standard team member with basic participation", icon: ActivityIcon },
  { value: "project-viewer", label: "Project Viewer", description: "Read-only project access", icon: ShieldIcon },
  { value: "workspace-viewer", label: "Workspace Viewer", description: "Read-only workspace access", icon: ShieldIcon },
  { value: "client", label: "Client", description: "External client with project visibility", icon: ActivityIcon },
  { value: "contractor", label: "Contractor", description: "External contractor with specific project access", icon: ActivityIcon },
  { value: "stakeholder", label: "Stakeholder", description: "External stakeholder with project visibility", icon: ShieldIcon },
  { value: "guest", label: "Guest", description: "Temporary access with limited permissions", icon: ClockIcon },
];

export default function ProjectMemberManagementModal({ 
  open, 
  onClose, 
  projectId,
  projectName,
  projectMembers,
  availableUsers,
  onMemberAdded,
  onMemberRemoved,
  onMemberRoleChanged
}: ProjectMemberManagementModalProps) {
  const [activeTab, setActiveTab] = useState<"members" | "add" | "roles">("members");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [pendingRoleChanges, setPendingRoleChanges] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  // Filter available users (not already in project)
  const availableToAdd = availableUsers.filter(user => 
    !projectMembers.some(member => member.userEmail === user.userEmail) &&
    (user.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     user.userEmail.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Filter current project members
  const filteredMembers = projectMembers.filter(member =>
    member.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.projectRole?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddMembers = async () => {
    if (selectedUsers.size === 0) {
      toast.error("Please select at least one member to add");
      return;
    }

    setIsLoading(true);
    try {
      // Simulate API call - replace with actual implementation
      for (const userId of selectedUsers) {
        const user = availableUsers.find(u => u.userEmail === userId);
        if (user && user.userEmail) {
          const newMember: ProjectMember = {
            ...user,
            projectRole: "member", // Default role updated to match current system
            joinDate: new Date().toISOString(),
            tasksCount: 0,
            hoursLogged: 0
          };
          onMemberAdded?.(newMember);
        }
      }
      
      setSelectedUsers(new Set());
      setActiveTab("members");
      toast.success(`Added ${selectedUsers.size} member(s) to ${projectName}`);
    } catch (error) {
      toast.error("Failed to add members");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    const member = projectMembers.find(m => m.userEmail === memberId);
    if (!member || !member.userEmail) return;

    try {
      // Simulate API call - replace with actual implementation
      onMemberRemoved?.(member.userEmail);
      toast.success(`Removed ${member.userName} from ${projectName}`);
    } catch (error) {
      toast.error("Failed to remove member");
    }
  };

  const handleRoleChange = (memberId: string, newRole: string) => {
    setPendingRoleChanges(prev => ({ ...prev, [memberId]: newRole }));
  };

  const handleSaveRoleChanges = async () => {
    if (Object.keys(pendingRoleChanges).length === 0) return;

    setIsLoading(true);
    try {
      // Simulate API call - replace with actual implementation
      for (const [memberId, newRole] of Object.entries(pendingRoleChanges)) {
        onMemberRoleChanged?.(memberId, newRole);
      }
      
      setPendingRoleChanges({});
      toast.success("Role changes saved successfully");
    } catch (error) {
      toast.error("Failed to save role changes");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteByEmail = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    try {
      // Simulate API call - replace with actual implementation
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
    } catch (error) {
      toast.error("Failed to send invitation");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UsersIcon className="h-5 w-5" />
            <span>Manage Project Team</span>
          </DialogTitle>
          <DialogDescription>
            Manage members and roles for {projectName}
          </DialogDescription>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800">
          {[
            { id: "members", label: "Current Members", count: projectMembers.length },
            { id: "add", label: "Add Members", count: availableToAdd.length },
            { id: "roles", label: "Role Management", count: Object.keys(pendingRoleChanges).length }
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
              {tab.count > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {tab.count}
                </Badge>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-1">
          {/* Current Members Tab */}
          {activeTab === "members" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Project Members ({projectMembers.length})</h3>
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search members..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>

              <div className="space-y-2">
                {filteredMembers.length > 0 ? (
                  filteredMembers.map((member) => (
                    <div
                      key={member.userEmail}
                      className="flex items-center justify-between p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-10 h-10">
                          <div className="w-full h-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                            {member.userName?.charAt(0) || "?"}
                          </div>
                        </Avatar>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{member.userName || "Unknown User"}</span>
                            {member.projectRole === "project-lead" && (
                              <Badge variant="secondary" className="text-xs">
                                <CrownIcon className="w-3 h-3 mr-1" />
                                Lead
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">{member.userEmail}</div>
                          {member.tasksCount !== undefined && (
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
                              <span>{member.tasksCount} tasks</span>
                              {member.hoursLogged !== undefined && (
                                <span>{member.hoursLogged}h logged</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Select
                          value={member.projectRole || "developer"}
                          onValueChange={(value) => handleRoleChange(member.userEmail, value)}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {projectRoles.map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                <div className="flex items-center space-x-2">
                                  <role.icon className="w-4 h-4" />
                                  <span>{role.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        {projectMembers.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(member.userEmail)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <UserMinusIcon className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <UsersIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No members found</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Add Members Tab */}
          {activeTab === "add" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Add New Members</h3>
                <Badge variant="outline">{selectedUsers.size} selected</Badge>
              </div>

              <div className="space-y-4">
                {/* Invite by Email */}
                <div className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-muted/20">
                  <h4 className="font-medium mb-3">Invite by Email</h4>
                  <div className="flex space-x-2">
                    <Input
                      type="email"
                      placeholder="colleague@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleInviteByEmail}
                      disabled={isLoading || !inviteEmail.trim()}
                    >
                      <MailIcon className="w-4 h-4 mr-2" />
                      Invite
                    </Button>
                  </div>
                </div>

                {/* Search Available Users */}
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search workspace members..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Available Users List */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {availableToAdd.length > 0 ? (
                    availableToAdd.map((user) => (
                      <div
                        key={user.userEmail}
                        onClick={() => toggleUserSelection(user.userEmail)}
                        className="flex items-center justify-between p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-muted/50 cursor-pointer"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={cn(
                            "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                            selectedUsers.has(user.userEmail)
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-gray-300 hover:border-primary"
                          )}>
                            {selectedUsers.has(user.userEmail) && (
                              <CheckIcon className="h-3 w-3" />
                            )}
                          </div>
                          <Avatar className="w-8 h-8">
                            <div className="w-full h-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                              {user.userName?.charAt(0) || "?"}
                            </div>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.userName || "Unknown User"}</div>
                            <div className="text-sm text-muted-foreground">{user.userEmail}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <UserPlusIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No available members to add</p>
                      <p className="text-sm mt-1">All workspace members are already in this project</p>
                    </div>
                  )}
                </div>

                {/* Add Button */}
                {selectedUsers.size > 0 && (
                  <div className="flex justify-end pt-4 border-t">
                    <Button 
                      onClick={handleAddMembers}
                      disabled={isLoading}
                    >
                      <UserPlusIcon className="w-4 h-4 mr-2" />
                      Add {selectedUsers.size} Member{selectedUsers.size > 1 ? 's' : ''}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Role Management Tab */}
          {activeTab === "roles" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Role Management</h3>
                {Object.keys(pendingRoleChanges).length > 0 && (
                  <Button onClick={handleSaveRoleChanges} disabled={isLoading}>
                    <CheckIcon className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                )}
              </div>

              {/* Role Descriptions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projectRoles.map((role) => {
                  const memberCount = projectMembers.filter(m => m.projectRole === role.value).length;
                  return (
                    <div key={role.value} className="p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <role.icon className="w-4 h-4" />
                          <span className="font-medium">{role.label}</span>
                        </div>
                        <Badge variant="outline">{memberCount}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{role.description}</p>
                    </div>
                  );
                })}
              </div>

              {/* Pending Changes */}
              {Object.keys(pendingRoleChanges).length > 0 && (
                <div className="p-4 border border-amber-200 dark:border-amber-800 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangleIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="font-medium text-amber-800 dark:text-amber-200">Pending Changes</span>
                  </div>
                  <div className="space-y-1">
                    {Object.entries(pendingRoleChanges).map(([memberId, newRole]) => {
                      const member = projectMembers.find(m => m.userEmail === memberId);
                      const role = projectRoles.find(r => r.value === newRole);
                      return (
                        <div key={memberId} className="text-sm text-amber-700 dark:text-amber-300">
                          {member?.userName} → {role?.label}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <div className="text-sm text-muted-foreground">
            {projectMembers.length} member{projectMembers.length !== 1 ? 's' : ''} in {projectName}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 