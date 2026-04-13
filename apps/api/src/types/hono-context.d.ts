/**
 * Augment Hono context keys set by middleware and route helpers.
 * Merges with `ContextVariableMap` in `middlewares/redis-session.ts`.
 */
import 'hono';
import type { Server as SocketIoServer } from 'socket.io';

declare module 'hono' {
  interface ContextVariableMap {
    /** Workspace scope (optional; set by workspace middleware when present) */
    workspaceId?: string;
    /** Legacy alias used by some PDF routes */
    userTable?: { id: string };
    /** Socket.IO server when attached by bootstrap (calendar broadcasts, etc.) */
    io?: SocketIoServer;
  }
}
