// @epic-4.1-direct-messaging: Direct messaging API mutations
// @persona-sarah: PM needs to send direct messages to team members
// @persona-david: Team lead needs to manage direct message conversations

import { fetchApi } from '@/lib/fetch';
import { DirectMessage } from './direct-messaging-queries';

export interface SendDirectMessageData {
  conversationId: string;
  content: string;
  messageType?: 'text' | 'file' | 'system';
  attachments?: string[];
  parentMessageId?: string;
}

export interface MarkAsReadData {
  conversationId: string;
  userEmail: string;
  messageIds?: string[];
}

// @epic-4.1-direct-messaging: Send a direct message
export async function sendDirectMessage(data: SendDirectMessageData): Promise<DirectMessage> {
  const response = await fetchApi('/direct-messaging/send', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return response.message;
}

// @epic-4.1-direct-messaging: Mark messages as read
export async function markDirectMessagesAsRead(data: MarkAsReadData): Promise<void> {
  await fetchApi('/direct-messaging/mark-read', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

// @epic-4.1-direct-messaging: Archive a direct message conversation
export async function archiveDirectMessageConversation(conversationId: string, userEmail: string): Promise<void> {
  await fetchApi(`/direct-messaging/${conversationId}/archive`, {
    method: 'POST',
    body: JSON.stringify({ userEmail }),
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

// @epic-4.1-direct-messaging: Delete a direct message
export async function deleteDirectMessage(messageId: string, userEmail: string): Promise<void> {
  await fetchApi(`/direct-messaging/message/${messageId}`, {
    method: 'DELETE',
    body: JSON.stringify({ userEmail }),
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

// @epic-4.1-direct-messaging: Edit a direct message
export async function editDirectMessage(messageId: string, content: string, userEmail: string): Promise<DirectMessage> {
  const response = await fetchApi(`/direct-messaging/message/${messageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ content, userEmail }),
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return response.message;
}

// @epic-4.1-direct-messaging: Update user presence status
export async function updateUserPresence(userEmail: string, status: 'online' | 'away' | 'busy', currentPage?: string): Promise<void> {
  await fetchApi('/direct-messaging/presence', {
    method: 'POST',
    body: JSON.stringify({ userEmail, status, currentPage }),
    headers: {
      'Content-Type': 'application/json',
    },
  });
} 