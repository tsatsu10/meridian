// @epic-3.4-teams: Team dashboard and workspace management
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  LayoutDashboard,
  Users, 
  TrendingUp,
  Target,
  Clock,
  MessageSquare,
  Plus,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Calendar,
  FileText,
  BarChart3,
  Activity,
  Settings,
  Zap,
  Award,
  Coffee,
  Send,
  Lock,
  MoreHorizontal
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useTeamPermissions } from "@/hooks/useTeamPermissions";
import { useProjectTimeline } from "@/hooks/useProjectTimeline";
import { useQuickActions } from "@/hooks/use-quick-actions";
import { SimpleCommunicationTest } from "@/components/communication/SimpleCommunicationTest";

// Icon wrappers to fix TypeScript issues
const LayoutDashboardIcon = LayoutDashboard as React.FC<{ className?: string }>;
const UsersIcon = Users as React.FC<{ className?: string }>;
const TrendingUpIcon = TrendingUp as React.FC<{ className?: string }>;
const TargetIcon = Target as React.FC<{ className?: string }>;
const ClockIcon = Clock as React.FC<{ className?: string }>;
const MessageSquareIcon = MessageSquare as React.FC<{ className?: string }>;
const PlusIcon = Plus as React.FC<{ className?: string }>;
const ArrowRightIcon = ArrowRight as React.FC<{ className?: string }>;
const CheckCircleIcon = CheckCircle as React.FC<{ className?: string }>;
const AlertTriangleIcon = AlertTriangle as React.FC<{ className?: string }>;
const CalendarIcon = Calendar as React.FC<{ className?: string }>;
const FileTextIcon = FileText as React.FC<{ className?: string }>;
const BarChart3Icon = BarChart3 as React.FC<{ className?: string }>;
const ActivityIcon = Activity as React.FC<{ className?: string }>;
const SettingsIcon = Settings as React.FC<{ className?: string }>;
const ZapIcon = Zap as React.FC<{ className?: string }>;
const AwardIcon = Award as React.FC<{ className?: string }>;
const CoffeeIcon = Coffee as React.FC<{ className?: string }>;
const SendIcon = Send as React.FC<{ className?: string }>;
const LockIcon = Lock as React.FC<{ className?: string }>;
const MoreHorizontalIcon = MoreHorizontal as React.FC<{ className?: string }>;

interface TeamDashboardModalProps {
  open: boolean;
  onClose: () => void;
  selectedTeam?: Team | null;
  allTeams?: Team[];
}

interface Team {
  id: string;
  name: string;
  description: string;
  members: any[];
  lead: string;
  projectId: string;
  projectName: string;
  performance: number;
  workload: number;
  projects: number;
  color: string;
}

interface Task {
  id: string;
  title: string;
  assignee: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  estimatedHours: number;
  actualHours?: number;
}

interface TeamActivity {
  id: string;
  type: 'task_completed' | 'member_joined' | 'milestone_reached' | 'comment_added' | 'file_uploaded';
  message: string;
  user: string;
  timestamp: string;
  icon: string;
}

// Tasks and activity will be fetched from API
// Removed hardcoded sample data

const statusColors = {
  'todo': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  'in_progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  'review': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  'done': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
};

const priorityColors = {
  'low': 'bg-gray-500',
  'medium': 'bg-yellow-500',
  'high': 'bg-red-500'
};

