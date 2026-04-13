// Chat Reducer - Centralized State Management
// Handles all state transitions for team chat

import type { ChatState, ChatAction } from '../types';

export const initialChatState: ChatState = {
  messages: [],
  isLoading: false,
  error: null,
  hasMore: false,
  
  composing: {
    content: '',
    replyTo: null,
    files: [],
    isAnnouncement: false,
    mentions: [],
  },
  
  ui: {
    showEmojiPicker: null,
    editingMessageId: null,
    editingContent: '',
    deletingMessageId: null,
    notification: null,
    viewMode: 'default',
  },
  
  realtime: {
    connectionStatus: 'connecting',
    onlineUsers: [],
    typingUsers: [],
    lastSyncedAt: null,
  },
};

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    // ============ Message Actions ============
    
    case 'SET_MESSAGES':
      return {
        ...state,
        messages: action.payload,
        isLoading: false,
        error: null,
      };
    
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };
    
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg.id === action.payload.id
            ? { ...msg, ...action.payload.updates }
            : msg
        ),
      };
    
    case 'DELETE_MESSAGE':
      return {
        ...state,
        messages: state.messages.filter(msg => msg.id !== action.payload),
      };
    
    case 'PREPEND_MESSAGES':
      // For infinite scroll - add older messages at the beginning
      return {
        ...state,
        messages: [...action.payload, ...state.messages],
      };
    
    // ============ Composing Actions ============
    
    case 'SET_COMPOSING_CONTENT':
      return {
        ...state,
        composing: {
          ...state.composing,
          content: action.payload,
        },
      };
    
    case 'SET_REPLY_TO':
      return {
        ...state,
        composing: {
          ...state.composing,
          replyTo: action.payload,
        },
      };
    
    case 'ADD_FILES':
      return {
        ...state,
        composing: {
          ...state.composing,
          files: [...state.composing.files, ...action.payload],
        },
      };
    
    case 'REMOVE_FILE':
      return {
        ...state,
        composing: {
          ...state.composing,
          files: state.composing.files.filter((_, index) => index !== action.payload),
        },
      };
    
    case 'TOGGLE_ANNOUNCEMENT_MODE':
      return {
        ...state,
        composing: {
          ...state.composing,
          isAnnouncement: !state.composing.isAnnouncement,
        },
      };
    
    case 'RESET_COMPOSING':
      return {
        ...state,
        composing: {
          content: '',
          replyTo: null,
          files: [],
          isAnnouncement: false,
          mentions: [],
        },
      };
    
    // ============ UI Actions ============
    
    case 'SET_EDITING_MESSAGE':
      return {
        ...state,
        ui: {
          ...state.ui,
          editingMessageId: action.payload?.id ?? null,
          editingContent: action.payload?.content ?? '',
        },
      };
    
    case 'SET_DELETING_MESSAGE':
      return {
        ...state,
        ui: {
          ...state.ui,
          deletingMessageId: action.payload,
        },
      };
    
    case 'SET_EMOJI_PICKER':
      return {
        ...state,
        ui: {
          ...state.ui,
          showEmojiPicker: action.payload,
        },
      };
    
    case 'SHOW_NOTIFICATION':
      return {
        ...state,
        ui: {
          ...state.ui,
          notification: action.payload,
        },
      };
    
    case 'CLEAR_NOTIFICATION':
      return {
        ...state,
        ui: {
          ...state.ui,
          notification: null,
        },
      };
    
    case 'SET_VIEW_MODE':
      return {
        ...state,
        ui: {
          ...state.ui,
          viewMode: action.payload,
        },
      };
    
    // ============ Realtime Actions ============
    
    case 'SET_CONNECTION_STATUS':
      return {
        ...state,
        realtime: {
          ...state.realtime,
          connectionStatus: action.payload,
        },
      };
    
    case 'SET_ONLINE_USERS':
      return {
        ...state,
        realtime: {
          ...state.realtime,
          onlineUsers: action.payload,
        },
      };
    
    case 'ADD_TYPING_USER':
      // Don't add if already exists
      if (state.realtime.typingUsers.some(u => u.userEmail === action.payload.userEmail)) {
        return state;
      }
      
      return {
        ...state,
        realtime: {
          ...state.realtime,
          typingUsers: [...state.realtime.typingUsers, action.payload],
        },
      };
    
    case 'REMOVE_TYPING_USER':
      return {
        ...state,
        realtime: {
          ...state.realtime,
          typingUsers: state.realtime.typingUsers.filter(
            u => u.userEmail !== action.payload
          ),
        },
      };
    
    case 'UPDATE_SYNC_TIME':
      return {
        ...state,
        realtime: {
          ...state.realtime,
          lastSyncedAt: action.payload,
        },
      };
    
    // ============ Loading & Error ============
    
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
    
    case 'SET_HAS_MORE':
      return {
        ...state,
        hasMore: action.payload,
      };
    
    default:
      return state;
  }
}

