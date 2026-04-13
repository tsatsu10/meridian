import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import useProjectStore from "@/store/project";
import useGetProject from "@/hooks/queries/project/use-get-project";
import useGetTasks from "@/hooks/queries/task/use-get-tasks";
  import CreateTaskModal from "@/components/shared/modals/create-task-modal";
  import CreateMilestoneModal from "@/components/shared/modals/create-milestone-modal";
  import InviteTeamMemberModal from "@/components/team/invite-team-member-modal";
import { useProjectPermissions } from "@/lib/permissions";

import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Users, 
  Plus,
  Calendar,
  BarChart3,
  Activity,
  FileText,
  Settings,
  Share,
  MoreVertical,
  Copy,
  ExternalLink,
  Mail,
  Trash2,
  Archive,
  Edit,
  Download,
  UserPlus,
  Zap,
  Target,
  Shield,
  AlertCircle,
  Info,
  Bell,
  Gauge,
  Timer,
  Flame,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  Wifi,
  WifiOff,
  RefreshCw,
  ShieldAlert,
  Lock
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useMemo, useEffect, useCallback } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { flattenTasks } from "@/utils/task-hierarchy";
import { useGetActiveWorkspaceUsers } from "@/hooks/queries/workspace-users/use-active-workspace-users";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import MilestoneDashboard from "@/components/dashboard/milestone-dashboard";
import { useMilestones } from "@/hooks/use-milestones";
import { useRiskMonitor } from "@/hooks/queries/risk/use-risk-detection";
import { useTaskStatusMonitor } from "@/hooks/mutations/task/use-auto-status-update";
import { getNotificationsFromStore } from "@/hooks/mutations/task/use-auto-status-update";
import DashboardPopup from "@/components/dashboard/dashboard-popup";
  import { useRBACAuth } from "@/lib/permissions";
  import LazyDashboardLayout, { StatsCardSkeleton, ChartSkeleton, TableSkeleton } from "@/components/performance/lazy-dashboard-layout";
import useWorkspaceStore from "@/store/workspace";
import useGetProjects from "@/hooks/queries/project/use-get-projects";
import type { Project } from "@/types/project";

export const Route = createFileRoute(
  "/dashboard/workspace/$workspaceId/project/$projectId/_layout/"
)({
  component: ProjectOverview,
});

interface ProjectStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  teamMembers: number;
  daysRemaining: number;
  velocity: number;
  healthScore: number;
  burnRate: number;
  blockedTasks: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  efficiency: number;
  riskScore: number;
}

interface TaskItem {
  id: string;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "done" | "overdue";
  priority: "low" | "medium" | "high" | "urgent";
  assignee?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  activeTasks: number;
  role: string;
  isOnline?: boolean;
  lastActive?: string;
  productivity: number;
}

interface ActivityItem {
  id: string;
  type: 'task_completed' | 'task_created' | 'milestone_achieved' | 'file_uploaded' | 'comment_added';
  title: string;
  description: string;
  user: string;
  timestamp: string;
  priority: 'low' | 'medium' | 'high';
  icon: string;
}

interface SmartAlert {
  id: string;
  type: 'warning' | 'danger' | 'info' | 'success';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  actionable: boolean;
  actions?: { label: string; action: string }[];
}

