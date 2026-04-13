/**
 * useProjectSocket Hook
 * Manages project-related WebSocket connections and event listeners
 * Automatically invalidates React Query cache on real-time updates
 */

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import { getAppConfig } from "@/config/app-mode";
import useAuth from "@/components/providers/auth-provider/hooks/use-auth";

interface ProjectUpdateEvent {
  projectId: string;
  workspaceId: string;
  action: "created" | "updated" | "deleted" | "archived";
  project?: any;
  timestamp: Date;
}

interface ProjectProgressEvent {
  projectId: string;
  workspaceId: string;
  progress: number;
  health: "on-track" | "at-risk" | "behind" | "ahead";
}

export function useProjectSocket(workspaceId: string | undefined) {
  const socketRef = useRef<Socket | null>(null);
  const queryClient = useQueryClient();
  const listenerRef = useRef<boolean>(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!workspaceId || !user?.email) {
      console.warn('⚠️ Missing workspaceId or user email for WebSocket connection');
      return;
    }

    // Initialize socket connection
    if (!socketRef.current) {
      const config = getAppConfig();
      socketRef.current = io(config.wsUrl, {
        withCredentials: true,
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        query: {
          userEmail: user.email,
          workspaceId: workspaceId,
        },
      });

      // Connection events
      socketRef.current.on("connect", () => {toast.success("Live updates enabled", {
          description: "Changes are now synced in real-time",
          duration: 2000,
        });
      });

      socketRef.current.on("disconnect", () => {toast.error("Lost connection", {
          description: "Reconnecting...",
          duration: 2000,
        });
      });

      socketRef.current.on("connect_error", (error) => {
        console.error("🔥 WebSocket connection error:", error);
      });

      socketRef.current.on("error", (error) => {
        console.error("🔥 WebSocket error:", error);
      });
    }

    // Only set up listeners once
    if (!listenerRef.current) {
      setupEventListeners(socketRef.current, queryClient, workspaceId);
      listenerRef.current = true;
    }

    // Join workspace room
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("workspace:join", workspaceId);}

    // Cleanup function
    return () => {
      if (socketRef.current) {
        socketRef.current.emit("workspace:leave", workspaceId);// Don't disconnect - keep connection alive for other components
      }
    };
  }, [workspaceId, user?.email, queryClient]);

  return socketRef.current;
}

/**
 * Set up WebSocket event listeners
 */
function setupEventListeners(
  socket: Socket,
  queryClient: any,
  workspaceId: string
) {// Project Created
  socket.on("project:created", (event: ProjectUpdateEvent) => {// Invalidate projects query to trigger refetch
    queryClient.invalidateQueries({
      queryKey: ["projects", event.workspaceId],
    });

    // Show toast notification
    toast.success("New project created", {
      description: `"${event.project?.name}" was created by another user`,
      duration: 3000,
    });
  });

  // Project Updated
  socket.on("project:updated", (event: ProjectUpdateEvent) => {// Invalidate both workspace and specific project queries
    queryClient.invalidateQueries({
      queryKey: ["projects", event.workspaceId],
    });
    queryClient.invalidateQueries({
      queryKey: ["project", event.projectId],
    });

    // Show subtle notification
    toast.info("Project updated", {
      description: `"${event.project?.name}" was updated`,
      duration: 2000,
    });
  });

  // Project Deleted
  socket.on("project:deleted", (event: ProjectUpdateEvent) => {// Invalidate projects query
    queryClient.invalidateQueries({
      queryKey: ["projects", event.workspaceId],
    });

    // Show toast notification
    toast.warning("Project deleted", {
      description: "A project was deleted by another user",
      duration: 3000,
    });
  });

  // Project Status Changed
  socket.on(
    "project:status:changed",
    (event: {
      projectId: string;
      newStatus: string;
      timestamp: Date;
    }) => {queryClient.invalidateQueries({
        queryKey: ["projects"],
      });

      toast.info("Project status changed", {
        description: `Status updated to: ${event.newStatus}`,
        duration: 2000,
      });
    }
  );

  // Project Members Updated
  socket.on(
    "project:members:updated",
    (event: {
      projectId: string;
      action: string;
      members?: any[];
    }) => {queryClient.invalidateQueries({
        queryKey: ["projects"],
      });
      queryClient.invalidateQueries({
        queryKey: ["project", event.projectId, "members"],
      });

      const action =
        event.action === "added"
          ? "Member added"
          : event.action === "removed"
            ? "Member removed"
            : "Members updated";

      toast.info(action, {
        description: "Project team has been updated",
        duration: 2000,
      });
    }
  );

  // Project Progress Updated
  socket.on(
    "project:progress:updated",
    (event: ProjectProgressEvent) => {queryClient.invalidateQueries({
        queryKey: ["projects", event.workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["project", event.projectId],
      });

      // Toast only if significant change
      if (event.progress % 10 === 0) {
        toast.info("Progress updated", {
          description: `Progress: ${event.progress}% - Health: ${event.health}`,
          duration: 2000,
        });
      }
    }
  );

  // Bulk Project Update
  socket.on(
    "project:bulk:updated",
    (event: {
      action: string;
      projectIds: string[];
      timestamp: Date;
    }) => {queryClient.invalidateQueries({
        queryKey: ["projects"],
      });

      toast.info("Projects updated", {
        description: `${event.projectIds?.length} projects were updated in bulk`,
        duration: 2000,
      });
    }
  );
}

export default useProjectSocket;
