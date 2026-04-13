// @epic-3.4-teams: Real-time team WebSocket hook
// @persona-sarah: PM needs real-time team updates
// @persona-david: Team lead needs instant collaboration feedback

import { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUnifiedWebSocket } from "./useUnifiedWebSocket";
import { toast } from '@/lib/toast';
import { logger } from "../lib/logger";

export interface TeamWebSocketEvents {
  team_created: (data: any) => void;
  team_updated: (data: any) => void;
  team_deleted: (data: any) => void;
  member_joined: (data: any) => void;
  member_left: (data: any) => void;
  team_role_changed: (data: any) => void;
  presence_update: (data: any) => void;
}

export function useTeamWebSocket(workspaceId: string, teamId?: string, userEmail?: string) {
  const queryClient = useQueryClient();
  
  // Only enable WebSocket when we have valid user and workspace
  const isEnabled = !!(userEmail && userEmail.length > 0 && workspaceId && workspaceId.length > 0);
  
  const { socket, connectionState, isConnected } = useUnifiedWebSocket({
    userEmail: userEmail || '',
    workspaceId: workspaceId || '',
    enabled: isEnabled,
    onError: (error) => {
      console.warn("Team WebSocket connection error:", error);
      // Don't show error toast for expected connection issues during initial load
    },
  });

  // Team event handlers with error handling
  const handleTeamCreated = useCallback((event: any) => {
    try {
      logger.info("🎉 Team created:");
      
      // Invalidate all teams queries to include new team
      queryClient.invalidateQueries({ 
        queryKey: ["teams"], 
        exact: false 
      });
      
      // Show notification
      if (event.data?.name) {
        toast.success(`New team "${event.data.name}" created`);
      }
    } catch (error) {
      console.error("Error handling team created event:", error);
    }
  }, [queryClient]);

  const handleTeamUpdated = useCallback((event: any) => {
    try {
      logger.info("🔄 Team updated:");
      
      // Invalidate teams list and specific team
      queryClient.invalidateQueries({ queryKey: ["teams"], exact: false });
      if (event.teamId) {
        queryClient.invalidateQueries({ queryKey: ["team", event.teamId] });
      }
      
      // Show notification if it's the current team
      if (teamId === event.teamId && event.data?.name) {
        toast.success(`Team "${event.data.name}" updated`);
      }
    } catch (error) {
      console.error("Error handling team updated event:", error);
    }
  }, [queryClient, teamId]);

  const handleTeamDeleted = useCallback((event: any) => {
    try {
      logger.info("🗑️ Team deleted:");
      
      // Invalidate teams list to remove deleted team
      queryClient.invalidateQueries({ queryKey: ["teams"], exact: false });
      if (event.data?.teamId) {
        queryClient.removeQueries({ queryKey: ["team", event.data.teamId] });
      }
      
      // Show notification
      if (event.data?.teamName) {
        toast.info(`Team "${event.data.teamName}" was deleted`);
      }
    } catch (error) {
      console.error("Error handling team deleted event:", error);
    }
  }, [queryClient]);

  const handleMemberJoined = useCallback((event: any) => {
    logger.info("👥 Member joined:");
    
    // Invalidate teams list and specific team to update member count
    queryClient.invalidateQueries({ queryKey: ["teams"], exact: false });
    queryClient.invalidateQueries({ queryKey: ["team", event.teamId] });
    
    // Show notification if it's the current team
    if (teamId === event.teamId) {
      toast.success(`${event.data.name || event.data.email} joined the team`);
    }
  }, [queryClient, teamId]);

  const handleMemberLeft = useCallback((event: any) => {
    logger.info("👋 Member left:");
    
    // Invalidate teams list and specific team to update member count
    queryClient.invalidateQueries({ queryKey: ["teams"], exact: false });
    queryClient.invalidateQueries({ queryKey: ["team", event.teamId] });
    
    // Show notification if it's the current team
    if (teamId === event.teamId) {
      toast.info(`${event.data.memberEmail} left the team`);
    }
  }, [queryClient, teamId]);

  const handleRoleChanged = useCallback((event: any) => {
    logger.info("🔄 Role changed:");
    
    // Invalidate teams list and specific team to update member roles
    queryClient.invalidateQueries({ queryKey: ["teams"], exact: false });
    queryClient.invalidateQueries({ queryKey: ["team", event.teamId] });
    
    // Show notification if it's the current team
    if (teamId === event.teamId) {
      toast.success(
        `${event.data.memberEmail} role changed from ${event.data.oldRole} to ${event.data.newRole}`
      );
    }
  }, [queryClient, teamId]);

  const handlePresenceUpdate = useCallback((event: any) => {
    logger.info("👀 Presence update:");
    
    // Update presence data in cache without full refetch
    queryClient.setQueryData(["team", event.teamId], (oldData: any) => {
      if (!oldData) return oldData;
      
      return {
        ...oldData,
        members: oldData.members.map((member: any) => 
          member.email === event.data.userEmail
            ? { ...member, status: event.data.presence }
            : member
        ),
      };
    });
  }, [queryClient]);

  // Set up event listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    logger.info("🔌 Setting up team WebSocket listeners");

    // Register event listeners
    socket.on("team:created", handleTeamCreated);
    socket.on("team:updated", handleTeamUpdated);
    socket.on("team:deleted", handleTeamDeleted);
    socket.on("team:member_joined", handleMemberJoined);
    socket.on("team:member_left", handleMemberLeft);
    socket.on("team:role_changed", handleRoleChanged);
    socket.on("team:update", handlePresenceUpdate);

    // Join workspace room for team events
    socket.emit("join_room", `workspace:${workspaceId}`);
    
    // Join specific team room if teamId provided
    if (teamId) {
      socket.emit("join_room", `team:${teamId}`);
    }

    return () => {
      logger.info("🔌 Cleaning up team WebSocket listeners");
      
      // Remove event listeners
      socket.off("team:created", handleTeamCreated);
      socket.off("team:updated", handleTeamUpdated);
      socket.off("team:deleted", handleTeamDeleted);
      socket.off("team:member_joined", handleMemberJoined);
      socket.off("team:member_left", handleMemberLeft);
      socket.off("team:role_changed", handleRoleChanged);
      socket.off("team:update", handlePresenceUpdate);

      // Leave rooms
      socket.emit("leave_room", `workspace:${workspaceId}`);
      if (teamId) {
        socket.emit("leave_room", `team:${teamId}`);
      }
    };
  }, [
    socket,
    isConnected,
    workspaceId,
    teamId,
    handleTeamCreated,
    handleTeamUpdated,
    handleTeamDeleted,
    handleMemberJoined,
    handleMemberLeft,
    handleRoleChanged,
    handlePresenceUpdate,
  ]);

  return {
    isConnected,
    socket,
    connectionState,
  };
}