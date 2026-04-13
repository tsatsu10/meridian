import { useState, useEffect, useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, 
  UserPlus, 
  UserMinus,
  Crown,
  Mail,
  Settings,
  Copy,
  Shield,
  CheckCircle,
  Clock,
  AlertTriangle,
  Sparkles,
  User,
  UserCheck,
  Layout,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import useAuth from "@/components/providers/auth-provider/hooks/use-auth";
import { InviteUserModal } from "@/components/shared/modals/invite-user-modal";
import LazyDashboardLayout from "@/components/performance/lazy-dashboard-layout";
import { ClickableUserProfile } from "@/components/user/clickable-user-profile";
import { useWorkspaceStore } from "@/store/workspace";
import { withErrorBoundary } from "@/components/dashboard/universal-error-boundary";

export const Route = createFileRoute("/dashboard/settings/team-management")({
  component: withErrorBoundary(TeamManagementSettings, "Team Management"),
});

type TeamRole = "workspace-manager" | "department-head" | "project-manager" | "team-lead" | "member" | "client" | "contractor" | "stakeholder" | "workspace-viewer" | "project-viewer" | "guest";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  avatar?: string;
  status: "active" | "pending" | "inactive";
  joinDate: string;
  lastActive: string;
  workspaceId?: string;
  departmentId?: string;
}

import { API_BASE_URL } from "@/constants/urls";

// API Functions
const fetchTeamMembers = async (): Promise<TeamMember[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/rbac/assignments`, {
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch team members: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Transform the assignments data to match our TeamMember interface
    const members = data.assignments?.map((assignment: any, index: number) => ({
      id: assignment.assignment.userId || `member-${index}-${Date.now()}`, // Ensure unique ID
      name: assignment.user?.name || assignment.user?.email || "Unknown User",
      email: assignment.user?.email || "",
      role: assignment.assignment.role,
      status: assignment.assignment.isActive ? "active" : "inactive",
      joinDate: new Date(assignment.assignment.assignedAt).toISOString().split('T')[0],
      lastActive: "Recently", // Placeholder
      workspaceId: assignment.assignment.workspaceId,
      departmentId: assignment.assignment.departmentId
    })) || [];
    
    // Remove duplicates based on user ID and email to prevent duplicate keys
    const uniqueMembers = members.reduce((acc: TeamMember[], member: TeamMember) => {
      const existing = acc.find(m => m.id === member.id || m.email === member.email);
      if (!existing) {
        acc.push(member);
      }
      return acc;
    }, []);
    
    return uniqueMembers;
  } catch (error) {
    console.error("Error fetching team members:", error);
    return [];
  }
};

const inviteTeamMember = async (email: string, role: TeamRole): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/rbac/assignments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      userEmail: email,
      role: role,
      reason: `Invited as ${role}`
    })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to invite member: ${response.status}`);
  }
  
  return response.json();
};

const updateMemberRole = async (userId: string, newRole: TeamRole): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/rbac/assignments/${userId}/role`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      role: newRole,
      reason: `Role changed to ${newRole}`
    })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update role: ${response.status}`);
  }
  
  return response.json();
};

const removeMember = async (userId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/rbac/assignments/${userId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include"
  });
  
  if (!response.ok) {
    throw new Error(`Failed to remove member: ${response.status}`);
  }
  
  return response.json();
};

function TeamManagementSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // 📧 SECURE INVITATION SYSTEM - New state for invitation modal
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  // Get real workspace from Zustand store
  const workspace = useWorkspaceStore((state) => state.workspace);
  const currentWorkspace = workspace;
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch team members from API
  const { data: teamMembers = [], refetch } = useQuery({
    queryKey: ["teamMembers"],
    queryFn: fetchTeamMembers,
    enabled: !!user
  });

  // Mutations for team management
  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: TeamRole }) => updateMemberRole(userId, role),
    onSuccess: () => {
      Promise.resolve().then(() => {
        toast.success("Role updated successfully");
      });
      refetch();
    },
    onError: (error: Error) => {
      Promise.resolve().then(() => {
        toast.error(`Failed to update role: ${error.message}`);
      });
    }
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => removeMember(userId),
    onSuccess: () => {
      Promise.resolve().then(() => {
        toast.success("Team member removed successfully");
      });
      refetch();
    },
    onError: (error: Error) => {
      Promise.resolve().then(() => {
        toast.error(`Failed to remove member: ${error.message}`);
      });
    }
  });

  // Team settings - default secure configuration with persistence
  const [teamSettings, setTeamSettings] = useState({
    allowMemberInvites: false,
    requireAdminApproval: true,
    enableGuestAccess: false,
    autoRemoveInactive: false,
    inactivityDays: 90
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('teamSettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setTeamSettings(parsedSettings);
      } catch (error) {
        console.error('Failed to parse saved team settings:', error);
      }
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('teamSettings', JSON.stringify(teamSettings));
  }, [teamSettings]);

  const rolePermissions = {
    "workspace-manager": ["All permissions", "Billing access", "Delete workspace"],
    "department-head": ["Manage department", "Project oversight", "View analytics"],
    "project-manager": ["Manage projects", "Project settings", "View reports"],
    "team-lead": ["Lead team", "Manage tasks", "View team reports"],
    "member": ["Create projects", "Manage tasks", "View reports"],
    "client": ["View projects", "Comment on tasks", "Basic access"],
    "contractor": ["View assigned tasks", "Track time", "Submit reports"],
    "stakeholder": ["View projects", "View reports", "Readonly access"],
    "workspace-viewer": ["View workspace", "Basic access"],
    "project-viewer": ["View projects", "Comment on tasks", "Basic access"],
    "guest": ["View projects", "Comment", "Limited access"]
  };

  const handleRemoveMember = async (memberId: string) => {
    removeMutation.mutate(memberId);
  };

  const handleRoleChange = async (memberId: string, newRole: TeamRole) => {
    updateRoleMutation.mutate({ userId: memberId, role: newRole });
  };

  const handleResendInvite = async (email: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/workspace/invites/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, role: "member" })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to resend invitation: ${response.status}`);
      }
      
      const data = await response.json();
      toast.success(data.message);
    } catch (error) {
      console.error("Failed to resend invitation:", error);
      toast.error("Failed to resend invitation");
    }
  };

  const handleCopyInviteLink = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/workspace/invites/generate-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: "", role: "member" })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to generate invite link: ${response.status}`);
      }
      
      const data = await response.json();
      await navigator.clipboard.writeText(data.inviteLink);
      toast.success("Invite link copied to clipboard");
    } catch (error) {
      console.error("Failed to generate invite link:", error);
      toast.error("Failed to generate invite link");
    }
  };

  const handleSettingChange = async (setting: keyof typeof teamSettings, value: boolean) => {
    try {
      setTeamSettings(prev => ({ ...prev, [setting]: value }));
      
      // Call the real API endpoint
      const response = await fetch(`${API_BASE_URL}/workspace/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ [setting]: value })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update setting: ${response.status}`);
      }
      
      // Show success toast asynchronously to prevent setState during render
      Promise.resolve().then(() => {
        toast.success("Setting updated successfully");
      });
    } catch (error) {
      console.error("Failed to update setting:", error);
      // Revert the change on error
      setTeamSettings(prev => ({ ...prev, [setting]: !value }));
      Promise.resolve().then(() => {
        toast.error("Failed to update setting");
      });
    }
  };

  const getRoleIcon = (role: TeamRole) => {
    switch (role) {
      case "workspace-manager": return <Crown className="h-4 w-4 text-yellow-500" />;
      case "department-head": return <Shield className="h-4 w-4 text-blue-500" />;
      case "project-manager": return <Settings className="h-4 w-4 text-purple-500" />;
      case "team-lead": return <Users className="h-4 w-4 text-green-500" />;
      case "member": return <UserCheck className="h-4 w-4 text-green-500" />;
      case "client": return <User className="h-4 w-4 text-blue-400" />;
      case "contractor": return <Settings className="h-4 w-4 text-orange-500" />;
      case "stakeholder": return <User className="h-4 w-4 text-purple-400" />;
      case "workspace-viewer": return <User className="h-4 w-4 text-gray-500" />;
      case "project-viewer": return <User className="h-4 w-4 text-gray-500" />;
      case "guest": return <User className="h-4 w-4 text-gray-400" />;
      default: return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "pending": return <Clock className="h-4 w-4 text-yellow-500" />;
      case "inactive": return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  // Filter and paginate team members
  const filteredMembers = useMemo(() => {
    return teamMembers.filter(member => 
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [teamMembers, searchTerm]);

  const paginatedMembers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredMembers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredMembers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);

  const totalMembers = teamMembers.length;
  const activeMembers = teamMembers.filter(m => m.status === "active").length;
  const pendingMembers = teamMembers.filter(m => m.status === "pending").length;
  const adminMembers = teamMembers.filter(m => ["workspace-manager", "department-head", "project-manager"].includes(m.role)).length;

  return (
    <LazyDashboardLayout>
      <div className="container max-w-6xl py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Users className="h-8 w-8" />
              Team Management
            </h1>
            <p className="text-muted-foreground">
              Manage team members, roles, and permissions
            </p>
          </div>
            
          <div className="flex gap-3">
            <Button 
              onClick={() => navigate({ to: "/dashboard/settings/components-features" })}
              variant="outline"
            >
              <Layout className="h-4 w-4 mr-2" />
              Manage Pages & Features
            </Button>
            
            <Button 
              onClick={() => setIsInviteModalOpen(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          </div>
        </div>

        {/* Team Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Team Overview
            </CardTitle>
            <CardDescription>
              {totalMembers === 0 ? "No team members yet" : `${totalMembers} team member${totalMembers === 1 ? '' : 's'} total`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: "Total Members", value: totalMembers, icon: Users },
                { label: "Active", value: activeMembers, icon: CheckCircle },
                { label: "Pending", value: pendingMembers, icon: Clock },
                { label: "Admins", value: adminMembers, icon: Shield }
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="text-center p-4 rounded-lg border"
                >
                  <div className="inline-flex p-3 rounded-lg bg-primary/10 mb-3">
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Team Members List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Members
            </CardTitle>
            <CardDescription>Manage roles and permissions</CardDescription>
          </CardHeader>
          <CardContent>

            {teamMembers.length === 0 ? (
              <div className="text-center py-12">
                <UserCheck className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-medium mb-2">
                  No team members yet
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Start building your team by inviting colleagues to collaborate on your projects.
                </p>
                <Button 
                  onClick={() => setIsInviteModalOpen(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Your First Member
                </Button>
              </div>
            ) : (
              <>
                {/* Search and Filter */}
                <div className="mb-6">
                  <Input
                    placeholder="Search team members..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-md"
                  />
                </div>

                {/* Team Members Grid */}
                <div className="space-y-4">
                  {paginatedMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="flex items-center gap-4">
                        <ClickableUserProfile
                          userId={member.id}
                          userEmail={member.email}
                          userName={member.name}
                          userAvatar={member.avatar}
                          size="lg"
                          openMode="both"
                        >
                          {getStatusIcon(member.status)}
                        </ClickableUserProfile>
                        
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Last active: {member.lastActive}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="flex items-center gap-1 justify-end mb-1">
                            {getRoleIcon(member.role)}
                            <Badge variant="secondary">
                              {member.role}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Joined {member.joinDate}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          {member.status === "pending" && (
                            <Button
                              onClick={() => handleResendInvite(member.email)}
                              size="sm"
                              variant="ghost"
                              className="p-2"
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {member.role !== "workspace-manager" && (
                            <Select
                              value={member.role}
                              onValueChange={(newRole: TeamRole) => handleRoleChange(member.id, newRole)}
                            >
                              <SelectTrigger className="w-auto h-8 text-xs border-0 bg-transparent">
                                <Settings className="h-3 w-3" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="workspace-viewer">Workspace Viewer</SelectItem>
                                <SelectItem value="member">Member</SelectItem>
                                <SelectItem value="team-lead">Team Lead</SelectItem>
                                <SelectItem value="project-manager">Project Manager</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          
                          {member.role !== "workspace-manager" && (
                            <Button
                              onClick={() => handleRemoveMember(member.id)}
                              size="sm"
                              variant="ghost"
                              className="p-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredMembers.length)} of {filteredMembers.length} members
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </Button>
                        ))}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>Manage team invitations and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCopyInviteLink}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Invite Link
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsInviteModalOpen(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate({ to: '/dashboard/settings/role-permissions' })}
              >
                <Shield className="h-4 w-4 mr-2" />
                Manage Role Permissions
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Role Permissions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Role Permissions
            </CardTitle>
            <CardDescription>Understand what each role can do in your workspace</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(rolePermissions).map(([role, permissions]) => (
                <div
                  key={role}
                  className="p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-2 mb-3">
                    {getRoleIcon(role as TeamRole)}
                    <h4 className="font-medium capitalize">
                      {role}
                    </h4>
                  </div>
                  <ul className="space-y-1">
                    {permissions.map((permission, permIndex) => (
                      <li key={permIndex} className="text-xs text-muted-foreground flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                        {permission}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Team Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Team Settings
            </CardTitle>
            <CardDescription>Configure how your team operates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="font-medium">Allow Member Invites</p>
                <p className="text-sm text-muted-foreground">Let team members invite new people</p>
              </div>
              <Switch
                checked={teamSettings.allowMemberInvites}
                onCheckedChange={(checked) => handleSettingChange('allowMemberInvites', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="font-medium">Require Admin Approval</p>
                <p className="text-sm text-muted-foreground">New members need admin approval to join</p>
              </div>
              <Switch
                checked={teamSettings.requireAdminApproval}
                onCheckedChange={(checked) => handleSettingChange('requireAdminApproval', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="font-medium">Enable Guest Access</p>
                <p className="text-sm text-muted-foreground">Allow temporary guest access to projects</p>
              </div>
              <Switch
                checked={teamSettings.enableGuestAccess}
                onCheckedChange={(checked) => handleSettingChange('enableGuestAccess', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <p className="font-medium">Auto-Remove Inactive Members</p>
                <p className="text-sm text-muted-foreground">Automatically remove members inactive for {teamSettings.inactivityDays} days</p>
              </div>
              <Switch
                checked={teamSettings.autoRemoveInactive}
                onCheckedChange={(checked) => handleSettingChange('autoRemoveInactive', checked)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* 📧 SECURE INVITATION SYSTEM - Modal Integration */}
      <InviteUserModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        workspaceId={currentWorkspace.id}
        workspaceName={currentWorkspace.name}
      />
    </LazyDashboardLayout>
  );
} 