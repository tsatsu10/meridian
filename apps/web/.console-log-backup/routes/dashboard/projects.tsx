"use client";

import { useState, useMemo, useRef, Suspense, lazy, memo } from "react";
import { API_URL } from "@/constants/urls";
import { ProjectsPageSkeleton } from "@/components/ui/loading-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  FolderOpen,
  Plus,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Zap,
  Award,
  RefreshCw,
  Activity,
  Target,
  Archive
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import DashboardHeader from "@/components/dashboard/dashboard-header";
import { useRBACAuth } from "@/lib/permissions";
import useWorkspaceStore from "@/store/workspace";
import LazyDashboardLayout from "@/components/performance/lazy-dashboard-layout";
import CreateProjectModal from "@/components/shared/modals/create-project-modal";
import useGetProjects from "@/hooks/queries/project/use-get-projects";
import useDeleteProject from "@/hooks/mutations/project/use-delete-project";
import useProjectSocket from "@/hooks/use-project-socket";
import ProjectFiltersAccessible from "@/components/dashboard/project-filters-accessible";
import { useFilterStore } from "@/store/project-filters";
import { BulkSelectAllCheckbox, useBulkKeyboardShortcuts } from "@/components/dashboard/bulk-select-checkbox";
import { BulkActionToolbar } from "@/components/dashboard/bulk-action-toolbar";
import { useBulkOperations } from "@/hooks/use-bulk-operations-api";
import { EnhancedProjectCard } from "@/components/dashboard/enhanced-project-card";
import { ViewToggle, ViewMode } from "@/components/projects/view-toggle";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useProjectFavorites } from "@/hooks/use-project-favorites";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { EnhancedProjectGridCard } from "@/components/projects/enhanced-project-grid-card";
import { ProjectListView } from "@/components/projects/project-list-view";

// Wrapper component using EnhancedProjectCard
const ProjectCard = ({ project, onAction }: { 
  project: any; 
  onAction: (action: string, project: any) => void 
}) => {
  return <EnhancedProjectCard project={project} onAction={onAction} />;
};

