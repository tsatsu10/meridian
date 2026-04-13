// Chat Layout - Main chat UI structure
// Organizes header, messages, and input areas

import React from 'react';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/cn';
import { ChatHeader } from '../header/ChatHeader';
import { MessageArea } from '../messages/MessageArea';
import { MessageComposer } from '../input/MessageComposer';
import { useChatState, useChatActions } from '../context/ChatContext';
import { ChatNotification } from './ChatNotification';
import { EditMessageModal } from '../modals/EditMessageModal';
import { DeleteMessageModal } from '../modals/DeleteMessageModal';
import type { TeamChatProps } from '../types';

interface ChatLayoutProps extends TeamChatProps {
  onClose?: () => void;
}

/**
 * ChatLayout - Main chat interface layout
 * 
 * Organizes the chat UI into header, messages area, and input composer.
 * Handles drag-and-drop for files and displays notifications.
 */
export function ChatLayout({ teamId, teamName, className, onClose }: ChatLayoutProps) {
  const { ui, messages } = useChatState();
  const actions = useChatActions();

  // Find the message being edited/deleted
  const editingMessage = messages.find(m => m.id === ui.editingMessageId);
  const deletingMessage = messages.find(m => m.id === ui.deletingMessageId);

  return (
    <Card 
      className={cn(
        "flex flex-col h-[600px] max-h-[80vh] relative overflow-hidden bg-white shadow-2xl",
        className
      )}
    >
      {/* Notification Toast */}
      {ui.notification && (
        <ChatNotification notification={ui.notification} />
      )}

      {/* Header */}
      <ChatHeader teamId={teamId} teamName={teamName} onClose={onClose} />
      
      <Separator />

      {/* Messages Area */}
      <MessageArea />

      <Separator />

      {/* Message Input */}
      <MessageComposer teamId={teamId} teamName={teamName} />
      
      {/* Edit Message Modal */}
      {editingMessage && (
        <EditMessageModal 
          open={!!ui.editingMessageId}
          initialContent={ui.editingContent}
          onSave={(newContent) => actions.editMessage(ui.editingMessageId!, newContent)}
          onCancel={actions.cancelEditing}
        />
      )}
      
      {/* Delete Message Modal */}
      {deletingMessage && (
        <DeleteMessageModal 
          open={!!ui.deletingMessageId}
          messagePreview={deletingMessage.content}
          onConfirm={() => actions.deleteMessage(ui.deletingMessageId!)}
          onCancel={actions.cancelDeleting}
        />
      )}
    </Card>
  );
}

