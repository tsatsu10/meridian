/**
 * 🎯 Enhanced Member Details Modal
 * 
 * @epic-3.4-teams - Comprehensive member activity and performance view
 * @persona-sarah - PM needs visibility into team member contributions
 * @persona-david - Team lead needs detailed performance insights
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CheckCircle2, 
  Clock, 
  FileText, 
  TrendingUp, 
  Calendar,
  Mail,
  Video,
  Settings,
  Download,
  Activity,
  Target,
  Zap,
  AlertCircle,
  Info,
  Edit,
  MessageSquare,
  File,
  Plus,
  CheckCircle,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useGetMemberActivity } from "@/hooks/queries/workspace-user/use-get-member-activity";
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

interface ProjectMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  activeTasks: number;
  completedTasks: number;
  productivity: number;
  lastActive: string;
  joinedProject: string;
}

interface EnhancedMemberDetailsModalProps {
  open: boolean;
  onClose: () => void;
  member: ProjectMember | null;
  workspaceId: string;
  onSendMessage?: (member: ProjectMember) => void;
  onStartVideoCall?: (member: ProjectMember) => void;
  onChangeRole?: (member: ProjectMember) => void;
  canChangeRoles?: boolean;
  roleColors: Record<string, string>;
  availableRoles: Array<{ value: string; label: string }>;
}

export function EnhancedMemberDetailsModal({
  open,
  onClose,
  member,
  workspaceId,
  onSendMessage,
  onStartVideoCall,
  onChangeRole,
  canChangeRoles,
  roleColors,
  availableRoles,
}: EnhancedMemberDetailsModalProps) {
  const { data: activityData, isLoading, error } = useGetMemberActivity(
    workspaceId,
    member?.id || '',
    open && !!member
  );

  if (!member) return null;

  const getActivityIcon = (icon: string) => {
    const iconMap: Record<string, typeof Activity> = {
      plus: Plus,
      'check-circle': CheckCircle,
      edit: Edit,
      'message-square': MessageSquare,
      file: File,
      clock: Clock,
      'arrow-right': ArrowRight,
      activity: Activity,
    };
    const IconComponent = iconMap[icon] || Activity;
    return IconComponent;
  };

  const getActivityColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      blue: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700',
      green: 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700',
      yellow: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700',
      purple: 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700',
      orange: 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700',
      cyan: 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700',
      indigo: 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700',
      gray: 'border-gray-500 bg-gray-50 dark:bg-gray-900/20 text-gray-700',
    };
    return colorMap[color] || colorMap.gray;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getContributionColor = (count: number) => {
    if (count === 0) return 'bg-gray-100 dark:bg-gray-800';
    if (count <= 2) return 'bg-green-200 dark:bg-green-900';
    if (count <= 5) return 'bg-green-400 dark:bg-green-700';
    if (count <= 8) return 'bg-green-600 dark:bg-green-500';
    return 'bg-green-800 dark:bg-green-300';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              <div className="w-full h-full bg-primary/10 flex items-center justify-center text-lg font-medium">
                {member.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span>{member.name}</span>
                <Badge 
                  variant="outline" 
                  className={cn("text-xs", roleColors[member.role] || roleColors.member)}
                >
                  {availableRoles.find(r => r.value === member.role)?.label || member.role}
                </Badge>
              </div>
              <div className="text-sm font-normal text-muted-foreground">{member.email}</div>
            </div>
          </DialogTitle>
          <DialogDescription>
            Comprehensive activity and performance overview
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : error ? (
              <Card className="border-red-200 bg-red-50 dark:bg-red-900/10">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2 text-red-700">
                    <AlertCircle className="h-5 w-5" />
                    <span>Failed to load member activity</span>
                  </div>
                </CardContent>
              </Card>
            ) : activityData ? (
              <>
                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {activityData.taskStats.inProgress}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Active Tasks</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {activityData.taskStats.completed}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Completed</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {activityData.timeStats.totalHoursLogged}h
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Hours Logged</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Extended Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Task Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Tasks:</span>
                        <span className="font-medium">{activityData.taskStats.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">High Priority:</span>
                        <span className="font-medium text-red-600">{activityData.taskStats.highPriority}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">This Week:</span>
                        <span className="font-medium text-green-600">{activityData.taskStats.completedThisWeek}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">This Month:</span>
                        <span className="font-medium text-blue-600">{activityData.taskStats.completedThisMonth}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <div className="flex items-center space-x-2">
                  {onSendMessage && (
                    <Button variant="outline" size="sm" onClick={() => onSendMessage(member)}>
                      <Mail className="h-4 w-4 mr-2" />
                      Message
                    </Button>
                  )}
                  {onStartVideoCall && (
                    <Button variant="outline" size="sm" onClick={() => onStartVideoCall(member)}>
                      <Video className="h-4 w-4 mr-2" />
                      Video Call
                    </Button>
                  )}
                  {canChangeRoles && onChangeRole && (
                    <Button variant="outline" size="sm" onClick={() => onChangeRole(member)}>
                      <Settings className="h-4 w-4 mr-2" />
                      Change Role
                    </Button>
                  )}
                </div>
              </>
            ) : null}
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="mt-4">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : activityData?.timeline && activityData.timeline.length > 0 ? (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {activityData.timeline.map((activity) => {
                    const IconComponent = getActivityIcon(activity.icon);
                    return (
                      <div
                        key={activity.id}
                        className={cn(
                          "flex items-start space-x-3 p-3 rounded-lg border-l-2",
                          getActivityColorClass(activity.color)
                        )}
                      >
                        <IconComponent className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium capitalize">
                            {activity.action.replace(/_/g, ' ')}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {activity.details}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(activity.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">No Recent Activity</h3>
                  <p className="text-sm text-muted-foreground">
                    This member hasn't had any recorded activity in the last 30 days
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="mt-4 space-y-4">
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : activityData?.performanceTrends ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Weekly Performance Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={activityData.performanceTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <RechartsTooltip />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Line 
                          type="monotone" 
                          dataKey="tasksCompleted" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          name="Tasks Completed"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="hoursLogged" 
                          stroke="#8b5cf6" 
                          strokeWidth={2}
                          name="Hours Logged"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Contribution Graph */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">30-Day Contribution History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-10 gap-1">
                      {activityData.contributionGraph.slice(-30).map((day, index) => (
                        <div
                          key={index}
                          className={cn(
                            "w-full aspect-square rounded",
                            getContributionColor(day.count)
                          )}
                          title={`${day.date}: ${day.count} contributions`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                      <span>Less</span>
                      <div className="flex space-x-1">
                        <div className="w-3 h-3 rounded bg-gray-100 dark:bg-gray-800" />
                        <div className="w-3 h-3 rounded bg-green-200 dark:bg-green-900" />
                        <div className="w-3 h-3 rounded bg-green-400 dark:bg-green-700" />
                        <div className="w-3 h-3 rounded bg-green-600 dark:bg-green-500" />
                        <div className="w-3 h-3 rounded bg-green-800 dark:bg-green-300" />
                      </div>
                      <span>More</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Time Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Avg per Week</span>
                      </div>
                      <div className="text-xl font-bold mt-2">
                        {activityData.timeStats.averageHoursPerWeek}h
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Time Entries</span>
                      </div>
                      <div className="text-xl font-bold mt-2">
                        {activityData.timeStats.timeEntriesCount}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : null}
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="mt-4">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : activityData?.attachments && activityData.attachments.length > 0 ? (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {activityData.attachments.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{file.fileName}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatFileSize(file.fileSize)} • {new Date(file.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">No Files Uploaded</h3>
                  <p className="text-sm text-muted-foreground">
                    This member hasn't uploaded any files yet
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

