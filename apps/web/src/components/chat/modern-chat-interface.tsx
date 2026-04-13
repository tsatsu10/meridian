// Modern Chat Interface - 2025 Design System
// Redesigned for better UX, performance, and accessibility

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '@/lib/api-client';
import { 
  Search, 
  Plus, 
  Phone, 
  Video, 
  MoreHorizontal, 
  Send, 
  Paperclip, 
  Smile, 
  Hash, 
  Lock,
  Users,
  MessageCircle,
  Star,
  Pin,
  Archive,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Clock,
  X
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { MeridianButton } from '@/components/ui/meridian-button';
import { MeridianCard } from '@/components/ui/meridian-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface ModernChatInterfaceProps {
  selectedChatId?: string | null;
  onSelectChat?: (chatId: string) => void;
  onStartVideoCall?: (chatId: string) => void;
  className?: string;
}

export function ModernChatInterface({ 
  selectedChatId = 'general', 
  onSelectChat,
  onStartVideoCall,
  className 
}: ModernChatInterfaceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load chat data from API
  const loadChatData = async () => {
    try {
      setLoading(true);
      const [conversationsData, messagesData] = await Promise.all([
        apiClient.chat.conversations.list(),
        apiClient.chat.messages.list(selectedChatId)
      ]);
      setConversations(conversationsData || []);
      setMessages(messagesData || []);
    } catch (error) {
      console.error('Failed to load chat data:', error);
      setConversations([]);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount and when chat changes
  useEffect(() => {
    loadChatData();
  }, [selectedChatId]);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [newMessage]);

  const selectedConversation = conversations.find(c => c.id === selectedChatId);
  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    // Add your send message logic here
    // Send message
    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const ConversationItem = ({ conversation }: { conversation: typeof conversations[0] }) => {
    const isSelected = conversation.id === selectedChatId;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all",
          "hover:bg-slate-50 dark:hover:bg-slate-800/50",
          isSelected && "bg-meridian-primary-50 dark:bg-meridian-primary-900/20 border border-meridian-primary-200 dark:border-meridian-primary-800"
        )}
        onClick={() => onSelectChat?.(conversation.id)}
      >
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <Avatar className="w-10 h-10">
            {conversation.type === 'channel' ? (
              <div className={cn(
                "w-full h-full flex items-center justify-center rounded-full",
                conversation.isPrivate ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
              )}>
                {conversation.isPrivate ? <Lock className="w-5 h-5" /> : <Hash className="w-5 h-5" />}
              </div>
            ) : (
              <>
                <AvatarImage src={conversation.avatar || undefined} />
                <AvatarFallback>{conversation.name.charAt(0)}</AvatarFallback>
              </>
            )}
          </Avatar>
          {conversation.type === 'dm' && (
            <div className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900",
              conversation.isOnline ? "bg-green-500" : "bg-slate-400"
            )} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className={cn(
                "font-medium text-sm truncate",
                isSelected ? "text-meridian-primary-900 dark:text-meridian-primary-100" : "text-slate-900 dark:text-slate-100"
              )}>
                {conversation.type === 'channel' ? `#${conversation.name}` : conversation.name}
              </h3>
              {conversation.type === 'channel' && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  {conversation.members}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {conversation.lastMessageTime}
              </span>
              {conversation.unreadCount > 0 && (
                <Badge className="bg-meridian-primary text-white text-xs min-w-[18px] h-5 flex items-center justify-center">
                  {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                </Badge>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
            {conversation.lastMessage}
          </p>
        </div>

        {/* Quick Actions (show on hover) */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex gap-1">
            <MeridianButton
              variant="ghost"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation();
                onStartVideoCall?.(conversation.id);
              }}
              className="h-6 w-6"
            >
              <Video className="w-3 h-3" />
            </MeridianButton>
          </div>
        </div>
      </motion.div>
    );
  };

  const MessageBubble = ({ message }: { message: typeof messages[0] }) => {
    const isOwn = message.isOwn;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "flex gap-3 mb-6 group",
          isOwn && "flex-row-reverse"
        )}
      >
        {/* Avatar */}
        {!isOwn && (
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarImage src={message.userAvatar} />
            <AvatarFallback>{message.userName.charAt(0)}</AvatarFallback>
          </Avatar>
        )}

        {/* Message Content */}
        <div className={cn("flex-1 max-w-[70%]", isOwn && "flex flex-col items-end")}>
          {/* Message Header */}
          {!isOwn && (
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm text-slate-900 dark:text-slate-100">
                {message.userName}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {message.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}

          {/* Message Bubble */}
          <div className={cn(
            "relative px-4 py-3 rounded-2xl max-w-full break-words",
            isOwn 
              ? "bg-meridian-primary text-white rounded-br-md"
              : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-md"
          )}>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
            
            {/* Attachments */}
            {message.attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {message.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border",
                      isOwn 
                        ? "bg-white/10 border-white/20" 
                        : "bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600"
                    )}
                  >
                    <Paperclip className="w-4 h-4" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{attachment.name}</p>
                      <p className="text-xs opacity-70">{attachment.size}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Own Message Status */}
            {isOwn && (
              <div className="flex items-center justify-end gap-1 mt-2">
                <span className="text-xs opacity-70">
                  {message.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <div className="text-white/70">
                  {message.status === 'sent' && <Check className="w-3 h-3" />}
                  {message.status === 'delivered' && <CheckCheck className="w-3 h-3" />}
                  {message.status === 'read' && <CheckCheck className="w-3 h-3 text-blue-300" />}
                </div>
              </div>
            )}
          </div>

          {/* Reactions */}
          {message.reactions.length > 0 && (
            <div className="flex gap-1 mt-1">
              {message.reactions.map((reaction, index) => (
                <motion.button
                  key={index}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors",
                    "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700",
                    reaction.hasReacted && "bg-meridian-primary-100 dark:bg-meridian-primary-900"
                  )}
                >
                  <span>{reaction.emoji}</span>
                  <span>{reaction.count}</span>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className={cn("flex h-full bg-white dark:bg-slate-900", className)}>
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {!sidebarCollapsed && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50"
          >
            <div className="flex flex-col h-full">
              {/* Sidebar Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Messages
                  </h1>
                  <div className="flex gap-1">
                    <MeridianButton variant="ghost" size="icon-sm">
                      <Plus className="w-4 h-4" />
                    </MeridianButton>
                    <MeridianButton 
                      variant="ghost" 
                      size="icon-sm"
                      onClick={() => setSidebarCollapsed(true)}
                    >
                      <X className="w-4 h-4" />
                    </MeridianButton>
                  </div>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-meridian-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Conversations List */}
              <ScrollArea className="flex-1 p-2">
                <div className="space-y-1">
                  {filteredConversations.map((conversation) => (
                    <ConversationItem key={conversation.id} conversation={conversation} />
                  ))}
                </div>
              </ScrollArea>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                {sidebarCollapsed && (
                  <MeridianButton 
                    variant="ghost" 
                    size="icon-sm"
                    onClick={() => setSidebarCollapsed(false)}
                  >
                    <Hash className="w-4 h-4" />
                  </MeridianButton>
                )}
                
                <Avatar className="w-8 h-8">
                  {selectedConversation.type === 'channel' ? (
                    <div className={cn(
                      "w-full h-full flex items-center justify-center rounded-full",
                      selectedConversation.isPrivate ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                    )}>
                      {selectedConversation.isPrivate ? <Lock className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
                    </div>
                  ) : (
                    <>
                      <AvatarImage src={selectedConversation.avatar || undefined} />
                      <AvatarFallback>{selectedConversation.name.charAt(0)}</AvatarFallback>
                    </>
                  )}
                </Avatar>
                
                <div>
                  <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                    {selectedConversation.type === 'channel' ? `#${selectedConversation.name}` : selectedConversation.name}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedConversation.type === 'channel' 
                      ? `${selectedConversation.members} members`
                      : selectedConversation.isOnline ? 'Online' : 'Offline'
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <MeridianButton variant="ghost" size="icon-sm">
                  <Phone className="w-4 h-4" />
                </MeridianButton>
                <MeridianButton 
                  variant="ghost" 
                  size="icon-sm"
                  onClick={() => onStartVideoCall?.(selectedConversation.id)}
                >
                  <Video className="w-4 h-4" />
                </MeridianButton>
                <MeridianButton variant="ghost" size="icon-sm">
                  <MoreHorizontal className="w-4 h-4" />
                </MeridianButton>
              </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4">
              <div>
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
                <div ref={messageEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Textarea
                    ref={textareaRef}
                    placeholder={`Message ${selectedConversation.type === 'channel' ? `#${selectedConversation.name}` : selectedConversation.name}`}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    className="min-h-[40px] max-h-32 resize-none border-slate-200 dark:border-slate-700 focus:ring-meridian-primary-500"
                    rows={1}
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <MeridianButton variant="ghost" size="icon-sm" className="h-10 w-10">
                    <Paperclip className="w-4 h-4" />
                  </MeridianButton>
                  <MeridianButton variant="ghost" size="icon-sm" className="h-10 w-10">
                    <Smile className="w-4 h-4" />
                  </MeridianButton>
                  <MeridianButton 
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="h-10 w-10 p-0"
                  >
                    <Send className="w-4 h-4" />
                  </MeridianButton>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Welcome to Chat
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Select a conversation to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
