// Phase 1.2: Unified Chat Store with Workspace Synchronization
// Manages chat state with project context and workspace synchronization

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { ProjectChatContext, EnhancedMessage, ChannelProjectBinding, ChatWorkflowAction } from '@/types/chat-context';
import { logger } from "../lib/logger";

interface ChatStore {
  // Core State
  workspaceId: string;
  selectedChannelId: string | null;
  selectedProjectId: string | null;
  selectedTaskId: string | null;
  
  // Context Management
  activeContext: ProjectChatContext | null;
  channelProjectBindings: Map<string, ChannelProjectBinding>;
  
  // Message Enhancement
  enhancedMessages: Map<string, EnhancedMessage>;
  pendingActions: ChatWorkflowAction[];
  
  // UI State
  showProjectContext: boolean;
  showTaskReferences: boolean;
  filterByProject: string | null;
  
  // Real-time State
  typingUsers: Map<string, string[]>; // channelId -> userEmails[]
  onlineUsers: string[];
  connectionState: {
    isConnected: boolean;
    error: string | null;
    reconnectAttempts: number;
  };
  
  // Actions
  setWorkspaceId: (workspaceId: string) => void;
  setSelectedChannel: (channelId: string | null) => void;
  setActiveContext: (context: ProjectChatContext | null) => void;
  setProjectContext: (projectId: string | null, taskId?: string) => void;
  
  // Channel-Project Binding
  bindChannelToProject: (channelId: string, binding: Omit<ChannelProjectBinding, 'channelId'>) => void;
  unbindChannelFromProject: (channelId: string) => void;
  getChannelBinding: (channelId: string) => ChannelProjectBinding | null;
  
  // Message Enhancement
  addEnhancedMessage: (message: EnhancedMessage) => void;
  updateMessage: (messageId: string, updates: Partial<EnhancedMessage>) => void;
  getEnhancedMessage: (messageId: string) => EnhancedMessage | null;
  
  // Workflow Actions
  addPendingAction: (action: ChatWorkflowAction) => void;
  removePendingAction: (actionId: string) => void;
  executePendingAction: (actionId: string) => Promise<void>;
  
  // Real-time Management
  setTypingUsers: (channelId: string, users: string[]) => void;
  addTypingUser: (channelId: string, userEmail: string) => void;
  removeTypingUser: (channelId: string, userEmail: string) => void;
  setOnlineUsers: (users: string[]) => void;
  setConnectionState: (state: Partial<ChatStore['connectionState']>) => void;
  
  // Synchronization
  syncWithWorkspaceState: () => void;
  syncWithProjectState: (projectId: string) => void;
  clearChatState: () => void;
  
  // Filters and Search
  setProjectFilter: (projectId: string | null) => void;
  toggleProjectContext: () => void;
  toggleTaskReferences: () => void;
}

