// Team Chat Message Types
// Strict TypeScript definitions for team messaging

export type MessageType = 'text' | 'file' | 'announcement' | 'system';
export type MessageStatus = 'sending' | 'sent' | 'failed';

export interface TeamMessage {
  id: string;
  teamId: string;
  userId: string;
  userEmail: string;
  authorName?: string;
  
  // Content
  content: string;
  messageType: MessageType;
  
  // Threading
  replyTo?: string;
  threadCount?: number;
  
  // Metadata
  mentions: string[];
  metadata?: Record<string, unknown>;
  attachments?: MessageAttachment[];
  
  // Status
  isEdited: boolean;
  editedAt?: string;
  isDeleted: boolean;
  deletedAt?: string;
  
  // Engagement
  reactions: MessageReaction[];
  readBy: string[];
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface MessageAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  thumbnailUrl?: string;
}

export interface MessageReaction {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string;
  emoji: string;
  createdAt: string;
}

export interface TypingUser {
  userEmail: string;
  userName?: string;
  startedAt: number;
}

export interface SendMessageData {
  content: string;
  messageType?: MessageType;
  mentions?: string[];
  metadata?: Record<string, unknown>;
  replyTo?: string;
  attachments?: File[];
}

export interface EditMessageData {
  messageId: string;
  content: string;
}

export interface ReactionData {
  messageId: string;
  emoji: string;
}

export interface MessagesResponse {
  success: boolean;
  data: {
    messages: TeamMessage[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  };
}

export interface OptimisticMessage extends Omit<TeamMessage, 'id'> {
  id: string;
  status: MessageStatus;
  tempId?: string;
}

