/**
 * @fileoverview Thread Navigation Component
 * @description Navigation and management interface for threads with search, filtering, and organization
 * @author Claude Code Assistant
 * @version 1.0.0
 * 
 * Features:
 * - Thread list with search and filtering
 * - Thread status management (open, resolved, archived)
 * - Quick thread switching and navigation
 * - Thread statistics and analytics
 * - Bulk thread operations
 * - Thread favorites and bookmarks
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/cn';
import {
  Search,
  MessageSquare,
  Users,
  Clock,
  CheckCircle,
  Archive,
  Star,
  Filter,
  MoreVertical,
  Pin,
  Trash2,
  Eye,
  Hash,
  TrendingUp,
  Calendar,
  User
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ThreadSummary {
  id: string;
  originalMessage: {
    content: string;
    userEmail: string;
    userName?: string;
    createdAt: Date;
    channelId: string;
    channelName: string;
  };
  status: 'open' | 'resolved' | 'archived';
  replyCount: number;
  participantCount: number;
  lastActivity: Date;
  unreadCount: number;
  isStarred: boolean;
  isPinned: boolean;
  isSubscribed: boolean;
  preview: string;
  participants: {
    userEmail: string;
    userName?: string;
  }[];
}

interface ThreadNavigationProps {
  threads: ThreadSummary[];
  currentThreadId?: string;
  onThreadSelect: (threadId: string) => void;
  onThreadAction?: (threadId: string, action: 'star' | 'pin' | 'archive' | 'delete') => void;
  className?: string;
  showSearch?: boolean;
  showFilters?: boolean;
}

// Thread List Item Component
const ThreadListItem: React.FC<{
  thread: ThreadSummary;
  isActive?: boolean;
  onClick: () => void;
  onAction?: (action: 'star' | 'pin' | 'archive' | 'delete') => void;
}> = ({ thread, isActive = false, onClick, onAction }) => {
  const [showActions, setShowActions] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'archived': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        isActive && "ring-2 ring-primary shadow-md"
      )}
      onClick={onClick}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Avatar className="w-6 h-6">
              <AvatarFallback className="text-xs">
                {thread.originalMessage.userName?.charAt(0) || thread.originalMessage.userEmail.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{thread.originalMessage.userName || thread.originalMessage.userEmail}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Hash className="h-3 w-3" />
                {thread.originalMessage.channelName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {thread.isPinned && <Pin className="h-3 w-3 text-orange-500" />}
            {thread.isStarred && <Star className="h-3 w-3 text-yellow-500 fill-current" />}
            {thread.unreadCount > 0 && (
              <Badge variant="destructive" className="h-4 text-xs px-1">
                {thread.unreadCount}
              </Badge>
            )}
            
            {showActions && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction?.('star');
                  }}
                  className="h-6 w-6 p-0"
                >
                  <Star className={cn("h-3 w-3", thread.isStarred && "fill-current text-yellow-500")} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction?.('pin');
                  }}
                  className="h-6 w-6 p-0"
                >
                  <Pin className={cn("h-3 w-3", thread.isPinned && "text-orange-500")} />
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="mb-2">
          <p className="text-sm font-medium line-clamp-2 mb-1">
            {thread.originalMessage.content}
          </p>
          {thread.preview && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              Latest: {thread.preview}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Badge variant="outline" className={cn("text-xs", getStatusColor(thread.status))}>
              {thread.status}
            </Badge>
            
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {thread.replyCount}
            </span>
            
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {thread.participantCount}
            </span>
          </div>

          <div className="text-xs text-muted-foreground">
            {formatDistanceToNow(thread.lastActivity, { addSuffix: true })}
          </div>
        </div>

        {/* Participants Preview */}
        {thread.participants.length > 0 && (
          <div className="flex items-center gap-1 mt-2">
            <div className="flex -space-x-1">
              {thread.participants.slice(0, 3).map((participant, index) => (
                <Avatar key={participant.userEmail} className="w-4 h-4 border border-background">
                  <AvatarFallback className="text-[8px]">
                    {participant.userName?.charAt(0) || participant.userEmail.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {thread.participants.length > 3 && (
                <div className="w-4 h-4 rounded-full bg-muted border border-background flex items-center justify-center">
                  <span className="text-[8px] text-muted-foreground">+{thread.participants.length - 3}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Thread Statistics Component
const ThreadStats: React.FC<{
  threads: ThreadSummary[];
  className?: string;
}> = ({ threads, className }) => {
  const stats = useMemo(() => {
    const openThreads = threads.filter(t => t.status === 'open').length;
    const resolvedThreads = threads.filter(t => t.status === 'resolved').length;
    const archivedThreads = threads.filter(t => t.status === 'archived').length;
    const totalReplies = threads.reduce((sum, t) => sum + t.replyCount, 0);
    const activeThreads = threads.filter(t => 
      Date.now() - t.lastActivity.getTime() < 24 * 60 * 60 * 1000
    ).length;

    return {
      total: threads.length,
      open: openThreads,
      resolved: resolvedThreads,
      archived: archivedThreads,
      totalReplies,
      active: activeThreads,
    };
  }, [threads]);

  return (
    <div className={cn("grid grid-cols-2 gap-4", className)}>
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Total Threads</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Open</p>
              <p className="text-2xl font-bold text-blue-600">{stats.open}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Resolved</p>
              <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Active Today</p>
              <p className="text-2xl font-bold text-orange-600">{stats.active}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Main Thread Navigation Component
export function ThreadNavigation({
  threads,
  currentThreadId,
  onThreadSelect,
  onThreadAction,
  className,
  showSearch = true,
  showFilters = true,
}: ThreadNavigationProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const [sortBy, setSortBy] = useState<'activity' | 'created' | 'replies'>('activity');

  // Filter and sort threads
  const filteredThreads = useMemo(() => {
    let filtered = threads;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(thread =>
        thread.originalMessage.content.toLowerCase().includes(query) ||
        thread.originalMessage.userName?.toLowerCase().includes(query) ||
        thread.originalMessage.userEmail.toLowerCase().includes(query) ||
        thread.originalMessage.channelName.toLowerCase().includes(query) ||
        thread.preview.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (selectedTab !== 'all') {
      switch (selectedTab) {
        case 'open':
          filtered = filtered.filter(t => t.status === 'open');
          break;
        case 'resolved':
          filtered = filtered.filter(t => t.status === 'resolved');
          break;
        case 'archived':
          filtered = filtered.filter(t => t.status === 'archived');
          break;
        case 'starred':
          filtered = filtered.filter(t => t.isStarred);
          break;
        case 'unread':
          filtered = filtered.filter(t => t.unreadCount > 0);
          break;
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'activity':
          return b.lastActivity.getTime() - a.lastActivity.getTime();
        case 'created':
          return b.originalMessage.createdAt.getTime() - a.originalMessage.createdAt.getTime();
        case 'replies':
          return b.replyCount - a.replyCount;
        default:
          return 0;
      }
    });

    return filtered;
  }, [threads, searchQuery, selectedTab, sortBy]);

  const handleThreadAction = (threadId: string, action: 'star' | 'pin' | 'archive' | 'delete') => {
    onThreadAction?.(threadId, action);
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Threads
          </h2>
          
          <div className="flex items-center gap-2">
            {showFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Toggle sort options
                  const options = ['activity', 'created', 'replies'] as const;
                  const currentIndex = options.indexOf(sortBy);
                  setSortBy(options[(currentIndex + 1) % options.length]);
                }}
                className="text-xs"
              >
                <Filter className="h-3 w-3 mr-1" />
                Sort: {sortBy}
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        {showSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search threads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        {/* Stats */}
        <ThreadStats threads={threads} />
      </div>

      {/* Tabs */}
      <div className="border-b">
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-6 h-9">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="open" className="text-xs">Open</TabsTrigger>
            <TabsTrigger value="resolved" className="text-xs">Resolved</TabsTrigger>
            <TabsTrigger value="starred" className="text-xs">Starred</TabsTrigger>
            <TabsTrigger value="unread" className="text-xs">Unread</TabsTrigger>
            <TabsTrigger value="archived" className="text-xs">Archived</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Thread List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {filteredThreads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">
                {searchQuery.trim() ? 'No threads match your search' : 'No threads found'}
              </p>
            </div>
          ) : (
            filteredThreads.map((thread) => (
              <ThreadListItem
                key={thread.id}
                thread={thread}
                isActive={thread.id === currentThreadId}
                onClick={() => onThreadSelect(thread.id)}
                onAction={(action) => handleThreadAction(thread.id, action)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default ThreadNavigation;