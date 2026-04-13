// Message Composer - Message input component

import React, { useRef } from 'react';
import { CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, Paperclip, Clock } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useChatState, useChatActions } from '../context/ChatContext';
import { ReplyPreview } from './ReplyPreview';
import { FileAttachmentList } from './FileAttachmentList';

interface MessageComposerProps {
  teamId: string;
  teamName: string;
}

/**
 * MessageComposer - Input area for composing and sending messages
 * 
 * Features:
 * - Text input with Enter to send, Shift+Enter for newline
 * - File attachment support
 * - Reply preview
 * - Character count
 * - Announcement mode styling
 */
export function MessageComposer({ teamId, teamName }: MessageComposerProps) {
  const { composing, ui } = useChatState();
  const actions = useChatActions();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSending, setIsSending] = React.useState(false);

  const handleSend = async () => {
    if (!composing.content.trim() || isSending) return;

    setIsSending(true);
    try {
      await actions.sendMessage(composing.content);
      textareaRef.current?.focus();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      actions.addFiles(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const placeholder = composing.isAnnouncement
    ? '📢 Type your team announcement...'
    : 'Type a message... (use @email to mention someone)';

  const characterLimit = 2000;
  const characterCount = composing.content.length;
  const isOverLimit = characterCount > characterLimit;

  return (
    <CardContent className="flex-shrink-0 p-4 space-y-2">
      {/* Reply Preview */}
      {composing.replyTo && <ReplyPreview message={composing.replyTo} />}

      {/* File Attachments */}
      {composing.files.length > 0 && <FileAttachmentList files={composing.files} />}

      {/* Input Area */}
      <div className="flex gap-2">
        <Textarea
          ref={textareaRef}
          value={composing.content}
          onChange={(e) => actions.setComposingContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            'flex-1 min-h-[60px] max-h-[120px] resize-none',
            composing.isAnnouncement && 'border-orange-500 focus-visible:ring-orange-500'
          )}
          disabled={isSending}
          aria-label="Message input"
          maxLength={characterLimit}
        />

        <div className="flex flex-col gap-2">
          {/* Attach File */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
            className="h-9 w-9 p-0"
            aria-label="Attach file"
          >
            <Paperclip className="w-4 h-4" />
          </Button>

          {/* Send Button */}
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!composing.content.trim() || isSending || isOverLimit}
            className={cn(
              'h-9 w-9 p-0',
              composing.isAnnouncement && 'bg-orange-600 hover:bg-orange-700'
            )}
            aria-label="Send message"
          >
            {isSending ? (
              <Clock className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.mp4,.mp3,.wav"
          aria-label="Upload file"
        />
      </div>

      {/* Helper Text */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Press Enter to send, Shift+Enter for new line</span>
        <span className={cn(isOverLimit && 'text-red-500 font-medium')}>
          {characterCount}/{characterLimit}
        </span>
      </div>
    </CardContent>
  );
}

