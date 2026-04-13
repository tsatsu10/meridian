/**
 * 💬 Communication Store
 * 
 * Zustand store for managing communication state:
 * - Messages (channels & DMs)
 * - Optimistic updates
 * - Unread counts
 * - Typing indicators
 * - Message cache
 * - WebSocket sync
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface Message {
  id: string;
  channelId: string;
  userEmail: string;
  content: string;
  messageType?: string;
  parentMessageId?: string;
  mentions?: string[];
  reactions?: any[];
  attachments?: any[];
  isEdited?: boolean;
  editedAt?: string;
  createdAt: string;
  
  // Optimistic update tracking
  _optimistic?: boolean;
  _tempId?: string;
  _status?: 'sending' | 'sent' | 'failed';
}

interface Channel {
  id: string;
  name: string;
  type: string;
  unreadCount: number;
  lastMessage?: Message;
  lastReadAt?: string;
}

interface CommunicationState {
  // Messages by channel
  messages: Record<string, Message[]>;
  
  // Channels
  channels: Record<string, Channel>;
  
  // Active channel
  activeChannelId: string | null;
  
  // Typing users
  typingUsers: Record<string, Set<string>>;
  
  // Unread counts
  unreadCounts: Record<string, number>;
  
  // Actions
  setActiveChannel: (channelId: string) => void;
  addMessage: (channelId: string, message: Message) => void;
  addOptimisticMessage: (channelId: string, message: Partial<Message>) => string;
  confirmOptimisticMessage: (tempId: string, actualMessage: Message) => void;
  failOptimisticMessage: (tempId: string, error: string) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (channelId: string, messageId: string) => void;
  setMessages: (channelId: string, messages: Message[]) => void;
  prependMessages: (channelId: string, messages: Message[]) => void;
  addChannel: (channel: Channel) => void;
  updateChannel: (channelId: string, updates: Partial<Channel>) => void;
  setUnreadCount: (channelId: string, count: number) => void;
  incrementUnreadCount: (channelId: string) => void;
  markAsRead: (channelId: string) => void;
  addTypingUser: (channelId: string, userEmail: string) => void;
  removeTypingUser: (channelId: string, userEmail: string) => void;
  clearTypingUsers: (channelId: string) => void;
  reset: () => void;
}

export const useCommunicationStore = create<CommunicationState>()(
  devtools(
    persist(
      immer((set, get) => ({
        messages: {},
        channels: {},
        activeChannelId: null,
        typingUsers: {},
        unreadCounts: {},

        setActiveChannel: (channelId: string) => {
          set((state) => {
            state.activeChannelId = channelId;
            // Mark as read when opening channel
            if (state.unreadCounts[channelId]) {
              state.unreadCounts[channelId] = 0;
            }
          });
        },

        addMessage: (channelId: string, message: Message) => {
          set((state) => {
            if (!state.messages[channelId]) {
              state.messages[channelId] = [];
            }
            
            // Check if message already exists
            const existingIndex = state.messages[channelId].findIndex(
              m => m.id === message.id
            );
            
            if (existingIndex >= 0) {
              // Update existing message
              state.messages[channelId][existingIndex] = message;
            } else {
              // Add new message
              state.messages[channelId].push(message);
              
              // Sort by createdAt
              state.messages[channelId].sort(
                (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
              );
            }
            
            // Update channel last message
            if (state.channels[channelId]) {
              state.channels[channelId].lastMessage = message;
            }
            
            // Increment unread if not active channel
            if (state.activeChannelId !== channelId) {
              state.unreadCounts[channelId] = (state.unreadCounts[channelId] || 0) + 1;
              if (state.channels[channelId]) {
                state.channels[channelId].unreadCount = state.unreadCounts[channelId];
              }
            }
          });
        },

        addOptimisticMessage: (channelId: string, messageData: Partial<Message>) => {
          const tempId = `temp_${Date.now()}_${Math.random()}`;
          const optimisticMessage: Message = {
            id: tempId,
            channelId,
            userEmail: messageData.userEmail || '',
            content: messageData.content || '',
            messageType: messageData.messageType,
            parentMessageId: messageData.parentMessageId,
            mentions: messageData.mentions,
            attachments: messageData.attachments,
            createdAt: new Date().toISOString(),
            _optimistic: true,
            _tempId: tempId,
            _status: 'sending',
          };

          set((state) => {
            if (!state.messages[channelId]) {
              state.messages[channelId] = [];
            }
            state.messages[channelId].push(optimisticMessage);
          });

          return tempId;
        },

        confirmOptimisticMessage: (tempId: string, actualMessage: Message) => {
          set((state) => {
            // Find the optimistic message across all channels
            for (const channelId in state.messages) {
              const index = state.messages[channelId].findIndex(
                m => m._tempId === tempId
              );
              
              if (index >= 0) {
                // Replace optimistic message with actual message
                state.messages[channelId][index] = {
                  ...actualMessage,
                  _status: 'sent',
                };
                break;
              }
            }
          });
        },

        failOptimisticMessage: (tempId: string, error: string) => {
          set((state) => {
            // Find the optimistic message and mark as failed
            for (const channelId in state.messages) {
              const index = state.messages[channelId].findIndex(
                m => m._tempId === tempId
              );
              
              if (index >= 0) {
                state.messages[channelId][index]._status = 'failed';
                break;
              }
            }
          });
        },

        updateMessage: (messageId: string, updates: Partial<Message>) => {
          set((state) => {
            for (const channelId in state.messages) {
              const index = state.messages[channelId].findIndex(
                m => m.id === messageId
              );
              
              if (index >= 0) {
                state.messages[channelId][index] = {
                  ...state.messages[channelId][index],
                  ...updates,
                };
                break;
              }
            }
          });
        },

        deleteMessage: (channelId: string, messageId: string) => {
          set((state) => {
            if (state.messages[channelId]) {
              state.messages[channelId] = state.messages[channelId].filter(
                m => m.id !== messageId
              );
            }
          });
        },

        setMessages: (channelId: string, messages: Message[]) => {
          set((state) => {
            state.messages[channelId] = messages.sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
          });
        },

        prependMessages: (channelId: string, messages: Message[]) => {
          set((state) => {
            if (!state.messages[channelId]) {
              state.messages[channelId] = [];
            }
            
            // Add older messages to beginning
            state.messages[channelId] = [
              ...messages,
              ...state.messages[channelId],
            ].sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
          });
        },

        addChannel: (channel: Channel) => {
          set((state) => {
            state.channels[channel.id] = channel;
            state.unreadCounts[channel.id] = channel.unreadCount || 0;
          });
        },

        updateChannel: (channelId: string, updates: Partial<Channel>) => {
          set((state) => {
            if (state.channels[channelId]) {
              state.channels[channelId] = {
                ...state.channels[channelId],
                ...updates,
              };
            }
          });
        },

        setUnreadCount: (channelId: string, count: number) => {
          set((state) => {
            state.unreadCounts[channelId] = count;
            if (state.channels[channelId]) {
              state.channels[channelId].unreadCount = count;
            }
          });
        },

        incrementUnreadCount: (channelId: string) => {
          set((state) => {
            state.unreadCounts[channelId] = (state.unreadCounts[channelId] || 0) + 1;
            if (state.channels[channelId]) {
              state.channels[channelId].unreadCount = state.unreadCounts[channelId];
            }
          });
        },

        markAsRead: (channelId: string) => {
          set((state) => {
            state.unreadCounts[channelId] = 0;
            if (state.channels[channelId]) {
              state.channels[channelId].unreadCount = 0;
              state.channels[channelId].lastReadAt = new Date().toISOString();
            }
          });
        },

        addTypingUser: (channelId: string, userEmail: string) => {
          set((state) => {
            if (!state.typingUsers[channelId]) {
              state.typingUsers[channelId] = new Set();
            }
            state.typingUsers[channelId].add(userEmail);
          });
        },

        removeTypingUser: (channelId: string, userEmail: string) => {
          set((state) => {
            if (state.typingUsers[channelId]) {
              state.typingUsers[channelId].delete(userEmail);
            }
          });
        },

        clearTypingUsers: (channelId: string) => {
          set((state) => {
            state.typingUsers[channelId] = new Set();
          });
        },

        reset: () => {
          set({
            messages: {},
            channels: {},
            activeChannelId: null,
            typingUsers: {},
            unreadCounts: {},
          });
        },
      })),
      {
        name: 'communication-store',
        partialize: (state) => ({
          // Only persist channels and unread counts
          channels: state.channels,
          unreadCounts: state.unreadCounts,
        }),
      }
    ),
    { name: 'CommunicationStore' }
  )
);

