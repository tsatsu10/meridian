// Team Chat State and UI Types

import type { TeamMessage, TypingUser } from './message';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'reconnecting';
export type ViewMode = 'default' | 'compact' | 'mobile';

export interface ChatState {
  // Messages
  messages: TeamMessage[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  
  // Composition
  composing: ComposingState;
  
  // UI State
  ui: UIState;
  
  // Real-time
  realtime: RealtimeState;
}

export interface ComposingState {
  content: string;
  replyTo: TeamMessage | null;
  files: File[];
  isAnnouncement: boolean;
  mentions: string[];
}

export interface UIState {
  showEmojiPicker: string | null;
  editingMessageId: string | null;
  editingContent: string;
  deletingMessageId: string | null;
  notification: NotificationState | null;
  viewMode: ViewMode;
}

export interface NotificationState {
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  duration?: number;
}

export interface RealtimeState {
  connectionStatus: ConnectionStatus;
  onlineUsers: string[];
  typingUsers: TypingUser[];
  lastSyncedAt: string | null;
}

export type ChatAction =
  // Message actions
  | { type: 'SET_MESSAGES'; payload: TeamMessage[] }
  | { type: 'ADD_MESSAGE'; payload: TeamMessage }
  | { type: 'UPDATE_MESSAGE'; payload: { id: string; updates: Partial<TeamMessage> } }
  | { type: 'DELETE_MESSAGE'; payload: string }
  | { type: 'PREPEND_MESSAGES'; payload: TeamMessage[] } // For infinite scroll
  
  // Composing actions
  | { type: 'SET_COMPOSING_CONTENT'; payload: string }
  | { type: 'SET_REPLY_TO'; payload: TeamMessage | null }
  | { type: 'ADD_FILES'; payload: File[] }
  | { type: 'REMOVE_FILE'; payload: number }
  | { type: 'TOGGLE_ANNOUNCEMENT_MODE' }
  | { type: 'RESET_COMPOSING' }
  
  // UI actions
  | { type: 'SET_EDITING_MESSAGE'; payload: { id: string; content: string } | null }
  | { type: 'SET_DELETING_MESSAGE'; payload: string | null }
  | { type: 'SET_EMOJI_PICKER'; payload: string | null }
  | { type: 'SHOW_NOTIFICATION'; payload: NotificationState }
  | { type: 'CLEAR_NOTIFICATION' }
  | { type: 'SET_VIEW_MODE'; payload: ViewMode }
  
  // Realtime actions
  | { type: 'SET_CONNECTION_STATUS'; payload: ConnectionStatus }
  | { type: 'SET_ONLINE_USERS'; payload: string[] }
  | { type: 'ADD_TYPING_USER'; payload: TypingUser }
  | { type: 'REMOVE_TYPING_USER'; payload: string }
  | { type: 'UPDATE_SYNC_TIME'; payload: string }
  
  // Loading and error
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_HAS_MORE'; payload: boolean };

export interface ChatContextValue {
  state: ChatState;
  dispatch: React.Dispatch<ChatAction>;
  actions: ChatActions;
}

export interface ChatActions {
  // Message operations
  sendMessage: (content: string) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (messageId: string, emoji: string) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  
  // Composition
  setComposingContent: (content: string) => void;
  setReplyTo: (message: TeamMessage | null) => void;
  addFiles: (files: File[]) => void;
  removeFile: (index: number) => void;
  toggleAnnouncementMode: () => void;
  resetComposing: () => void;
  
  // UI
  startEditingMessage: (messageId: string, content: string) => void;
  cancelEditing: () => void;
  startDeletingMessage: (messageId: string) => void;
  cancelDeleting: () => void;
  showEmojiPicker: (messageId: string | null) => void;
  showNotification: (notification: NotificationState) => void;
}

export interface TeamChatProps {
  teamId: string;
  teamName: string;
  className?: string;
  onClose?: () => void;
}

