import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bookmark, BookmarkCheck, X, Search, Filter, ExternalLink, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from 'date-fns';
import { useBookmarkedMessages, useUnbookmarkMessage, useBookmarkMessage } from "@/hooks/use-messages";
import { SafeMessageContent } from "@/components/chat/safe-message-content";
import { useAuth } from '@/components/providers/unified-context-provider';

interface BookmarkedMessagesProps {
  trigger?: React.ReactNode;
  onMessageClick?: (messageId: string, channelId?: string) => void;
}

export default function BookmarkedMessages({ 
  trigger,
  onMessageClick 
}: BookmarkedMessagesProps) {
  const { user } = useAuth();
  const { data: bookmarks = [], isLoading } = useBookmarkedMessages();
  const unbookmarkMutation = useUnbookmarkMessage();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [filterBy, setFilterBy] = useState<'all' | 'today' | 'week' | 'month'>('all');

  const handleUnbookmark = async (messageId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await unbookmarkMutation.mutateAsync(messageId);
    } catch (error) {
      console.error('Failed to remove bookmark:', error);
    }
  };

  const handleMessageClick = (bookmark: any) => {
    onMessageClick?.(bookmark.messageId, bookmark.channelId);
    setIsOpen(false);
  };

  // Filter and sort bookmarks
  const filteredBookmarks = React.useMemo(() => {
    let filtered = bookmarks;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter((bookmark: any) =>
        bookmark.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bookmark.userName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply date filter
    if (filterBy !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();
      
      switch (filterBy) {
        case 'today':
          cutoffDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setDate(now.getDate() - 30);
          break;
      }
      
      filtered = filtered.filter((bookmark: any) =>
        new Date(bookmark.createdAt) >= cutoffDate
      );
    }

    // Apply sorting
    filtered.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [bookmarks, searchQuery, filterBy, sortBy]);

  const defaultTrigger = (
    <Button variant="ghost" size="sm" className="h-8">
      <BookmarkCheck className="h-4 w-4 mr-2" />
      Bookmarks ({bookmarks.length})
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookmarkCheck className="h-5 w-5" />
            Bookmarked Messages
            <Badge variant="secondary">{bookmarks.length}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and Filter Controls */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search bookmarks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={filterBy} onValueChange={setFilterBy}>
              <SelectTrigger className="w-32">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This week</SelectItem>
                <SelectItem value="month">This month</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bookmarks List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredBookmarks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookmarkCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>
                {searchQuery || filterBy !== 'all' 
                  ? 'No bookmarks match your filters' 
                  : 'No bookmarked messages'
                }
              </p>
              <p className="text-sm mt-1">
                {searchQuery || filterBy !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Bookmark important messages to save them for later'
                }
              </p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {filteredBookmarks.map((bookmark: any) => (
                  <Card
                    key={bookmark.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors group"
                    onClick={() => handleMessageClick(bookmark)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarFallback className="text-xs">
                            {bookmark.userName?.charAt(0) || bookmark.userEmail?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-sm">
                                {bookmark.userName || bookmark.userEmail?.split('@')[0] || 'Unknown'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {bookmark.channelName && (
                                  <>in #{bookmark.channelName} • </>
                                )}
                                {formatDistanceToNow(new Date(bookmark.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                            
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={(e) => handleMessageClick(bookmark)}
                                title="Go to message"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                onClick={(e) => handleUnbookmark(bookmark.messageId, e)}
                                disabled={unbookmarkMutation.isPending}
                                title="Remove bookmark"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="text-sm text-foreground mb-2">
                            <SafeMessageContent 
                              content={bookmark.content || 'Message content unavailable'} 
                              className="line-clamp-3"
                            />
                          </div>
                          
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <span>Bookmarked {formatDistanceToNow(new Date(bookmark.createdAt), { addSuffix: true })}</span>
                            {bookmark.isEdited && (
                              <Badge variant="outline" className="text-xs">
                                edited
                              </Badge>
                            )}
                          </div>
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

// Quick bookmark button component
export function BookmarkButton({ 
  messageId, 
  isBookmarked = false,
  variant = "ghost",
  size = "sm",
  showText = false,
  className 
}: {
  messageId: string;
  isBookmarked?: boolean;
  variant?: "ghost" | "outline" | "default";
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}) {
  const { data: bookmarks = [] } = useBookmarkedMessages();
  const unbookmarkMutation = useUnbookmarkMessage();
  const bookmarkMutation = useBookmarkMessage();
  
  // Check if message is bookmarked
  const messageIsBookmarked = bookmarks.some((bookmark: any) => bookmark.messageId === messageId);

  const handleToggleBookmark = async (event: React.MouseEvent) => {
    event.stopPropagation();
    
    try {
      if (messageIsBookmarked) {
        await unbookmarkMutation.mutateAsync(messageId);
      } else {
        await bookmarkMutation.mutateAsync(messageId);
      }
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggleBookmark}
      disabled={unbookmarkMutation.isPending || bookmarkMutation.isPending}
      className={cn(
        "transition-colors",
        messageIsBookmarked && "text-yellow-600 hover:text-yellow-700",
        className
      )}
      title={messageIsBookmarked ? "Remove bookmark" : "Bookmark message"}
    >
      {messageIsBookmarked ? (
        <BookmarkCheck className="h-4 w-4" />
      ) : (
        <Bookmark className="h-4 w-4" />
      )}
      {showText && (
        <span className="ml-2">
          {messageIsBookmarked ? 'Bookmarked' : 'Bookmark'}
        </span>
      )}
    </Button>
  );
}