const statusColors = {
  todo: "bg-secondary text-secondary-foreground dark:bg-secondary-hover dark:text-secondary-foreground",
  "in_progress": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  done: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  overdue: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const priorityColors = {
  low: "bg-secondary text-secondary-foreground dark:bg-secondary-hover dark:text-secondary-foreground",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  urgent: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const healthColors = {
  excellent: "text-green-600",
  good: "text-green-500", 
  warning: "text-yellow-500",
  critical: "text-red-500"
};

const riskColors = {
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300", 
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
};

// @epic-1.1-subtasks @persona-sarah - PM needs comprehensive project overview
// @epic-3.2-time @persona-david - Team Lead needs task analytics and workload visibility
// @epic-2.1-files @persona-lisa - Designer needs project context and collaboration
// @epic-1.1-rbac: Project layout with unified navigation configuration
// @persona-sarah: PM needs comprehensive project navigation and management
// @persona-jennifer: Exec needs project overview and milestone tracking
// @persona-david: Team lead needs team management and reports within projects
// @persona-mike: Dev needs efficient access to tasks, timeline, and settings
// @persona-lisa: Designer needs board views and team collaboration features
function ProjectOverview() {
  const { workspaceId, projectId } = Route.useParams();
  const navigate = useNavigate();
  const { workspace } = useWorkspaceStore();
  const { project } = useProjectStore();
  const { data: projects = [] as Project[] } = useGetProjects({ workspaceId: workspace?.id ?? "" });
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isCreateMilestoneOpen, setIsCreateMilestoneOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const { hasPermission, user } = useRBACAuth();
  
  // 🔒 SECURITY: Get project-scoped permissions
  const projectPermissions = useProjectPermissions(projectId);
  
  const { data: users, isLoading: isUsersLoading, error: usersError } = useGetActiveWorkspaceUsers({ workspaceId });
  const { milestones, stats: milestoneStats, createMilestone, updateMilestone } = useMilestones(projectId);
  
  // Enhanced data queries with error handling
  const { data: projectData, isLoading: isProjectLoading, error: projectError } = useGetProject({ 
    id: projectId, 
    workspaceId 
  });
  
  // Enhanced data queries with error handling
  const { data: tasksData, isLoading: isTasksLoading, error: tasksError } = useGetTasks(projectId);

  // Enhanced task data processing (must be before hooks that depend on it)
  const columnArray = Array.isArray(tasksData)
    ? tasksData
    : tasksData && Array.isArray((tasksData as any).columns)
      ? (tasksData as any).columns
      : [];
  const allTasks = flattenTasks(columnArray.flatMap((col: any) => col.tasks));

  // Risk monitoring and auto-status updates (ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS)
  const riskData = useRiskMonitor(allTasks, projectData ? [projectData] : []);
  const { handleTaskStatusChange } = useTaskStatusMonitor();

  // Enhanced notifications
  const autoNotifications = getNotificationsFromStore();
  const projectNotifications = useMemo(() => {
    return autoNotifications
      .filter(notification => 
        notification.data.taskId && 
        allTasks.some(task => task.id === notification.data.taskId)
      )
      .slice(0, 5);
  }, [autoNotifications, allTasks]);

  // Task status change handler with auto-updates
  const handleTaskStatusUpdate = useCallback((taskId: string, newStatus: string, oldStatus: string) => {
    handleTaskStatusChange(taskId, newStatus, oldStatus, allTasks);
  }, [handleTaskStatusChange, allTasks]);

  // Calculate project statistics from real data
  const projectStats: ProjectStats = useMemo(() => {
    if (!allTasks.length) {
      return {
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        overdueTasks: 0,
        teamMembers: 0,
        daysRemaining: 0,
        velocity: 0,
        healthScore: 100,
        burnRate: 0,
        blockedTasks: 0,
        riskLevel: 'low',
        efficiency: 0,
        riskScore: 0,
      };
    }

    const now = new Date();
    const completedTasks = allTasks.filter((task: any) => task.status === 'done').length;
    const inProgressTasks = allTasks.filter((task: any) => task.status === 'in_progress').length;
    const overdueTasks = allTasks.filter((task: any) => {
        if (!task.dueDate) return false;
        return task.status !== 'done' && new Date(task.dueDate) < now;
    }).length;

    // Calculate velocity (tasks completed per week)
    const projectAge = Math.max(1, (now.getTime() - new Date(allTasks[0]?.createdAt || now).getTime()) / (1000 * 60 * 60 * 24 * 7));
    const velocity = Math.round((completedTasks / projectAge) * 10) / 10;

    // Calculate health score
    const progressRatio = completedTasks / allTasks.length;
    const overdueRatio = overdueTasks / allTasks.length;
    const healthScore = Math.max(0, Math.min(100, Math.round((progressRatio * 0.6 - overdueRatio * 0.4) * 100 + 40)));

    // Calculate burn rate
    const burnRate = allTasks.length > 0 ? Math.round((completedTasks / allTasks.length) * 100) : 0;

    // Calculate blocked tasks (tasks with dependencies not met)
    const blockedTasks = allTasks.filter((task: any) => 
      task.status === 'todo' && task.dependencies && task.dependencies.length > 0
    ).length;

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (overdueRatio > 0.3 || healthScore < 30) riskLevel = 'critical';
    else if (overdueRatio > 0.15 || healthScore < 60) riskLevel = 'high';
    else if (overdueRatio > 0.05 || healthScore < 80) riskLevel = 'medium';

    // Calculate efficiency
    const efficiency = velocity > 0 ? Math.min(100, Math.round(velocity * 20)) : 0;
    
    // Add risk integration
    const riskScore = riskData.data?.overallRiskScore || 0;
    
    // Adjust health score based on risk
    let adjustedHealthScore = healthScore;
    if (riskLevel === 'critical') adjustedHealthScore = Math.min(adjustedHealthScore, 30);
    else if (riskLevel === 'high') adjustedHealthScore = Math.min(adjustedHealthScore, 50);
    else if (riskLevel === 'medium') adjustedHealthScore = Math.min(adjustedHealthScore, 70);
    
    return {
      totalTasks: allTasks.length,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      teamMembers: new Set(allTasks.map((task: any) => task.assigneeId).filter(Boolean)).size,
      daysRemaining: 0,
      velocity,
      healthScore: adjustedHealthScore,
      burnRate,
      blockedTasks,
      riskLevel,
      efficiency,
      riskScore,
    };
  }, [allTasks, riskData]);

  // Get recent tasks (last 5 updated)
  const recentTasks: TaskItem[] = useMemo(() => {
    if (!allTasks.length) return [];
    return allTasks
      .slice()
      .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5)
      .map((task: any) => {
        const assigneeName = users?.find((u: any) => u.userEmail === task.userEmail)?.userName;
        return {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status as TaskItem['status'],
        priority: task.priority as TaskItem['priority'] || 'medium',
          assignee: assigneeName || task.userEmail || 'Unassigned',
        dueDate: task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date',
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        };
      });
  }, [allTasks, users]);

  // Enhanced team members with productivity metrics
  const teamMembers: TeamMember[] = useMemo(() => {
    if (!allTasks.length) return [];
    const memberMap = new Map();
    allTasks.forEach((task: any) => {
      if (task.userEmail) {
        const memberEmail = task.userEmail;
        const user = users?.find((u: any) => u.userEmail === memberEmail);
        const memberName = user?.userName || memberEmail;
        if (!memberMap.has(memberEmail)) {
          memberMap.set(memberEmail, {
            id: memberEmail,
            name: memberName,
            email: memberEmail,
            activeTasks: 0,
            completedTasks: 0,
            role: 'Team Member',
            productivity: 0,
          });
        }
        const member = memberMap.get(memberEmail);
        if (task.status !== 'done') {
          member.activeTasks++;
        } else {
          member.completedTasks++;
        }
      }
    });
    
    return Array.from(memberMap.values()).map((member: any) => ({
      ...member,
      productivity: member.activeTasks + member.completedTasks > 0 
        ? Math.round((member.completedTasks / (member.activeTasks + member.completedTasks)) * 100)
        : 0
    })).slice(0, 4);
  }, [allTasks, users]);

  // Real-time activity feed - clean version with actual data
  const recentActivity: ActivityItem[] = useMemo(() => {
    if (!allTasks.length || !teamMembers.length) return [];
    
    // Generate activity from recent task updates
    return allTasks
      .slice()
      .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 3)
      .map((task: any) => ({
        id: task.id,
        type: task.status === 'done' ? 'task_completed' : 'task_created' as ActivityItem['type'],
        title: task.status === 'done' ? 'Task Completed' : 'Task Updated',
        description: task.title,
        user: teamMembers.find(m => m.email === task.userEmail)?.name || 'Team Member',
        timestamp: new Date(task.updatedAt).toLocaleTimeString(),
        priority: task.priority || 'medium' as ActivityItem['priority'],
        icon: task.status === 'done' ? '✅' : '📝'
      }));
  }, [allTasks, teamMembers]);

  // Smart alerts system
  const smartAlerts: SmartAlert[] = useMemo(() => {
    const alerts: SmartAlert[] = [];
    
    // Only show alerts if there are actual issues
    if (projectStats.healthScore < 50) {
      alerts.push({
        id: 'health-critical',
        type: 'danger',
        priority: 'critical',
        title: 'Project Health Critical',
        message: `Health score is ${projectStats.healthScore}%. Consider reassigning resources or extending deadlines.`,
        timestamp: 'now',
        actionable: true,
        actions: [
          { label: 'View Analytics', action: 'analytics' },
          { label: 'Reassign Tasks', action: 'reassign' }
        ]
      });
    }

    if (projectStats.velocity < 1 && projectStats.totalTasks > 0) {
      alerts.push({
        id: 'velocity-low',
        type: 'warning',
        priority: 'high',
        title: 'Low Team Velocity',
        message: `Current velocity is ${projectStats.velocity} tasks/week. Consider reviewing blockers.`,
        timestamp: '5 mins ago',
        actionable: true,
        actions: [
          { label: 'Check Blockers', action: 'blockers' },
          { label: 'Team Meeting', action: 'meeting' }
        ]
      });
    }

    if (projectStats.overdueTasks > 0) {
      alerts.push({
        id: 'overdue-tasks',
        type: 'warning',
        priority: 'medium',
        title: 'Overdue Tasks',
        message: `${projectStats.overdueTasks} tasks are overdue. Review priorities and deadlines.`,
        timestamp: '1 hour ago',
        actionable: true,
        actions: [
          { label: 'View Overdue', action: 'overdue' },
          { label: 'Reschedule', action: 'reschedule' }
        ]
      });
    }

    return alerts.sort((a: SmartAlert, b: SmartAlert) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }, [projectStats]);

  // 🔒 SECURITY CHECK: Verify project belongs to workspace (after data loads)
  // NOTE: This must be a hook, called before any conditional returns
  useEffect(() => {
    if (projectData && projectData.workspaceId !== workspaceId) {
      console.error('🚨 SECURITY: Project/workspace mismatch detected', {
        projectId,
        expectedWorkspace: workspaceId,
        actualWorkspace: projectData.workspaceId,
        user: user?.email
      });
      
      toast.error("Security Error: Invalid project access");
      navigate({ to: "/dashboard" });
    }
  }, [projectData, workspaceId, projectId, navigate, user]);

  // 🔒 SECURITY CHECK 3: Verify workspace membership
  useEffect(() => {
    if (workspace && workspace.id !== workspaceId) {
      console.error('🚨 SECURITY: Workspace mismatch detected', {
        expectedWorkspace: workspaceId,
        actualWorkspace: workspace.id,
        user: user?.email
      });
      
      toast.error("Access Denied: Invalid workspace");
      navigate({ to: "/dashboard" });
    }
  }, [workspace, workspaceId, navigate, user]);

  // Loading state
  if (isProjectLoading || isTasksLoading) {
    return (
      <LazyDashboardLayout loadingComponent="stats">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatsCardSkeleton key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartSkeleton />
            <TableSkeleton />
          </div>
        </div>
      </LazyDashboardLayout>
    );
  }

  // Complete handler implementations
  const handleShareProject = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Project link copied to clipboard");
  };

  const handleShareByEmail = () => {
    const subject = encodeURIComponent(`Project: ${projectData?.name || 'Unnamed Project'}`);
    const body = encodeURIComponent(`Check out this project: ${window.location.href}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const handleInviteTeamMembers = () => {
    setIsInviteModalOpen(true);
  };

  const handleExportProject = async () => {
    // 🔒 SECURITY: Use secure backend export endpoint with audit logging
    try {
      toast.loading("Preparing export...", { id: "export-loading" });
      
      const response = await fetch(
        `${API_URL}/api/projects/${projectId}/export?workspaceId=${workspaceId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Include cookies for authentication
          body: JSON.stringify({
            format: 'json', // Can be 'json', 'csv', or 'markdown'
            includeMilestones: true,
            includeTeam: true,
            includeComments: false,
            includeAttachments: false,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Export failed');
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `${projectData?.name || 'project'}-export.json`;

      // Download the file
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      toast.success("Project exported successfully", { id: "export-loading" });
      
      // 📊 SECURITY: Export is now logged in audit trail with:
      // - User email and role
      // - IP address
      // - Export format and options
      // - Timestamp and duration
      
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error.message || "Failed to export project", { id: "export-loading" });
    }
  };

  const handleArchiveProject = async () => {
    // 🔒 SECURITY: Confirm archive action before proceeding
    const confirmed = window.confirm(
      `Are you sure you want to archive "${projectData?.name}"?\n\n` +
      `This will:\n` +
      `• Hide the project from active project lists\n` +
      `• Prevent new tasks from being created\n` +
      `• Keep all data intact for future restoration\n\n` +
      `You can restore the project later from the archived projects view.`
    );

    if (!confirmed) {
      return;
    }

    try {
      toast.loading("Archiving project...", { id: "archive-loading" });

      const response = await fetch(
        `${API_URL}/api/projects/${projectId}/archive?workspaceId=${workspaceId}`,
        {
          method: 'PATCH',
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to archive project');
      }

      const result = await response.json();

      toast.success(result.message || "Project archived successfully", { id: "archive-loading" });

      // Redirect to workspace after short delay
      setTimeout(() => {
        navigate({ to: `/dashboard/workspace/${workspaceId}` });
      }, 1500);

      // 📊 SECURITY: Archive is now logged in audit trail with:
      // - User email and role
      // - IP address
      // - Project name and status
      // - Timestamp and duration

    } catch (error) {
      console.error('Archive error:', error);
      toast.error(error.message || "Failed to archive project", { id: "archive-loading" });
    }
  };

  const handleDeleteProject = async () => {
    // 🔒 SECURITY: Multi-step confirmation for destructive action
    const projectName = projectData?.name || 'this project';
    
    // Step 1: Initial confirmation
    const initialConfirm = window.confirm(
      `⚠️ WARNING: You are about to DELETE "${projectName}"\n\n` +
      `This will PERMANENTLY delete:\n` +
      `• The project and all its settings\n` +
      `• All tasks and subtasks\n` +
      `• All milestones and deadlines\n` +
      `• All project members and permissions\n` +
      `• All attachments and files\n\n` +
      `THIS CANNOT BE UNDONE!\n\n` +
      `Are you absolutely sure you want to continue?`
    );

    if (!initialConfirm) {
      return;
    }

    // Step 2: Type project name confirmation
    const typedName = window.prompt(
      `⚠️ FINAL CONFIRMATION\n\n` +
      `To confirm deletion, please type the project name exactly:\n\n` +
      `"${projectName}"\n\n` +
      `Type the project name to confirm:`
    );

    if (typedName !== projectName) {
      if (typedName !== null) { // Only show error if user didn't cancel
        toast.error("Project name didn't match. Deletion cancelled.");
      }
      return;
    }

    try {
      toast.loading("Deleting project...", { id: "delete-loading" });

      const response = await fetch(
        `${API_URL}/api/projects/${projectId}?workspaceId=${workspaceId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete project');
      }

      const result = await response.json();

      toast.success(
        result.message || "Project deleted successfully",
        { id: "delete-loading", duration: 3000 }
      );

      // Show deletion summary
      if (result.deletionSummary) {
        console.log('🗑️ Deletion Summary:', result.deletionSummary);
        toast.info(
          `Deleted: ${result.deletionSummary.tasksDeleted} tasks, ` +
          `${result.deletionSummary.milestonesDeleted} milestones, ` +
          `${result.deletionSummary.membersRemoved} members`,
          { duration: 5000 }
        );
      }

      // Redirect to workspace after short delay
      setTimeout(() => {
        navigate({ to: `/dashboard/workspace/${workspaceId}` });
      }, 2000);

      // 📊 SECURITY: Deletion is logged in audit trail with CRITICAL severity
      // - User email and role
      // - IP address
      // - Full deletion summary
      // - Timestamp and duration
      // - Project metadata for recovery/audit

    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error.message || "Failed to delete project", { id: "delete-loading" });
    }
  };

  const handleCreateTask = () => {
    setIsCreateTaskOpen(true);
  };

  const handleCreateMilestone = () => {
    setIsCreateMilestoneOpen(true);
  };

  // Enhanced smart alert action handlers
  const handleAlertAction = (action: string, alertId?: string) => {switch (action) {
      case 'analytics':
        setIsDashboardOpen(true);
        toast.success("Opening analytics dashboard");
        break;
      case 'reassign':
        navigate({ 
          to: '/dashboard/workspace/$workspaceId/project/$projectId/list',
          params: { workspaceId, projectId }
        });
        toast.info("Navigate to task list to reassign tasks");
        break;
      case 'blockers':
        navigate({ 
          to: '/dashboard/workspace/$workspaceId/project/$projectId/board',
          params: { workspaceId, projectId }
        });
        toast.info("Navigating to kanban board");
        break;
      case 'meeting':
        navigate({ 
          to: '/dashboard/workspace/$workspaceId/project/$projectId/calendar',
          params: { workspaceId, projectId }
        });
        toast.info("Opening calendar for meeting scheduling");
        break;
      case 'overdue':
        navigate({ 
          to: '/dashboard/workspace/$workspaceId/project/$projectId/list',
          params: { workspaceId, projectId }
        });
        toast.info("Navigating to task list");
        break;
      case 'reschedule':
        navigate({ 
          to: '/dashboard/workspace/$workspaceId/project/$projectId/list',
          params: { workspaceId, projectId }
        });
        toast.info("Navigate to task list to reschedule overdue tasks");
        break;
      default:
        toast.info(`Action: ${action}`);
    }
  };

  // Calculate progress percentage
  const progressPercentage = projectStats.totalTasks > 0 
    ? Math.round((projectStats.completedTasks / projectStats.totalTasks) * 100)
    : 0;

  // Get health score color
  const getHealthColor = (score: number) => {
    if (score >= 80) return healthColors.excellent;
    if (score >= 60) return healthColors.good;
    if (score >= 40) return healthColors.warning;
    return healthColors.critical;
  };

  // Get velocity trend
  const getVelocityTrend = (velocity: number) => {
    if (velocity >= 2) return { icon: TrendingUp, color: 'text-green-500' };
    if (velocity >= 1) return { icon: TrendingUp, color: 'text-blue-500' };
    return { icon: TrendingDown, color: 'text-red-500' };
  };

  // Risk Alert Component
  const ProjectRiskAlerts = () => {
    if (!riskData.hasHighRisk) return null;

    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-500" />
        <AlertTitle className="text-red-700">Project Risks Detected</AlertTitle>
        <AlertDescription className="text-red-600">
          <div className="space-y-2 mt-2">
            {riskData.highPriorityRisks.slice(0, 2).map((risk) => (
              <div key={risk.id} className="text-sm">
                <strong>{risk.title}:</strong> {risk.description}
              </div>
            ))}
            {riskData.highPriorityRisks.length > 2 && (
              <div className="text-sm">
                ...and {riskData.highPriorityRisks.length - 2} more risks
              </div>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  };

  // 🔒 SECURITY CHECK 1: Permission check (conditional rendering, not early return)
  if (!projectPermissions.canView) {
    return (
      <LazyDashboardLayout>
        <div className="flex items-center justify-center min-h-[600px] p-6">
          <Card className="max-w-md border-red-200 dark:border-red-800 shadow-lg">
            <CardHeader>
              <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-3">
                <ShieldAlert className="h-6 w-6" />
                Access Denied
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  You do not have permission to view this project.
                </p>
                <p className="text-sm text-muted-foreground">
                  Current role: <span className="font-medium text-foreground">{user?.role || 'guest'}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-4">
                  Project ID: <code className="bg-muted px-1 py-0.5 rounded">{projectId}</code>
                </p>
              </div>
              
              <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
                  If you believe you should have access to this project, please contact your workspace administrator or project manager.
                </AlertDescription>
              </Alert>
              
              <div className="flex flex-col gap-2 pt-2">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate({ to: "/dashboard" })}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Return to Dashboard
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => window.history.back()}
                >
                  Go Back
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </LazyDashboardLayout>
    );
  }

  // Enhanced error handling (conditional rendering, not early return)
  if (projectError || tasksError || usersError) {
    return (
      <LazyDashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <h3 className="text-lg font-semibold">Failed to load project data</h3>
            <p className="text-muted-foreground">Please refresh the page or try again later.</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Page
            </Button>
          </div>
        </div>
      </LazyDashboardLayout>
    );
  }

  return (
    <LazyDashboardLayout>
      <div className="flex-1 space-y-8 p-8 bg-gradient-to-br from-background to-muted/20">
        {/* Enhanced Header Section */}
        <div className="relative">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                  <FileText className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-foreground">
                    {projectData?.name || 'Project Overview'}
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    {projectData?.description || 'Monitor your project progress and team performance'}
                  </p>
                </div>
              </div>
              
              {/* Project Status Badge */}
              <div className="flex items-center space-x-3">
                <Badge 
                  variant="outline" 
                  className="px-3 py-1 text-sm font-medium border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
                >
                  <div className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                  Active Project
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Last updated {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              {/* 🔒 Analytics button - visible to all who can view */}
              {projectPermissions.canViewAnalytics && (
                <Button variant="outline" size="sm" onClick={() => setIsDashboardOpen(true)}>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Analytics
                </Button>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {/* 🔒 Share - requires manage or edit permission */}
                  {(projectPermissions.canManage || projectPermissions.canEdit) && (
                    <DropdownMenuItem onClick={handleShareProject}>
                      <Share className="mr-2 h-4 w-4" />
                      Share Project
                    </DropdownMenuItem>
                  )}
                  
                  {/* 🔒 Export - requires view permission (basic) */}
                  {projectPermissions.canView && (
                    <DropdownMenuItem onClick={handleExportProject}>
                      <Download className="mr-2 h-4 w-4" />
                      Export Data
                    </DropdownMenuItem>
                  )}
                  
                  {/* 🔒 Settings - requires manage permission */}
                  {projectPermissions.canManage && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate({ to: `/dashboard/workspace/${workspaceId}/project/${projectId}/settings` })}>
                        <Settings className="mr-2 h-4 w-4" />
                        Project Settings
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  {/* 🔒 Invite - requires manage team permission */}
                  {projectPermissions.canManageTeam && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setIsInviteModalOpen(true)}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Invite Members
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  {/* 🔒 Archive - requires archive permission */}
                  {projectPermissions.canArchive && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleArchiveProject}>
                        <Archive className="mr-2 h-4 w-4" />
                        Archive Project
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  {/* 🔒 Delete - requires delete permission (most restricted) */}
                  {projectPermissions.canDelete && (
                    <DropdownMenuItem 
                      onClick={handleDeleteProject}
                      className="text-red-600 dark:text-red-400 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950/20"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Project
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* 🔒 Create Task - requires create tasks permission */}
              {projectPermissions.canCreateTasks && (
                <Button onClick={() => setIsCreateTaskOpen(true)} className="shadow-lg">
                  <Plus className="mr-2 h-4 w-4" />
                  New Task
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/25">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Tasks</p>
                  <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{projectStats.totalTasks}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    {projectStats.inProgressTasks} in progress
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/50 dark:to-green-900/25">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">Completed</p>
                  <p className="text-3xl font-bold text-green-900 dark:text-green-100">{projectStats.completedTasks}</p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    {Math.round((projectStats.completedTasks / Math.max(projectStats.totalTasks, 1)) * 100)}% completion rate
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Target className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/50 dark:to-orange-900/25">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Team Members</p>
                  <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">{projectStats.teamMembers}</p>
                  <p className="text-xs text-orange-600 dark:text-orange-400">
                    {users?.length || 0} active users
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/50 dark:to-purple-900/25">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Health Score</p>
                  <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">{projectStats.healthScore}%</p>
                  <p className="text-xs text-purple-600 dark:text-purple-400">
                    {projectStats.healthScore >= 80 ? 'Excellent' : projectStats.healthScore >= 60 ? 'Good' : 'Needs attention'}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Gauge className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Risk Alerts & Smart Notifications */}
        {projectNotifications.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Smart Alerts
              <Badge variant="secondary" className="text-xs">
                {projectNotifications.length} active
              </Badge>
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {projectNotifications.slice(0, 4).map((notification) => (
                <Alert key={notification.id} className="border-0 shadow-md">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {notification.title.includes('🚨') ? (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      ) : (
                        <Info className="h-4 w-4 text-blue-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <AlertTitle className="text-sm font-medium">{notification.title}</AlertTitle>
                      <AlertDescription className="text-xs text-muted-foreground mt-1">
                        {notification.message}
                      </AlertDescription>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {notification.priority}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(notification.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          </div>
        )}

        {/* Two-Column Layout for Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-8">
          {/* Left Column - Milestones & Progress (4/7 width) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Enhanced Milestone Dashboard */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <Target className="h-4 w-4 text-white" />
                  </div>
                  Project Milestones
                  {milestones.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {milestones.length} total
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MilestoneDashboard
                  projectId={projectId}
                  showProjectFilter={false}
                  milestones={milestones}
                  stats={milestoneStats}
                  onMilestoneClick={(milestone) => {}}
                  onEditMilestone={(milestone) => {
                    setIsCreateMilestoneOpen(true);
                  }}
                />
              </CardContent>
            </Card>

            {/* Enhanced Project Progress Visualization */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Progress Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Overall Completion</span>
                    <span className="text-sm text-muted-foreground">
                      {projectStats.completedTasks} of {projectStats.totalTasks} tasks
                    </span>
                  </div>
                  <Progress 
                    value={Math.round((projectStats.completedTasks / Math.max(projectStats.totalTasks, 1)) * 100)} 
                    className="h-3 rounded-full"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{projectStats.velocity}</div>
                    <div className="text-xs text-muted-foreground">Tasks/Week</div>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{projectStats.efficiency}%</div>
                    <div className="text-xs text-muted-foreground">Efficiency</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Right Column - Team & Quick Actions (3/7 width) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Enhanced Team Overview */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  Team Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {users && users.length > 0 ? (
                  users.slice(0, 5).map((user) => {
                    const userTasks = allTasks.filter((task: any) => task.userEmail === user.userEmail);
                    const completedTasks = userTasks.filter((task: any) => task.status === 'done').length;
                    const workloadPercentage = userTasks.length > 0 ? Math.round((completedTasks / userTasks.length) * 100) : 0;
                    
                    return (
                      <div key={user.userEmail} className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                        <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                          <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-medium text-white">
                            {user.userName?.split(' ').map(n => n[0]).join('') || '?'}
                          </div>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.userName}</p>
                          <p className="text-xs text-muted-foreground">
                            {userTasks.length} tasks • {workloadPercentage}% complete
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <span className="text-xs font-medium text-green-700 dark:text-green-300">
                              {completedTasks}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No team members found</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3"
                      onClick={() => setIsInviteModalOpen(true)}
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Invite Team
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions Card - 🔒 Permission-gated */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-600" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* 🔒 Create Task - requires canCreateTasks */}
                {projectPermissions.canCreateTasks && (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start h-12"
                    onClick={() => setIsCreateTaskOpen(true)}
                  >
                    <Plus className="mr-3 h-4 w-4" />
                    Create New Task
                  </Button>
                )}
                
                {/* 🔒 Add Milestone - requires canEdit or canManage */}
                {(projectPermissions.canEdit || projectPermissions.canManage) && (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start h-12"
                    onClick={() => setIsCreateMilestoneOpen(true)}
                  >
                    <Target className="mr-3 h-4 w-4" />
                    Add Milestone
                  </Button>
                )}
                
                {/* 🔒 Invite Member - requires canManageTeam or canInviteMembers */}
                {(projectPermissions.canManageTeam || projectPermissions.canInviteMembers) && (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start h-12"
                    onClick={() => setIsInviteModalOpen(true)}
                  >
                    <UserPlus className="mr-3 h-4 w-4" />
                    Invite Member
                  </Button>
                )}
                
                {/* 🔒 View Analytics - requires canViewAnalytics */}
                {projectPermissions.canViewAnalytics && (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start h-12"
                    onClick={() => setIsDashboardOpen(true)}
                  >
                    <BarChart3 className="mr-3 h-4 w-4" />
                    View Analytics
                  </Button>
                )}
                
                {/* Show message if no actions available */}
                {!projectPermissions.canCreateTasks && 
                 !projectPermissions.canEdit && 
                 !projectPermissions.canManage && 
                 !projectPermissions.canManageTeam &&
                 !projectPermissions.canViewAnalytics && (
                  <div className="text-center py-4 text-muted-foreground">
                    <Lock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No actions available for your role</p>
                    <p className="text-xs mt-1">Contact project manager for access</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Modals */}
        <CreateTaskModal
          open={isCreateTaskOpen}
          onClose={() => setIsCreateTaskOpen(false)}
          projectContext={project}
          hideProjectSelection={true}
          filterOptions={{
            projects: projects,
          }}
        />

        <CreateMilestoneModal
          open={isCreateMilestoneOpen}
          onClose={() => {
            setIsCreateMilestoneOpen(false);
          }}
          projectId={projectId}
          projectName={projectData?.name}
          onMilestoneCreated={(milestone) => {
            createMilestone({
              ...milestone,
              projectId: projectId,
            });
            setIsCreateMilestoneOpen(false);
          }}
        />

        <DashboardPopup
          open={isDashboardOpen}
          onClose={() => setIsDashboardOpen(false)}
          variant="full"
          projectId={projectId}
          projectName={projectData?.name}
          realProjectStats={projectStats}
          realTasks={allTasks}
          realTeamMembers={teamMembers}
        />

        <InviteTeamMemberModal
          open={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          workspaceId={workspaceId}
        />

      </div>
    </LazyDashboardLayout>
  );
}

export default ProjectOverview;