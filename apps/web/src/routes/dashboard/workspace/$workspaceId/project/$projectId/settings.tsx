import PageTitle from "@/components/page-title";
import { TasksImportExport } from "@/components/project/tasks-import-export";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import icons from "@/constants/project-icons";
import useDeleteProject from "@/hooks/mutations/project/use-delete-project";
import useUpdateProject from "@/hooks/mutations/project/use-update-project";
import useGetProject from "@/hooks/queries/project/use-get-project";
import useGetTasks from "@/hooks/queries/task/use-get-tasks";
import useGetWorkspaceUsers from "@/hooks/queries/workspace-users/use-get-workspace-users";
import { useWorkspacePermission } from "@/hooks/useWorkspacePermission";
import { cn } from "@/lib/cn";
import useProjectStore from "@/store/project";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { 
  AlertTriangle, 
  ArrowLeft, 
  Lock, 
  Users, 
  Settings2,
  FileText,
  Zap,
  Plus,
  MoreHorizontal,
  UserPlus,
  Shield,
  Download,
  Archive,
  Loader2,
  Trash2,
  Edit,
  Crown,
  User,
  Search,
  Filter,
  Keyboard,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import React, { createElement, useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import LazyDashboardLayout from "@/components/performance/lazy-dashboard-layout";
import UniversalHeader from "@/components/dashboard/universal-header";

const projectFormSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  slug: z.string().min(1, "Project slug is required"),
  icon: z.string().min(1, "Project icon is required"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  status: z.enum(["planning", "active", "on-hold", "completed", "archived"]).optional(),
  category: z.enum(["development", "design", "marketing", "operations", "research", "other"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  visibility: z.enum(["private", "team", "workspace"]).optional(),
  // Features
  enableSubtasks: z.boolean().optional(),
  enableDependencies: z.boolean().optional(),
  enableTimeTracking: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
});

const teamFormSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  description: z.string().max(200, "Description must be less than 200 characters").optional(),
  color: z.string().default("#3B82F6"),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;
type TeamFormValues = z.infer<typeof teamFormSchema>;

// Production data structures - using real API calls
// Use proper user roles from RBAC system
type UserRole = 
  | "workspace-manager" 
  | "department-head" 
  | "workspace-viewer"
  | "project-manager" 
  | "project-viewer"
  | "team-lead"
  | "member"
  | "client" 
  | "contractor"
  | "stakeholder"
  | "guest";

interface TeamMember {
  id: string;
  userEmail: string;
  userName: string;
  role: UserRole;
  avatar?: string;
  joinedAt: string;
}

interface ProjectTeam {
  id: string;
  name: string;
  description?: string;
  color: string;
  members: TeamMember[];
  createdAt: string;
  leadId: string;
}

// Teams API client
// ✅ Teams API Client - Now using real backend endpoints
class TeamsAPI {
  private static baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3005";
  
  private static async request(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem("auth-token") || sessionStorage.getItem("auth-token");
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  static async getProjectTeams(projectId: string): Promise<ProjectTeam[]> {
      return await this.request(`/api/projects/${projectId}/teams`);
  }

  static async createTeam(projectId: string, team: Omit<ProjectTeam, 'id' | 'createdAt'>): Promise<ProjectTeam> {
      return await this.request(`/api/projects/${projectId}/teams`, {
        method: "POST",
        body: JSON.stringify(team),
      });
  }

  static async updateTeam(projectId: string, teamId: string, updates: Partial<ProjectTeam>): Promise<ProjectTeam> {
      return await this.request(`/api/projects/${projectId}/teams/${teamId}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
  }

  static async deleteTeam(projectId: string, teamId: string): Promise<void> {
      await this.request(`/api/projects/${projectId}/teams/${teamId}`, {
        method: "DELETE",
      });
  }

  static async addMember(projectId: string, teamId: string, member: Omit<TeamMember, 'id' | 'joinedAt'>): Promise<TeamMember> {
      return await this.request(`/api/projects/${projectId}/teams/${teamId}/members`, {
        method: "POST",
        body: JSON.stringify(member),
      });
  }

  static async removeMember(projectId: string, teamId: string, memberId: string): Promise<void> {
      await this.request(`/api/projects/${projectId}/teams/${teamId}/members/${memberId}`, {
        method: "DELETE",
      });
  }

  static async updateMemberRole(projectId: string, teamId: string, memberId: string, role: UserRole): Promise<TeamMember> {
      return await this.request(`/api/projects/${projectId}/teams/${teamId}/members/${memberId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
  }
}

const projectStatuses = [
  { value: "planning", label: "Planning", color: "bg-gray-100 text-gray-800" },
  { value: "active", label: "Active", color: "bg-green-100 text-green-800" },
  { value: "on-hold", label: "On Hold", color: "bg-yellow-100 text-yellow-800" },
  { value: "completed", label: "Completed", color: "bg-blue-100 text-blue-800" },
  { value: "archived", label: "Archived", color: "bg-gray-100 text-gray-800" },
];

const teamColors = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", 
  "#06B6D4", "#84CC16", "#F97316", "#EC4899", "#6B7280"
];

export const Route = createFileRoute(
  "/dashboard/workspace/$workspaceId/project/$projectId/settings",
)({
  component: ProjectSettings,
});

function ProjectSettings() {
  const { projectId, workspaceId } = Route.useParams();
  const { data: projectData, isLoading: projectLoading } = useGetProject({ id: projectId, workspaceId });
  const { data, isLoading } = useGetTasks(projectId);
  const { data: workspaceUsers } = useGetWorkspaceUsers({ workspaceId });
  const { project, setProject } = useProjectStore();
  const { isOwner } = useWorkspacePermission();

  // Sync fetched project data with store
  useEffect(() => {
    if (projectData) {
      setProject(projectData);
    }
  }, [projectData, setProject]);
  const [confirmProjectName, setConfirmProjectName] = useState("");
  const { mutateAsync: updateProject, isPending } = useUpdateProject();
  const { mutateAsync: deleteProject, isPending: isDeleting } = useDeleteProject();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Team management state
  const [teams, setTeams] = useState<ProjectTeam[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [isEditTeamOpen, setIsEditTeamOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<ProjectTeam | null>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isChangeRoleOpen, setIsChangeRoleOpen] = useState(false);
  
  // Loading states for team operations
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [isUpdatingTeam, setIsUpdatingTeam] = useState(false);
  const [isDeletingTeam, setIsDeletingTeam] = useState<string | null>(null); // Track which team is being deleted
  const [isRemovingMember, setIsRemovingMember] = useState<string | null>(null); // Track which member is being removed
  const [isChangingRole, setIsChangingRole] = useState(false);

  // Confirmation dialog state
  const [teamToDelete, setTeamToDelete] = useState<ProjectTeam | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<{ teamId: string; member: TeamMember } | null>(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "members" | "created">("name");
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Active tab state
  const [activeTab, setActiveTab] = useState<'general' | 'teams' | 'features' | 'data' | 'danger'>('general');

  // Load teams data when component mounts or project changes
  useEffect(() => {
    if (projectId) {
      loadTeams();
    }
  }, [projectId]);

  const loadTeams = async () => {
    try {
      setTeamsLoading(true);
      const projectTeams = await TeamsAPI.getProjectTeams(projectId);
      setTeams(projectTeams);
    } catch (error) {
      console.error("Failed to load teams:", error);
      toast.error("Failed to load teams");
    } finally {
      setTeamsLoading(false);
    }
  };

  // Filtered and sorted teams
  const filteredAndSortedTeams = useMemo(() => {
    let result = [...teams];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(team =>
        team.name.toLowerCase().includes(query) ||
        team.description?.toLowerCase().includes(query) ||
        team.members.some(member => 
          member.userName.toLowerCase().includes(query) ||
          member.userEmail.toLowerCase().includes(query)
        )
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "members":
          return b.members.length - a.members.length;
        case "created":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [teams, searchQuery, sortBy]);

  // Paginated teams
  const paginatedTeams = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedTeams.slice(startIndex, endIndex);
  }, [filteredAndSortedTeams, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedTeams.length / itemsPerPage);

  // Reset to page 1 when search or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      // Cmd/Ctrl + S - Save project settings
      if (modifier && e.key === 's') {
        e.preventDefault();
        if (activeTab === 'general') {
          toast.info("Keyboard shortcut: Save (Cmd/Ctrl+S)");
        }
      }

      // Cmd/Ctrl + K - Focus search (only on teams tab)
      if (modifier && e.key === 'k') {
        e.preventDefault();
        if (activeTab === 'teams') {
          searchInputRef.current?.focus();
          toast.success("Keyboard shortcut: Search");
        }
      }

      // Cmd/Ctrl + N - New team (only on teams tab)
      if (modifier && e.key === 'n') {
        e.preventDefault();
        if (activeTab === 'teams') {
          setIsCreateTeamOpen(true);
          toast.success("Keyboard shortcut: New Team");
        }
      }

      // Cmd/Ctrl + / - Show keyboard help
      if (modifier && e.key === '/') {
        e.preventDefault();
        setShowKeyboardHelp(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  useEffect(() => {
    if (data) {
      setProject(data);
    }
  }, [data, setProject]);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: project?.name ?? "",
      slug: project?.slug ?? "",
      icon: project?.icon ?? "Layout",
      description: project?.description ?? "",
      status: "active",
      category: "development",
      priority: "medium",
      visibility: "team",
      enableSubtasks: true,
      enableDependencies: true,
      enableTimeTracking: true,
      emailNotifications: true,
    },
  });

  const teamForm = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#3B82F6",
    },
  });

  const onSubmit = async (data: ProjectFormValues) => {
    try {
      await updateProject({
        id: project?.id ?? "",
        name: data.name,
        icon: data.icon,
        slug: data.slug,
        description: data.description ?? "",
      });

      queryClient.invalidateQueries({
        queryKey: ["project", project?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["projects", project?.workspaceId],
      });

      toast.success("Project updated successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update project",
      );
    }
  };

  const handleCreateTeam = async (data: TeamFormValues) => {
    try {
      setIsCreatingTeam(true);
      const newTeam = await TeamsAPI.createTeam(projectId, {
        name: data.name,
        description: data.description,
        color: data.color,
        leadId: "current-user", // Replace with actual current user ID from auth
        members: []
      });

      setTeams(prev => [...prev, newTeam]);
      setIsCreateTeamOpen(false);
      teamForm.reset();
      toast.success(`Team "${data.name}" created successfully`);
    } catch (error) {
      console.error("Failed to create team:", error);
      toast.error("Failed to create team");
    } finally {
      setIsCreatingTeam(false);
    }
  };

  const handleEditTeam = async (data: TeamFormValues) => {
    if (!selectedTeam) return;
    
    try {
      setIsUpdatingTeam(true);
      const updatedTeam = await TeamsAPI.updateTeam(projectId, selectedTeam.id, {
        name: data.name,
        description: data.description,
        color: data.color,
      });

      setTeams(prev => prev.map(t => t.id === selectedTeam.id ? updatedTeam : t));
      setIsEditTeamOpen(false);
      setSelectedTeam(null);
      teamForm.reset();
      toast.success(`Team "${data.name}" updated successfully`);
    } catch (error) {
      console.error("Failed to update team:", error);
      toast.error("Failed to update team");
    } finally {
      setIsUpdatingTeam(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    setTeamToDelete(team);
  };

  const confirmDeleteTeam = async () => {
    if (!teamToDelete) return;

    try {
      setIsDeletingTeam(teamToDelete.id);
      await TeamsAPI.deleteTeam(projectId, teamToDelete.id);
      setTeams(prev => prev.filter(t => t.id !== teamToDelete.id));
      toast.success(`Team "${teamToDelete.name}" deleted successfully`);
      setTeamToDelete(null);
    } catch (error) {
      console.error("Failed to delete team:", error);
      toast.error("Failed to delete team");
    } finally {
      setIsDeletingTeam(null);
    }
  };

  const handleAddMember = async (teamId: string, memberData: { userEmail: string; userName: string; role: UserRole }) => {
    try {
      const newMember = await TeamsAPI.addMember(projectId, teamId, memberData);
      
      setTeams(prev => prev.map(team => 
        team.id === teamId 
          ? { ...team, members: [...team.members, newMember] }
          : team
      ));
      
      setIsAddMemberOpen(false);
      toast.success(`${memberData.userName} added to team successfully`);
    } catch (error) {
      console.error("Failed to add member:", error);
      toast.error("Failed to add member to team");
    }
  };

  const handleRemoveMember = async (teamId: string, memberId: string) => {
    const team = teams.find(t => t.id === teamId);
    const member = team?.members.find(m => m.id === memberId);
    if (!member) return;
    setMemberToRemove({ teamId, member });
  };

  const confirmRemoveMember = async () => {
    if (!memberToRemove) return;

    try {
      setIsRemovingMember(memberToRemove.member.id);
      await TeamsAPI.removeMember(projectId, memberToRemove.teamId, memberToRemove.member.id);
      
      setTeams(prev => prev.map(team => 
        team.id === memberToRemove.teamId 
          ? { ...team, members: team.members.filter(m => m.id !== memberToRemove.member.id) }
          : team
      ));
      
      toast.success(`${memberToRemove.member.userName} removed from team`);
      setMemberToRemove(null);
    } catch (error) {
      console.error("Failed to remove member:", error);
      toast.error("Failed to remove member from team");
    } finally {
      setIsRemovingMember(null);
    }
  };

  const handleChangeRole = async (teamId: string, memberId: string, newRole: UserRole) => {
    try {
      setIsChangingRole(true);
      const updatedMember = await TeamsAPI.updateMemberRole(projectId, teamId, memberId, newRole);
      
      setTeams(prev => prev.map(team => 
        team.id === teamId 
          ? { 
              ...team, 
              members: team.members.map(m => m.id === memberId ? updatedMember : m) 
            }
          : team
      ));
      
      setIsChangeRoleOpen(false);
      setSelectedMember(null);
      toast.success(`Role updated to ${newRole}`);
    } catch (error) {
      console.error("Failed to update member role:", error);
      toast.error("Failed to update member role");
    } finally {
      setIsChangingRole(false);
    }
  };

  const handleExportProject = () => {
    if (!project) return;
    
    try {
      const exportData = {
        project: {
          name: project.name,
          slug: project.slug,
          description: project.description,
          status: project.status,
          priority: project.priority,
          visibility: project.visibility,
          icon: project.icon,
        },
        teams: teams.map(team => ({
          name: team.name,
          description: team.description,
          color: team.color,
          members: team.members.map(member => ({
            userEmail: member.userEmail,
            userName: member.userName,
            role: member.role,
          }))
        })),
        settings: {
          subtasksEnabled: form.watch('enableSubtasks'),
          dependenciesEnabled: form.watch('enableDependencies'),
          timeTrackingEnabled: form.watch('enableTimeTracking'),
          emailNotifications: form.watch('emailNotifications'),
        },
        exportedAt: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project.slug}-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Project exported successfully");
    } catch (error) {
      console.error("Failed to export project:", error);
      toast.error("Failed to export project");
    }
  };

  const handleArchiveProject = () => {
    setShowArchiveConfirm(true);
  };

  const confirmArchiveProject = async () => {
    if (!project) return;
    
    try {
      await updateProject({
        workspaceId,
        projectId,
        data: {
          ...project,
          status: 'archived' as any,
        },
      });
      
      toast.success("Project archived successfully");
      setShowArchiveConfirm(false);
      // Navigate back to workspace using absolute URL
      window.location.href = `/dashboard/workspace/${workspaceId}`;
    } catch (error) {
      console.error("Failed to archive project:", error);
      toast.error("Failed to archive project");
      setShowArchiveConfirm(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;

    if (confirmProjectName !== project.name) {
      toast.error("Project name does not match");
      return;
    }

    try {
      await deleteProject({ id: project.id });

      queryClient.invalidateQueries({
        queryKey: ["project", project.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["projects", project.workspaceId],
      });

      setProject(undefined);
      toast.success("Project deleted successfully");
      // Navigate back to workspace using absolute URL
      window.location.href = `/dashboard/workspace/${project.workspaceId}`;
      setConfirmProjectName("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete project",
      );
    }
  };

  if (!isOwner) {
    return (
      <LazyDashboardLayout>
        <div className="flex-1 p-6">
          <PageTitle title="Project Settings" />
          <div className="mt-6 max-w-2xl mx-auto">
            <div className="bg-white dark:bg-zinc-800/50 rounded-lg p-8 shadow-sm border border-zinc-200 dark:border-zinc-700/50 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Lock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Permission Required
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400 mb-6 max-w-md mx-auto">
                Only workspace owners can modify project settings. Please contact
                the workspace owner if you need to make changes.
              </p>
              <Button
                variant="outline"
                onClick={() =>
                  navigate({
                    to: "/dashboard/workspace/$workspaceId/project/$projectId/board",
                    params: {
                      workspaceId: project?.workspaceId ?? "",
                      projectId: project?.id ?? "",
                    },
                  })
                }
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Project
              </Button>
            </div>
          </div>
        </div>
      </LazyDashboardLayout>
    );
  }

  if (projectLoading || isLoading) {
    return (
      <LazyDashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-zinc-500 dark:text-zinc-400">Loading settings...</div>
        </div>
      </LazyDashboardLayout>
    );
  }

  if (!project) {
    return (
      <LazyDashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">Project not found</div>
        </div>
      </LazyDashboardLayout>
    );
  }

  return (
    <LazyDashboardLayout>
      <UniversalHeader 
        title="Project Settings"
        subtitle="Configure project preferences, teams, and integrations"
        variant="default"
        customActions={
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => setShowKeyboardHelp(true)} title="Keyboard Shortcuts (Cmd+/)">
              <Keyboard className="h-4 w-4 mr-2" />
              Shortcuts
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportProject}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={handleArchiveProject} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Archive className="h-4 w-4 mr-2" />}
              {isPending ? "Archiving..." : "Archive"}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate({
                to: "/dashboard/workspace/$workspaceId/project/$projectId",
                params: {
                  workspaceId: workspaceId,
                  projectId: projectId,
                },
              })}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Project
            </Button>
          </div>
        }
      />
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            
            {/* Settings Navigation Tabs */}
            <div className="flex space-x-1 mb-8 bg-white dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
              {[
                { id: 'general', label: 'General', icon: Settings2 },
                { id: 'teams', label: 'Teams', icon: Users },
                { id: 'features', label: 'Features', icon: Zap },
                { id: 'data', label: 'Data', icon: FileText },
                { id: 'danger', label: 'Danger Zone', icon: AlertTriangle },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    activeTab === tab.id
                      ? "bg-blue-600 text-white"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="space-y-6">
              
              {/* General Settings Tab */}
              {activeTab === 'general' && project && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings2 className="w-5 h-5" />
                      General Information
                    </CardTitle>
                    <CardDescription>
                      Basic project information and metadata.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Project Name</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="slug"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Project Slug</FormLabel>
                                <FormControl>
                                  <Input {...field} className="font-mono" maxLength={10} />
                                </FormControl>
                                <FormDescription>
                                  Short identifier used in URLs
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea 
                                  {...field} 
                                  placeholder="Describe your project's goals and objectives..."
                                  className="min-h-[100px]"
                                />
                              </FormControl>
                              <FormDescription>
                                {field.value?.length ?? 0}/500 characters
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Status</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {projectStatuses.map((status) => (
                                      <SelectItem key={status.value} value={status.value}>
                                        {status.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="priority"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Priority</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select priority" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem key="low" value="low">Low</SelectItem>
                                    <SelectItem key="medium" value="medium">Medium</SelectItem>
                                    <SelectItem key="high" value="high">High</SelectItem>
                                    <SelectItem key="urgent" value="urgent">Urgent</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="visibility"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Visibility</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select visibility" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem key="private" value="private">Private</SelectItem>
                                    <SelectItem key="team" value="team">Team</SelectItem>
                                    <SelectItem key="workspace" value="workspace">Workspace</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="icon"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Project Icon</FormLabel>
                              <FormControl>
                                <div className="grid grid-cols-8 gap-2 max-h-[200px] overflow-y-auto p-2 border rounded-lg">
                                  {Object.entries(icons).map(([name, Icon]) => (
                                    <button
                                      key={name}
                                      type="button"
                                      onClick={() => field.onChange(name)}
                                      className={cn(
                                        "p-2 rounded-lg transition-colors flex items-center justify-center",
                                        field.value === name
                                          ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10"
                                          : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                      )}
                                    >
                                      <Icon className="w-5 h-5" />
                                    </button>
                                  ))}
                                </div>
                              </FormControl>
                              <div className="flex items-center gap-2 mt-2">
                                {createElement(icons[field.value as keyof typeof icons], { className: "w-4 h-4" })}
                                <span className="text-sm text-zinc-500">{field.value}</span>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button type="submit" disabled={isPending}>
                          {isPending ? "Saving..." : "Save Changes"}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              )}

              {/* Teams Management Tab */}
              {activeTab === 'teams' && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            Project Teams
                          </CardTitle>
                          <CardDescription>
                            Create and manage teams for this project. Team members can be assigned to tasks.
                          </CardDescription>
                        </div>
                        <Button onClick={() => setIsCreateTeamOpen(true)} aria-label="Create new team">
                          <Plus className="w-4 h-4 mr-2" />
                          Create Team
                        </Button>
                      </div>
                      {/* Search and Sort Controls */}
                      <div className="flex gap-3 px-6 pb-4">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-4 h-4" />
                          <Input
                            ref={searchInputRef}
                            placeholder="Search teams, members..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                            aria-label="Search teams and members"
                          />
                        </div>
                        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                          <SelectTrigger className="w-[180px]" aria-label="Sort teams by">
                            <Filter className="w-4 h-4 mr-2" />
                            <SelectValue placeholder="Sort by" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem key="name" value="name">Name (A-Z)</SelectItem>
                            <SelectItem key="members" value="members">Most Members</SelectItem>
                            <SelectItem key="created" value="created">Recently Created</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {teamsLoading ? (
                          // Loading skeletons
                          <>
                            {[1, 2].map((i) => (
                              <Card key={i} className="border-l-4">
                                <CardHeader>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <Skeleton className="w-3 h-3 rounded-full" />
                                      <div className="space-y-2">
                                        <Skeleton className="h-5 w-32" />
                                        <Skeleton className="h-4 w-48" />
                                      </div>
                                      <Skeleton className="h-6 w-20" />
                                    </div>
                                    <Skeleton className="h-8 w-8" />
                                  </div>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-3">
                                    {[1, 2, 3].map((j) => (
                                      <div key={j} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex items-center gap-3">
                                          <Skeleton className="w-10 h-10 rounded-full" />
                                          <div className="space-y-2">
                                            <Skeleton className="h-4 w-32" />
                                            <Skeleton className="h-3 w-24" />
                                          </div>
                                        </div>
                                        <Skeleton className="h-8 w-8" />
                                      </div>
                                    ))}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </>
                        ) : filteredAndSortedTeams.length === 0 ? (
                          <div className="text-center py-12">
                            <Users className="w-12 h-12 mx-auto text-zinc-400 mb-4" />
                            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                              {searchQuery ? "No teams found" : "No teams yet"}
                            </h3>
                            <p className="text-zinc-500 dark:text-zinc-400 mb-4">
                              {searchQuery 
                                ? `No teams match "${searchQuery}". Try a different search term.`
                                : "Create your first team to start organizing project members."
                              }
                            </p>
                            {!searchQuery && (
                            <Button onClick={() => setIsCreateTeamOpen(true)}>
                              <Plus className="w-4 h-4 mr-2" />
                              Create Team
                            </Button>
                            )}
                          </div>
                        ) : (
                          <>
                          {paginatedTeams.map((team) => (
                            <Card key={team.id} className="border-l-4" style={{ borderLeftColor: team.color }}>
                              <CardHeader>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: team.color }}
                                    />
                                    <div>
                                      <CardTitle className="text-lg">{team.name}</CardTitle>
                                      {team.description && (
                                        <CardDescription>{team.description}</CardDescription>
                                      )}
                                    </div>
                                    <Badge variant="outline">{team.members.length} members</Badge>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" aria-label={`Team actions for ${team.name}`}>
                                        <MoreHorizontal className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setSelectedTeam(team);
                                          setIsAddMemberOpen(true);
                                        }}
                                      >
                                        <UserPlus className="w-4 h-4 mr-2" />
                                        Add Member
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setSelectedTeam(team);
                                          teamForm.reset({
                                            name: team.name,
                                            description: team.description || "",
                                            color: team.color,
                                          });
                                          setIsEditTeamOpen(true);
                                        }}
                                      >
                                        <Edit className="w-4 h-4 mr-2" />
                                        Edit Team
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleDeleteTeam(team.id)}
                                        className="text-red-600"
                                        disabled={isDeletingTeam === team.id}
                                      >
                                        {isDeletingTeam === team.id ? (
                                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</>
                                        ) : (
                                          <><Trash2 className="w-4 h-4 mr-2" />Delete Team</>
                                        )}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-3">
                                  {team.members.length === 0 ? (
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                      No members in this team yet.
                                    </p>
                                  ) : (
                                    team.members.map((member) => (
                                      <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex items-center gap-3">
                                          <Avatar className="w-8 h-8">
                                            <AvatarImage src={member.avatar} />
                                            <AvatarFallback>
                                              {member.userName.slice(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                          </Avatar>
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <span className="font-medium">{member.userName}</span>
                                              {(member.role === 'team-lead' || member.role === 'project-manager' || member.role === 'department-head' || member.role === 'workspace-manager') && (
                                                <Crown className="w-4 h-4 text-yellow-500" />
                                              )}
                                            </div>
                                            <div className="text-sm text-zinc-500">
                                              {member.userEmail} • {member.role}
                                            </div>
                                          </div>
                                        </div>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" aria-label={`Member actions for ${member.userName}`}>
                                              <MoreHorizontal className="w-4 h-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                              onClick={() => {
                                                setSelectedMember(member);
                                                setSelectedTeam(team);
                                                setIsChangeRoleOpen(true);
                                              }}
                                            >
                                              <Shield className="w-4 h-4 mr-2" />
                                              Change Role
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              onClick={() => handleRemoveMember(team.id, member.id)}
                                              className="text-red-600"
                                              disabled={isRemovingMember === member.id}
                                            >
                                              {isRemovingMember === member.id ? (
                                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Removing...</>
                                              ) : (
                                                <><Trash2 className="w-4 h-4 mr-2" />Remove from Team</>
                                              )}
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                          
                          {/* Pagination Controls */}
                          {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-4 px-2" role="navigation" aria-label="Team pagination">
                              <div className="text-sm text-zinc-500">
                                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedTeams.length)} of {filteredAndSortedTeams.length} teams
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                  disabled={currentPage === 1}
                                  aria-label="Go to previous page"
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                  Previous
                                </Button>
                                <div className="flex items-center gap-1">
                                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                    <Button
                                      key={page}
                                      variant={currentPage === page ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => setCurrentPage(page)}
                                      className="w-10"
                                      aria-label={`Go to page ${page}`}
                                      aria-current={currentPage === page ? "page" : undefined}
                                    >
                                      {page}
                                    </Button>
                                  ))}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                  disabled={currentPage === totalPages}
                                  aria-label="Go to next page"
                                >
                                  Next
                                  <ChevronRight className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Features Tab */}
              {activeTab === 'features' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5" />
                      Project Features
                    </CardTitle>
                    <CardDescription>
                      Configure advanced project features and integrations.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="enableSubtasks"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Subtasks</FormLabel>
                                  <FormDescription>
                                    Allow breaking down tasks into smaller items
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="enableDependencies"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Task Dependencies</FormLabel>
                                  <FormDescription>
                                    Set dependencies between tasks
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="enableTimeTracking"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Time Tracking</FormLabel>
                                  <FormDescription>
                                    Track time spent on tasks
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="emailNotifications"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Email Notifications</FormLabel>
                                  <FormDescription>
                                    Send updates via email
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </Form>
                  </CardContent>
                </Card>
              )}

              {/* Data Management Tab */}
              {activeTab === 'data' && project && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Data Management
                    </CardTitle>
                    <CardDescription>
                      Export and import project data.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TasksImportExport project={project} />
                  </CardContent>
                </Card>
              )}

              {/* Danger Zone Tab */}
              {activeTab === 'danger' && project && (
                <Card className="border-red-200 dark:border-red-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                      <AlertTriangle className="w-5 h-5" />
                      Danger Zone
                    </CardTitle>
                    <CardDescription>
                      Permanently delete your project. This action cannot be undone.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg">
                        <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-3">
                          <AlertTriangle className="w-5 h-5" />
                          <p className="font-medium">Warning: This action cannot be undone</p>
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-sm text-red-600/90 dark:text-red-400/90">
                          <li>All tasks will be permanently deleted</li>
                          <li>All task history will be removed</li>
                          <li>All teams and member assignments will be lost</li>
                          <li>Project settings will be erased</li>
                        </ul>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Type "{project.name}" to confirm deletion
                        </label>
                        <div className="flex gap-3">
                          <Input
                            value={confirmProjectName}
                            onChange={(e) => setConfirmProjectName(e.target.value)}
                            placeholder={project.name}
                          />
                          <Button
                            onClick={handleDeleteProject}
                            disabled={confirmProjectName !== project.name || isDeleting}
                            variant="destructive"
                          >
                            {isDeleting ? "Deleting..." : "Delete Project"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Team Modal */}
      <Dialog open={isCreateTeamOpen} onOpenChange={setIsCreateTeamOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
            <DialogDescription>
              Create a new team for this project. You can add members after creation.
            </DialogDescription>
          </DialogHeader>
          <Form {...teamForm}>
            <form onSubmit={teamForm.handleSubmit(handleCreateTeam)} className="space-y-4">
              <FormField
                control={teamForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Frontend Development" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={teamForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Describe the team's responsibilities..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={teamForm.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Color</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        {teamColors.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => field.onChange(color)}
                            className={cn(
                              "w-8 h-8 rounded-full border-2 transition-all",
                              field.value === color 
                                ? "border-zinc-400 scale-110" 
                                : "border-zinc-200 hover:scale-105"
                            )}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateTeamOpen(false)} disabled={isCreatingTeam}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreatingTeam}>
                  {isCreatingTeam && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isCreatingTeam ? "Creating..." : "Create Team"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Team Modal */}
      <Dialog open={isEditTeamOpen} onOpenChange={setIsEditTeamOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
            <DialogDescription>
              Update the team name, description, and color.
            </DialogDescription>
          </DialogHeader>
          <Form {...teamForm}>
            <form onSubmit={teamForm.handleSubmit(handleEditTeam)} className="space-y-4">
              <FormField
                control={teamForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Frontend Development" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={teamForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Describe the team's responsibilities..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={teamForm.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Color</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        {teamColors.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => field.onChange(color)}
                            className={cn(
                              "w-8 h-8 rounded-full border-2 transition-all",
                              field.value === color 
                                ? "border-zinc-400 scale-110" 
                                : "border-zinc-200 hover:scale-105"
                            )}
                            style={{ backgroundColor: color }}
                            aria-label={`Select ${color} color`}
                          />
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditTeamOpen(false)} disabled={isUpdatingTeam}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isUpdatingTeam}>
                  {isUpdatingTeam && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isUpdatingTeam ? "Updating..." : "Update Team"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Member Modal */}
      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Add a workspace member to the "{selectedTeam?.name}" team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Member</label>
              <Select onValueChange={(value) => {
                const user = workspaceUsers?.find((u: any) => u.userEmail === value);
                if (user && selectedTeam) {
                  handleAddMember(selectedTeam.id, {
                    userEmail: user.userEmail!,
                    userName: user.userName!,
                    role: 'member'
                  });
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a team member" />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    if (!workspaceUsers || workspaceUsers.length === 0) {
                      return <div className="p-2 text-sm text-zinc-500">No users available</div>;
                    }
                    
                    const availableUsers = workspaceUsers.filter((user: any) => 
                      !selectedTeam?.members.some(member => member.userEmail === user.userEmail)
                    );
                    
                    if (availableUsers.length === 0) {
                      return <div className="p-2 text-sm text-zinc-500">All users are already in this team</div>;
                    }
                    
                    return availableUsers.map((user: any) => (
                      <SelectItem key={user.userEmail} value={user.userEmail}>
                        {user.userName} ({user.userEmail})
                      </SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Role Modal */}
      <Dialog open={isChangeRoleOpen} onOpenChange={setIsChangeRoleOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Change Member Role</DialogTitle>
            <DialogDescription>
              Change the role for {selectedMember?.userName} in "{selectedTeam?.name}" team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select New Role</label>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {[
                  { 
                    value: 'workspace-manager', 
                    label: 'Workspace Manager', 
                    description: 'Full workspace control with all permissions',
                    icon: Crown,
                    level: 7,
                    category: 'workspace'
                  },
                  { 
                    value: 'department-head', 
                    label: 'Department Head', 
                    description: 'Manages department teams and projects',
                    icon: Crown,
                    level: 6,
                    category: 'workspace'
                  },
                  { 
                    value: 'project-manager', 
                    label: 'Project Manager', 
                    description: 'Full control over assigned projects',
                    icon: Crown,
                    level: 4,
                    category: 'project'
                  },
                  { 
                    value: 'team-lead', 
                    label: 'Team Lead', 
                    description: 'Leads and manages team members',
                    icon: Crown,
                    level: 2,
                    category: 'team'
                  },
                  { 
                    value: 'member', 
                    label: 'Member', 
                    description: 'Standard team member with task access',
                    icon: User,
                    level: 1,
                    category: 'team'
                  },
                  { 
                    value: 'project-viewer', 
                    label: 'Project Viewer', 
                    description: 'Read-only access to project information',
                    icon: User,
                    level: 3,
                    category: 'project'
                  },
                  { 
                    value: 'workspace-viewer', 
                    label: 'Workspace Viewer', 
                    description: 'Read-only access to workspace',
                    icon: User,
                    level: 5,
                    category: 'workspace'
                  },
                  { 
                    value: 'client', 
                    label: 'Client', 
                    description: 'External client with limited access',
                    icon: User,
                    level: 1,
                    category: 'external'
                  },
                  { 
                    value: 'contractor', 
                    label: 'Contractor', 
                    description: 'External contractor with specific permissions',
                    icon: User,
                    level: 1,
                    category: 'external'
                  },
                  { 
                    value: 'stakeholder', 
                    label: 'Stakeholder', 
                    description: 'Project stakeholder with review access',
                    icon: User,
                    level: 1,
                    category: 'external'
                  },
                  { 
                    value: 'guest', 
                    label: 'Guest', 
                    description: 'Temporary access for specific tasks',
                    icon: User,
                    level: 0,
                    category: 'external'
                  }
                ].map((role) => (
                  <button
                    key={role.value}
                    onClick={() => {
                      if (selectedTeam && selectedMember) {
                        handleChangeRole(selectedTeam.id, selectedMember.id, role.value as UserRole);
                      }
                    }}
                    disabled={isChangingRole}
                    className={cn(
                      "w-full p-3 border rounded-lg text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                      selectedMember?.role === role.value && "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <role.icon className={cn(
                          "w-5 h-5",
                          role.level >= 6 ? "text-purple-500" :
                          role.level >= 4 ? "text-blue-500" :
                          role.level >= 2 ? "text-green-500" :
                          "text-zinc-500"
                        )} />
                        <Badge variant="outline" className="text-xs">
                          {role.category}
                        </Badge>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{role.label}</div>
                        <div className="text-sm text-zinc-500 dark:text-zinc-400">{role.description}</div>
                        <div className="text-xs text-zinc-400 mt-1">Level {role.level}</div>
                      </div>
                      {selectedMember?.role === role.value && (
                        <Badge variant="default" className="ml-auto">Current</Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsChangeRoleOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team Deletion Confirmation */}
      <AlertDialog open={!!teamToDelete} onOpenChange={(open) => !open && setTeamToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{teamToDelete?.name}"? This action cannot be undone and will remove all team data including {teamToDelete?.members.length || 0} member(s).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingTeam === teamToDelete?.id}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTeam}
              disabled={isDeletingTeam === teamToDelete?.id}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeletingTeam === teamToDelete?.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isDeletingTeam === teamToDelete?.id ? "Deleting..." : "Delete Team"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Member Removal Confirmation */}
      <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {memberToRemove?.member.userName} from the team? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemovingMember === memberToRemove?.member.id}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveMember}
              disabled={isRemovingMember === memberToRemove?.member.id}
              className="bg-red-600 hover:bg-red-700"
            >
              {isRemovingMember === memberToRemove?.member.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isRemovingMember === memberToRemove?.member.id ? "Removing..." : "Remove Member"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Project Archive Confirmation */}
      <AlertDialog open={showArchiveConfirm} onOpenChange={setShowArchiveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive "{project?.name}"? Archived projects can be restored later, but will be hidden from active project lists.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmArchiveProject}
              disabled={isPending}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? "Archiving..." : "Archive Project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Keyboard Shortcuts Help */}
      <Dialog open={showKeyboardHelp} onOpenChange={setShowKeyboardHelp}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="w-5 h-5" />
              Keyboard Shortcuts
            </DialogTitle>
            <DialogDescription>
              Use these shortcuts to navigate and perform actions quickly
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-zinc-900 dark:text-zinc-100">General</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800">
                  <span className="text-sm">Save project settings</span>
                  <kbd className="px-2 py-1 text-xs font-semibold text-zinc-800 bg-zinc-100 border border-zinc-200 rounded dark:bg-zinc-700 dark:text-zinc-100 dark:border-zinc-600">
                    {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'} + S
                  </kbd>
                </div>
                <div className="flex items-center justify-between p-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800">
                  <span className="text-sm">Show shortcuts</span>
                  <kbd className="px-2 py-1 text-xs font-semibold text-zinc-800 bg-zinc-100 border border-zinc-200 rounded dark:bg-zinc-700 dark:text-zinc-100 dark:border-zinc-600">
                    {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'} + /
                  </kbd>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="font-medium text-sm text-zinc-900 dark:text-zinc-100">Teams Tab</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800">
                  <span className="text-sm">Focus search</span>
                  <kbd className="px-2 py-1 text-xs font-semibold text-zinc-800 bg-zinc-100 border border-zinc-200 rounded dark:bg-zinc-700 dark:text-zinc-100 dark:border-zinc-600">
                    {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'} + K
                  </kbd>
                </div>
                <div className="flex items-center justify-between p-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800">
                  <span className="text-sm">Create new team</span>
                  <kbd className="px-2 py-1 text-xs font-semibold text-zinc-800 bg-zinc-100 border border-zinc-200 rounded dark:bg-zinc-700 dark:text-zinc-100 dark:border-zinc-600">
                    {navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl'} + N
                  </kbd>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowKeyboardHelp(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LazyDashboardLayout>
  );
}

export default ProjectSettings; 