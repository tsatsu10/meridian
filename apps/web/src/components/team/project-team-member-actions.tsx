import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useTeamPermissions } from "@/hooks/useTeamPermissions";
import {
  MoreHorizontal,
  Mail,
  MessageSquare,
  Video,
  Phone,
  Shield,
  UserMinus,
  Settings,
  Clock,
  Target,
  TrendingUp,
  Calendar,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { cn } from "@/lib/cn";

interface ProjectMember {
  id: string;
  name: string;
  email: string;
  role: string;
  workspaceRole: string;
  activeTasks: number;
  completedTasks: number;
  hoursThisWeek?: number;
  productivity: number;
  status: "online" | "away" | "offline";
  joinedProject: string;
  lastActive?: string;
  isProjectLead?: boolean;
}

interface ProjectTeamMemberActionsProps {
  member: ProjectMember;
  onMemberUpdate?: (member: ProjectMember) => void;
  onMemberRemove?: (memberId: string) => void;
}

export default function ProjectTeamMemberActions({ 
  member, 
  onMemberUpdate, 
  onMemberRemove 
}: ProjectTeamMemberActionsProps) {
  const [showMemberDetails, setShowMemberDetails] = useState(false);
  const [showEditMember, setShowEditMember] = useState(false);
  const [showRemoveMember, setShowRemoveMember] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // @epic-3.4-teams: Get permissions for team management
  const permissions = useTeamPermissions();

  const roleColors = {
    owner: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    "team-lead": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    senior: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    member: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    viewer: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    guest: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  };

  const statusColors = {
    online: "bg-green-500",
    away: "bg-yellow-500",
    offline: "bg-gray-400",
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getProductivityStatus = (productivity: number) => {
    if (productivity >= 80) return { status: "excellent", color: "text-green-600" };
    if (productivity >= 60) return { status: "good", color: "text-blue-600" };
    if (productivity >= 40) return { status: "average", color: "text-yellow-600" };
    return { status: "needs attention", color: "text-red-600" };
  };

  const getWorkloadStatus = (activeTasks: number) => {
    if (activeTasks > 8) return { status: "overloaded", color: "text-red-600", bgColor: "bg-red-50" };
    if (activeTasks > 5) return { status: "busy", color: "text-yellow-600", bgColor: "bg-yellow-50" };
    if (activeTasks > 2) return { status: "normal", color: "text-green-600", bgColor: "bg-green-50" };
    return { status: "available", color: "text-blue-600", bgColor: "bg-blue-50" };
  };

  const totalTasks = member.activeTasks + member.completedTasks;
  const productivityInfo = getProductivityStatus(member.productivity);
  const workloadInfo = getWorkloadStatus(member.activeTasks);

  return (
    <>
      {/* Action Buttons */}
      <div className="flex items-center space-x-1">
        {/* Contact Actions */}
        {permissions.permissions.canSendMessages && (
          <>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                // @epic-3.6-communication: Open direct message
                window.location.href = `mailto:${member.email}`;
              }}
              title="Send Email"
            >
              <Mail className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                // @epic-3.6-communication: Open team chat}}
              title="Send Message"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                // @epic-3.6-communication: Start video call}}
              title="Video Call"
            >
              <Video className="h-4 w-4" />
            </Button>
          </>
        )}

        {/* More Actions Dropdown */}
        {permissions.permissions.canViewMemberProfiles && (
          <div className="relative">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              title="More Actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
            
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 min-w-[200px] rounded-md border bg-popover p-1 text-popover-foreground shadow-lg">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    setShowMemberDetails(true);
                    setDropdownOpen(false);
                  }}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  View Details
                </Button>
                
                {permissions.permissions.canChangeRoles && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      setShowEditMember(true);
                      setDropdownOpen(false);
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Member
                  </Button>
                )}
                
                {permissions.permissions.canRemoveMembers && member.role !== 'owner' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      setShowRemoveMember(true);
                      setDropdownOpen(false);
                    }}
                  >
                    <UserMinus className="mr-2 h-4 w-4" />
                    Remove from Project
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Member Details Modal */}
      <Dialog open={showMemberDetails} onOpenChange={setShowMemberDetails}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-3">
              <Avatar className="w-12 h-12">
                <div className="w-full h-full bg-primary/10 flex items-center justify-center text-lg font-medium">
                  {member.name.charAt(0).toUpperCase()}
                </div>
              </Avatar>
              <div>
                <h2 className="text-xl font-semibold">{member.name}</h2>
                <p className="text-sm text-muted-foreground">{member.email}</p>
              </div>
            </DialogTitle>
            <DialogDescription>
              Detailed information about this team member's project involvement and performance.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Status and Role */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Role & Status</label>
                <div className="flex items-center space-x-2">
                  <Badge className={cn("text-xs", roleColors[member.role as keyof typeof roleColors] || roleColors.member)}>
                    {member.role.replace('-', ' ').replace('_', ' ')}
                  </Badge>
                  <div className="flex items-center space-x-1">
                    <div className={cn("w-2 h-2 rounded-full", statusColors[member.status])} />
                    <span className="text-sm capitalize">{member.status}</span>
                  </div>
                  {member.isProjectLead && (
                    <Badge variant="outline" className="text-xs">
                      <Shield className="w-3 h-3 mr-1" />
                      Lead
                    </Badge>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Joined Project</label>
                <p className="text-sm">{formatDate(member.joinedProject)}</p>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center space-x-2">
                <TrendingUp className="h-4 w-4" />
                <span>Performance Overview</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Target className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-600">{member.activeTasks}</div>
                    <div className="text-sm text-muted-foreground">Active Tasks</div>
                    <div className={cn("text-xs mt-1", workloadInfo.color)}>
                      {workloadInfo.status}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-600">{member.completedTasks}</div>
                    <div className="text-sm text-muted-foreground">Completed</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {totalTasks} total tasks
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="h-6 w-6 text-purple-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-purple-600">{member.productivity}%</div>
                    <div className="text-sm text-muted-foreground">Productivity</div>
                    <div className={cn("text-xs mt-1", productivityInfo.color)}>
                      {productivityInfo.status}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Productivity Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Task Completion Rate</span>
                  <span className="font-medium">{member.productivity}%</span>
                </div>
                <Progress value={member.productivity} className="h-3" />
              </div>
            </div>

            {/* Workload Analysis */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>Workload Analysis</span>
              </h3>
              
              <div className={cn("p-4 rounded-lg border", workloadInfo.bgColor)}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Current Workload</span>
                  <span className={cn("text-sm font-medium", workloadInfo.color)}>
                    {workloadInfo.status.toUpperCase()}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {member.activeTasks} active tasks • {member.hoursThisWeek || 0} estimated hours this week
                </div>
                
                {member.activeTasks > 6 && (
                  <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800 flex items-start space-x-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>This member has a high workload. Consider redistributing tasks if needed.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="space-y-2">
              <h3 className="font-medium flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Activity</span>
              </h3>
              <div className="text-sm text-muted-foreground">
                Last active: {member.lastActive || "Recently"}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Member Modal - Placeholder */}
      <Dialog open={showEditMember} onOpenChange={setShowEditMember}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Update {member.name}'s role and permissions for this project.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Role management functionality will be implemented here.
            </p>
            {/* TODO: Implement role editing form */}
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation Modal */}
      <Dialog open={showRemoveMember} onOpenChange={setShowRemoveMember}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Remove Team Member</span>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {member.name} from this project? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-medium text-red-800 mb-2">Impact of removal:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• {member.activeTasks} active tasks will need to be reassigned</li>
                <li>• Member will lose access to project resources</li>
                <li>• Task history and contributions will be preserved</li>
              </ul>
            </div>
            
            <div className="flex items-center space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowRemoveMember(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={() => {
                  onMemberRemove?.(member.id);
                  setShowRemoveMember(false);
                }}
              >
                <UserMinus className="mr-2 h-4 w-4" />
                Remove Member
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Click outside handler for dropdown */}
      {dropdownOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setDropdownOpen(false)}
        />
      )}
    </>
  );
} 