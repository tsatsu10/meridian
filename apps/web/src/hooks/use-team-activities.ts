// Phase 2: Team Collaboration Hub - Team Activity Hooks
// React hooks for team activity tracking and feed

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from '@/lib/toast';
import { fetchApi } from "@/lib/fetch";
import { useTeamWebSocket } from "./use-team-websocket";
import { useEffect } from "react";

// Types
export interface TeamActivity {
  id: string;
  teamId: string;
  userEmail: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface LogActivityData {
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, any>;
}

export interface ActivitiesResponse {
  success: boolean;
  data: {
    activities: TeamActivity[];
    groupedActivities: Record<string, TeamActivity[]>;
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  };
}

export interface ActivityAnalytics {
  summary: {
    totalActivities: number;
    uniqueUsers: number;
    averageActivitiesPerUser: number;
  };
  breakdown: {
    byType: Record<string, number>;
    byUser: Record<string, number>;
    byDay: Record<string, number>;
  };
  timeRange: {
    start: string;
    end: string;
  };
}

// Hook for logging team activities
export function useLogTeamActivity(teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: LogActivityData) => {
      const response = await fetchApi(`/team/${teamId}/activities`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: () => {
      // Invalidate activities query to refresh the feed
      queryClient.invalidateQueries({ queryKey: ["team-activities", teamId] });
      queryClient.invalidateQueries({ queryKey: ["team-activity-analytics", teamId] });
    },
    onError: (error: any) => {
      console.error("Failed to log activity:", error);
      // Don't show toast for activity logging failures as they're background operations
    },
  });
}

// Hook for getting team activity feed
export function useTeamActivities(
  teamId: string,
  options: {
    limit?: number;
    offset?: number;
    action?: string;
    userEmail?: string;
    enabled?: boolean;
  } = {}
) {
  const { limit = 50, offset = 0, action, userEmail, enabled = true } = options;

  return useQuery({
    queryKey: ["team-activities", teamId, { limit, offset, action, userEmail }],
    queryFn: async (): Promise<ActivitiesResponse> => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });
      
      if (action) params.append("action", action);
      if (userEmail) params.append("userEmail", userEmail);
      
      const response = await fetchApi(`/team/${teamId}/feed?${params}`);
      return response;
    },
    enabled: enabled && !!teamId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Hook for team activity analytics
export function useTeamActivityAnalytics(teamId: string) {
  return useQuery({
    queryKey: ["team-activity-analytics", teamId],
    queryFn: async (): Promise<ActivityAnalytics> => {
      const response = await fetchApi(`/team/${teamId}/analytics`);
      return response.data;
    },
    enabled: !!teamId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

// Hook for real-time team activity updates
export function useTeamActivitiesRealtime(teamId: string, workspaceId: string, userEmail?: string) {
  const queryClient = useQueryClient();
  
  // WebSocket connection for real-time updates
  const { isConnected } = useTeamWebSocket(workspaceId || "", teamId, userEmail);

  // Handle real-time activity events
  useEffect(() => {
    if (!isConnected || !teamId) return;

    const handleActivityLogged = (event: any) => {
      if (event.data.teamId === teamId) {
        // Invalidate activities to show new activity
        queryClient.invalidateQueries({ queryKey: ["team-activities", teamId] });
        
        // Show notification for important activities from other users
        if (event.data.userEmail !== userEmail && shouldShowActivityNotification(event.data.action)) {
          toast.info(
            `📊 ${formatActivityMessage(event.data)}`,
            {
              description: `by ${event.data.userEmail}`,
            }
          );
        }
      }
    };

    // TODO: Add actual WebSocket event listeners when WebSocket integration is complete
    // For now, we'll use periodic polling as fallback
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["team-activities", teamId] });
    }, 60000); // Poll every minute for activities

    return () => {
      clearInterval(interval);
    };
  }, [isConnected, teamId, userEmail, queryClient]);

  return {
    isConnected,
  };
}

// Utility function to determine if activity should show notification
function shouldShowActivityNotification(action: string): boolean {
  const importantActions = [
    "team_created",
    "member_joined",
    "member_left",
    "role_changed",
    "announcement_sent",
    "project_assigned",
    "milestone_completed",
  ];
  
  return importantActions.includes(action);
}

// Utility function to format activity message
function formatActivityMessage(activity: TeamActivity): string {
  const actionMessages: Record<string, string> = {
    message_sent: "sent a message",
    announcement_sent: "made an announcement",
    member_joined: "joined the team",
    member_left: "left the team",
    role_changed: "changed their role",
    task_created: "created a task",
    task_completed: "completed a task",
    project_assigned: "was assigned to project",
    milestone_completed: "completed a milestone",
    file_uploaded: "uploaded a file",
  };
  
  return actionMessages[activity.action] || activity.action.replace(/_/g, " ");
}

// Hook for common team activity logging shortcuts
export function useTeamActivityLogger(teamId: string) {
  const logActivity = useLogTeamActivity(teamId);

  return {
    logMessage: (messageId: string, content: string) =>
      logActivity.mutate({
        action: "message_sent",
        targetType: "message",
        targetId: messageId,
        metadata: { contentLength: content.length },
      }),

    logAnnouncement: (messageId: string, content: string) =>
      logActivity.mutate({
        action: "announcement_sent",
        targetType: "message",
        targetId: messageId,
        metadata: { contentLength: content.length, priority: "high" },
      }),

    logMemberJoined: (memberEmail: string) =>
      logActivity.mutate({
        action: "member_joined",
        targetType: "user",
        targetId: memberEmail,
        metadata: { joinedAt: new Date().toISOString() },
      }),

    logMemberLeft: (memberEmail: string) =>
      logActivity.mutate({
        action: "member_left",
        targetType: "user",
        targetId: memberEmail,
        metadata: { leftAt: new Date().toISOString() },
      }),

    logRoleChanged: (memberEmail: string, oldRole: string, newRole: string) =>
      logActivity.mutate({
        action: "role_changed",
        targetType: "user",
        targetId: memberEmail,
        metadata: { oldRole, newRole, changedAt: new Date().toISOString() },
      }),

    logTaskAssigned: (taskId: string, assigneeEmail: string) =>
      logActivity.mutate({
        action: "task_assigned",
        targetType: "task",
        targetId: taskId,
        metadata: { assigneeEmail, assignedAt: new Date().toISOString() },
      }),

    logFileUpload: (fileName: string, fileSize: number) =>
      logActivity.mutate({
        action: "file_uploaded",
        targetType: "file",
        targetId: fileName,
        metadata: { fileName, fileSize, uploadedAt: new Date().toISOString() },
      }),
  };
}