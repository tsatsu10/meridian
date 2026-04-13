/**
 * Project Events - Real-time WebSocket Event Handlers
 * Manages project-related WebSocket events for live updates
 * 
 * Events emitted:
 * - project:created - New project created
 * - project:updated - Project details updated
 * - project:deleted - Project archived/deleted
 * - project:members:added - Team member added
 * - project:members:removed - Team member removed
 * - project:status:changed - Project status changed
 * - project:progress:updated - Project progress/tasks changed
 */

import { Server as SocketIOServer, Socket } from "socket.io";
import logger from '../utils/logger';

export interface ProjectEventPayload {
  projectId: string;
  workspaceId: string;
  action: "created" | "updated" | "deleted" | "archived" | "restored";
  project?: any;
  data?: any;
  userId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ProjectMemberEventPayload {
  projectId: string;
  workspaceId: string;
  action: "added" | "removed" | "updated";
  members?: any[];
  userId?: string;
  timestamp: Date;
}

export interface ProjectProgressEventPayload {
  projectId: string;
  workspaceId: string;
  progress: number;
  taskCount: {
    total: number;
    completed: number;
    pending: number;
  };
  health: "on-track" | "at-risk" | "behind" | "ahead";
  timestamp: Date;
}

/**
 * Initialize project event handlers
 */
export function initializeProjectEvents(io: SocketIOServer) {
  logger.debug("📡 Initializing Project Events WebSocket Handlers");

  io.on("connection", (socket: Socket) => {
    logger.debug(`✅ Client connected: ${socket.id}`);

    // Join workspace room for broadcasting
    socket.on("workspace:join", (workspaceId: string) => {
      const room = `workspace:${workspaceId}`;
      socket.join(room);
      logger.debug(`👥 Socket ${socket.id} joined room: ${room}`);
    });

    // Leave workspace room
    socket.on("workspace:leave", (workspaceId: string) => {
      const room = `workspace:${workspaceId}`;
      socket.leave(room);
      logger.debug(`👤 Socket ${socket.id} left room: ${room}`);
    });

    // Join project-specific room
    socket.on("project:join", (projectId: string, workspaceId: string) => {
      const room = `project:${projectId}`;
      socket.join(room);
      logger.debug(`📌 Socket ${socket.id} joined room: ${room}`);
    });

    // Leave project room
    socket.on("project:leave", (projectId: string) => {
      const room = `project:${projectId}`;
      socket.leave(room);
      logger.debug(`📍 Socket ${socket.id} left room: ${room}`);
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      logger.debug(`❌ Client disconnected: ${socket.id}`);
    });
  });
}

/**
 * Emit project creation event to workspace
 */
export function emitProjectCreated(
  io: SocketIOServer,
  payload: ProjectEventPayload
) {
  const room = `workspace:${payload.workspaceId}`;
  logger.debug(
    `🆕 Broadcasting project:created to ${room}:`,
    payload.project?.name
  );

  io.to(room).emit("project:created", {
    ...payload,
    action: "created",
    timestamp: new Date(),
  });
}

/**
 * Emit project update event to workspace and project room
 */
export function emitProjectUpdated(
  io: SocketIOServer,
  payload: ProjectEventPayload
) {
  const workspaceRoom = `workspace:${payload.workspaceId}`;
  const projectRoom = `project:${payload.projectId}`;

  logger.debug(
    `✏️ Broadcasting project:updated to ${workspaceRoom} and ${projectRoom}`
  );

  io.to(workspaceRoom).emit("project:updated", {
    ...payload,
    action: "updated",
    timestamp: new Date(),
  });

  io.to(projectRoom).emit("project:updated", {
    ...payload,
    action: "updated",
    timestamp: new Date(),
  });
}

/**
 * Emit project deletion event
 */
export function emitProjectDeleted(
  io: SocketIOServer,
  payload: ProjectEventPayload
) {
  const room = `workspace:${payload.workspaceId}`;
  logger.debug(
    `🗑️ Broadcasting project:deleted to ${room}:`,
    payload.projectId
  );

  io.to(room).emit("project:deleted", {
    ...payload,
    action: "deleted",
    timestamp: new Date(),
  });
}

/**
 * Emit project status change event
 */
export function emitProjectStatusChanged(
  io: SocketIOServer,
  payload: ProjectEventPayload
) {
  const workspaceRoom = `workspace:${payload.workspaceId}`;
  const projectRoom = `project:${payload.projectId}`;

  logger.debug(
    `🔄 Broadcasting project:status:changed - new status: ${payload.data?.status}`
  );

  io.to(workspaceRoom).emit("project:status:changed", {
    projectId: payload.projectId,
    newStatus: payload.data?.status,
    timestamp: new Date(),
  });

  io.to(projectRoom).emit("project:status:changed", {
    projectId: payload.projectId,
    newStatus: payload.data?.status,
    timestamp: new Date(),
  });
}

/**
 * Emit team member changes
 */
export function emitProjectMembersUpdated(
  io: SocketIOServer,
  payload: ProjectMemberEventPayload
) {
  const workspaceRoom = `workspace:${payload.workspaceId}`;
  const projectRoom = `project:${payload.projectId}`;

  logger.debug(
    `👥 Broadcasting project:members:${payload.action} - ${payload.members?.length} members`
  );

  io.to(workspaceRoom).emit("project:members:updated", {
    ...payload,
    timestamp: new Date(),
  });

  io.to(projectRoom).emit("project:members:updated", {
    ...payload,
    timestamp: new Date(),
  });
}

/**
 * Emit project progress update
 */
export function emitProjectProgressUpdated(
  io: SocketIOServer,
  payload: ProjectProgressEventPayload
) {
  const workspaceRoom = `workspace:${payload.workspaceId}`;
  const projectRoom = `project:${payload.projectId}`;

  logger.debug(
    `📊 Broadcasting project:progress:updated - Progress: ${payload.progress}%, Health: ${payload.health}`
  );

  io.to(workspaceRoom).emit("project:progress:updated", {
    ...payload,
    timestamp: new Date(),
  });

  io.to(projectRoom).emit("project:progress:updated", {
    ...payload,
    timestamp: new Date(),
  });
}

/**
 * Emit bulk project update
 */
export function emitProjectBulkUpdated(
  io: SocketIOServer,
  workspaceId: string,
  payload: any
) {
  const room = `workspace:${workspaceId}`;

  logger.debug(
    `🔀 Broadcasting project:bulk:updated - ${payload.projectIds?.length} projects affected`
  );

  io.to(room).emit("project:bulk:updated", {
    ...payload,
    timestamp: new Date(),
  });
}

export default initializeProjectEvents;

