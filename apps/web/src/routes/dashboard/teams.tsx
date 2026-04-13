// @epic-3.4-teams: Comprehensive team management dashboard with real backend integration
// @epic-1.1-rbac: Teams dashboard with unified Magic UI navigation
// @persona-sarah: PM needs comprehensive team management view
// @persona-jennifer: Exec needs team overview and member analytics  
// @persona-david: Team lead needs detailed team management tools
// @persona-mike: Dev needs efficient team collaboration access
// @persona-lisa: Designer needs team file sharing and collaboration

"use client";

import React, { useState, useMemo, lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MagicCard } from "@/components/magicui/magic-card";
import { ShineBorder } from "@/components/magicui/shine-border";
import {
  Search,
  Plus,
  Users,
  TrendingUp,
  Calendar,
  Settings,
  BarChart3,
  MessageSquare,
  Hash,
  Shield,
  MoreHorizontal,
  Activity,
  Target,
  Edit3,
  UserPlus,
  Archive,
  Trash2,
  LayoutDashboard,
  AlertTriangle,
  Lock,
  Clock,
  CheckCircle2,
  Eye,
  Crown,
  UserCheck,
  Zap,
  LayoutGrid,
  List,
  Download,
  Briefcase,
  MapPin
} from "lucide-react";
import { cn } from "@/lib/cn";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";
import PageTitle from "@/components/page-title";
import useWorkspaceStore from "@/store/workspace";
import useGetProjects from "@/hooks/queries/project/use-get-projects";
import useGetWorkspaceUsers from "@/hooks/queries/workspace-users/use-get-workspace-users";
import { useTeams } from "@/hooks/use-teams";
import { useTeamPermissions } from "@/hooks/useTeamPermissions";
import useAuth from "@/components/providers/auth-provider/hooks/use-auth";
import useInviteWorkspaceUser from "@/hooks/mutations/workspace-user/use-invite-workspace-user";
import { useTeamMetrics } from "@/hooks/queries/team/use-team-metrics";
import { useChangeUserRole } from "@/hooks/mutations/workspace-user/use-change-user-role";
import { useToggleUserStatus } from "@/hooks/mutations/workspace-user/use-toggle-user-status";
import { useResetPassword } from "@/hooks/mutations/workspace-user/use-reset-password";
import { useDeleteWorkspaceUser } from "@/hooks/mutations/workspace-user/use-delete-workspace-user";
import { usePagination } from "@/hooks/use-pagination";
import { MeridianPagination } from "@/components/ui/pagination";
import { exportTeams, exportMembers, exportUsers } from "@/utils/export-utils";
import { useDebounce } from "@/hooks/use-debounce";
import { useKeyboardShortcuts, useEscapeKey } from "@/hooks/use-keyboard-shortcuts";
import type { WorkspaceUser } from "@/types/workspace-user";
import { TEAMS_DASHBOARD_AVAILABLE_ROLES } from "@/lib/teams-dashboard/teams-role-constants";
import { useTeamsTabFromSearch } from "@/lib/teams-dashboard/use-teams-tab-sync";
import { logger } from "@/lib/logger";

