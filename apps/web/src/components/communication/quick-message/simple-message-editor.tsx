import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Paperclip,
  Smile,
  BookTemplate,
  X,
  Mic,
} from 'lucide-react';
import RichTextEditor from '@/components/ui/rich-text-editor';
import EmojiPicker from '@/components/ui/emoji-picker';
import MessageTemplates from '@/components/ui/message-templates';
import DeliveryStatus, { type DeliveryInfo } from '@/components/ui/delivery-status';
import { MESSAGE_LIMITS, FILE_TYPES } from './constants';

interface SimpleMessageEditorProps {
  message: string;
  htmlMessage: string;
  useRichText: boolean;
  attachments: File[];
  isSending: boolean;
  deliveryInfo?: DeliveryInfo;
  mentionSuggestions: { id: string; name: string; email?: string }[];
  onMessageChange: (value: string) => void;
  onHtmlMessageChange: (html: string, plainText: string) => void;
  onToggleRichText: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: (index: number) => void;
  onEmojiSelect: (emoji: string) => void;
  onTemplateSelect: (template: any) => void;
}

export default function SimpleMessageEditor({
  message,
  htmlMessage,
  useRichText,
  attachments,
  isSending,
  deliveryInfo,
  mentionSuggestions,
  onMessageChange,
  onHtmlMessageChange,
  onToggleRichText,
  onKeyDown,
  onFileUpload,
  onRemoveAttachment,
  onEmojiSelect,
  onTemplateSelect,
}: SimpleMessageEditorProps) {
  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onMessageChange(e.target.value);
  }, [onMessageChange]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Message:</label>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleRichText}
            className="text-xs"
            title={useRichText ? "Switch to plain text" : "Enable rich formatting"}
          >
            {useRichText ? "Plain" : "Rich"}
          </Button>
          {deliveryInfo && (
            <DeliveryStatus deliveryInfo={deliveryInfo} showDetails={false} />
          )}
        </div>
      </div>

      {useRichText ? (
        <RichTextEditor
          value={htmlMessage}
          onChange={onHtmlMessageChange}
          onKeyDown={onKeyDown}
          placeholder="Type your message here... (Ctrl/Cmd + Enter to send)"
          disabled={isSending}
          maxLength={MESSAGE_LIMITS.MAX_LENGTH}
          mentionSuggestions={mentionSuggestions}
        />
      ) : (
        <Textarea
          value={message}
          onChange={handleTextareaChange}
          onKeyDown={onKeyDown}
          placeholder="Type your message here... (Ctrl/Cmd + Enter to send)"
          className="min-h-[120px] resize-none"
          disabled={isSending}
        />
      )}

      {/* File Attachments */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Attachments:</div>
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-muted/50 rounded-md p-2 text-sm"
              >
                {file.type.startsWith('audio/') ? (
                  <Mic className="w-4 h-4 text-blue-600" />
                ) : (
                  <Paperclip className="w-4 h-4" />
                )}
                <span className="truncate max-w-[150px]">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({Math.round(file.size / 1024)}KB)
                </span>
                {file.type.startsWith('audio/') && (
                  <span className="text-xs text-blue-600 bg-blue-50 px-1 rounded">
                    Voice
                  </span>
                )}
                <button
                  onClick={() => onRemoveAttachment(index)}
                  className="p-0.5 hover:bg-muted rounded-full"
                  disabled={isSending}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <input
            type="file"
            multiple
            onChange={onFileUpload}
            className="hidden"
            id="file-upload"
            accept={FILE_TYPES.ALLOWED_EXTENSIONS}
            disabled={isSending}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => document.getElementById('file-upload')?.click()}
            disabled={isSending}
            title="Attach files"
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          
          <EmojiPicker
            onEmojiSelect={onEmojiSelect}
            trigger={
              <Button variant="ghost" size="sm" disabled={isSending} title="Add emoji">
                <Smile className="w-4 h-4" />
              </Button>
            }
          />
          
          <MessageTemplates
            onTemplateSelect={onTemplateSelect}
            trigger={
              <Button variant="ghost" size="sm" disabled={isSending} title="Message templates">
                <BookTemplate className="w-4 h-4" />
              </Button>
            }
          />
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {message.length}/{MESSAGE_LIMITS.MAX_LENGTH}
          </span>
        </div>
      </div>
    </div>
  );
}