import type UnifiedWebSocketServer from './unified-websocket-server';

let wsServerInstance: UnifiedWebSocketServer | null = null;

export function setWebSocketServer(server: UnifiedWebSocketServer) {
  wsServerInstance = server;
}

export function getWebSocketServer(): UnifiedWebSocketServer | null {
  return wsServerInstance;
}

export function hasWebSocketServer(): boolean {
  return wsServerInstance !== null;
}