// Lazy load heavy modal components for better performance
const TeamCreationModal = lazy(() => import("@/components/team/team-creation-modal"));
const TeamSettingsModal = lazy(() => import("@/components/team/team-settings-modal-redesign"));
const TeamCalendarModal = lazy(() => import("@/components/team/team-calendar-modal"));
const TeamDashboardModal = lazy(() => import("@/components/team/team-dashboard-modal"));
const RoleManagementModal = lazy(() => import("@/components/team/role-management-modal"));
const TeamChatContainer = lazy(() => import("@/components/team-chat"));
const TeamMemberProfileModal = lazy(() => import("@/components/profile/team-member/team-member-profile-modal").then(m => ({ default: m.TeamMemberProfileModal })));
import { useUnifiedWebSocket } from "@/hooks/useUnifiedWebSocket";
import { useGetOnlineWorkspaceUsers } from "@/hooks/queries/workspace-users/use-online-workspace-users";
import { NoTeamsEmpty, NoFilteredTeamsEmpty, NoMembersEmpty, NoFilteredMembersEmpty, NoUsersEmpty, NoFilteredUsersEmpty } from "@/components/team/empty-states";
// @epic-1.1-rbac: Magic UI enhancements for modern team management
import { BlurFade } from "@/components/magicui/blur-fade";
import LazyDashboardLayout from "@/components/performance/lazy-dashboard-layout";
import AnimatedStatsCard from "@/components/dashboard/animated-stats-card";
import NumberTicker from "@/components/magicui/number-ticker";
import { motion, AnimatePresence } from "framer-motion";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import UniversalHeader from "@/components/dashboard/universal-header";
import { ErrorBoundary } from "react-error-boundary";
import { RefreshCw as RefreshIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import InviteTeamMemberModal from "@/components/team/invite-team-member-modal";

// Error fallback for Teams
function TeamsErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Teams Error</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {error.message || 'Something went wrong loading teams'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={resetErrorBoundary} variant="default">
                <RefreshIcon className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button onClick={() => window.location.reload()} variant="outline">
                Reload Page
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Wrapped component
function TeamsPageWithErrorBoundary() {
  return (
    <ErrorBoundary FallbackComponent={TeamsErrorFallback}>
      <TeamsPage />
    </ErrorBoundary>
  );
}

export const Route = createFileRoute("/dashboard/teams")({
  component: TeamsPageWithErrorBoundary,
  validateSearch: (search: Record<string, unknown>) => {
    const t = search.tab;
    const tab =
      t === "teams" || t === "members" || t === "users" || t === "directory"
        ? t
        : undefined;
    return { tab } as { tab?: typeof tab };
  },
});

// Status colors
const statusColors = {
  online: "bg-green-500",
  away: "bg-yellow-500", 
  busy: "bg-red-500",
  offline: "bg-gray-400"
};

// Availability colors
const availabilityColors = {
  available: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  meeting: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  focused: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  unavailable: "bg-secondary text-secondary-foreground dark:bg-secondary-hover dark:text-secondary-foreground"
};

const AVAILABLE_ROLES = TEAMS_DASHBOARD_AVAILABLE_ROLES;

// Enhanced team member interface combining backend data
interface EnhancedTeamMember extends WorkspaceUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  availability: 'available' | 'meeting' | 'focused' | 'unavailable';
  workload: number;
  performance: number;
  tasksCompleted: number;
  currentTasks: number;
  lastActive: string;
  teamName?: string;
  teamColor?: string;
  projectId?: string;
  projectName?: string;
}

// Enhanced team interface
interface EnhancedTeam {
  id: string;
  name: string;
  description: string;
  type: 'general' | 'project';
  workspaceId: string;
  projectId?: string;
  projectName?: string;
  members: EnhancedTeamMember[];
  memberCount: number;
  createdAt: Date;
  lead?: string;
  performance?: number;
  workload?: number;
  color?: string;
}

// Enhanced team role mapping
const ROLE_LABELS = {
  "workspace-manager": { label: "Workspace Manager", color: "bg-red-500", icon: Crown },
  "department-head": { label: "Department Head", color: "bg-orange-500", icon: Crown },
  "team-lead": { label: "Team Lead", color: "bg-blue-500", icon: UserCheck },
  "project-manager": { label: "Project Manager", color: "bg-purple-500", icon: Target },
  "member": { label: "Member", color: "bg-green-500", icon: Users },
  "contractor": { label: "Contractor", color: "bg-gray-500", icon: Users },
  "stakeholder": { label: "Stakeholder", color: "bg-yellow-500", icon: Users },
};

function TeamsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [teamTypeFilter, setTeamTypeFilter] = useState<string>("");
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [workloadFilter, setWorkloadFilter] = useState<string>("");
  const [healthFilter, setHealthFilter] = useState<string>("");
  const [viewMode, setViewMode] = useState<"teams" | "members" | "users" | "directory">("teams");
  const [teamsViewType, setTeamsViewType] = useState<"grid" | "list">("grid");
  const [directoryViewType, setDirectoryViewType] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"name" | "members" | "recent" | "performance">("name");
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  
  // Bulk operations state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  
  // Modal states
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [isTeamSettingsOpen, setIsTeamSettingsOpen] = useState(false);
  const [isTeamCalendarOpen, setIsTeamCalendarOpen] = useState(false);
  const [isTeamDashboardOpen, setIsTeamDashboardOpen] = useState(false);
  const [isRoleManagementOpen, setIsRoleManagementOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<EnhancedTeamMember | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(null);
  
  // Selected team states
  const [selectedTeamForSettings, setSelectedTeamForSettings] = useState<EnhancedTeam | null>(null);
  const [selectedTeamForCalendar, setSelectedTeamForCalendar] = useState<EnhancedTeam | null>(null);
  const [selectedTeamForDashboard, setSelectedTeamForDashboard] = useState<EnhancedTeam | null>(null);
  const [selectedTeamForChat, setSelectedTeamForChat] = useState<EnhancedTeam | null>(null);

  const { workspace } = useWorkspaceStore();
  const { user } = useAuth();

  const ENABLE_TEAMS_WS = import.meta.env.VITE_ENABLE_TEAMS_WEBSOCKET === "true";
  const { connectionState } = useUnifiedWebSocket({ enabled: ENABLE_TEAMS_WS });
  const isConnected = connectionState.isConnected;
  
  // @epic-2.2-realtime: Fallback API for online users when WebSocket is not connected
  const { data: apiOnlineUsers } = useGetOnlineWorkspaceUsers({ 
    workspaceId: workspace?.id || "" 
  });

  // @epic-3.4-teams: Get real teams data from backend
  const {
    data: teamsData,
    isLoading: isTeamsLoading,
    isError: isTeamsError,
    error: teamsQueryError,
    refetch: refetchTeams,
  } = useTeams(workspace?.id || "");
  
  // @epic-3.1-dashboard: Get projects for filtering and team association
  const { data: projects, isLoading: isProjectsLoading } = useGetProjects({ 
    workspaceId: workspace?.id || "" 
  });

  // @epic-3.4-teams: Get workspace users for enhanced member data
  const { data: workspaceUsers, isLoading: isUsersLoading } = useGetWorkspaceUsers({
    workspaceId: workspace?.id || ""
  });

  // @epic-3.4-teams: Get user role from auth
  const userRole = user?.role || 'member';
  
  // Granular permissions check based on user role
  const globalPermissions = {
    // Team Management
    canCreateTeams: ['workspace-manager', 'admin', 'team-lead'].includes(userRole),
    canUpdateTeams: ['workspace-manager', 'admin', 'team-lead'].includes(userRole),
    canDeleteTeams: ['workspace-manager', 'admin'].includes(userRole),
    canManageTeams: ['workspace-manager', 'admin', 'team-lead'].includes(userRole),
    
    // Member Management
    canViewMembers: true, // All users can view members
    canAddMembers: ['workspace-manager', 'admin', 'team-lead'].includes(userRole),
    canRemoveMembers: ['workspace-manager', 'admin', 'team-lead'].includes(userRole),
    canManageMembers: ['workspace-manager', 'admin', 'team-lead'].includes(userRole),
    
    // User Management
    canViewUsers: ['workspace-manager', 'admin', 'team-lead', 'project-manager'].includes(userRole),
    canCreateUsers: ['workspace-manager', 'admin'].includes(userRole),
    canEditUsers: ['workspace-manager', 'admin'].includes(userRole),
    canDeleteUsers: ['workspace-manager', 'admin'].includes(userRole),
    canChangeUserRoles: ['workspace-manager', 'admin'].includes(userRole),
    canToggleUserStatus: ['workspace-manager', 'admin'].includes(userRole),
    canResetPasswords: ['workspace-manager', 'admin'].includes(userRole),
    canManageUsers: ['workspace-manager', 'admin'].includes(userRole),
    
    // Data Export
    canExportData: ['workspace-manager', 'admin', 'team-lead', 'project-manager'].includes(userRole),
    
    // Communication
    canAccessChat: true, // All users can access chat
    canViewCalendar: true, // All users can view calendar
    canManageCalendar: ['workspace-manager', 'admin', 'team-lead', 'project-manager'].includes(userRole),
    
    // Settings & Configuration
    canViewSettings: true,
    canUpdateSettings: ['workspace-manager', 'admin', 'team-lead'].includes(userRole),
    
    // Analytics & Reports
    canViewAnalytics: true,
    canViewDetailedAnalytics: ['workspace-manager', 'admin', 'team-lead', 'project-manager'].includes(userRole),
  };

  const {
    data: teamMetrics,
    isError: isMetricsError,
    error: metricsQueryError,
    refetch: refetchTeamMetrics,
  } = useTeamMetrics(workspace?.id || "");

  const { tab: tabFromSearch } = Route.useSearch();
  useTeamsTabFromSearch(tabFromSearch, setViewMode);

  // @epic-3.4-teams: User management mutations
  const changeRoleMutation = useChangeUserRole();
  const toggleStatusMutation = useToggleUserStatus();
  const resetPasswordMutation = useResetPassword();
  const deleteUserMutation = useDeleteWorkspaceUser();

  // Calculate enhanced team data with real backend information
  const enhancedTeams: EnhancedTeam[] = useMemo(() => {
    if (!teamsData || !workspaceUsers) return [];

    // Deduplicate teams by ID to prevent duplicate key warnings
    const uniqueTeamsMap = new Map();
    teamsData.forEach(team => {
      if (team.id && !uniqueTeamsMap.has(team.id)) {
        uniqueTeamsMap.set(team.id, team);
      }
    });
    const uniqueTeams = Array.from(uniqueTeamsMap.values());

    const teamColors = [
      "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500", 
      "bg-red-500", "bg-pink-500", "bg-indigo-500", "bg-teal-500"
    ];

    return uniqueTeams.map((team, index) => {
      const colorIndex = index % teamColors.length;
      const teamColor = teamColors[colorIndex];

      // Get online status from API
      const getOnlineStatus = (userEmail: string): 'online' | 'away' | 'busy' | 'offline' => {
        if (apiOnlineUsers) {
          const onlineUser = apiOnlineUsers.find(u => u.userEmail === userEmail);
          return onlineUser?.status || 'offline';
        }
        return 'offline';
      };

      // Get team members from the actual team.members array returned by API
      // Deduplicate members by ID to prevent duplicate key warnings
      const uniqueMembersMap = new Map();
      (team.members || []).forEach(member => {
        const memberId = member.id || member.email;
        if (memberId && !uniqueMembersMap.has(memberId)) {
          uniqueMembersMap.set(memberId, member);
        }
      });
      const uniqueMembers = Array.from(uniqueMembersMap.values());

      const teamMembers: EnhancedTeamMember[] = uniqueMembers.map(member => {
        const onlineStatus = getOnlineStatus(member.email || '');
        
        // Get real metrics for this member
        const memberMetric = teamMetrics?.find(m => m.userId === member.id && m.teamId === team.id);

        return {
          id:
            member.id ||
            member.email ||
            `temp-${team.id}-${String(member.email || "unknown").replace(/[^a-zA-Z0-9@._-]/g, "_")}`,
          name: member.name || 'Unknown User',
          email: member.email || '',
          role: member.role || 'member',
          status: onlineStatus,
          availability: onlineStatus === 'online' ? 'available' : 'unavailable',
          workload: memberMetric?.workload || 0,
          performance: memberMetric?.performance || 100,
          tasksCompleted: memberMetric?.tasksCompleted || 0,
          currentTasks: memberMetric?.currentTasks || 0,
          lastActive: member.joinedAt || new Date().toISOString(),
          teamName: team.name,
          teamColor: teamColor,
          projectId: team.projectId,
          projectName: team.projectName,
          userEmail: member.email || null,
          userName: member.name || null,
          joinedAt: member.joinedAt || new Date().toISOString()
        } as EnhancedTeamMember;
      });

      // Calculate team-level metrics
      const avgPerformance = teamMembers.length > 0
        ? Math.round(teamMembers.reduce((sum, m) => sum + m.performance, 0) / teamMembers.length)
        : 100;
      const avgWorkload = teamMembers.length > 0
        ? Math.round(teamMembers.reduce((sum, m) => sum + m.workload, 0) / teamMembers.length)
        : 0;

      // Calculate team health score
      let healthScore = 100;
      
      // Factor 1: Workload balance (optimal is 60-80%)
      if (avgWorkload < 40) {
        healthScore -= (40 - avgWorkload) * 0.5; // Underutilized
      } else if (avgWorkload > 90) {
        healthScore -= (avgWorkload - 90) * 1.5; // Overloaded
      }
      
      // Factor 2: Performance (target is 80%+)
      if (avgPerformance < 80) {
        healthScore -= (80 - avgPerformance) * 0.8;
      }
      
      // Factor 3: Team size balance (optimal is 3-8 members)
      if (teamMembers.length < 3) {
        healthScore -= (3 - teamMembers.length) * 10; // Too small
      } else if (teamMembers.length > 12) {
        healthScore -= (teamMembers.length - 12) * 5; // Too large
      }
      
      // Factor 4: Task completion rate
      const completedTasks = teamMembers.reduce((sum, m) => sum + m.tasksCompleted, 0);
      const currentTasks = teamMembers.reduce((sum, m) => sum + m.currentTasks, 0);
      const totalTasks = completedTasks + currentTasks;
      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 50;
      if (completionRate < 60) {
        healthScore -= (60 - completionRate) * 0.5;
      }
      
      // Ensure score is between 0 and 100
      healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));
      
      // Get health status
      let healthStatus;
      if (healthScore >= 80) {
        healthStatus = { label: 'Excellent', color: 'text-green-500', bg: 'bg-green-500/10' };
      } else if (healthScore >= 60) {
        healthStatus = { label: 'Good', color: 'text-blue-500', bg: 'bg-blue-500/10' };
      } else if (healthScore >= 40) {
        healthStatus = { label: 'Fair', color: 'text-yellow-500', bg: 'bg-yellow-500/10' };
      } else {
        healthStatus = { label: 'Needs Attention', color: 'text-red-500', bg: 'bg-red-500/10' };
      }

      return {
        ...team,
        members: teamMembers,
        memberCount: teamMembers.length,
        performance: avgPerformance,
        workload: avgWorkload,
        color: teamColor,
        projectName: team.projectName || (projects?.find(p => p.id === team.projectId)?.name),
        healthScore,
        healthStatus,
        completedTasks,
        currentTasks,
        productivity: Math.round(avgPerformance * 0.9),
        activeProjects: 1,
      };
    });
  }, [teamsData, workspaceUsers, apiOnlineUsers, isConnected, projects, teamMetrics]);

  // Combined member data for member view (with duplicates)
  const allMembers = useMemo(() => {
    return enhancedTeams.flatMap(team => team.members);
  }, [enhancedTeams]);

  // Deduplicated members with team information
  const uniqueMembers = useMemo(() => {
    const memberMap = new Map<string, EnhancedTeamMember & { teams: Array<{ id: string; name: string; color?: string }> }>();
    
    enhancedTeams.forEach(team => {
      team.members.forEach(member => {
        const key = member.id || member.email;
        if (memberMap.has(key)) {
          // Member already exists, add this team to their teams list
          const existing = memberMap.get(key)!;
          existing.teams.push({
            id: team.id,
            name: team.name,
            color: team.color
          });
        } else {
          // New member, create entry with first team
          memberMap.set(key, {
            ...member,
            teams: [{
              id: team.id,
              name: team.name,
              color: team.color
            }]
          });
        }
      });
    });
    
    return Array.from(memberMap.values());
  }, [enhancedTeams]);

  // Debounce search term to improve performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Filter and sort functions
  const filteredAndSortedTeams = useMemo(() => {
    let filtered = enhancedTeams.filter(team => {
      const matchesSearch = team.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                           team.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      const matchesType = !teamTypeFilter || team.type === teamTypeFilter;
      const matchesProject = !projectFilter || team.projectId === projectFilter;
      
      // Workload filter
      let matchesWorkload = true;
      if (workloadFilter) {
        const workload = team.workload || 0;
        switch (workloadFilter) {
          case 'low': matchesWorkload = workload < 40; break;
          case 'optimal': matchesWorkload = workload >= 40 && workload <= 80; break;
          case 'high': matchesWorkload = workload > 80; break;
        }
      }
      
      // Health filter
      let matchesHealth = true;
      if (healthFilter) {
        const health = team.healthScore || 0;
        switch (healthFilter) {
          case 'excellent': matchesHealth = health >= 80; break;
          case 'good': matchesHealth = health >= 60 && health < 80; break;
          case 'fair': matchesHealth = health >= 40 && health < 60; break;
          case 'needsAttention': matchesHealth = health < 40; break;
        }
      }
      
      return matchesSearch && matchesType && matchesProject && matchesWorkload && matchesHealth;
    });

    // Sort teams
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'members':
          return b.memberCount - a.memberCount;
        case 'performance':
          return (b.performance || 0) - (a.performance || 0);
        case 'recent':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return filtered;
  }, [enhancedTeams, debouncedSearchTerm, teamTypeFilter, projectFilter, workloadFilter, healthFilter, sortBy]);

  // Pagination for teams
  const teamsPagination = usePagination(filteredAndSortedTeams, { pageSize: 9 });

  // Filter members for member view (using deduplicated unique members)
  const filteredMembers = useMemo(() => {
    return uniqueMembers.filter(member => {
      const matchesSearch = member.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                           member.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                           member.role.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      
      const matchesRole = !roleFilter || member.role === roleFilter;
      const matchesStatus = !statusFilter || member.status === statusFilter;
      
      // Workload filter for members
      let matchesWorkload = true;
      if (workloadFilter) {
        const workload = member.workload || 0;
        switch (workloadFilter) {
          case 'low': matchesWorkload = workload < 40; break;
          case 'optimal': matchesWorkload = workload >= 40 && workload <= 80; break;
          case 'high': matchesWorkload = workload > 80; break;
        }
      }
      
      return matchesSearch && matchesRole && matchesStatus && matchesWorkload;
    });
  }, [uniqueMembers, debouncedSearchTerm, roleFilter, statusFilter, workloadFilter]);

  // Pagination for members
  const membersPagination = usePagination(filteredMembers, { pageSize: 20 });

  // Filter and pagination for users
  const filteredUsers = useMemo(() => {
    return (workspaceUsers || []).filter(user => {
      const matchesSearch = (user.userName || user.name)?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (user.userEmail || user.email)?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        user.role?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      
      const matchesRole = !roleFilter || user.role === roleFilter;
      const matchesStatus = !statusFilter || user.status === statusFilter;
      
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [workspaceUsers, debouncedSearchTerm, roleFilter, statusFilter]);

  const usersPagination = usePagination(filteredUsers, { pageSize: 20 });

  // Filter and pagination for directory view (simplified people browsing)
  const filteredDirectoryUsers = useMemo(() => {
    return (workspaceUsers || []).filter(user => {
      const matchesSearch = 
        (user.userName || user.name || "").toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (user.userEmail || user.email || "").toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      
      const matchesRole = !roleFilter || user.role === roleFilter;
      
      return matchesSearch && matchesRole;
    });
  }, [workspaceUsers, debouncedSearchTerm, roleFilter]);

  const directoryPagination = usePagination(filteredDirectoryUsers, { pageSize: 12 });

  // Team statistics (using unique members for accurate counts)
  const teamStats = useMemo(() => {
    const totalTeams = enhancedTeams.length;
    const totalMembers = uniqueMembers.length;
    const onlineMembers = uniqueMembers.filter(member => member.status === 'online').length;
    const avgPerformance = uniqueMembers.length > 0 
      ? Math.round(uniqueMembers.reduce((sum, member) => sum + member.performance, 0) / uniqueMembers.length)
      : 0;

    return {
      totalTeams,
      totalMembers,
      onlineMembers,
      avgPerformance
    };
  }, [enhancedTeams, uniqueMembers]);

  // Handlers
  const handleCreateTeam = () => {
    setIsCreateTeamOpen(true);
  };

  const handleTeamCreated = async (newTeam: any) => {
    setIsCreateTeamOpen(false);

    try {
      await refetchTeams();
      toast.success(`Team "${newTeam?.name ?? "New team"}" created successfully!`);
    } catch (error) {
      logger.error("Failed to refresh teams after creation", { error });
      toast.success(`Team "${newTeam?.name ?? "New team"}" created, but refreshing the list failed. Please reload to see the latest teams.`);
    }
  };

  const handleTeamAction = (action: string, team: EnhancedTeam) => {
    switch (action) {
      case 'settings':
          setSelectedTeamForSettings(team);
          setIsTeamSettingsOpen(true);
        break;
      case 'calendar':
        setSelectedTeamForCalendar(team);
        setIsTeamCalendarOpen(true);
        break;
      case 'dashboard':
        setSelectedTeamForDashboard(team);
        setIsTeamDashboardOpen(true);
        break;
      case 'teamChannel':
      case 'chat': // Keep 'chat' for backward compatibility
        setSelectedTeamForChat(team);
        setIsChatOpen(true);
        break;
      case 'role-management':
          setIsRoleManagementOpen(true);
        break;
      case 'archive':
        toast.success(`Team "${team.name}" archived successfully`);
        break;
      default:
        toast.success(`${action} action for team "${team.name}"`);
    }
  };

  const handleUserUpdated = (updatedUser: any) => {
    setIsEditUserOpen(false);
    setSelectedUserForEdit(null);
    toast.success(`User "${updatedUser.name}" updated successfully!`);
  };

  const handleViewProfile = (userId: string) => {
    setSelectedProfileUserId(userId);
    setIsProfileModalOpen(true);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setTeamTypeFilter("");
    setProjectFilter("");
    setRoleFilter("");
    setStatusFilter("");
    setWorkloadFilter("");
    setHealthFilter("");
    setSortBy("name");
  };

  // Bulk operations handlers
  const toggleSelectAll = () => {
    if (viewMode === 'teams') {
      if (selectedItems.size === filteredAndSortedTeams.length) {
        setSelectedItems(new Set());
      } else {
        setSelectedItems(new Set(filteredAndSortedTeams.map(t => t.id)));
      }
    } else if (viewMode === 'members') {
      if (selectedItems.size === filteredMembers.length) {
        setSelectedItems(new Set());
      } else {
        setSelectedItems(new Set(filteredMembers.map(m => m.id)));
      }
    } else {
      if (selectedItems.size === filteredUsers.length) {
        setSelectedItems(new Set());
      } else {
        setSelectedItems(new Set(filteredUsers.map(u => u.id || u.userEmail)));
      }
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleBulkExport = (format: 'csv' | 'json') => {
    if (viewMode === 'teams') {
      const selectedTeams = filteredAndSortedTeams.filter(t => selectedItems.has(t.id));
      exportTeams(selectedTeams, format);
      toast.success(`${selectedItems.size} teams exported to ${format.toUpperCase()}`);
    } else if (viewMode === 'members') {
      const selectedMembers = filteredMembers.filter(m => selectedItems.has(m.id));
      exportMembers(selectedMembers, format);
      toast.success(`${selectedItems.size} members exported to ${format.toUpperCase()}`);
    } else {
      const selectedUsers = filteredUsers.filter(u => selectedItems.has(u.id || u.userEmail));
      exportUsers(selectedUsers, format);
      toast.success(`${selectedItems.size} users exported to ${format.toUpperCase()}`);
    }
    setSelectedItems(new Set());
    setBulkSelectMode(false);
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;
    
    const confirmed = confirm(`Are you sure you want to delete ${selectedItems.size} ${viewMode}?`);
    if (!confirmed) return;

    // Note: This would require implementing batch delete endpoints
    toast.info('Bulk delete functionality would be implemented here');
    setSelectedItems(new Set());
    setBulkSelectMode(false);
  };

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'k',
      ctrl: true,
      description: 'Focus search',
      callback: () => {
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        searchInput?.focus();
      }
    },
    {
      key: 't',
      ctrl: true,
      description: 'Switch to Teams view',
      callback: () => setViewMode('teams')
    },
    {
      key: 'm',
      ctrl: true,
      description: 'Switch to Members view',
      callback: () => setViewMode('members')
    },
    {
      key: 'd',
      ctrl: true,
      description: 'Switch to People Directory view',
      callback: () => setViewMode('directory')
    },
    {
      key: 'u',
      ctrl: true,
      description: 'Switch to Users view',
      callback: () => setViewMode('users')
    },
    {
      key: 'n',
      ctrl: true,
      description: 'Create new team',
      callback: () => {
        if (viewMode === 'teams' && globalPermissions.canCreateTeams) {
          setIsCreateTeamOpen(true);
        } else if (viewMode === 'users' && globalPermissions.canCreateUsers) {
          setIsCreateUserOpen(true);
        }
      }
    },
    {
      key: 'g',
      ctrl: true,
      description: 'Toggle grid/list view',
      callback: () => {
        if (viewMode === 'teams') {
          setTeamsViewType(prev => prev === 'grid' ? 'list' : 'grid');
        } else if (viewMode === 'directory') {
          setDirectoryViewType(prev => prev === 'grid' ? 'list' : 'grid');
        }
      }
    },
    {
      key: 'c',
      ctrl: true,
      shift: true,
      description: 'Clear all filters',
      callback: clearFilters
    },
    {
      key: '?',
      shift: true,
      description: 'Show keyboard shortcuts',
      callback: () => setShowShortcutsHelp(true)
    }
  ], !isCreateTeamOpen && !isTeamSettingsOpen && !isTeamCalendarOpen && !isTeamDashboardOpen && !isRoleManagementOpen && !isChatOpen);

  // ESC key to close modals
  useEscapeKey(() => {
    if (showShortcutsHelp) setShowShortcutsHelp(false);
    else if (isCreateTeamOpen) setIsCreateTeamOpen(false);
    else if (isTeamSettingsOpen) setIsTeamSettingsOpen(false);
    else if (isTeamCalendarOpen) setIsTeamCalendarOpen(false);
    else if (isTeamDashboardOpen) setIsTeamDashboardOpen(false);
    else if (isRoleManagementOpen) setIsRoleManagementOpen(false);
    else if (isChatOpen) setIsChatOpen(false);
  }, true);

  const isLoading = isTeamsLoading || isProjectsLoading || isUsersLoading;

  if (workspace?.id && isTeamsError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <Alert variant="destructive" className="max-w-lg">
          <AlertTitle>Could not load teams</AlertTitle>
          <AlertDescription>
            {teamsQueryError instanceof Error
              ? teamsQueryError.message
              : "Failed to load teams."}
          </AlertDescription>
        </Alert>
        <Button type="button" onClick={() => void refetchTeams()}>
          <RefreshIcon className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-96" />
        </div>
        
        <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-96" />
            </div>
            <div className="flex space-x-2">
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
          
          {/* Stats Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>

          {/* Teams Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-80 w-full" />
            ))}
        </div>
      </div>
    );
  }

  return (
    <LazyDashboardLayout>
      {workspace?.id && isMetricsError && (
        <div className="border-b border-border px-4 py-3 md:px-6">
          <Alert variant="destructive">
            <AlertTitle>Team metrics unavailable</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-2">
              <span>
                {metricsQueryError instanceof Error
                  ? metricsQueryError.message
                  : "Could not load team metrics. Stats may be incomplete."}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void refetchTeamMetrics()}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}
      <UniversalHeader 
        title="Teams"
        subtitle={`Manage and coordinate your teams • ${teamStats.totalTeams} teams, ${teamStats.totalMembers} members`}
        variant="default"
        customActions={
          <div className="flex items-center space-x-2">
            {viewMode === "teams" && (
              <Button 
                size="sm"
                onClick={handleCreateTeam}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Team
              </Button>
            )}
            {viewMode === "users" && (
              <Button 
                size="sm"
                onClick={() => setIsCreateUserOpen(true)}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Invite member
              </Button>
            )}
          </div>
        }
      />
      <div className="space-y-6">
        {/* Quick Stats Dashboard */}
        <BlurFade delay={0.15} inView>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Teams</p>
                <p className="text-2xl font-bold">{teamStats.totalTeams}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Members</p>
                <p className="text-2xl font-bold text-blue-600">{teamStats.totalMembers}</p>
              </div>
              <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <UserPlus className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Performance</p>
                <p className="text-2xl font-bold text-green-600">{teamStats.avgPerformance}%</p>
              </div>
              <div className="h-8 w-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Online Members</p>
                <p className="text-2xl font-bold text-purple-600">{teamStats.onlineMembers}</p>
              </div>
              <div className="h-8 w-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                <Activity className="h-4 w-4 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
        </BlurFade>

      {/* Bulk Actions Bar */}
      {bulkSelectMode && selectedItems.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium">
              {selectedItems.size} {viewMode} selected
            </span>
            <Button variant="outline" size="sm" onClick={() => setSelectedItems(new Set())}>
              Clear Selection
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            {globalPermissions.canExportData && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export Selected
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleBulkExport('csv')}>
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkExport('json')}>
                    Export as JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {(globalPermissions.canDeleteTeams || globalPermissions.canDeleteUsers) && (
              <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Search, Filters and View Controls */}
      <div className="flex flex-col space-y-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search teams and members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        
        <div className="flex items-center flex-wrap gap-2">
          {/* View Type Toggle (only for teams view) */}
          {viewMode === "teams" && (
            <div className="flex items-center border border-input rounded-md">
              <Button
                variant={teamsViewType === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setTeamsViewType("grid")}
                className="rounded-r-none"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={teamsViewType === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setTeamsViewType("list")}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          {/* Team Type Filter (teams view) */}
          {viewMode === "teams" && (
            <select
              value={teamTypeFilter}
              onChange={(e) => setTeamTypeFilter(e.target.value)}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="">All Types</option>
              <option value="engineering">Engineering</option>
              <option value="design">Design</option>
              <option value="marketing">Marketing</option>
              <option value="product">Product</option>
            </select>
          )}
          
          {/* Workload Filter (teams and members view) */}
          {(viewMode === "teams" || viewMode === "members") && (
            <select
              value={workloadFilter}
              onChange={(e) => setWorkloadFilter(e.target.value)}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="">All Workloads</option>
              <option value="low">Low (&lt;40%)</option>
              <option value="optimal">Optimal (40-80%)</option>
              <option value="high">High (&gt;80%)</option>
            </select>
          )}
          
          {/* Health Filter (teams view only) */}
          {viewMode === "teams" && (
            <select
              value={healthFilter}
              onChange={(e) => setHealthFilter(e.target.value)}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="">All Health</option>
              <option value="excellent">Excellent (80+)</option>
              <option value="good">Good (60-79)</option>
              <option value="fair">Fair (40-59)</option>
              <option value="needsAttention">Needs Attention (&lt;40)</option>
            </select>
          )}
          
          {/* Role Filter (members and users view) */}
          {(viewMode === "members" || viewMode === "users") && (
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="">All Roles</option>
              <option value="workspace-manager">Workspace Manager</option>
              <option value="admin">Admin</option>
              <option value="project-manager">Project Manager</option>
              <option value="team-lead">Team Lead</option>
              <option value="member">Member</option>
              <option value="guest">Guest</option>
            </select>
          )}
          
          {/* Status Filter (members and users view) */}
          {(viewMode === "members" || viewMode === "users") && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="">All Status</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="away">Away</option>
              <option value="busy">Busy</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          )}
          {/* Project Filter (teams view) */}
          {viewMode === "teams" && (
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="">All Projects</option>
              {Array.isArray(projects) ? projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              )) : null}
            </select>
          )}
          
          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-2 border border-input bg-background rounded-md text-sm"
          >
            <option value="name">Name</option>
            <option value="members">Members</option>
            <option value="performance">Performance</option>
            <option value="recent">Recent</option>
          </select>

          {/* Bulk Select Mode Toggle */}
          <Button 
            variant={bulkSelectMode ? "default" : "outline"} 
            size="sm" 
            onClick={() => {
              setBulkSelectMode(!bulkSelectMode);
              setSelectedItems(new Set());
            }}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {bulkSelectMode ? 'Exit Select' : 'Select Multiple'}
          </Button>

          {/* Clear Filters */}
          {(searchTerm || teamTypeFilter || projectFilter || workloadFilter || healthFilter || roleFilter || statusFilter || sortBy !== 'name') && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear
            </Button>
          )}
          
          {/* Export Dropdown */}
          {globalPermissions.canExportData && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  if (viewMode === "teams") {
                    exportTeams(filteredAndSortedTeams, 'csv');
                    toast.success('Teams exported to CSV');
                  } else if (viewMode === "members") {
                    exportMembers(filteredMembers, 'csv');
                    toast.success('Members exported to CSV');
                  } else {
                    exportUsers(filteredUsers, 'csv');
                    toast.success('Users exported to CSV');
                  }
                }}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  if (viewMode === "teams") {
                    exportTeams(filteredAndSortedTeams, 'json');
                    toast.success('Teams exported to JSON');
                  } else if (viewMode === "members") {
                    exportMembers(filteredMembers, 'json');
                    toast.success('Members exported to JSON');
                  } else {
                    exportUsers(filteredUsers, 'json');
                    toast.success('Users exported to JSON');
                  }
                }}>
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex rounded-lg border border-input">
        <button
          onClick={() => setViewMode("teams")}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors flex items-center space-x-2",
            viewMode === "teams" ? "bg-muted" : "hover:bg-muted/50"
          )}
        >
          <Users className="h-4 w-4" />
          <span>Teams ({filteredAndSortedTeams.length})</span>
        </button>
        <button
          onClick={() => setViewMode("members")}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors border-l border-input flex items-center space-x-2",
            viewMode === "members" ? "bg-muted" : "hover:bg-muted/50"
          )}
        >
          <UserPlus className="h-4 w-4" />
          <span>Members ({filteredMembers.length})</span>
        </button>
        <button
          onClick={() => setViewMode("directory")}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors border-l border-input flex items-center space-x-2",
            viewMode === "directory" ? "bg-muted" : "hover:bg-muted/50"
          )}
        >
          <Users className="h-4 w-4" />
          <span>People Directory ({filteredDirectoryUsers.length})</span>
        </button>
        <button
          onClick={() => setViewMode("users")}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors border-l border-input flex items-center space-x-2",
            viewMode === "users" ? "bg-muted" : "hover:bg-muted/50"
          )}
        >
          <Settings className="h-4 w-4" />
          <span>Users ({workspaceUsers?.length || 0})</span>
        </button>
      </div>

      {/* Teams/Members/Users Content */}
      {viewMode === "teams" ? (
        /* Teams View */
        filteredAndSortedTeams.length === 0 ? (
          enhancedTeams.length === 0 ? (
            <NoTeamsEmpty onCreate={handleCreateTeam} />
          ) : (
            <NoFilteredTeamsEmpty />
          )
        ) : (
          <>
            {teamsViewType === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teamsPagination.paginatedData.map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    onAction={handleTeamAction}
                    userPermissions={globalPermissions}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {teamsPagination.paginatedData.map((team) => (
                  <TeamListItem
                    key={team.id}
                    team={team}
                    onAction={handleTeamAction}
                    userPermissions={globalPermissions}
                  />
                ))}
              </div>
            )}
            {filteredAndSortedTeams.length > 9 && (
              <MeridianPagination
                currentPage={teamsPagination.currentPage}
                totalPages={teamsPagination.totalPages}
                pageSize={teamsPagination.pageSize}
                totalItems={teamsPagination.totalItems}
                onPageChange={teamsPagination.goToPage}
                onPageSizeChange={teamsPagination.setPageSize}
                canGoNext={teamsPagination.canGoNext}
                canGoPrev={teamsPagination.canGoPrev}
                pageInfo={teamsPagination.pageInfo}
                pageSizeOptions={[9, 18, 27, 54]}
              />
            )}
          </>
        )
      ) : viewMode === "members" ? (
        /* Members View */
        filteredMembers.length === 0 ? (
          allMembers.length === 0 ? (
            <NoMembersEmpty />
          ) : (
            <NoFilteredMembersEmpty />
          )
        ) : (
          <>
            <MembersList
              members={membersPagination.paginatedData}
              userPermissions={globalPermissions}
              onMemberAction={(action, member) => {
                if (action === 'viewProfile') {
                  handleViewProfile(member.id);
                } else {
                  toast.success(`${action} action for ${member.name}`);
                }
              }}
            />
            {filteredMembers.length > 20 && (
              <MeridianPagination
                currentPage={membersPagination.currentPage}
                totalPages={membersPagination.totalPages}
                pageSize={membersPagination.pageSize}
                totalItems={membersPagination.totalItems}
                onPageChange={membersPagination.goToPage}
                onPageSizeChange={membersPagination.setPageSize}
                canGoNext={membersPagination.canGoNext}
                canGoPrev={membersPagination.canGoPrev}
                pageInfo={membersPagination.pageInfo}
              />
            )}
          </>
        )
      ) : viewMode === "directory" ? (
        /* People Directory View - Simplified browsing interface */
        <>
          {/* View Type Toggle for Directory */}
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-muted-foreground">
              Showing {directoryPagination.pageInfo} team members
            </div>
            <div className="flex items-center border border-input rounded-md">
              <Button
                variant={directoryViewType === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setDirectoryViewType("grid")}
                className="rounded-r-none"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={directoryViewType === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setDirectoryViewType("list")}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {filteredDirectoryUsers.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center space-y-4">
                <Users className="h-16 w-16 mx-auto text-muted-foreground" />
                <h3 className="text-xl font-semibold">No team members found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || roleFilter 
                    ? "Try adjusting your filters"
                    : "No team members in this workspace yet"
                  }
                </p>
              </CardContent>
            </Card>
          ) : directoryViewType === "grid" ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {directoryPagination.paginatedData.map((user: any, index: number) => (
                  <BlurFade key={user.id || user.userEmail} delay={0.05 + index * 0.02}>
                    <Card className="hover:shadow-lg transition-all hover:scale-105 cursor-pointer group">
                      <CardContent className="p-6 space-y-4">
                        {/* Avatar and Basic Info */}
                        <div 
                          className="text-center space-y-3"
                          onClick={() => handleViewProfile(user.id || user.userEmail)}
                        >
                          <Avatar className="h-20 w-20 mx-auto border-4 border-primary/10 group-hover:border-primary/30 transition-colors">
                            <AvatarImage src={user.avatar} alt={user.userName || user.name} />
                            <AvatarFallback className="text-xl">
                              {(user.userName || user.name || "U").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div>
                            <h3 className="font-bold text-lg group-hover:text-primary transition-colors">
                              {user.userName || user.name || "Unnamed User"}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {user.jobTitle || user.role || "Team Member"}
                            </p>
                          </div>
                        </div>
                        
                        {/* Meta Info */}
                        <div className="space-y-2 text-sm text-muted-foreground">
                          {user.company && (
                            <div className="flex items-center gap-2">
                              <Briefcase className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{user.company}</span>
                            </div>
                          )}
                          {user.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{user.location}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Role Badge */}
                        <div className="flex justify-center">
                          <Badge variant="outline" className="text-xs">
                            {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS]?.label || user.role}
                          </Badge>
                        </div>
                        
                        {/* Action Button */}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewProfile(user.id || user.userEmail);
                          }}
                        >
                          <Eye className="h-3 w-3 mr-2" />
                          View Profile
                        </Button>
                      </CardContent>
                    </Card>
                  </BlurFade>
                ))}
              </div>
              
              {filteredDirectoryUsers.length > 12 && (
                <MeridianPagination
                  currentPage={directoryPagination.currentPage}
                  totalPages={directoryPagination.totalPages}
                  pageSize={directoryPagination.pageSize}
                  totalItems={directoryPagination.totalItems}
                  onPageChange={directoryPagination.goToPage}
                  onPageSizeChange={directoryPagination.setPageSize}
                  canGoNext={directoryPagination.canGoNext}
                  canGoPrev={directoryPagination.canGoPrev}
                  pageInfo={directoryPagination.pageInfo}
                  pageSizeOptions={[12, 24, 48]}
                />
              )}
            </>
          ) : (
            <>
              <div className="space-y-4">
                {directoryPagination.paginatedData.map((user: any, index: number) => (
                  <BlurFade key={user.id || user.userEmail} delay={0.05 + index * 0.02}>
                    <Card className="hover:shadow-md transition-all cursor-pointer group">
                      <CardContent className="p-6">
                        <div 
                          className="flex items-center justify-between gap-6"
                          onClick={() => handleViewProfile(user.id || user.userEmail)}
                        >
                          {/* User Info */}
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <Avatar className="h-16 w-16 border-2 border-primary/10 group-hover:border-primary/30 transition-colors flex-shrink-0">
                              <AvatarImage src={user.avatar} alt={user.userName || user.name} />
                              <AvatarFallback className="text-lg">
                                {(user.userName || user.name || "U").charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1 min-w-0 space-y-1">
                              <h3 className="font-bold text-lg group-hover:text-primary transition-colors truncate">
                                {user.userName || user.name || "Unnamed User"}
                              </h3>
                              <p className="text-sm text-muted-foreground truncate">
                                {user.userEmail || user.email}
                              </p>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                {user.jobTitle && (
                                  <span className="flex items-center gap-1">
                                    <Briefcase className="h-3 w-3" />
                                    {user.jobTitle}
                                  </span>
                                )}
                                {user.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {user.location}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Role and Action */}
                          <div className="flex items-center gap-4 flex-shrink-0">
                            <Badge variant="outline">
                              {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS]?.label || user.role}
                            </Badge>
                            
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewProfile(user.id || user.userEmail);
                              }}
                            >
                              <Eye className="h-3 w-3 mr-2" />
                              View Profile
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </BlurFade>
                ))}
              </div>
              
              {filteredDirectoryUsers.length > 12 && (
                <MeridianPagination
                  currentPage={directoryPagination.currentPage}
                  totalPages={directoryPagination.totalPages}
                  pageSize={directoryPagination.pageSize}
                  totalItems={directoryPagination.totalItems}
                  onPageChange={directoryPagination.goToPage}
                  onPageSizeChange={directoryPagination.setPageSize}
                  canGoNext={directoryPagination.canGoNext}
                  canGoPrev={directoryPagination.canGoPrev}
                  pageInfo={directoryPagination.pageInfo}
                  pageSizeOptions={[12, 24, 48]}
                />
              )}
            </>
          )}
        </>
      ) : (
        /* Users View */
        (workspaceUsers || []).length === 0 ? (
          <NoUsersEmpty onCreate={() => setIsCreateUserOpen(true)} />
        ) : (
          filteredUsers.length === 0 ? (
            <NoFilteredUsersEmpty />
          ) : (
            <>
              <UsersManagementView
                users={usersPagination.paginatedData}
                onUserAction={(action, user) => {
                if (action === 'edit') {
                  setSelectedUserForEdit(user as any);
                  setIsEditUserOpen(true);
                } else if (action === 'delete') {
                  if (confirm(`Are you sure you want to remove ${user.userName || user.name} from this workspace?`)) {
                    deleteUserMutation.mutate({
                      workspaceId: workspace?.id || "",
                      userEmail: user.userEmail || user.email,
                    });
                  }
                } else if (action === 'changeRole') {
                  // This would open a role selection dialog
                  toast.info("Role change dialog would open here");
                } else if (action === 'resetPassword') {
                  if (confirm(`Reset password for ${user.userName || user.name}?`)) {
                    resetPasswordMutation.mutate({
                      userEmail: user.userEmail || user.email,
                    });
                  }
                } else if (action === 'toggleStatus') {
                  toggleStatusMutation.mutate({
                    workspaceId: workspace?.id || "",
                    userEmail: user.userEmail || user.email,
                  });
                } else {
                  toast.success(`${action} action for ${user.userName || user.name}`);
                }
              }}
              searchTerm={searchTerm}
            />
            {filteredUsers.length > 20 && (
              <MeridianPagination
                currentPage={usersPagination.currentPage}
                totalPages={usersPagination.totalPages}
                pageSize={usersPagination.pageSize}
                totalItems={usersPagination.totalItems}
                onPageChange={usersPagination.goToPage}
                onPageSizeChange={usersPagination.setPageSize}
                canGoNext={usersPagination.canGoNext}
                canGoPrev={usersPagination.canGoPrev}
                pageInfo={usersPagination.pageInfo}
              />
            )}
          </>
          )
        )
      )}

      {/* Keyboard Shortcuts Help Dialog */}
      <Dialog open={showShortcutsHelp} onOpenChange={setShowShortcutsHelp}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
            <DialogDescription>
              Use these keyboard shortcuts to navigate faster
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Navigation</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Teams view</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+T</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Members view</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+M</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">People Directory</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+D</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Users view</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+U</kbd>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Actions</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Focus search</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+K</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Create team</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+N</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Toggle view</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+G</kbd>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Filters</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Clear filters</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+Shift+C</kbd>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-sm">General</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Close modal</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">Esc</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Show shortcuts</span>
                    <kbd className="px-2 py-1 bg-muted rounded text-xs">Shift+?</kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowShortcutsHelp(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modals - Lazy loaded for performance */}
      {isCreateTeamOpen && (
        <Suspense fallback={null}>
          <TeamCreationModal
            open={isCreateTeamOpen}
            onClose={() => setIsCreateTeamOpen(false)}
            onTeamCreated={handleTeamCreated}
          />
        </Suspense>
      )}

      {isTeamSettingsOpen && selectedTeamForSettings && (
        <Suspense fallback={null}>
          <TeamSettingsModal
            open={isTeamSettingsOpen}
            onClose={() => setIsTeamSettingsOpen(false)}
            team={selectedTeamForSettings}
          />
        </Suspense>
      )}

      {isTeamCalendarOpen && selectedTeamForCalendar && (
        <Suspense fallback={null}>
          <TeamCalendarModal
            open={isTeamCalendarOpen}
            onClose={() => setIsTeamCalendarOpen(false)}
            team={selectedTeamForCalendar}
          />
        </Suspense>
      )}

      {isTeamDashboardOpen && selectedTeamForDashboard && (
        <Suspense fallback={null}>
          <TeamDashboardModal
            open={isTeamDashboardOpen}
            onClose={() => setIsTeamDashboardOpen(false)}
            team={selectedTeamForDashboard}
          />
        </Suspense>
      )}

      {isRoleManagementOpen && (
        <Suspense fallback={null}>
          <RoleManagementModal
            open={isRoleManagementOpen}
            onClose={() => setIsRoleManagementOpen(false)}
          />
        </Suspense>
      )}

      {isChatOpen && selectedTeamForChat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" onClick={() => setIsChatOpen(false)}>
          <div className="w-full max-w-4xl mx-4" onClick={(e) => e.stopPropagation()}>
            <Suspense fallback={<div className="bg-white rounded-lg p-8 text-center">Loading chat...</div>}>
              <TeamChatContainer
                teamId={selectedTeamForChat.id}
                teamName={selectedTeamForChat.name}
                onClose={() => setIsChatOpen(false)}
              />
            </Suspense>
          </div>
        </div>
      )}

      {isCreateUserOpen && workspace?.id && (
        <InviteTeamMemberModal
          open={isCreateUserOpen}
          onClose={() => setIsCreateUserOpen(false)}
          workspaceId={workspace.id}
        />
      )}

      {isEditUserOpen && selectedUserForEdit && (
        <EditUserModal
          open={isEditUserOpen}
          onClose={() => setIsEditUserOpen(false)}
          user={selectedUserForEdit}
          onUserUpdated={handleUserUpdated}
        />
      )}

      {/* Team Member Profile Modal */}
      {isProfileModalOpen && selectedProfileUserId && (
        <Suspense fallback={null}>
          <TeamMemberProfileModal
            userId={selectedProfileUserId}
            open={isProfileModalOpen}
            onClose={() => {
              setIsProfileModalOpen(false);
              setSelectedProfileUserId(null);
            }}
            onViewFull={() => {
              // TODO: Navigate to full profile page
              toast.info("Full profile page coming soon!");
            }}
            onMessage={() => {
              setIsProfileModalOpen(false);
              setIsChatOpen(true);
            }}
            onGiveKudos={() => {
              toast.success("Kudos feature coming soon!");
            }}
          />
        </Suspense>
      )}
    </div>
    </LazyDashboardLayout>
  );
}

