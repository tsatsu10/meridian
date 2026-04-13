// @epic-3.5-communication: Message list component with reactions and threading
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { 
  Smile, 
  Reply, 
  Edit3, 
  Trash2,
  MoreHorizontal,
  MessageSquare,
  Pin,
  Copy,
  Link,
  Flag,
  Plus
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { Message, TeamMember } from "./ChatInterface";
import useAuth from "@/components/providers/auth-provider/hooks/use-auth";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Icon wrappers
const SmileIcon = Smile as React.FC<{ className?: string }>;
const ReplyIcon = Reply as React.FC<{ className?: string }>;
const Edit3Icon = Edit3 as React.FC<{ className?: string }>;
const Trash2Icon = Trash2 as React.FC<{ className?: string }>;
const MoreHorizontalIcon = MoreHorizontal as React.FC<{ className?: string }>;
const MessageSquareIcon = MessageSquare as React.FC<{ className?: string }>;
const PinIcon = Pin as React.FC<{ className?: string }>;
const CopyIcon = Copy as React.FC<{ className?: string }>;
const LinkIcon = Link as React.FC<{ className?: string }>;
const FlagIcon = Flag as React.FC<{ className?: string }>;
const PlusIcon = Plus as React.FC<{ className?: string }>;

interface MessageListProps {
  messages: Message[];
  onReaction: (messageId: string, emoji: string) => void;
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDelete: (messageId: string) => void;
  onPin: (messageId: string) => void;
  onThread: (message: Message) => void;
  teamMembers?: TeamMember[];
  className?: string;
}

const COMMON_REACTIONS = ['👍', '😊', '❤️', '😮', '😢', '😡'];
const ALL_EMOJIS = [
  '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', 
  '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒',
  '👍', '👎', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖',
  '🔥', '💯', '💫', '⭐', '🌟', '💥', '💢', '💨', '💦', '💤', '🕳️', '💣', '💬', '👁️‍🗨️', '🗨️', '🗯️'
];

export default function MessageList({
  messages,
  onReaction,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onThread,
  teamMembers = [],
  className
}: MessageListProps) {
  const [activeMessageMenu, setActiveMessageMenu] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null);
  const [threadView, setThreadView] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { user } = useAuth();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target as Element)?.closest('.emoji-picker')) {
        setShowEmojiPicker(null);
      }
      if (!(event.target as Element)?.closest('.message-menu')) {
        setActiveMessageMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTimestamp = (date: Date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return "unknown time";
    }
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const handleReaction = (messageId: string, emoji: string) => {
    onReaction(messageId, emoji);
    setShowEmojiPicker(null);
  };

  const handleMessageAction = (action: string, message: Message) => {
    setActiveMessageMenu(null);
    
    switch (action) {
      case 'reply':
        onReply(message);
        break;
      case 'thread':
        onThread(message);
        setThreadView(message.id);
        break;
      case 'edit':
        onEdit(message);
        break;
      case 'delete':
        if (confirm('Are you sure you want to delete this message?')) {
          onDelete(message.id);
        }
        break;
      case 'pin':
        onPin(message.id);
        break;
      case 'copy':
        navigator.clipboard.writeText(message.content);
        // Show toast notificationbreak;
      case 'link':
        const messageUrl = `${window.location.href}?message=${message.id}`;
        navigator.clipboard.writeText(messageUrl);break;
      case 'report':break;
    }
  };

  const isConsecutiveMessage = (currentMessage: Message, previousMessage?: Message) => {
    if (!previousMessage || !currentMessage) return false;
    
    // Add null checks for timestamp
    if (!currentMessage.timestamp || !previousMessage.timestamp) return false;
    
    const timeDiff = currentMessage.timestamp.getTime() - previousMessage.timestamp.getTime();
    const sameUser = currentMessage.userId === previousMessage.userId;
    const withinTimeLimit = timeDiff < 5 * 60 * 1000; // 5 minutes
    
    return sameUser && withinTimeLimit;
  };

  const getMessageVariant = (message: Message, index: number) => {
    if (!message) return { isGroupStart: true, isGroupEnd: true, isConsecutive: false };
    
    const isConsecutive = isConsecutiveMessage(message, messages[index - 1]);
    const isGroupStart = !isConsecutive;
    const isGroupEnd = !isConsecutiveMessage(messages[index + 1], message);
    
    return { isGroupStart, isGroupEnd, isConsecutive };
  };

  const ThreadView = ({ parentMessage }: { parentMessage: Message }) => (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background border rounded-lg w-full max-w-2xl h-full max-h-[80vh] flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageSquareIcon className="h-5 w-5" />
            <h3 className="font-semibold">Thread</h3>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setThreadView(null)}
          >
            ✕
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {/* Parent message */}
          <div className="p-4 bg-muted/30 rounded-lg mb-4">
            <div className="flex items-center space-x-2 mb-2">
              <Avatar className="w-6 h-6">
                <div className="w-full h-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                  {parentMessage.userName.charAt(0)}
                </div>
              </Avatar>
              <span className="font-medium text-sm">{parentMessage.userName}</span>
              <span className="text-xs text-muted-foreground">
                {formatTimestamp(parentMessage.timestamp)}
              </span>
            </div>
            <div 
              className="text-sm"
              dangerouslySetInnerHTML={{ __html: formatContent(parentMessage.content) }} 
            />
          </div>
          
          {/* Thread replies would go here */}
          <div className="space-y-2">
            <div className="text-center text-sm text-muted-foreground py-4">
              No replies yet. Be the first to reply!
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Reply to thread..."
              className="flex-1 px-3 py-2 border border-input rounded-md text-sm"
            />
            <Button size="sm">Send</Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className={cn("flex-1 overflow-y-auto space-y-1", className)}>
        {messages
          .filter(message => message && message.timestamp) // Filter out undefined messages
          .map((message, index) => {
          const { isGroupStart, isConsecutive } = getMessageVariant(message, index);
          const isOwnMessage = message.userId === user?.id;
          const hasReactions = message.reactions && message.reactions.length > 0;

          return (
            <div
              key={message.id}
              className={cn(
                "group relative px-4 py-1 hover:bg-muted/30 transition-colors",
                isGroupStart && "mt-3",
                !isConsecutive && "pt-2"
              )}
              onMouseEnter={() => setHoveredMessage(message.id)}
              onMouseLeave={() => setHoveredMessage(null)}
            >
              <div className="flex space-x-3">
                {/* Avatar - only show for group start */}
                <div className="w-8 flex-shrink-0">
                  {isGroupStart ? (
                    <Avatar className="w-8 h-8">
                      <div className="w-full h-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                        {message.userName.charAt(0)}
                      </div>
                    </Avatar>
                  ) : (
                    <div className="w-8 h-8 flex items-center justify-center text-xs text-muted-foreground">
                      {hoveredMessage === message.id && formatTimestamp(message.timestamp)}
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  {/* Message header - only show for group start */}
                  {isGroupStart && (
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-sm">{message.userName}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(message.timestamp)}
                      </span>
                      {message.isEdited && (
                        <Badge variant="outline" className="text-xs">edited</Badge>
                      )}
                    </div>
                  )}
                  
                  {/* Message content */}
                  <div className="text-sm leading-relaxed">
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
                      {message.content}
                    </ReactMarkdown>
                  </div>
                  
                  {/* Attachments */}
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {message.attachments.map((attachment) => (
                        <div 
                          key={attachment.id}
                          className="p-3 border rounded-lg bg-muted/50 max-w-md"
                        >
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                              📎
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{attachment.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {(attachment.size / 1024 / 1024).toFixed(1)} MB
                              </div>
                            </div>
                            <Button variant="ghost" size="sm">Download</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Reactions */}
                  {hasReactions && (
                    <div className="flex items-center space-x-1 mt-2 flex-wrap">
                      {message.reactions!.map((reaction, index) => (
                        <button
                          key={index}
                          onClick={() => handleReaction(message.id, reaction.emoji)}
                          className={cn(
                            "flex items-center space-x-1 px-2 py-1 rounded-full text-xs transition-colors",
                            reaction.users.includes(user?.id || '') 
                              ? "bg-blue-100 text-blue-800 border border-blue-200" 
                              : "bg-muted hover:bg-muted/80"
                          )}
                        >
                          <span>{reaction.emoji}</span>
                          <span>{reaction.users.length}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* Message actions (visible on hover) */}
                  {hoveredMessage === message.id && (
                    <div className="absolute top-0 right-4 bg-background border rounded-lg shadow-lg p-1 flex items-center space-x-1 z-10">
                      {/* Quick reactions */}
                      {COMMON_REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(message.id, emoji)}
                          className="p-1 hover:bg-muted rounded text-lg"
                          title={`React with ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                      
                      {/* Add reaction button */}
                      <button
                        onClick={() => setShowEmojiPicker(showEmojiPicker === message.id ? null : message.id)}
                        className="p-1 hover:bg-muted rounded"
                        title="Add reaction"
                      >
                        <PlusIcon className="h-4 w-4" />
                      </button>
                      
                      {/* Reply button */}
                      <button
                        onClick={() => handleMessageAction('reply', message)}
                        className="p-1 hover:bg-muted rounded"
                        title="Reply"
                      >
                        <ReplyIcon className="h-4 w-4" />
                      </button>
                      
                      {/* More actions */}
                      <div className="relative message-menu">
                        <button
                          onClick={() => setActiveMessageMenu(activeMessageMenu === message.id ? null : message.id)}
                          className="p-1 hover:bg-muted rounded"
                          title="More actions"
                        >
                          <MoreHorizontalIcon className="h-4 w-4" />
                        </button>
                        
                        {activeMessageMenu === message.id && (
                          <div className="absolute top-full right-0 mt-1 bg-background border rounded-lg shadow-lg py-1 min-w-[160px] z-20">
                            <button
                              onClick={() => handleMessageAction('thread', message)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center space-x-2"
                            >
                              <MessageSquareIcon className="h-4 w-4" />
                              <span>Reply in thread</span>
                            </button>
                            
                            {isOwnMessage && (
                              <button
                                onClick={() => handleMessageAction('edit', message)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center space-x-2"
                              >
                                <Edit3Icon className="h-4 w-4" />
                                <span>Edit</span>
                              </button>
                            )}
                            
                            <button
                              onClick={() => handleMessageAction('copy', message)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center space-x-2"
                            >
                              <CopyIcon className="h-4 w-4" />
                              <span>Copy text</span>
                            </button>
                            
                            <button
                              onClick={() => handleMessageAction('link', message)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center space-x-2"
                            >
                              <LinkIcon className="h-4 w-4" />
                              <span>Copy link</span>
                            </button>
                            
                            <button
                              onClick={() => handleMessageAction('pin', message)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center space-x-2"
                            >
                              <PinIcon className="h-4 w-4" />
                              <span>Pin message</span>
                            </button>
                            
                            <div className="border-t my-1" />
                            
                            <button
                              onClick={() => handleMessageAction('report', message)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center space-x-2 text-red-600"
                            >
                              <FlagIcon className="h-4 w-4" />
                              <span>Report</span>
                            </button>
                            
                            {isOwnMessage && (
                              <button
                                onClick={() => handleMessageAction('delete', message)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center space-x-2 text-red-600"
                              >
                                <Trash2Icon className="h-4 w-4" />
                                <span>Delete</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Emoji picker */}
                  {showEmojiPicker === message.id && (
                    <div className="absolute top-full left-0 mt-2 bg-background border rounded-lg shadow-lg p-3 grid grid-cols-8 gap-1 max-w-xs z-20 emoji-picker">
                      {ALL_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(message.id, emoji)}
                          className="p-2 hover:bg-muted rounded text-lg"
                          title={emoji}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Thread View Modal */}
      {threadView && (
        <ThreadView 
          parentMessage={messages.find(m => m.id === threadView)!} 
        />
      )}
    </>
  );
} 