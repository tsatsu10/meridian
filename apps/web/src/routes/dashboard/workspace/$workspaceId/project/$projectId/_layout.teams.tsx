// @epic-3.4-teams: Project team management with RBAC integration
// @persona-sarah: PM needs comprehensive team oversight and management
// @persona-david: Team lead needs detailed team workload and performance insights
// @persona-jennifer: Exec needs team productivity overview
// @persona-mike: Dev needs visibility into team capacity and assignments
// @persona-lisa: Designer needs team collaboration and communication tools

import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import useProjectStore from "@/store/project";
import useWorkspaceStore from "@/store/workspace";
import useGetWorkspaceUsers from "@/hooks/queries/workspace-users/use-get-workspace-users";
import useGetTasks from "@/hooks/queries/task/use-get-tasks";
import useGetProjectMembers from "@/hooks/queries/project/use-get-project-members";
import useAddProjectMember from "@/hooks/mutations/project/use-add-project-member";
import { useChangeMemberRole } from "@/hooks/mutations/workspace-user/use-change-member-role";
import { useRemoveMember } from "@/hooks/mutations/workspace-user/use-remove-member";
import { useTeamPermissions } from "@/hooks/useTeamPermissions";
import { useOpenDirectMessage } from "@/hooks/use-open-direct-message";
import { 
  Search, 
  Plus, 
  UserPlus,
  MoreHorizontal,
  Users,
  Settings,
  Clock,
  CheckCircle,
  TrendingUp,
  Calendar,
  Target,
  Activity,
  AlertTriangle,
  Mail,
  Phone,
  MessageSquare,
  Video,
  Filter,
  SortDesc,
  Download,
  Edit,
  Trash2,
  Shield,
  UserCheck,
  UserX,
  BarChart3,
  Eye,
  Send,
  FileText,
  Star,
  StarOff,
  Ban,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  Zap,
  Loader2,
  Lightbulb,
  Keyboard
} from "lucide-react";
import DashboardPopup from "@/components/dashboard/dashboard-popup";
import { cn } from "@/lib/cn";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import ProjectMemberManagementModal from "@/components/team/project-member-management-modal";
import InviteTeamMemberModal from "@/components/team/invite-team-member-modal";
import { EnhancedMemberDetailsModal } from "@/components/team/enhanced-member-details-modal";
import LazyDashboardLayout from "@/components/performance/lazy-dashboard-layout";
import { toast } from "sonner";

export const Route = createFileRoute(
  "/dashboard/workspace/$workspaceId/project/$projectId/_layout/teams"
)({
  component: ProjectTeams,
});

interface ProjectMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
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
  // Enhanced workload fields
  workloadScore?: number;
  estimatedHours?: number;
  capacityUtilization?: number;
  workloadStatus?: 'balanced' | 'overloaded' | 'underutilized';
  highPriorityTasks?: number;
}

interface TeamMetrics {
  totalMembers: number;
  activeMembers: number;
  avgTasksPerMember: number;
  totalTasksAssigned: number;
  totalTasksCompleted: number;
  teamProductivity: number;
  projectCompletion: number;
}

// Enhanced role system with proper RBAC roles
const roleColors = {
  "workspace-manager": "bg-gradient-to-r from-purple-100 to-purple-200 text-purple-900 dark:from-purple-900/80 dark:to-purple-800/80 dark:text-purple-100 border-purple-300 dark:border-purple-700 font-semibold shadow-sm",
  "department-head": "bg-gradient-to-r from-red-100 to-red-200 text-red-900 dark:from-red-900/80 dark:to-red-800/80 dark:text-red-100 border-red-300 dark:border-red-700 font-semibold shadow-sm",
  "project-manager": "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-900 dark:from-blue-900/80 dark:to-blue-800/80 dark:text-blue-100 border-blue-300 dark:border-blue-700 font-semibold shadow-sm",
  "team-lead": "bg-gradient-to-r from-green-100 to-green-200 text-green-900 dark:from-green-900/80 dark:to-green-800/80 dark:text-green-100 border-green-300 dark:border-green-700 font-semibold shadow-sm",
  "project-viewer": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/60 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700",
  member: "bg-secondary text-secondary-foreground dark:bg-secondary-hover dark:text-secondary-foreground border-border",
  guest: "bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-200 border-orange-300 dark:border-orange-700",
};

const statusColors = {
  online: "bg-green-500",
  away: "bg-yellow-500",
  offline: "bg-gray-400",
};

// Available roles for role changes
const availableRoles = [
  { value: "guest", label: "Guest", icon: UserX, description: "Limited access" },
  { value: "member", label: "Member", icon: UserCheck, description: "Standard access" },
  { value: "team-lead", label: "Team Lead", icon: Shield, description: "Team management" },
  { value: "project-viewer", label: "Project Viewer", icon: Eye, description: "Read-only access" },
  { value: "project-manager", label: "Project Manager", icon: Settings, description: "Full project control" },
  { value: "department-head", label: "Department Head", icon: Star, description: "Department oversight" },
  { value: "workspace-manager", label: "Workspace Manager", icon: Zap, description: "Full workspace control" },
];

