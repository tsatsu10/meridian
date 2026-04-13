// @epic-2.2-realtime: Real-time activity widget for live workspace updates
import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUnifiedWebSocket } from '@/hooks/useUnifiedWebSocket';
import useAuth from '@/components/providers/auth-provider/hooks/use-auth';
import useWorkspaceStore from '@/store/workspace';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/cn";

interface ActivityItem {
  id: string;
  type: "task_completed" | "task_created" | "project_created" | "team_joined" | "comment_added" | "file_uploaded";
  user: string;
  description: string;
  timestamp: string;
  project?: string;
  isLive?: boolean;
}

interface RealTimeActivityWidgetProps {
  activities: ActivityItem[];
  onlineCount?: number;
  height?: number;
  className?: string;
  showHeader?: boolean;
  workspaceId?: string;
}

const activityIcons = {
  task_completed: "✅",
  task_created: "📝",
  project_created: "📁",
  team_joined: "👋",
  comment_added: "💬",
  file_uploaded: "📎",
};

const activityColors = {
  task_completed: "text-green-600",
  task_created: "text-blue-600",
  project_created: "text-purple-600",
  team_joined: "text-yellow-600",
  comment_added: "text-orange-600",
  file_uploaded: "text-pink-600",
};

export function RealTimeActivityWidget({ 
  activities = [], 
  onlineCount = 0, 
  height = 400, 
  className = '', 
  showHeader = true 
}: RealTimeActivityWidgetProps) {
  const { user } = useAuth()
  const { workspace } = useWorkspaceStore()
  const { connectionState } = useUnifiedWebSocket({ 
    enabled: !!user?.email,
    userEmail: user?.email || 'elidegbotse@gmail.com',
    workspaceId: workspace?.id || 'demo-workspace-123'
  });
  const isConnected = connectionState.isConnected;
  const [liveActivities, setLiveActivities] = useState<Set<string>>(new Set());

  // Mark activities as live when they come in real-time
  useEffect(() => {
    if (activities.length > 0) {
      const latestActivity = activities[0];
      if (latestActivity?.isLive) {
        setLiveActivities(prev => new Set(prev.add(latestActivity.id)));
        
        // Remove live indicator after 10 seconds
        setTimeout(() => {
          setLiveActivities(prev => {
            const newSet = new Set(prev);
            newSet.delete(latestActivity.id);
            return newSet;
          });
        }, 10000);
      }
    }
  }, [activities]);

  const getTimeAgo = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return "just now";
    }
  };

  const renderActivity = (activity: ActivityItem) => {
    const isLive = liveActivities.has(activity.id);
    const icon = activityIcons[activity.type] || "📝";

    return (
      <div
        key={activity.id}
        className={cn(
          "flex items-start space-x-3 p-3 rounded-lg transition-all duration-300",
          isLive ? "bg-blue-50 border border-blue-200 shadow-sm" : "hover:bg-gray-50"
        )}
      >
        <div className="relative">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {activity.user.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {isLive && (
            <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
          )}
        </div>
        
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-sm">{icon}</span>
            <span className="text-sm font-medium">{activity.user}</span>
            <span className="text-sm text-gray-600">{activity.description}</span>
            {isLive && (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                Live
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <span>{getTimeAgo(activity.timestamp)}</span>
            {activity.project && (
              <>
                <span>•</span>
                <span className="text-blue-600">{activity.project}</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={cn("rounded-lg border bg-card shadow-sm flex flex-col", className)} style={{ height }}>
      {showHeader && (
        <div className="flex items-center justify-between p-6 border-b">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Team Activity</span>
            </h2>
            <p className="text-sm text-muted-foreground">Live updates from your team</p>
          </div>
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <div className="h-2 w-2 bg-green-500 rounded-full mr-1 animate-pulse" />
                {onlineCount} online
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-gray-50 text-gray-700">
                Offline
              </Badge>
            )}
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full p-6">
          <div className="space-y-2">
            {activities.length > 0 ? (
              activities.slice(0, 10).map(renderActivity)
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm font-medium">No recent activity</p>
                <p className="text-xs">Team actions will appear here</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
      
      {activities.length > 0 && (
        <div className="p-4 border-t">
          <Button variant="ghost" className="w-full" asChild>
            <Link to="/dashboard/communication">
              View All Activity
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

// Compact version for smaller spaces
export function CompactActivityWidget({
  activities,
  onlineCount = 0,
  className = "",
}: {
  activities: ActivityItem[];
  onlineCount?: number;
  className?: string;
}) {
  const { user } = useAuth()
  const { workspace } = useWorkspaceStore()
  const { connectionState } = useUnifiedWebSocket({ 
    enabled: !!user?.email,
    userEmail: user?.email || 'elidegbotse@gmail.com',
    workspaceId: workspace?.id || 'demo-workspace-123'
  });
  const isConnected = connectionState.isConnected;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Recent Activity</h3>
        {isConnected ? (
          <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
            {onlineCount} online
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs">
            Offline
          </Badge>
        )}
      </div>
      
      <div className="space-y-3">
        {activities.slice(0, 5).map((activity) => (
          <div key={activity.id} className="flex items-start space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
              <span className="text-xs">{activityIcons[activity.type] || "📝"}</span>
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-sm leading-none">
                <span className="font-medium">{activity.user}</span>{" "}
                <span className="text-muted-foreground">{activity.description}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {activity.project && `${activity.project} • `}
                {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 