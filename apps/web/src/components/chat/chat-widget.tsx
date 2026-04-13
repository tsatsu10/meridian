// @epic-3.6-communication: Floating Chat Widget
import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Minimize2, Maximize2, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/cn';
import useAuth from '@/components/providers/auth-provider/hooks/use-auth';
import { 
  useConversations, 
  useMessages, 
  useSendMessage,
  type Conversation,
  type Message
} from '@/hooks/queries/chat';

export const ChatWidget: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations and messages using hooks
  const { data: conversations = [], isLoading: conversationsLoading } = useConversations();
  const { data: messages = [], isLoading: messagesLoading } = useMessages(selectedConversation?.id || null);
  const sendMessage = useSendMessage();

  const totalUnreadCount = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (selectedConversation && isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, selectedConversation, isOpen, isMinimized]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation) return;

    const content = messageInput;
    setMessageInput(''); // Clear input immediately

    try {
      await sendMessage.mutateAsync({
        channelId: selectedConversation.id,
        content,
        messageType: 'text',
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      // TODO: Show error notification
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Floating button (when widget is closed)
  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <MessageCircle className="h-6 w-6" />
          {totalUnreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-6 w-6 rounded-full p-0 flex items-center justify-center"
            >
              {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
            </Badge>
          )}
        </Button>
      </div>
    );
  }

  // Widget (when open)
  return (
    <div 
      className={cn(
        "fixed bottom-6 right-6 z-50 bg-background border rounded-lg shadow-2xl transition-all duration-300",
        isMinimized ? "h-14" : "h-[600px] w-[400px]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-primary/5">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">
            {selectedConversation ? selectedConversation.name : 'Messages'}
          </h3>
          {totalUnreadCount > 0 && !isMinimized && (
            <Badge variant="destructive" className="ml-2">
              {totalUnreadCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {selectedConversation && !isMinimized && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedConversation(null)}
              className="h-8 w-8 p-0"
            >
              <Users className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-8 w-8 p-0"
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <>
          {selectedConversation ? (
            // Conversation View
            <div className="flex flex-col h-[calc(100%-56px)]">
              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex gap-3",
                        message.isOwn ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="text-xs">
                          {message.userName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        "flex flex-col max-w-[70%]",
                        message.isOwn ? "items-end" : "items-start"
                      )}>
                        <div className={cn(
                          "rounded-lg px-3 py-2",
                          message.isOwn 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted"
                        )}>
                          <p className="text-sm break-words">{message.content}</p>
                        </div>
                        <span className="text-xs text-muted-foreground mt-1">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message..."
                    className="flex-1"
                  />
                  <Button 
                    size="sm"
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            // Conversations List
            <div className="flex flex-col h-[calc(100%-56px)]">
              {/* Search */}
              <div className="p-4 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search conversations..."
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Conversations */}
              <ScrollArea className="flex-1">
                {filteredConversations.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No conversations found</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredConversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        onClick={() => setSelectedConversation(conversation)}
                        className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback>
                                {conversation.type === 'channel' ? (
                                  <Users className="h-5 w-5" />
                                ) : (
                                  conversation.name.split(' ').map(n => n[0]).join('')
                                )}
                              </AvatarFallback>
                            </Avatar>
                            {conversation.type === 'direct' && conversation.isOnline && (
                              <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-background rounded-full" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-medium text-sm truncate">
                                {conversation.name}
                              </h4>
                              {conversation.lastMessageTime && (
                                <span className="text-xs text-muted-foreground">
                                  {formatTime(conversation.lastMessageTime)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-muted-foreground truncate">
                                {conversation.lastMessage || 'No messages yet'}
                              </p>
                              {conversation.unreadCount > 0 && (
                                <Badge variant="destructive" className="ml-2 h-5 min-w-[20px] rounded-full">
                                  {conversation.unreadCount}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ChatWidget;

