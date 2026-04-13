// Consolidated Communication Store
// Combines communicationSlice.ts, unified-chat-store.ts, and useCommunication.ts patterns
// into a single Zustand store with persistence for all real-time messaging, chat, and communication features

import React from 'react';
import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { logger } from "../../lib/logger";
import { API_BASE_URL } from "../../constants/urls";

// Types - consolidated from all communication-related stores
export interface Message {
  id: string;
  content: string;
  type: 'text' | 'file' | 'image' | 'video' | 'audio' | 'system' | 'task_reference';
  channelId?: string;
  threadId?: string;
  parentMessageId?: string;
  workspaceId: string;
  senderId: string;
  sender: {
    id: string;
    displayName: string;
    avatar?: string;
    status: 'online' | 'away' | 'busy' | 'offline';
  };
  mentions: string[];
  attachments: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
    thumbnail?: string;
  }>;
  reactions: Array<{
    emoji: string;
    users: Array<{
      id: string;
      displayName: string;
    }>;
  }>;
  editHistory: Array<{
    content: string;
    editedAt: string;
  }>;
  deliveryStatus: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  readBy: Array<{
    userId: string;
    readAt: string;
  }>;
  isEdited: boolean;
  isPinned: boolean;
  isDeleted: boolean;
  scheduledFor?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  type: 'public' | 'private' | 'direct' | 'group' | 'announcement';
  workspaceId: string;
  teamId?: string;
  projectId?: string;
  members: Array<{
    userId: string;
    role: 'admin' | 'member';
    joinedAt: string;
    lastReadAt?: string;
  }>;
  settings: {
    allowThreads: boolean;
    allowFileUploads: boolean;
    allowReactions: boolean;
    muteNotifications: boolean;
    retentionPolicy?: number;
  };
  lastMessage?: {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
  };
  unreadCount: number;
  mentionCount: number;
  isArchived: boolean;
  isStarred: boolean;
  createdAt: string;
  createdBy: string;
}

export interface DirectConversation {
  id: string;
  participants: Array<{
    userId: string;
    user: {
      id: string;
      displayName: string;
      avatar?: string;
      status: 'online' | 'away' | 'busy' | 'offline';
    };
    lastReadAt?: string;
  }>;
  lastMessage?: Message;
  unreadCount: number;
  isArchived: boolean;
  isStarred: boolean;
  isMuted: boolean;
  createdAt: string;
}

export interface Thread {
  id: string;
  parentMessageId: string;
  channelId?: string;
  participants: string[];
  lastMessage?: Message;
  messageCount: number;
  unreadCount: number;
  isFollowing: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserPresence {
  userId: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: string;
  customStatus?: string;
  activity?: {
    type: 'typing' | 'recording' | 'uploading';
    channelId?: string;
    since: string;
  };
}

export interface NotificationPreferences {
  channelId: string;
  mentions: boolean;
  allMessages: boolean;
  push: boolean;
  email: boolean;
  sound: boolean;
  keywords: string[];
}

export interface ProjectChatContext {
  workspaceId: string;
  projectId: string;
  taskId?: string;
  channelType: 'task-discussion' | 'project-specific';
}

export interface ChannelProjectBinding {
  channelId: string;
  projectId: string;
  taskId?: string;
  bindingType: 'task' | 'project' | 'milestone';
  createdAt: string;
}

export interface EnhancedMessage extends Message {
  projectContext?: ProjectChatContext;
  taskReferences?: string[];
  workflowActions?: Array<{
    type: 'create_task' | 'update_task' | 'assign_user' | 'set_deadline';
    data: Record<string, any>;
  }>;
}

export interface ChatWorkflowAction {
  id: string;
  type: 'create_task' | 'update_task' | 'assign_user' | 'set_deadline' | 'create_milestone';
  messageId: string;
  channelId: string;
  data: Record<string, any>;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  createdAt: string;
}

export interface FileUpload {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'failed';
  url?: string;
  error?: string;
  channelId: string;
  messageId?: string;
}

export interface CallParticipant {
  userId: string;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  isScreenSharing: boolean;
}

export interface Call {
  id: string;
  type: 'voice' | 'video';
  channelId: string;
  participants: CallParticipant[];
  status: 'ringing' | 'connecting' | 'connected' | 'ended';
  startedAt: string;
  endedAt?: string;
}

// State interface
export interface ConsolidatedCommunicationState {
  // Core Communication Data
  messages: Record<string, Message[]>; // channelId -> messages
  channels: Channel[];
  directConversations: DirectConversation[];
  threads: Record<string, Thread>;
  
  // Active Context
  activeChannelId: string | null;
  activeConversationId: string | null;
  activeThreadId: string | null;
  workspaceId: string;
  
  // Project Integration (from unified-chat-store)
  selectedProjectId: string | null;
  selectedTaskId: string | null;
  activeContext: ProjectChatContext | null;
  channelProjectBindings: Record<string, ChannelProjectBinding>;
  
  // Enhanced Messages and Workflow
  enhancedMessages: Record<string, EnhancedMessage>;
  pendingActions: ChatWorkflowAction[];
  
  // User Presence and Typing
  userPresence: Record<string, UserPresence>;
  typingUsers: Record<string, string[]>; // channelId -> userIds
  onlineUsers: string[];
  
  // Search and Filtering
  searchQuery: string;
  searchResults: Message[];
  messageFilters: {
    sender?: string;
    dateRange?: { from: string; to: string };
    hasAttachments?: boolean;
    isStarred?: boolean;
    mentions?: boolean;
  };
  filterByProject: string | null;
  
  // Unread Management
  totalUnreadCount: number;
  totalMentionCount: number;
  
  // UI State
  showChannelBrowser: boolean;
  showThreadPanel: boolean;
  showMembersList: boolean;
  showEmojiPicker: boolean;
  showAttachmentModal: boolean;
  showProjectContext: boolean;
  showTaskReferences: boolean;
  selectedMessageId: string | null;
  
  // Draft Messages
  drafts: Record<string, string>; // channelId -> draft content
  
  // File Uploads
  uploads: FileUpload[];
  
  // Voice/Video Calling
  currentCall: Call | null;
  
  // Notification Preferences
  notificationPreferences: Record<string, NotificationPreferences>;
  
  // Connection Status
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'reconnecting';
  lastConnectionTime: string | null;
  connectionError: string | null;
  reconnectAttempts: number;
  
  // Optimistic Updates
  pendingMessages: Message[];
  optimisticMessages: Message[];
  
  // Cache and Pagination
  pagination: Record<string, {
    hasMore: boolean;
    oldestMessageId?: string;
    newestMessageId?: string;
  }>;
  
  // Loading States
  loading: {
    channels: boolean;
    messages: boolean;
    conversations: boolean;
    search: boolean;
    sending: boolean;
    uploading: boolean;
    calling: boolean;
  };
  
  // Error States
  errors: {
    channels: string | null;
    messages: string | null;
    conversations: string | null;
    search: string | null;
    sending: string | null;
    uploading: string | null;
    calling: string | null;
  };
  
  lastUpdated: string | null;
}

// Store interface with actions
export interface ConsolidatedCommunicationStore extends ConsolidatedCommunicationState {
  // Core Channel Management
  loadChannels: (workspaceId: string) => Promise<void>;
  createChannel: (channelData: Partial<Channel>) => Promise<Channel | null>;
  updateChannel: (channelId: string, updates: Partial<Channel>) => Promise<void>;
  deleteChannel: (channelId: string) => Promise<void>;
  joinChannel: (channelId: string) => Promise<void>;
  leaveChannel: (channelId: string) => Promise<void>;
  
