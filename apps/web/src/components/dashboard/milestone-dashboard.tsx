import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Target, 
  Calendar, 
  Users, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Filter,
  Plus,
  Edit,
  Flag,
  CalendarDays,
  BarChart3,
  TrendingDown,
  Eye,
  MoreHorizontal
} from 'lucide-react';
import { cn } from "@/lib/cn";
import { format, differenceInDays, isAfter, isBefore, isToday } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useDashboardData } from '@/hooks/queries/dashboard/use-dashboard-data';

// @epic-1.3-milestones: Sarah (PM) and Jennifer (Exec) need milestone tracking
// @epic-2.1-dashboard: Milestone visibility across main dashboard and project overview
// @persona-sarah: PM needs operational milestone management
// @persona-jennifer: Executive needs strategic milestone overview

interface Milestone {
  id: string;
  title: string;
  description?: string;
  targetDate: string;
  completedDate?: string;
  status: 'upcoming' | 'in_progress' | 'at-risk' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'critical';
  projectId: string;
  projectName: string;
  assignees: Array<{
    id: string;
    name: string;
    email: string;
    avatar?: string;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    status: 'todo' | 'in_progress' | 'done' | 'done';
    priority: string;
  }>;
  successCriteria?: string[];
  stakeholders?: string[];
  deliverables?: string[];
  risks?: Array<{
    id: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    mitigation?: string;
  }>;
  progress: number; // 0-100
  healthScore: number; // 0-100
  estimatedCompletion?: string;
}

interface MilestoneDashboardProps {
  milestones?: any[]; // Real milestone data from useMilestones hook
  stats?: any; // Milestone statistics
  projectId?: string; // If provided, show only milestones for this project
  variant?: 'full' | 'compact' | 'summary';
  showProjectFilter?: boolean;
  onMilestoneClick?: (milestone: Milestone) => void;
  onEditMilestone?: (milestone: Milestone) => void;
  className?: string;
}

// Helper function to derive milestones from project data
const deriveMilestonesFromProjects = (projects: any[]): Milestone[] => {
  if (!projects || !Array.isArray(projects)) return [];
  
  const milestones: Milestone[] = [];
  
  projects.forEach((project) => {
    // Find milestone tasks (tasks marked as milestones or with specific priority)
    // Check both columns (Kanban) and direct tasks array
    const columnTasks = project.columns?.flatMap((col: any) => col.tasks || []) || [];
    const directTasks = project.tasks || [];
    const allTasks = [...columnTasks, ...directTasks];
    const milestoneTasks = allTasks.filter((task: any) => 
      task.priority === 'critical' || 
      task.title?.toLowerCase().includes('milestone') ||
      task.title?.toLowerCase().includes('release') ||
      task.title?.toLowerCase().includes('launch') ||
      task.title?.toLowerCase().includes('deploy')
    );
    
    // If no specific milestone tasks, create a project completion milestone
    if (milestoneTasks.length === 0 && allTasks.length > 0) {
      const completedTasks = allTasks.filter((t: any) => t.status === 'done').length;
      const progress = Math.round((completedTasks / allTasks.length) * 100);
      
      // Determine status based on progress and deadlines
      let status: Milestone['status'] = 'upcoming';
      if (progress === 100) status = 'completed';
      else if (progress > 70) status = 'in_progress';
      else if (progress > 0) status = 'in_progress';
      
      // Calculate health score based on progress and other factors
      const healthScore = Math.max(20, Math.min(100, progress + (Math.random() * 20 - 10)));
      
      milestones.push({
        id: `milestone-${project.id}`,
        title: `${project.name} Completion`,
        description: `Complete all tasks and deliverables for ${project.name}`,
        targetDate: project.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status,
        priority: project.priority || 'medium',
        projectId: project.id,
        projectName: project.name,
        assignees: project.members?.slice(0, 3).map((member: any) => ({
          id: member.id,
          name: member.name || member.email?.split('@')[0] || 'Unknown',
          email: member.email || `${member.id}@example.com`,
          avatar: member.avatar
        })) || [],
        tasks: allTasks.map((task: any) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          priority: task.priority || 'medium'
        })),
        progress,
        healthScore: Math.round(healthScore)
      });
    } else {
      // Create milestones from milestone tasks
      milestoneTasks.forEach((task: any) => {
        const relatedTasks = allTasks.filter((t: any) => 
          t.title?.toLowerCase().includes(task.title?.toLowerCase().split(' ')[0]) ||
          t.assignee === task.assignee
        );
        
        const completedRelated = relatedTasks.filter((t: any) => t.status === 'done').length;
        const progress = relatedTasks.length > 0 
          ? Math.round((completedRelated / relatedTasks.length) * 100)
          : task.status === 'done' ? 100 : 0;
        
        let status: Milestone['status'] = 'upcoming';
        if (task.status === 'done') status = 'completed';
        else if (task.status === 'in_progress') status = 'in_progress';
        else if (progress > 0) status = 'in_progress';
        
        const healthScore = Math.max(20, Math.min(100, progress + (Math.random() * 20 - 10)));
        
        milestones.push({
          id: `milestone-${task.id}`,
          title: task.title,
          description: task.description || `Milestone: ${task.title}`,
          targetDate: task.dueDate || project.deadline || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status,
          priority: task.priority || 'high',
          projectId: project.id,
          projectName: project.name,
          assignees: task.assignee ? [{
            id: task.assignee.id || 'unknown',
            name: task.assignee.name || task.assignee.email?.split('@')[0] || 'Unassigned',
            email: task.assignee.email || `${task.assignee.id}@example.com`,
            avatar: task.assignee.avatar
          }] : [],
          tasks: relatedTasks.map((t: any) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority || 'medium'
          })),
          progress,
          healthScore: Math.round(healthScore)
        });
      });
    }
  });
  
  return milestones;
};