// Users Management View Component
function UsersManagementView({ 
  users, 
  onUserAction,
  searchTerm 
}: { 
  users: any[]; 
  onUserAction: (action: string, user: any) => void;
  searchTerm: string;
}) {
  const filteredUsers = users.filter(user =>
    (user.userName || user.name)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.userEmail || user.email)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        {filteredUsers.map((user) => (
          <Card
            key={`${user.id ?? ""}|${(user.userEmail || user.email || "").toLowerCase()}`}
            className="hover:shadow-md transition-shadow"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <div className="h-full w-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                       {(user.userName || user.name)?.charAt(0)?.toUpperCase() || (user.userEmail || user.email)?.charAt(0)?.toUpperCase() || 'U'}
                     </div>
                  </Avatar>
                  <div className="space-y-1">
                     <h3 className="font-medium text-lg">{user.userName || user.name || 'Unnamed User'}</h3>
                     <p className="text-sm text-muted-foreground">{user.userEmail || user.email}</p>
                     <div className="flex items-center space-x-2">
                       <Badge variant="secondary">{AVAILABLE_ROLES.find(r => r.value === user.role)?.label || user.role || 'No Role'}</Badge>
                       <Badge variant={user.status === 'active' ? "default" : "secondary"}>
                         {user.status === 'active' ? "Active" : "Inactive"}
                       </Badge>
                     </div>
                   </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onUserAction('edit', user)}
                  >
                    <Edit3 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onUserAction('changeRole', user)}>
                        <Shield className="mr-2 h-4 w-4" />
                        Change Role
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onUserAction('resetPassword', user)}>
                        <Lock className="mr-2 h-4 w-4" />
                        Reset Password
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onUserAction('toggleStatus', user)}>
                         <Activity className="mr-2 h-4 w-4" />
                         {user.status === 'active' ? 'Deactivate' : 'Activate'}
                       </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => onUserAction('delete', user)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Edit User Modal Component
