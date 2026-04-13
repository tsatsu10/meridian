export interface Channel {
  id: string;
  name: string;
  description?: string;
  type: 'project' | 'team' | 'dm' | 'announcement' | 'private';
  workspaceId: string;
  teamId?: string;
  projectId?: string;
  createdBy: string;
  archived: boolean;
  createdAt: Date;
  memberRole?: string;
  // Enhanced properties for better UX
  isPrivate?: boolean;
  memberCount?: number;
  unreadCount?: number;
  lastActivity?: Date;
  lastMessage?: string;
  avatarUrl?: string;
}

export interface Message {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  createdAt: Date;
  updatedAt?: Date;
  parentMessageId?: string;
  isPinned?: boolean;
  reactions?: MessageReaction[];
  attachments?: MessageAttachment[];
  mentions?: string[];
  editHistory?: MessageEdit[];
}

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: Date;
}

export interface MessageAttachment {
  id: string;
  messageId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  thumbnailUrl?: string;
}

export interface MessageEdit {
  id: string;
  messageId: string;
  previousContent: string;
  editedAt: Date;
}

export interface ChannelMembership {
  id: string;
  channelId: string;
  userId: string;
  role: 'admin' | 'member' | 'guest';
  joinedAt: Date;
  permissions?: ChannelPermission[];
}

export interface ChannelPermission {
  id: string;
  name: string;
  description: string;
  canRead: boolean;
  canWrite: boolean;
  canManage: boolean;
}

export interface CreateChannelData {
  name: string;
  description?: string;
  type?: string;
  workspaceId: string;
  teamId?: string;
  projectId?: string;
  isPrivate?: boolean;
} 