export default function TeamDashboardModal({ 
  open, 
  onClose, 
  selectedTeam = null,
  allTeams = []
}: TeamDashboardModalProps) {
  const [team, setTeam] = useState<Team | null>(selectedTeam);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activity, setActivity] = useState<TeamActivity[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [activeTab, setActiveTab] = useState("communication");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);

  // Get permissions for this team
  const teamPermissions = useTeamPermissions(team);
  
  // Get timeline data for this team
  const { timelineData } = useProjectTimeline(allTeams);
  const teamTimelineData = timelineData.find(tl => 
    tl.teams.some(t => t.teamId === team?.id)
  );

  // Update team when selectedTeam prop changes
  useEffect(() => {
    if (selectedTeam) {
      setTeam(selectedTeam);
    } else if (allTeams.length > 0) {
      setTeam(allTeams[0]);
    }
  }, [selectedTeam, allTeams]);

  // Fetch team tasks when team changes
  useEffect(() => {
    if (!team?.id || !open) return;

    const fetchTeamTasks = async () => {
      setIsLoadingTasks(true);
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3005'}/api/tasks?teamId=${team.id}`,
          {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          }
        );

        if (!response.ok) throw new Error('Failed to fetch tasks');

        const tasksData = await response.json();
        
        // Transform API data to Task format
        const formattedTasks: Task[] = tasksData.map((t: any) => ({
          id: t.id,
          title: t.title || t.name,
          assignee: t.assigneeName || t.assignee || 'Unassigned',
          status: t.status || 'todo',
          priority: t.priority || 'medium',
          dueDate: t.dueDate || t.deadline,
          estimatedHours: t.estimatedHours || t.estimate,
          actualHours: t.actualHours || t.timeSpent || 0
        }));

        setTasks(formattedTasks);
      } catch (error) {
        console.error('Error fetching team tasks:', error);
        setTasks([]);
      } finally {
        setIsLoadingTasks(false);
      }
    };

    fetchTeamTasks();
  }, [team?.id, open]);

  // Fetch team activity when team changes
  useEffect(() => {
    if (!team?.id || !open) return;

    const fetchTeamActivity = async () => {
      setIsLoadingActivity(true);
      try {
        // Try to fetch from team activity endpoint
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3005'}/api/teams/${team.id}/activity`,
          {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          }
        );

        if (!response.ok) {
          // Fallback: generate activity from tasks if endpoint doesn't exist
          console.warn('Team activity endpoint not available, using task-based activity');
          setActivity([]);
          return;
        }

        const activityData = await response.json();
        
        // Transform API data to TeamActivity format
        const formattedActivity: TeamActivity[] = activityData.map((a: any) => ({
          id: a.id,
          type: a.type || a.activityType || 'comment_added',
          message: a.message || a.description,
          user: a.userName || a.user || 'Unknown User',
          timestamp: a.timestamp || a.createdAt,
          icon: getActivityIcon(a.type || a.activityType)
        }));

        setActivity(formattedActivity);
      } catch (error) {
        console.error('Error fetching team activity:', error);
        setActivity([]);
      } finally {
        setIsLoadingActivity(false);
      }
    };

    fetchTeamActivity();
  }, [team?.id, open]);

  // Helper function to get activity icon
  const getActivityIcon = (type: string): string => {
    const iconMap: Record<string, string> = {
      'task_completed': '✅',
      'task_created': '📝',
      'comment_added': '💬',
      'member_joined': '👋',
      'member_left': '👋',
      'milestone_reached': '🎯',
      'file_uploaded': '📎',
      'meeting_scheduled': '📅'
    };
    return iconMap[type] || '📌';
  };

  const handleTeamSelect = (teamId: string) => {
    const selectedTeam = allTeams.find(t => t.id === teamId);
    if (selectedTeam) {
      setTeam(selectedTeam);
    }
  };

  const handleSendMessage = async () => {
    if (newMessage.trim() && teamPermissions.permissions.canSendMessages) {
      try {
        // TODO: Replace with actual channel ID when team channels are implemented
        const channelId = `team-${team?.id || 'general'}`;
        
        // For now, add to local activity until channels are fully integrated
        const newActivity: TeamActivity = {
          id: Date.now().toString(),
          type: "comment_added",
          message: `posted: "${newMessage}"`,
          user: "You",
          timestamp: "just now",
          icon: "💬"
        };
        setActivity([newActivity, ...activity]);
        setNewMessage("");// TODO: Implement actual message sending when channels are set up
        // await sendMessage({ channelId, content: newMessage });
      } catch (error) {
        console.error('Failed to send message:', error);
        // Show error toast or notification
      }
    }
  };

  const handleTaskStatusChange = (taskId: string, newStatus: string) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, status: newStatus as Task['status'] } : task
    ));
  };

  const getTeamStats = () => {
    if (!team) return { completedTasks: 0, totalTasks: 0, avgPerformance: 0 };
    
    const completedTasks = tasks.filter(task => task.status === 'done').length;
    const totalTasks = tasks.length;
    const avgPerformance = team.members.reduce((acc, member) => acc + member.performance, 0) / team.members.length;
    
    return { completedTasks, totalTasks, avgPerformance };
  };

  const stats = getTeamStats();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[1200px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <LayoutDashboardIcon className="h-5 w-5" />
              <span>Team Dashboard</span>
            </div>
            
            {/* Team Selector */}
            {allTeams.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Team:</span>
                <select
                  value={team?.id || ""}
                  onChange={(e) => handleTeamSelect(e.target.value)}
                  className="px-3 py-1 border border-input bg-background rounded-md text-sm font-medium min-w-[200px]"
                >
                  {allTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </DialogTitle>
          <DialogDescription>
            View team performance, manage tasks, and track project progress in real-time.
          </DialogDescription>
        </DialogHeader>

        {/* Team Info Bar */}
        {team && (
          <div className="flex items-center space-x-3 p-4 bg-muted/30 rounded-lg">
            <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", team.color)}>
              <UsersIcon className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{team.name}</h3>
              <p className="text-sm text-muted-foreground">
                {team.projectName} • {team.members.length} members • Lead: {team.lead}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">{team.performance}%</div>
                <div className="text-xs text-muted-foreground">Performance</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">{team.workload}%</div>
                <div className="text-xs text-muted-foreground">Workload</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Team Overview & Stats */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Tasks Completed</h4>
                  <CheckCircleIcon className="h-4 w-4 text-green-500" />
                </div>
                <div className="text-2xl font-bold">{stats.completedTasks}/{stats.totalTasks}</div>
                <p className="text-xs text-muted-foreground">
                  {Math.round((stats.completedTasks / stats.totalTasks) * 100)}% completion rate
                </p>
              </div>

              <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Team Performance</h4>
                  <TrendingUpIcon className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-2xl font-bold text-blue-600">{Math.round(stats.avgPerformance)}%</div>
                <p className="text-xs text-muted-foreground">
                  +3% from last week
                </p>
              </div>

              <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Active Members</h4>
                  <ActivityIcon className="h-4 w-4 text-purple-500" />
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {team?.members.filter(m => m.status === 'online').length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  of {team?.members.length || 0} total members
                </p>
              </div>
            </div>

            {/* Current Tasks */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Current Tasks</h3>
                {/* Only show add task button if user has permission */}
                {teamPermissions.permissions.canCreateTasks && (
                  <Button size="sm">
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={cn("w-3 h-3 rounded-full", priorityColors[task.priority])} />
                      <div>
                        <h4 className="font-medium text-sm">{task.title}</h4>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <span>Assigned to: {task.assignee}</span>
                          <span>•</span>
                          <span>Due: {task.dueDate}</span>
                          <span>•</span>
                          <span>{task.estimatedHours}h estimated</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge className={cn("text-xs", statusColors[task.status])}>
                        {task.status.replace('-', ' ')}
                      </Badge>
                      {/* Only allow status changes if user can assign tasks */}
                      {teamPermissions.permissions.canAssignTasks && (
                        <select
                          value={task.status}
                          onChange={(e) => handleTaskStatusChange(task.id, e.target.value)}
                          className="px-2 py-1 border border-input bg-background rounded text-xs"
                        >
                          <option value="todo">To Do</option>
                          <option value="in_progress">In Progress</option>
                          <option value="review">Review</option>
                          <option value="done">Done</option>
                        </select>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline Risk Indicators */}
            {teamTimelineData && teamTimelineData.riskFactors.length > 0 && (
              <div className="border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <AlertTriangleIcon className="h-5 w-5 text-yellow-600" />
                  <h3 className="font-semibold text-lg text-yellow-800 dark:text-yellow-200">Timeline Risks</h3>
                </div>
                <div className="space-y-2">
                  {teamTimelineData.riskFactors.map((risk, index) => (
                    <div key={index} className="text-sm text-yellow-700 dark:text-yellow-300">
                      • {risk}
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-xs text-yellow-600 dark:text-yellow-400">
                  Project completion estimated: {teamTimelineData.estimatedCompletion} 
                  ({Math.round(teamTimelineData.actualProgress)}% complete)
                </div>
              </div>
            )}

            {/* Critical Path Status */}
            {teamTimelineData?.teams.find(t => t.teamId === team?.id)?.criticalPath && (
              <div className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <TargetIcon className="h-5 w-5 text-red-600" />
                  <h3 className="font-semibold text-red-800 dark:text-red-200">Critical Path Team</h3>
                </div>
                <p className="text-sm text-red-700 dark:text-red-300">
                  This team is on the critical path for project completion. Any delays may impact the overall timeline.
                </p>
              </div>
            )}

            {/* Team Members Quick View */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-4">Team Members</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {team?.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center space-x-3 p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg"
                  >
                    <div className="relative">
                      <Avatar className="w-10 h-10">
                        <div className="w-full h-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                          {member.name.charAt(0)}
                        </div>
                      </Avatar>
                      <div className={cn(
                        "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white",
                        member.status === 'online' ? "bg-green-500" :
                        member.status === 'busy' ? "bg-red-500" :
                        member.status === 'away' ? "bg-yellow-500" : "bg-gray-400"
                      )} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{member.name}</div>
                      <div className="text-xs text-muted-foreground">{member.role}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium">{member.currentTasks} tasks</div>
                      <div className="text-xs text-muted-foreground">{member.workload}% load</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Activity & Communication */}
          <div className="space-y-6">
            
            {/* Quick Actions */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-4">Quick Actions</h3>
              <div className="space-y-2">
                {teamPermissions.permissions.canCreateEvents && (
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Schedule Meeting
                  </Button>
                )}
                {teamPermissions.permissions.canCreateReports && (
                  <Button variant="outline" className="w-full justify-start">
                    <FileTextIcon className="h-4 w-4 mr-2" />
                    Create Report
                  </Button>
                )}
                {teamPermissions.permissions.canViewAnalytics && (
                  <Button variant="outline" className="w-full justify-start">
                    <BarChart3Icon className="h-4 w-4 mr-2" />
                    View Analytics
                  </Button>
                )}
                {teamPermissions.permissions.canAccessSettings && (
                  <Button variant="outline" className="w-full justify-start">
                    <SettingsIcon className="h-4 w-4 mr-2" />
                    Team Settings
                  </Button>
                )}
                
                {/* Show limited actions message if user has no permissions */}
                {!teamPermissions.permissions.canCreateEvents && 
                 !teamPermissions.permissions.canCreateReports && 
                 !teamPermissions.permissions.canViewAnalytics && 
                 !teamPermissions.permissions.canAccessSettings && (
                  <div className="text-center p-4 text-muted-foreground">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <LockIcon className="h-4 w-4" />
                      <span className="text-sm">Limited Access</span>
                    </div>
                    <p className="text-xs">Contact team lead for additional permissions</p>
                  </div>
                )}
              </div>
            </div>

            {/* Team Communication */}
            {activeTab === "communication" && (
              <div className="space-y-6">
                {/* Test the Fixed Communication System */}
                <SimpleCommunicationTest />
                
                {/* Original Communication Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Team Communication</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsChatOpen(true)}
                      disabled={!teamPermissions.permissions.canSendMessages}
                      className="flex items-center space-x-2"
                    >
                      <MessageSquareIcon className="h-4 w-4" />
                      <span>Open Chat</span>
                    </Button>
                  </div>

                  {/* Message Input - Only show if user can send messages */}
                  {teamPermissions.permissions.canSendMessages && (
                    <div className="flex space-x-2 mb-4">
                      <Input
                        placeholder="Send a message to the team..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        className="flex-1"
                      />
                      <Button size="sm" onClick={handleSendMessage}>
                        <SendIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {/* Recent Activity */}
                  {teamPermissions.permissions.canViewChat ? (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {activity.map((item) => (
                        <div key={item.id} className="flex items-start space-x-3 text-sm">
                          <span className="text-lg">{item.icon}</span>
                          <div className="flex-1">
                            <span className="font-medium">{item.user}</span>
                            <span className="text-muted-foreground"> {item.message}</span>
                            <div className="text-xs text-muted-foreground mt-1">{item.timestamp}</div>
                          </div>
                          {/* Show moderation options for privileged users */}
                          {teamPermissions.permissions.canModeratChat && item.user !== "You" && (
                            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                              <MoreHorizontalIcon className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-4 text-muted-foreground">
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <LockIcon className="h-4 w-4" />
                        <span className="text-sm">Chat Access Restricted</span>
                      </div>
                      <p className="text-xs">You don't have permission to view team chat</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Achievements */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-4">Team Achievements</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <AwardIcon className="h-5 w-5 text-yellow-500" />
                  <div>
                    <div className="font-medium text-sm">Sprint Champion</div>
                    <div className="text-xs text-muted-foreground">Completed all sprint goals</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <ZapIcon className="h-5 w-5 text-blue-500" />
                  <div>
                    <div className="font-medium text-sm">High Performance</div>
                    <div className="text-xs text-muted-foreground">90%+ team performance</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <TargetIcon className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="font-medium text-sm">Milestone Master</div>
                    <div className="text-xs text-muted-foreground">Hit 3 milestones in a row</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 