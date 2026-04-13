import { useState, useEffect, useCallback } from 'react';
import { Message, Channel, MessageUser } from '../types/chat';
import { chatService } from '../services/chatService';
import { useUnifiedWebSocket } from './useUnifiedWebSocket';
import useAuth from '@/components/providers/auth-provider/hooks/use-auth';
import useWorkspaceStore from '@/store/workspace';

export const useChat = () => {
  const { user } = useAuth();
  const { workspace } = useWorkspaceStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use the unified WebSocket hook instead of plain WebSocket
  const unifiedWS = useUnifiedWebSocket({
    userEmail: user?.email || '',
    workspaceId: workspace?.id || '',
    enabled: Boolean(user?.email && workspace?.id),
    onMessage: (message) => {if (message.data?.message) {
        setMessages(prev => [...prev, message.data.message]);
      }
    },
    onTyping: (user) => {},
    onStopTyping: (user) => {},
    onUserJoined: (userEmail, channelId) => {},
    onUserLeft: (userEmail, channelId) => {},
    onConnect: () => {},
    onDisconnect: () => {},
    onError: (error) => {
      console.error('❌ useChat: Unified WebSocket error:', error);
      setError('WebSocket connection error');
    }
  });

  // Load channels when workspace changes
  const loadChannels = useCallback(async () => {
    if (!workspace?.id || workspace.id === 'undefined' || workspace.id === 'null' || workspace.id.trim() === '') {
      // Silently skip - this is expected during initial load or when workspace is switching
      setChannels([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fetchedChannels = await chatService.getChannels(workspace.id);
      setChannels(fetchedChannels);
    } catch (err) {
      console.error('Failed to load channels:', err);
      setError('Failed to fetch channels');
      setChannels([]); // Set empty array instead of leaving in error state
    } finally {
      setIsLoading(false);
    }
  }, [workspace?.id]);

  // Load messages for a specific channel
  const loadMessages = useCallback(async (channelId: string) => {
    if (!channelId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const fetchedMessages = await chatService.getMessages(channelId);
      setMessages(fetchedMessages);
    } catch (err) {
      console.error('Failed to load messages:', err);
      setError('Failed to fetch messages');
    } finally {
      setIsLoading(false);
    }
  }, []);

     // Send message using unified WebSocket
   const sendMessage = useCallback(async (channelId: string, content: string, attachments?: File[]) => {
     if (!channelId || !content.trim()) return;

     try {
       // Use unified WebSocket to send message
       unifiedWS.sendMessage(channelId, content, { attachments });
       
       // Also persist via API
       await chatService.sendMessage(channelId, content, attachments);
      } catch (err) {
       console.error('Failed to send message:', err);
        setError('Failed to send message');
      }
   }, [unifiedWS]);

  // Join channel using unified WebSocket
  const joinChannel = useCallback((channelId: string) => {
    unifiedWS.joinChannel(channelId);
    loadMessages(channelId);
  }, [unifiedWS, loadMessages]);

  // Leave channel using unified WebSocket
  const leaveChannel = useCallback((channelId: string) => {
    unifiedWS.leaveChannel(channelId);
  }, [unifiedWS]);

  // Typing indicators using unified WebSocket
  const setTypingStatus = useCallback((channelId: string, isTyping: boolean) => {
    if (isTyping) {
      unifiedWS.startTyping(channelId);
    } else {
      unifiedWS.stopTyping(channelId);
    }
  }, [unifiedWS]);

  // Load channels on mount
  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  // Reactions (placeholder - can be extended later)
  const addReaction = useCallback(async (messageId: string, emoji: string) => {// TODO: Implement reaction functionality
  }, []);

  const removeReaction = useCallback(async (messageId: string, emoji: string) => {// TODO: Implement reaction functionality
  }, []);

  return {
    messages,
    channels,
    isLoading,
    error,
    isConnected: unifiedWS.connectionState.isConnected,
    connectionState: unifiedWS.connectionState,
    sendMessage,
    joinChannel,
    leaveChannel,
    setTypingStatus,
    addReaction,
    removeReaction,
    loadChannels,
    loadMessages,
  };
}; 