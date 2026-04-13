import { fetchApi } from '@/lib/fetch';
import { logger } from "../lib/logger";

export interface MessageSendRequest {
  recipients: {
    type: 'user' | 'team' | 'channel';
    id: string;
    email?: string;
  }[];
  content: string;
  attachments?: {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }[];
  contextType?: 'project' | 'task' | 'general';
  contextId?: string;
}

export interface MessageSendResponse {
  success: boolean;
  data: {
    messageId: string;
    sentTo: number;
    failedRecipients?: string[];
  };
}

export interface Channel {
  id: string;
  name: string;
  type: 'public' | 'private';
  memberCount?: number;
  description?: string;
}

export interface ChannelsResponse {
  success: boolean;
  data: {
    channels: Channel[];
  };
}

export interface ConversationHistory {
  id: string;
  participants: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  }[];
  lastMessage?: {
    content: string;
    timestamp: string;
    senderName: string;
  };
  unreadCount: number;
}

export interface ConversationHistoryResponse {
  success: boolean;
  data: {
    conversations: ConversationHistory[];
  };
}

// Send a quick message to multiple recipients using the new bulk endpoint
export async function sendQuickMessage(request: MessageSendRequest): Promise<MessageSendResponse> {
  try {
    // Use the new bulk send endpoint for better performance and reliability
    const response = await fetchApi('/api/message/bulk-send', {
      method: 'POST',
      body: JSON.stringify({
        recipients: request.recipients,
        content: request.content,
        attachments: request.attachments,
        contextType: request.contextType,
        contextId: request.contextId,
        messageType: 'text',
      }),
    });

    if (response.success && response.data) {
      return {
        success: true,
        data: {
          messageId: response.data.messageId,
          sentTo: response.data.sentTo,
          failedRecipients: response.data.failedRecipients,
        },
      };
    } else {
      throw new Error(response.error || 'Failed to send message');
    }
  } catch (error) {
    console.error('Failed to send quick message:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to send message');
  }
}

// Get channels for workspace
export async function getWorkspaceChannels(workspaceId: string): Promise<ChannelsResponse> {
  try {
    const response = await fetchApi(`/api/channel/${workspaceId}`);
    
    return {
      success: true,
      data: {
        channels: response.data?.channels?.map((channel: any) => ({
          id: channel.id,
          name: channel.name,
          type: channel.type || channel.isPrivate ? 'private' : 'public',
          memberCount: channel.memberCount,
          description: channel.description,
        })) || [],
      },
    };
  } catch (error) {
    console.error('Failed to fetch channels:', error);
    return {
      success: false,
      data: { channels: [] },
    };
  }
}

// Get recent conversation history for message suggestions
export async function getRecentConversations(workspaceId: string, limit = 10): Promise<ConversationHistoryResponse> {
  try {
    const response = await fetchApi(`/api/direct-messaging/conversations`, {
      params: {
        workspaceId,
        limit: limit.toString()
      }
    });
    
    return {
      success: true,
      data: {
        conversations: response.data?.conversations?.map((conv: any) => ({
          id: conv.id,
          participants: conv.participants || [],
          lastMessage: conv.lastMessage,
          unreadCount: conv.unreadCount || 0,
        })) || [],
      },
    };
  } catch (error) {
    console.error('Failed to fetch conversation history:', error);
    // Check if it's a 404 or endpoint not found error
    if (error instanceof Error && (error.message.includes('404') || error.message.includes('Not Found'))) {
      logger.info("Conversations endpoint not implemented yet");
    }
    return {
      success: false,
      data: { conversations: [] },
    };
  }
}

// Save draft message
export async function saveDraft(workspaceId: string, content: string, recipients: any[]): Promise<void> {
  try {
    const draftKey = `quick-message-draft-${workspaceId}`;
    const draft = {
      content,
      recipients,
      timestamp: Date.now(),
    };
    localStorage.setItem(draftKey, JSON.stringify(draft));
  } catch (error) {
    console.error('Failed to save draft:', error);
  }
}

// Load draft message
export function loadDraft(workspaceId: string): { content: string; recipients: any[] } | null {
  try {
    const draftKey = `quick-message-draft-${workspaceId}`;
    const draftStr = localStorage.getItem(draftKey);
    if (!draftStr) return null;
    
    const draft = JSON.parse(draftStr);
    
    // Check if draft is not too old (24 hours)
    if (Date.now() - draft.timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(draftKey);
      return null;
    }
    
    return {
      content: draft.content || '',
      recipients: draft.recipients || [],
    };
  } catch (error) {
    console.error('Failed to load draft:', error);
    return null;
  }
}

// Clear draft
export function clearDraft(workspaceId: string): void {
  try {
    const draftKey = `quick-message-draft-${workspaceId}`;
    localStorage.removeItem(draftKey);
  } catch (error) {
    console.error('Failed to clear draft:', error);
  }
}