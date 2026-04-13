import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Channel } from '../types/chat';
import { chatService } from '../services/chatService';

interface ChatContextType {
  channels: Channel[];
  activeChannelId: string | null;
  setActiveChannelId: (channelId: string) => void;
  createChannel: (name: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  workspaceId: string;
  children: React.ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ workspaceId, children }) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);

  useEffect(() => {
    const loadChannels = async () => {
      // Only load channels if we have a valid workspace ID
      if (!workspaceId || workspaceId === 'undefined' || workspaceId === 'null' || workspaceId.trim() === '') {
        // Silently skip - this is expected during initial load or when workspace is switching
        setChannels([]);
        return;
      }

      try {
        const channelList = await chatService.getChannels(workspaceId);
        setChannels(channelList);
        if (channelList.length > 0 && !activeChannelId) {
          setActiveChannelId(channelList[0].id);
        }
      } catch (error) {
        console.error('Failed to load channels:', error);
        // Set empty channels array instead of crashing
        setChannels([]);
      }
    };

    loadChannels();
  }, [workspaceId]);

  const createChannel = async (name: string) => {
    // Validate workspaceId before attempting to create channel
    if (!workspaceId || workspaceId === 'undefined' || workspaceId === 'null') {
      throw new Error('Cannot create channel - invalid workspace');
    }

    try {
      // chatService.createChannel expects (workspaceId, name)
      const newChannel = await chatService.createChannel(workspaceId, name);
      setChannels((prev) => [...prev, newChannel]);
    } catch (error) {
      console.error('Failed to create channel:', error);
      throw error;
    }
  };

  const value = {
    channels,
    activeChannelId,
    setActiveChannelId,
    createChannel,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}; 