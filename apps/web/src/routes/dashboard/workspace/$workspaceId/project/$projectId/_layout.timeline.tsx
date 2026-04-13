import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
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
} from "@/components/ui/dropdown-menu";
import useProjectStore from "@/store/project";
import useGetProject from "@/hooks/queries/project/use-get-project";
import useGetTasks from "@/hooks/queries/task/use-get-tasks";
import useCreateTask from "@/hooks/mutations/task/use-create-task";
import useUpdateTask from "@/hooks/mutations/task/use-update-task";
import useDeleteTask from "@/hooks/mutations/task/use-delete-task";
import CreateTaskModal from "@/components/shared/modals/create-task-modal";
import GanttChart from "@/components/gantt-chart";
import DependencyGraph from "@/components/dependency-graph";
import { 
  Calendar, 
  Plus, 
  Filter,
  ChevronLeft,
  ChevronRight,
  Settings,
  GitBranch,
  Clock,
  Flag,
  Edit,
  Trash2,
  Target,
  CheckCircle2,
  MoreVertical,
  Download,
  Share,
  Zap,
  Eye,
  AlertCircle,
  TrendingUp,
  Users,
  BarChart3,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { flattenTasks } from "@/utils/task-hierarchy";
import { useMilestones } from "@/hooks/use-milestones";
import DashboardPopup from "@/components/dashboard/dashboard-popup";
import LazyDashboardLayout from "@/components/performance/lazy-dashboard-layout";
import RoadmapView from "@/components/roadmap-view";
import ChronologicalView from "@/components/chronological-view";
import TimelineErrorBoundary from "@/components/timeline-error-boundary";

export const Route = createFileRoute(
  "/dashboard/workspace/$workspaceId/project/$projectId/_layout/timeline"
)({
  component: ProjectTimeline,
});

interface MilestoneTask {
  id: string;
  title: string;
  date: string;
  status: "upcoming" | "achieved" | "missed";
  description: string;
  type: "milestone";
  dependencies: string[]; // Task IDs that must complete before this milestone
  milestoneType: "phase_completion" | "deliverable" | "approval" | "deadline";
  stakeholders: string[]; // Email addresses of stakeholders to notify
  successCriteria: string;
  riskLevel: "low" | "medium" | "high" | "critical";
}

interface MilestoneFormData {
  title: string;
  date: string;
  status: "upcoming" | "achieved" | "missed";
  description: string;
  dependencies: string[];
  milestoneType: "phase_completion" | "deliverable" | "approval" | "deadline";
  stakeholders: string[];
  successCriteria: string;
  riskLevel: "low" | "medium" | "high" | "critical";
}

type TimelineView = 'gantt' | 'roadmap' | 'chronological';

const milestoneStatusColors = {
  upcoming: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  achieved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  missed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const milestoneTypeColors = {
  phase_completion: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  deliverable: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  approval: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  deadline: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const riskLevelColors = {
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

// @epic-1.2-dependencies @persona-sarah - PM needs timeline view with milestones
// @epic-3.2-time @persona-david - Team Lead needs visual task dependencies
// @epic-2.1-files @persona-lisa - Designer needs project timeline context
function ProjectTimeline() {
  const { workspaceId, projectId } = Route.useParams();
  const { project } = useProjectStore();
  const { mutate: createTask } = useCreateTask();
  const { mutate: updateTask } = useUpdateTask();
  const { mutate: deleteTask } = useDeleteTask(projectId);

  // Fetch real project and task data
  const { data: projectData, isLoading: isProjectLoading, error: projectError } = useGetProject({ 
    id: projectId, 
    workspaceId 
  });
  const { data: tasksData, isLoading: isTasksLoading, error: tasksError } = useGetTasks(projectId);
  
  // State management
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [timelineView, setTimelineView] = useState<'gantt' | 'roadmap' | 'chronological'>('gantt');
  const [showDependencyGraph, setShowDependencyGraph] = useState(false);
  
  // Get real milestone data
  const { milestones: realMilestones, createMilestone, updateMilestone, deleteMilestone: deleteMilestoneFromStore } = useMilestones(projectId);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<MilestoneTask | null>(null);
  const [formData, setFormData] = useState<MilestoneFormData>({
    title: "",
    date: "",
    status: "upcoming",
    description: "",
    dependencies: [],
    milestoneType: "deliverable",
    stakeholders: [],
    successCriteria: "",
    riskLevel: "medium",
  });
  
  // Form validation errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Process real task data with memoization
  const allTasks = useMemo(() => {
    const columnArray = Array.isArray(tasksData)
      ? tasksData
      : tasksData && Array.isArray((tasksData as any).columns)
        ? (tasksData as any).columns
        : [];
    return flattenTasks(columnArray.flatMap((col: any) => col.tasks));
  }, [tasksData]);

  // Filter tasks based on current filters and search
  const filteredTasks = useMemo(() => {
    return allTasks.filter((task: any) => {
      const statusMatch = filterStatus === 'all' || task.status === filterStatus;
      const priorityMatch = filterPriority === 'all' || task.priority === filterPriority;
      
      // Search filter - check title and description
      const searchLower = searchQuery.toLowerCase().trim();
      const searchMatch = !searchQuery || 
        task.title?.toLowerCase().includes(searchLower) ||
        task.description?.toLowerCase().includes(searchLower) ||
        task.number?.toString().includes(searchQuery);
      
      return statusMatch && priorityMatch && searchMatch;
    });
  }, [allTasks, filterStatus, filterPriority, searchQuery]);

  // Filter out milestone tasks for dependency selection
  const availableTasksForDependencies = useMemo(() => {
    return filteredTasks.filter((task: any) => task.id !== editingMilestone?.id);
  }, [filteredTasks, editingMilestone?.id]);

  // Calculate project statistics with weighted progress
  const projectStats = useMemo(() => {
    if (!allTasks.length) {
      return {
        totalTasks: 0,
        inProgress: 0,
        completed: 0,
        milestones: 0,
        progress: 0,
        weightedProgress: 0
      };
    }

    const completed = allTasks.filter((task: any) => task.status === 'done').length;
    const inProgress = allTasks.filter((task: any) => task.status === 'in_progress').length;
    
    // Weighted progress based on priority
    const priorityWeights = {
      urgent: 4,
      high: 3,
      medium: 2,
      low: 1
    };
    
    let totalWeight = 0;
    let completedWeight = 0;
    
    allTasks.forEach((task: any) => {
      const weight = priorityWeights[task.priority as keyof typeof priorityWeights] || 2;
      totalWeight += weight;
      if (task.status === 'done') {
        completedWeight += weight;
      }
    });
    
    const weightedProgress = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
    
    return {
      totalTasks: allTasks.length,
      inProgress,
      completed,
      milestones: realMilestones.length,
      progress: Math.round((completed / allTasks.length) * 100),
      weightedProgress
    };
  }, [allTasks, realMilestones]);

  // Navigation handlers - now functional
  const handlePreviousPeriod = () => {
    const newDate = new Date(currentDate);
    switch (viewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() - 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1);
        break;
    }
    setCurrentDate(newDate);
  };

  const handleNextPeriod = () => {
    const newDate = new Date(currentDate);
    switch (viewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() + 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
    }
    setCurrentDate(newDate);
  };

  const handleTodayClick = () => {
    setCurrentDate(new Date());
  };

  // Filter handlers - now functional
  const handleApplyFilter = () => {
    setIsFilterOpen(false);
    toast.success(`Filters applied: ${filterStatus} status, ${filterPriority} priority`);
  };

  const handleClearFilters = () => {
    setFilterStatus('all');
    setFilterPriority('all');
    setSearchQuery('');
    toast.success('All filters cleared');
  };

  // Export functionality
  const handleExportTimeline = () => {
    try {
      // Prepare CSV data
      const csvRows = [];
      
      // CSV Headers
      csvRows.push(['Type', 'ID', 'Title', 'Status', 'Priority', 'Due Date', 'Assigned To', 'Description'].join(','));
      
      // Add tasks
      filteredTasks.forEach((task: any) => {
        const row = [
          'Task',
          task.number || task.id,
          `"${(task.title || '').replace(/"/g, '""')}"`,
          task.status || '',
          task.priority || '',
          task.dueDate || '',
          task.userEmail || '',
          `"${(task.description || '').replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(','));
      });
      
      // Add milestones
      realMilestones.forEach((milestone: any) => {
        const row = [
          'Milestone',
          milestone.id,
          `"${(milestone.title || '').replace(/"/g, '""')}"`,
          milestone.status || '',
          milestone.riskLevel || '',
          milestone.date || '',
          '',
          `"${(milestone.description || '').replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(','));
      });
      
      // Create blob and download
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `${projectData?.name || 'project'}-timeline-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Exported ${filteredTasks.length} tasks and ${realMilestones.length} milestones to CSV`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export timeline');
    }
  };

  const handleShareTimeline = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Timeline link copied to clipboard');
  };

  const handleCreateTask = () => {
    setIsCreateTaskOpen(true);
  };

  // Validate form fields
  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      errors.title = "Title is required";
    } else if (formData.title.length < 3) {
      errors.title = "Title must be at least 3 characters";
    }
    
    if (!formData.date) {
      errors.date = "Due date is required";
    } else {
      const selectedDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today && formData.status === 'upcoming') {
        errors.date = "Due date cannot be in the past for upcoming milestones";
      }
    }
    
    if (!formData.successCriteria.trim()) {
      errors.successCriteria = "Success criteria are required";
    } else if (formData.successCriteria.length < 10) {
      errors.successCriteria = "Please provide more detailed success criteria (at least 10 characters)";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // @epic-3.2-milestones: Milestone creation integrated with task system
  const handleCreateMilestone = () => {
    setEditingMilestone(null);
    setFormData({
      title: "",
      date: "",
      status: "upcoming",
      description: "",
      dependencies: [],
      milestoneType: "deliverable",
      stakeholders: [],
      successCriteria: "",
      riskLevel: "medium",
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // @epic-3.2-milestones: Milestone editing with dependency management
  const handleEditMilestone = (milestone: MilestoneTask) => {
    setEditingMilestone(milestone);
    setFormData({
      title: milestone.title,
      date: milestone.date,
      status: milestone.status,
      description: milestone.description,
      dependencies: milestone.dependencies,
      milestoneType: milestone.milestoneType,
      stakeholders: milestone.stakeholders,
      successCriteria: milestone.successCriteria,
      riskLevel: milestone.riskLevel,
    });
    setIsModalOpen(true);
  };

  // @epic-3.2-milestones: Save milestone as task with type="milestone"
  const handleSaveMilestone = async () => {
    // Validate form before saving
    if (!validateForm()) {
      toast.error("Please fix the form errors before saving");
      return;
    }

    try {
      if (editingMilestone) {
        // Update existing milestone
        updateMilestone(editingMilestone.id, formData);
        toast.success("Milestone updated successfully");
      } else {
        // Create new milestone
        createMilestone({
          ...formData,
          type: "milestone",
          projectId: projectId,
        });
        toast.success("Milestone created successfully");
      }

      setIsModalOpen(false);
      setEditingMilestone(null);
      setFormErrors({});
    } catch (error) {
      toast.error("Failed to save milestone");
    }
  };

  // @epic-3.2-milestones: Delete milestone with confirmation
  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!confirm('Are you sure you want to delete this milestone? This action cannot be undone.')) {
      return;
    }

    try {
      deleteMilestoneFromStore(milestoneId);
      if (editingMilestone?.id === milestoneId) {
        setIsModalOpen(false);
      }
      toast.success("Milestone deleted successfully");
    } catch (error) {
      toast.error("Failed to delete milestone");
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingMilestone(null);
  };

  // Check for circular dependencies
  const checkCircularDependency = (taskId: string, newDeps: string[]): boolean => {
    const visited = new Set<string>();
    const stack = [...newDeps];
    
    while (stack.length > 0) {
      const currentId = stack.pop()!;
      
      if (visited.has(currentId)) continue;
      visited.add(currentId);
      
      // If we find the milestone itself in the dependency chain, it's circular
      if (currentId === taskId) {
        return true;
      }
      
      // Check if current task has dependencies in other milestones
      const task = allTasks.find((t: any) => t.id === currentId);
      if (task && task.dependencies) {
        stack.push(...task.dependencies);
      }
      
      const milestone = realMilestones.find((m: any) => m.id === currentId);
      if (milestone && milestone.dependencies) {
        stack.push(...milestone.dependencies);
      }
    }
    
    return false;
  };

  const handleDependencyToggle = (taskId: string, checked: boolean) => {
    const newDeps = checked
      ? [...formData.dependencies, taskId]
      : formData.dependencies.filter(id => id !== taskId);
    
    // Check for circular dependencies when adding
    if (checked && editingMilestone) {
      if (checkCircularDependency(editingMilestone.id, newDeps)) {
        toast.error('Cannot add this dependency: it would create a circular dependency');
        return;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      dependencies: newDeps
    }));
  };

  const addStakeholder = (email: string) => {
    if (email.trim() && !formData.stakeholders.includes(email.trim())) {
      setFormData(prev => ({
        ...prev,
        stakeholders: [...prev.stakeholders, email.trim()]
      }));
    }
  };

  const removeStakeholder = (email: string) => {
    setFormData(prev => ({
      ...prev,
      stakeholders: prev.stakeholders.filter(s => s !== email)
    }));
  };

  // Keyboard shortcuts - defined after all handlers
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Cmd/Ctrl + K: Focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('timeline-search')?.focus();
      }
      
      // Cmd/Ctrl + N: Create new task
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setIsCreateTaskOpen(true);
      }
      
      // Cmd/Ctrl + M: Create milestone
      if ((e.metaKey || e.ctrlKey) && e.key === 'm') {
        e.preventDefault();
        handleCreateMilestone();
      }
      
      // Number keys 1-3: Switch views
      if (e.key === '1' && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        setTimelineView('gantt');
      }
      if (e.key === '2' && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        setTimelineView('roadmap');
      }
      if (e.key === '3' && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        setTimelineView('chronological');
      }
      
      // Escape: Clear search
      if (e.key === 'Escape' && searchQuery) {
        setSearchQuery('');
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [searchQuery, handleCreateMilestone]);

  // Loading state
  if (isProjectLoading || isTasksLoading) {
    return (
      <LazyDashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-zinc-500 dark:text-zinc-400">Loading timeline...</div>
        </div>
      </LazyDashboardLayout>
    );
  }

  // Error state
  if (projectError || tasksError) {
    return (
      <LazyDashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <AlertCircle className="h-12 w-12 text-orange-500" />
          <h3 className="text-lg font-semibold">Unable to load timeline</h3>
          <p className="text-muted-foreground">There was an error loading the project timeline.</p>
        </div>
      </LazyDashboardLayout>
    );
  }

  return (
    <LazyDashboardLayout>
      <div className="flex flex-col h-full bg-background">
        {/* Timeline Header */}
        <header className="flex flex-col gap-4 p-4 md:p-6 border-b border-border bg-card md:flex-row md:items-center md:justify-between" role="banner">
          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <h1 className="text-lg md:text-xl font-semibold">Project Timeline</h1>
            </div>
            
            <Badge variant="outline" className="text-xs hidden sm:inline-flex">
              {projectData?.name || 'Loading...'}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="timeline-search"
                placeholder="Search... (⌘K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full sm:w-48 md:w-64"
                aria-label="Search tasks and milestones"
                role="searchbox"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </Button>
              )}
            </div>
            
            {/* Filters Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(showFilters && "bg-muted")}
              aria-label={showFilters ? "Hide filters" : "Show filters"}
              aria-expanded={showFilters}
            >
              <Filter className="h-4 w-4 mr-2" aria-hidden="true" />
              Filters
              {(filterStatus !== 'all' || filterPriority !== 'all') && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs" aria-label={`${[filterStatus !== 'all', filterPriority !== 'all'].filter(Boolean).length} active filters`}>
                  {[filterStatus !== 'all', filterPriority !== 'all'].filter(Boolean).length}
                </Badge>
              )}
            </Button>
            
            {/* View Selector */}
            <Select value={timelineView} onValueChange={(value) => setTimelineView(value as TimelineView)}>
              <SelectTrigger className="w-full sm:w-36 md:w-40" aria-label="Timeline view selector">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gantt">Gantt Chart <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">(1)</span></SelectItem>
                <SelectItem value="roadmap">Roadmap <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">(2)</span></SelectItem>
                <SelectItem value="chronological">Chronological <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">(3)</span></SelectItem>
              </SelectContent>
            </Select>
            
            {/* Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="hidden sm:flex">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Timeline Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportTimeline}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Timeline
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShareTimeline}>
                  <Share className="h-4 w-4 mr-2" />
                  Share Timeline
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowDependencyGraph(!showDependencyGraph)}>
                  <GitBranch className="h-4 w-4 mr-2" />
                  {showDependencyGraph ? 'Hide' : 'Show'} Dependency Graph
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsCreateTaskOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button onClick={handleCreateTask} aria-label="Create new task (⌘N)">
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
              New Task
            </Button>
          </div>
        </header>
        
        {/* Active Filters Display */}
        {(filterStatus !== 'all' || filterPriority !== 'all' || searchQuery) && (
          <div className="px-6 py-3 border-b border-border bg-muted/30" role="status" aria-live="polite">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {searchQuery && (
                <Badge variant="secondary" className="gap-2">
                  <Search className="h-3 w-3" />
                  Search: "{searchQuery}"
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => setSearchQuery('')}
                  />
                </Badge>
              )}
              {filterStatus !== 'all' && (
                <Badge variant="secondary" className="gap-2">
                  Status: {filterStatus}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => setFilterStatus('all')}
                  />
                </Badge>
              )}
              {filterPriority !== 'all' && (
                <Badge variant="secondary" className="gap-2">
                  Priority: {filterPriority}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => setFilterPriority('all')}
                  />
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-6 text-xs"
              >
                Clear all
              </Button>
            </div>
          </div>
        )}
        
        {/* Timeline Content */}
        <main className="flex-1 p-6 space-y-6 overflow-hidden" role="main" aria-label="Timeline content">
          {/* Enhanced Timeline Navigation - Now Functional */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-3 md:p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={handlePreviousPeriod}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
                <h3 className="font-medium text-sm sm:text-base min-w-[150px] sm:min-w-[200px] text-center">
                  {viewMode === 'day' && currentDate.toLocaleDateString('en-US', { 
                    weekday: 'short',
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric' 
                  })}
                  {viewMode === 'week' && `Week of ${currentDate.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric' 
                  })}`}
                  {viewMode === 'month' && currentDate.toLocaleDateString('en-US', { 
                  month: 'short', 
                  year: 'numeric' 
                })}
              </h3>
                <Button variant="outline" size="sm" onClick={handleNextPeriod}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              </div>
              
              <div className="flex items-center space-x-1 bg-muted rounded-md p-1">
                {(['day', 'week', 'month'] as const).map((mode) => (
                  <Button
                    key={mode}
                    variant={viewMode === mode ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode(mode)}
                    className="px-3 py-1 text-xs"
                    aria-label={`Switch to ${mode} view`}
                    aria-pressed={viewMode === mode}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            
            <Button variant="outline" size="sm" onClick={handleTodayClick}>
              <Calendar className="mr-2 h-4 w-4" />
              Today
            </Button>
          </div>

          {/* Enhanced Project Overview Stats - Real Data */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center space-x-2">
                <GitBranch className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Total Tasks</span>
              </div>
              <div className="mt-2 text-2xl font-bold">{projectStats.totalTasks}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {filteredTasks.length !== allTasks.length && `${filteredTasks.length} filtered`}
              </p>
            </div>
            
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">In Progress</span>
              </div>
              <div className="mt-2 text-2xl font-bold">{projectStats.inProgress}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {projectStats.totalTasks > 0 && `${Math.round((projectStats.inProgress / projectStats.totalTasks) * 100)}% of total`}
              </p>
            </div>
            
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Milestones</span>
              </div>
              <div className="mt-2 text-2xl font-bold">{projectStats.milestones}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {realMilestones.filter(m => m.status === 'upcoming').length} upcoming
              </p>
            </div>
            
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">Progress</span>
                </div>
                {projectStats.weightedProgress !== projectStats.progress && (
                  <Badge variant="outline" className="text-xs">
                    Weighted: {projectStats.weightedProgress}%
                  </Badge>
                )}
              </div>
              <div className="mt-2 text-2xl font-bold">{projectStats.progress}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {projectStats.completed} of {projectStats.totalTasks} completed
              </p>
              {projectStats.weightedProgress !== projectStats.progress && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Priority-weighted progress shows higher impact of urgent/high priority tasks
                </p>
              )}
            </div>
          </div>

          {/* Dependency Graph */}
          {showDependencyGraph && (
            <div className="mb-6">
              <DependencyGraph 
                tasks={filteredTasks} 
                milestones={realMilestones}
                onClose={() => setShowDependencyGraph(false)}
              />
            </div>
          )}

          {/* Main Timeline View */}
          <div className="flex-1 min-h-0">
            {filteredTasks.length > 0 ? (
              <>
                {timelineView === 'gantt' && (
                  <TimelineErrorBoundary fallbackTitle="Gantt Chart Error" fallbackMessage="Unable to render the Gantt chart">
                    <GanttChart tasks={filteredTasks} />
                  </TimelineErrorBoundary>
                )}
                
                {timelineView === 'roadmap' && (
                  <TimelineErrorBoundary fallbackTitle="Roadmap Error" fallbackMessage="Unable to render the roadmap view">
                    <RoadmapView tasks={filteredTasks} milestones={realMilestones} />
                  </TimelineErrorBoundary>
                )}
                
                {timelineView === 'chronological' && (
                  <TimelineErrorBoundary fallbackTitle="Timeline Error" fallbackMessage="Unable to render the chronological view">
                    <ChronologicalView tasks={filteredTasks} milestones={realMilestones} />
                  </TimelineErrorBoundary>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed rounded-lg bg-muted/20">
                <div className="relative mb-4">
                  <Calendar className="h-16 w-16 text-muted-foreground/40" />
                  <Target className="h-8 w-8 text-primary absolute -bottom-1 -right-1" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {allTasks.length === 0 ? 'Your timeline awaits' : 'No tasks match your filters'}
                </h3>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                  {allTasks.length === 0 
                    ? 'Create your first task to visualize your project timeline and track progress with Gantt charts, roadmaps, and chronological views.'
                    : `Found ${allTasks.length} total tasks. Try adjusting your filters or search to see more results.`
                  }
                </p>
                <div className="flex gap-3">
                  {allTasks.length === 0 ? (
                    <>
                      <Button onClick={() => setIsCreateTaskOpen(true)} size="lg">
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Task
                      </Button>
                      <Button onClick={handleCreateMilestone} variant="outline" size="lg">
                        <Target className="h-4 w-4 mr-2" />
                        Add Milestone
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button onClick={handleClearFilters} variant="outline">
                        <X className="h-4 w-4 mr-2" />
                        Clear Filters
                      </Button>
                      <Button onClick={() => setIsCreateTaskOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Task
                      </Button>
                    </>
                  )}
                </div>
                {allTasks.length === 0 && (
                  <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                    <div className="flex items-start gap-3 text-sm">
                      <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-medium text-blue-900 dark:text-blue-100">Pro tip:</p>
                        <p className="text-blue-800 dark:text-blue-200">
                          Use the Gantt view to visualize dependencies, Roadmap for long-term planning, or Chronological for a timeline of events.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Enhanced Milestones Section - No Demo Data */}
          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center space-x-2">
                <Target className="h-5 w-5 text-orange-500" />
                <span>Project Milestones</span>
                {realMilestones.length > 0 && (
                  <Badge variant="outline" className="ml-2">
                    {realMilestones.length}
                  </Badge>
                )}
              </h3>
              <Button onClick={handleCreateMilestone} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New Milestone
              </Button>
            </div>
            
            {realMilestones.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
                {realMilestones.map((milestone: any) => (
                  <div key={milestone.id} className="border rounded-lg p-4 relative group hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Target className="h-4 w-4 text-orange-500" />
                        <Badge className={cn("text-xs", milestoneTypeColors[milestone.milestoneType])}>
                          {milestone.milestoneType.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                    <Badge className={cn("text-xs", milestoneStatusColors[milestone.status])}>
                      {milestone.status}
                    </Badge>
                        <Badge className={cn("text-xs", riskLevelColors[milestone.riskLevel])}>
                          {milestone.riskLevel}
                        </Badge>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditMilestone(milestone)}
                            className="h-6 w-6 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteMilestone(milestone.id)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <h4 className="font-medium mb-1">{milestone.title}</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      {milestone.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-blue-600">
                        {formatDate(milestone.date)}
                      </div>
                      {milestone.dependencies.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {milestone.dependencies.length} dependencies
                        </Badge>
                      )}
                    </div>
                    {milestone.successCriteria && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 inline mr-1" />
                        {milestone.successCriteria.substring(0, 60)}...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="relative mb-4">
                  <div className="h-16 w-16 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                    <Target className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center">
                    <Flag className="h-3 w-3 text-white" />
                  </div>
                </div>
                <h4 className="font-semibold mb-2">No milestones yet</h4>
                <p className="text-sm text-muted-foreground max-w-sm mb-4">
                  Milestones help you track important project deliverables, deadlines, and phase completions.
                </p>
                <Button onClick={handleCreateMilestone} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Milestone
                </Button>
              </div>
            )}
          </div>

          {/* Enhanced Milestone Creation/Editing Modal */}
          <Dialog open={isModalOpen} onOpenChange={handleModalClose}>
            <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-orange-500" />
                  <span>{editingMilestone ? 'Edit Milestone' : 'Create New Milestone'}</span>
                </DialogTitle>
                <DialogDescription>
                  {editingMilestone 
                    ? 'Update the milestone details and dependencies below.'
                    : 'Create a new milestone to track important project deliverables and deadlines.'
                  }
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Basic Information</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="flex items-center gap-1">
                        Title <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, title: e.target.value }));
                          if (formErrors.title) {
                            setFormErrors(prev => ({ ...prev, title: '' }));
                          }
                        }}
                        placeholder="Enter milestone title"
                        className={cn(formErrors.title && "border-red-500 focus-visible:ring-red-500")}
                      />
                      {formErrors.title && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {formErrors.title}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="date" className="flex items-center gap-1">
                        Due Date <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, date: e.target.value }));
                          if (formErrors.date) {
                            setFormErrors(prev => ({ ...prev, date: '' }));
                          }
                        }}
                        className={cn(formErrors.date && "border-red-500 focus-visible:ring-red-500")}
                      />
                      {formErrors.date && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {formErrors.date}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="milestoneType">Type</Label>
                      <Select value={formData.milestoneType} onValueChange={(value: any) => 
                        setFormData(prev => ({ ...prev, milestoneType: value }))
                      }>
                        <SelectTrigger>
                          <SelectValue placeholder="Select milestone type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="phase_completion">Phase Completion</SelectItem>
                          <SelectItem value="deliverable">Deliverable</SelectItem>
                          <SelectItem value="approval">Approval</SelectItem>
                          <SelectItem value="deadline">Deadline</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select value={formData.status} onValueChange={(value: any) => 
                        setFormData(prev => ({ ...prev, status: value }))
                      }>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="upcoming">Upcoming</SelectItem>
                          <SelectItem value="achieved">Achieved</SelectItem>
                          <SelectItem value="missed">Missed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter milestone description"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Success Criteria & Risk */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Success Criteria & Risk</h4>
                  
                  <div className="space-y-2">
                    <Label htmlFor="successCriteria" className="flex items-center gap-1">
                      Success Criteria <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="successCriteria"
                      value={formData.successCriteria}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, successCriteria: e.target.value }));
                        if (formErrors.successCriteria) {
                          setFormErrors(prev => ({ ...prev, successCriteria: '' }));
                        }
                      }}
                      placeholder="Define what constitutes successful completion of this milestone"
                      rows={2}
                      className={cn(formErrors.successCriteria && "border-red-500 focus-visible:ring-red-500")}
                    />
                    {formErrors.successCriteria && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {formErrors.successCriteria}
                      </p>
                    )}
                    {formData.successCriteria && !formErrors.successCriteria && (
                      <p className="text-xs text-muted-foreground">
                        {formData.successCriteria.length} characters
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="riskLevel">Risk Level</Label>
                    <Select value={formData.riskLevel} onValueChange={(value: any) => 
                      setFormData(prev => ({ ...prev, riskLevel: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Select risk level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low - Minor impact if delayed</SelectItem>
                        <SelectItem value="medium">Medium - Moderate impact if delayed</SelectItem>
                        <SelectItem value="high">High - Significant impact if delayed</SelectItem>
                        <SelectItem value="critical">Critical - Project failure if delayed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Dependencies */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Task Dependencies</h4>
                  <p className="text-xs text-muted-foreground">
                    Select tasks that must be completed before this milestone can be achieved.
                  </p>
                  
                  <div className="max-h-40 overflow-y-auto border rounded-md p-3 space-y-2">
                    {availableTasksForDependencies.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No tasks available for dependencies</p>
                    ) : (
                      availableTasksForDependencies.map((task: any) => (
                        <div key={task.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`task-${task.id}`}
                            checked={formData.dependencies.includes(task.id)}
                            onChange={(e) => handleDependencyToggle(task.id, e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label
                            htmlFor={`task-${task.id}`}
                            className="text-sm cursor-pointer flex-1"
                          >
                            <span className="font-medium">#{task.number || task.id.slice(-4)}</span> {task.title}
                            <Badge variant="outline" className="ml-2 text-xs">
                              {task.status}
                            </Badge>
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {formData.dependencies.length > 0 && (
                    <div className="text-xs text-blue-600">
                      {formData.dependencies.length} task(s) selected as dependencies
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="flex flex-col-reverse sm:flex-row justify-between gap-2">
                <div className="w-full sm:w-auto">
                  {editingMilestone && (
                    <Button
                      variant="destructive"
                      onClick={() => handleDeleteMilestone(editingMilestone.id)}
                      className="w-full sm:w-auto"
                    >
                      Delete Milestone
                    </Button>
                  )}
            </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button variant="outline" onClick={handleModalClose} className="flex-1 sm:flex-none">
                    Cancel
                  </Button>
                  <Button onClick={handleSaveMilestone} className="flex-1 sm:flex-none">
                    {editingMilestone ? 'Update' : 'Create'} Milestone
                  </Button>
        </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Create Task Modal */}
          <CreateTaskModal
            open={isCreateTaskOpen}
            onClose={() => setIsCreateTaskOpen(false)}
            projectContext={{
              id: projectId,
              name: projectData?.name || 'Project',
              slug: projectData?.slug || 'project'
            }}
          />

          {/* Analytics Dashboard Popup */}
          <DashboardPopup
            open={isDashboardOpen}
            onClose={() => setIsDashboardOpen(false)}
            projectId={projectId}
            projectName={projectData?.name}
            title="Timeline Analytics"
            variant="timeline"
          />
        </main>
      </div>
    </LazyDashboardLayout>
  );
} 