function EditUserModal({ 
  open, 
  onClose, 
  user,
  onUserUpdated 
}: { 
  open: boolean; 
  onClose: () => void;
  user: any;
  onUserUpdated: (user: any) => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'member',
            isActive: true
  });

  // Update form data when user changes
  React.useEffect(() => {
    if (user) {
      setFormData({
        name: user.userName || user.name || '',
        email: user.userEmail || user.email || '',
        role: user.role || 'member',
        isActive: user.status === 'active'
      });
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updatedUser = {
      ...user,
      ...formData,
      updatedAt: new Date().toISOString()
    };

    onUserUpdated(updatedUser);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information and permissions.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter user's full name"
              required
      />
    </div>
          
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Enter email address"
              required
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              {AVAILABLE_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            />
            <label htmlFor="isActive" className="text-sm">
              Active user
            </label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              <Edit3 className="mr-2 h-4 w-4" />
              Update User
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Team Card Component
function TeamCard({ 
  team, 
  onAction, 
  userPermissions 
}: { 
  team: EnhancedTeam; 
  onAction: (action: string, team: EnhancedTeam) => void;
  userPermissions: any;
}) {
  const teamPermissions = useTeamPermissions(team);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <MagicCard className={cn(
        "relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02] glass-card border-border/50",
      )}>
        {/* Team Header with Gradient */}
        <div className={cn("h-24 relative", team.color)}>
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute bottom-4 left-6 right-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12 border-2 border-white/30">
                  <AvatarImage src={team.lead?.avatar} />
                  <AvatarFallback className="bg-white/20 text-white text-sm font-semibold">
                    {team.lead?.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-white font-bold text-lg">{team.name}</h3>
                  <p className="text-white/80 text-sm">{team.lead?.name}</p>
                </div>
              </div>
              
              {team.lead?.online && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-white/80 text-xs">Online</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <CardContent className="p-6 space-y-4">
          {/* Team Description */}
          <p className="text-muted-foreground text-sm">{team.description}</p>

          {/* Team Members Avatars */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{team.memberCount} Members</span>
            </div>
            <div className="flex -space-x-2">
              {team.members.slice(0, 5).map((member, index) => (
                <div
                  key={member.id || index}
                  className="relative w-8 h-8 rounded-full border-2 border-background bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium hover:z-10 transition-transform hover:scale-110 cursor-pointer"
                  title={member.name}
                >
                  {member.name.charAt(0).toUpperCase()}
                  {member.status === 'online' && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                  )}
                </div>
              ))}
              {team.memberCount > 5 && (
                <div className="relative w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium">
                  +{team.memberCount - 5}
                </div>
              )}
            </div>
          </div>

          {/* Team Health Score */}
          {team.healthScore && team.healthStatus && (
            <div className={cn("p-4 rounded-lg border", team.healthStatus.bg)}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Activity className={cn("h-4 w-4", team.healthStatus.color)} />
                  <span className="text-sm font-medium text-foreground">Team Health</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={cn("text-xs font-semibold px-2 py-1 rounded-full", team.healthStatus.bg, team.healthStatus.color)}>
                    {team.healthStatus.label}
                  </span>
                  <span className={cn("text-2xl font-bold", team.healthStatus.color)}>{team.healthScore}</span>
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={cn("h-2 rounded-full transition-all", 
                    team.healthScore >= 80 ? "bg-gradient-to-r from-green-500 to-green-400" :
                    team.healthScore >= 60 ? "bg-gradient-to-r from-blue-500 to-blue-400" :
                    team.healthScore >= 40 ? "bg-gradient-to-r from-yellow-500 to-yellow-400" :
                    "bg-gradient-to-r from-red-500 to-red-400"
                  )}
                  style={{ width: `${team.healthScore}%` }}
                />
              </div>
            </div>
          )}

          {/* Team Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-lg font-bold text-foreground">{team.memberCount}</div>
              <div className="text-xs text-muted-foreground">Members</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-lg font-bold text-foreground">{team.activeProjects}</div>
              <div className="text-xs text-muted-foreground">Projects</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-lg font-bold text-foreground">{team.completedTasks}</div>
              <div className="text-xs text-muted-foreground">Tasks Done</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-lg font-bold text-green-500">{team.productivity}%</div>
              <div className="text-xs text-muted-foreground">Productivity</div>
            </div>
          </div>

          {/* Workload Balance Indicator */}
          <div className={cn(
            "p-3 rounded-lg border",
            team.workload < 40 ? "bg-yellow-500/10 border-yellow-500/20" :
            team.workload >= 40 && team.workload <= 80 ? "bg-green-500/10 border-green-500/20" :
            "bg-red-500/10 border-red-500/20"
          )}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Target className={cn(
                  "h-4 w-4",
                  team.workload < 40 ? "text-yellow-500" :
                  team.workload >= 40 && team.workload <= 80 ? "text-green-500" :
                  "text-red-500"
                )} />
                <span className="text-sm font-medium text-foreground">Workload Balance</span>
              </div>
              <div className="flex items-center space-x-1">
                {team.workload < 40 && <AlertTriangle className="h-3 w-3 text-yellow-500" />}
                {team.workload > 80 && <AlertTriangle className="h-3 w-3 text-red-500" />}
                <span className={cn(
                  "text-sm font-bold",
                  team.workload < 40 ? "text-yellow-600" :
                  team.workload >= 40 && team.workload <= 80 ? "text-green-600" :
                  "text-red-600"
                )}>
                  {team.workload}%
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full transition-all duration-500",
                      team.workload < 40 ? "bg-gradient-to-r from-yellow-500 to-yellow-400" :
                      team.workload >= 40 && team.workload <= 80 ? "bg-gradient-to-r from-green-500 to-green-400" :
                      "bg-gradient-to-r from-red-500 to-red-400"
                    )}
                    style={{ width: `${team.workload}%` }}
                  />
                </div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className={team.workload < 40 ? "text-yellow-600 font-medium" : ""}>
                  {team.workload < 40 ? "Underutilized" : "0%"}
                </span>
                <span className={team.workload >= 40 && team.workload <= 80 ? "text-green-600 font-medium" : ""}>
                  {team.workload >= 40 && team.workload <= 80 ? "Optimal" : "40-80%"}
                </span>
                <span className={team.workload > 80 ? "text-red-600 font-medium" : ""}>
                  {team.workload > 80 ? "Overloaded" : "100%"}
                </span>
              </div>
            </div>
          </div>

          {/* Performance Indicator */}
          <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Weekly Progress</span>
              <div className="flex items-center space-x-1">
                <TrendingUp className={cn(
                  "h-4 w-4",
                  team.performance?.trend > 0 ? "text-green-500" : "text-red-500"
                )} />
                <span className={cn(
                  "text-sm font-medium",
                  team.performance?.trend > 0 ? "text-green-500" : "text-red-500"
                )}>
                  {team.performance?.trend > 0 ? '+' : ''}{team.performance?.trend}%
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500"
                  style={{ width: `${(team.performance?.tasksCompleted / team.performance?.weeklyGoal) * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {team.performance?.tasksCompleted}/{team.performance?.weeklyGoal}
              </span>
            </div>
          </div>

          {/* Technology Stack */}
          <div className="space-y-2">
            <span className="text-sm font-medium text-foreground">Tech Stack</span>
            <div className="flex flex-wrap gap-1">
              {Array.isArray(team.technologies) ? team.technologies.map((tech, techIndex) => (
                <Badge key={`${tech}-${techIndex}`} variant="secondary" className="text-xs glass-card">
                  {tech}
                </Badge>
              )) : null}
            </div>
          </div>

          {/* Team Roles Distribution */}
          <div className="space-y-2">
            <span className="text-sm font-medium text-foreground">Team Composition</span>
            <div className="flex flex-wrap gap-1">
              {Object.entries(team.roles || {}).map(([role, count]) => {
                const roleInfo = ROLE_LABELS[role as keyof typeof ROLE_LABELS];
                if (!roleInfo || count === 0) return null;
                
                return (
                  <Badge key={role} className={cn("text-xs text-white", roleInfo.color)}>
                    {count} {roleInfo.label}{count > 1 ? 's' : ''}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="flex items-start space-x-2 p-3 rounded-lg bg-muted/30">
            <Activity className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">{team.recentActivity}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="glass-card relative"
                onClick={() => onAction('teamChannel', team)}
              >
                <Hash className="h-4 w-4 mr-1" />
                Team Channel
                {team.unreadCount && team.unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="ml-2 h-5 min-w-[20px] px-1.5 flex items-center justify-center text-[10px] font-semibold"
                  >
                    {team.unreadCount > 99 ? '99+' : team.unreadCount}
                  </Badge>
                )}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="glass-card"
                onClick={() => onAction('calendar', team)}
              >
                <Calendar className="h-4 w-4 mr-1" />
                Schedule
              </Button>
            </div>
            
            <Button 
              onClick={() => onAction('settings', team)}
              className="glass-card bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
            >
              <Settings className="h-4 w-4 mr-1" />
              Manage
            </Button>
          </div>
        </CardContent>
      </MagicCard>
    </motion.div>
  );
}

// Members List Component
function MembersList({ 
  members, 
  userPermissions,
  onMemberAction 
}: { 
  members: any[]; 
  userPermissions: any;
  onMemberAction: (action: string, member: any) => void;
}) {
  return (
    <MagicCard className="cursor-pointer">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium text-sm">Member</th>
                <th className="text-left p-4 font-medium text-sm">Teams</th>
                <th className="text-left p-4 font-medium text-sm">Role</th>
                <th className="text-left p-4 font-medium text-sm">Status</th>
                <th className="text-left p-4 font-medium text-sm">Performance</th>
                <th className="text-left p-4 font-medium text-sm">Workload</th>
                <th className="text-left p-4 font-medium text-sm">Tasks</th>
                <th className="text-left p-4 font-medium text-sm">Last Active</th>
                <th className="text-left p-4 font-medium text-sm"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.map((member, index) => (
                <motion.tr
                  key={`${member.id || member.email}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="hover:bg-muted/50 transition-colors"
                >
                  {/* Member Info */}
                  <td className="p-4">
                    <div 
                      className="flex items-center space-x-3 cursor-pointer hover:bg-muted/50 -m-2 p-2 rounded transition-colors"
                      onClick={() => onMemberAction('viewProfile', member)}
                      title="Click to view profile"
                    >
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.image} />
                          <AvatarFallback className="text-xs">
                            {member.name.split(' ').map((n: string) => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className={cn(
                          "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background",
                          statusColors[member.status]
                        )} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-foreground truncate">
                          {member.name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {member.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Teams */}
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {member.teams && member.teams.length > 0 ? (
                        member.teams.map((team: { id: string; name: string; color?: string }, idx: number) => (
                          <Badge 
                            key={`${team.id}-${idx}`}
                            variant="outline" 
                            className="text-xs flex items-center gap-1"
                          >
                            {team.color && (
                              <div className={cn("w-2 h-2 rounded-full", team.color)} />
                            )}
                            {team.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">Unassigned</span>
                      )}
                    </div>
                  </td>

                  {/* Role */}
                  <td className="p-4">
                    <Badge variant="outline" className="text-xs">
                      {AVAILABLE_ROLES.find(r => r.value === member.role)?.label || member.role}
                    </Badge>
                  </td>

                  {/* Status */}
                  <td className="p-4">
                    <Badge className={cn("text-xs", availabilityColors[member.availability])}>
                      {member.availability}
                    </Badge>
                  </td>

                  {/* Performance */}
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-green-500 to-green-400"
                          style={{ width: `${member.performance}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{member.performance}%</span>
                    </div>
                  </td>

                  {/* Workload */}
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full",
                            member.workload > 80 ? "bg-red-500" :
                            member.workload > 60 ? "bg-yellow-500" : "bg-green-500"
                          )}
                          style={{ width: `${member.workload}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{member.workload}%</span>
                    </div>
                  </td>

                  {/* Tasks */}
                  <td className="p-4">
                    <div className="text-center">
                      <div className="text-sm font-medium text-foreground">{member.currentTasks}</div>
                      <div className="text-xs text-muted-foreground">active</div>
                    </div>
                  </td>

                  {/* Last Active */}
                  <td className="p-4">
                    <span className="text-xs text-muted-foreground">{member.lastActive}</span>
                  </td>

                  {/* Actions */}
                  <td className="p-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onMemberAction('viewProfile', member)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onMemberAction('edit', member)}>
                          <Edit3 className="mr-2 h-4 w-4" />
                          Edit Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onMemberAction('tasks', member)}>
                          <Target className="mr-2 h-4 w-4" />
                          View Tasks
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onMemberAction('performance', member)}>
                          <BarChart3 className="mr-2 h-4 w-4" />
                          Performance
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => onMemberAction('remove', member)}
                          className="text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove from Team
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </MagicCard>
  );
}

// Team List Item Component (Compact horizontal view)
function TeamListItem({ 
  team, 
  onAction, 
  userPermissions 
}: { 
  team: EnhancedTeam; 
  onAction: (action: string, team: EnhancedTeam) => void;
  userPermissions: any;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-6">
          {/* Team Info */}
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0", team.color)}>
              <Users className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg truncate">{team.name}</h3>
              <p className="text-sm text-muted-foreground truncate">{team.description}</p>
              {team.projectName && (
                <Badge variant="outline" className="mt-1 text-xs">
                  {team.projectName}
                </Badge>
              )}
            </div>
          </div>

          {/* Members Avatars */}
          <div className="flex -space-x-2 flex-shrink-0">
            {team.members.slice(0, 4).map((member, index) => (
              <div
                key={member.id || index}
                className="relative w-8 h-8 rounded-full border-2 border-background bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium hover:z-10 transition-transform hover:scale-110 cursor-pointer"
                title={member.name}
              >
                {member.name.charAt(0).toUpperCase()}
                {member.status === 'online' && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
                )}
              </div>
            ))}
            {team.memberCount > 4 && (
              <div className="relative w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium">
                +{team.memberCount - 4}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="hidden lg:flex items-center space-x-6 flex-shrink-0">
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">{team.memberCount}</div>
              <div className="text-xs text-muted-foreground">Members</div>
            </div>
            <div className="text-center">
              <div className={cn("text-lg font-bold", team.healthStatus.color)}>{team.healthScore}</div>
              <div className="text-xs text-muted-foreground">Health</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-500">{team.performance}%</div>
              <div className="text-xs text-muted-foreground">Performance</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-foreground">{team.workload}%</div>
              <div className="text-xs text-muted-foreground">Workload</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAction('teamChannel', team)}
              title="Team Channel"
              className="relative"
            >
              <Hash className="h-4 w-4" />
              <span className="hidden md:inline ml-2">Team Channel</span>
              {team.unreadCount && team.unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="ml-2 h-5 min-w-[20px] px-1.5 flex items-center justify-center text-[10px] font-semibold"
                >
                  {team.unreadCount > 99 ? '99+' : team.unreadCount}
                </Badge>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAction('calendar', team)}
              title="Schedule"
            >
              <Calendar className="h-4 w-4" />
              <span className="hidden md:inline ml-2">Schedule</span>
            </Button>
            <Button
              size="sm"
              onClick={() => onAction('settings', team)}
              title="Manage"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden md:inline ml-2">Manage</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default TeamsPage; 