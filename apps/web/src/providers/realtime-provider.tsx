import { createContext, useContext, ReactNode } from 'react';

// Minimal context type
interface RealtimeContextType {
  isConnected: boolean;
  connectionStatus: 'disconnected';
  onlineUsers: any[];
  currentUser: null;
  subscribeToTasks: () => () => void;
  subscribeToComments: () => () => void;
  sendBroadcast: () => void;
  subscribeToBroadcast: () => () => void;
  updatePresence: () => void;
  updateCursor: () => void;
  joinRoom: () => void;
  leaveRoom: () => void;
}

const RealtimeContext = createContext<RealtimeContextType | null>(null);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  // Provide a no-op context
  const contextValue: RealtimeContextType = {
    isConnected: false,
    connectionStatus: 'disconnected',
    onlineUsers: [],
    currentUser: null,
    subscribeToTasks: () => () => {},
    subscribeToComments: () => () => {},
    sendBroadcast: () => {},
    subscribeToBroadcast: () => () => {},
    updatePresence: () => {},
    updateCursor: () => {},
    joinRoom: () => {},
    leaveRoom: () => {},
  };
  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtimeProvider() {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtimeProvider must be used within a RealtimeProvider');
  return ctx;
} 