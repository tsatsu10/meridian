// WebSocket Types for Team Chat

import type { TeamMessage, MessageReaction } from './message';

export type WebSocketEventType = 
  | 'message:new'
  | 'message:edited'
  | 'message:deleted'
  | 'reaction:added'
  | 'reaction:removed'
  | 'typing:update'
  | 'user:joined'
  | 'user:left'
  | 'message:read'
  | 'connection:established'
  | 'connection:error';

export interface WebSocketMessage<T = unknown> {
  type: WebSocketEventType;
  data: T;
  timestamp: string;
}

export interface NewMessageEvent {
  message: TeamMessage;
}

export interface MessageEditedEvent {
  messageId: string;
  content: string;
  updatedAt: string;
  isEdited: true;
}

export interface MessageDeletedEvent {
  messageId: string;
  deletedAt: string;
}

export interface ReactionAddedEvent {
  messageId: string;
  reaction: MessageReaction;
}

export interface ReactionRemovedEvent {
  messageId: string;
  userId: string;
  emoji: string;
}

export interface TypingUpdateEvent {
  teamId: string;
  userEmail: string;
  userName?: string;
  isTyping: boolean;
}

export interface UserJoinedEvent {
  userEmail: string;
  userName?: string;
}

export interface UserLeftEvent {
  userEmail: string;
}

export interface MessageReadEvent {
  messageId: string;
  userEmail: string;
  readAt: string;
}

export type WebSocketEventData =
  | NewMessageEvent
  | MessageEditedEvent
  | MessageDeletedEvent
  | ReactionAddedEvent
  | ReactionRemovedEvent
  | TypingUpdateEvent
  | UserJoinedEvent
  | UserLeftEvent
  | MessageReadEvent;

