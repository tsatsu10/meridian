import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Paperclip, 
  Smile,
  AtSign,
  Hash,
  Bold,
  Italic,
  Code,
  Link,
  Mic,
  MicOff,
  Upload,
  X,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAccessibility, useFocusTrap } from '@/hooks/useAccessibility';
import { toast } from '@/lib/toast';

interface AccessibleChatInputProps {
  placeholder?: string;
  onSendMessage: (message: string, attachments?: File[]) => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
  maxLength?: number;
  channelId?: string;
  allowAttachments?: boolean;
  allowEmojis?: boolean;
  allowMentions?: boolean;
  className?: string;
}

interface Mention {
  id: string;
  name: string;
  type: 'user' | 'channel';
}

export function AccessibleChatInput({
  placeholder = "Type a message...",
  onSendMessage,
  onTyping,
  disabled = false,
  maxLength = 2000,
  channelId,
  allowAttachments = true,
  allowEmojis = true,
  allowMentions = true,
  className
}: AccessibleChatInputProps) {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [isTyping, setIsTyping] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mentionsContainerRef = useRef<HTMLDivElement>(null);
  const emojiContainerRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  const { announce, focusManager, animationUtils } = useAccessibility({
    announceMessages: true,
    enableKeyboardShortcuts: true
  });

  // Focus trap for emoji/mention panels
  useFocusTrap(mentionsContainerRef, showMentions);
  useFocusTrap(emojiContainerRef, showEmojis);

  // Mock data for mentions and emojis
  const mockUsers: Mention[] = [
    { id: 'user1', name: 'Sarah Johnson', type: 'user' },
    { id: 'user2', name: 'David Chen', type: 'user' },
    { id: 'user3', name: 'Mike Wilson', type: 'user' }
  ];

  const mockChannels: Mention[] = [
    { id: 'channel1', name: 'general', type: 'channel' },
    { id: 'channel2', name: 'development', type: 'channel' },
    { id: 'channel3', name: 'design', type: 'channel' }
  ];

  const commonEmojis = ['😀', '😂', '❤️', '👍', '👎', '😢', '😮', '😡', '🎉', '🚀'];

  // Handle typing indicators
  useEffect(() => {
    const typingTimeout = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        onTyping?.(false);
      }
    }, 1000);

    return () => clearTimeout(typingTimeout);
  }, [message, isTyping, onTyping]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  // Handle message input change
  const handleMessageChange = (value: string) => {
    setMessage(value);
    
    if (!isTyping && value.length > 0) {
      setIsTyping(true);
      onTyping?.(true);
    }

    // Check for mention trigger
    const cursorPos = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@([^@\s]*)$/);
    
    if (mentionMatch && allowMentions) {
      setMentionQuery(mentionMatch[1]);
      setShowMentions(true);
      setCursorPosition(cursorPos);
    } else {
      setShowMentions(false);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Send message on Enter (without Shift)
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
      return;
    }

    // Format shortcuts
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'b':
          event.preventDefault();
          insertFormatting('**', '**');
          announce('Bold formatting applied', 'assertive');
          break;
        case 'i':
          event.preventDefault();
          insertFormatting('*', '*');
          announce('Italic formatting applied', 'assertive');
          break;
        case 'k':
          event.preventDefault();
          insertFormatting('[](', ')');
          announce('Link formatting applied', 'assertive');
          break;
        case '`':
          event.preventDefault();
          insertFormatting('`', '`');
          announce('Code formatting applied', 'assertive');
          break;
      }
    }

    // Handle mention/emoji navigation
    if (showMentions || showEmojis) {
      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          setShowMentions(false);
          setShowEmojis(false);
          textareaRef.current?.focus();
          break;
        case 'ArrowUp':
        case 'ArrowDown':
          // Let the focus trap handle navigation
          break;
      }
    }
  };

  // Insert formatting around selected text
  const insertFormatting = (before: string, after: string) => {
    if (!textareaRef.current) return;

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selectedText = message.slice(start, end);
    
    const newMessage = 
      message.slice(0, start) + 
      before + selectedText + after + 
      message.slice(end);
    
    setMessage(newMessage);
    
    // Restore cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = start + before.length;
        textareaRef.current.selectionEnd = start + before.length + selectedText.length;
        textareaRef.current.focus();
      }
    }, 0);
  };

  // Handle mention selection
  const handleMentionSelect = (mention: Mention) => {
    if (!textareaRef.current) return;

    const beforeMention = message.slice(0, cursorPosition - mentionQuery.length - 1);
    const afterMention = message.slice(cursorPosition);
    const mentionText = mention.type === 'user' ? `@${mention.name}` : `#${mention.name}`;
    
    const newMessage = beforeMention + mentionText + ' ' + afterMention;
    setMessage(newMessage);
    setShowMentions(false);
    
    // Focus back to textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newPosition = beforeMention.length + mentionText.length + 1;
        textareaRef.current.selectionStart = newPosition;
        textareaRef.current.selectionEnd = newPosition;
        textareaRef.current.focus();
      }
    }, 0);

    announce(`${mention.type === 'user' ? 'User' : 'Channel'} ${mention.name} mentioned`, 'assertive');
  };

  // Handle emoji selection
  const handleEmojiSelect = (emoji: string) => {
    if (!textareaRef.current) return;

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    
    const newMessage = 
      message.slice(0, start) + 
      emoji + 
      message.slice(end);
    
    setMessage(newMessage);
    setShowEmojis(false);
    
    // Focus back to textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newPosition = start + emoji.length;
        textareaRef.current.selectionStart = newPosition;
        textareaRef.current.selectionEnd = newPosition;
        textareaRef.current.focus();
      }
    }, 0);

    announce(`Emoji ${emoji} inserted`, 'assertive');
  };

  // Handle file attachments
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => file.size <= 10 * 1024 * 1024); // 10MB limit
    
    if (validFiles.length < files.length) {
      toast.error('Some files were too large (max 10MB)');
    }
    
    setAttachments(prev => [...prev, ...validFiles]);
    announce(`${validFiles.length} file${validFiles.length !== 1 ? 's' : ''} attached`, 'assertive');
    
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    const fileName = attachments[index].name;
    setAttachments(prev => prev.filter((_, i) => i !== index));
    announce(`${fileName} removed`, 'assertive');
  };

  // Handle voice recording
  const toggleRecording = async () => {
    if (!isRecording) {
      try {
        // In a real implementation, start voice recording
        setIsRecording(true);
        announce('Voice recording started', 'assertive');
      } catch (error) {
        toast.error('Could not start voice recording');
      }
    } else {
      setIsRecording(false);
      announce('Voice recording stopped', 'assertive');
    }
  };

  // Send message
  const handleSendMessage = () => {
    if (!message.trim() && attachments.length === 0) return;
    
    if (message.length > maxLength) {
      announce(`Message too long. Maximum ${maxLength} characters allowed.`, 'assertive');
      return;
    }

    onSendMessage(message.trim(), attachments);
    setMessage('');
    setAttachments([]);
    setIsTyping(false);
    onTyping?.(false);
    
    announce('Message sent', 'assertive');
    
    // Focus back to input
    textareaRef.current?.focus();
  };

  const filteredMentions = [
    ...mockUsers.filter(user => 
      user.name.toLowerCase().includes(mentionQuery.toLowerCase())
    ),
    ...mockChannels.filter(channel => 
      channel.name.toLowerCase().includes(mentionQuery.toLowerCase())
    )
  ].slice(0, 5);

  return (
    <div ref={composerRef} className={cn("relative", className)}>
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div 
          className="p-3 border-b bg-muted/50"
          role="region"
          aria-label={`${attachments.length} attachment${attachments.length !== 1 ? 's' : ''}`}
        >
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-background rounded-lg p-2 border"
              >
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center">
                  <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => removeAttachment(index)}
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Input Container */}
      <Card className="border-0 border-t rounded-none">
        <div className="flex items-end gap-2 p-3">
          {/* Attachment Button */}
          {allowAttachments && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 flex-shrink-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                aria-label="Attach files"
                title="Attach files"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                aria-hidden="true"
              />
            </>
          )}

          {/* Message Input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => handleMessageChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              className={cn(
                "w-full min-h-[36px] max-h-[120px] p-2 pr-12 border rounded-lg resize-none",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "placeholder:text-muted-foreground"
              )}
              rows={1}
              aria-label="Message input"
              aria-describedby="message-help"
              aria-invalid={message.length > maxLength}
              maxLength={maxLength}
            />
            
            {/* Character Count */}
            <div 
              id="message-help"
              className={cn(
                "absolute bottom-1 right-1 text-xs",
                message.length > maxLength * 0.9 ? "text-orange-500" : "text-muted-foreground",
                message.length > maxLength ? "text-red-500" : ""
              )}
              aria-live="polite"
            >
              {message.length > maxLength * 0.8 && (
                <span>{message.length}/{maxLength}</span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Emoji Button */}
            {allowEmojis && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0"
                onClick={() => setShowEmojis(!showEmojis)}
                disabled={disabled}
                aria-label="Insert emoji"
                aria-expanded={showEmojis}
                aria-haspopup="menu"
              >
                <Smile className="w-4 h-4" />
              </Button>
            )}

            {/* Voice Recording Button */}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-9 w-9 p-0",
                isRecording && "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400"
              )}
              onClick={toggleRecording}
              disabled={disabled}
              aria-label={isRecording ? "Stop recording" : "Start voice recording"}
              aria-pressed={isRecording}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>

            {/* Send Button */}
            <Button
              size="sm"
              className="h-9 w-9 p-0"
              onClick={handleSendMessage}
              disabled={disabled || (!message.trim() && attachments.length === 0) || message.length > maxLength}
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Format Help */}
        <div className="px-3 pb-2">
          <div className="text-xs text-muted-foreground">
            <span className="sr-only">Formatting shortcuts: </span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl+B</kbd> bold,{' '}
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl+I</kbd> italic,{' '}
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Enter</kbd> send
          </div>
        </div>
      </Card>

      {/* Mentions Dropdown */}
      {showMentions && filteredMentions.length > 0 && (
        <div
          ref={mentionsContainerRef}
          className={cn(
            "absolute bottom-full left-0 right-0 mb-2 bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto z-50",
            animationUtils.shouldAnimate() && "animate-in slide-in-from-bottom-2"
          )}
          role="listbox"
          aria-label="Mention suggestions"
        >
          {filteredMentions.map((mention, index) => (
            <button
              key={mention.id}
              className="w-full px-3 py-2 text-left hover:bg-muted focus:bg-muted focus:outline-none first:rounded-t-lg last:rounded-b-lg"
              onClick={() => handleMentionSelect(mention)}
              role="option"
              aria-selected={false}
            >
              <div className="flex items-center gap-2">
                {mention.type === 'user' ? (
                  <AtSign className="w-4 h-4 text-blue-500" />
                ) : (
                  <Hash className="w-4 h-4 text-green-500" />
                )}
                <span className="font-medium">{mention.name}</span>
                <Badge variant="outline" className="text-xs">
                  {mention.type}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Emoji Picker */}
      {showEmojis && (
        <div
          ref={emojiContainerRef}
          className={cn(
            "absolute bottom-full right-0 mb-2 bg-background border rounded-lg shadow-lg p-3 z-50",
            animationUtils.shouldAnimate() && "animate-in slide-in-from-bottom-2"
          )}
          role="dialog"
          aria-label="Emoji picker"
        >
          <div className="grid grid-cols-5 gap-2">
            {commonEmojis.map((emoji, index) => (
              <button
                key={index}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-muted focus:bg-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={() => handleEmojiSelect(emoji)}
                aria-label={`Insert ${emoji} emoji`}
              >
                <span className="text-lg" role="img" aria-hidden="true">
                  {emoji}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Screen Reader Instructions */}
      <div className="sr-only" id="input-instructions">
        Press Enter to send message, Shift+Enter for new line. 
        Use Ctrl+B for bold, Ctrl+I for italic. 
        Type @ to mention users or # to mention channels.
      </div>
    </div>
  );
}