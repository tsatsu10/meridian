import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Pin, X, MessageSquare, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from 'date-fns';
import { usePinnedMessages, usePinMessage } from "@/hooks/use-messages";
import { SafeMessageContent } from "@/components/chat/safe-message-content";
import { useAuth } from '@/components/providers/unified-context-provider';

interface PinnedMessagesProps {
  channelId: string;
  trigger?: React.ReactNode;
  onMessageClick?: (messageId: string) => void;
}

export default function PinnedMessages({ 
  channelId, 
  trigger,
  onMessageClick 
}: PinnedMessagesProps) {
  const { user } = useAuth();
  const { data: pinnedMessages = [], isLoading } = usePinnedMessages(channelId);
  const unpinMutation = usePinMessage();
  const [isOpen, setIsOpen] = useState(false);

  const handleUnpin = async (messageId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await unpinMutation.mutateAsync(messageId);
    } catch (error) {
      console.error('Failed to unpin message:', error);
    }
  };

  const handleMessageClick = (messageId: string) => {
    onMessageClick?.(messageId);
    setIsOpen(false); // Close the sheet when navigating to message
  };

  const defaultTrigger = (
    <Button variant="ghost" size="sm" className="h-8">
      <Pin className="h-4 w-4 mr-2" />
      Pinned ({pinnedMessages.length})
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pin className="h-5 w-5" />
            Pinned Messages
            <Badge variant="secondary">{pinnedMessages.length}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : pinnedMessages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Pin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No pinned messages</p>
              <p className="text-sm mt-1">Pin important messages to find them easily later</p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {pinnedMessages.map((message) => (
                  <Card
                    key={message.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleMessageClick(message.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarFallback className="text-xs">
                            {message.userName?.charAt(0) || message.userEmail.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-sm">
                                {message.userName || message.userEmail.split('@')[0]}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                            
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                onClick={(e) => handleMessageClick(message.id)}
                                title="Go to message"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                onClick={(e) => handleUnpin(message.id, e)}
                                disabled={unpinMutation.isPending}
                                title="Unpin message"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="text-sm text-foreground mb-2">
                            <SafeMessageContent 
                              content={message.content} 
                              className="line-clamp-3"
                            />
                          </div>
                          
                          {message.isEdited && (
                            <Badge variant="outline" className="text-xs">
                              edited
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Compact pinned message banner for channel header
export function PinnedMessagesBanner({ 
  channelId,
  className 
}: { 
  channelId: string;
  className?: string;
}) {
  const { data: pinnedMessages = [] } = usePinnedMessages(channelId);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (pinnedMessages.length === 0) return null;

  const currentMessage = pinnedMessages[currentIndex];

  const nextMessage = () => {
    setCurrentIndex((prev) => (prev + 1) % pinnedMessages.length);
  };

  const prevMessage = () => {
    setCurrentIndex((prev) => (prev - 1 + pinnedMessages.length) % pinnedMessages.length);
  };

  return (
    <div className={cn(
      "bg-orange-50 border-b border-orange-200 px-4 py-2 flex items-center space-x-3",
      className
    )}>
      <Pin className="h-4 w-4 text-orange-600 flex-shrink-0" />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-sm font-medium text-orange-900">
            {currentMessage.userName || currentMessage.userEmail.split('@')[0]}
          </span>
          <span className="text-xs text-orange-600">
            {formatDistanceToNow(new Date(currentMessage.createdAt), { addSuffix: true })}
          </span>
        </div>
        <div className="text-sm text-orange-800 truncate">
          <SafeMessageContent content={currentMessage.content} />
        </div>
      </div>

      {pinnedMessages.length > 1 && (
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={prevMessage}
            className="h-6 w-6 p-0 text-orange-600 hover:text-orange-800"
          >
            ←
          </Button>
          <span className="text-xs text-orange-600">
            {currentIndex + 1}/{pinnedMessages.length}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={nextMessage}
            className="h-6 w-6 p-0 text-orange-600 hover:text-orange-800"
          >
            →
          </Button>
        </div>
      )}

      <PinnedMessages
        channelId={channelId}
        trigger={
          <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-800">
            View All
          </Button>
        }
      />
    </div>
  );
}