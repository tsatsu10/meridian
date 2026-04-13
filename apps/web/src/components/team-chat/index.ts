// Team Chat - Main Export
// New modular team chat implementation

export { TeamChatContainer as default } from './TeamChatContainer';
export { TeamChatContainer } from './TeamChatContainer';

// Context and hooks
export { ChatProvider, useChat, useChatState, useChatActions } from './context/ChatContext';

// Types
export type {
  TeamMessage,
  MessageType,
  SendMessageData,
  ChatState,
  ChatActions,
  TeamChatProps,
} from './types';

// Components (for advanced usage)
export { ChatLayout } from './layouts/ChatLayout';
export { ChatSkeleton } from './layouts/ChatSkeleton';
export { ChatHeader } from './header/ChatHeader';
export { MessageArea } from './messages/MessageArea';
export { MessageList } from './messages/MessageList';
export { MessageItem } from './messages/MessageItem';
export { MessageComposer } from './input/MessageComposer';

