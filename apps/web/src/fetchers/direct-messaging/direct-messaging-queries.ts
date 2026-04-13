// @epic-4.1-direct-messaging: Direct messaging API queries
// @persona-sarah: PM needs direct communication with team members
// @persona-david: Team lead needs private conversations with team members

import { fetchApi } from '@/lib/fetch';

export interface DirectMessageConversation {
  id: string;
  user1Email: string;
  user2Email: string;
  channelId: string;
  unreadCount1: number;
  unreadCount2: number;
  lastMessageAt: Date;
  lastMessageContent?: string;
  lastMessageSender?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DirectMessage {
  id: string;
  channelId: string;
  userEmail: string;
  content: string;
  messageType: 'text' | 'file' | 'system';
  attachments?: string;
  isEdited: boolean;
  editedAt?: Date;
  createdAt: Date;
  userName?: string;
  userAvatar?: string;
}

export interface UserPresence {
  userEmail: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: Date;
  currentPage?: string;
  isTyping?: boolean;
}

// @epic-4.1-direct-messaging: Get all direct message conversations for a user
export async function getDirectMessageConversations(userEmail: string, workspaceId: string): Promise<DirectMessageConversation[]> {
  const response = await fetchApi(`/direct-messaging/conversations?userEmail=${encodeURIComponent(userEmail)}&workspaceId=${encodeURIComponent(workspaceId)}`);
  return response.conversations || [];
}

// @epic-4.1-direct-messaging: Get or create a direct message conversation
export async function getOrCreateConversation(userEmail: string, targetUserEmail: string, workspaceId: string): Promise<DirectMessageConversation> {
  const response = await fetchApi('/direct-messaging/conversation', {
    method: 'POST',
    body: JSON.stringify({
      userEmail,
      targetUserEmail,
      workspaceId
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return response.conversation;
}

// @epic-4.1-direct-messaging: Get message history for a direct message conversation
export async function getDirectMessageHistory(conversationId: string, limit = 50, offset = 0): Promise<DirectMessage[]> {
  const searchParams = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });
  
  const response = await fetchApi(`/direct-messaging/${conversationId}/messages?${searchParams}`);
  return response.messages || [];
}

// @epic-4.1-direct-messaging: Get online users in workspace
export async function getOnlineUsers(workspaceId: string): Promise<UserPresence[]> {
  const response = await fetchApi(`/direct-messaging/online-users?workspaceId=${encodeURIComponent(workspaceId)}`);
  return response.users || [];
}

// @epic-4.1-direct-messaging: Get user presence status
export async function getUserPresence(userEmail: string): Promise<UserPresence> {
  const response = await fetchApi(`/direct-messaging/presence/${encodeURIComponent(userEmail)}`);
  return response.presence;
}

// @epic-4.1-direct-messaging: Search users for direct messaging
export async function searchUsersForDirectMessage(query: string, workspaceId: string, excludeUserEmail?: string): Promise<Array<{
  email: string;
  name: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
}>> {
  const searchParams = new URLSearchParams({
    query,
    workspaceId,
    ...(excludeUserEmail && { excludeUserEmail }),
  });
  
  const response = await fetchApi(`/direct-messaging/search-users?${searchParams}`);
  return response.users || [];
} 