const useUnifiedChatStore = create<ChatStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial State
        workspaceId: '',
        selectedChannelId: null,
        selectedProjectId: null,
        selectedTaskId: null,
        activeContext: null,
        channelProjectBindings: new Map(),
        enhancedMessages: new Map(),
        pendingActions: [],
        showProjectContext: true,
        showTaskReferences: true,
        filterByProject: null,
        typingUsers: new Map(),
        onlineUsers: [],
        connectionState: {
          isConnected: false,
          error: null,
          reconnectAttempts: 0,
        },

        // Core Actions
        setWorkspaceId: (workspaceId: string) => {
          set({ workspaceId });
        },

        setSelectedChannel: (channelId: string | null) => {
          set({ selectedChannelId: channelId });
        },

        setActiveContext: (context: ProjectChatContext | null) => {
          set({ activeContext: context });
        },

        setProjectContext: (projectId: string | null, taskId?: string) => {
          const state = get();
          set({ 
            selectedProjectId: projectId,
            selectedTaskId: taskId || null,
            activeContext: projectId ? {
              workspaceId: state.workspaceId,
              projectId,
              taskId,
              channelType: taskId ? 'task-discussion' : 'project-specific'
            } : null
          });
        },

        // Channel-Project Binding - simplified
        bindChannelToProject: (channelId: string, binding: Omit<ChannelProjectBinding, 'channelId'>) => {
          // Simplified implementation to prevent loops
          logger.info("Binding channel to project:");
        },

        unbindChannelFromProject: (channelId: string) => {
          // Simplified implementation to prevent loops
          logger.info("Unbinding channel from project:");
        },

        getChannelBinding: (channelId: string) => {
          // Return null for now to prevent loops
          return null;
        },

        // Message Enhancement - simplified
        addEnhancedMessage: (message: EnhancedMessage) => {
          // Simplified to prevent loops
          logger.info("Adding enhanced message:");
        },

        updateMessage: (messageId: string, updates: Partial<EnhancedMessage>) => {
          // Simplified to prevent loops
          logger.info("Updating message:");
        },

        getEnhancedMessage: (messageId: string) => {
          // Return null for now
          return null;
        },

        // Workflow Actions
        addPendingAction: (action: ChatWorkflowAction) => {
          const state = get();
          set({ pendingActions: [...state.pendingActions, action] });
        },

        removePendingAction: (actionId: string) => {
          const state = get();
          set({ 
            pendingActions: state.pendingActions.filter(action => 
              `${action.type}-${action.messageId}` !== actionId
            )
          });
        },

        executePendingAction: async (actionId: string) => {
          const state = get();
          const action = state.pendingActions.find(a => 
            `${a.type}-${a.messageId}` === actionId
          );
          
          if (action) {
            try {
              // TODO: Implement actual action execution
              logger.info("Executing action:");
              
              // Remove from pending after execution
              state.removePendingAction(actionId);
            } catch (error) {
              console.error('Failed to execute action:', error);
            }
          }
        },

        // Real-time Management
        setTypingUsers: (channelId: string, users: string[]) => {
          const state = get();
          const newTypingUsers = new Map(state.typingUsers);
          newTypingUsers.set(channelId, users);
          set({ typingUsers: newTypingUsers });
        },

        addTypingUser: (channelId: string, userEmail: string) => {
          const state = get();
          const currentUsers = state.typingUsers.get(channelId) || [];
          if (!currentUsers.includes(userEmail)) {
            const newTypingUsers = new Map(state.typingUsers);
            newTypingUsers.set(channelId, [...currentUsers, userEmail]);
            set({ typingUsers: newTypingUsers });
          }
        },

        removeTypingUser: (channelId: string, userEmail: string) => {
          const state = get();
          const currentUsers = state.typingUsers.get(channelId) || [];
          const newUsers = currentUsers.filter(u => u !== userEmail);
          const newTypingUsers = new Map(state.typingUsers);
          newTypingUsers.set(channelId, newUsers);
          set({ typingUsers: newTypingUsers });
        },

        setOnlineUsers: (users: string[]) => {
          set({ onlineUsers: users });
        },

        setConnectionState: (state: Partial<ChatStore['connectionState']>) => {
          const currentState = get().connectionState;
          set({ connectionState: { ...currentState, ...state } });
        },

        // Synchronization - simplified to prevent loops
        syncWithWorkspaceState: () => {
          // Placeholder for future implementation
        },

        syncWithProjectState: (projectId: string) => {
          // Placeholder for future implementation
        },

        clearChatState: () => {
          set({
            selectedChannelId: null,
            selectedProjectId: null,
            selectedTaskId: null,
            activeContext: null,
            enhancedMessages: new Map(),
            pendingActions: [],
            typingUsers: new Map(),
            filterByProject: null,
          });
        },

        // Filters and Search
        setProjectFilter: (projectId: string | null) => {
          set({ filterByProject: projectId });
        },

        toggleProjectContext: () => {
          const state = get();
          set({ showProjectContext: !state.showProjectContext });
        },

        toggleTaskReferences: () => {
          const state = get();
          set({ showTaskReferences: !state.showTaskReferences });
        },
      }),
      {
        name: 'unified-chat-store',
        // Only persist certain parts of the state
        partialize: (state) => ({
          workspaceId: state.workspaceId,
          showProjectContext: state.showProjectContext,
          showTaskReferences: state.showTaskReferences,
        }),
      }
    ),
    {
      name: 'unified-chat-store',
    }
  )
);

export default useUnifiedChatStore;

// Selector hooks for better performance
export const useActiveContext = () => useUnifiedChatStore(state => state.activeContext);
export const useSelectedChannel = () => useUnifiedChatStore(state => state.selectedChannelId);
export const useProjectContext = () => useUnifiedChatStore(state => ({
  projectId: state.selectedProjectId,
  taskId: state.selectedTaskId,
}));
export const useConnectionState = () => useUnifiedChatStore(state => state.connectionState);
export const usePendingActions = () => useUnifiedChatStore(state => state.pendingActions);
export const useTypingUsers = (channelId: string) => 
  useUnifiedChatStore(state => state.typingUsers.get(channelId) || []);