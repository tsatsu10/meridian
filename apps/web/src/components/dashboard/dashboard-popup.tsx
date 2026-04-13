import { useState } from "react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Target, 
  Calendar, 
  Users, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Activity,
  FileText,
  Gauge
} from 'lucide-react';
import { cn } from "@/lib/cn";
import { useMilestones } from "@/hooks/use-milestones";

// @epic-2.1-dashboard: Analytics popup for project insights
// @persona-sarah: PM needs quick access to project metrics
// @persona-jennifer: Executive needs summary analytics

interface DashboardPopupProps {
  open: boolean;
  onClose: () => void;
  projectId?: string;
  projectName?: string;
  title?: string;
  variant?: 'milestones' | 'team' | 'timeline' | 'full';
  realProjectStats?: any;
  realTasks?: any[];
  realTeamMembers?: any[];
}

export default function DashboardPopup({
  open,
  onClose,
  projectId,
  projectName,
  title = "Project Analytics",
  variant = 'full',
  realProjectStats,
  realTasks,
  realTeamMembers
}: DashboardPopupProps) {
  const { milestones, stats: milestoneStats } = useMilestones(projectId);

  // Use real data if provided, otherwise fallback to mock data
  const projectStats = realProjectStats || {
    totalTasks: 24,
    completedTasks: 18,
    inProgressTasks: 4,
    overdueTasks: 2,
    teamMembers: 6,
    velocity: 3.2,
    healthScore: 85,
    efficiency: 92
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const renderMilestoneMetrics = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{milestoneStats.total}</p>
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
                <p className="text-2xl font-bold text-green-600">{milestoneStats.achieved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Upcoming</p>
                <p className="text-2xl font-bold text-blue-600">{milestoneStats.upcoming}</p>
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
                <p className="text-2xl font-bold text-red-600">{milestoneStats.highRisk}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Milestone Progress */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Milestone Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Completion Rate</span>
              <span>{milestoneStats.total > 0 ? Math.round((milestoneStats.achieved / milestoneStats.total) * 100) : 0}%</span>
            </div>
            <Progress 
              value={milestoneStats.total > 0 ? (milestoneStats.achieved / milestoneStats.total) * 100 : 0} 
              className="h-2" 
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderTeamMetrics = () => {
    // Calculate additional insights from team members if available
    const activeMembers = realTeamMembers?.filter(m => m.status === 'online').length || 0;
    const overloadedMembers = realTeamMembers?.filter(m => m.workloadStatus === 'overloaded').length || 0;
    const avgProductivity = realTeamMembers?.length 
      ? Math.round(realTeamMembers.reduce((sum, m) => sum + (m.productivity || 0), 0) / realTeamMembers.length)
      : projectStats.healthScore;
    const topPerformer = realTeamMembers?.length
      ? realTeamMembers.reduce((prev, current) => ((current.productivity || 0) > (prev.productivity || 0)) ? current : prev)
      : null;

    return (
      <div className="space-y-4">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Team Size</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{projectStats.teamMembers}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activeMembers} active now
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50 border-purple-200 dark:border-purple-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Productivity</p>
                  <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{avgProductivity}%</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    team average
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50 border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">{projectStats.completedTasks}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    of {projectStats.totalTasks} tasks
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/50 border-amber-200 dark:border-amber-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Tasks</p>
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{projectStats.velocity}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    per member
                  </p>
                </div>
                <Target className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Performance Progress */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Project Completion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span className="font-semibold">{projectStats.efficiency}%</span>
              </div>
              <Progress 
                value={projectStats.efficiency} 
                className="h-2" 
              />
            </div>
          </CardContent>
        </Card>

        {/* Workload Insights */}
        {realTeamMembers && realTeamMembers.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Workload Distribution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {overloadedMembers > 0 && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <span className="text-sm font-medium text-red-900 dark:text-red-100">
                      {overloadedMembers} overloaded {overloadedMembers === 1 ? 'member' : 'members'}
                    </span>
                  </div>
                  <Badge variant="destructive" className="text-xs">
                    Action needed
                  </Badge>
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                {overloadedMembers === 0 
                  ? "✓ Team workload is well balanced" 
                  : "Consider redistributing tasks to balance workload"}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Performer */}
        {topPerformer && (
          <Card className="border-2 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Top Performer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{topPerformer.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {topPerformer.completedTasks} tasks completed
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">{topPerformer.productivity}%</p>
                  <p className="text-xs text-muted-foreground">productivity</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderFullMetrics = () => (
    <div className="space-y-6">
      {/* Project Overview */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Project Overview
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Tasks</p>
                  <p className="text-2xl font-bold">{projectStats.totalTasks}</p>
                </div>
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Health Score</p>
                  <p className={cn("text-2xl font-bold", getHealthColor(projectStats.healthScore))}>
                    {projectStats.healthScore}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Milestones */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Target className="h-5 w-5" />
          Milestones
        </h3>
        {renderMilestoneMetrics()}
      </div>

      {/* Team */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Performance
        </h3>
        {renderTeamMetrics()}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (variant) {
      case 'milestones':
        return renderMilestoneMetrics();
      case 'team':
        return renderTeamMetrics();
      case 'timeline':
        return renderMilestoneMetrics(); // Timeline focuses on milestones
      default:
        return renderFullMetrics();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[400px] sm:max-w-[540px] max-h-[90vh] overflow-y-auto animate-in slide-in-from-right duration-300">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {title}
          </DialogTitle>
          {projectName && (
            <DialogDescription>
              Analytics and insights for {projectName}
            </DialogDescription>
          )}
        </DialogHeader>
        
        <div className="mt-6">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
} 