function ProjectTeams() {
  const { workspaceId, projectId } = Route.useParams();
  const { project } = useProjectStore();
  const { workspace } = useWorkspaceStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "tasks" | "productivity" | "recent">("name");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeTab, setActiveTab] = useState("overview");
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  
  // Ref for search input focus
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Role change modal state
  const [isRoleChangeOpen, setIsRoleChangeOpen] = useState(false);
  const [selectedMemberForRole, setSelectedMemberForRole] = useState<ProjectMember | null>(null);
  const [newRole, setNewRole] = useState("");

  // Member management modal state
  const [isMemberDetailsOpen, setIsMemberDetailsOpen] = useState(false);
  const [selectedMemberForDetails, setSelectedMemberForDetails] = useState<ProjectMember | null>(null);

  // Bulk actions state
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [isBulkRoleChangeOpen, setIsBulkRoleChangeOpen] = useState(false);
  const [bulkNewRole, setBulkNewRole] = useState("");
  
  // Remove member confirmation state
  const [memberToRemove, setMemberToRemove] = useState<ProjectMember | null>(null);

  // @epic-3.4-teams: Mutations for role change and member removal
  const changeRoleMutation = useChangeMemberRole();
  const removeMemberMutation = useRemoveMember();

  // @epic-3.4-teams: Get project members (real project team)
  const { data: realProjectMembers, isLoading: isLoadingMembers } = useGetProjectMembers(project?.id || "");
  
  // @epic-3.4-teams: Get workspace users (for adding new members)
  const { data: workspaceUsers, isLoading: isUsersLoading } = useGetWorkspaceUsers({ 
    workspaceId: workspace?.id || "" 
  });

  // @epic-3.4-teams: Get project tasks for workload calculation
  const { data: tasksData, isLoading: isTasksLoading } = useGetTasks(project?.id || "");

  // @epic-3.4-teams: Add member mutation
  const addMemberMutation = useAddProjectMember();

  // @epic-3.4-teams: Get team permissions for current user
  const permissions = useTeamPermissions();

  // @epic-4.1-direct-messaging: Hook for opening direct messages
  const { openDirectMessage, isLoading: isOpeningMessage } = useOpenDirectMessage();

  // @epic-3.4-teams: Transform real project members with enhanced workload calculation
  const projectMembers: ProjectMember[] = useMemo(() => {
    if (!realProjectMembers || !tasksData) return [];

    const allTasks = tasksData?.tasks || [];
    
    return realProjectMembers.map(member => {
      const userTasks = allTasks.filter((task: any) => task.userEmail === member.userEmail);
      
      // Basic counts
      const activeTasks = userTasks.filter((task: any) => task.status !== 'done').length;
      const completedTasks = userTasks.filter((task: any) => task.status === 'done').length;
      const totalTasks = activeTasks + completedTasks;
      
      // Enhanced workload calculation with complexity and priority
      const calculateTaskWeight = (task: any) => {
        let weight = 1; // Base weight
        
        // Priority multiplier (high priority tasks count more)
        if (task.priority === 'urgent' || task.priority === 'high') {
          weight *= 1.5;
        } else if (task.priority === 'low') {
          weight *= 0.75;
        }
        
        // Estimated hours factor (if available)
        if (task.estimatedHours) {
          weight = task.estimatedHours / 4; // Normalize to 4-hour baseline
        }
        
        // Complexity factor (based on subtasks or description length)
        if (task.subtasks && task.subtasks.length > 0) {
          weight *= (1 + task.subtasks.length * 0.1); // 10% increase per subtask
        }
        
        return weight;
      };
      
      // Calculate weighted workload
      const activeTasksWeighted = userTasks
        .filter((task: any) => task.status !== 'done')
        .reduce((sum: number, task: any) => sum + calculateTaskWeight(task), 0);
      
      const completedTasksWeighted = userTasks
        .filter((task: any) => task.status === 'done')
        .reduce((sum: number, task: any) => sum + calculateTaskWeight(task), 0);
      
      const totalWeightedTasks = activeTasksWeighted + completedTasksWeighted;
      
      // Calculate estimated hours (either from task data or weighted estimate)
      const estimatedHours = userTasks.reduce((sum: number, task: any) => {
        if (task.estimatedHours) {
          return sum + (task.status !== 'done' ? task.estimatedHours : 0);
        }
        // Fallback: estimate based on task weight
        return sum + (task.status !== 'done' ? calculateTaskWeight(task) * 4 : 0);
      }, 0);
      
      // Calculate actual hours logged (if available)
      const actualHours = userTasks.reduce((sum: number, task: any) => {
        return sum + (task.actualHours || 0);
      }, 0);
      
      // Enhanced productivity calculation (weighted)
      const productivity = totalWeightedTasks > 0 
        ? Math.round((completedTasksWeighted / totalWeightedTasks) * 100) 
        : 0;
      
      // Capacity utilization (assuming 40 hours/week capacity)
      const weeklyCapacity = 40;
      const capacityUtilization = Math.min(100, Math.round((estimatedHours / weeklyCapacity) * 100));
      
      // Workload status (balanced, overloaded, underutilized)
      let workloadStatus: 'balanced' | 'overloaded' | 'underutilized' = 'balanced';
      if (capacityUtilization > 100) {
        workloadStatus = 'overloaded';
      } else if (capacityUtilization < 50 && activeTasks > 0) {
        workloadStatus = 'underutilized';
      }

      return {
        id: member.id,
        name: member.userName || member.userEmail || 'Unknown User',
        email: member.userEmail || '',
        role: member.role || 'member',
        workspaceRole: member.role || 'member',
        activeTasks,
        completedTasks,
        hoursThisWeek: actualHours || estimatedHours,
        productivity,
        status: member.isActive ? 'online' : 'offline',
        joinedProject: member.assignedAt ? new Date(member.assignedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        lastActive: "Recently", // Could be enhanced with real last activity data
        isProjectLead: member.role === 'workspace-manager' || member.role === 'department-head' || member.role === 'project-manager' || member.role === 'team-lead',
        // Enhanced fields for capacity planning
        workloadScore: activeTasksWeighted,
        estimatedHours: Math.round(estimatedHours),
        capacityUtilization,
        workloadStatus,
        highPriorityTasks: userTasks.filter((t: any) => 
          (t.priority === 'urgent' || t.priority === 'high') && t.status !== 'done'
        ).length
      };
    });
  }, [realProjectMembers, tasksData]);

  // @epic-3.4-teams: Calculate team metrics
  const teamMetrics: TeamMetrics = useMemo(() => {
    if (!projectMembers.length) {
      return {
        totalMembers: 0,
        activeMembers: 0,
        avgTasksPerMember: 0,
        totalTasksAssigned: 0,
        totalTasksCompleted: 0,
        teamProductivity: 0,
        projectCompletion: 0,
      };
    }

    const totalTasksAssigned = projectMembers.reduce((sum, member) => sum + member.activeTasks + member.completedTasks, 0);
    const totalTasksCompleted = projectMembers.reduce((sum, member) => sum + member.completedTasks, 0);
    const activeMembers = projectMembers.filter(member => member.status === 'online').length;
    const avgProductivity = projectMembers.reduce((sum, member) => sum + member.productivity, 0) / projectMembers.length;

    return {
      totalMembers: projectMembers.length,
      activeMembers,
      avgTasksPerMember: totalTasksAssigned > 0 ? Math.round(totalTasksAssigned / projectMembers.length) : 0,
      totalTasksAssigned,
      totalTasksCompleted,
      teamProductivity: Math.round(avgProductivity),
      projectCompletion: totalTasksAssigned > 0 ? Math.round((totalTasksCompleted / totalTasksAssigned) * 100) : 0,
    };
  }, [projectMembers]);

  // @epic-3.4-teams: Filter and sort members
  const filteredAndSortedMembers = useMemo(() => {
    let filtered = projectMembers.filter(member => {
      const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           member.role.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = !roleFilter || roleFilter === "all" || member.role === roleFilter;
      const matchesStatus = !statusFilter || statusFilter === "all" || member.status === statusFilter;
      
      return matchesSearch && matchesRole && matchesStatus;
    });

    // Sort members
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "tasks":
          return (b.activeTasks + b.completedTasks) - (a.activeTasks + a.completedTasks);
        case "productivity":
          return b.productivity - a.productivity;
        case "recent":
          return new Date(b.joinedProject).getTime() - new Date(a.joinedProject).getTime();
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return filtered;
  }, [projectMembers, searchTerm, roleFilter, statusFilter, sortBy]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isLoading = isLoadingMembers || isUsersLoading || isTasksLoading;

  // @epic-3.4-teams: Handle invite team member
  const handleInviteTeamMember = () => {
    setIsInviteModalOpen(true);
  };

  // Enhanced member action handlers
  const handleChangeRole = (member: ProjectMember) => {
    setSelectedMemberForRole(member);
    setNewRole(member.role);
    setIsRoleChangeOpen(true);
  };

  const handleViewMemberDetails = (member: ProjectMember) => {
    setSelectedMemberForDetails(member);
    setIsMemberDetailsOpen(true);
  };

  const handleSendMessage = async (member: ProjectMember) => {
    // @epic-4.1-direct-messaging: Open direct message with selected member
    await openDirectMessage(member.email, member.name);
  };

  const handleStartVideoCall = (member: ProjectMember) => {
    toast.info(`Starting video call with ${member.name}...`);
    // Implementation for video call system
  };

  const handleRemoveMember = (member: ProjectMember) => {
    setMemberToRemove(member);
  };
  
  const confirmRemoveMember = async () => {
    if (!memberToRemove || !workspaceId) return;
    
    try {
      await removeMemberMutation.mutateAsync({
        workspaceId,
        memberId: memberToRemove.id
      });
      
      setMemberToRemove(null);
    } catch (error) {
      // Error already handled by mutation hook
    }
  };

  const confirmRoleChange = async () => {
    if (!selectedMemberForRole || !newRole || !workspaceId) return;
    
    try {
      await changeRoleMutation.mutateAsync({
        workspaceId,
        memberId: selectedMemberForRole.id,
        newRole
      });
      
      setIsRoleChangeOpen(false);
      setSelectedMemberForRole(null);
      setNewRole("");
    } catch (error) {
      // Error already handled by mutation hook
    }
  };

  // Bulk action handlers
  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedMembers.size === filteredAndSortedMembers.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(filteredAndSortedMembers.map(m => m.id)));
    }
  };

  const handleBulkRoleChange = () => {
    if (selectedMembers.size === 0) {
      toast.error("Please select at least one member");
      return;
    }
    setIsBulkRoleChangeOpen(true);
  };

  const confirmBulkRoleChange = async () => {
    if (!bulkNewRole || selectedMembers.size === 0 || !workspaceId) return;

    try {
      const promises = Array.from(selectedMembers).map(memberId =>
        changeRoleMutation.mutateAsync({
          workspaceId,
          memberId,
          newRole: bulkNewRole
        })
      );

      await Promise.all(promises);
      
      toast.success(`Updated ${selectedMembers.size} member roles to ${bulkNewRole}`);
      setIsBulkRoleChangeOpen(false);
      setBulkNewRole("");
      setSelectedMembers(new Set());
      setIsBulkMode(false);
    } catch (error) {
      toast.error("Some role changes failed. Please try again.");
    }
  };

  const handleBulkRemove = async () => {
    if (selectedMembers.size === 0) {
      toast.error("Please select at least one member");
      return;
    }

    if (!confirm(`Are you sure you want to remove ${selectedMembers.size} member(s)?`)) {
      return;
    }

    if (!workspaceId) return;

    try {
      const promises = Array.from(selectedMembers).map(memberId =>
        removeMemberMutation.mutateAsync({
          workspaceId,
          memberId
        })
      );

      await Promise.all(promises);
      
      toast.success(`Removed ${selectedMembers.size} member(s)`);
      setSelectedMembers(new Set());
      setIsBulkMode(false);
    } catch (error) {
      toast.error("Some removals failed. Please try again.");
    }
  };

  const handleBulkExport = () => {
    if (selectedMembers.size === 0) {
      toast.error("Please select at least one member");
      return;
    }

    try {
      const selectedData = filteredAndSortedMembers.filter(m => selectedMembers.has(m.id));
      
      const csvData = selectedData.map(member => ({
        Name: member.name,
        Email: member.email,
        Role: member.role,
        "Active Tasks": member.activeTasks,
        "Completed Tasks": member.completedTasks,
        "Productivity %": member.productivity,
        Status: member.status,
        "Last Active": member.lastActive,
        "Joined Project": member.joinedProject
      }));
      
      const headers = Object.keys(csvData[0]);
      const csvRows = [
        headers.join(','),
        ...csvData.map(row => 
          headers.map(header => {
            const value = row[header as keyof typeof row];
            const escaped = String(value).replace(/"/g, '""');
            return escaped.includes(',') || escaped.includes('\n') || escaped.includes('"') 
              ? `"${escaped}"` 
              : escaped;
          }).join(',')
        )
      ];
      
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const projectName = project?.name?.replace(/[^a-z0-9]/gi, '_') || 'project';
      link.href = url;
      link.download = `team_${projectName}_selected_${timestamp}.csv`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Exported ${selectedData.length} selected members to CSV`);
    } catch (error) {
      console.error('Error exporting selected members:', error);
      toast.error('Failed to export selected members');
    }
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm("");
    setRoleFilter("all");
    setStatusFilter("all");
    setSortBy("name");
    toast.success("All filters cleared");
  };

  // Export team data
  const handleExportTeam = () => {
    try {
      // Prepare CSV data
      const csvData = projectMembers.map(member => ({
        Name: member.name,
        Email: member.email,
        Role: member.role,
        "Active Tasks": member.activeTasks,
        "Completed Tasks": member.completedTasks,
        "Productivity %": member.productivity,
        Status: member.status,
        "Last Active": member.lastActive,
        "Joined Project": member.joinedProject
      }));
      
      // Generate CSV content
      const headers = Object.keys(csvData[0]);
      const csvRows = [
        headers.join(','), // Header row
        ...csvData.map(row => 
          headers.map(header => {
            const value = row[header as keyof typeof row];
            // Escape quotes and wrap in quotes if contains comma/newline
            const escaped = String(value).replace(/"/g, '""');
            return escaped.includes(',') || escaped.includes('\n') || escaped.includes('"') 
              ? `"${escaped}"` 
              : escaped;
          }).join(',')
        )
      ];
      
      const csvContent = csvRows.join('\n');
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const projectName = project?.name?.replace(/[^a-z0-9]/gi, '_') || 'project';
      link.href = url;
      link.download = `team_${projectName}_${timestamp}.csv`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Exported ${projectMembers.length} team members to CSV`);
    } catch (error) {
      console.error('Error exporting team data:', error);
      toast.error('Failed to export team data');
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      // Cmd/Ctrl + K: Focus search
      if (modifier && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        toast.success("Search focused", { duration: 1000 });
      }

      // Cmd/Ctrl + I: Open invite modal
      if (modifier && e.key === 'i' && permissions.permissions.canAddMembers) {
        e.preventDefault();
        setIsInviteModalOpen(true);
        toast.success("Invite member", { duration: 1000 });
      }

      // Cmd/Ctrl + E: Export team data
      if (modifier && e.key === 'e') {
        e.preventDefault();
        handleExportTeam();
      }

      // Cmd/Ctrl + F: Toggle filters
      if (modifier && e.key === 'f') {
        e.preventDefault();
        setShowFilters(prev => !prev);
        toast.success(showFilters ? "Filters hidden" : "Filters shown", { duration: 1000 });
      }

      // Cmd/Ctrl + /: Show keyboard shortcuts help
      if (modifier && e.key === '/') {
        e.preventDefault();
        setShowKeyboardHelp(prev => !prev);
      }

      // Escape: Close modals/dialogs
      if (e.key === 'Escape') {
        if (showKeyboardHelp) setShowKeyboardHelp(false);
        if (showFilters) setShowFilters(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [permissions.permissions.canAddMembers, showFilters, showKeyboardHelp]);

  return (
    <LazyDashboardLayout>
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Team Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Team Management</h1>
            <p className="text-muted-foreground">
              Manage your project team members, roles, and permissions
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {permissions.permissions.canAddMembers && (
              <Button onClick={handleInviteTeamMember}>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setIsDashboardOpen(true)}>
              <BarChart3 className="mr-2 h-4 w-4" />
              Analytics
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Team Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportTeam}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Team Data
                </DropdownMenuItem>
                <DropdownMenuItem onClick={clearAllFilters}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Clear All Filters
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}>
                  {viewMode === "grid" ? <Users className="mr-2 h-4 w-4" /> : <BarChart3 className="mr-2 h-4 w-4" />}
                  Switch to {viewMode === "grid" ? "List" : "Grid"} View
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Team Metrics Cards */}
        {!isLoading && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 border-blue-200 dark:border-blue-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                  <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{teamMetrics.totalMembers}</div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="flex items-center">
                      <Zap className="h-3 w-3 text-green-600 mr-1" />
                      {teamMetrics.activeMembers} active
                    </span>
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Tasks</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{teamMetrics.avgTasksPerMember}</div>
                  <p className="text-xs text-muted-foreground">
                    per member
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tasks Assigned</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{teamMetrics.totalTasksAssigned}</div>
                  <p className="text-xs text-muted-foreground">
                    total tasks
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50 border-green-200 dark:border-green-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">{teamMetrics.totalTasksCompleted}</div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-green-600" />
                    tasks done
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50 border-purple-200 dark:border-purple-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Productivity</CardTitle>
                  <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{teamMetrics.teamProductivity}%</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    {teamMetrics.teamProductivity >= 70 ? (
                      <Badge variant="outline" className="text-xs px-1 py-0 h-4 bg-green-100 text-green-700 border-green-300">
                        High
                      </Badge>
                    ) : teamMetrics.teamProductivity >= 50 ? (
                      <Badge variant="outline" className="text-xs px-1 py-0 h-4 bg-yellow-100 text-yellow-700 border-yellow-300">
                        Medium
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs px-1 py-0 h-4 bg-red-100 text-red-700 border-red-300">
                        Low
                      </Badge>
                    )}
                    <span className="ml-1">team average</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/50 border-amber-200 dark:border-amber-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completion</CardTitle>
                  <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{teamMetrics.projectCompletion}%</div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Target className="h-3 w-3 text-amber-600" />
                    project done
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Filters */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Filters & Search</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)}>
                    <Filter className="h-4 w-4 mr-2" />
                    {showFilters ? "Hide" : "Show"} Filters
                  </Button>
                </div>
              </CardHeader>
              {showFilters && (
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        ref={searchInputRef}
                        placeholder="Search members... (⌘K)"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        {availableRoles.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="away">Away</SelectItem>
                        <SelectItem value="offline">Offline</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="tasks">Task Count</SelectItem>
                        <SelectItem value="productivity">Productivity</SelectItem>
                        <SelectItem value="recent">Recently Joined</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Showing {filteredAndSortedMembers.length} of {projectMembers.length} members
                    </div>
                    <Button variant="outline" size="sm" onClick={clearAllFilters}>
                      Clear All
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* AI-Powered Team Insights Panel */}
            {!isLoading && projectMembers.length > 0 && (
              <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border-purple-200 dark:border-purple-800/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Lightbulb className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      <CardTitle className="text-purple-900 dark:text-purple-100">AI Team Insights</CardTitle>
                    </div>
                    <Badge variant="outline" className="bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700">
                      Smart Analysis
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Actionable insights based on team performance and workload analysis
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(() => {
                      const insights = [];
                      
                      // Analyze overloaded members
                      const overloadedMembers = filteredAndSortedMembers.filter(m => 
                        m.workloadStatus === 'overloaded' || (m.capacityUtilization || 0) > 100
                      );
                      if (overloadedMembers.length > 0) {
                        insights.push({
                          type: 'warning',
                          icon: AlertTriangle,
                          title: 'Overloaded Team Members',
                          description: `${overloadedMembers.length} member${overloadedMembers.length > 1 ? 's are' : ' is'} at >100% capacity`,
                          action: 'Redistribute tasks',
                          members: overloadedMembers.slice(0, 3).map(m => m.name).join(', '),
                          color: 'text-red-600 dark:text-red-400',
                          bgColor: 'bg-red-100 dark:bg-red-900/30',
                          borderColor: 'border-red-300 dark:border-red-800'
                        });
                      }
                      
                      // Analyze underutilized members
                      const underutilizedMembers = filteredAndSortedMembers.filter(m => 
                        m.workloadStatus === 'underutilized' && m.activeTasks > 0
                      );
                      if (underutilizedMembers.length > 0) {
                        insights.push({
                          type: 'opportunity',
                          icon: TrendingUp,
                          title: 'Available Capacity',
                          description: `${underutilizedMembers.length} member${underutilizedMembers.length > 1 ? 's have' : ' has'} capacity for more work`,
                          action: 'Assign additional tasks',
                          members: underutilizedMembers.slice(0, 3).map(m => m.name).join(', '),
                          color: 'text-green-600 dark:text-green-400',
                          bgColor: 'bg-green-100 dark:bg-green-900/30',
                          borderColor: 'border-green-300 dark:border-green-800'
                        });
                      }
                      
                      // Analyze productivity
                      const avgProductivity = Math.round(
                        filteredAndSortedMembers.reduce((sum, m) => sum + (m.productivity || 0), 0) / 
                        filteredAndSortedMembers.length
                      );
                      const lowProductivityMembers = filteredAndSortedMembers.filter(m => 
                        (m.productivity || 0) < avgProductivity * 0.7 && m.activeTasks > 0
                      );
                      if (lowProductivityMembers.length > 0) {
                        insights.push({
                          type: 'action',
                          icon: Activity,
                          title: 'Productivity Support Needed',
                          description: `${lowProductivityMembers.length} member${lowProductivityMembers.length > 1 ? 's are' : ' is'} below team average (${avgProductivity}%)`,
                          action: 'Check for blockers',
                          members: lowProductivityMembers.slice(0, 3).map(m => m.name).join(', '),
                          color: 'text-amber-600 dark:text-amber-400',
                          bgColor: 'bg-amber-100 dark:bg-amber-900/30',
                          borderColor: 'border-amber-300 dark:border-amber-800'
                        });
                      }
                      
                      // Analyze high priority task distribution
                      const totalHighPriority = filteredAndSortedMembers.reduce((sum, m) => 
                        sum + (m.highPriorityTasks || 0), 0
                      );
                      const membersWithHighPriority = filteredAndSortedMembers.filter(m => 
                        (m.highPriorityTasks || 0) > 0
                      );
                      if (totalHighPriority > 5 && membersWithHighPriority.length < Math.ceil(filteredAndSortedMembers.length * 0.4)) {
                        insights.push({
                          type: 'info',
                          icon: Star,
                          title: 'High Priority Concentration',
                          description: `${totalHighPriority} urgent tasks on ${membersWithHighPriority.length} member${membersWithHighPriority.length > 1 ? 's' : ''}`,
                          action: 'Consider distributing urgency',
                          members: membersWithHighPriority.slice(0, 3).map(m => m.name).join(', '),
                          color: 'text-blue-600 dark:text-blue-400',
                          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
                          borderColor: 'border-blue-300 dark:border-blue-800'
                        });
                      }
                      
                      // Analyze team balance
                      const maxLoad = Math.max(...filteredAndSortedMembers.map(m => m.capacityUtilization || 0));
                      const minLoad = Math.min(...filteredAndSortedMembers.map(m => m.capacityUtilization || 0));
                      const loadVariance = maxLoad - minLoad;
                      if (loadVariance > 60 && filteredAndSortedMembers.length > 2) {
                        insights.push({
                          type: 'balance',
                          icon: TrendingUp,
                          title: 'Unbalanced Workload Distribution',
                          description: `${loadVariance}% difference between most and least loaded members`,
                          action: 'Rebalance task assignments',
                          members: `Range: ${minLoad}% to ${maxLoad}%`,
                          color: 'text-indigo-600 dark:text-indigo-400',
                          bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
                          borderColor: 'border-indigo-300 dark:border-indigo-800'
                        });
                      }
                      
                      // If no issues, show positive insight
                      if (insights.length === 0) {
                        insights.push({
                          type: 'success',
                          icon: CheckCircle2,
                          title: 'Well-Balanced Team',
                          description: 'Team workload is evenly distributed with healthy productivity',
                          action: 'Maintain current pace',
                          members: `Team avg: ${avgProductivity}% productivity`,
                          color: 'text-green-600 dark:text-green-400',
                          bgColor: 'bg-green-100 dark:bg-green-900/30',
                          borderColor: 'border-green-300 dark:border-green-800'
                        });
                      }
                      
                      return insights.slice(0, 3).map((insight, idx) => {
                        const IconComponent = insight.icon;
                        return (
                          <Card key={idx} className={cn("border-l-4", insight.borderColor)}>
                            <CardContent className="pt-4">
                              <div className="flex items-start space-x-3">
                                <div className={cn("p-2 rounded-lg", insight.bgColor)}>
                                  <IconComponent className={cn("h-5 w-5", insight.color)} />
                                </div>
                                <div className="flex-1 space-y-1">
                                  <h4 className="font-semibold text-sm">{insight.title}</h4>
                                  <p className="text-xs text-muted-foreground">{insight.description}</p>
                                  <div className="flex items-center justify-between pt-2">
                                    <Badge variant="outline" className="text-xs">
                                      {insight.action}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground pt-1 italic">
                                    {insight.members}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      });
                    })()}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Team Management Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="workload">Workload</TabsTrigger>
                  <TabsTrigger value="performance">Performance</TabsTrigger>
                </TabsList>
                
                {/* Bulk Actions Toggle */}
                {permissions.permissions.canManageMembers && activeTab === "overview" && (
                  <Button 
                    variant={isBulkMode ? "default" : "outline"} 
                    size="sm"
                    onClick={() => {
                      setIsBulkMode(!isBulkMode);
                      if (isBulkMode) {
                        setSelectedMembers(new Set());
                      }
                    }}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {isBulkMode ? "Exit Bulk Mode" : "Bulk Actions"}
                  </Button>
                )}
              </div>

              {/* Select All / Bulk Actions Bar */}
              {isBulkMode && activeTab === "overview" && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={selectedMembers.size === filteredAndSortedMembers.length && filteredAndSortedMembers.length > 0}
                            onCheckedChange={toggleSelectAll}
                          />
                          <label className="text-sm font-medium cursor-pointer" onClick={toggleSelectAll}>
                            Select All
                          </label>
                        </div>
                        
                        {selectedMembers.size > 0 && (
                          <>
                            <Badge variant="default" className="text-sm">
                              {selectedMembers.size} selected
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              of {filteredAndSortedMembers.length} members
                            </span>
                          </>
                        )}
                      </div>
                      
                      {selectedMembers.size > 0 && (
                        <div className="flex items-center space-x-2">
                          {permissions.permissions.canChangeRoles && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={handleBulkRoleChange}
                            >
                              <Settings className="mr-2 h-4 w-4" />
                              Change Roles
                            </Button>
                          )}
                          
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleBulkExport}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Export Selected
                          </Button>
                          
                          {permissions.permissions.canRemoveMembers && (
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={handleBulkRemove}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove Selected
                            </Button>
                          )}
                          
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedMembers(new Set())}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <TabsContent value="overview" className="space-y-6">
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredAndSortedMembers.map((member) => (
                      <Card 
                        key={member.id} 
                        className={cn(
                          "group relative hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden",
                          selectedMembers.has(member.id) && "ring-2 ring-primary"
                        )}
                      >
                        {/* Bulk Select Checkbox */}
                        {isBulkMode && (
                          <div className="absolute top-3 left-3 z-10">
                            <Checkbox
                              checked={selectedMembers.has(member.id)}
                              onCheckedChange={() => toggleMemberSelection(member.id)}
                              className="bg-background"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        )}
                        
                        {/* Project Lead Badge */}
                        {member.isProjectLead && (
                          <div className="absolute top-3 right-3 z-10">
                            <Badge variant="secondary" className="text-xs shadow-sm">
                              <Star className="h-3 w-3 mr-1" />
                              Lead
                            </Badge>
                          </div>
                        )}
                        
                        {/* Compact Header - Always Visible */}
                        <CardHeader className="pb-3 pt-6">
                          <div className="flex items-start space-x-3">
                            {/* Avatar with status */}
                            <div className="relative flex-shrink-0">
                              <Avatar className="w-12 h-12">
                                <div className="w-full h-full bg-primary/10 flex items-center justify-center text-base font-medium">
                                  {member.name.charAt(0).toUpperCase()}
                                </div>
                              </Avatar>
                              <div 
                                className={cn(
                                  "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background shadow-sm",
                                  statusColors[member.status]
                                )}
                              />
                            </div>
                            
                            {/* Compact Info */}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold truncate">{member.name}</h3>
                              <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                              <Badge 
                                variant="outline" 
                                className={cn("text-xs mt-1.5", roleColors[member.role as keyof typeof roleColors] || roleColors.member)}
                              >
                                {availableRoles.find(r => r.value === member.role)?.label || member.role}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        
                        {/* Essential Stats - Always Visible */}
                        <CardContent className="space-y-3 pb-3">
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="flex flex-col">
                              <span className="text-lg font-bold text-primary">{member.activeTasks}</span>
                              <span className="text-xs text-muted-foreground">Active</span>
                            </div>
                            <div className="flex flex-col border-x">
                              <span className="text-lg font-bold text-green-600 dark:text-green-400">{member.completedTasks}</span>
                              <span className="text-xs text-muted-foreground">Done</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-lg font-bold text-purple-600 dark:text-purple-400">{member.productivity}%</span>
                              <span className="text-xs text-muted-foreground">Score</span>
                            </div>
                          </div>
                          
                          {/* Productivity Bar - Compact */}
                          <div className="space-y-1">
                            <Progress value={member.productivity} className="h-1.5" />
                          </div>

                          {/* Expandable Details - Show on Hover */}
                          <div className="max-h-0 overflow-hidden group-hover:max-h-96 transition-all duration-300 ease-in-out">
                            <div className="space-y-2 pt-3 border-t mt-3">
                              {/* Additional Stats */}
                              {member.estimatedHours !== undefined && (
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground flex items-center">
                                    <Clock className="h-3.5 w-3.5 mr-1.5" />
                                    Workload
                                  </span>
                                  <span className="font-medium">{member.estimatedHours}h</span>
                                </div>
                              )}
                              
                              {member.highPriorityTasks !== undefined && member.highPriorityTasks > 0 && (
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground flex items-center">
                                    <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                                    High Priority
                                  </span>
                                  <Badge variant="destructive" className="text-xs">
                                    {member.highPriorityTasks}
                                  </Badge>
                                </div>
                              )}
                              
                              {member.workloadStatus && (
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground flex items-center">
                                    <Activity className="h-3.5 w-3.5 mr-1.5" />
                                    Capacity
                                  </span>
                                  <Badge 
                                    variant={member.workloadStatus === 'overloaded' ? 'destructive' : member.workloadStatus === 'underutilized' ? 'secondary' : 'default'}
                                    className="text-xs capitalize"
                                  >
                                    {member.workloadStatus}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Actions - Visible on Hover */}
                          {permissions.permissions.canManageMembers && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pt-2 border-t mt-2">
                              <div className="grid grid-cols-2 gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleViewMemberDetails(member)} className="w-full h-8">
                                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                                  <span className="text-xs">Details</span>
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleSendMessage(member)} className="w-full h-8">
                                  <Mail className="mr-1.5 h-3.5 w-3.5" />
                                  <span className="text-xs">Message</span>
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>Team Members</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2">Member</th>
                              <th className="text-left py-2">Role</th>
                              <th className="text-left py-2">Status</th>
                              <th className="text-left py-2">Tasks</th>
                              <th className="text-left py-2">Productivity</th>
                              <th className="text-left py-2">Joined</th>
                              {permissions.permissions.canManageMembers && (
                                <th className="text-left py-2">Actions</th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredAndSortedMembers.map((member) => (
                              <tr key={member.id} className="border-b hover:bg-muted/50">
                                <td className="py-3">
                                  <div className="flex items-center space-x-3">
                                    <div className="relative">
                                      <Avatar className="w-8 h-8">
                                        <div className="w-full h-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                                          {member.name.charAt(0).toUpperCase()}
                                        </div>
                                      </Avatar>
                                      <div 
                                        className={cn(
                                          "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-background",
                                          statusColors[member.status]
                                        )}
                                      />
                                    </div>
                                    <div>
                                      <div className="font-medium">{member.name}</div>
                                      <div className="text-sm text-muted-foreground">{member.email}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3">
                                  <Badge variant="outline" className={cn("text-xs", roleColors[member.role as keyof typeof roleColors] || roleColors.member)}>
                                    {availableRoles.find(r => r.value === member.role)?.label || member.role}
                                  </Badge>
                                </td>
                                <td className="py-3">
                                  <div className="flex items-center space-x-2">
                                    <div 
                                      className={cn(
                                        "w-2 h-2 rounded-full",
                                        statusColors[member.status]
                                      )}
                                    />
                                    <span className="text-sm capitalize">{member.status}</span>
                                  </div>
                                </td>
                                <td className="py-3">
                                  <div className="text-sm">
                                    <div>{member.activeTasks} active</div>
                                    <div className="text-muted-foreground">{member.completedTasks} done</div>
                                  </div>
                                </td>
                                <td className="py-3">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-16 bg-secondary rounded-full h-2">
                                      <div 
                                        className="bg-primary h-2 rounded-full transition-all"
                                        style={{ width: `${member.productivity}%` }}
                                      />
                                    </div>
                                    <span className="text-sm font-medium">{member.productivity}%</span>
                                  </div>
                                </td>
                                <td className="py-3">
                                  <span className="text-sm">{formatDate(member.joinedProject)}</span>
                                </td>
                                {permissions.permissions.canManageMembers && (
                                  <td className="py-3">
                                    <div className="flex items-center space-x-1">
                                      {/* Primary Actions - Always Visible */}
                                      <Button variant="ghost" size="sm" onClick={() => handleViewMemberDetails(member)} title="View Details">
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="sm" onClick={() => handleSendMessage(member)} title="Send Message">
                                        <Mail className="h-4 w-4" />
                                      </Button>
                                      {/* Secondary Actions - Dropdown */}
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="sm">
                                            <MoreHorizontal className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuLabel>More Actions</DropdownMenuLabel>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem onClick={() => handleStartVideoCall(member)}>
                                            <Video className="mr-2 h-4 w-4" />
                                            Video Call
                                          </DropdownMenuItem>
                                          {permissions.permissions.canChangeRoles && (
                                            <DropdownMenuItem onClick={() => handleChangeRole(member)}>
                                              <Settings className="mr-2 h-4 w-4" />
                                              Change Role
                                            </DropdownMenuItem>
                                          )}
                                          {permissions.permissions.canRemoveMembers && (
                                            <>
                                              <DropdownMenuSeparator />
                                              <DropdownMenuItem 
                                                onClick={() => handleRemoveMember(member)}
                                                className="text-red-600 dark:text-red-400"
                                              >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Remove Member
                                              </DropdownMenuItem>
                                            </>
                                          )}
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="workload" className="space-y-6">
                {/* Workload Summary Card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Team Average Load</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {Math.round(filteredAndSortedMembers.reduce((sum, m) => sum + (m.capacityUtilization || 0), 0) / filteredAndSortedMembers.length || 0)}%
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Of 40hr/week capacity
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Overloaded Members</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {filteredAndSortedMembers.filter(m => m.workloadStatus === 'overloaded').length}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Need workload redistribution
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total Estimated Hours</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {filteredAndSortedMembers.reduce((sum, m) => sum + (m.estimatedHours || 0), 0)}h
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Across all active tasks
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Enhanced Workload Distribution */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center space-x-2">
                        <Activity className="h-5 w-5" />
                        <span>Capacity vs. Load Analysis</span>
                      </CardTitle>
                      <Badge variant="outline" className="text-xs">
                        40h/week baseline
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Dual-bar visualization showing capacity utilization and workload distribution
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Team Average Line */}
                    {filteredAndSortedMembers.length > 0 && (
                      <div className="bg-muted/50 p-3 rounded-lg border-l-4 border-blue-500">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span className="font-medium text-sm">Team Average</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="text-sm text-muted-foreground">
                              {Math.round(filteredAndSortedMembers.reduce((sum, m) => sum + (m.capacityUtilization || 0), 0) / filteredAndSortedMembers.length || 0)}% capacity
                            </span>
                            <span className="text-sm font-medium">
                              {Math.round(filteredAndSortedMembers.reduce((sum, m) => sum + (m.estimatedHours || 0), 0) / filteredAndSortedMembers.length || 0)}h/member
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Individual Member Workload Bars */}
                    {filteredAndSortedMembers
                      .sort((a, b) => (b.capacityUtilization || 0) - (a.capacityUtilization || 0))
                      .map((member) => {
                        const teamAvgCapacity = Math.round(filteredAndSortedMembers.reduce((sum, m) => sum + (m.capacityUtilization || 0), 0) / filteredAndSortedMembers.length || 0);
                        const isAboveAverage = (member.capacityUtilization || 0) > teamAvgCapacity;
                        const statusColor = member.workloadStatus === 'overloaded' ? 'bg-red-500' : 
                                          member.workloadStatus === 'underutilized' ? 'bg-blue-500' : 
                                          'bg-green-500';
                        
                        return (
                          <div key={member.id} className="space-y-2">
                            {/* Member Info */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3 flex-1">
                                <Avatar className="w-8 h-8">
                                  <div className="w-full h-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                                    {member.name.charAt(0).toUpperCase()}
                                  </div>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-medium truncate">{member.name}</span>
                                    {isAboveAverage && (
                                      <Badge variant="outline" className="text-xs">
                                        Above Avg
                                      </Badge>
                                    )}
                                    {member.highPriorityTasks && member.highPriorityTasks > 0 && (
                                      <Badge variant="destructive" className="text-xs">
                                        {member.highPriorityTasks} urgent
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {member.activeTasks} active • {member.estimatedHours || 0}h estimated
                                  </div>
                                </div>
                              </div>
                              <div className="text-right ml-4">
                                <div className="font-semibold text-sm">{member.capacityUtilization || 0}%</div>
                                <Badge 
                                  variant={member.workloadStatus === 'overloaded' ? 'destructive' : member.workloadStatus === 'underutilized' ? 'secondary' : 'default'}
                                  className="text-xs capitalize"
                                >
                                  {member.workloadStatus || 'balanced'}
                                </Badge>
                              </div>
                            </div>
                            
                            {/* Dual-Bar Visualization */}
                            <div className="space-y-1.5">
                              {/* Capacity Bar (Background - 100% reference) */}
                              <div className="relative h-7 bg-secondary/30 rounded-lg overflow-hidden border">
                                {/* Team Average Indicator Line */}
                                <div 
                                  className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10"
                                  style={{ left: `${teamAvgCapacity}%` }}
                                  title={`Team Average: ${teamAvgCapacity}%`}
                                />
                                
                                {/* Actual Load Bar */}
                                <div 
                                  className={cn("h-full transition-all duration-500 flex items-center justify-end px-2", statusColor)}
                                  style={{ width: `${Math.min(member.capacityUtilization || 0, 100)}%` }}
                                >
                                  {(member.capacityUtilization || 0) > 15 && (
                                    <span className="text-xs font-medium text-white">
                                      {member.estimatedHours || 0}h
                                    </span>
                                  )}
                                </div>
                                
                                {/* Over-capacity Extension (if > 100%) */}
                                {(member.capacityUtilization || 0) > 100 && (
                                  <div 
                                    className="absolute top-0 right-0 h-full bg-red-600/80 flex items-center px-2"
                                    style={{ width: `${Math.min((member.capacityUtilization || 0) - 100, 50)}%` }}
                                  >
                                    <AlertTriangle className="h-3 w-3 text-white" />
                                  </div>
                                )}
                              </div>
                              
                              {/* Capacity Scale */}
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>0h</span>
                                <span className="text-blue-600 dark:text-blue-400 font-medium">
                                  Team Avg: {teamAvgCapacity}%
                                </span>
                                <span>40h (100%)</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="performance" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Performers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {filteredAndSortedMembers
                          .sort((a, b) => b.productivity - a.productivity)
                          .slice(0, 5)
                          .map((member, index) => (
                            <div key={member.id} className="flex items-center space-x-3 p-3 rounded-lg border">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold">
                                {index + 1}
                              </div>
                              <Avatar className="w-8 h-8">
                                <div className="w-full h-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                                  {member.name.charAt(0).toUpperCase()}
                                </div>
                              </Avatar>
                              <div className="flex-1">
                                <div className="font-medium">{member.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {member.completedTasks} tasks completed
                                </div>
                              </div>
                              <div className="text-lg font-bold text-green-600">
                                {member.productivity}%
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Team Health</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span>Average Productivity</span>
                          <span className="font-semibold">{teamMetrics.teamProductivity}%</span>
                        </div>
                        <Progress value={teamMetrics.teamProductivity} className="h-2" />
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span>Project Completion</span>
                          <span className="font-semibold">{teamMetrics.projectCompletion}%</span>
                        </div>
                        <Progress value={teamMetrics.projectCompletion} className="h-2" />
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{teamMetrics.activeMembers}</div>
                          <div className="text-sm text-muted-foreground">Active Members</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">{teamMetrics.avgTasksPerMember}</div>
                          <div className="text-sm text-muted-foreground">Avg Tasks</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>

            {/* Enhanced Empty State */}
            {filteredAndSortedMembers.length === 0 && !isLoading && (
              <Card className="border-dashed border-2">
                <CardContent className="py-12">
                  {searchTerm || (roleFilter && roleFilter !== "all") || (statusFilter && statusFilter !== "all") ? (
                    /* Filtered Empty State */
                    <div className="text-center">
                      <Search className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                      <h3 className="text-xl font-semibold mb-2">No members match your filters</h3>
                      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                        Try adjusting your search terms or filters to find team members
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <Button variant="outline" onClick={clearAllFilters}>
                          <XCircle className="mr-2 h-4 w-4" />
                          Clear All Filters
                        </Button>
                        <Button variant="outline" onClick={() => setSearchTerm("")}>
                          <Search className="mr-2 h-4 w-4" />
                          Clear Search
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Project Empty State */
                    <div className="max-w-2xl mx-auto">
                      <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                          <Users className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-2xl font-semibold mb-2">Build Your Team</h3>
                        <p className="text-muted-foreground mb-2">
                          This project doesn't have any assigned team members yet
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Start by inviting team members or assigning existing workspace members
                        </p>
                      </div>

                      {/* Suggested Actions */}
                      {permissions.permissions.canAddMembers && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleInviteTeamMember}>
                            <CardContent className="p-6 text-center">
                              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-3">
                                <UserPlus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                              </div>
                              <h4 className="font-semibold mb-1">Invite Members</h4>
                              <p className="text-xs text-muted-foreground mb-3">
                                Send invitations to new team members
                              </p>
                              <div>
                                <Badge variant="outline" className="text-xs">⌘I</Badge>
                              </div>
                            </CardContent>
                          </Card>

                          <Card className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6 text-center">
                              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 mb-3">
                                <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                              </div>
                              <h4 className="font-semibold mb-1">Workspace Members</h4>
                              <p className="text-xs text-muted-foreground mb-3">
                                Assign existing workspace members
                              </p>
                              <Button variant="outline" size="sm" className="mt-1">
                                View All
                              </Button>
                            </CardContent>
                          </Card>

                          <Card className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6 text-center">
                              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 mb-3">
                                <Download className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                              </div>
                              <h4 className="font-semibold mb-1">Import Team</h4>
                              <p className="text-xs text-muted-foreground mb-3">
                                Bulk import from CSV or another project
                              </p>
                              <Button variant="outline" size="sm" className="mt-1">
                                Import
                              </Button>
                            </CardContent>
                          </Card>
                        </div>
                      )}

                      {/* Quick Tips for First-Time Users */}
                      <Card className="bg-muted/50">
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                              <Lightbulb className="h-5 w-5 text-amber-500" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-sm mb-2">Getting Started Tips</h4>
                              <ul className="space-y-1 text-sm text-muted-foreground">
                                <li className="flex items-start">
                                  <span className="mr-2">•</span>
                                  <span>Invite members by email or assign existing workspace users</span>
                                </li>
                                <li className="flex items-start">
                                  <span className="mr-2">•</span>
                                  <span>Assign appropriate roles (Team Lead, Member, Viewer) for access control</span>
                                </li>
                                <li className="flex items-start">
                                  <span className="mr-2">•</span>
                                  <span>Use keyboard shortcuts for faster navigation (Press ⌘/ to see all)</span>
                                </li>
                              </ul>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Primary CTA */}
                      {permissions.permissions.canAddMembers && (
                        <div className="text-center mt-6">
                          <Button size="lg" onClick={handleInviteTeamMember}>
                            <UserPlus className="mr-2 h-5 w-5" />
                            Invite Your First Team Member
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Role Change Modal */}
        <Dialog open={isRoleChangeOpen} onOpenChange={setIsRoleChangeOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Change Member Role</DialogTitle>
              <DialogDescription>
                Update the role for {selectedMemberForRole?.name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Select New Role</label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((role) => {
                      const IconComponent = role.icon;
                      return (
                        <SelectItem key={role.value} value={role.value}>
                          <div className="flex items-center space-x-2">
                            <IconComponent className="h-4 w-4" />
                            <div>
                              <div className="font-medium">{role.label}</div>
                              <div className="text-xs text-muted-foreground">{role.description}</div>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              
              {newRole && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <h4 className="font-medium text-sm mb-1">Role Summary</h4>
                  <p className="text-sm text-muted-foreground">
                    {availableRoles.find(r => r.value === newRole)?.description}
                  </p>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRoleChangeOpen(false)} disabled={changeRoleMutation.isPending}>
                Cancel
              </Button>
              <Button 
                onClick={confirmRoleChange} 
                disabled={!newRole || newRole === selectedMemberForRole?.role || changeRoleMutation.isPending}
              >
                {changeRoleMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Role'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Enhanced Member Details Modal */}
        <EnhancedMemberDetailsModal
          open={isMemberDetailsOpen}
          onClose={() => setIsMemberDetailsOpen(false)}
          member={selectedMemberForDetails}
          workspaceId={workspaceId}
          onSendMessage={handleSendMessage}
          onStartVideoCall={handleStartVideoCall}
          onChangeRole={(member) => {
            setIsMemberDetailsOpen(false);
            handleChangeRole(member);
          }}
          canChangeRoles={permissions.permissions.canChangeRoles}
          roleColors={roleColors}
          availableRoles={availableRoles}
        />

        {/* Analytics Dashboard Popup */}
        <DashboardPopup
          open={isDashboardOpen}
          onClose={() => setIsDashboardOpen(false)}
          projectId={project?.id}
          projectName={project?.name}
          title="Team Analytics"
          variant="team"
          realProjectStats={{
            totalTasks: teamMetrics.totalTasksAssigned,
            completedTasks: teamMetrics.totalTasksCompleted,
            inProgressTasks: teamMetrics.totalTasksAssigned - teamMetrics.totalTasksCompleted,
            overdueTasks: 0,
            teamMembers: teamMetrics.totalMembers,
            velocity: teamMetrics.avgTasksPerMember,
            healthScore: teamMetrics.teamProductivity,
            efficiency: teamMetrics.projectCompletion
          }}
          realTeamMembers={projectMembers}
        />

        {/* Remove Member Confirmation Dialog */}
        <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove {memberToRemove?.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This member will be removed from the workspace. All their assigned tasks ({memberToRemove?.activeTasks || 0}) will be unassigned. 
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={removeMemberMutation.isPending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmRemoveMember} 
                disabled={removeMemberMutation.isPending}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              >
                {removeMemberMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Removing...
                  </>
                ) : (
                  'Remove Member'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Invite Team Member Modal */}
        <InviteTeamMemberModal
          open={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          workspaceId={workspaceId}
        />

        {/* Bulk Role Change Modal */}
        <Dialog open={isBulkRoleChangeOpen} onOpenChange={setIsBulkRoleChangeOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Bulk Role Change</DialogTitle>
              <DialogDescription>
                Change the role for {selectedMembers.size} selected member{selectedMembers.size !== 1 ? 's' : ''}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Select New Role</label>
                <Select value={bulkNewRole} onValueChange={setBulkNewRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((role) => {
                      const IconComponent = role.icon;
                      return (
                        <SelectItem key={role.value} value={role.value}>
                          <div className="flex items-center space-x-2">
                            <IconComponent className="h-4 w-4" />
                            <span>{role.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {bulkNewRole && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {availableRoles.find(r => r.value === bulkNewRole)?.description}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBulkRoleChangeOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={confirmBulkRoleChange}
                disabled={!bulkNewRole || changeRoleMutation.isPending}
              >
                {changeRoleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update {selectedMembers.size} Role{selectedMembers.size !== 1 ? 's' : ''}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Keyboard Shortcuts Help Dialog */}
        <Dialog open={showKeyboardHelp} onOpenChange={setShowKeyboardHelp}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Keyboard className="h-5 w-5" />
                <span>Keyboard Shortcuts</span>
              </DialogTitle>
              <DialogDescription>
                Use these keyboard shortcuts to navigate teams faster
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Focus search</span>
                </div>
                <Badge variant="outline" className="font-mono">⌘K</Badge>
              </div>
              {permissions.permissions.canAddMembers && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center space-x-2">
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Invite member</span>
                  </div>
                  <Badge variant="outline" className="font-mono">⌘I</Badge>
                </div>
              )}
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div className="flex items-center space-x-2">
                  <Download className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Export team data</span>
                </div>
                <Badge variant="outline" className="font-mono">⌘E</Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Toggle filters</span>
                </div>
                <Badge variant="outline" className="font-mono">⌘F</Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div className="flex items-center space-x-2">
                  <Keyboard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Show shortcuts</span>
                </div>
                <Badge variant="outline" className="font-mono">⌘/</Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div className="flex items-center space-x-2">
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Close dialogs</span>
                </div>
                <Badge variant="outline" className="font-mono">Esc</Badge>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowKeyboardHelp(false)}>
                Got it
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </LazyDashboardLayout>
  );
} 