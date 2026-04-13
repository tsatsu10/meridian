// @epic-3.6-communication: Enhanced chat area with thread support
import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL, API_URL } from '@/constants/urls';
import { Send, Paperclip, Smile, MessageSquare } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import MessageItem from "./MessageItem";
import ThreadView from "./ThreadView";
import ThreadNotificationBadge from "./ThreadNotificationBadge";

interface Message {
  id: string;
  content: string;
  messageType: 'text' | 'file' | 'system' | 'thread_reply';
  userEmail: string;
  userName?: string;
  parentMessageId?: string;
  mentions?: string;
  reactions?: string;
  attachments?: string;
  isEdited?: boolean;
  editedAt?: Date;
  isPinned?: boolean;
  createdAt: Date;
  // Thread UI fields
  threadMessageCount?: number;
  threadParticipantCount?: number;
  threadLastReplyAt?: Date;
  threadPreview?: string;
  threadStatus?: 'open' | 'resolved' | 'archived';
}

interface ChatAreaProps {
  channelId: string;
  currentUserEmail: string;
  className?: string;
}

export default function ChatArea({ 
  channelId, 
  currentUserEmail, 
  className 
}: ChatAreaProps) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedParentMessage, setSelectedParentMessage] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch messages
  const { data: messagesData, isLoading } = useQuery({
    queryKey: ['messages', channelId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/message/channel/${channelId}`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    refetchInterval: 3000, // Refresh every 3 seconds for real-time updates
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(`${API_BASE_URL}/message/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          channelId, 
          content, 
          messageType: 'text' 
        }),
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] });
    },
  });

  const messages = messagesData?.messages || [];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await sendMessageMutation.mutateAsync(message);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = (messageId: string) => {
    // For now, just focus on the input. Could be enhanced to quote the message
    const textarea = document.querySelector('textarea');
    if (textarea) {
      textarea.focus();
    }
  };

  const handleThread = (messageId: string) => {
    const parentMessage = messages.find((m: Message) => m.id === messageId);
    if (parentMessage) {
      setSelectedThreadId(messageId);
      setSelectedParentMessage(parentMessage);
    }
  };

  const handleCloseThread = () => {
    setSelectedThreadId(null);
    setSelectedParentMessage(null);
  };

  const handleThreadClick = (threadId: string) => {
    handleThread(threadId);
  };

  return (
    <div className={cn("flex h-full", className)}>
      {/* Main chat area */}
      <div className={cn(
        "flex flex-col flex-1",
        selectedThreadId && "w-2/3"
      )}>
        {/* Chat header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <h2 className="font-semibold">Channel Chat</h2>
            <span className="text-sm text-muted-foreground">
              {messages.length} messages
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <ThreadNotificationBadge onThreadClick={handleThreadClick} />
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground">Loading messages...</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No messages yet. Start the conversation!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {messages.map((msg: Message) => (
                <MessageItem
                  key={msg.id}
                  message={msg}
                  currentUserEmail={currentUserEmail}
                  onReply={handleReply}
                  onThread={handleThread}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message input */}
        <div className="p-4 border-t">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-end space-x-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-sm">
                  {currentUserEmail.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="min-h-[80px] resize-none"
                  disabled={isSubmitting}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button type="button" variant="ghost" size="sm">
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Button type="button" variant="ghost" size="sm">
                  <Smile className="w-4 h-4" />
                </Button>
              </div>
              
              <Button 
                type="submit" 
                disabled={!message.trim() || isSubmitting}
              >
                <Send className="w-4 h-4 mr-2" />
                Send
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Thread view */}
      {selectedThreadId && selectedParentMessage && (
        <ThreadView
          threadId={selectedThreadId}
          parentMessage={selectedParentMessage}
          onClose={handleCloseThread}
          className="w-1/3 border-l"
        />
      )}
    </div>
  );
} 