  // Message Management
  loadMessages: (channelId: string, options?: { before?: string; limit?: number }) => Promise<void>;
  sendMessage: (channelId: string, content: string, options?: {
    type?: Message['type'];
    parentMessageId?: string;
    attachments?: Array<{ id: string; name: string; url: string; type: string; size: number }>;
    mentions?: string[];
  }) => Promise<Message | null>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (messageId: string, emoji: string) => Promise<void>;
  pinMessage: (messageId: string) => Promise<void>;
  unpinMessage: (messageId: string) => Promise<void>;
  
  // Direct Conversations
  loadDirectConversations: (workspaceId: string) => Promise<void>;
  createDirectConversation: (workspaceId: string, userIds: string[]) => Promise<DirectConversation | null>;
  archiveConversation: (conversationId: string) => Promise<void>;
  unarchiveConversation: (conversationId: string) => Promise<void>;
  
  // Thread Management
  loadThreads: (channelId: string) => Promise<void>;
  createThread: (parentMessageId: string, channelId: string) => Promise<Thread | null>;
  followThread: (threadId: string) => Promise<void>;
  unfollowThread: (threadId: string) => Promise<void>;
  
  // Search and Filtering
  searchMessages: (workspaceId: string, query: string, filters?: ConsolidatedCommunicationState['messageFilters']) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setMessageFilters: (filters: ConsolidatedCommunicationState['messageFilters']) => void;
  clearSearch: () => void;
  setProjectFilter: (projectId: string | null) => void;
  
  // Active Context Management
  setWorkspaceId: (workspaceId: string) => void;
  setActiveChannel: (channelId: string | null) => void;
  setActiveConversation: (conversationId: string | null) => void;
  setActiveThread: (threadId: string | null) => void;
  setProjectContext: (projectId: string | null, taskId?: string) => void;
  
  // Project Integration
  bindChannelToProject: (channelId: string, binding: Omit<ChannelProjectBinding, 'channelId'>) => void;
  unbindChannelFromProject: (channelId: string) => void;
  getChannelBinding: (channelId: string) => ChannelProjectBinding | null;
  
  // Enhanced Messages and Workflow
  addEnhancedMessage: (message: EnhancedMessage) => void;
  updateEnhancedMessage: (messageId: string, updates: Partial<EnhancedMessage>) => void;
  getEnhancedMessage: (messageId: string) => EnhancedMessage | null;
  addPendingAction: (action: Omit<ChatWorkflowAction, 'id' | 'createdAt'>) => void;
  removePendingAction: (actionId: string) => void;
  executePendingAction: (actionId: string) => Promise<void>;
  
  // User Presence and Typing
  updateUserPresence: (presence: UserPresence) => void;
  setTypingUsers: (channelId: string, userIds: string[]) => void;
  addTypingUser: (channelId: string, userId: string) => void;
  removeTypingUser: (channelId: string, userId: string) => void;
  setOnlineUsers: (users: string[]) => void;
  startTyping: (channelId: string) => void;
  stopTyping: (channelId: string) => void;
  
  // Unread Management
  updateUnreadCount: (channelId: string, count: number, mentions?: number) => void;
  markAsRead: (channelId: string, messageId?: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  
  // Draft Management
  setDraft: (channelId: string, content: string) => void;
  clearDraft: (channelId: string) => void;
  getDraft: (channelId: string) => string;
  
  // File Upload Management
  uploadFile: (channelId: string, file: File, onProgress?: (progress: number) => void) => Promise<string | null>;
  addUpload: (upload: Omit<FileUpload, 'id'>) => string;
  updateUpload: (uploadId: string, updates: Partial<FileUpload>) => void;
  removeUpload: (uploadId: string) => void;
  
  // Voice/Video Calling
  startVoiceCall: (channelId: string, participants: string[]) => Promise<Call | null>;
  startVideoCall: (channelId: string, participants: string[]) => Promise<Call | null>;
  joinCall: (callId: string) => Promise<void>;
  leaveCall: () => Promise<void>;
  toggleMute: (userId?: string) => void;
  toggleVideo: (userId?: string) => void;
  toggleScreenShare: (userId?: string) => void;
  endCall: () => Promise<void>;
  
  // Connection Management
  setConnectionStatus: (status: ConsolidatedCommunicationState['connectionStatus']) => void;
  setConnectionError: (error: string | null) => void;
  reconnect: () => Promise<void>;
  disconnect: () => void;
  
  // Optimistic Updates
  addOptimisticMessage: (message: Message) => void;
  confirmOptimisticMessage: (tempId: string, confirmedMessage: Message) => void;
  failOptimisticMessage: (tempId: string, error?: string) => void;
  
  // UI State Management
  setShowChannelBrowser: (show: boolean) => void;
  setShowThreadPanel: (show: boolean) => void;
  setShowMembersList: (show: boolean) => void;
  setShowEmojiPicker: (show: boolean) => void;
  setShowAttachmentModal: (show: boolean) => void;
  toggleProjectContext: () => void;
  toggleTaskReferences: () => void;
  setSelectedMessageId: (messageId: string | null) => void;
  
  // Loading and Error Management
  setLoading: (key: keyof ConsolidatedCommunicationState['loading'], value: boolean) => void;
  setError: (key: keyof ConsolidatedCommunicationState['errors'], value: string | null) => void;
  clearErrors: () => void;
  clearError: (key: keyof ConsolidatedCommunicationState['errors']) => void;
  
  // Notification Preferences
  updateNotificationPreferences: (channelId: string, preferences: Partial<NotificationPreferences>) => void;
  getNotificationPreferences: (channelId: string) => NotificationPreferences | null;
  
  // Utility Functions
  getChannelById: (channelId: string) => Channel | null;
  getConversationById: (conversationId: string) => DirectConversation | null;
  getUserPresence: (userId: string) => UserPresence | null;
  getTypingUsersForChannel: (channelId: string) => string[];
  getUnreadChannels: () => Channel[];
  getUnreadConversations: () => DirectConversation[];
  getOnlineUsers: () => UserPresence[];
  getStarredChannels: () => Channel[];
  getRecentConversations: (limit?: number) => DirectConversation[];
  getActiveChannelMessages: () => Message[];
  
  // Synchronization and Cleanup
  syncWithWorkspaceState: () => void;
  syncWithProjectState: (projectId: string) => void;
  clearCommunicationState: () => void;
  resetActiveChannel: () => void;
  resetCommunication: () => void;
  
  // Pagination Management
  setPagination: (channelId: string, pagination: ConsolidatedCommunicationState['pagination'][string]) => void;
  getPagination: (channelId: string) => ConsolidatedCommunicationState['pagination'][string] | null;
}

const initialState: ConsolidatedCommunicationState = {
  // Core Communication Data
  messages: {},
  channels: [],
  directConversations: [],
  threads: {},
  
  // Active Context
  activeChannelId: null,
  activeConversationId: null,
  activeThreadId: null,
  workspaceId: '',
  
  // Project Integration
  selectedProjectId: null,
  selectedTaskId: null,
  activeContext: null,
  channelProjectBindings: {},
  
  // Enhanced Messages and Workflow
  enhancedMessages: {},
  pendingActions: [],
  
  // User Presence and Typing
  userPresence: {},
  typingUsers: {},
  onlineUsers: [],
  
  // Search and Filtering
  searchQuery: '',
  searchResults: [],
  messageFilters: {},
  filterByProject: null,
  
  // Unread Management
  totalUnreadCount: 0,
  totalMentionCount: 0,
  
  // UI State
  showChannelBrowser: false,
  showThreadPanel: false,
  showMembersList: false,
  showEmojiPicker: false,
  showAttachmentModal: false,
  showProjectContext: true,
  showTaskReferences: true,
  selectedMessageId: null,
  
  // Draft Messages
  drafts: {},
  
  // File Uploads
  uploads: [],
  
  // Voice/Video Calling
  currentCall: null,
  
  // Notification Preferences
  notificationPreferences: {},
  
  // Connection Status
  connectionStatus: 'disconnected',
  lastConnectionTime: null,
  connectionError: null,
  reconnectAttempts: 0,
  
  // Optimistic Updates
  pendingMessages: [],
  optimisticMessages: [],
  
  // Cache and Pagination
  pagination: {},
  
  // Loading States
  loading: {
    channels: false,
    messages: false,
    conversations: false,
    search: false,
    sending: false,
    uploading: false,
    calling: false
  },
  
  // Error States
  errors: {
    channels: null,
    messages: null,
    conversations: null,
    search: null,
    sending: null,
    uploading: null,
    calling: null
  },
  
  lastUpdated: null
};

export const useConsolidatedCommunicationStore = create<ConsolidatedCommunicationStore>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          ...initialState,

