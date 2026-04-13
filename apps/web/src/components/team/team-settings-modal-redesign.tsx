// @epic-3.4-teams: Redesigned Team Settings Modal with Sidebar Navigation
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { MagicCard } from "@/components/magicui/magic-card";
import { useUpdateTeam } from "@/hooks/mutations/team/use-update-team";
import { useDeleteTeam } from "@/hooks/mutations/team/use-delete-team";
import { useRemoveMember } from "@/hooks/mutations/team/use-remove-member";
import { useUpdateMemberRole } from "@/hooks/mutations/team/use-update-member-role";
import { useArchiveTeam } from "@/hooks/mutations/team/use-archive-team";
import { useUpdateTeamNotifications } from "@/hooks/mutations/team/use-update-team-notifications";
import { useGetTeamStatistics } from "@/hooks/queries/team/use-get-team-statistics";
import { useGetTeamActivity } from "@/hooks/queries/team/use-get-team-activity";
import { useGetTeamNotifications } from "@/hooks/queries/team/use-get-team-notifications";
import { useGetTeamIntegrations } from "@/hooks/queries/team/use-get-team-integrations";
import { useGetTeamAnalytics } from "@/hooks/queries/team/use-get-team-analytics";
import { useGetAdvancedPermissions } from "@/hooks/queries/team/use-get-advanced-permissions";
import { useGetTeamAutomations } from "@/hooks/queries/team/use-get-team-automations";
import { useUpdateAutomation } from "@/hooks/mutations/team/use-update-automation";
import { useDeleteAutomation } from "@/hooks/mutations/team/use-delete-automation";
import { toast } from "sonner";
import { 
  Settings, Users, Archive, Trash2, Edit3, Save, AlertTriangle,
  UserMinus, UserPlus, Crown, Search, Loader2, CheckCircle2, XCircle,
  BarChart3, Activity, Bell, Zap, TrendingUp, Lock,
  Play, Pause, Plus, LineChart, X, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDistanceToNow } from "date-fns";

interface TeamSettingsModalProps {
  open: boolean;
  onClose: () => void;
  team: Team | null;
}

interface Team {
  id: string;
  name: string;
  description?: string;
  lead: string;
  members: Array<{ id: string; name: string; email: string; role: string }>;
  projectId?: string | null;
  workspaceId: string;
  isActive: boolean;
  createdAt: Date;
}

const roleHierarchy = [
  { value: "Owner", label: "Owner", description: "Full access to all team settings" },
  { value: "Admin", label: "Admin", description: "Can manage team members and settings" },
  { value: "Team Lead", label: "Team Lead", description: "Can assign tasks and view reports" },
  { value: "Member", label: "Member", description: "Can view and complete assigned tasks" }
];

const navigationSections = [
  {
    title: "Insights",
    items: [
      { id: "overview", label: "Overview", icon: BarChart3, badge: null },
      { id: "analytics", label: "Analytics", icon: LineChart, badge: null },
      { id: "activity", label: "Activity Log", icon: Activity, badge: null },
    ]
  },
  {
    title: "Configuration",
    items: [
      { id: "general", label: "General", icon: Settings, badge: null },
      { id: "members", label: "Members", icon: Users, badge: null },
      { id: "permissions", label: "Permissions", icon: Lock, badge: null },
    ]
  },
  {
    title: "Automation",
    items: [
      { id: "automations", label: "Automations", icon: Zap, badge: null },
      { id: "notifications", label: "Notifications", icon: Bell, badge: null },
      { id: "integrations", label: "Integrations", icon: TrendingUp, badge: null },
    ]
  },
  {
    title: "Advanced",
    items: [
      { id: "danger", label: "Danger Zone", icon: AlertTriangle, badge: null },
    ]
  }
];

