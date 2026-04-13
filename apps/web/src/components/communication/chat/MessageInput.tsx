// @epic-3.5-communication: Message input component with mentions, file upload, and formatting
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Send, 
  Paperclip, 
  Smile, 
  Image,
  FileText,
  X,
  AtSign,
  Bold,
  Italic,
  Code,
  Link,
  Upload
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { TeamMember } from "./ChatInterface";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Icon wrappers
const SendIcon = Send as React.FC<{ className?: string }>;
const PaperclipIcon = Paperclip as React.FC<{ className?: string }>;
const SmileIcon = Smile as React.FC<{ className?: string }>;
const ImageIcon = Image as React.FC<{ className?: string }>;
const FileTextIcon = FileText as React.FC<{ className?: string }>;
const XIcon = X as React.FC<{ className?: string }>;
const AtSignIcon = AtSign as React.FC<{ className?: string }>;
const BoldIcon = Bold as React.FC<{ className?: string }>;
const ItalicIcon = Italic as React.FC<{ className?: string }>;
const CodeIcon = Code as React.FC<{ className?: string }>;
const LinkIcon = Link as React.FC<{ className?: string }>;
const UploadIcon = Upload as React.FC<{ className?: string }>;

interface MessageInputProps {
  onSend: (content: string, attachments?: File[], mentions?: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  canUploadFiles?: boolean;
  teamMembers?: TeamMember[];
  replyingTo?: {
    id: string;
    userName: string;
    content: string;
  } | null;
  onCancelReply?: () => void;
  channelName?: string;
  maxLength?: number;
  className?: string;
}

interface UploadingFile {
  file: File;
  progress: number;
  id: string;
  error?: string;
}

const COMMON_EMOJIS = ['😀', '😂', '❤️', '👍', '👎', '😮', '😢', '😡', '🎉', '🔥', '💯', '⭐', '✨', '🚀', '💪', '🤔', '🤝', '👏', '🙌', '🎯'];

const ALL_EMOJIS = [
  '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', 
  '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒',
  '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡',
  '👍', '👎', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖',
  '🔥', '💯', '💫', '⭐', '🌟', '💥', '💢', '💨', '💦', '💤', '🕳️', '💣', '💬', '👁️‍🗨️', '🗨️', '��️',
  '🎉', '🎊', '🎈', '🎁', '🎀', '🎂', '🍰', '🧁', '🥳', '🎯', '🎮', '🎲', '🎪', '🎭', '🎨', '🎬'
];

export default function MessageInput({
  onSend,
  placeholder = "Type a message...",
  disabled = false,
  canUploadFiles = true,
  teamMembers = [],
  replyingTo,
  onCancelReply,
  channelName,
  maxLength = 2000,
  className
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const [showFormatting, setShowFormatting] = useState(false);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, 120) + 'px';
    }
  }, [message]);

  // Handle mention detection
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const text = message.slice(0, cursorPosition);
    const lastAtIndex = text.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const afterAt = text.slice(lastAtIndex + 1);
      if (!afterAt.includes(' ') && afterAt.length <= 20) {
        setMentionQuery(afterAt);
        setShowMentions(true);
        setSelectedMentionIndex(0);
        return;
      }
    }
    
    setShowMentions(false);
    setMentionQuery("");
  }, [message, cursorPosition]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target as Element)?.closest('.emoji-picker')) {
        setShowEmojiPicker(false);
      }
      if (!(event.target as Element)?.closest('.mentions-dropdown')) {
        setShowMentions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredMembers = teamMembers.filter(member =>
    member.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const handleSend = () => {
    if ((!message.trim() && uploadingFiles.length === 0) || disabled) return;
    
    // Extract mentions from message
    const mentions = extractMentions(message);
    
    // Get completed file uploads
    const completedFiles = uploadingFiles
      .filter(f => f.progress === 100)
      .map(f => f.file);
    
    onSend(message.trim(), completedFiles, mentions);
    
    // Reset state
    setMessage("");
    setUploadingFiles([]);
    setShowEmojiPicker(false);
    setShowMentions(false);
    setShowFormatting(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Handle mentions navigation
    if (showMentions && filteredMembers.length > 0) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev > 0 ? prev - 1 : filteredMembers.length - 1
        );
        return;
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev < filteredMembers.length - 1 ? prev + 1 : 0
        );
        return;
      } else if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        insertMention(filteredMembers[selectedMentionIndex]);
        return;
      }
    }

    // Keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'Enter':
          e.preventDefault();
          handleSend();
          return;
        case 'b':
          e.preventDefault();
          insertFormatting('bold');
          return;
        case 'i':
          e.preventDefault();
          insertFormatting('italic');
          return;
        case 'k':
          e.preventDefault();
          insertFormatting('link');
          return;
        case '`':
          e.preventDefault();
          insertFormatting('code');
          return;
      }
    }

    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Allow new line with Shift+Enter
        return;
      } else {
        e.preventDefault();
        handleSend();
      }
    } else if (e.key === 'Escape') {
      if (replyingTo && onCancelReply) {
        onCancelReply();
      } else if (showEmojiPicker) {
        setShowEmojiPicker(false);
      } else if (showMentions) {
        setShowMentions(false);
      }
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setMessage(value);
      setCursorPosition(e.target.selectionStart);
    }
  };

  const handleFileUpload = (files: FileList) => {
    if (!canUploadFiles) return;
    
    Array.from(files).forEach(file => {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        console.error('File too large:', file.name);
        return;
      }

      const uploadId = Math.random().toString(36).substr(2, 9);
      
      // Add to uploading files
      setUploadingFiles(prev => [...prev, {
        file,
        progress: 0,
        id: uploadId
      }]);
      
      // Simulate file upload progress
      simulateUpload(uploadId);
    });
  };

  const simulateUpload = (uploadId: string) => {
    const interval = setInterval(() => {
      setUploadingFiles(prev => prev.map(f => {
        if (f.id === uploadId) {
          const newProgress = Math.min(f.progress + Math.random() * 20, 100);
          if (newProgress === 100) {
            clearInterval(interval);
          }
          return { ...f, progress: newProgress };
        }
        return f;
      }));
    }, 300);

    // Simulate occasional errors
    if (Math.random() < 0.1) {
      setTimeout(() => {
        setUploadingFiles(prev => prev.map(f => {
          if (f.id === uploadId) {
            clearInterval(interval);
            return { ...f, error: 'Upload failed' };
          }
          return f;
        }));
      }, 2000);
    }
  };

  const removeUploadingFile = (uploadId: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== uploadId));
  };

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newMessage = message.slice(0, start) + emoji + message.slice(end);
    
    setMessage(newMessage);
    setShowEmojiPicker(false);
    
    // Focus and set cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  const insertMention = (member: TeamMember) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const text = message.slice(0, cursorPosition);
    const lastAtIndex = text.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const beforeAt = message.slice(0, lastAtIndex);
      const afterCursor = message.slice(cursorPosition);
      const newMessage = beforeAt + `@${member.name} ` + afterCursor;
      
      setMessage(newMessage);
      setShowMentions(false);
      setMentionQuery("");
      
      // Focus and set cursor position
      setTimeout(() => {
        textarea.focus();
        const newPosition = lastAtIndex + member.name.length + 2;
        textarea.setSelectionRange(newPosition, newPosition);
      }, 0);
    }
  };

  const insertFormatting = (type: 'bold' | 'italic' | 'code' | 'link') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = message.slice(start, end);
    
    let formattedText = '';
    let cursorOffset = 0;
    
    switch (type) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        cursorOffset = selectedText ? 0 : 2;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        cursorOffset = selectedText ? 0 : 1;
        break;
      case 'code':
        formattedText = `\`${selectedText}\``;
        cursorOffset = selectedText ? 0 : 1;
        break;
      case 'link':
        formattedText = selectedText 
          ? `[${selectedText}](url)` 
          : '[link text](url)';
        cursorOffset = selectedText ? formattedText.length - 4 : 1;
        break;
    }
    
    const newMessage = message.slice(0, start) + formattedText + message.slice(end);
    setMessage(newMessage);
    
    // Focus and set cursor position
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + formattedText.length - cursorOffset;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      const mentionedName = match[1];
      const member = teamMembers.find(m => 
        m.name.toLowerCase() === mentionedName.toLowerCase()
      );
      if (member) {
        mentions.push(member.id);
      }
    }
    
    return [...new Set(mentions)]; // Remove duplicates
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
    return <FileTextIcon className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  const charactersRemaining = maxLength - message.length;
  const showCharacterWarning = charactersRemaining < 100;

  return (
    <div className={cn("relative", className)}>
      {/* Reply indicator */}
      {replyingTo && (
        <div className="p-3 bg-muted/50 border-l-2 border-primary mb-2 rounded-r-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-muted-foreground">Replying to</span>
              <span className="font-medium">{replyingTo.userName}</span>
            </div>
            {onCancelReply && (
              <Button variant="ghost" size="sm" onClick={onCancelReply}>
                <XIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="text-sm text-muted-foreground mt-1 truncate">
            {replyingTo.content}
          </div>
        </div>
      )}

      {/* File uploads */}
      {uploadingFiles.length > 0 && (
        <div className="mb-2 space-y-2">
          {uploadingFiles.map((uploadFile) => (
            <div key={uploadFile.id} className="flex items-center space-x-2 p-2 bg-muted/50 rounded">
              {getFileIcon(uploadFile.file)}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{uploadFile.file.name}</div>
                <div className="text-xs text-muted-foreground">
                  {formatFileSize(uploadFile.file.size)}
                </div>
                {uploadFile.error ? (
                  <div className="text-xs text-red-500">{uploadFile.error}</div>
                ) : (
                  <div className="w-full bg-secondary rounded-full h-1 mt-1">
                    <div 
                      className="bg-primary h-1 rounded-full transition-all"
                      style={{ width: `${uploadFile.progress}%` }}
                    />
                  </div>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => removeUploadingFile(uploadFile.id)}
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="relative">
        {/* Mentions dropdown */}
        {showMentions && filteredMembers.length > 0 && (
          <div className="absolute bottom-full left-0 mb-2 bg-background border rounded-lg shadow-lg max-h-60 overflow-y-auto z-20 min-w-[200px] mentions-dropdown">
            <div className="p-2 text-xs text-muted-foreground border-b">
              Tab or Enter to select
            </div>
            {filteredMembers.slice(0, 10).map((member, index) => (
              <button
                key={member.id}
                onClick={() => insertMention(member)}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center space-x-2",
                  index === selectedMentionIndex && "bg-muted"
                )}
              >
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium">
                  {member.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{member.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{member.email}</div>
                </div>
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  member.status === 'online' ? "bg-green-500" :
                  member.status === 'away' ? "bg-yellow-500" :
                  member.status === 'busy' ? "bg-red-500" : "bg-gray-400"
                )} />
              </button>
            ))}
          </div>
        )}

        {/* Emoji picker */}
        {showEmojiPicker && (
          <div className="absolute bottom-full left-0 mb-2 bg-background border rounded-lg shadow-lg p-3 z-20 emoji-picker">
            <div className="text-xs text-muted-foreground mb-2">Frequently used</div>
            <div className="grid grid-cols-8 gap-1 mb-3">
              {COMMON_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => insertEmoji(emoji)}
                  className="p-2 hover:bg-muted rounded text-lg"
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
            
            <div className="text-xs text-muted-foreground mb-2">All emojis</div>
            <div className="grid grid-cols-8 gap-1 max-h-40 overflow-y-auto">
              {ALL_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => insertEmoji(emoji)}
                  className="p-2 hover:bg-muted rounded text-lg"
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main input area */}
        <div className="border border-input rounded-lg bg-background">
          {/* Formatting toolbar */}
          <div className="flex items-center space-x-1 p-2 border-b border-input">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => insertFormatting('bold')}
              title="Bold (Ctrl+B)"
            >
              <BoldIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => insertFormatting('italic')}
              title="Italic (Ctrl+I)"
            >
              <ItalicIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => insertFormatting('code')}
              title="Code (Ctrl+`)"
            >
              <CodeIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => insertFormatting('link')}
              title="Link (Ctrl+K)"
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
            
            <div className="flex-1" />
            
            {showCharacterWarning && (
              <div className={cn(
                "text-xs px-2 py-1 rounded",
                charactersRemaining < 50 ? "text-red-600 bg-red-100" : "text-yellow-600 bg-yellow-100"
              )}>
                {charactersRemaining} remaining
              </div>
            )}
          </div>

          {/* Text input */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleTextChange}
              onKeyDown={handleKeyPress}
              placeholder={placeholder}
              disabled={disabled}
              className="w-full p-3 bg-transparent border-0 resize-none focus:outline-none min-h-[44px] max-h-32"
              rows={1}
            />
            
            {/* Action buttons */}
            <div className="absolute bottom-2 right-2 flex items-center space-x-1">
              {canUploadFiles && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                    className="hidden"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach files"
                  >
                    <PaperclipIcon className="h-4 w-4" />
                  </Button>
                </>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                title="Add emoji"
              >
                <SmileIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Send button and shortcuts hint */}
          <div className="flex items-center justify-between p-2 border-t border-input">
            <div className="text-xs text-muted-foreground">
              <span className="font-mono">Enter</span> to send, <span className="font-mono">Shift+Enter</span> for new line
            </div>
            <Button 
              onClick={handleSend}
              disabled={(!message.trim() && uploadingFiles.length === 0) || disabled}
              size="sm"
            >
              <SendIcon className="h-4 w-4 mr-2" />
              Send
            </Button>
          </div>
        </div>
      </div>

      {/* Preview toggle */}
      <div className="flex items-center justify-end mt-2">
        <Button
          variant={showPreview ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowPreview((v) => !v)}
        >
          {showPreview ? 'Hide Preview' : 'Show Preview'}
        </Button>
      </div>

      {/* Live Markdown Preview */}
      {showPreview && (
        <div className="mt-2 p-3 border rounded bg-muted/10 max-h-60 overflow-auto prose prose-zinc dark:prose-invert text-sm">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={oneDark}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {message || 'Nothing to preview.'}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
} 