          // Core Channel Management
          loadChannels: async (workspaceId: string) => {
            set((state) => {
              state.loading.channels = true;
              state.errors.channels = null;
            });

            try {
              const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/channels`, {});

              if (!response.ok) {
                throw new Error('Failed to load channels');
              }

              const data = await response.json();

              set((state) => {
                state.loading.channels = false;
                state.channels = data.channels || [];
                state.workspaceId = workspaceId;
                
                // Calculate total unread counts
                state.totalUnreadCount = data.channels?.reduce((sum: number, channel: Channel) => sum + channel.unreadCount, 0) || 0;
                state.totalMentionCount = data.channels?.reduce((sum: number, channel: Channel) => sum + channel.mentionCount, 0) || 0;
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.loading.channels = false;
                state.errors.channels = error instanceof Error ? error.message : 'Failed to load channels';
              });
            }
          },

          createChannel: async (channelData: Partial<Channel>) => {
            set((state) => {
              state.loading.channels = true;
              state.errors.channels = null;
            });

            try {
              const response = await fetch(`${API_BASE_URL}/workspaces/${get().workspaceId}/channels`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(channelData)});

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to create channel');
              }

              const newChannel = await response.json();

              set((state) => {
                state.loading.channels = false;
                state.channels.unshift(newChannel.channel);
                state.lastUpdated = new Date().toISOString();
              });

              return newChannel.channel;
            } catch (error) {
              set((state) => {
                state.loading.channels = false;
                state.errors.channels = error instanceof Error ? error.message : 'Failed to create channel';
              });
              return null;
            }
          },

          updateChannel: async (channelId: string, updates: Partial<Channel>) => {
            try {
              const response = await fetch(`${API_BASE_URL}/channels/${channelId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)});

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to update channel');
              }

              const updatedChannel = await response.json();