export default function TeamSettingsModalRedesign({ 
  open, 
  onClose, 
  team: initialTeam
}: TeamSettingsModalProps) {
  const updateTeamMutation = useUpdateTeam();
  const deleteTeamMutation = useDeleteTeam();
  const removeMemberMutation = useRemoveMember();
  const updateMemberRoleMutation = useUpdateMemberRole();
  const archiveTeamMutation = useArchiveTeam();
  const updateNotificationsMutation = useUpdateTeamNotifications();

  // Queries for Phase 2 & 3 features
  const { data: statisticsData, isLoading: isLoadingStats } = useGetTeamStatistics(initialTeam?.id);
  const [activityPage, setActivityPage] = useState(0);
  const { data: activityData, isLoading: isLoadingActivity } = useGetTeamActivity(
    initialTeam?.id,
    { limit: 20, offset: activityPage * 20 }
  );
  const { data: notificationsData, isLoading: isLoadingNotifications } = useGetTeamNotifications(initialTeam?.id);
  const { data: integrationsData, isLoading: isLoadingIntegrations } = useGetTeamIntegrations(initialTeam?.id);
  const [analyticsTimeRange, setAnalyticsTimeRange] = useState<"7d" | "30d" | "90d" | "all">("7d");
  const { data: analyticsData, isLoading: isLoadingAnalytics } = useGetTeamAnalytics(initialTeam?.id, analyticsTimeRange);
  const { data: advancedPermissionsData, isLoading: isLoadingAdvancedPermissions } = useGetAdvancedPermissions(initialTeam?.id);
  const { data: automationsData, isLoading: isLoadingAutomations } = useGetTeamAutomations(initialTeam?.id);
  const updateAutomationMutation = useUpdateAutomation();
  const deleteAutomationMutation = useDeleteAutomation();
  
  const [memberFilters, setMemberFilters] = useState({
    query: "",
    role: undefined as string | undefined,
    sortBy: "name" as "name" | "joinedAt" | "tasksCompleted",
    order: "asc" as "asc" | "desc",
  });

  const [activeTab, setActiveTab] = useState("overview");
  const [team, setTeam] = useState<Team | null>(initialTeam);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTeam, setEditedTeam] = useState<Team | null>(initialTeam);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [notificationPreferences, setNotificationPreferences] = useState(notificationsData?.preferences || {});

  useEffect(() => {
    if (initialTeam) {
      setTeam(initialTeam);
      setEditedTeam(initialTeam);
      setValidationErrors({});
    }
  }, [initialTeam]);

  useEffect(() => {
    if (notificationsData?.preferences) {
      setNotificationPreferences(notificationsData.preferences);
    }
  }, [notificationsData]);

  const filteredMembers = useMemo(() => {
    if (!team) return [];
    let filtered = team.members;
    
    // Apply search filter
    if (memberFilters.query) {
      const searchLower = memberFilters.query.toLowerCase();
      filtered = filtered.filter(member => 
        member.name.toLowerCase().includes(searchLower) ||
        member.email.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply role filter
    if (memberFilters.role) {
      filtered = filtered.filter(member => member.role === memberFilters.role);
    }
    
    return filtered;
  }, [team, memberFilters]);

  const validateTeamForm = () => {
    const errors: Record<string, string> = {};
    
    if (!editedTeam?.name || editedTeam.name.trim().length < 2) {
      errors.name = "Team name must be at least 2 characters";
    }
    if (editedTeam?.name && editedTeam.name.length > 50) {
      errors.name = "Team name must be less than 50 characters";
    }
    if (editedTeam?.description && editedTeam.description.length > 500) {
      errors.description = "Description must be less than 500 characters";
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveChanges = async () => {
    if (!validateTeamForm() || !editedTeam) return;

    updateTeamMutation.mutate(
      { 
        teamId: editedTeam.id,
        workspaceId: editedTeam.workspaceId,
        name: editedTeam.name, 
        description: editedTeam.description 
      },
      {
        onSuccess: () => {
          setTeam(editedTeam);
          setIsEditing(false);
          setValidationErrors({});
        }
      }
    );
  };

  const handleArchiveTeam = async () => {
    if (!team) return;
    
    archiveTeamMutation.mutate(
      { teamId: team.id, workspaceId: team.workspaceId },
      {
        onSuccess: () => {
          setShowArchiveConfirm(false);
          onClose();
        }
      }
    );
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!team) return;
    
    if (team.members.length <= 1) {
      toast.error("Cannot remove the last member from the team");
      return;
    }

    removeMemberMutation.mutate(
      { teamId: team.id, userId: memberId, workspaceId: team.workspaceId },
      {
        onSuccess: () => {
          setTeam({
            ...team,
            members: team.members.filter(m => m.id !== memberId)
          });
        }
      }
    );
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    if (!team) return;

    updateMemberRoleMutation.mutate(
      { teamId: team.id, userId: memberId, role: newRole, workspaceId: team.workspaceId },
      {
        onSuccess: () => {
          setTeam({
            ...team,
            members: team.members.map(m => 
              m.id === memberId ? { ...m, role: newRole } : m
            )
          });
        }
      }
    );
  };

  if (!team) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] w-[1400px] h-[95vh] p-0 gap-0 bg-gradient-to-br from-background via-background to-muted/20">
        {/* Accessibility: Hidden title and description for screen readers */}
        <VisuallyHidden>
          <DialogTitle>{team.name} Settings</DialogTitle>
          <DialogDescription>
            Manage team settings, members, and preferences for {team.name}
          </DialogDescription>
        </VisuallyHidden>

        <div className="relative h-full flex flex-col overflow-hidden">
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
          
          {/* Modern Header with Gradient */}
          <div className="relative border-b bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 animate-pulse" />
            
            <div className="relative px-8 py-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400">
                    {team.name}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {team.description || "Manage your team settings and preferences"}
                  </p>
                </div>
                <Badge className="ml-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 shadow-md">
                  {team.members.length} Members
                </Badge>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClose} 
                className="rounded-full hover:bg-white/10 transition-all"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Enhanced Sidebar Navigation */}
          <nav className="w-64 border-r bg-gradient-to-b from-muted/50 to-muted/30 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="space-y-6">
              {navigationSections.map((section) => (
                <div key={section.title}>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
                    {section.title}
                  </h3>
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      
                      return (
                        <button
                          key={item.id}
                          onClick={() => setActiveTab(item.id)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative overflow-hidden",
                            isActive
                              ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-primary/20"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:shadow-md"
                          )}
                        >
                          {isActive && (
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 animate-pulse" />
                          )}
                          <Icon className={cn(
                            "w-4 h-4 flex-shrink-0 relative z-10",
                            isActive && "drop-shadow-lg"
                          )} />
                          <span className="flex-1 text-left relative z-10">{item.label}</span>
                          {isActive && <ChevronRight className="w-4 h-4 relative z-10 animate-pulse" />}
                          {item.badge && (
                            <Badge variant="secondary" className="ml-auto relative z-10">
                              {item.badge}
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </nav>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto">
            <div className="p-8">
              {/* Overview Tab */}
              {activeTab === "overview" && (
                <div className="space-y-6 max-w-6xl">
                  <div>
                    <h3 className="text-xl font-semibold mb-6">Team Overview</h3>
                    {isLoadingStats ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : statisticsData?.statistics ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="relative group">
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
                          <MagicCard className="relative p-6 bg-gradient-to-br from-blue-500/10 to-background border-blue-500/20">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-muted-foreground font-medium">Team Members</p>
                                <p className="text-3xl font-bold mt-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-600">{statisticsData.statistics.memberCount}</p>
                              </div>
                              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg">
                                <Users className="w-6 h-6 text-white" />
                              </div>
                            </div>
                          </MagicCard>
                        </div>

                        <div className="relative group">
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
                          <MagicCard className="relative p-6 bg-gradient-to-br from-purple-500/10 to-background border-purple-500/20">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-muted-foreground font-medium">Total Tasks</p>
                                <p className="text-3xl font-bold mt-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">{statisticsData.statistics.tasks.total}</p>
                              </div>
                              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg">
                                <Activity className="w-6 h-6 text-white" />
                              </div>
                            </div>
                          </MagicCard>
                        </div>

                        <div className="relative group">
                          <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
                          <MagicCard className="relative p-6 bg-gradient-to-br from-green-500/10 to-background border-green-500/20">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-muted-foreground font-medium">Completion Rate</p>
                                <p className="text-3xl font-bold mt-2 bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-emerald-600">{statisticsData.statistics.tasks.completionRate}%</p>
                              </div>
                              <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg">
                                <CheckCircle2 className="w-6 h-6 text-white" />
                              </div>
                            </div>
                          </MagicCard>
                        </div>

                        <div className="relative group">
                          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-amber-500/20 rounded-xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
                          <MagicCard className="relative p-6 bg-gradient-to-br from-orange-500/10 to-background border-orange-500/20">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-muted-foreground font-medium">Recent Activity</p>
                                <p className="text-3xl font-bold mt-2 bg-clip-text text-transparent bg-gradient-to-r from-orange-600 to-amber-600">{statisticsData.statistics.recentActivityCount}</p>
                              </div>
                              <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg">
                                <Activity className="w-6 h-6 text-white" />
                              </div>
                            </div>
                          </MagicCard>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">No statistics available</p>
                    )}
                  </div>
                </div>
              )}

              {/* Analytics Tab */}
              {activeTab === "analytics" && (
                <div className="space-y-6 max-w-6xl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">Team Analytics</h3>
                    <div className="flex gap-2">
                      {(["7d", "30d", "90d", "all"] as const).map((range) => (
                        <Button
                          key={range}
                          variant={analyticsTimeRange === range ? "default" : "outline"}
                          size="sm"
                          onClick={() => setAnalyticsTimeRange(range)}
                        >
                          {range === "7d" ? "7 Days" : range === "30d" ? "30 Days" : range === "90d" ? "90 Days" : "All Time"}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {isLoadingAnalytics ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : analyticsData?.analytics ? (
                    <div className="space-y-6">
                      {/* Member Productivity */}
                      <div>
                        <h4 className="font-medium mb-3">Member Productivity</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {analyticsData.analytics.memberProductivity.map((member) => (
                            <MagicCard key={member.memberId} className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-medium">{member.memberName}</p>
                                <Badge variant="outline">{member.totalTasks} tasks</Badge>
                              </div>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Completed:</span>
                                  <span className="text-green-600 font-medium">{member.tasksCompleted}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">In Progress:</span>
                                  <span className="text-blue-600 font-medium">{member.tasksInProgress}</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                                  <div
                                    className="bg-green-500 h-2 rounded-full transition-all"
                                    style={{
                                      width: `${member.totalTasks > 0 ? (member.tasksCompleted / member.totalTasks) * 100 : 0}%`
                                    }}
                                  />
                                </div>
                              </div>
                            </MagicCard>
                          ))}
                        </div>
                      </div>

                      {/* Status & Priority Distribution */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <MagicCard className="p-6">
                          <h4 className="font-medium mb-4">Status Distribution</h4>
                          <div className="space-y-3">
                            {analyticsData.analytics.statusDistribution.map((item) => (
                              <div key={item.status} className="flex items-center justify-between">
                                <span className="text-sm capitalize">{item.status.replace("_", " ")}</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div
                                      className={cn(
                                        "h-2 rounded-full transition-all",
                                        item.status === "done" && "bg-green-500",
                                        item.status === "in_progress" && "bg-blue-500",
                                        item.status === "todo" && "bg-gray-500"
                                      )}
                                      style={{
                                        width: `${Math.max((Number(item.count) / analyticsData.analytics.statusDistribution.reduce((acc, s) => acc + Number(s.count), 0)) * 100, 5)}%`
                                      }}
                                    />
                                  </div>
                                  <span className="text-sm font-medium w-8 text-right">{item.count}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </MagicCard>

                        <MagicCard className="p-6">
                          <h4 className="font-medium mb-4">Priority Distribution</h4>
                          <div className="space-y-3">
                            {analyticsData.analytics.priorityDistribution.map((item) => (
                              <div key={item.priority || 'none'} className="flex items-center justify-between">
                                <span className="text-sm capitalize">{item.priority || "none"}</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div
                                      className={cn(
                                        "h-2 rounded-full transition-all",
                                        item.priority === "high" && "bg-red-500",
                                        item.priority === "medium" && "bg-yellow-500",
                                        item.priority === "low" && "bg-blue-500",
                                        !item.priority && "bg-gray-400"
                                      )}
                                      style={{
                                        width: `${Math.max((Number(item.count) / analyticsData.analytics.priorityDistribution.reduce((acc, p) => acc + Number(p.count), 0)) * 100, 5)}%`
                                      }}
                                    />
                                  </div>
                                  <span className="text-sm font-medium w-8 text-right">{item.count}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </MagicCard>
                      </div>

                      {/* Task Trend */}
                      {analyticsData.analytics.taskTrend.length > 0 && (
                        <MagicCard className="p-6">
                          <h4 className="font-medium mb-4">Task Completion Trend</h4>
                          <div className="space-y-2">
                            {analyticsData.analytics.taskTrend.slice(-10).map((item) => (
                              <div key={item.date} className="flex items-center gap-2 text-sm">
                                <span className="w-24 text-muted-foreground">
                                  {new Date(item.date).toLocaleDateString()}
                                </span>
                                <div className="flex-1 flex gap-1">
                                  <div
                                    className="bg-green-500 h-6 rounded transition-all"
                                    style={{ width: `${Math.max(Number(item.completed) * 10, 2)}px` }}
                                    title={`${item.completed} completed`}
                                  />
                                  <div
                                    className="bg-blue-500 h-6 rounded transition-all"
                                    style={{ width: `${Math.max(Number(item.created) * 10, 2)}px` }}
                                    title={`${item.created} created`}
                                  />
                                </div>
                                <div className="flex gap-3 text-xs">
                                  <span className="text-green-600">{item.completed} done</span>
                                  <span className="text-blue-600">{item.created} created</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </MagicCard>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <LineChart className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-3" />
                      <p className="text-sm text-muted-foreground">No analytics data available</p>
                    </div>
                  )}
                </div>
              )}

              {/* General Tab */}
              {activeTab === "general" && (
                <div className="space-y-6 max-w-3xl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">General Settings</h3>
                    {!isEditing ? (
                      <Button
                        variant="outline"
                        onClick={() => setIsEditing(true)}
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditedTeam(team);
                            setIsEditing(false);
                            setValidationErrors({});
                          }}
                        >
                          Cancel
                        </Button>
                        <Button onClick={handleSaveChanges} disabled={updateTeamMutation.isPending}>
                          {updateTeamMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Save Changes
                        </Button>
                      </div>
                    )}
                  </div>

                  <MagicCard className="p-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Team Name</label>
                        <Input
                          value={isEditing ? (editedTeam?.name || "") : team.name}
                          onChange={(e) => setEditedTeam({ ...editedTeam!, name: e.target.value })}
                          disabled={!isEditing}
                          className={cn(validationErrors.name && "border-red-500")}
                        />
                        {validationErrors.name && (
                          <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            {validationErrors.name}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="text-sm font-medium">Description</label>
                        <textarea
                          value={isEditing ? (editedTeam?.description || "") : (team.description || "")}
                          onChange={(e) => setEditedTeam({ ...editedTeam!, description: e.target.value })}
                          disabled={!isEditing}
                          rows={4}
                          className={cn(
                            "w-full px-3 py-2 border rounded-md bg-background resize-none",
                            validationErrors.description && "border-red-500"
                          )}
                        />
                        {validationErrors.description && (
                          <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            {validationErrors.description}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Team ID</label>
                        <Input value={team.id} disabled className="bg-muted" />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Created</label>
                        <Input 
                          value={formatDistanceToNow(new Date(team.createdAt), { addSuffix: true })} 
                          disabled 
                          className="bg-muted" 
                        />
                      </div>
                    </div>
                  </MagicCard>
                </div>
              )}

              {/* Members Tab */}
              {activeTab === "members" && (
                <div className="space-y-6 max-w-5xl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">Team Members ({team.members.length})</h3>
                    <Button onClick={() => toast.info("Add member functionality coming soon")}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Member
                    </Button>
                  </div>

                  {/* Search and Filters */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search members..."
                        value={memberFilters.query}
                        onChange={(e) => setMemberFilters({ ...memberFilters, query: e.target.value })}
                        className="pl-9"
                      />
                    </div>
                    <select
                      value={memberFilters.role || ""}
                      onChange={(e) => setMemberFilters({ ...memberFilters, role: e.target.value || undefined })}
                      className="px-3 py-2 border rounded-md bg-background"
                    >
                      <option value="">All Roles</option>
                      {roleHierarchy.map((role) => (
                        <option key={role.value} value={role.value}>{role.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Members List */}
                  <div className="space-y-3">
                    {filteredMembers.length === 0 ? (
                      <div className="text-center py-12">
                        <Users className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-3" />
                        <p className="text-sm text-muted-foreground">No members found</p>
                      </div>
                    ) : (
                      filteredMembers.map((member) => (
                        <MagicCard key={member.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-sm font-medium">{member.name.charAt(0)}</span>
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{member.name}</span>
                                  {member.name === team.lead && (
                                    <Badge variant="secondary" className="text-xs">
                                      <Crown className="w-3 h-3 mr-1" />
                                      Lead
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-sm text-muted-foreground">{member.email}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <select
                                value={member.role}
                                onChange={(e) => handleChangeRole(member.id, e.target.value)}
                                className="px-2 py-1 border rounded text-sm"
                                disabled={updateMemberRoleMutation.isPending}
                              >
                                {roleHierarchy.map((role) => (
                                  <option key={role.value} value={role.value}>{role.label}</option>
                                ))}
                              </select>
                              
                              {team.members.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveMember(member.id)}
                                  disabled={removeMemberMutation.isPending}
                                >
                                  {removeMemberMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <UserMinus className="h-4 w-4 text-red-500" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        </MagicCard>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Permissions Tab */}
              {activeTab === "permissions" && (
                <div className="space-y-6 max-w-5xl">
                  <h3 className="text-xl font-semibold">Advanced Permissions</h3>

                  {isLoadingAdvancedPermissions ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : advancedPermissionsData?.members ? (
                    <div className="space-y-4">
                      {advancedPermissionsData.members.map((member) => (
                        <MagicCard key={member.userId} className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <p className="font-medium">{member.userName}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline">{member.role}</Badge>
                                <span className="text-xs text-muted-foreground">{member.userEmail}</span>
                              </div>
                            </div>
                            <Lock className="w-5 h-5 text-muted-foreground" />
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            {Object.entries(member.permissions).map(([key, value]) => (
                              <div key={key} className="flex items-center gap-2">
                                {value ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                )}
                                <span className={value ? "" : "text-muted-foreground"}>
                                  {key.replace("can", "").replace(/([A-Z])/g, " $1").trim()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </MagicCard>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Lock className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-3" />
                      <p className="text-sm text-muted-foreground">No permission data available</p>
                    </div>
                  )}
                </div>
              )}

              {/* Activity Log Tab */}
              {activeTab === "activity" && (
                <div className="space-y-6 max-w-5xl">
                  <h3 className="text-xl font-semibold">Activity Log</h3>

                  {isLoadingActivity ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : activityData?.activities && activityData.activities.length > 0 ? (
                    <div className="space-y-3">
                      {activityData.activities.map((activity) => (
                        <MagicCard key={activity.id} className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Activity className="w-4 h-4 text-blue-500" />
                                <span className="font-medium text-sm">{activity.action}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {activity.entityType}: {activity.entityId}
                              </p>
                              {activity.userName && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  by {activity.userName}
                                </p>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </MagicCard>
                      ))}

                      {activityData.pagination.total > 20 && (
                        <div className="flex items-center justify-between pt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActivityPage(Math.max(0, activityPage - 1))}
                            disabled={activityPage === 0}
                          >
                            Previous
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            Page {activityPage + 1} of {Math.ceil(activityData.pagination.total / 20)}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActivityPage(activityPage + 1)}
                            disabled={!activityData.pagination.hasMore}
                          >
                            Next
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Activity className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-3" />
                      <p className="text-sm text-muted-foreground">No activity recorded yet</p>
                    </div>
                  )}
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === "notifications" && (
                <div className="space-y-6 max-w-3xl">
                  <h3 className="text-xl font-semibold">Notification Preferences</h3>

                  {isLoadingNotifications ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <MagicCard className="p-6">
                        <h4 className="font-medium mb-4">Task Notifications</h4>
                        <div className="space-y-3">
                          {['taskAssigned', 'taskCompleted', 'taskOverdue'].map((key) => (
                            <div key={key} className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium capitalize">
                                  {key.replace('task', 'Task ').replace(/([A-Z])/g, ' $1')}
                                </p>
                              </div>
                              <input
                                type="checkbox"
                                checked={notificationPreferences[key as keyof typeof notificationPreferences] as boolean}
                                onChange={(e) => setNotificationPreferences({
                                  ...notificationPreferences,
                                  [key]: e.target.checked
                                })}
                                className="h-4 w-4"
                              />
                            </div>
                          ))}
                        </div>
                      </MagicCard>

                      <MagicCard className="p-6">
                        <h4 className="font-medium mb-4">Team Notifications</h4>
                        <div className="space-y-3">
                          {['memberJoined', 'memberLeft', 'teamUpdated', 'mentions'].map((key) => (
                            <div key={key} className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium capitalize">
                                  {key.replace(/([A-Z])/g, ' $1')}
                                </p>
                              </div>
                              <input
                                type="checkbox"
                                checked={notificationPreferences[key as keyof typeof notificationPreferences] as boolean}
                                onChange={(e) => setNotificationPreferences({
                                  ...notificationPreferences,
                                  [key]: e.target.checked
                                })}
                                className="h-4 w-4"
                              />
                            </div>
                          ))}
                        </div>
                      </MagicCard>

                      <div className="flex justify-end">
                        <Button
                          onClick={() => {
                            if (initialTeam?.id) {
                              updateNotificationsMutation.mutate({
                                teamId: initialTeam.id,
                                preferences: notificationPreferences
                              });
                            }
                          }}
                          disabled={updateNotificationsMutation.isPending}
                        >
                          {updateNotificationsMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Save Preferences
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Integrations Tab */}
              {activeTab === "integrations" && (
                <div className="space-y-6 max-w-5xl">
                  <h3 className="text-xl font-semibold">Team Integrations</h3>

                  {isLoadingIntegrations ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : integrationsData?.integrations && integrationsData.integrations.length > 0 ? (
                    <div className="space-y-3">
                      {integrationsData.integrations.map((integration) => (
                        <MagicCard key={integration.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                                <Zap className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <p className="font-medium">{integration.name}</p>
                                <p className="text-xs text-muted-foreground">{integration.provider}</p>
                              </div>
                            </div>
                            <Badge variant={integration.status === "active" ? "default" : "secondary"}>
                              {integration.status}
                            </Badge>
                          </div>
                        </MagicCard>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-3" />
                      <p className="text-sm text-muted-foreground mb-4">No integrations connected</p>
                      <Button variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Integration
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Automations Tab */}
              {activeTab === "automations" && (
                <div className="space-y-6 max-w-5xl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">Team Automations</h3>
                    <Button onClick={() => toast.info("Automation creation coming soon!")}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Automation
                    </Button>
                  </div>

                  {isLoadingAutomations ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : automationsData?.automations && automationsData.automations.length > 0 ? (
                    <div className="space-y-3">
                      {automationsData.automations.map((automation) => (
                        <MagicCard key={automation.id} className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {automation.enabled ? (
                                  <Play className="w-4 h-4 text-green-500" />
                                ) : (
                                  <Pause className="w-4 h-4 text-gray-400" />
                                )}
                                <p className="font-medium">{automation.name}</p>
                                <Badge variant={automation.enabled ? "default" : "secondary"}>
                                  {automation.enabled ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                              {automation.description && (
                                <p className="text-sm text-muted-foreground mb-2">{automation.description}</p>
                              )}
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>Trigger: {automation.triggerType}</span>
                                <span>•</span>
                                <span>Created {formatDistanceToNow(new Date(automation.createdAt), { addSuffix: true })}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  updateAutomationMutation.mutate({
                                    teamId: initialTeam!.id,
                                    automationId: automation.id,
                                    enabled: !automation.enabled
                                  });
                                }}
                                disabled={updateAutomationMutation.isPending}
                              >
                                {automation.enabled ? "Disable" : "Enable"}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm("Delete this automation?")) {
                                    deleteAutomationMutation.mutate({
                                      teamId: initialTeam!.id,
                                      automationId: automation.id
                                    });
                                  }
                                }}
                                disabled={deleteAutomationMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </MagicCard>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Zap className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-3" />
                      <p className="text-sm text-muted-foreground mb-4">No automations configured yet</p>
                      <Button variant="outline" onClick={() => toast.info("Automation creation coming soon!")}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Your First Automation
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Danger Zone Tab */}
              {activeTab === "danger" && (
                <div className="space-y-6 max-w-3xl">
                  <h3 className="text-xl font-semibold text-red-600">Danger Zone</h3>

                  <MagicCard className="p-6 border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Archive Team</h4>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                          Hide this team while preserving all data. Can be restored later.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                        onClick={() => setShowArchiveConfirm(true)}
                        disabled={archiveTeamMutation.isPending}
                      >
                        {archiveTeamMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Archive className="h-4 w-4 mr-2" />
                        )}
                        Archive Team
                      </Button>
                    </div>
                  </MagicCard>

                  <MagicCard className="p-6 border-red-200 dark:border-red-800">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-red-800 dark:text-red-200">Delete Team</h4>
                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                          Permanently delete this team. This action cannot be undone.
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={deleteTeamMutation.isPending}
                      >
                        {deleteTeamMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-2" />
                        )}
                        Delete Team
                      </Button>
                    </div>
                  </MagicCard>

                  {/* Archive Confirmation */}
                  {showArchiveConfirm && (
                    <MagicCard className="p-6 bg-yellow-50 dark:bg-yellow-900/10">
                      <h4 className="font-medium mb-2">Confirm Archive</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Are you sure you want to archive "{team.name}"? You can restore it later.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowArchiveConfirm(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="default"
                          onClick={handleArchiveTeam}
                          disabled={archiveTeamMutation.isPending}
                        >
                          {archiveTeamMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : null}
                          Confirm Archive
                        </Button>
                      </div>
                    </MagicCard>
                  )}

                  {/* Delete Confirmation */}
                  {showDeleteConfirm && (
                    <MagicCard className="p-6 bg-red-50 dark:bg-red-900/10">
                      <h4 className="font-medium mb-2">Confirm Deletion</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Are you sure you want to delete "{team.name}"? This action cannot be undone.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowDeleteConfirm(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => {
                            deleteTeamMutation.mutate(
                              { teamId: team.id, workspaceId: team.workspaceId },
                              {
                                onSuccess: () => {
                                  setShowDeleteConfirm(false);
                                  onClose();
                                }
                              }
                            );
                          }}
                          disabled={deleteTeamMutation.isPending}
                        >
                          {deleteTeamMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : null}
                          Confirm Delete
                        </Button>
                      </div>
                    </MagicCard>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