// Projects Dashboard Component  
function ProjectsPage() {
  const { hasPermission } = useRBACAuth();
  const { workspace } = useWorkspaceStore();
  const navigate = useNavigate();
  const deleteProjectMutation = useDeleteProject();

  // Initialize bulk operations
  const { bulkUpdate, bulkDelete, bulkExport } = useBulkOperations();
  useBulkKeyboardShortcuts();

  // Get filter state from Zustand store
  const {
    status,
    priority,
    owner,
    teamMembers: selectedTeamMembers,
    searchQuery,
    sortBy,
    sortOrder,
  } = useFilterStore();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  
  // Archive filter state
  const [showArchived, setShowArchived] = useState(false);

  // View mode state with database persistence
  const { 
    projectsViewMode, 
    updateProjectsViewMode,
    isLoading: preferencesLoading 
  } = useUserPreferences();
  
  const viewMode = projectsViewMode as ViewMode;

  // Save view preference to database
  const handleViewChange = (mode: ViewMode) => {
    updateProjectsViewMode(mode);
  };

  // Permissions check (MUST be before keyboard shortcuts)
  const canCreateProjects = hasPermission("canCreateProjects");
  const canViewAnalytics = hasPermission("canViewAnalytics");

  // Favorites/Pinning
  const { pinnedProjects, togglePin, isPinned, sortWithPinned } = useProjectFavorites();

  // Search ref for keyboard shortcut
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Create project modal state (MUST be before keyboard shortcuts)
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);

  // Create project handler (MUST be before keyboard shortcuts)
  const handleCreateProject = () => {
    if (!canCreateProjects) {
      toast.error("You don't have permission to create projects");
      return;
    }
    setIsCreateProjectOpen(true);
  };

  // Keyboard shortcuts
  const keyboardShortcuts = useMemo(() => {
    const shortcuts = [];
    
    if (canCreateProjects) {
      shortcuts.push({
        key: 'n',
        ctrl: true,
        callback: handleCreateProject,
        description: 'Create new project'
      });
    }
    
    shortcuts.push({
      key: 'k',
      ctrl: true,
      callback: () => searchInputRef.current?.focus(),
      description: 'Focus search'
    });
    
    return shortcuts;
  }, [canCreateProjects]);
  
  useKeyboardShortcuts(keyboardShortcuts);

  // Debug workspace// Initialize WebSocket connection for real-time updates
  useProjectSocket(workspace?.id);

  // Fetch projects for display (with pagination)
  const { data: projectsData, isLoading, error, refetch } = useGetProjects({
    workspaceId: workspace?.id || "",
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
    archivedOnly: showArchived
  });

  // Fetch ALL projects for accurate stats (separate query)
  // Always exclude archived from stats
  const { data: allProjectsData } = useGetProjects({
    workspaceId: workspace?.id || "",
    // No limit/offset = get all projects
    archivedOnly: false
  });

  // Extract projects and pagination from response
  const projects = useMemo(() => {
    if (!projectsData) return [];
    // Handle paginated response
    if (typeof projectsData === 'object' && 'projects' in projectsData) {
      return projectsData.projects || [];
    }
    // Handle non-paginated response (array)
    return Array.isArray(projectsData) ? projectsData : [];
  }, [projectsData]);

  const pagination = useMemo(() => {
    if (typeof projectsData === 'object' && 'pagination' in projectsData) {
      return projectsData.pagination;
    }
    return null;
  }, [projectsData]);

  // Get all projects array for stats
  const allProjects = useMemo(() => {
    if (!allProjectsData) return [];
    if (typeof allProjectsData === 'object' && 'projects' in allProjectsData) {
      return allProjectsData.projects || [];
    }
    return Array.isArray(allProjectsData) ? allProjectsData : [];
  }, [allProjectsData]);

  // Force refresh function
  const handleRefreshProjects = async () => {
    await refetch();
  };

  // Apply filters to projects
  const filteredProjects = useMemo(() => {
    if (!projects || !Array.isArray(projects)) return [];
    
    let filtered: any[] = [...projects];

    // Apply status filter
    if (status && status.length > 0) {
      filtered = filtered.filter((p: any) => status.includes(p.status));
    }

    // Apply priority filter
    if (priority && priority.length > 0) {
      filtered = filtered.filter((p: any) => priority.includes(p.priority));
    }

    // Apply owner filter
    if (owner && owner.length > 0) {
      filtered = filtered.filter((p: any) => owner.includes(p.ownerId));
    }

    // Apply team members filter
    if (selectedTeamMembers && selectedTeamMembers.length > 0) {
      filtered = filtered.filter((p: any) =>
        p.members?.some((m: any) => selectedTeamMembers.includes(m.id))
      );
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((p: any) =>
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered = filtered.sort((a: any, b: any) => {
      let aVal, bVal;

      switch (sortBy) {
        case "name":
          aVal = a.name;
          bVal = b.name;
          break;
        case "status":
          aVal = a.status;
          bVal = b.status;
          break;
        case "priority":
          aVal = a.priority;
          bVal = b.priority;
          break;
        case "progress":
          aVal = a.progress || 0;
          bVal = b.progress || 0;
          break;
        case "dueDate":
          aVal = new Date(a.dueDate).getTime();
          bVal = new Date(b.dueDate).getTime();
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    // Sort with pinned projects first
    return sortWithPinned(filtered);
  }, [projects, status, priority, owner, selectedTeamMembers, searchQuery, sortBy, sortOrder, sortWithPinned]);

  // Analytics data - Use ALL projects for accurate stats
  const totalProjects = allProjects.length;
  
  // Debug: Check actual status values
  console.log('📊 Project statuses:', allProjects.map(p => ({ name: p.name, status: p.status })));
  
  // Flexible status matching (handles "active", "in-progress", "in_progress", etc.)
  const activeProjects = allProjects.filter((p: any) => {
    const status = p.status?.toLowerCase();
    return status === "active" || status === "in-progress" || status === "in_progress" || status === "ongoing";
  }).length;
  
  const completedProjects = allProjects.filter((p: any) => {
    const status = p.status?.toLowerCase();
    return status === "completed" || status === "done" || status === "finished";
  }).length;
  
  // Calculate average progress from tasks
  const avgProgress = totalProjects > 0 ? Math.round(
    allProjects.reduce((sum: number, p: any) => {
      const tasks = p.tasks || [];
      const completed = tasks.filter((t: any) => {
        const taskStatus = t.status?.toLowerCase();
        return taskStatus === "completed" || taskStatus === "done";
      }).length;
      const total = tasks.length;
      return sum + (total > 0 ? (completed / total) * 100 : 0);
    }, 0) / totalProjects
  ) : 0;

  const handleProjectAction = async (action: string, project: any) => {
    if (!workspace?.id) {
      toast.error("No workspace selected");
      return;
    }

    try {
      switch (action) {
        case 'view':
          navigate({
            to: '/dashboard/workspace/$workspaceId/project/$projectId',
            params: { 
              workspaceId: workspace.id, 
              projectId: project.id 
            }
          });
          toast.success(`Navigating to ${project.name} overview...`);
          break;
        
        case 'tasks':
          navigate({
            to: '/dashboard/workspace/$workspaceId/project/$projectId/list',
            params: { 
              workspaceId: workspace.id, 
              projectId: project.id 
            }
          });
          toast.success(`Navigating to project tasks...`);
          break;
        
        case 'board':
          navigate({
            to: '/dashboard/workspace/$workspaceId/project/$projectId/board',
            params: { 
              workspaceId: workspace.id, 
              projectId: project.id 
            }
          });
          break;
        
        case 'settings':
          navigate({
            to: '/dashboard/workspace/$workspaceId/project/$projectId/settings',
            params: { 
              workspaceId: workspace.id, 
              projectId: project.id 
            }
          });
          toast.success(`Opening ${project.name} settings...`);
          break;
        
        case 'team':
          navigate({
            to: '/dashboard/workspace/$workspaceId/project/$projectId/teams',
            params: { 
              workspaceId: workspace.id, 
              projectId: project.id 
            }
          });
          break;
        
        case 'analytics':
          navigate({
            to: '/dashboard/workspace/$workspaceId/project/$projectId/analytics',
            params: { 
              workspaceId: workspace.id, 
              projectId: project.id 
            }
          });
          break;
        
        case 'archive':
          // Confirm before archiving
          if (window.confirm(`Archive project "${project.name}"?\n\nArchived projects are hidden from the main view but can be restored later.`)) {
            try {
              const response = await fetch(`${API_URL}/api/projects/${project.id}/archive`, {
                method: 'POST',
                credentials: 'include',
              });
              
              if (!response.ok) {
                throw new Error('Failed to archive project');
              }
              
              const result = await response.json();
              toast.success(result.message || `Project "${project.name}" archived successfully`);
              
              // Refresh projects list
              refetch();
            } catch (error) {
              console.error('Archive error:', error);
              toast.error(`Failed to archive project: ${error.message}`);
            }
          }
          break;
        
        case 'duplicate':
          toast.info(`Duplicate functionality for "${project.name}" coming soon!`);
          break;
        
        default:
          toast.info(`${action} functionality coming soon!`);
      }
    } catch (error) {
      console.error('Navigation error:', error);
      toast.error('Failed to navigate to project');
    }
  };

  // Edit Project Handler
  const handleEditProject = (project: any) => {
    if (!workspace?.id) {
      toast.error("No workspace selected");
      return;
    }
    
    // Navigate to project settings
    try {
      navigate({
        to: '/dashboard/workspace/$workspaceId/project/$projectId/settings',
        params: { 
          workspaceId: workspace.id, 
          projectId: project.id 
        }
      });
      toast.success(`Editing ${project.name}...`);
    } catch (error) {
      console.error('Edit navigation error:', error);
      toast.error('Failed to open project settings');
    }
  };

  // Share Link Handler
  const handleShareProject = async (project: any) => {
    try {
      const shareUrl = `${window.location.origin}/dashboard/workspace/${workspace?.id}/project/${project.id}`;
      
      // Try to use the Clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
        toast.success(`Share link copied to clipboard!`, {
          description: `Anyone with access can view ${project.name}`,
        });
      } else {
        // Fallback for non-secure contexts
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          toast.success(`Share link copied to clipboard!`, {
            description: `Anyone with access can view ${project.name}`,
          });
        } catch (err) {
          toast.error("Failed to copy link", {
            description: shareUrl,
          });
        }
        document.body.removeChild(textArea);
      }
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to copy share link');
    }
  };

  // Delete Project Handler
  const handleDeleteProject = async (project: any) => {
    // Use a confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete "${project.name}"?\n\nThis will permanently delete:\n• All project tasks\n• All project files\n• All project data\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    // Delete the project using the mutation
    try {
      await deleteProjectMutation.mutateAsync({ 
        workspaceId: workspace.id,
        projectId: project.id 
      });
      toast.success(`${project.name} deleted successfully`);
      refetch(); // Refresh project list
    } catch (error) {
      toast.error(`Failed to delete ${project.name}`, {
        description: error instanceof Error ? error.message : 'An error occurred'
      });
    }
  };

  // Restore Project Handler
  const handleRestoreProject = async (project: any) => {
    try {
      const response = await fetch(`${API_URL}/api/projects/${project.id}/restore`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to restore project');
      }
      
      const result = await response.json();
      toast.success(result.message || `Project "${project.name}" restored successfully`);
      
      // Refresh projects list
      refetch();
    } catch (error) {
      console.error('Restore error:', error);
      toast.error(`Failed to restore project: ${error.message}`);
    }
  };

  if (!workspace) {
    return (
      <LazyDashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <FolderOpen className="h-16 w-16 text-muted-foreground mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">No Workspace Selected</h3>
              <p className="text-muted-foreground">Please select a workspace to view projects</p>
            </div>
          </div>
        </div>
      </LazyDashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <LazyDashboardLayout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 bg-muted rounded glass-card"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-64 bg-muted rounded glass-card"></div>
              ))}
            </div>
          </div>
        </div>
      </LazyDashboardLayout>
    );
  }

  if (error) {
    return (
      <LazyDashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">Error Loading Projects</h3>
              <p className="text-muted-foreground">{error.message}</p>
            </div>
          </div>
        </div>
      </LazyDashboardLayout>
    );
  }

  return (
    <LazyDashboardLayout loadingComponent="chart" enablePerformanceMode>
      {/* Dashboard Header */}
      <DashboardHeader
        title="Projects"
        subtitle={`${totalProjects} projects in ${workspace.name} • ${filteredProjects.length} showing`}
        variant="default"
      >
        <div className="flex items-center space-x-2 flex-wrap">
          {/* View Toggle */}
          <ViewToggle view={viewMode} onViewChange={handleViewChange} />
          
          {/* Archive Toggle */}
          <Button
            variant={showArchived ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setShowArchived(!showArchived);
              setCurrentPage(1); // Reset to first page when toggling
            }}
            className="gap-2"
          >
            <Archive className="h-4 w-4" />
            {showArchived ? "Show Active" : "Show Archived"}
          </Button>

          {/* Bulk Select All Checkbox */}
          <BulkSelectAllCheckbox 
            totalProjects={filteredProjects.length}
          />

          {/* New Advanced Filters Component */}
          <ProjectFiltersAccessible
            projects={projects || []}
            owners={projects?.map((p: any) => ({ id: p.ownerId, name: p.ownerName })).filter((v: any, i: number, a: any) => a.findIndex((t: any) => t.id === v.id) === i) || []}
            teamMembers={projects?.flatMap((p: any) => p.members || []).filter((v: any, i: number, a: any) => a.findIndex((t: any) => t.id === v.id) === i) || []}
            onFiltersChange={() => {}}
          />
          
          <Button onClick={handleRefreshProjects} variant="outline" className="glass-card">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>

          {canCreateProjects && (
            <Button onClick={handleCreateProject} className="glass-card">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          )}
        </div>
      </DashboardHeader>

      <div className="space-y-6">
        {/* Overview Cards */}
        {canViewAnalytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="glass-card border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Projects</p>
                    <p className="text-2xl font-bold text-foreground">{totalProjects}</p>
                    <p className="text-xs text-blue-500 flex items-center mt-1">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {totalProjects > 0 ? "Active workspace" : "No projects yet"}
                    </p>
                  </div>
                  <FolderOpen className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-card border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Projects</p>
                    <p className="text-2xl font-bold text-foreground">{activeProjects}</p>
                    <p className="text-xs text-green-500 flex items-center mt-1">
                      <Zap className="h-3 w-3 mr-1" />
                      {activeProjects > 0 ? "In progress" : "None active"}
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-card border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Progress</p>
                    <p className="text-2xl font-bold text-foreground">{avgProgress}%</p>
                    <p className="text-xs text-purple-500 flex items-center mt-1">
                      <Award className="h-3 w-3 mr-1" />
                      {avgProgress > 70 ? "Good progress" : "Needs attention"}
                    </p>
                  </div>
                  <Target className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-card border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold text-foreground">{completedProjects}</p>
                    <p className="text-xs text-orange-500 flex items-center mt-1">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {completedProjects > 0 ? "Projects finished" : "None completed"}
                    </p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Projects Views */}
        {viewMode === "grid" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredProjects.map((project, index) => (
                <EnhancedProjectGridCard
                key={project.id}
                  project={project}
                  index={index}
                  isPinned={isPinned(project.id)}
                  onProjectClick={(p) => handleProjectAction('view', p)}
                  onTogglePin={togglePin}
                  onDuplicate={(p) => handleProjectAction('duplicate', p)}
                  onArchive={(p) => handleProjectAction('archive', p)}
                  onEdit={handleEditProject}
                  onShare={handleShareProject}
                  onSettings={(p) => handleProjectAction('settings', p)}
                  onDelete={handleDeleteProject}
                  onRestore={handleRestoreProject}
                />
            ))}
          </AnimatePresence>
        </div>
        )}

        {viewMode === "list" && (
          <ProjectListView
            projects={filteredProjects}
            onProjectClick={(p) => handleProjectAction('view', p)}
            pinnedProjects={pinnedProjects}
            onTogglePin={togglePin}
            onDuplicate={(p) => handleProjectAction('duplicate', p)}
            onArchive={(p) => handleProjectAction('archive', p)}
            onEdit={handleEditProject}
            onShare={handleShareProject}
            onSettings={(p) => handleProjectAction('settings', p)}
            onDelete={handleDeleteProject}
            onRestore={handleRestoreProject}
          />
        )}

        {viewMode === "board" && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Board view coming soon!</p>
          </div>
        )}

        {/* Empty State */}
        {filteredProjects.length === 0 && !isLoading && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <FolderOpen className="h-16 w-16 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">No Projects Found</h3>
                <p className="text-muted-foreground">
                  {projects && projects.length === 0
                    ? "Create your first project to get started" 
                    : "No projects match your filters"
                  }
                </p>
              </div>
              {canCreateProjects && (!projects || projects.length === 0) && (
                <Button onClick={handleCreateProject} className="glass-card">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Project
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Pagination Controls */}
        {pagination && pagination.total >= 0 && filteredProjects.length > 0 && (
          <div className="mt-8 border-t pt-6">
            <div className="flex items-center gap-4">
              {/* Page Size Selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Show:</span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => {
                    setPageSize(parseInt(value));
                    setCurrentPage(1); // Reset to first page when changing size
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">6</SelectItem>
                    <SelectItem value="12">12</SelectItem>
                    <SelectItem value="24">24</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Count and Pagination */}
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, pagination.total)} of {pagination.total}
              </div>
              
              <div className="ml-auto">
                {pagination.pages > 1 ? (
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage > 1) {
                              setCurrentPage(currentPage - 1);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }
                          }}
                          className={cn(
                            currentPage === 1 && "pointer-events-none opacity-50"
                          )}
                        />
                      </PaginationItem>

                      {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                        let pageNum;
                        if (pagination.pages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= pagination.pages - 2) {
                          pageNum = pagination.pages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <PaginationItem key={i}>
                            {(pageNum === 1 && currentPage > 3 && pagination.pages > 5) ||
                            (pageNum === pagination.pages && currentPage < pagination.pages - 2 && pagination.pages > 5) ? (
                              <PaginationEllipsis />
                            ) : (
                              <PaginationLink
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setCurrentPage(pageNum as number);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                isActive={currentPage === pageNum}
                              >
                                {pageNum}
                              </PaginationLink>
                            )}
                          </PaginationItem>
                        );
                      })}

                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage < pagination.pages) {
                              setCurrentPage(currentPage + 1);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }
                          }}
                          className={cn(
                            currentPage === pagination.pages && "pointer-events-none opacity-50"
                          )}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {Math.max(1, pagination.pages)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Action Toolbar */}
      <BulkActionToolbar
        onBulkUpdate={async (ids, updates) => {
          try {
            await bulkUpdate.mutateAsync({
              projectIds: ids,
              updates,
            });
          } catch (error) {
            console.error("Bulk update failed:", error);
          }
        }}
        onBulkDelete={async (ids) => {
          try {
            await bulkDelete.mutateAsync({
              projectIds: ids,
            });
          } catch (error) {
            console.error("Bulk delete failed:", error);
          }
        }}
        onBulkExport={(ids) => {
          try {
            bulkExport(ids);
          } catch (error) {
            console.error("Bulk export failed:", error);
          }
        }}
      />

      {/* Create Project Modal */}
      <CreateProjectModal 
        open={isCreateProjectOpen} 
        onClose={() => setIsCreateProjectOpen(false)}
      />
    </LazyDashboardLayout>
  );
}

export const Route = createFileRoute("/dashboard/projects")({
  component: ProjectsPage,
}); 