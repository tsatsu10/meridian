import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { 
  Target, 
  Calendar, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Edit,
  Trash2,
  MoreHorizontal,
  Info,
  List,
  Grid as GridIcon,
  LayoutList,
  Search,
  Filter,
  ArrowUpDown,
  X,
  Download,
  Copy,
  Share2,
  Pin,
  Layers
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { useMilestones } from "@/hooks/use-milestones";
import { toast } from "sonner";
import MilestoneDetailModal from "./milestone-detail-modal";
import MilestoneToolbar from "./milestone-toolbar";
import MilestoneProgressCard from "./milestone-progress-card";
import { useNavigate } from "@tanstack/react-router";
import { useDashboardData } from "@/hooks/queries/dashboard/use-dashboard-data";

// @epic-1.3-milestones: Sarah (PM) needs milestone tracking and management
// @persona-sarah: PM needs to view and manage project milestones

interface MilestoneListProps {
  projectId?: string;
  workspaceId?: string;
  className?: string;
  onEditMilestone?: (milestone: any) => void;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'achieved':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'missed':
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case 'upcoming':
    default:
      return <Clock className="h-4 w-4 text-blue-500" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'achieved':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'missed':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'upcoming':
    default:
      return 'bg-blue-100 text-blue-800 border-blue-200';
  }
};

const getRiskColor = (riskLevel: string) => {
  switch (riskLevel) {
    case 'critical':
      return 'text-red-600';
    case 'high':
      return 'text-orange-600';
    case 'medium':
      return 'text-yellow-600';
    case 'low':
    default:
      return 'text-green-600';
  }
};

const getMilestoneTypeIcon = (type: string) => {
  switch (type) {
    case 'phase_completion':
      return '🎯';
    case 'deliverable':
      return '📦';
    case 'approval':
      return '✅';
    case 'deadline':
      return '⏰';
    default:
      return '🎯';
  }
};

