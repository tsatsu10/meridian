// @epic-3.6-communication: Thread view component for message threading
import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, X, Send, MoreHorizontal, CheckCircle, Archive, Users } from 'lucide-react';
import { API_BASE_URL, API_URL } from '@/constants/urls';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from 'date-fns';

interface ThreadMessage {
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
  createdAt: Date;
}

interface ThreadParticipant {
  userEmail: string;
  userName?: string;
  lastReadAt?: Date;
  joinedAt: Date;
  isSubscribed: boolean;
}

interface ThreadViewProps {
  threadId: string;
  parentMessage: ThreadMessage;
  onClose: () => void;
  className?: string;
}

export default function ThreadView({ 
  threadId, 
  parentMessage, 
  onClose, 
  className 
}: ThreadViewProps) {
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch thread messages
  const { data: threadData, isLoading } = useQuery({
    queryKey: ['thread', threadId, 'messages'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/message/thread/${threadId}/messages`);
      if (!response.ok) throw new Error('Failed to fetch thread messages');
      return response.json();
    },
    refetchInterval: 5000, // Refresh every 5 seconds for real-time updates
  });

  // Fetch thread participants
  const { data: participantsData } = useQuery({
    queryKey: ['thread', threadId, 'participants'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/message/thread/${threadId}/participants`);
      if (!response.ok) throw new Error('Failed to fetch thread participants');
      return response.json();
    },
  });

  // Create thread reply mutation
  const createReplyMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(`${API_BASE_URL}/message/thread/${threadId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, messageType: 'thread_reply' }),
      });
      if (!response.ok) throw new Error('Failed to create reply');
      return response.json();
    },
    onSuccess: () => {
      setReplyContent('');
      queryClient.invalidateQueries({ queryKey: ['thread', threadId, 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['thread', threadId, 'participants'] });
    },
  });

  // Update thread status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (status: 'open' | 'resolved' | 'archived') => {
      const response = await fetch(`${API_BASE_URL}/message/thread/${threadId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update thread status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['thread', threadId, 'messages'] });
    },
  });

  // Subscribe/unsubscribe mutation
  const subscriptionMutation = useMutation({
    mutationFn: async (isSubscribed: boolean) => {
      const response = await fetch(`${API_BASE_URL}/message/thread/${threadId}/subscription`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSubscribed }),
      });
      if (!response.ok) throw new Error('Failed to update subscription');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['thread', threadId, 'participants'] });
    },
  });

  const messages = threadData?.messages || [];
  const participants = participantsData?.participants || [];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createReplyMutation.mutateAsync(replyContent);
    } catch (error) {
      console.error('Error creating reply:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatContent = (content: string) => {
    // Simple markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'archived':
        return <Archive className="w-4 h-4 text-gray-500" />;
      default:
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'archived':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className={cn(
      "flex flex-col h-full bg-background border-l",
      className
    )}>
      {/* Thread Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-5 h-5 text-muted-foreground" />
          <div>
            <h3 className="font-semibold">Thread</h3>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Badge 
                variant="outline" 
                className={cn("text-xs", getStatusColor(parentMessage.threadStatus || 'open'))}
              >
                {getStatusIcon(parentMessage.threadStatus || 'open')}
                <span className="ml-1 capitalize">{parentMessage.threadStatus || 'open'}</span>
              </Badge>
              <span>•</span>
              <span>{messages.length} replies</span>
              <span>•</span>
              <span>{participants.length} participants</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateStatusMutation.mutate('resolved')}
            disabled={parentMessage.threadStatus === 'resolved'}
          >
            <CheckCircle className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateStatusMutation.mutate('archived')}
            disabled={parentMessage.threadStatus === 'archived'}
          >
            <Archive className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Parent Message */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-start space-x-3">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="text-xs">
              {parentMessage.userName?.charAt(0) || parentMessage.userEmail.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-medium text-sm">{parentMessage.userName || parentMessage.userEmail}</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(parentMessage.createdAt), { addSuffix: true })}
              </span>
            </div>
            <div 
              className="text-sm"
              dangerouslySetInnerHTML={{ __html: formatContent(parentMessage.content) }}
            />
          </div>
        </div>
      </div>

      {/* Thread Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading thread...</div>
          </div>
        ) : messages.length === 1 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No replies yet. Be the first to reply!</p>
            </div>
          </div>
        ) : (
          messages
            .filter(msg => msg.id !== threadId) // Exclude parent message
            .map((message: ThreadMessage) => (
              <div key={message.id} className="flex items-start space-x-3">
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="text-xs">
                    {message.userName?.charAt(0) || message.userEmail.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-sm">{message.userName || message.userEmail}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                    </span>
                    {message.isEdited && (
                      <span className="text-xs text-muted-foreground">(edited)</span>
                    )}
                  </div>
                  <div 
                    className="text-sm"
                    dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
                  />
                </div>
              </div>
            ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Input */}
      <div className="p-4 border-t">
        <form onSubmit={handleSubmitReply} className="space-y-3">
          <Textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Reply to thread..."
            className="min-h-[80px] resize-none"
            disabled={isSubmitting}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <Users className="w-3 h-3" />
              <span>{participants.length} participants</span>
            </div>
            <Button 
              type="submit" 
              size="sm" 
              disabled={!replyContent.trim() || isSubmitting}
            >
              <Send className="w-4 h-4 mr-1" />
              Reply
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 