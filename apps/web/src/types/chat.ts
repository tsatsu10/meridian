export interface MessageUser {
  id: string;
  name: string;
  avatar?: string;
}

export interface MessageReaction {
  emoji: string;
  userId: string;
}

export interface MessageAttachment {
  id: string;
  type: 'image' | 'video' | 'file';
  url: string;
  name: string;
  size: number;
  mimeType: string;
  thumbnailUrl?: string;
}

export interface Message {
  id: string;
  channelId: string;
  content: string;
  user: MessageUser;
  createdAt: string;
  updatedAt?: string;
  reactions: MessageReaction[];
  attachments: MessageAttachment[];
  replyTo?: string; // ID of the message being replied to
  isEdited?: boolean;
}

export interface Channel {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  type: 'public' | 'private' | 'direct';
  members: MessageUser[];
  createdAt: string;
  updatedAt?: string;
  lastMessage?: Message;
  unreadCount: number;
  isArchived?: boolean;
  isMuted?: boolean;
}

export interface ChatState {
  messages: Message[];
  channels: Channel[];
  activeChannelId: string | null;
  isLoading: boolean;
  error: string | null;
}

export type ChatEventType =
  | 'message'
  | 'reaction'
  | 'typing'
  | 'channel_update'
  | 'presence';

export interface ChatEvent {
  type: ChatEventType;
  channelId: string;
  userId: string;
  data: any;
  timestamp: string;
}

export interface TypingEvent extends ChatEvent {
  type: 'typing';
  data: {
    isTyping: boolean;
  };
}

export interface MessageEvent extends ChatEvent {
  type: 'message';
  data: {
    message: Message;
  };
}

export interface ReactionEvent extends ChatEvent {
  type: 'reaction';
  data: {
    messageId: string;
    emoji: string;
    add: boolean;
  };
}

export interface ChannelUpdateEvent extends ChatEvent {
  type: 'channel_update';
  data: {
    channel: Partial<Channel>;
  };
}

export interface PresenceEvent extends ChatEvent {
  type: 'presence';
  data: {
    status: 'online' | 'offline' | 'away';
    lastSeen?: string;
  };
} 