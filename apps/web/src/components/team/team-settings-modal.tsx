// @epic-3.4-teams: Team settings and management modal
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MagicCard } from "@/components/magicui/magic-card";
import { ShineBorder } from "@/components/magicui/shine-border";
import { useUpdateTeam } from "@/hooks/mutations/team/use-update-team";
import { useDeleteTeam } from "@/hooks/mutations/team/use-delete-team";
import { useAddMember } from "@/hooks/mutations/team/use-add-member";
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
import { useCreateAutomation } from "@/hooks/mutations/team/use-create-automation";
import { useUpdateAutomation } from "@/hooks/mutations/team/use-update-automation";
import { useDeleteAutomation } from "@/hooks/mutations/team/use-delete-automation";
import { useSearchTeamMembers } from "@/hooks/queries/team/use-search-team-members";
import useWorkspaceStore from "@/store/workspace";
import { toast } from "sonner";
import { 
  Settings, 
  Users, 
  Shield, 
  Archive,
  Trash2,
  Edit3,
  Save,
  AlertTriangle,
  UserMinus,
  UserPlus,
  Crown,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  BarChart3,
  Activity,
  Bell,
  Zap,
  TrendingUp,
  Filter,
  SortAsc,
  Lock,
  Play,
  Pause,
  Plus,
  LineChart
} from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDistanceToNow } from "date-fns";

// Icon wrappers to fix TypeScript issues
const SettingsIcon = Settings as React.FC<{ className?: string }>;
const UsersIcon = Users as React.FC<{ className?: string }>;
const ShieldIcon = Shield as React.FC<{ className?: string }>;
const ArchiveIcon = Archive as React.FC<{ className?: string }>;
const Trash2Icon = Trash2 as React.FC<{ className?: string }>;
const Edit3Icon = Edit3 as React.FC<{ className?: string }>;
const SaveIcon = Save as React.FC<{ className?: string }>;
const AlertTriangleIcon = AlertTriangle as React.FC<{ className?: string }>;
const UserMinusIcon = UserMinus as React.FC<{ className?: string }>;
const UserPlusIcon = UserPlus as React.FC<{ className?: string }>;
const CrownIcon = Crown as React.FC<{ className?: string }>;
const SearchIcon = Search as React.FC<{ className?: string }>;
const Loader2Icon = Loader2 as React.FC<{ className?: string }>;
const CheckCircle2Icon = CheckCircle2 as React.FC<{ className?: string }>;
const XCircleIcon = XCircle as React.FC<{ className?: string }>;
const BarChart3Icon = BarChart3 as React.FC<{ className?: string }>;
const ActivityIcon = Activity as React.FC<{ className?: string }>;
const BellIcon = Bell as React.FC<{ className?: string }>;
const ZapIcon = Zap as React.FC<{ className?: string }>;
const TrendingUpIcon = TrendingUp as React.FC<{ className?: string }>;
const FilterIcon = Filter as React.FC<{ className?: string }>;
const SortAscIcon = SortAsc as React.FC<{ className?: string }>;
const LockIcon = Lock as React.FC<{ className?: string }>;
const PlayIcon = Play as React.FC<{ className?: string }>;
const PauseIcon = Pause as React.FC<{ className?: string }>;
const PlusIcon = Plus as React.FC<{ className?: string }>;
const LineChartIcon = LineChart as React.FC<{ className?: string }>;

interface TeamSettingsModalProps {
  open: boolean;
  onClose: () => void;
  team: Team | null;
}

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

const roleHierarchy = [
  { value: "Owner", label: "Owner", description: "Full access to all team settings" },
  { value: "Admin", label: "Admin", description: "Can manage team members and settings" },
  { value: "Team Lead", label: "Team Lead", description: "Can assign tasks and view reports" },
  { value: "Member", label: "Member", description: "Can view and complete assigned tasks" }
];

const tabs = [
  { id: "overview", label: "Overview", icon: BarChart3Icon },
  { id: "analytics", label: "Analytics", icon: LineChartIcon },
  { id: "general", label: "General", icon: SettingsIcon },
  { id: "members", label: "Members", icon: UsersIcon },
  { id: "permissions", label: "Permissions", icon: LockIcon },
  { id: "automations", label: "Automations", icon: ZapIcon },
  { id: "activity", label: "Activity Log", icon: ActivityIcon },
  { id: "notifications", label: "Notifications", icon: BellIcon },
  { id: "integrations", label: "Integrations", icon: TrendingUpIcon },
  { id: "danger", label: "Danger Zone", icon: AlertTriangleIcon }
];