export default function MilestoneList({ projectId, workspaceId, className, onEditMilestone }: MilestoneListProps) {
  const { milestones: localStorageMilestones, deleteMilestone, updateMilestone, stats } = useMilestones(projectId);
  const { data: dashboardData } = useDashboardData();
  const [selectedMilestone, setSelectedMilestone] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const navigate = useNavigate();

  // View mode state
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  // Filter and sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date-asc');
  const [groupBy, setGroupBy] = useState<string>('none');
  
  // Bulk selection state
  const [selectedMilestones, setSelectedMilestones] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  // 🔧 Merge localStorage milestones with derived milestones from tasks
  const allMilestones = useMemo(() => {
    const derived: any[] = [];
    
    // Derive milestones from tasks (optimized to only process current project)
    // ✅ PERFORMANCE: Early return if no data to prevent unnecessary processing
    if (!dashboardData?.projects || !projectId || !Array.isArray(dashboardData.projects)) {
      return [...localStorageMilestones];
    }
    
    // 🚀 PERFORMANCE: Only find and process the current project
    const currentProject = dashboardData.projects.find((p: any) => p.id === projectId);
    
    if (currentProject) {
      const columnTasks = currentProject.columns?.flatMap((col: any) => col.tasks || []) || [];
      const directTasks = currentProject.tasks || [];
      const allTasks = [...columnTasks, ...directTasks];
      
      // Find milestone tasks (critical/urgent priority OR milestone keywords)
      const milestoneTasks = allTasks.filter((task: any) => {
        const titleLower = task.title?.toLowerCase() || '';
        const milestoneKeywords = ['milestone', 'launch', 'release', 'delivery', 'completion', 'phase', 'sprint', 'version'];
        const hasMilestoneKeyword = milestoneKeywords.some(keyword => titleLower.includes(keyword));
        const isCritical = task.priority === 'critical' || task.priority === 'urgent';
        return isCritical || hasMilestoneKeyword;
      });
      
      // Convert tasks to milestone format
      milestoneTasks.forEach((task: any) => {
        derived.push({
          id: `derived_${task.id}`,
          title: task.title,
          description: task.description || 'Auto-detected milestone from task',
          date: task.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: task.status === 'done' ? 'achieved' : task.dueDate && new Date(task.dueDate) < new Date() ? 'missed' : 'upcoming',
          milestoneType: 'deliverable',
          stakeholders: task.userEmail ? [task.userEmail] : [],
          successCriteria: `Complete task: ${task.title}`,
          riskLevel: task.priority === 'critical' || task.priority === 'urgent' ? 'high' : 'medium',
          projectId: currentProject.id,
          isDerived: true, // Mark as derived so we know it can't be edited
          createdAt: task.createdAt || new Date().toISOString(),
          updatedAt: task.updatedAt || new Date().toISOString(),
        });
      });
    }
    
    // Combine localStorage milestones with derived ones
    // localStorage milestones come first (they're manually created, more important)
    return [...localStorageMilestones, ...derived];
  }, [localStorageMilestones, dashboardData, projectId]);

  // Filter milestones
  const filteredMilestones = useMemo(() => {
    return allMilestones.filter(milestone => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          milestone.title?.toLowerCase().includes(query) ||
          milestone.description?.toLowerCase().includes(query) ||
          milestone.successCriteria?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && milestone.status !== statusFilter) return false;

      // Risk filter
      if (riskFilter !== 'all' && milestone.riskLevel !== riskFilter) return false;

      // Type filter
      if (typeFilter === 'manual' && milestone.isDerived) return false;
      if (typeFilter === 'auto' && !milestone.isDerived) return false;

      return true;
    });
  }, [allMilestones, searchQuery, statusFilter, riskFilter, typeFilter]);

  // Sort milestones
  const sortedMilestones = useMemo(() => {
    const sorted = [...filteredMilestones];

    switch (sortBy) {
      case 'date-asc':
        return sorted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      case 'date-desc':
        return sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      case 'risk-high': {
        const riskOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
        return sorted.sort((a, b) => (riskOrder[b.riskLevel] || 0) - (riskOrder[a.riskLevel] || 0));
      }
      case 'risk-low': {
        const riskOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
        return sorted.sort((a, b) => (riskOrder[a.riskLevel] || 0) - (riskOrder[b.riskLevel] || 0));
      }
      case 'status': {
        const statusOrder: Record<string, number> = { missed: 3, upcoming: 2, achieved: 1 };
        return sorted.sort((a, b) => (statusOrder[b.status] || 0) - (statusOrder[a.status] || 0));
      }
      case 'created':
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'updated':
        return sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      default:
        return sorted;
    }
  }, [filteredMilestones, sortBy]);

  // Group milestones
  const groupedMilestones = useMemo(() => {
    if (groupBy === 'none') return { 'All Milestones': sortedMilestones };

    const groups: Record<string, any[]> = {};

    sortedMilestones.forEach(milestone => {
      let groupKey = '';

      switch (groupBy) {
        case 'status':
          groupKey = milestone.status.charAt(0).toUpperCase() + milestone.status.slice(1);
          break;
        case 'risk':
          groupKey = milestone.riskLevel.charAt(0).toUpperCase() + milestone.riskLevel.slice(1) + ' Risk';
          break;
        case 'type':
          groupKey = milestone.isDerived ? 'Auto-detected' : 'Manual';
          break;
        case 'month': {
          const date = new Date(milestone.date);
          groupKey = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          break;
        }
        default:
          groupKey = 'All Milestones';
      }

      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(milestone);
    });

    return groups;
  }, [sortedMilestones, groupBy]);

  // Check if any filters are active
  const hasActiveFilters = searchQuery || statusFilter !== 'all' || riskFilter !== 'all' || typeFilter !== 'all';

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setRiskFilter('all');
    setTypeFilter('all');
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Cmd/Ctrl + A: Select all
      if ((e.metaKey || e.ctrlKey) && e.key === 'a' && selectMode) {
        e.preventDefault();
        setSelectedMilestones(new Set(sortedMilestones.map(m => m.id)));
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [sortedMilestones, selectMode]);

  const handleDeleteMilestone = (milestoneId: string) => {
    if (confirm('Are you sure you want to delete this milestone?')) {
      deleteMilestone(milestoneId);
      toast.success('Milestone deleted successfully');
    }
  };

  const handleStatusChange = (milestoneId: string, newStatus: 'upcoming' | 'achieved' | 'missed') => {
    updateMilestone(milestoneId, { status: newStatus });
    toast.success(`Milestone marked as ${newStatus}`);
  };

  // Bulk actions
  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedMilestones.size} milestones?`)) {
      selectedMilestones.forEach(id => {
        if (!allMilestones.find(m => m.id === id)?.isDerived) {
          deleteMilestone(id);
        }
      });
      setSelectedMilestones(new Set());
      setSelectMode(false);
      toast.success(`${selectedMilestones.size} milestones deleted`);
    }
  };

  const handleBulkStatusChange = (status: 'upcoming' | 'achieved' | 'missed') => {
    selectedMilestones.forEach(id => {
      const milestone = allMilestones.find(m => m.id === id);
      if (milestone && !milestone.isDerived) {
        updateMilestone(id, { status });
      }
    });
    setSelectedMilestones(new Set());
    setSelectMode(false);
    toast.success(`${selectedMilestones.size} milestones updated`);
  };

  const handleToggleSelection = (milestoneId: string) => {
    const newSet = new Set(selectedMilestones);
    if (newSet.has(milestoneId)) {
      newSet.delete(milestoneId);
    } else {
      newSet.add(milestoneId);
    }
    setSelectedMilestones(newSet);
  };

  const handleSelectAll = () => {
    setSelectedMilestones(new Set(sortedMilestones.filter(m => !m.isDerived).map(m => m.id)));
  };

  const handleDeselectAll = () => {
    setSelectedMilestones(new Set());
  };

  // Export functionality
  const exportMilestones = (format: 'csv' | 'json') => {
    const dataToExport = sortedMilestones.map(m => ({
      Title: m.title,
      Status: m.status,
      'Due Date': new Date(m.date).toLocaleDateString(),
      'Risk Level': m.riskLevel,
      Type: m.isDerived ? 'Auto-detected' : 'Manual',
      'Success Criteria': m.successCriteria,
      Stakeholders: m.stakeholders?.join(', ') || '',
    }));

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `milestones-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Exported as JSON');
    } else if (format === 'csv') {
      const headers = Object.keys(dataToExport[0] || {});
      const csv = [
        headers.join(','),
        ...dataToExport.map(row => 
          headers.map(header => `"${(row as any)[header] || ''}"`).join(',')
        )
      ].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `milestones-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Exported as CSV');
    }
  };

  const handleMilestoneClick = (milestone: any) => {
    setSelectedMilestone(milestone);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedMilestone(null);
  };

  const handleBackToOverview = () => {
    if (workspaceId && projectId) {
      navigate({ 
        to: '/dashboard/workspace/$workspaceId/project/$projectId', 
        params: { workspaceId, projectId } 
      });
    }
    handleCloseDetailModal();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 0) return `In ${diffDays} days`;
    if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
    
    return date.toLocaleDateString();
  };

  // Calculate stats from all milestones (not just localStorage)
  const combinedStats = useMemo(() => {
    return {
      total: allMilestones.length,
      achieved: allMilestones.filter(m => m.status === 'achieved').length,
      upcoming: allMilestones.filter(m => m.status === 'upcoming').length,
      missed: allMilestones.filter(m => m.status === 'missed').length,
      highRisk: allMilestones.filter(m => m.riskLevel === 'high' || m.riskLevel === 'critical').length,
      derived: allMilestones.filter(m => m.isDerived).length,
      manual: allMilestones.filter(m => !m.isDerived).length,
    };
  }, [allMilestones]);

  // Empty state for no milestones at all
  if (allMilestones.length === 0) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Target className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No milestones yet</h3>
          <p className="text-muted-foreground text-center max-w-sm">
            Create your first milestone to track important project goals and deadlines.
            Milestones are also auto-detected from critical/urgent tasks.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Toolbar */}
      <MilestoneToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        riskFilter={riskFilter}
        onRiskFilterChange={setRiskFilter}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
        groupBy={groupBy}
        onGroupChange={setGroupBy}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearAllFilters}
        onExport={exportMilestones}
        selectMode={selectMode}
        onSelectModeChange={setSelectMode}
        selectedCount={selectedMilestones.size}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        totalCount={allMilestones.length}
        filteredCount={filteredMilestones.length}
      />

      {/* Progress Visualization */}
      <MilestoneProgressCard milestones={allMilestones} />

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{combinedStats.total}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {combinedStats.manual} manual • {combinedStats.derived} auto
                </p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Achieved</p>
                <p className="text-2xl font-bold text-green-600">{combinedStats.achieved}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Upcoming</p>
                <p className="text-2xl font-bold text-blue-600">{combinedStats.upcoming}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">High Risk</p>
                <p className="text-2xl font-bold text-red-600">{combinedStats.highRisk}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtered Empty State */}
      {filteredMilestones.length === 0 && allMilestones.length > 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Filter className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No milestones match your filters</h3>
            <p className="text-muted-foreground text-center max-w-sm mb-4">
              Try adjusting your search query or filter settings
            </p>
            <Button variant="outline" onClick={clearAllFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear All Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Milestone List/Grid */}
          {Object.entries(groupedMilestones).map(([groupName, milestones]) => (
            <div key={groupName} className="space-y-3">
              {groupBy !== 'none' && (
                <h3 className="text-lg font-semibold flex items-center gap-2 px-1">
                  <Layers className="h-5 w-5 text-muted-foreground" />
                  {groupName} ({milestones.length})
                </h3>
              )}
              
              <div className={cn(
                viewMode === 'grid' 
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                  : "space-y-3"
              )}>
                {milestones.map((milestone) => (
                  <Card 
                    key={milestone.id} 
                    className={cn(
                      "hover:shadow-md transition-shadow",
                      selectedMilestones.has(milestone.id) && "ring-2 ring-primary"
                    )}
                  >
                    <CardContent className={cn(
                      viewMode === 'grid' ? "p-4" : "p-6",
                      "cursor-pointer"
                    )} onClick={() => !selectMode && handleMilestoneClick(milestone)}>
                      <div className="flex items-start gap-3">
                        {/* Selection Checkbox */}
                        {selectMode && !milestone.isDerived && (
                          <input
                            type="checkbox"
                            checked={selectedMilestones.has(milestone.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleToggleSelection(milestone.id);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1 h-4 w-4 rounded border-gray-300"
                          />
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="text-lg">{getMilestoneTypeIcon(milestone.milestoneType)}</span>
                            <h3 className={cn(
                              "font-semibold truncate",
                              viewMode === 'grid' ? "text-base" : "text-lg"
                            )}>{milestone.title}</h3>
                    <Badge variant="outline" className={cn("text-xs", getStatusColor(milestone.status))}>
                      {getStatusIcon(milestone.status)}
                      <span className="ml-1">{milestone.status}</span>
                    </Badge>
                    {milestone.isDerived && (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                        <Info className="h-3 w-3 mr-1" />
                        Auto-detected
                      </Badge>
                    )}
                  </div>

                  {milestone.description && (
                    <p className="text-muted-foreground mb-3 text-sm">{milestone.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(milestone.date)}</span>
                    </div>
                    
                    {milestone.stakeholders && milestone.stakeholders.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{milestone.stakeholders.length} stakeholder{milestone.stakeholders.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      <span className={cn("font-medium", getRiskColor(milestone.riskLevel))}>
                        {milestone.riskLevel} risk
                      </span>
                    </div>
                  </div>

                  {milestone.successCriteria && (
                    <div className="mb-3">
                      <p className="text-sm font-medium mb-1">Success Criteria:</p>
                      <p className="text-sm text-muted-foreground">{milestone.successCriteria}</p>
                    </div>
                  )}

                  {milestone.stakeholders && milestone.stakeholders.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {milestone.stakeholders.slice(0, 3).map((email, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {email.split('@')[0]}
                        </Badge>
                      ))}
                      {milestone.stakeholders.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{milestone.stakeholders.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                  {!milestone.isDerived && milestone.status === 'upcoming' && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(milestone.id, 'achieved');
                        }}
                        className="text-green-600 hover:text-green-700"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(milestone.id, 'missed');
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {milestone.isDerived ? (
                    <Badge variant="secondary" className="text-xs">
                      <Info className="h-3 w-3 mr-1" />
                      Read-only (from task)
                    </Badge>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          onEditMilestone?.(milestone);
                        }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMilestone(milestone.id);
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {/* Bulk Action Bar */}
      {selectMode && selectedMilestones.size > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <Card className="shadow-lg border-primary">
            <CardContent className="p-4 flex items-center gap-4">
              <span className="text-sm font-medium">
                {selectedMilestones.size} milestone{selectedMilestones.size !== 1 ? 's' : ''} selected
              </span>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark Status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleBulkStatusChange('achieved')}>
                    Mark as Achieved
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkStatusChange('upcoming')}>
                    Mark as Upcoming
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkStatusChange('missed')}>
                    Mark as Missed
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button size="sm" variant="outline" onClick={handleBulkDelete} className="text-red-600 hover:text-red-700">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>

              <Button size="sm" variant="ghost" onClick={() => {
                setSelectMode(false);
                setSelectedMilestones(new Set());
              }}>
                <X className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Milestone Detail Modal */}
      <MilestoneDetailModal
        milestone={selectedMilestone}
        open={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        onEdit={onEditMilestone}
        onDelete={(milestoneId) => {
          handleDeleteMilestone(milestoneId);
          setIsDetailModalOpen(false);
          setSelectedMilestone(null);
        }}
        onStatusChange={handleStatusChange}
        projectId={projectId}
        showBackButton={true}
        onBackToOverview={handleBackToOverview}
      />
    </div>
  );
} 