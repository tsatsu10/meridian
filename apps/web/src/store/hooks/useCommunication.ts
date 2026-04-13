import { useCallback, useMemo, useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from './index';

export interface UseCommunicationReturn {
  // State
  channels: any[];
  currentChannel: any;
  messages: any[];
  directMessages: any[];
  onlineUsers: any[];
  typingUsers: any[];
  connectionStatus: string;
  notifications: any[];
  loading: any;
  errors: any;

  // Actions
  loadChannels: (workspaceId: string) => Promise<any>;
  loadChannel: (channelId: string) => Promise<any>;
  createChannel: (data: any) => Promise<any>;
  updateChannel: (channelId: string, data: any) => Promise<any>;
  deleteChannel: (channelId: string) => Promise<any>;
  joinChannel: (channelId: string) => Promise<any>;
  leaveChannel: (channelId: string) => Promise<any>;
  
  // Messages
  loadMessages: (channelId: string, options?: any) => Promise<any>;
  sendMessage: (channelId: string, content: string, options?: any) => Promise<any>;
  updateMessage: (messageId: string, content: string) => Promise<any>;
  deleteMessage: (messageId: string) => Promise<any>;
  searchMessages: (query: string, options?: any) => Promise<any>;
  
  // Direct messages
  loadDirectMessages: (userId: string) => Promise<any>;
  sendDirectMessage: (userId: string, content: string) => Promise<any>;
  loadConversations: () => Promise<any>;
  
  // Real-time features
  setTyping: (channelId: string, isTyping: boolean) => void;
  markAsRead: (channelId: string, messageId: string) => void;
  
  // File uploads
  uploadFile: (channelId: string, file: File) => Promise<any>;
  
  // Voice/Video
  startVoiceCall: (channelId: string, participants: string[]) => Promise<any>;
  startVideoCall: (channelId: string, participants: string[]) => Promise<any>;
  endCall: (callId: string) => Promise<any>;
  
  // UI actions
  setActiveChannel: (channelId: string | null) => void;
  setFilter: (filter: any) => void;
  setView: (view: string) => void;
  
  // Utilities
  getChannelById: (channelId: string) => any;
  getUserById: (userId: string) => any;
  isUserOnline: (userId: string) => boolean;
  getUnreadCount: (channelId: string) => number;
  clearErrors: () => void;
  
  // Reset
  reset: () => void;
}

export function useCommunication(): UseCommunicationReturn {
  const dispatch = useAppDispatch();
  
  // Mock implementation - would use actual selectors
  const channels = useAppSelector(state => state.communication?.channels || []);
  const currentChannel = useAppSelector(state => state.communication?.currentChannel || null);
  const messages = useAppSelector(state => state.communication?.messages || []);
  const directMessages = useAppSelector(state => state.communication?.directMessages || []);
  const onlineUsers = useAppSelector(state => state.communication?.onlineUsers || []);
  const typingUsers = useAppSelector(state => state.communication?.typingUsers || []);
  const connectionStatus = useAppSelector(state => state.communication?.connectionStatus || 'disconnected');
  const notifications = useAppSelector(state => state.communication?.notifications || []);
  const loading = useAppSelector(state => state.communication?.loading || {});
  const errors = useAppSelector(state => state.communication?.errors || {});

  // Action creators
  const handleLoadChannels = useCallback(async (workspaceId: string) => {
    try {
      const result = await dispatch({ type: 'communication/loadChannels', payload: workspaceId });
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  const handleLoadChannel = useCallback(async (channelId: string) => {
    try {
      const result = await dispatch({ type: 'communication/loadChannel', payload: channelId });
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  const handleCreateChannel = useCallback(async (data: any) => {
    try {
      const result = await dispatch({ type: 'communication/createChannel', payload: data });
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  const handleUpdateChannel = useCallback(async (channelId: string, data: any) => {
    try {
      const result = await dispatch({ type: 'communication/updateChannel', payload: { channelId, data } });
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  const handleDeleteChannel = useCallback(async (channelId: string) => {
    try {
      const result = await dispatch({ type: 'communication/deleteChannel', payload: channelId });
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  const handleJoinChannel = useCallback(async (channelId: string) => {
    try {
      const result = await dispatch({ type: 'communication/joinChannel', payload: channelId });
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  const handleLeaveChannel = useCallback(async (channelId: string) => {
    try {
      const result = await dispatch({ type: 'communication/leaveChannel', payload: channelId });
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  // Messages
  const handleLoadMessages = useCallback(async (channelId: string, options?: any) => {
    try {
      const result = await dispatch({ type: 'communication/loadMessages', payload: { channelId, options } });
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  const handleSendMessage = useCallback(async (channelId: string, content: string, options?: any) => {
    try {
      const result = await dispatch({ type: 'communication/sendMessage', payload: { channelId, content, options } });
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  const handleUpdateMessage = useCallback(async (messageId: string, content: string) => {
    try {
      const result = await dispatch({ type: 'communication/updateMessage', payload: { messageId, content } });
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    try {
      const result = await dispatch({ type: 'communication/deleteMessage', payload: messageId });
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  const handleSearchMessages = useCallback(async (query: string, options?: any) => {
    try {
      const result = await dispatch({ type: 'communication/searchMessages', payload: { query, options } });
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  // Direct messages
  const handleLoadDirectMessages = useCallback(async (userId: string) => {
    try {
      const result = await dispatch({ type: 'communication/loadDirectMessages', payload: userId });
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  const handleSendDirectMessage = useCallback(async (userId: string, content: string) => {
    try {
      const result = await dispatch({ type: 'communication/sendDirectMessage', payload: { userId, content } });
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  const handleLoadConversations = useCallback(async () => {
    try {
      const result = await dispatch({ type: 'communication/loadConversations' });
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  // Real-time features
  const handleSetTyping = useCallback((channelId: string, isTyping: boolean) => {
    dispatch({ type: 'communication/setTyping', payload: { channelId, isTyping } });
  }, [dispatch]);

  const handleMarkAsRead = useCallback((channelId: string, messageId: string) => {
    dispatch({ type: 'communication/markAsRead', payload: { channelId, messageId } });
  }, [dispatch]);

  // File uploads
  const handleUploadFile = useCallback(async (channelId: string, file: File) => {
    try {
      const result = await dispatch({ type: 'communication/uploadFile', payload: { channelId, file } });
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  // Voice/Video
  const handleStartVoiceCall = useCallback(async (channelId: string, participants: string[]) => {
    try {
      const result = await dispatch({ type: 'communication/startVoiceCall', payload: { channelId, participants } });
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  const handleStartVideoCall = useCallback(async (channelId: string, participants: string[]) => {
    try {
      const result = await dispatch({ type: 'communication/startVideoCall', payload: { channelId, participants } });
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  const handleEndCall = useCallback(async (callId: string) => {
    try {
      const result = await dispatch({ type: 'communication/endCall', payload: callId });
      return result;
    } catch (error) {
      throw error;
    }
  }, [dispatch]);

  // UI actions
  const handleSetActiveChannel = useCallback((channelId: string | null) => {
    dispatch({ type: 'communication/setActiveChannel', payload: channelId });
  }, [dispatch]);

  const handleSetFilter = useCallback((filter: any) => {
    dispatch({ type: 'communication/setFilter', payload: filter });
  }, [dispatch]);

  const handleSetView = useCallback((view: string) => {
    dispatch({ type: 'communication/setView', payload: view });
  }, [dispatch]);

  // Utilities
  const getChannelById = useCallback((channelId: string) => {
    return channels.find(channel => channel.id === channelId) || null;
  }, [channels]);

  const getUserById = useCallback((userId: string) => {
    return onlineUsers.find(user => user.id === userId) || null;
  }, [onlineUsers]);

  const isUserOnline = useCallback((userId: string) => {
    return onlineUsers.some(user => user.id === userId);
  }, [onlineUsers]);

  const getUnreadCount = useCallback((channelId: string) => {
    const channel = getChannelById(channelId);
    return channel?.unreadCount || 0;
  }, [getChannelById]);

  const handleClearErrors = useCallback(() => {
    dispatch({ type: 'communication/clearErrors' });
  }, [dispatch]);

  const handleReset = useCallback(() => {
    dispatch({ type: 'communication/reset' });
  }, [dispatch]);

  return {
    // State
    channels,
    currentChannel,
    messages,
    directMessages,
    onlineUsers,
    typingUsers,
    connectionStatus,
    notifications,
    loading,
    errors,

    // Actions
    loadChannels: handleLoadChannels,
    loadChannel: handleLoadChannel,
    createChannel: handleCreateChannel,
    updateChannel: handleUpdateChannel,
    deleteChannel: handleDeleteChannel,
    joinChannel: handleJoinChannel,
    leaveChannel: handleLeaveChannel,

    // Messages
    loadMessages: handleLoadMessages,
    sendMessage: handleSendMessage,
    updateMessage: handleUpdateMessage,
    deleteMessage: handleDeleteMessage,
    searchMessages: handleSearchMessages,

    // Direct messages
    loadDirectMessages: handleLoadDirectMessages,
    sendDirectMessage: handleSendDirectMessage,
    loadConversations: handleLoadConversations,

    // Real-time features
    setTyping: handleSetTyping,
    markAsRead: handleMarkAsRead,

    // File uploads
    uploadFile: handleUploadFile,

    // Voice/Video
    startVoiceCall: handleStartVoiceCall,
    startVideoCall: handleStartVideoCall,
    endCall: handleEndCall,

    // UI actions
    setActiveChannel: handleSetActiveChannel,
    setFilter: handleSetFilter,
    setView: handleSetView,

    // Utilities
    getChannelById,
    getUserById,
    isUserOnline,
    getUnreadCount,
    clearErrors: handleClearErrors,

    // Reset
    reset: handleReset,
  };
}

// Enhanced hook with auto-connection management
export function useCommunicationWithConnection(workspaceId?: string): UseCommunicationReturn & {
  isConnected: boolean;
  isConnecting: boolean;
  reconnect: () => void;
} {
  const communication = useCommunication();
  const [isConnecting, setIsConnecting] = useState(false);

  // Auto-load channels when workspace changes
  useEffect(() => {
    if (workspaceId && communication.channels.length === 0 && !communication.loading.channels) {
      communication.loadChannels(workspaceId).catch(error => {
        console.error('Failed to load channels:', error);
      });
    }
  }, [workspaceId, communication.channels.length, communication.loading.channels, communication.loadChannels]);

  // Auto-load conversations
  useEffect(() => {
    if (communication.directMessages.length === 0 && !communication.loading.conversations) {
      communication.loadConversations().catch(error => {
        console.error('Failed to load conversations:', error);
      });
    }
  }, [communication.directMessages.length, communication.loading.conversations, communication.loadConversations]);

  const isConnected = useMemo(() => {
    return communication.connectionStatus === 'connected';
  }, [communication.connectionStatus]);

  const reconnect = useCallback(() => {
    setIsConnecting(true);
    // Mock reconnection logic
    dispatch({ type: 'communication/reconnect' });
    setTimeout(() => setIsConnecting(false), 2000);
  }, []);

  return {
    ...communication,
    isConnected,
    isConnecting,
    reconnect,
  };
}

// Hook for real-time messaging
export function useRealTimeMessaging(channelId?: string) {
  const communication = useCommunication();
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);

  // Auto-load messages when channel changes
  useEffect(() => {
    if (channelId) {
      communication.loadMessages(channelId).catch(error => {
        console.error('Failed to load messages:', error);
      });
    }
  }, [channelId, communication.loadMessages]);

  // Set active channel
  useEffect(() => {
    communication.setActiveChannel(channelId || null);
  }, [channelId, communication.setActiveChannel]);

  const sendMessage = useCallback(async (content: string, options?: any) => {
    if (!channelId) return;
    return communication.sendMessage(channelId, content, options);
  }, [channelId, communication.sendMessage]);

  const startTyping = useCallback(() => {
    if (!channelId) return;

    communication.setTyping(channelId, true);

    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    const timeout = setTimeout(() => {
      communication.setTyping(channelId, false);
    }, 3000); // Stop typing after 3 seconds

    setTypingTimeout(timeout);
  }, [channelId, communication.setTyping, typingTimeout]);

  const stopTyping = useCallback(() => {
    if (!channelId) return;

    if (typingTimeout) {
      clearTimeout(typingTimeout);
      setTypingTimeout(null);
    }

    communication.setTyping(channelId, false);
  }, [channelId, communication.setTyping, typingTimeout]);

  const markAsRead = useCallback((messageId: string) => {
    if (!channelId) return;
    communication.markAsRead(channelId, messageId);
  }, [channelId, communication.markAsRead]);

  const uploadFile = useCallback(async (file: File) => {
    if (!channelId) return;
    return communication.uploadFile(channelId, file);
  }, [channelId, communication.uploadFile]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      if (channelId) {
        communication.setTyping(channelId, false);
      }
    };
  }, []);

  return {
    messages: communication.messages,
    typingUsers: communication.typingUsers,
    loading: communication.loading.messages,
    error: communication.errors.messages,
    sendMessage,
    updateMessage: communication.updateMessage,
    deleteMessage: communication.deleteMessage,
    startTyping,
    stopTyping,
    markAsRead,
    uploadFile,
    isConnected: communication.connectionStatus === 'connected',
  };
}

// Hook for voice/video calling
export function useVoiceVideo() {
  const communication = useCommunication();
  const [currentCall, setCurrentCall] = useState<any>(null);

  const startVoiceCall = useCallback(async (channelId: string, participants: string[]) => {
    try {
      const call = await communication.startVoiceCall(channelId, participants);
      setCurrentCall(call);
      return call;
    } catch (error) {
      console.error('Failed to start voice call:', error);
      throw error;
    }
  }, [communication.startVoiceCall]);

  const startVideoCall = useCallback(async (channelId: string, participants: string[]) => {
    try {
      const call = await communication.startVideoCall(channelId, participants);
      setCurrentCall(call);
      return call;
    } catch (error) {
      console.error('Failed to start video call:', error);
      throw error;
    }
  }, [communication.startVideoCall]);

  const endCall = useCallback(async () => {
    if (currentCall) {
      try {
        await communication.endCall(currentCall.id);
        setCurrentCall(null);
      } catch (error) {
        console.error('Failed to end call:', error);
        throw error;
      }
    }
  }, [currentCall, communication.endCall]);

  return {
    currentCall,
    startVoiceCall,
    startVideoCall,
    endCall,
    isInCall: currentCall !== null,
  };
}