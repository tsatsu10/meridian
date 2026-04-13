// @epic-3.3-time: Project workload and analytics modal for team performance
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  BarChart3, 
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  Target,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Pause
} from "lucide-react";
import { cn } from "@/lib/cn";

interface WorkloadData {
  userEmail: string;
  userName: string;
  role: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  hoursLogged: number;
  hoursEstimated: number;
  capacity: number; // hours per week
  utilization: number; // percentage
  efficiency: number; // percentage (completed vs estimated time)
  lastActive: string;
  upcomingDeadlines: number;
}

interface ProjectWorkloadModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  workloadData: WorkloadData[];
}

const timeRanges = [
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "quarter", label: "This Quarter" },
  { value: "all", label: "All Time" }
];

const viewModes = [
  { value: "overview", label: "Overview", icon: BarChart3 },
  { value: "tasks", label: "Task Distribution", icon: Target },
  { value: "time", label: "Time Tracking", icon: Clock },
  { value: "capacity", label: "Capacity Planning", icon: Activity }
];

export default function ProjectWorkloadModal({ 
  open, 
  onClose, 
  projectId,
  projectName,
  workloadData
}: ProjectWorkloadModalProps) {
  const [viewMode, setViewMode] = useState<"overview" | "tasks" | "time" | "capacity">("overview");
  const [timeRange, setTimeRange] = useState("week");

  // Calculate aggregate metrics
  const metrics = useMemo(() => {
    const totalTasks = workloadData.reduce((sum, member) => sum + member.totalTasks, 0);
    const completedTasks = workloadData.reduce((sum, member) => sum + member.completedTasks, 0);
    const totalHours = workloadData.reduce((sum, member) => sum + member.hoursLogged, 0);
    const avgUtilization = workloadData.length > 0 
      ? workloadData.reduce((sum, member) => sum + member.utilization, 0) / workloadData.length 
      : 0;
    const overloadedMembers = workloadData.filter(member => member.utilization > 100).length;
    const underutilizedMembers = workloadData.filter(member => member.utilization < 70).length;

    return {
      totalTasks,
      completedTasks,
      completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
      totalHours,
      avgUtilization,
      overloadedMembers,
      underutilizedMembers,
      teamSize: workloadData.length
    };
  }, [workloadData]);

  const getUtilizationColor = (utilization: number) => {
    if (utilization > 100) return "text-red-600 bg-red-50 dark:bg-red-900/20";
    if (utilization > 85) return "text-orange-600 bg-orange-50 dark:bg-orange-900/20";
    if (utilization > 70) return "text-green-600 bg-green-50 dark:bg-green-900/20";
    return "text-gray-600 bg-gray-50 dark:bg-gray-900/20";
  };

  const getEfficiencyIcon = (efficiency: number) => {
    if (efficiency > 100) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (efficiency < 80) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Activity className="w-4 h-4 text-blue-600" />;
  };

  const getTaskStatusIcon = (status: "completed" | "in_progress" | "overdue") => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "in_progress":
        return <Pause className="w-4 h-4 text-blue-600" />;
      case "overdue":
        return <XCircle className="w-4 h-4 text-red-600" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Project Workload</span>
          </DialogTitle>
          <DialogDescription>
            Team workload and performance analytics for {projectName}
          </DialogDescription>
        </DialogHeader>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {viewModes.map((mode) => (
              <Button
                key={mode.value}
                variant={viewMode === mode.value ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode(mode.value as any)}
                className="flex items-center space-x-2"
              >
                <mode.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{mode.label}</span>
              </Button>
            ))}
          </div>
          
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeRanges.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Overview */}
          {viewMode === "overview" && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Team Size</p>
                      <p className="text-2xl font-bold">{metrics.teamSize}</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-500" />
                  </div>
                </div>
                
                <div className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Completion Rate</p>
                      <p className="text-2xl font-bold">{metrics.completionRate.toFixed(1)}%</p>
                    </div>
                    <Target className="w-8 h-8 text-green-500" />
                  </div>
                </div>
                
                <div className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Utilization</p>
                      <p className="text-2xl font-bold">{metrics.avgUtilization.toFixed(1)}%</p>
                    </div>
                    <Activity className="w-8 h-8 text-orange-500" />
                  </div>
                </div>
                
                <div className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Hours Logged</p>
                      <p className="text-2xl font-bold">{metrics.totalHours}h</p>
                    </div>
                    <Clock className="w-8 h-8 text-purple-500" />
                  </div>
                </div>
              </div>

              {/* Alerts */}
              {(metrics.overloadedMembers > 0 || metrics.underutilizedMembers > 0) && (
                <div className="space-y-2">
                  {metrics.overloadedMembers > 0 && (
                    <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                      <span className="text-sm text-red-800 dark:text-red-200">
                        {metrics.overloadedMembers} team member{metrics.overloadedMembers > 1 ? 's are' : ' is'} overloaded (&gt;100% utilization)
                      </span>
                    </div>
                  )}
                  {metrics.underutilizedMembers > 0 && (
                    <div className="flex items-center space-x-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                      <span className="text-sm text-yellow-800 dark:text-yellow-200">
                        {metrics.underutilizedMembers} team member{metrics.underutilizedMembers > 1 ? 's are' : ' is'} underutilized (&lt;70% utilization)
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Team Member Overview */}
              <div className="space-y-3">
                <h3 className="text-lg font-medium">Team Overview</h3>
                {workloadData.map((member) => (
                  <div
                    key={member.userEmail}
                    className="flex items-center justify-between p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        <div className="w-full h-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                          {member.userName.charAt(0)}
                        </div>
                      </Avatar>
                      <div>
                        <div className="font-medium">{member.userName}</div>
                        <div className="text-sm text-muted-foreground">{member.role}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className="text-sm font-medium">{member.totalTasks}</div>
                        <div className="text-xs text-muted-foreground">Tasks</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium">{member.hoursLogged}h</div>
                        <div className="text-xs text-muted-foreground">Logged</div>
                      </div>
                      <Badge className={cn("text-xs", getUtilizationColor(member.utilization))}>
                        {member.utilization.toFixed(0)}%
                      </Badge>
                      {getEfficiencyIcon(member.efficiency)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Task Distribution */}
          {viewMode === "tasks" && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Task Distribution</h3>
              {workloadData.map((member) => (
                <div
                  key={member.userEmail}
                  className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-8 h-8">
                        <div className="w-full h-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                          {member.userName.charAt(0)}
                        </div>
                      </Avatar>
                      <div>
                        <div className="font-medium">{member.userName}</div>
                        <div className="text-sm text-muted-foreground">{member.role}</div>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {member.totalTasks} total tasks
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      {getTaskStatusIcon("completed")}
                      <div>
                        <div className="font-medium">{member.completedTasks}</div>
                        <div className="text-xs text-muted-foreground">Completed</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      {getTaskStatusIcon("in_progress")}
                      <div>
                        <div className="font-medium">{member.inProgressTasks}</div>
                        <div className="text-xs text-muted-foreground">In Progress</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      {getTaskStatusIcon("overdue")}
                      <div>
                        <div className="font-medium">{member.overdueTasks}</div>
                        <div className="text-xs text-muted-foreground">Overdue</div>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Progress</span>
                      <span>{member.totalTasks > 0 ? ((member.completedTasks / member.totalTasks) * 100).toFixed(0) : 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ 
                          width: `${member.totalTasks > 0 ? (member.completedTasks / member.totalTasks) * 100 : 0}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Time Tracking */}
          {viewMode === "time" && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Time Tracking</h3>
              {workloadData.map((member) => (
                <div
                  key={member.userEmail}
                  className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-8 h-8">
                        <div className="w-full h-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                          {member.userName.charAt(0)}
                        </div>
                      </Avatar>
                      <div>
                        <div className="font-medium">{member.userName}</div>
                        <div className="text-sm text-muted-foreground">Last active: {member.lastActive}</div>
                      </div>
                    </div>
                    {getEfficiencyIcon(member.efficiency)}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-lg font-medium">{member.hoursLogged}h</div>
                      <div className="text-xs text-muted-foreground">Logged</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-lg font-medium">{member.hoursEstimated}h</div>
                      <div className="text-xs text-muted-foreground">Estimated</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-lg font-medium">{member.efficiency.toFixed(0)}%</div>
                      <div className="text-xs text-muted-foreground">Efficiency</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-lg font-medium">{member.upcomingDeadlines}</div>
                      <div className="text-xs text-muted-foreground">Deadlines</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Capacity Planning */}
          {viewMode === "capacity" && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Capacity Planning</h3>
              {workloadData.map((member) => (
                <div
                  key={member.userEmail}
                  className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-8 h-8">
                        <div className="w-full h-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                          {member.userName.charAt(0)}
                        </div>
                      </Avatar>
                      <div>
                        <div className="font-medium">{member.userName}</div>
                        <div className="text-sm text-muted-foreground">
                          Capacity: {member.capacity}h/week
                        </div>
                      </div>
                    </div>
                    <Badge className={cn("text-xs", getUtilizationColor(member.utilization))}>
                      {member.utilization.toFixed(0)}% utilized
                    </Badge>
                  </div>

                  {/* Capacity bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Current workload</span>
                      <span>{member.hoursLogged}h / {member.capacity}h</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div 
                        className={cn(
                          "h-3 rounded-full transition-all",
                          member.utilization > 100 ? "bg-red-500" :
                          member.utilization > 85 ? "bg-orange-500" :
                          "bg-green-500"
                        )}
                        style={{ 
                          width: `${Math.min(member.utilization, 100)}%` 
                        }}
                      />
                      {member.utilization > 100 && (
                        <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                          Overloaded by {(member.utilization - 100).toFixed(0)}%
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recommendations */}
                  {member.utilization > 100 && (
                    <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200">
                      ⚠️ Consider redistributing {((member.utilization - 100) * member.capacity / 100).toFixed(1)} hours of work
                    </div>
                  )}
                  {member.utilization < 70 && (
                    <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm text-yellow-800 dark:text-yellow-200">
                      💡 Available for {((100 - member.utilization) * member.capacity / 100).toFixed(1)} more hours of work
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <div className="text-sm text-muted-foreground">
            Data for {timeRanges.find(r => r.value === timeRange)?.label?.toLowerCase()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}