              set((state) => {
                const index = state.channels.findIndex(c => c.id === channelId);
                if (index !== -1) {
                  state.channels[index] = { ...state.channels[index], ...updatedChannel.channel };
                }
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.errors.channels = error instanceof Error ? error.message : 'Failed to update channel';
              });
            }
          },

          deleteChannel: async (channelId: string) => {
            try {
              const response = await fetch(`${API_BASE_URL}/channels/${channelId}`, {
                method: 'DELETE'});

              if (!response.ok) {
                throw new Error('Failed to delete channel');
              }

              set((state) => {
                state.channels = state.channels.filter(c => c.id !== channelId);
                delete state.messages[channelId];
                if (state.activeChannelId === channelId) {
                  state.activeChannelId = null;
                }
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.errors.channels = error instanceof Error ? error.message : 'Failed to delete channel';
              });
            }
          },

          joinChannel: async (channelId: string) => {
            try {
              const response = await fetch(`${API_BASE_URL}/channels/${channelId}/join`, {
                method: 'POST'});

              if (!response.ok) {
                throw new Error('Failed to join channel');
              }

              const channelData = await response.json();

              set((state) => {
                const index = state.channels.findIndex(c => c.id === channelId);
                if (index !== -1) {
                  state.channels[index] = { ...state.channels[index], ...channelData.channel };
                } else {
                  state.channels.push(channelData.channel);
                }
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.errors.channels = error instanceof Error ? error.message : 'Failed to join channel';
              });
            }
          },

          leaveChannel: async (channelId: string) => {
            try {
              const response = await fetch(`${API_BASE_URL}/channels/${channelId}/leave`, {
                method: 'POST'});

              if (!response.ok) {
                throw new Error('Failed to leave channel');
              }

              set((state) => {
                state.channels = state.channels.filter(c => c.id !== channelId);
                delete state.messages[channelId];
                if (state.activeChannelId === channelId) {
                  state.activeChannelId = null;
                }
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.errors.channels = error instanceof Error ? error.message : 'Failed to leave channel';
              });
            }
          },

          // Message Management
          loadMessages: async (channelId: string, options?: { before?: string; limit?: number }) => {
            set((state) => {
              state.loading.messages = true;
              state.errors.messages = null;
            });

            try {
              const params = new URLSearchParams();
              if (options?.before) params.append('before', options.before);
              params.append('limit', (options?.limit || 50).toString());

              const response = await fetch(`${API_BASE_URL}/channels/${channelId}/messages?${params}`, {});

              if (!response.ok) {
                throw new Error('Failed to load messages');
              }

              const data = await response.json();

              set((state) => {
                state.loading.messages = false;
                
                if (data.pagination?.oldestMessageId) {
                  // Prepend older messages
                  state.messages[channelId] = [...(data.messages || []), ...(state.messages[channelId] || [])];
                } else {
                  // Set initial messages
                  state.messages[channelId] = data.messages || [];
                }
                
                if (data.pagination) {
                  state.pagination[channelId] = data.pagination;
                }
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.loading.messages = false;
                state.errors.messages = error instanceof Error ? error.message : 'Failed to load messages';
              });
            }
          },

          sendMessage: async (channelId: string, content: string, options?: {
            type?: Message['type'];
            parentMessageId?: string;
            attachments?: Array<{ id: string; name: string; url: string; type: string; size: number }>;
            mentions?: string[];
          }) => {
            set((state) => {
              state.loading.sending = true;
              state.errors.sending = null;
            });

            try {
              const response = await fetch(`${API_BASE_URL}/channels/${channelId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  content,
                  type: options?.type || 'text',
                  parentMessageId: options?.parentMessageId,
                  attachments: options?.attachments,
                  mentions: options?.mentions
                })});

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to send message');
              }

              const data = await response.json();

              set((state) => {
                state.loading.sending = false;
                
                // Add message to channel
                if (!state.messages[channelId]) {
                  state.messages[channelId] = [];
                }
                state.messages[channelId].push(data.message);
                
                // Clear draft
                delete state.drafts[channelId];
                
                // Update channel last message
                const channel = state.channels.find(c => c.id === channelId);
                if (channel) {
                  channel.lastMessage = {
                    id: data.message.id,
                    content: data.message.content,
                    senderId: data.message.senderId,
                    createdAt: data.message.createdAt
                  };
                }
                
                state.lastUpdated = new Date().toISOString();
              });

              return data.message;
            } catch (error) {
              set((state) => {
                state.loading.sending = false;
                state.errors.sending = error instanceof Error ? error.message : 'Failed to send message';
              });
              return null;
            }
          },

          editMessage: async (messageId: string, content: string) => {
            try {
              const response = await fetch(`${API_BASE_URL}/messages/${messageId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })});

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to edit message');
              }

              const data = await response.json();

              set((state) => {
                // Update message in all channels
                Object.keys(state.messages).forEach(channelId => {
                  const messages = state.messages[channelId];
                  const index = messages.findIndex(m => m.id === messageId);
                  if (index !== -1) {
                    messages[index] = { ...messages[index], ...data.message };
                  }
                });
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.errors.messages = error instanceof Error ? error.message : 'Failed to edit message';
              });
            }
          },

          deleteMessage: async (messageId: string) => {
            try {
              const response = await fetch(`${API_BASE_URL}/messages/${messageId}`, {
                method: 'DELETE'});

              if (!response.ok) {
                throw new Error('Failed to delete message');
              }

              set((state) => {
                // Remove message from all channels
                Object.keys(state.messages).forEach(channelId => {
                  state.messages[channelId] = state.messages[channelId].filter(m => m.id !== messageId);
                });
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.errors.messages = error instanceof Error ? error.message : 'Failed to delete message';
              });
            }
          },

          addReaction: async (messageId: string, emoji: string) => {
            try {
              const response = await fetch(`${API_BASE_URL}/messages/${messageId}/reactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emoji })});

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to add reaction');
              }

              const data = await response.json();

              set((state) => {
                // Update reaction in all channels
                Object.values(state.messages).forEach(messages => {
                  const message = messages.find(m => m.id === messageId);
                  if (message) {
                    const existingReaction = message.reactions.find(r => r.emoji === data.reaction.emoji);
                    if (existingReaction) {
                      existingReaction.users = data.reaction.users;
                    } else {
                      message.reactions.push(data.reaction);
                    }
                  }
                });
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.errors.messages = error instanceof Error ? error.message : 'Failed to add reaction';
              });
            }
          },

          removeReaction: async (messageId: string, emoji: string) => {
            try {
              const response = await fetch(`${API_BASE_URL}/messages/${messageId}/reactions`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emoji })});

              if (!response.ok) {
                throw new Error('Failed to remove reaction');
              }

              set((state) => {
                // Remove reaction from all channels
                Object.values(state.messages).forEach(messages => {
                  const message = messages.find(m => m.id === messageId);
                  if (message) {
                    message.reactions = message.reactions.filter(r => r.emoji !== emoji);
                  }
                });
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.errors.messages = error instanceof Error ? error.message : 'Failed to remove reaction';
              });
            }
          },

          pinMessage: async (messageId: string) => {
            try {
              const response = await fetch(`${API_BASE_URL}/messages/${messageId}/pin`, {
                method: 'POST'});

              if (!response.ok) {
                throw new Error('Failed to pin message');
              }

              set((state) => {
                Object.values(state.messages).forEach(messages => {
                  const message = messages.find(m => m.id === messageId);
                  if (message) {
                    message.isPinned = true;
                  }
                });
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.errors.messages = error instanceof Error ? error.message : 'Failed to pin message';
              });
            }
          },

          unpinMessage: async (messageId: string) => {
            try {
              const response = await fetch(`${API_BASE_URL}/messages/${messageId}/unpin`, {
                method: 'POST'});

              if (!response.ok) {
                throw new Error('Failed to unpin message');
              }

              set((state) => {
                Object.values(state.messages).forEach(messages => {
                  const message = messages.find(m => m.id === messageId);
                  if (message) {
                    message.isPinned = false;
                  }
                });
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.errors.messages = error instanceof Error ? error.message : 'Failed to unpin message';
              });
            }
          },

          // Direct Conversations
          loadDirectConversations: async (workspaceId: string) => {
            set((state) => {
              state.loading.conversations = true;
              state.errors.conversations = null;
            });

            try {
              const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/conversations`, {});

              if (!response.ok) {
                throw new Error('Failed to load conversations');
              }

              const data = await response.json();

              set((state) => {
                state.loading.conversations = false;
                state.directConversations = data.conversations || [];
                
                // Add to total unread count
                const conversationUnread = data.conversations?.reduce(
                  (sum: number, conv: DirectConversation) => sum + conv.unreadCount, 0
                ) || 0;
                state.totalUnreadCount += conversationUnread;
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.loading.conversations = false;
                state.errors.conversations = error instanceof Error ? error.message : 'Failed to load conversations';
              });
            }
          },

          createDirectConversation: async (workspaceId: string, userIds: string[]) => {
            try {
              const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/conversations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userIds })});

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to create conversation');
              }

              const data = await response.json();

              set((state) => {
                state.directConversations.unshift(data.conversation);
                state.lastUpdated = new Date().toISOString();
              });

              return data.conversation;
            } catch (error) {
              set((state) => {
                state.errors.conversations = error instanceof Error ? error.message : 'Failed to create conversation';
              });
              return null;
            }
          },

          archiveConversation: async (conversationId: string) => {
            try {
              const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/archive`, {
                method: 'POST'});

              if (!response.ok) {
                throw new Error('Failed to archive conversation');
              }

              set((state) => {
                const conversation = state.directConversations.find(c => c.id === conversationId);
                if (conversation) {
                  conversation.isArchived = true;
                }
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.errors.conversations = error instanceof Error ? error.message : 'Failed to archive conversation';
              });
            }
          },

          unarchiveConversation: async (conversationId: string) => {
            try {
              const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/unarchive`, {
                method: 'POST'});

              if (!response.ok) {
                throw new Error('Failed to unarchive conversation');
              }

              set((state) => {
                const conversation = state.directConversations.find(c => c.id === conversationId);
                if (conversation) {
                  conversation.isArchived = false;
                }
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.errors.conversations = error instanceof Error ? error.message : 'Failed to unarchive conversation';
              });
            }
          },

          // Thread Management
          loadThreads: async (channelId: string) => {
            try {
              const response = await fetch(`${API_BASE_URL}/channels/${channelId}/threads`, {});

              if (!response.ok) {
                throw new Error('Failed to load threads');
              }

              const data = await response.json();

              set((state) => {
                data.threads?.forEach((thread: Thread) => {
                  state.threads[thread.id] = thread;
                });
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.errors.messages = error instanceof Error ? error.message : 'Failed to load threads';
              });
            }
          },

          createThread: async (parentMessageId: string, channelId: string) => {
            try {
              const response = await fetch(`${API_BASE_URL}/messages/${parentMessageId}/thread`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channelId })});

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to create thread');
              }

              const data = await response.json();

              set((state) => {
                state.threads[data.thread.id] = data.thread;
                state.lastUpdated = new Date().toISOString();
              });

              return data.thread;
            } catch (error) {
              set((state) => {
                state.errors.messages = error instanceof Error ? error.message : 'Failed to create thread';
              });
              return null;
            }
          },

          followThread: async (threadId: string) => {
            try {
              const response = await fetch(`${API_BASE_URL}/threads/${threadId}/follow`, {
                method: 'POST'});

              if (!response.ok) {
                throw new Error('Failed to follow thread');
              }

              set((state) => {
                const thread = state.threads[threadId];
                if (thread) {
                  thread.isFollowing = true;
                }
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.errors.messages = error instanceof Error ? error.message : 'Failed to follow thread';
              });
            }
          },

          unfollowThread: async (threadId: string) => {
            try {
              const response = await fetch(`${API_BASE_URL}/threads/${threadId}/unfollow`, {
                method: 'POST'});

              if (!response.ok) {
                throw new Error('Failed to unfollow thread');
              }

              set((state) => {
                const thread = state.threads[threadId];
                if (thread) {
                  thread.isFollowing = false;
                }
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.errors.messages = error instanceof Error ? error.message : 'Failed to unfollow thread';
              });
            }
          },

          // Search and Filtering
          searchMessages: async (workspaceId: string, query: string, filters?: ConsolidatedCommunicationState['messageFilters']) => {
            set((state) => {
              state.loading.search = true;
              state.errors.search = null;
              state.searchQuery = query;
              if (filters) {
                state.messageFilters = filters;
              }
            });

            try {
              const params = new URLSearchParams();
              params.append('q', query);

              if (filters) {
                Object.entries(filters).forEach(([key, value]) => {
                  if (value !== undefined) {
                    params.append(key, JSON.stringify(value));
                  }
                });
              }

              const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/search/messages?${params}`, {});

              if (!response.ok) {
                throw new Error('Failed to search messages');
              }

              const data = await response.json();

              set((state) => {
                state.loading.search = false;
                state.searchResults = data.messages || [];
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.loading.search = false;
                state.errors.search = error instanceof Error ? error.message : 'Failed to search messages';
              });
            }
          },

          setSearchQuery: (query: string) => {
            set((state) => {
              state.searchQuery = query;
            });
          },

          setMessageFilters: (filters: ConsolidatedCommunicationState['messageFilters']) => {
            set((state) => {
              state.messageFilters = filters;
            });
          },

          clearSearch: () => {
            set((state) => {
              state.searchQuery = '';
              state.searchResults = [];
              state.messageFilters = {};
            });
          },

          setProjectFilter: (projectId: string | null) => {
            set((state) => {
              state.filterByProject = projectId;
            });
          },

          // Active Context Management
          setWorkspaceId: (workspaceId: string) => {
            set((state) => {
              state.workspaceId = workspaceId;
            });
          },

          setActiveChannel: (channelId: string | null) => {
            set((state) => {
              state.activeChannelId = channelId;
              state.activeConversationId = null;
              state.activeThreadId = null;
            });
          },

          setActiveConversation: (conversationId: string | null) => {
            set((state) => {
              state.activeConversationId = conversationId;
              state.activeChannelId = null;
              state.activeThreadId = null;
            });
          },

          setActiveThread: (threadId: string | null) => {
            set((state) => {
              state.activeThreadId = threadId;
            });
          },

          setProjectContext: (projectId: string | null, taskId?: string) => {
            set((state) => {
              state.selectedProjectId = projectId;
              state.selectedTaskId = taskId || null;
              state.activeContext = projectId ? {
                workspaceId: state.workspaceId,
                projectId,
                taskId,
                channelType: taskId ? 'task-discussion' : 'project-specific'
              } : null;
            });
          },

          // Project Integration
          bindChannelToProject: (channelId: string, binding: Omit<ChannelProjectBinding, 'channelId'>) => {
            set((state) => {
              state.channelProjectBindings[channelId] = {
                channelId,
                ...binding,
                createdAt: new Date().toISOString()
              };
            });
          },

          unbindChannelFromProject: (channelId: string) => {
            set((state) => {
              delete state.channelProjectBindings[channelId];
            });
          },

          getChannelBinding: (channelId: string) => {
            return get().channelProjectBindings[channelId] || null;
          },

          // Enhanced Messages and Workflow
          addEnhancedMessage: (message: EnhancedMessage) => {
            set((state) => {
              state.enhancedMessages[message.id] = message;
            });
          },

          updateEnhancedMessage: (messageId: string, updates: Partial<EnhancedMessage>) => {
            set((state) => {
              const existing = state.enhancedMessages[messageId];
              if (existing) {
                state.enhancedMessages[messageId] = { ...existing, ...updates };
              }
            });
          },

          getEnhancedMessage: (messageId: string) => {
            return get().enhancedMessages[messageId] || null;
          },

          addPendingAction: (action: Omit<ChatWorkflowAction, 'id' | 'createdAt'>) => {
            set((state) => {
              const newAction: ChatWorkflowAction = {
                ...action,
                id: `${action.type}-${action.messageId}-${Date.now()}`,
                createdAt: new Date().toISOString()
              };
              state.pendingActions.push(newAction);
            });
          },

          removePendingAction: (actionId: string) => {
            set((state) => {
              state.pendingActions = state.pendingActions.filter(action => action.id !== actionId);
            });
          },

          executePendingAction: async (actionId: string) => {
            const state = get();
            const action = state.pendingActions.find(a => a.id === actionId);

            if (!action) return;

            set((state) => {
              const actionIndex = state.pendingActions.findIndex(a => a.id === actionId);
              if (actionIndex !== -1) {
                state.pendingActions[actionIndex].status = 'executing';
              }
            });

            try {
              // Implement actual action execution based on type
              switch (action.type) {
                case 'create_task':
                  // TODO: Implement task creation
                  logger.info("Creating task:");
                  break;
                case 'update_task':
                  // TODO: Implement task update
                  logger.info("Updating task:");
                  break;
                case 'assign_user':
                  // TODO: Implement user assignment
                  logger.info("Assigning user:");
                  break;
                case 'set_deadline':
                  // TODO: Implement deadline setting
                  logger.info("Setting deadline:");
                  break;
                case 'create_milestone':
                  // TODO: Implement milestone creation
                  logger.info("Creating milestone:");
                  break;
              }

              set((state) => {
                const actionIndex = state.pendingActions.findIndex(a => a.id === actionId);
                if (actionIndex !== -1) {
                  state.pendingActions[actionIndex].status = 'completed';
                }
              });

              // Remove completed action after a delay
              setTimeout(() => {
                state.removePendingAction(actionId);
              }, 5000);

            } catch (error) {
              set((state) => {
                const actionIndex = state.pendingActions.findIndex(a => a.id === actionId);
                if (actionIndex !== -1) {
                  state.pendingActions[actionIndex].status = 'failed';
                }
              });
            }
          },

          // User Presence and Typing
          updateUserPresence: (presence: UserPresence) => {
            set((state) => {
              state.userPresence[presence.userId] = presence;
              
              // Update online users list
              const onlineUserIndex = state.onlineUsers.findIndex(id => id === presence.userId);
              if (presence.status === 'online' && onlineUserIndex === -1) {
                state.onlineUsers.push(presence.userId);
              } else if (presence.status !== 'online' && onlineUserIndex !== -1) {
                state.onlineUsers.splice(onlineUserIndex, 1);
              }
            });
          },

          setTypingUsers: (channelId: string, userIds: string[]) => {
            set((state) => {
              state.typingUsers[channelId] = userIds;
            });
          },

          addTypingUser: (channelId: string, userId: string) => {
            set((state) => {
              if (!state.typingUsers[channelId]) {
                state.typingUsers[channelId] = [];
              }
              if (!state.typingUsers[channelId].includes(userId)) {
                state.typingUsers[channelId].push(userId);
              }
            });
          },

          removeTypingUser: (channelId: string, userId: string) => {
            set((state) => {
              if (state.typingUsers[channelId]) {
                state.typingUsers[channelId] = state.typingUsers[channelId].filter(id => id !== userId);
              }
            });
          },

          setOnlineUsers: (users: string[]) => {
            set((state) => {
              state.onlineUsers = users;
            });
          },

          startTyping: (channelId: string) => {
            // This would typically emit a WebSocket event
            // For now, we'll just add the current user to typing users
            const currentUserId = 'current-user'; // TODO: Get from auth context
            get().addTypingUser(channelId, currentUserId);

            // Auto-remove after 3 seconds
            setTimeout(() => {
              get().removeTypingUser(channelId, currentUserId);
            }, 3000);
          },

          stopTyping: (channelId: string) => {
            // This would typically emit a WebSocket event
            const currentUserId = 'current-user'; // TODO: Get from auth context
            get().removeTypingUser(channelId, currentUserId);
          },

          // Unread Management
          updateUnreadCount: (channelId: string, count: number, mentions = 0) => {
            set((state) => {
              // Update channel unread count
              const channel = state.channels.find(c => c.id === channelId);
              if (channel) {
                const oldCount = channel.unreadCount;
                const oldMentions = channel.mentionCount;
                
                channel.unreadCount = count;
                channel.mentionCount = mentions;
                
                // Update totals
                state.totalUnreadCount += (count - oldCount);
                state.totalMentionCount += (mentions - oldMentions);
              }
              
              // Update conversation unread count
              const conversation = state.directConversations.find(c => c.id === channelId);
              if (conversation) {
                const oldCount = conversation.unreadCount;
                conversation.unreadCount = count;
                state.totalUnreadCount += (count - oldCount);
              }
            });
          },

          markAsRead: async (channelId: string, messageId?: string) => {
            try {
              const response = await fetch(`${API_BASE_URL}/channels/${channelId}/read`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageId })});

              if (!response.ok) {
                throw new Error('Failed to mark as read');
              }

              set((state) => {
                // Reset unread count for channel
                const channel = state.channels.find(c => c.id === channelId);
                if (channel) {
                  state.totalUnreadCount -= channel.unreadCount;
                  state.totalMentionCount -= channel.mentionCount;
                  channel.unreadCount = 0;
                  channel.mentionCount = 0;
                }
                
                // Reset unread count for conversation
                const conversation = state.directConversations.find(c => c.id === channelId);
                if (conversation) {
                  state.totalUnreadCount -= conversation.unreadCount;
                  conversation.unreadCount = 0;
                }
                
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.errors.messages = error instanceof Error ? error.message : 'Failed to mark as read';
              });
            }
          },

          markAllAsRead: async () => {
            try {
              const response = await fetch(`${API_BASE_URL}/workspaces/${get().workspaceId}/read-all`, {
                method: 'POST'});

              if (!response.ok) {
                throw new Error('Failed to mark all as read');
              }

              set((state) => {
                // Reset all unread counts
                state.channels.forEach(channel => {
                  channel.unreadCount = 0;
                  channel.mentionCount = 0;
                });
                
                state.directConversations.forEach(conversation => {
                  conversation.unreadCount = 0;
                });
                
                state.totalUnreadCount = 0;
                state.totalMentionCount = 0;
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.errors.messages = error instanceof Error ? error.message : 'Failed to mark all as read';
              });
            }
          },

          // Draft Management
          setDraft: (channelId: string, content: string) => {
            set((state) => {
              if (content.trim()) {
                state.drafts[channelId] = content;
              } else {
                delete state.drafts[channelId];
              }
            });
          },

          clearDraft: (channelId: string) => {
            set((state) => {
              delete state.drafts[channelId];
            });
          },

          getDraft: (channelId: string) => {
            return get().drafts[channelId] || '';
          },

          // File Upload Management
          uploadFile: async (channelId: string, file: File, onProgress?: (progress: number) => void) => {
            const uploadId = get().addUpload({
              file,
              progress: 0,
              status: 'uploading',
              channelId
            });

            try {
              const formData = new FormData();
              formData.append('file', file);
              formData.append('channelId', channelId);

              const response = await fetch(`${API_BASE_URL}/uploads`, {
                method: 'POST',
                body: formData});

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to upload file');
              }

              const data = await response.json();

              set((state) => {
                const upload = state.uploads.find(u => u.id === uploadId);
                if (upload) {
                  upload.status = 'completed';
                  upload.progress = 100;
                  upload.url = data.url;
                }
              });

              return data.url;
            } catch (error) {
              set((state) => {
                const upload = state.uploads.find(u => u.id === uploadId);
                if (upload) {
                  upload.status = 'failed';
                  upload.error = error instanceof Error ? error.message : 'Upload failed';
                }
              });
              return null;
            }
          },

          addUpload: (upload: Omit<FileUpload, 'id'>) => {
            const id = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            set((state) => {
              state.uploads.push({ ...upload, id });
            });
            return id;
          },

          updateUpload: (uploadId: string, updates: Partial<FileUpload>) => {
            set((state) => {
              const index = state.uploads.findIndex(u => u.id === uploadId);
              if (index !== -1) {
                state.uploads[index] = { ...state.uploads[index], ...updates };
              }
            });
          },

          removeUpload: (uploadId: string) => {
            set((state) => {
              state.uploads = state.uploads.filter(u => u.id !== uploadId);
            });
          },

          // Voice/Video Calling
          startVoiceCall: async (channelId: string, participants: string[]) => {
            set((state) => {
              state.loading.calling = true;
              state.errors.calling = null;
            });

            try {
              const response = await fetch(`${API_BASE_URL}/channels/${channelId}/call`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'voice',
                  participants
                })});

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to start voice call');
              }

              const data = await response.json();

              set((state) => {
                state.loading.calling = false;
                state.currentCall = data.call;
                state.lastUpdated = new Date().toISOString();
              });

              return data.call;
            } catch (error) {
              set((state) => {
                state.loading.calling = false;
                state.errors.calling = error instanceof Error ? error.message : 'Failed to start voice call';
              });
              return null;
            }
          },

          startVideoCall: async (channelId: string, participants: string[]) => {
            set((state) => {
              state.loading.calling = true;
              state.errors.calling = null;
            });

            try {
              const response = await fetch(`${API_BASE_URL}/channels/${channelId}/call`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'video',
                  participants
                })});

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to start video call');
              }

              const data = await response.json();

              set((state) => {
                state.loading.calling = false;
                state.currentCall = data.call;
                state.lastUpdated = new Date().toISOString();
              });

              return data.call;
            } catch (error) {
              set((state) => {
                state.loading.calling = false;
                state.errors.calling = error instanceof Error ? error.message : 'Failed to start video call';
              });
              return null;
            }
          },

          joinCall: async (callId: string) => {
            try {
              const response = await fetch(`${API_BASE_URL}/calls/${callId}/join`, {
                method: 'POST'});

              if (!response.ok) {
                throw new Error('Failed to join call');
              }

              const data = await response.json();

              set((state) => {
                if (state.currentCall && state.currentCall.id === callId) {
                  state.currentCall = { ...state.currentCall, ...data.call };
                }
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.errors.calling = error instanceof Error ? error.message : 'Failed to join call';
              });
            }
          },

          leaveCall: async () => {
            const currentCall = get().currentCall;
            if (!currentCall) return;

            try {
              const response = await fetch(`${API_BASE_URL}/calls/${currentCall.id}/leave`, {
                method: 'POST'});

              if (!response.ok) {
                throw new Error('Failed to leave call');
              }

              set((state) => {
                state.currentCall = null;
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.errors.calling = error instanceof Error ? error.message : 'Failed to leave call';
              });
            }
          },

          toggleMute: (userId?: string) => {
            const targetUserId = userId || 'current-user'; // TODO: Get from auth context
            set((state) => {
              if (state.currentCall) {
                const participant = state.currentCall.participants.find(p => p.userId === targetUserId);
                if (participant) {
                  participant.isAudioMuted = !participant.isAudioMuted;
                }
              }
            });
          },

          toggleVideo: (userId?: string) => {
            const targetUserId = userId || 'current-user'; // TODO: Get from auth context
            set((state) => {
              if (state.currentCall) {
                const participant = state.currentCall.participants.find(p => p.userId === targetUserId);
                if (participant) {
                  participant.isVideoMuted = !participant.isVideoMuted;
                }
              }
            });
          },

          toggleScreenShare: (userId?: string) => {
            const targetUserId = userId || 'current-user'; // TODO: Get from auth context
            set((state) => {
              if (state.currentCall) {
                const participant = state.currentCall.participants.find(p => p.userId === targetUserId);
                if (participant) {
                  participant.isScreenSharing = !participant.isScreenSharing;
                }
              }
            });
          },

          endCall: async () => {
            const currentCall = get().currentCall;
            if (!currentCall) return;

            try {
              const response = await fetch(`${API_BASE_URL}/calls/${currentCall.id}/end`, {
                method: 'POST'});

              if (!response.ok) {
                throw new Error('Failed to end call');
              }

              set((state) => {
                state.currentCall = null;
                state.lastUpdated = new Date().toISOString();
              });
            } catch (error) {
              set((state) => {
                state.errors.calling = error instanceof Error ? error.message : 'Failed to end call';
              });
            }
          },

          // Connection Management
          setConnectionStatus: (status: ConsolidatedCommunicationState['connectionStatus']) => {
            set((state) => {
              state.connectionStatus = status;
              if (status === 'connected') {
                state.lastConnectionTime = new Date().toISOString();
                state.connectionError = null;
                state.reconnectAttempts = 0;
              } else if (status === 'reconnecting') {
                state.reconnectAttempts += 1;
              }
            });
          },

          setConnectionError: (error: string | null) => {
            set((state) => {
              state.connectionError = error;
            });
          },

          reconnect: async () => {
            const state = get();
            
            set((state) => {
              state.connectionStatus = 'reconnecting';
              state.connectionError = null;
            });

            try {
              // Simulate reconnection logic
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              set((state) => {
                state.connectionStatus = 'connected';
                state.lastConnectionTime = new Date().toISOString();
                state.reconnectAttempts = 0;
              });
            } catch (error) {
              set((state) => {
                state.connectionStatus = 'disconnected';
                state.connectionError = error instanceof Error ? error.message : 'Reconnection failed';
              });
            }
          },

          disconnect: () => {
            set((state) => {
              state.connectionStatus = 'disconnected';
              state.lastConnectionTime = null;
              state.connectionError = null;
              state.reconnectAttempts = 0;
            });
          },

          // Optimistic Updates
          addOptimisticMessage: (message: Message) => {
            set((state) => {
              state.optimisticMessages.push(message);
              
              // Also add to channel messages for immediate UI update
              const channelId = message.channelId || message.threadId;
              if (channelId) {
                if (!state.messages[channelId]) {
                  state.messages[channelId] = [];
                }
                state.messages[channelId].push(message);
              }
            });
          },

          confirmOptimisticMessage: (tempId: string, confirmedMessage: Message) => {
            set((state) => {
              // Remove from optimistic messages
              state.optimisticMessages = state.optimisticMessages.filter(m => m.id !== tempId);
              
              // Update in channel messages
              const channelId = confirmedMessage.channelId || confirmedMessage.threadId;
              if (channelId && state.messages[channelId]) {
                const index = state.messages[channelId].findIndex(m => m.id === tempId);
                if (index !== -1) {
                  state.messages[channelId][index] = confirmedMessage;
                }
              }
            });
          },

          failOptimisticMessage: (tempId: string, error?: string) => {
            set((state) => {
              // Remove from optimistic messages
              state.optimisticMessages = state.optimisticMessages.filter(m => m.id !== tempId);
              
              // Update status in channel messages
              Object.values(state.messages).forEach(messages => {
                const index = messages.findIndex(m => m.id === tempId);
                if (index !== -1) {
                  messages[index].deliveryStatus = 'failed';
                  if (error) {
                    messages[index].metadata = { ...messages[index].metadata, error };
                  }
                }
              });
            });
          },

          // UI State Management
          setShowChannelBrowser: (show: boolean) => {
            set((state) => {
              state.showChannelBrowser = show;
            });
          },

          setShowThreadPanel: (show: boolean) => {
            set((state) => {
              state.showThreadPanel = show;
            });
          },

          setShowMembersList: (show: boolean) => {
            set((state) => {
              state.showMembersList = show;
            });
          },

          setShowEmojiPicker: (show: boolean) => {
            set((state) => {
              state.showEmojiPicker = show;
            });
          },

          setShowAttachmentModal: (show: boolean) => {
            set((state) => {
              state.showAttachmentModal = show;
            });
          },

          toggleProjectContext: () => {
            set((state) => {
              state.showProjectContext = !state.showProjectContext;
            });
          },

          toggleTaskReferences: () => {
            set((state) => {
              state.showTaskReferences = !state.showTaskReferences;
            });
          },

          setSelectedMessageId: (messageId: string | null) => {
            set((state) => {
              state.selectedMessageId = messageId;
            });
          },

          // Loading and Error Management
          setLoading: (key: keyof ConsolidatedCommunicationState['loading'], value: boolean) => {
            set((state) => {
              state.loading[key] = value;
            });
          },

          setError: (key: keyof ConsolidatedCommunicationState['errors'], value: string | null) => {
            set((state) => {
              state.errors[key] = value;
            });
          },

          clearErrors: () => {
            set((state) => {
              state.errors = {
                channels: null,
                messages: null,
                conversations: null,
                search: null,
                sending: null,
                uploading: null,
                calling: null
              };
            });
          },

          clearError: (key: keyof ConsolidatedCommunicationState['errors']) => {
            set((state) => {
              state.errors[key] = null;
            });
          },

          // Notification Preferences
          updateNotificationPreferences: (channelId: string, preferences: Partial<NotificationPreferences>) => {
            set((state) => {
              const existing = state.notificationPreferences[channelId] || {
                channelId,
                mentions: true,
                allMessages: false,
                push: true,
                email: false,
                sound: true,
                keywords: []
              };
              state.notificationPreferences[channelId] = { ...existing, ...preferences };
            });
          },

          getNotificationPreferences: (channelId: string) => {
            return get().notificationPreferences[channelId] || null;
          },

          // Utility Functions
          getChannelById: (channelId: string) => {
            return get().channels.find(channel => channel.id === channelId) || null;
          },

          getConversationById: (conversationId: string) => {
            return get().directConversations.find(conv => conv.id === conversationId) || null;
          },

          getUserPresence: (userId: string) => {
            return get().userPresence[userId] || null;
          },

          getTypingUsersForChannel: (channelId: string) => {
            return get().typingUsers[channelId] || [];
          },

          getUnreadChannels: () => {
            return get().channels.filter(channel => channel.unreadCount > 0);
          },

          getUnreadConversations: () => {
            return get().directConversations.filter(conv => conv.unreadCount > 0);
          },

          getOnlineUsers: () => {
            return Object.values(get().userPresence).filter(presence => presence.status === 'online');
          },

          getStarredChannels: () => {
            return get().channels.filter(channel => channel.isStarred);
          },

          getRecentConversations: (limit = 10) => {
            return [...get().directConversations]
              .sort((a, b) => {
                const aTime = a.lastMessage?.createdAt || a.createdAt;
                const bTime = b.lastMessage?.createdAt || b.createdAt;
                return new Date(bTime).getTime() - new Date(aTime).getTime();
              })
              .slice(0, limit);
          },

          getActiveChannelMessages: () => {
            const state = get();
            const channelId = state.activeChannelId || state.activeConversationId;
            return channelId ? state.messages[channelId] || [] : [];
          },

          // Synchronization and Cleanup
          syncWithWorkspaceState: () => {
            // TODO: Implement workspace state synchronization
            logger.info("Syncing with workspace state");
          },

          syncWithProjectState: (projectId: string) => {
            // TODO: Implement project state synchronization
            logger.info("Syncing with project state:");
          },

          clearCommunicationState: () => {
            set((state) => {
              state.activeChannelId = null;
              state.activeConversationId = null;
              state.activeThreadId = null;
              state.selectedProjectId = null;
              state.selectedTaskId = null;
              state.activeContext = null;
              state.messages = {};
              state.enhancedMessages = {};
              state.pendingActions = [];
              state.typingUsers = {};
              state.drafts = {};
              state.uploads = [];
              state.currentCall = null;
              state.searchQuery = '';
              state.searchResults = [];
              state.messageFilters = {};
              state.filterByProject = null;
              state.selectedMessageId = null;
              state.optimisticMessages = [];
              state.pendingMessages = [];
            });
          },

          resetActiveChannel: () => {
            set((state) => {
              state.activeChannelId = null;
              state.activeConversationId = null;
              state.activeThreadId = null;
              state.selectedMessageId = null;
            });
          },

          resetCommunication: () => {
            set(() => ({ ...initialState }));
          },

          // Pagination Management
          setPagination: (channelId: string, pagination: ConsolidatedCommunicationState['pagination'][string]) => {
            set((state) => {
              state.pagination[channelId] = pagination;
            });
          },

          getPagination: (channelId: string) => {
            return get().pagination[channelId] || null;
          }
        }))
      ),
      {
        name: 'consolidated-communication-store',
        partialize: (state) => ({
          // Persist only essential state
          workspaceId: state.workspaceId,
          activeChannelId: state.activeChannelId,
          activeConversationId: state.activeConversationId,
          selectedProjectId: state.selectedProjectId,
          selectedTaskId: state.selectedTaskId,
          showProjectContext: state.showProjectContext,
          showTaskReferences: state.showTaskReferences,
          drafts: state.drafts,
          notificationPreferences: state.notificationPreferences,
          channelProjectBindings: state.channelProjectBindings
        }),
        version: 1
      }
    ),
    {
      name: 'consolidated-communication-store'
    }
  )
);

// Selector hooks for optimized re-renders
export const useCommunicationStore = useConsolidatedCommunicationStore;

// Specialized selector hooks
export const useChannels = () => useConsolidatedCommunicationStore((state) => state.channels);
export const useDirectConversations = () => useConsolidatedCommunicationStore((state) => state.directConversations);
export const useActiveChannel = () => useConsolidatedCommunicationStore((state) => {
  const { activeChannelId, channels, directConversations } = state;
  if (!activeChannelId) return null;
  return channels.find(c => c.id === activeChannelId) || 
         directConversations.find(c => c.id === activeChannelId) || 
         null;
});
export const useActiveChannelMessages = () => useConsolidatedCommunicationStore((state) => state.getActiveChannelMessages());
export const useUnreadCount = () => useConsolidatedCommunicationStore((state) => state.totalUnreadCount);
export const useMentionCount = () => useConsolidatedCommunicationStore((state) => state.totalMentionCount);
export const useConnectionStatus = () => useConsolidatedCommunicationStore((state) => state.connectionStatus);
export const useCurrentCall = () => useConsolidatedCommunicationStore((state) => state.currentCall);
export const useUserPresence = () => useConsolidatedCommunicationStore((state) => state.userPresence);
export const useTypingUsers = (channelId: string) => useConsolidatedCommunicationStore((state) => state.getTypingUsersForChannel(channelId));
export const useDraft = (channelId: string) => useConsolidatedCommunicationStore((state) => state.getDraft(channelId));
export const useSearchResults = () => useConsolidatedCommunicationStore((state) => state.searchResults);
export const usePendingActions = () => useConsolidatedCommunicationStore((state) => state.pendingActions);
export const useProjectContext = () => useConsolidatedCommunicationStore((state) => ({
  projectId: state.selectedProjectId,
  taskId: state.selectedTaskId,
  activeContext: state.activeContext
}));

// Enhanced hook with auto-connection management
export const useCommunicationWithConnection = (workspaceId?: string) => {
  const store = useConsolidatedCommunicationStore();
  
  React.useEffect(() => {
    if (workspaceId && store.workspaceId !== workspaceId) {
      store.setWorkspaceId(workspaceId);
    }
  }, [workspaceId, store]);
  
  React.useEffect(() => {
    if (workspaceId && store.channels.length === 0 && !store.loading.channels) {
      store.loadChannels(workspaceId);
    }
  }, [workspaceId, store.channels.length, store.loading.channels, store]);
  
  React.useEffect(() => {
    if (workspaceId && store.directConversations.length === 0 && !store.loading.conversations) {
      store.loadDirectConversations(workspaceId);
    }
  }, [workspaceId, store.directConversations.length, store.loading.conversations, store]);
  
  return store;
};

// Real-time messaging hook
export const useRealTimeMessaging = (channelId?: string) => {
  const store = useConsolidatedCommunicationStore();
  
  React.useEffect(() => {
    if (channelId) {
      store.setActiveChannel(channelId);
      if (!store.messages[channelId] && !store.loading.messages) {
        store.loadMessages(channelId);
      }
    }
  }, [channelId, store]);
  
  const sendMessage = React.useCallback(async (content: string, options?: any) => {
    if (!channelId) return null;
    return store.sendMessage(channelId, content, options);
  }, [channelId, store]);
  
  const uploadFile = React.useCallback(async (file: File, onProgress?: (progress: number) => void) => {
    if (!channelId) return null;
    return store.uploadFile(channelId, file, onProgress);
  }, [channelId, store]);
  
  const markAsRead = React.useCallback((messageId?: string) => {
    if (!channelId) return;
    store.markAsRead(channelId, messageId);
  }, [channelId, store]);
  
  return {
    messages: store.messages[channelId || ''] || [],
    typingUsers: store.getTypingUsersForChannel(channelId || ''),
    loading: store.loading.messages,
    error: store.errors.messages,
    sendMessage,
    updateMessage: store.editMessage,
    deleteMessage: store.deleteMessage,
    startTyping: () => channelId && store.startTyping(channelId),
    stopTyping: () => channelId && store.stopTyping(channelId),
    markAsRead,
    uploadFile,
    isConnected: store.connectionStatus === 'connected',
    draft: store.getDraft(channelId || ''),
    setDraft: (content: string) => channelId && store.setDraft(channelId, content),
    clearDraft: () => channelId && store.clearDraft(channelId)
  };
};

export default useConsolidatedCommunicationStore;