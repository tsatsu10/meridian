// @epic-3.5-communication: Enhanced message input with file attachments and mentions
import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Send, 
  Paperclip, 
  Smile, 
  AtSign,
  X,
  FileText,
  Image as ImageIcon
} from "lucide-react";
import { cn } from "@/lib/cn";
import { CommunicationPermissions } from "../MainCommunicationInterface";

interface MessageInputProps {
  onSendMessage: (content: string, attachments?: File[]) => void;
  placeholder?: string;
  userPermissions: CommunicationPermissions;
  disabled?: boolean;
  className?: string;
}

interface AttachmentPreview {
  file: File;
  url?: string;
  type: 'image' | 'file';
}

export function MessageInput({
  onSendMessage,
  placeholder = "Type a message...",
  userPermissions,
  disabled = false,
  className
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mentions, setMentions] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Common emojis for quick access
  const commonEmojis = ['😀', '😂', '😍', '🤔', '👍', '👎', '❤️', '🎉', '🚀', '💯'];

  // Handle message submission
  const handleSendMessage = useCallback(() => {
    if (!message.trim() && attachments.length === 0) return;
    if (disabled) return;

    const files = attachments.map(a => a.file);
    onSendMessage(message.trim(), files);
    
    // Clear input
    setMessage("");
    setAttachments([]);
    setMentions([]);
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [message, attachments, disabled, onSendMessage]);

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    files.forEach(file => {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`);
        return;
      }

      const attachment: AttachmentPreview = {
        file,
        type: file.type.startsWith('image/') ? 'image' : 'file'
      };

      // Create preview URL for images
      if (attachment.type === 'image') {
        attachment.url = URL.createObjectURL(file);
      }

      setAttachments(prev => [...prev, attachment]);
    });

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(prev => {
      const attachment = prev[index];
      if (attachment.url) {
        URL.revokeObjectURL(attachment.url);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  // Handle emoji selection
  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Auto-resize
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';

    // Check for mentions
    const mentionMatch = value.match(/@(\w+)/g);
    if (mentionMatch) {
      setMentions(mentionMatch.map(m => m.substring(1)));
    } else {
      setMentions([]);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={cn("border-t bg-background p-4", className)}>
      {/* Attachment Previews */}
      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((attachment, index) => (
            <div
              key={index}
              className="relative flex items-center space-x-2 p-2 bg-muted rounded border"
            >
              {attachment.type === 'image' && attachment.url ? (
                <img
                  src={attachment.url}
                  alt={attachment.file.name}
                  className="w-12 h-12 object-cover rounded"
                />
              ) : (
                <div className="w-12 h-12 bg-muted-foreground/10 rounded flex items-center justify-center">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {attachment.file.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatFileSize(attachment.file.size)}
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeAttachment(index)}
                className="h-6 w-6 p-0 absolute -top-1 -right-1 bg-background border shadow-sm"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Mentions Preview */}
      {mentions.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {mentions.map((mention, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              @{mention}
            </Badge>
          ))}
        </div>
      )}

      {/* Message Input */}
      <div className="flex items-end space-x-2">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            className="min-h-[40px] max-h-[120px] resize-none pr-20"
            rows={1}
          />

          {/* Input Actions */}
          <div className="absolute right-2 bottom-2 flex items-center space-x-1">
            {/* File Attachment */}
            {userPermissions.canShareFiles && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled}
                  className="h-8 w-8 p-0"
                  title="Attach file"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </>
            )}

            {/* Emoji Picker */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                disabled={disabled}
                className="h-8 w-8 p-0"
                title="Add emoji"
              >
                <Smile className="h-4 w-4" />
              </Button>

              {showEmojiPicker && (
                <div className="absolute bottom-full right-0 mb-2 p-3 bg-background border rounded-lg shadow-lg z-10">
                  <div className="grid grid-cols-5 gap-1">
                    {commonEmojis.map((emoji) => (
                      <Button
                        key={emoji}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEmojiSelect(emoji)}
                        className="h-8 w-8 p-0 text-base hover:bg-muted"
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSendMessage}
          disabled={disabled || (!message.trim() && attachments.length === 0)}
          size="sm"
          className="h-10"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Keyboard Hint */}
      <div className="mt-2 text-xs text-muted-foreground">
        Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd> to send, 
        <kbd className="px-1 py-0.5 bg-muted rounded text-xs ml-1">Shift + Enter</kbd> for new line
      </div>

      {/* Click outside to close emoji picker */}
      {showEmojiPicker && (
        <div 
          className="fixed inset-0 z-5" 
          onClick={() => setShowEmojiPicker(false)}
        />
      )}
    </div>
  );
} 