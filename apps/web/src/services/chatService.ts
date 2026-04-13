import { API_BASE_URL } from '../constants/urls';
import { Message, Channel } from '../types/chat';
import { logger } from '@/lib/logger';

class ChatService {
  // Updated to use correct API endpoints
  async getChannels(workspaceId: string): Promise<Channel[]> {
    if (!workspaceId || workspaceId === 'undefined' || workspaceId === 'null') {
      logger.warn('Invalid workspaceId provided to getChannels', { workspaceId });
      throw new Error('Invalid workspace for channels');
    }

    const response = await fetch(`${API_BASE_URL}/channel/${workspaceId}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Workspace or channels not found');
      }
      throw new Error(`Failed to fetch channels: ${response.statusText}`);
    }
    const data = await response.json();
    return data.channels || [];
  }

  async getMessages(channelId: string, limit = 50): Promise<Message[]> {
    const response = await fetch(`${API_BASE_URL}/message/channel/${channelId}?limit=${limit}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch messages');
    }
    const data = await response.json();
    return data.data?.messages || [];
  }

  async sendMessage(
    channelId: string,
    content: string,
    attachments?: File[]
  ): Promise<Message> {
    const messageData = {
      channelId,
      content,
      messageType: 'text' as const,
      // Convert attachments to the expected format if needed
      attachments: attachments ? await this.processAttachments(attachments) : undefined,
    };

    const response = await fetch(`${API_BASE_URL}/message/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(messageData),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    const data = await response.json();
    return data.data?.message || data;
  }

  async createChannel(workspaceId: string, name: string): Promise<Channel> {
    // Validate workspaceId (skip in E2E mode where workspace might not be hydrated yet)
    if (!workspaceId || workspaceId === 'undefined' || workspaceId === 'null') {
      if (import.meta.env.VITE_E2E_MODE === 'true') {
        // In E2E mode, use a fallback workspace ID from localStorage
        const workspaceData = localStorage.getItem('meridian-workspace');
        if (workspaceData) {
          try {
            const parsed = JSON.parse(workspaceData);
            workspaceId = parsed.state?.workspace?.id || '';
            logger.debug('E2E mode: Using workspace from localStorage', { workspaceId });
          } catch (e) {
            logger.error('Failed to parse workspace from localStorage', { error: e });
          }
        }
      }
      
      // Final validation
      if (!workspaceId || workspaceId === 'undefined' || workspaceId === 'null') {
        throw new Error('Invalid workspace ID provided');
      }
    }

    const response = await fetch(`${API_BASE_URL}/channel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ workspaceId, name }),
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Workspace not found - cannot create channel');
      }
      const errorBody = await response
        .json()
        .catch(() => ({ error: 'Failed to create channel' }));
      const message =
        (typeof errorBody?.details === 'string' && errorBody.details) ||
        (typeof errorBody?.error === 'string' && errorBody.error) ||
        'Failed to create channel';
      throw new Error(message);
    }

    const data = await response.json();
    return data.channel || data;
  }

  async updateChannel(channelId: string, updates: Partial<Channel>): Promise<Channel> {
    const response = await fetch(`${API_BASE_URL}/channel/${channelId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to update channel');
    }

    const data = await response.json();
    return data.channel || data;
  }

  async deleteChannel(channelId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/channel/${channelId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to delete channel');
    }
  }

  async joinChannel(channelId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/channel/${channelId}/join`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Failed to join channel');
    }
  }

  async addReaction(messageId: string, emoji: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/message/${messageId}/reactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ emoji }),
    });

    if (!response.ok) {
      throw new Error('Failed to add reaction');
    }
  }

  async removeReaction(messageId: string, emoji: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/message/${messageId}/reactions/${emoji}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to remove reaction');
    }
  }

  async searchMessages(query: string, channelId?: string): Promise<Message[]> {
    const url = new URL(`${API_BASE_URL}/message/channel/` + (channelId || ''));
    url.searchParams.append('search', query);
    if (channelId) {
      url.searchParams.append('channelId', channelId);
    }

    const response = await fetch(url.toString(), { credentials: 'include' });
    if (!response.ok) {
      throw new Error('Failed to search messages');
    }

    const data = await response.json();
    return data.data?.messages || [];
  }

  private async processAttachments(files: File[]): Promise<any[]> {
    // Process file attachments - this would upload files and return attachment objects
    // For now, return a placeholder structure
    return files.map((file, index) => ({
      id: `temp-${index}`,
      name: file.name,
      type: file.type,
      size: file.size,
      url: URL.createObjectURL(file), // Temporary URL for preview
    }));
  }
}

export const chatService = new ChatService(); 
export default chatService; 