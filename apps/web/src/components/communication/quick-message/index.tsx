/**
 * Clean QuickMessageModal - Refactored Version
 * 
 * This is the new, clean implementation with:
 * - Proper separation of concerns
 * - Business logic in custom hooks
 * - Smaller, focused components
 * - Consolidated state management
 * - Removed commented-out/incomplete features
 */

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Send,
  Clock,
  X,
  MessageCircle,
} from 'lucide-react';
import { ShineBorder } from '@/components/magicui/shine-border';
import { MagicCard } from '@/components/magicui/magic-card';
import useWorkspaceStore from '@/store/workspace';
import useProjectStore from '@/store/project';
import { useQuickMessage } from '@/hooks/use-quick-message';
import { useDeliveryStatus } from '@/components/ui/delivery-status';
import RecipientSelector from './recipient-selector';
import SimpleMessageEditor from './simple-message-editor';
import QuickMessageErrorBoundary from './error-boundary';
import NetworkStatus from './network-status';

interface Recipient {
  id: string;
  name: string;
  type: 'user' | 'team' | 'channel';
  email?: string;
  isOnline?: boolean;
  avatar?: string;
}

interface QuickMessageModalProps {
  open: boolean;
  onClose: () => void;
  defaultRecipients?: Recipient[];
  workspaceId: string;
  contextType?: 'project' | 'task' | 'general';
  contextId?: string;
}

export default function QuickMessageModal({
  open,
  onClose,
  defaultRecipients = [],
  workspaceId,
  contextType = 'general',
  contextId,
}: QuickMessageModalProps) {
  const { workspace } = useWorkspaceStore();
  const { project } = useProjectStore();
  
  // Local UI state
  const [isRecipientPopoverOpen, setIsRecipientPopoverOpen] = useState(false);

  // Business logic hook
  const {
    state,
    actions,
    availableRecipients,
    mentionSuggestions,
  } = useQuickMessage({
    workspaceId,
    defaultRecipients,
    contextType,
    contextId,
    isOpen: open,
  });

  // Delivery status
  const deliveryInfo = useDeliveryStatus(state.lastMessageId || '');

  // Let Command component handle internal filtering

  // Handle key events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSendMessage();
    }
  }, []);

  // Handle send message
  const handleSendMessage = useCallback(async () => {
    const success = await actions.sendMessage();
    if (success) {
      onClose();
    }
  }, [actions, onClose]);

  // Handle file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    actions.addAttachments(files);
    event.target.value = '';
  }, [actions]);

  // Handle emoji selection
  const handleEmojiSelect = useCallback((emoji: string) => {
    if (state.useRichText) {
      actions.setHtmlMessage(state.htmlMessage + emoji);
      actions.setMessage(state.message + emoji);
    } else {
      actions.setMessage(state.message + emoji);
    }
  }, [state.useRichText, state.htmlMessage, state.message, actions]);

  // Handle template selection
  const handleTemplateSelect = useCallback((template: any) => {
    if (state.useRichText) {
      actions.setHtmlMessage(template.content);
      actions.setMessage(template.content.replace(/<[^>]*>/g, ''));
    } else {
      actions.setMessage(template.content);
    }
  }, [state.useRichText, actions]);

  // Handle rich text changes
  const handleRichTextChange = useCallback((html: string, plainText: string) => {
    actions.setHtmlMessage(html);
    actions.setMessage(plainText);
  }, [actions]);

  // Handle modal close
  const handleClose = useCallback(() => {
    actions.reset();
    onClose();
  }, [actions, onClose]);

  // Content wrapper for magic UI styling
  const ContentWrapper = ({ children }: { children: React.ReactNode }) => (
    <>
      <div className="block dark:hidden">
        {children}
      </div>
      <div className="hidden dark:block">
        <ShineBorder
          className="relative overflow-hidden rounded-lg border-0 bg-white dark:bg-gray-900"
          color={["#A07CFE", "#FE8FB5", "#FFBE7B"]}
        >
          <MagicCard className="cursor-pointer border-0 bg-white dark:bg-gray-900 shadow-none">
            {children}
          </MagicCard>
        </ShineBorder>
      </div>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden bg-white dark:bg-gray-900">
        <QuickMessageErrorBoundary
          onError={(error, errorInfo) => {
            // Log to monitoring service in production
            console.error('QuickMessage Error:', { error, errorInfo, workspaceId, contextType });
          }}
        >
          <ContentWrapper>
          <div className="bg-white dark:bg-gray-900 p-6 space-y-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-blue-600" />
                Quick Message
                {contextType !== 'general' && (
                  <Badge variant="secondary" className="text-xs">
                    {contextType === 'project' && project?.name}
                    {contextType === 'task' && 'Task Context'}
                  </Badge>
                )}
                <div className="ml-auto">
                  <NetworkStatus />
                </div>
              </DialogTitle>
              <DialogDescription>
                Send a message to users, teams, or channels with rich formatting, emojis, and file attachments.
              </DialogDescription>
            </DialogHeader>

            <RecipientSelector
              selectedRecipients={state.selectedRecipients}
              availableRecipients={availableRecipients}
              recentConversations={state.recentConversations}
              showRecentConversations={state.showRecentConversations}
              isLoadingChannels={state.isLoadingChannels}
              isRecipientPopoverOpen={isRecipientPopoverOpen}
              onRecipientPopoverOpenChange={setIsRecipientPopoverOpen}
              onAddRecipient={actions.addRecipient}
              onRemoveRecipient={actions.removeRecipient}
              onToggleRecentConversations={actions.toggleRecentConversations}
              onSelectFromRecentConversations={actions.selectFromRecentConversations}
            />

            <SimpleMessageEditor
              message={state.message}
              htmlMessage={state.htmlMessage}
              useRichText={state.useRichText}
              attachments={state.attachments}
              isSending={state.isSending}
              deliveryInfo={deliveryInfo}
              mentionSuggestions={mentionSuggestions}
              onMessageChange={actions.setMessage}
              onHtmlMessageChange={handleRichTextChange}
              onToggleRichText={actions.toggleRichText}
              onKeyDown={handleKeyDown}
              onFileUpload={handleFileUpload}
              onRemoveAttachment={actions.removeAttachment}
              onEmojiSelect={handleEmojiSelect}
              onTemplateSelect={handleTemplateSelect}
            />

            {/* Send Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSendMessage}
                disabled={!state.message.trim() || state.selectedRecipients.length === 0 || state.isSending}
                className="flex items-center gap-2"
              >
                {state.isSending ? (
                  <Clock className="w-4 h-4" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {state.isSending ? 'Sending...' : 'Send'}
              </Button>
            </div>

            {/* Quick Tips */}
            <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-md">
              <div className="font-medium mb-1">Quick tips:</div>
              <ul className="space-y-1">
                <li>• Press Ctrl/Cmd + Enter to send quickly</li>
                <li>• Switch to "Rich" mode for formatting (bold, italic, links, lists)</li>
                <li>• Use @ to mention team members (in rich text mode)</li>
                <li>• Click 📄 for message templates</li>
                <li>• Add emojis 😊 and attach files up to 10MB each</li>
                <li>• Messages auto-save as drafts and show delivery status</li>
              </ul>
            </div>
          </div>
        </ContentWrapper>
        </QuickMessageErrorBoundary>
      </DialogContent>
    </Dialog>
  );
}