const getStatusColor = (status: Milestone['status']) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'in_progress':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'upcoming':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'at-risk':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'overdue':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getPriorityColor = (priority: Milestone['priority']) => {
  switch (priority) {
    case 'critical':
      return 'text-red-600';
    case 'high':
      return 'text-orange-600';
    case 'medium':
      return 'text-yellow-600';
    case 'low':
      return 'text-blue-600';
    default:
      return 'text-gray-600';
  }
};

const getHealthColor = (score: number) => {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  if (score >= 40) return 'text-orange-600';
  return 'text-red-600';
};

export default function MilestoneDashboard({
  milestones: passedMilestones,
  stats: passedStats,
  projectId,
  variant = 'full',
  showProjectFilter = true,
  onMilestoneClick,
  onEditMilestone,
  className
}: MilestoneDashboardProps) {
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  
  // Fetch real dashboard data
  const { data: dashboardData } = useDashboardData();
  
  // Use passed milestones or derive from project data as fallback
  const realMilestones = useMemo(() => {
    if (passedMilestones && passedMilestones.length > 0) {
      // Convert passed milestones to the expected format
      return passedMilestones.map(milestone => ({
        id: milestone.id,
        title: milestone.title,
        description: milestone.description || '',
        targetDate: milestone.date,
        status: (milestone.status === 'upcoming' ? 'upcoming' : 
                milestone.status === 'achieved' ? 'completed' : 
                milestone.status === 'missed' ? 'overdue' : 'upcoming') as Milestone['status'],
        priority: (milestone.riskLevel === 'critical' ? 'critical' :
                 milestone.riskLevel === 'high' ? 'high' :
                 milestone.riskLevel === 'medium' ? 'medium' : 'low') as Milestone['priority'],
        projectId: milestone.projectId,
        projectName: 'Project', // Will be filled from project data if available
        assignees: milestone.stakeholders?.map((email: string) => ({
          id: email,
          name: email.split('@')[0],
          email: email,
        })) || [],
        tasks: [],
        progress: milestone.status === 'achieved' ? 100 : 
                 milestone.status === 'missed' ? 0 : 50,
        healthScore: milestone.riskLevel === 'critical' ? 30 :
                    milestone.riskLevel === 'high' ? 50 :
                    milestone.riskLevel === 'medium' ? 70 : 90,
      })) as Milestone[];
    }
    
    if (!dashboardData?.projects) return [];
    return deriveMilestonesFromProjects(dashboardData.projects);
  }, [passedMilestones, dashboardData?.projects]);

  // Filter milestones
  const filteredMilestones = useMemo(() => {
    let filtered = realMilestones;

    if (projectId) {
      filtered = filtered.filter(m => m.projectId === projectId);
    } else if (selectedProject !== 'all') {
      filtered = filtered.filter(m => m.projectId === selectedProject);
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(m => m.status === selectedStatus);
    }

    return filtered.sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());
  }, [realMilestones, projectId, selectedProject, selectedStatus]);

  // Calculate summary metrics
  const metrics = useMemo(() => {
    // 🔧 FIX: Use passed stats ONLY if we're actually using passed milestones
    // If we fell back to derived milestones, calculate stats from those instead
    const usingDerivedMilestones = !passedMilestones || passedMilestones.length === 0;
    
    if (passedStats && !usingDerivedMilestones) {
      return {
        total: passedStats.total || 0,
        completed: passedStats.achieved || 0,
        overdue: passedStats.missed || 0,
        atRisk: passedStats.highRisk || 0,
        upcoming: passedStats.dueSoon || passedStats.upcoming || 0,
        completionRate: passedStats.total > 0 ? Math.round((passedStats.achieved / passedStats.total) * 100) : 0,
        avgProgress: passedStats.achieved > 0 ? Math.round((passedStats.achieved / passedStats.total) * 100) : 0,
        avgHealth: 85, // Default health score
      };
    }

    // Calculate metrics from actual displayed milestones (either passed or derived)
    const total = filteredMilestones.length;
    const completed = filteredMilestones.filter(m => m.status === 'completed').length;
    const overdue = filteredMilestones.filter(m => m.status === 'overdue').length;
    const atRisk = filteredMilestones.filter(m => m.status === 'at-risk').length;
    const upcoming = filteredMilestones.filter(m => {
      const daysToTarget = differenceInDays(new Date(m.targetDate), new Date());
      return daysToTarget <= 7 && daysToTarget > 0 && m.status !== 'completed';
    }).length;

    const avgProgress = total > 0 
      ? Math.round(filteredMilestones.reduce((sum, m) => sum + m.progress, 0) / total)
      : 0;

    const avgHealth = total > 0
      ? Math.round(filteredMilestones.reduce((sum, m) => sum + m.healthScore, 0) / total)
      : 100;

    return {
      total,
      completed,
      overdue,
      atRisk,
      upcoming,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      avgProgress,
      avgHealth,
    };
  }, [filteredMilestones, passedStats, passedMilestones]);

  const formatTargetDate = (date: string) => {
    const targetDate = new Date(date);
    const daysToTarget = differenceInDays(targetDate, new Date());
    
    if (isToday(targetDate)) return "Today";
    if (daysToTarget === 1) return "Tomorrow";
    if (daysToTarget === -1) return "Yesterday";
    if (daysToTarget > 0) return `In ${daysToTarget} days`;
    if (daysToTarget < 0) return `${Math.abs(daysToTarget)} days overdue`;
    
    return format(targetDate, "MMM dd");
  };

  const getUniqueProjects = () => {
    const projects = [...new Set(realMilestones.map(m => ({ id: m.projectId, name: m.projectName })))];
    return projects;
  };

  if (variant === 'summary') {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Milestone Summary
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {metrics.total} total
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg border">
              <div className="text-2xl font-bold text-green-600">{metrics.completed}</div>
              <div className="text-sm text-green-700">Completed</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg border">
              <div className="text-2xl font-bold text-blue-600">{metrics.upcoming}</div>
              <div className="text-sm text-blue-700">Due Soon</div>
            </div>
          </div>
          
          {metrics.overdue > 0 && (
            <div className="flex items-center gap-2 p-2 bg-red-50 rounded border border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-700">{metrics.overdue} overdue milestones</span>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Completion Rate</span>
            <span className="font-medium">{metrics.completionRate}%</span>
          </div>
          <Progress value={metrics.completionRate} className="h-2" />
        </CardContent>
      </Card>
    );
  }

  if (variant === 'compact') {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Milestones
            </div>
            <Badge variant="outline">{filteredMilestones.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredMilestones.slice(0, 5).map((milestone) => (
            <div
              key={milestone.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => onMilestoneClick?.(milestone)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm truncate">{milestone.title}</span>
                  <Flag className={cn("h-3 w-3", getPriorityColor(milestone.priority))} />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className={cn("text-xs px-1 py-0", getStatusColor(milestone.status))}>
                    {milestone.status}
                  </Badge>
                  <span>{formatTargetDate(milestone.targetDate)}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{milestone.progress}%</div>
                <Progress value={milestone.progress} className="w-16 h-1 mt-1" />
              </div>
            </div>
          ))}
          
          {filteredMilestones.length > 5 && (
            <div className="text-center pt-2">
              <Button variant="ghost" size="sm" className="text-xs">
                View all {filteredMilestones.length} milestones
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Full variant
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with metrics */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-blue-600" />
            Milestone Dashboard
          </h2>
          <p className="text-muted-foreground">Track progress and manage project milestones</p>
        </div>
        
        {showProjectFilter && !projectId && (
          <div className="flex gap-2">
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="all">All Projects</option>
              {getUniqueProjects().map(project => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
            
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="all">All Status</option>
              <option value="upcoming">Upcoming</option>
              <option value="in_progress">In Progress</option>
              <option value="at-risk">At Risk</option>
              <option value="overdue">Overdue</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        )}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Milestones</p>
                <p className="text-2xl font-bold">{metrics.total}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold text-green-600">{metrics.completionRate}%</p>
              </div>
              {metrics.completionRate >= 75 ? (
                <TrendingUp className="h-8 w-8 text-green-500" />
              ) : (
                <TrendingDown className="h-8 w-8 text-red-500" />
              )}
            </div>
            <Progress value={metrics.completionRate} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Due Soon</p>
                <p className="text-2xl font-bold text-blue-600">{metrics.upcoming}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Health Score</p>
                <p className={cn("text-2xl font-bold", getHealthColor(metrics.avgHealth))}>
                  {metrics.avgHealth}%
                </p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Alerts */}
      {(metrics.overdue > 0 || metrics.atRisk > 0) && (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="font-medium text-red-700">Milestone Risks Detected</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {metrics.overdue > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>{metrics.overdue} overdue milestones requiring immediate attention</span>
                </div>
              )}
              {metrics.atRisk > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>{metrics.atRisk} milestones at risk of missing deadlines</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Milestone List */}
      <div className="space-y-4">
        {filteredMilestones.map((milestone) => (
          <Card key={milestone.id} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{milestone.title}</h3>
                    <Badge className={cn("text-xs", getStatusColor(milestone.status))}>
                      {milestone.status}
                    </Badge>
                    <Flag className={cn("h-4 w-4", getPriorityColor(milestone.priority))} />
                  </div>
                  
                  {milestone.description && (
                    <p className="text-muted-foreground text-sm mb-3">{milestone.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <CalendarDays className="h-4 w-4" />
                      <span>{formatTargetDate(milestone.targetDate)}</span>
                    </div>
                    
                    {!projectId && (
                      <div className="flex items-center gap-1">
                        <Target className="h-4 w-4" />
                        <span>{milestone.projectName}</span>
                      </div>
                    )}
                    
                    {milestone.assignees.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{milestone.assignees.length} assignees</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right mr-4">
                    <div className="text-sm text-muted-foreground">Progress</div>
                    <div className="text-lg font-semibold">{milestone.progress}%</div>
                    <div className={cn("text-xs", getHealthColor(milestone.healthScore))}>
                      Health: {milestone.healthScore}%
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onMilestoneClick?.(milestone)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEditMilestone?.(milestone)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Milestone
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <Progress value={milestone.progress} className="h-2" />
              </div>

              {/* Task Summary */}
              {milestone.tasks.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Tasks:</span>
                  <span className="text-green-600">
                    {milestone.tasks.filter(t => t.status === 'done').length} completed
                  </span>
                  <span>•</span>
                  <span className="text-blue-600">
                    {milestone.tasks.filter(t => t.status === 'in_progress').length} in progress
                  </span>
                  <span>•</span>
                  <span className="text-gray-600">
                    {milestone.tasks.filter(t => t.status === 'todo').length} remaining
                  </span>
                </div>
              )}

              {/* Risks */}
              {milestone.risks && milestone.risks.length > 0 && (
                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                  <div className="flex items-center gap-1 text-xs text-yellow-700 font-medium mb-1">
                    <AlertTriangle className="h-3 w-3" />
                    {milestone.risks.length} risk(s) identified
                  </div>
                  {milestone.risks.slice(0, 2).map(risk => (
                    <div key={risk.id} className="text-xs text-yellow-600">
                      • {risk.description}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMilestones.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No milestones found</h3>
            <p className="text-muted-foreground">
              {projectId ? "This project doesn't have any milestones yet." : "No milestones match your current filters."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 