export default function TeamSettingsModal({ 
  open, 
  onClose, 
  team: initialTeam
}: TeamSettingsModalProps) {
  const { workspace } = useWorkspaceStore();
  const updateTeamMutation = useUpdateTeam();
  const deleteTeamMutation = useDeleteTeam();
  const addMemberMutation = useAddMember();
  const removeMemberMutation = useRemoveMember();
  const updateMemberRoleMutation = useUpdateMemberRole();
  const archiveTeamMutation = useArchiveTeam();
  const updateNotificationsMutation = useUpdateTeamNotifications();

  // Queries for Phase 2 features
  const { data: statisticsData, isLoading: isLoadingStats } = useGetTeamStatistics(initialTeam?.id);
  const [activityPage, setActivityPage] = useState(0);
  const { data: activityData, isLoading: isLoadingActivity } = useGetTeamActivity(
    initialTeam?.id,
    { limit: 20, offset: activityPage * 20 }
  );
  const { data: notificationsData, isLoading: isLoadingNotifications } = useGetTeamNotifications(initialTeam?.id);
  const { data: integrationsData, isLoading: isLoadingIntegrations } = useGetTeamIntegrations(initialTeam?.id);

  // Queries and mutations for Phase 3 features
  const [analyticsTimeRange, setAnalyticsTimeRange] = useState<"7d" | "30d" | "90d" | "all">("7d");
  const { data: analyticsData, isLoading: isLoadingAnalytics } = useGetTeamAnalytics(initialTeam?.id, analyticsTimeRange);
  const { data: advancedPermissionsData, isLoading: isLoadingAdvancedPermissions } = useGetAdvancedPermissions(initialTeam?.id);
  const { data: automationsData, isLoading: isLoadingAutomations } = useGetTeamAutomations(initialTeam?.id);
  const createAutomationMutation = useCreateAutomation();
  const updateAutomationMutation = useUpdateAutomation();
  const deleteAutomationMutation = useDeleteAutomation();
  
  // Advanced member search
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
  const [memberSearchTerm, setMemberSearchTerm] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [notificationPreferences, setNotificationPreferences] = useState(notificationsData?.preferences || {});

  // Update team when initialTeam prop changes
  useEffect(() => {
    if (initialTeam) {
      setTeam(initialTeam);
      setEditedTeam(initialTeam);
      setValidationErrors({});
    }
  }, [initialTeam]);

  // Update notification preferences when data loads
  useEffect(() => {
    if (notificationsData?.preferences) {
      setNotificationPreferences(notificationsData.preferences);
    }
  }, [notificationsData]);

  // Filter members based on search term
  const filteredMembers = useMemo(() => {
    if (!team || !memberSearchTerm) return team?.members || [];
    const searchLower = memberSearchTerm.toLowerCase();
    return team.members.filter(member => 
      member.name.toLowerCase().includes(searchLower) ||
      member.email.toLowerCase().includes(searchLower) ||
      member.role.toLowerCase().includes(searchLower)
    );
  }, [team, memberSearchTerm]);

  // Validate team form
  const validateTeamForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!editedTeam?.name || editedTeam.name.trim().length === 0) {
      errors.name = "Team name is required";
    } else if (editedTeam.name.length < 3) {
      errors.name = "Team name must be at least 3 characters";
    } else if (editedTeam.name.length > 50) {
      errors.name = "Team name must be less than 50 characters";
    }

    if (editedTeam?.description && editedTeam.description.length > 200) {
      errors.description = "Description must be less than 200 characters";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  if (!team) return null;

  const handleSaveChanges = async () => {
    if (!editedTeam || !validateTeamForm()) return;
    
    try {
      await updateTeamMutation.mutateAsync({
        teamId: editedTeam.id,
        name: editedTeam.name,
        description: editedTeam.description,
        workspaceId: workspace?.id || "",
      });
    setTeam(editedTeam);
    setIsEditing(false);
      setValidationErrors({});
    } catch (error) {
      // Error is handled by mutation
    }
  };

  const handleCancelEdit = () => {
    setEditedTeam(team);
    setIsEditing(false);
    setValidationErrors({});
  };

  const handleDeleteTeam = async () => {
    try {
      await deleteTeamMutation.mutateAsync({
        teamId: team.id,
        workspaceId: workspace?.id || "",
      });
    setShowDeleteConfirm(false);
    onClose();
    } catch (error) {
      // Error is handled by mutation
    }
  };

  const handleArchiveTeam = async () => {
    try {
      await archiveTeamMutation.mutateAsync({
        teamId: team.id,
        workspaceId: workspace?.id || "",
      });
      setShowArchiveConfirm(false);
      onClose();
    } catch (error) {
      // Error is handled by mutation
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (team.members.length <= 1) {
      toast.error("Cannot remove the last member from a team");
      return;
    }

    try {
      await removeMemberMutation.mutateAsync({
        teamId: team.id,
        userId: memberId,
        workspaceId: workspace?.id || "",
      });
      // Optimistically update local state
      setTeam({
        ...team,
        members: team.members.filter(m => m.id !== memberId)
      });
    } catch (error) {
      // Error is handled by mutation
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    try {
      await updateMemberRoleMutation.mutateAsync({
        teamId: team.id,
        userId: memberId,
        role: newRole,
        workspaceId: workspace?.id || "",
      });
      // Optimistically update local state
      setTeam({
        ...team,
        members: team.members.map(m => 
          m.id === memberId ? { ...m, role: newRole } : m
        )
      });
    } catch (error) {
      // Error is handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <ShineBorder
          className="relative overflow-hidden rounded-lg border-0 bg-transparent"
          color={["#A07CFE", "#FE8FB5", "#FFBE7B"]}
        >
          <MagicCard className="cursor-pointer border-0 bg-transparent shadow-none">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <SettingsIcon className="h-5 w-5" />
                  <span>Team Settings - {team.name}</span>
                </div>
              </DialogTitle>
              <DialogDescription>
                Manage team information, members, permissions, and advanced settings.
              </DialogDescription>
            </DialogHeader>

            {/* Team Info Bar */}
            <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", team.color)}>
                <UsersIcon className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{team.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {team.projectName} • {team.members.length} members • Lead: {team.lead}
                </p>
              </div>
            </div>

            {/* Custom Tab Navigation */}
            <div className="w-full">
              <div className="flex border-b border-zinc-200 dark:border-zinc-800">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "flex items-center space-x-2 px-4 py-2 text-sm font-medium transition-colors border-b-2",
                        activeTab === tab.id
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab Content */}
              <div className="mt-6">
                {/* Overview/Statistics Tab */}
                {activeTab === "overview" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Team Overview</h3>
                      {isLoadingStats ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2Icon className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : statisticsData?.statistics ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {/* Member Count Card */}
                          <MagicCard className="p-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-muted-foreground">Team Members</p>
                                <p className="text-3xl font-bold mt-2">{statisticsData.statistics.memberCount}</p>
                              </div>
                              <UsersIcon className="w-10 h-10 text-blue-500 opacity-20" />
                            </div>
                          </MagicCard>

                          {/* Total Tasks Card */}
                          <MagicCard className="p-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-muted-foreground">Total Tasks</p>
                                <p className="text-3xl font-bold mt-2">{statisticsData.statistics.tasks.total}</p>
                              </div>
                              <Activity className="w-10 h-10 text-purple-500 opacity-20" />
                            </div>
                          </MagicCard>

                          {/* Completion Rate Card */}
                          <MagicCard className="p-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-muted-foreground">Completion Rate</p>
                                <p className="text-3xl font-bold mt-2">{statisticsData.statistics.tasks.completionRate}%</p>
                              </div>
                              <CheckCircle2Icon className="w-10 h-10 text-green-500 opacity-20" />
                            </div>
                          </MagicCard>

                          {/* Completed Tasks Card */}
                          <MagicCard className="p-6">
                            <div>
                              <p className="text-sm text-muted-foreground">Completed Tasks</p>
                              <p className="text-2xl font-bold mt-2 text-green-600">{statisticsData.statistics.tasks.completed}</p>
                            </div>
                          </MagicCard>

                          {/* In Progress Tasks Card */}
                          <MagicCard className="p-6">
                            <div>
                              <p className="text-sm text-muted-foreground">In Progress</p>
                              <p className="text-2xl font-bold mt-2 text-blue-600">{statisticsData.statistics.tasks.inProgress}</p>
                            </div>
                          </MagicCard>

                          {/* Todo Tasks Card */}
                          <MagicCard className="p-6">
                            <div>
                              <p className="text-sm text-muted-foreground">To Do</p>
                              <p className="text-2xl font-bold mt-2 text-gray-600">{statisticsData.statistics.tasks.todo}</p>
                            </div>
                          </MagicCard>

                          {/* Recent Activity Card */}
                          <MagicCard className="p-6 md:col-span-2">
                            <div>
                              <p className="text-sm text-muted-foreground">Recent Activity (Last 7 Days)</p>
                              <p className="text-2xl font-bold mt-2">{statisticsData.statistics.recentActivityCount} activities</p>
                            </div>
                          </MagicCard>

                          {/* Team Age Card */}
                          <MagicCard className="p-6">
                            <div>
                              <p className="text-sm text-muted-foreground">Team Age</p>
                              <p className="text-lg font-medium mt-2">
                                {formatDistanceToNow(new Date(statisticsData.statistics.createdAt), { addSuffix: true })}
                              </p>
                            </div>
                          </MagicCard>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-8">No statistics available</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Analytics Dashboard Tab - Phase 3 */}
                {activeTab === "analytics" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Team Analytics</h3>
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
                        <Loader2Icon className="w-8 h-8 animate-spin text-muted-foreground" />
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
                                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                    <div
                                      className="bg-green-500 h-2 rounded-full"
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
                          {/* Status Distribution */}
                          <MagicCard className="p-6">
                            <h4 className="font-medium mb-4">Status Distribution</h4>
                            <div className="space-y-3">
                              {analyticsData.analytics.statusDistribution.map((item) => (
                                <div key={item.status} className="flex items-center justify-between">
                                  <span className="text-sm capitalize">{item.status.replace("_", " ")}</span>
                                  <div className="flex items-center gap-2">
                                    <div className="w-24 bg-gray-200 rounded-full h-2">
                                      <div
                                        className={cn(
                                          "h-2 rounded-full",
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

                          {/* Priority Distribution */}
                          <MagicCard className="p-6">
                            <h4 className="font-medium mb-4">Priority Distribution</h4>
                            <div className="space-y-3">
                              {analyticsData.analytics.priorityDistribution.map((item) => (
                                <div key={item.priority} className="flex items-center justify-between">
                                  <span className="text-sm capitalize">{item.priority || "none"}</span>
                                  <div className="flex items-center gap-2">
                                    <div className="w-24 bg-gray-200 rounded-full h-2">
                                      <div
                                        className={cn(
                                          "h-2 rounded-full",
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
                                  <span className="w-24 text-muted-foreground">{new Date(item.date).toLocaleDateString()}</span>
                                  <div className="flex-1 flex gap-1">
                                    <div
                                      className="bg-green-500 h-6 rounded"
                                      style={{ width: `${Math.max(Number(item.completed) * 10, 2)}px` }}
                                      title={`${item.completed} completed`}
                                    />
                                    <div
                                      className="bg-blue-500 h-6 rounded"
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
                        <LineChartIcon className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-3" />
                        <p className="text-sm text-muted-foreground">No analytics data available</p>
                      </div>
                    )}
                  </div>
                )}

                {/* General Settings */}
                {activeTab === "general" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">General Information</h3>
                      {!isEditing ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditing(true)}
                        >
                          <Edit3Icon className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      ) : (
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancelEdit}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveChanges}
                          >
                            <SaveIcon className="h-4 w-4 mr-2" />
                            Save
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Team Name</label>
                        <Input
                          value={isEditing ? editedTeam.name : team.name}
                          onChange={(e) => {
                            setEditedTeam({ ...editedTeam, name: e.target.value });
                            if (validationErrors.name) {
                              setValidationErrors({ ...validationErrors, name: "" });
                            }
                          }}
                          disabled={!isEditing}
                          className={cn(validationErrors.name && "border-red-500")}
                        />
                        {validationErrors.name && (
                          <div className="flex items-center gap-1 text-xs text-red-600">
                            <XCircleIcon className="h-3 w-3" />
                            {validationErrors.name}
                          </div>
                        )}
                        {!isEditing && !validationErrors.name && (
                          <p className="text-xs text-muted-foreground">
                            Click Edit to rename this team
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Description</label>
                        <Input
                          value={isEditing ? editedTeam.description : team.description}
                          onChange={(e) => {
                            setEditedTeam({ ...editedTeam, description: e.target.value });
                            if (validationErrors.description) {
                              setValidationErrors({ ...validationErrors, description: "" });
                            }
                          }}
                          disabled={!isEditing}
                          className={cn(validationErrors.description && "border-red-500")}
                        />
                        {validationErrors.description && (
                          <div className="flex items-center gap-1 text-xs text-red-600">
                            <XCircleIcon className="h-3 w-3" />
                            {validationErrors.description}
                          </div>
                        )}
                        {!isEditing && !validationErrors.description && (
                          <p className="text-xs text-muted-foreground">
                            Max 200 characters
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Project</label>
                        <Input
                          value={team.projectName}
                          disabled
                          className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">
                          Project assignment cannot be changed after team creation
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Team Lead</label>
                        <Input
                          value={team.lead}
                          disabled
                          className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">
                          Change team lead in the Members tab by assigning "Team Lead" role
                        </p>
                      </div>

                      {isEditing && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Team Color</label>
                          <div className="flex space-x-2">
                            {["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500", "bg-red-500", "bg-pink-500"].map((color) => (
                              <button
                                key={color}
                                onClick={() => setEditedTeam({ ...editedTeam, color })}
                                className={cn(
                                  "w-8 h-8 rounded-full border-2",
                                  color,
                                  editedTeam.color === color ? "border-gray-800 dark:border-gray-200" : "border-transparent"
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Members Management */}
                {activeTab === "members" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Team Members ({team.members.length})</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toast.info("Add member functionality coming soon")}
                        disabled={addMemberMutation.isPending}
                      >
                        {addMemberMutation.isPending ? (
                          <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <UserPlusIcon className="h-4 w-4 mr-2" />
                        )}
                        Add Member
                      </Button>
                    </div>

                    {/* Advanced Search and Filters - Phase 3 */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      {/* Search Input */}
                      <div className="relative flex-1">
                        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search members by name or email..."
                          value={memberFilters.query}
                          onChange={(e) => setMemberFilters({
                            ...memberFilters,
                            query: e.target.value
                          })}
                          className="pl-9"
                        />
                      </div>

                      {/* Role Filter */}
                      <div className="flex items-center gap-1">
                        <FilterIcon className="w-4 h-4 text-muted-foreground mr-1" />
                        <select
                          value={memberFilters.role || ""}
                          onChange={(e) => setMemberFilters({
                            ...memberFilters,
                            role: e.target.value || undefined
                          })}
                          className="px-3 py-2 border rounded-md bg-background text-sm min-w-[120px]"
                        >
                          <option value="">All Roles</option>
                          {roleHierarchy.map((role) => (
                            <option key={role.value} value={role.value}>{role.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Sort By */}
                      <div className="flex items-center gap-1">
                        <SortAscIcon className="w-4 h-4 text-muted-foreground mr-1" />
                        <select
                          value={memberFilters.sortBy}
                          onChange={(e) => setMemberFilters({
                            ...memberFilters,
                            sortBy: e.target.value as any
                          })}
                          className="px-3 py-2 border rounded-md bg-background text-sm min-w-[120px]"
                        >
                          <option value="name">Name</option>
                          <option value="joinedAt">Join Date</option>
                          <option value="tasksCompleted">Tasks</option>
                        </select>
                      </div>

                      {/* Sort Order */}
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setMemberFilters({
                          ...memberFilters,
                          order: memberFilters.order === "asc" ? "desc" : "asc"
                        })}
                        title={memberFilters.order === "asc" ? "Ascending" : "Descending"}
                      >
                        <SortAscIcon className={cn(
                          "w-4 h-4",
                          memberFilters.order === "desc" && "rotate-180"
                        )} />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {filteredMembers.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <SearchIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No members found matching "{memberSearchTerm}"</p>
                        </div>
                      ) : (
                        filteredMembers.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-medium">{member.name.charAt(0)}</span>
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{member.name}</span>
                                {member.name === team.lead && (
                                  <Badge variant="secondary" className="text-xs">
                                    <CrownIcon className="w-3 h-3 mr-1" />
                                    Lead
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">{member.email}</div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <select
                              value={member.role}
                              onChange={(e) => handleChangeRole(member.id, e.target.value)}
                              className="px-2 py-1 border border-input bg-background rounded text-sm"
                              disabled={updateMemberRoleMutation.isPending}
                            >
                              {roleHierarchy.map((role) => (
                                <option key={role.value} value={role.value}>
                                  {role.label}
                                </option>
                              ))}
                            </select>
                            
                            {team.members.length > 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveMember(member.id)}
                                className="text-red-600 hover:text-red-700"
                                disabled={removeMemberMutation.isPending}
                              >
                                {removeMemberMutation.isPending ? (
                                  <Loader2Icon className="h-4 w-4 animate-spin" />
                                ) : (
                                <UserMinusIcon className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      )))}
                    </div>
                  </div>
                )}

                {/* Permissions Tab - Phase 3 Enhanced */}
                {activeTab === "permissions" && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium">Advanced Permissions</h3>

                    {isLoadingAdvancedPermissions ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2Icon className="w-8 h-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : advancedPermissionsData?.members ? (
                      <div className="space-y-4">
                        {advancedPermissionsData.members.map((member) => (
                          <MagicCard key={member.userId} className="p-4">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <p className="font-medium">{member.userName}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline">{member.role}</Badge>
                                  <span className="text-xs text-muted-foreground">{member.userEmail}</span>
                                </div>
                              </div>
                              <LockIcon className="w-5 h-5 text-muted-foreground" />
                            </div>

                            {/* Permission Matrix Grid */}
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div className="flex items-center gap-2">
                                {member.permissions.canManageMembers ? (
                                  <CheckCircle2Icon className="w-4 h-4 text-green-500 flex-shrink-0" />
                                ) : (
                                  <XCircleIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                )}
                                <span className={member.permissions.canManageMembers ? "" : "text-muted-foreground"}>
                                  Manage Members
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {member.permissions.canManageTasks ? (
                                  <CheckCircle2Icon className="w-4 h-4 text-green-500 flex-shrink-0" />
                                ) : (
                                  <XCircleIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                )}
                                <span className={member.permissions.canManageTasks ? "" : "text-muted-foreground"}>
                                  Manage Tasks
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {member.permissions.canManageProjects ? (
                                  <CheckCircle2Icon className="w-4 h-4 text-green-500 flex-shrink-0" />
                                ) : (
                                  <XCircleIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                )}
                                <span className={member.permissions.canManageProjects ? "" : "text-muted-foreground"}>
                                  Manage Projects
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {member.permissions.canViewAnalytics ? (
                                  <CheckCircle2Icon className="w-4 h-4 text-green-500 flex-shrink-0" />
                                ) : (
                                  <XCircleIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                )}
                                <span className={member.permissions.canViewAnalytics ? "" : "text-muted-foreground"}>
                                  View Analytics
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {member.permissions.canManageIntegrations ? (
                                  <CheckCircle2Icon className="w-4 h-4 text-green-500 flex-shrink-0" />
                                ) : (
                                  <XCircleIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                )}
                                <span className={member.permissions.canManageIntegrations ? "" : "text-muted-foreground"}>
                                  Manage Integrations
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {member.permissions.canDeleteTeam ? (
                                  <CheckCircle2Icon className="w-4 h-4 text-green-500 flex-shrink-0" />
                                ) : (
                                  <XCircleIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                )}
                                <span className={member.permissions.canDeleteTeam ? "" : "text-muted-foreground"}>
                                  Delete Team
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {member.permissions.canChangePermissions ? (
                                  <CheckCircle2Icon className="w-4 h-4 text-green-500 flex-shrink-0" />
                                ) : (
                                  <XCircleIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                )}
                                <span className={member.permissions.canChangePermissions ? "" : "text-muted-foreground"}>
                                  Change Permissions
                                </span>
                              </div>
                            </div>
                          </MagicCard>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <LockIcon className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-3" />
                        <p className="text-sm text-muted-foreground">No permission data available</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Automations Tab - Phase 3 */}
                {activeTab === "automations" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Team Automations</h3>
                      <Button
                        onClick={() => toast.info("Automation creation coming soon!")}
                      >
                        <PlusIcon className="w-4 h-4 mr-2" />
                        Create Automation
                      </Button>
                    </div>

                    {isLoadingAutomations ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2Icon className="w-8 h-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : automationsData?.automations && automationsData.automations.length > 0 ? (
                      <div className="space-y-3">
                        {automationsData.automations.map((automation) => (
                          <MagicCard key={automation.id} className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  {automation.enabled ? (
                                    <PlayIcon className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <PauseIcon className="w-4 h-4 text-gray-400" />
                                  )}
                                  <p className="font-medium">{automation.name}</p>
                                  <Badge variant={automation.enabled ? "default" : "secondary"}>
                                    {automation.enabled ? "Active" : "Inactive"}
                                  </Badge>
                                </div>
                                {automation.description && (
                                  <p className="text-sm text-muted-foreground mb-2">
                                    {automation.description}
                                  </p>
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
                                  onClick={() => toast.info("Edit automation coming soon!")}
                                >
                                  <Edit3Icon className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm("Are you sure you want to delete this automation?")) {
                                      deleteAutomationMutation.mutate({
                                        teamId: initialTeam!.id,
                                        automationId: automation.id
                                      });
                                    }
                                  }}
                                  disabled={deleteAutomationMutation.isPending}
                                >
                                  <Trash2Icon className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          </MagicCard>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <ZapIcon className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-3" />
                        <p className="text-sm text-muted-foreground mb-4">No automations configured yet</p>
                        <Button variant="outline" onClick={() => toast.info("Automation creation coming soon!")}>
                          <PlusIcon className="w-4 h-4 mr-2" />
                          Create Your First Automation
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Activity Log Tab */}
                {activeTab === "activity" && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Activity Log</h3>
                      {isLoadingActivity ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2Icon className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : activityData?.activities && activityData.activities.length > 0 ? (
                        <div className="space-y-3">
                          {activityData.activities.map((activity) => (
                            <MagicCard key={activity.id} className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <ActivityIcon className="w-4 h-4 text-blue-500" />
                                    <span className="font-medium text-sm">{activity.action}</span>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
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
                          
                          {/* Pagination Controls */}
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
                          <ActivityIcon className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-3" />
                          <p className="text-sm text-muted-foreground">No activity recorded yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Notifications Tab */}
                {activeTab === "notifications" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Notification Preferences</h3>
                      {isLoadingNotifications ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2Icon className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {/* Task Notifications */}
                          <div>
                            <h4 className="font-medium mb-3">Task Notifications</h4>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium">Task Assigned</p>
                                  <p className="text-xs text-muted-foreground">Get notified when you're assigned a task</p>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={notificationPreferences.taskAssigned}
                                  onChange={(e) => setNotificationPreferences({
                                    ...notificationPreferences,
                                    taskAssigned: e.target.checked
                                  })}
                                  className="h-4 w-4"
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium">Task Completed</p>
                                  <p className="text-xs text-muted-foreground">Get notified when a task is completed</p>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={notificationPreferences.taskCompleted}
                                  onChange={(e) => setNotificationPreferences({
                                    ...notificationPreferences,
                                    taskCompleted: e.target.checked
                                  })}
                                  className="h-4 w-4"
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium">Task Overdue</p>
                                  <p className="text-xs text-muted-foreground">Get notified when a task becomes overdue</p>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={notificationPreferences.taskOverdue}
                                  onChange={(e) => setNotificationPreferences({
                                    ...notificationPreferences,
                                    taskOverdue: e.target.checked
                                  })}
                                  className="h-4 w-4"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Team Notifications */}
                          <div>
                            <h4 className="font-medium mb-3">Team Notifications</h4>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium">Member Joined</p>
                                  <p className="text-xs text-muted-foreground">Get notified when a new member joins</p>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={notificationPreferences.memberJoined}
                                  onChange={(e) => setNotificationPreferences({
                                    ...notificationPreferences,
                                    memberJoined: e.target.checked
                                  })}
                                  className="h-4 w-4"
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium">Member Left</p>
                                  <p className="text-xs text-muted-foreground">Get notified when a member leaves</p>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={notificationPreferences.memberLeft}
                                  onChange={(e) => setNotificationPreferences({
                                    ...notificationPreferences,
                                    memberLeft: e.target.checked
                                  })}
                                  className="h-4 w-4"
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium">Team Updated</p>
                                  <p className="text-xs text-muted-foreground">Get notified when team settings change</p>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={notificationPreferences.teamUpdated}
                                  onChange={(e) => setNotificationPreferences({
                                    ...notificationPreferences,
                                    teamUpdated: e.target.checked
                                  })}
                                  className="h-4 w-4"
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium">Mentions</p>
                                  <p className="text-xs text-muted-foreground">Get notified when someone mentions you</p>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={notificationPreferences.mentions}
                                  onChange={(e) => setNotificationPreferences({
                                    ...notificationPreferences,
                                    mentions: e.target.checked
                                  })}
                                  className="h-4 w-4"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Notification Channels */}
                          <div>
                            <h4 className="font-medium mb-3">Notification Channels</h4>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium">Email Notifications</p>
                                  <p className="text-xs text-muted-foreground">Receive notifications via email</p>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={notificationPreferences.emailNotifications}
                                  onChange={(e) => setNotificationPreferences({
                                    ...notificationPreferences,
                                    emailNotifications: e.target.checked
                                  })}
                                  className="h-4 w-4"
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium">Push Notifications</p>
                                  <p className="text-xs text-muted-foreground">Receive browser push notifications</p>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={notificationPreferences.pushNotifications}
                                  onChange={(e) => setNotificationPreferences({
                                    ...notificationPreferences,
                                    pushNotifications: e.target.checked
                                  })}
                                  className="h-4 w-4"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Digest Frequency */}
                          <div>
                            <h4 className="font-medium mb-3">Digest Frequency</h4>
                            <select
                              value={notificationPreferences.digest}
                              onChange={(e) => setNotificationPreferences({
                                ...notificationPreferences,
                                digest: e.target.value as any
                              })}
                              className="w-full p-2 border rounded-md bg-background"
                            >
                              <option value="realtime">Real-time</option>
                              <option value="hourly">Hourly</option>
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                              <option value="never">Never</option>
                            </select>
                            <p className="text-xs text-muted-foreground mt-1">
                              How often you want to receive notification digests
                            </p>
                          </div>

                          {/* Save Button */}
                          <div className="flex justify-end pt-4">
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
                                  <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <SaveIcon className="h-4 w-4 mr-2" />
                                  Save Preferences
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Integrations Tab */}
                {activeTab === "integrations" && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Team Integrations</h3>
                      {isLoadingIntegrations ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2Icon className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : integrationsData?.integrations && integrationsData.integrations.length > 0 ? (
                        <div className="space-y-3">
                          {integrationsData.integrations.map((integration) => (
                            <MagicCard key={integration.id} className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                                    <ZapIcon className="w-5 h-5 text-white" />
                                  </div>
                                  <div>
                                    <p className="font-medium">{integration.name}</p>
                                    <p className="text-xs text-muted-foreground">{integration.provider}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    "px-2 py-1 text-xs rounded-full",
                                    integration.status === "active" 
                                      ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                                      : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                                  )}>
                                    {integration.status}
                                  </span>
                                  <Button variant="ghost" size="sm">
                                    <SettingsIcon className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                              {integration.lastSync && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  Last synced: {formatDistanceToNow(new Date(integration.lastSync), { addSuffix: true })}
                                </p>
                              )}
                            </MagicCard>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <ZapIcon className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-3" />
                          <p className="text-sm text-muted-foreground mb-4">No integrations connected</p>
                          <Button variant="outline">
                            <ZapIcon className="w-4 h-4 mr-2" />
                            Add Integration
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Danger Zone */}
                {activeTab === "danger" && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-red-600">Danger Zone</h3>
                    
                    <div className="space-y-4">
                      {/* Archive Team */}
                      <div className="p-4 border border-yellow-200 dark:border-yellow-800 rounded-lg bg-yellow-50 dark:bg-yellow-900/10">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Archive Team</h4>
                            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                              Archive this team to hide it from active teams while preserving all data.
                            </p>
                          </div>
                          <Button 
                            variant="outline" 
                            className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                            onClick={() => setShowArchiveConfirm(true)}
                            disabled={archiveTeamMutation.isPending}
                          >
                            {archiveTeamMutation.isPending ? (
                              <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                            <ArchiveIcon className="h-4 w-4 mr-2" />
                            )}
                            Archive
                          </Button>
                        </div>
                      </div>

                      {/* Archive Confirmation */}
                      {showArchiveConfirm && (
                        <div className="p-4 border border-yellow-300 dark:border-yellow-700 rounded-lg bg-yellow-100 dark:bg-yellow-900/20">
                          <div className="flex items-center space-x-2 mb-3">
                            <AlertTriangleIcon className="h-5 w-5 text-yellow-600" />
                            <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Confirm Archiving</h4>
                          </div>
                          <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
                            Are you sure you want to archive "{team.name}"? The team will:
                          </p>
                          <ul className="text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside mb-4 space-y-1">
                            <li>Be hidden from active team listings</li>
                            <li>Preserve all team data and members</li>
                            <li>Can be restored later</li>
                          </ul>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowArchiveConfirm(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={handleArchiveTeam}
                              className="bg-yellow-600 hover:bg-yellow-700"
                              disabled={archiveTeamMutation.isPending}
                            >
                              {archiveTeamMutation.isPending ? (
                                <>
                                  <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                                  Archiving...
                                </>
                              ) : (
                                "Yes, Archive Team"
                              )}
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Delete Team */}
                      <div className="p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/10">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-red-800 dark:text-red-200">Delete Team</h4>
                            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                              Permanently delete this team and all associated data. This action cannot be undone.
                            </p>
                          </div>
                          <Button 
                            variant="destructive"
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={deleteTeamMutation.isPending}
                          >
                            {deleteTeamMutation.isPending ? (
                              <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                            <Trash2Icon className="h-4 w-4 mr-2" />
                            )}
                            Delete
                          </Button>
                        </div>
                      </div>

                      {/* Delete Confirmation */}
                      {showDeleteConfirm && (
                        <div className="p-4 border border-red-300 dark:border-red-700 rounded-lg bg-red-100 dark:bg-red-900/20">
                          <div className="flex items-center space-x-2 mb-3">
                            <AlertTriangleIcon className="h-5 w-5 text-red-600" />
                            <h4 className="font-medium text-red-800 dark:text-red-200">Confirm Deletion</h4>
                          </div>
                          <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                            Are you sure you want to delete "{team.name}"? This will:
                          </p>
                          <ul className="text-sm text-red-700 dark:text-red-300 list-disc list-inside mb-4 space-y-1">
                            <li>Remove all team members</li>
                            <li>Delete all team data</li>
                            <li>Remove team from project assignments</li>
                          </ul>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowDeleteConfirm(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={handleDeleteTeam}
                              disabled={deleteTeamMutation.isPending}
                            >
                              {deleteTeamMutation.isPending ? (
                                <>
                                  <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                                  Deleting...
                                </>
                              ) : (
                                "Yes, Delete Team"
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </MagicCard>
        </ShineBorder>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 