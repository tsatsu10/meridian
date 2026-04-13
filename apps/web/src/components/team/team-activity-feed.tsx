// Phase 2: Team Collaboration Hub - Team Activity Feed Component
// Real-time activity tracking and display

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Activity,
  MessageCircle,
  UserPlus,
  UserMinus,
  Shield,
  FileText,
  CheckCircle2,
  Calendar,
  Megaphone,
  Filter,
  Clock,
  TrendingUp,
  Users,
  MoreVertical,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDistanceToNow, format } from "date-fns";

// Hooks
import { 
  useTeamActivities, 
  useTeamActivityAnalytics,
  useTeamActivitiesRealtime,
  type TeamActivity 
} from "@/hooks/use-team-activities";
import useWorkspaceStore from "@/store/workspace";

interface TeamActivityFeedProps {
  teamId: string;
  teamName: string;
  className?: string;
  showAnalytics?: boolean;
}

export default function TeamActivityFeed({ 
  teamId, 
  teamName, 
  className,
  showAnalytics = true 
}: TeamActivityFeedProps) {
  const { workspace } = useWorkspaceStore();
  const [filter, setFilter] = useState<string>("all");
  const [limit, setLimit] = useState(50);

  // API hooks
  const { 
    data: activitiesData, 
    isLoading,
    refetch 
  } = useTeamActivities(teamId, { 
    limit,
    action: filter === "all" ? undefined : filter 
  });

  const { data: analytics } = useTeamActivityAnalytics(teamId);
  
  // Real-time updates
  useTeamActivitiesRealtime(teamId, workspace?.id || "");

  const activities = activitiesData?.data?.activities || [];
  const groupedActivities = activitiesData?.data?.groupedActivities || {};

  // Activity type filters
  const activityFilters = [
    { value: "all", label: "All Activities", icon: Activity },
    { value: "message_sent", label: "Messages", icon: MessageCircle },
    { value: "member_joined", label: "Joins", icon: UserPlus },
    { value: "member_left", label: "Leaves", icon: UserMinus },
    { value: "role_changed", label: "Role Changes", icon: Shield },
    { value: "announcement_sent", label: "Announcements", icon: Megaphone },
    { value: "task_assigned", label: "Tasks", icon: FileText },
    { value: "file_uploaded", label: "Files", icon: FileText },
  ];

  // Get activity icon
  const getActivityIcon = (action: string) => {
    const iconMap: Record<string, React.ComponentType<any>> = {
      message_sent: MessageCircle,
      announcement_sent: Megaphone,
      member_joined: UserPlus,
      member_left: UserMinus,
      role_changed: Shield,
      task_created: FileText,
      task_assigned: FileText,
      task_completed: CheckCircle2,
      file_uploaded: FileText,
      project_assigned: Calendar,
      milestone_completed: CheckCircle2,
    };
    
    return iconMap[action] || Activity;
  };

  // Format activity message
  const formatActivityMessage = (activity: TeamActivity): string => {
    const messages: Record<string, string> = {
      message_sent: "sent a message",
      announcement_sent: "made an announcement",
      member_joined: "joined the team",
      member_left: "left the team",
      role_changed: `changed role from ${activity.metadata.oldRole} to ${activity.metadata.newRole}`,
      task_created: "created a task",
      task_assigned: `was assigned task: ${activity.metadata.taskTitle}`,
      task_completed: `completed task: ${activity.metadata.taskTitle}`,
      file_uploaded: `uploaded file: ${activity.metadata.fileName}`,
      project_assigned: `was assigned to project: ${activity.metadata.projectName}`,
      milestone_completed: `completed milestone: ${activity.metadata.milestoneName}`,
    };
    
    return messages[activity.action] || activity.action.replace(/_/g, " ");
  };

  // Get activity color
  const getActivityColor = (action: string): string => {
    const colorMap: Record<string, string> = {
      message_sent: "text-blue-600",
      announcement_sent: "text-orange-600",
      member_joined: "text-green-600",
      member_left: "text-red-600",
      role_changed: "text-purple-600",
      task_completed: "text-green-600",
      file_uploaded: "text-blue-600",
    };
    
    return colorMap[action] || "text-gray-600";
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Analytics Summary */}
      {showAnalytics && analytics && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Activity Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {analytics.summary.totalActivities}
                </div>
                <div className="text-sm text-muted-foreground">Total Activities</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {analytics.summary.uniqueUsers}
                </div>
                <div className="text-sm text-muted-foreground">Active Members</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {analytics.summary.averageActivitiesPerUser}
                </div>
                <div className="text-sm text-muted-foreground">Avg per Member</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Feed */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Team Activity
            <Badge variant="secondary" className="text-xs">
              {activities.length} recent
            </Badge>
          </CardTitle>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                {activityFilters.find(f => f.value === filter)?.label || "Filter"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {activityFilters.map((filterOption) => {
                const IconComponent = filterOption.icon;
                return (
                  <DropdownMenuItem
                    key={filterOption.value}
                    onClick={() => setFilter(filterOption.value)}
                  >
                    <IconComponent className="w-4 h-4 mr-2" />
                    {filterOption.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>

        <Separator />

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-muted-foreground">Loading activities...</div>
            </div>
          ) : activities.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <Activity className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No activities yet</p>
                <p className="text-sm text-muted-foreground">
                  Team activities will appear here
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4">
              {Object.keys(groupedActivities).length > 0 ? (
                // Grouped by date
                Object.entries(groupedActivities).map(([date, dayActivities]) => (
                  <div key={date} className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="text-sm font-medium text-muted-foreground">
                        {format(new Date(date), "EEEE, MMMM d, yyyy")}
                      </div>
                      <div className="flex-1 h-px bg-border" />
                      <Badge variant="secondary" className="text-xs">
                        {dayActivities.length} activities
                      </Badge>
                    </div>
                    
                    <div className="space-y-3">
                      {dayActivities.map((activity) => (
                        <ActivityItem
                          key={activity.id}
                          activity={activity}
                          getActivityIcon={getActivityIcon}
                          formatActivityMessage={formatActivityMessage}
                          getActivityColor={getActivityColor}
                        />
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                // Linear list
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <ActivityItem
                      key={activity.id}
                      activity={activity}
                      getActivityIcon={getActivityIcon}
                      formatActivityMessage={formatActivityMessage}
                      getActivityColor={getActivityColor}
                    />
                  ))}
                </div>
              )}
              
              {activities.length >= limit && (
                <div className="text-center mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLimit(prev => prev + 50)}
                  >
                    Load More Activities
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </Card>
    </div>
  );
}

// Activity Item Component
interface ActivityItemProps {
  activity: TeamActivity;
  getActivityIcon: (action: string) => React.ComponentType<any>;
  formatActivityMessage: (activity: TeamActivity) => string;
  getActivityColor: (action: string) => string;
}

function ActivityItem({
  activity,
  getActivityIcon,
  formatActivityMessage,
  getActivityColor,
}: ActivityItemProps) {
  const IconComponent = getActivityIcon(activity.action);
  const message = formatActivityMessage(activity);
  const colorClass = getActivityColor(activity.action);

  return (
    <div className="flex items-start gap-3 group">
      <div className={cn(
        "flex items-center justify-center w-8 h-8 rounded-full bg-muted",
        colorClass.replace("text-", "bg-").replace("-600", "-100")
      )}>
        <IconComponent className={cn("w-4 h-4", colorClass)} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Avatar className="w-6 h-6">
            <AvatarFallback className="text-xs">
              {activity.userEmail.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium text-sm">{activity.userEmail}</span>
          <span className="text-sm text-muted-foreground">{message}</span>
        </div>
        
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
          </span>
          
          {/* Additional metadata */}
          {activity.metadata && Object.keys(activity.metadata).length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <div className="p-2">
                  <div className="text-sm font-medium mb-2">Activity Details</div>
                  {Object.entries(activity.metadata).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{key}:</span>
                      <span className="font-mono">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      
      <div className="text-xs text-muted-foreground">
        {format(new Date(activity.createdAt), "HH:mm")}
      </div>
    </div>
  );
}