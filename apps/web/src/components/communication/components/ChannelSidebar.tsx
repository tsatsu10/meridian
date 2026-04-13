// @epic-3.5-communication: Modular channel sidebar with search and filtering
import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Hash, 
  Lock, 
  Users, 
  Megaphone, 
  Plus, 
  Search,
  Filter,
  MoreHorizontal,
  Settings
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Channel } from "@/hooks/use-channels";
import { CommunicationPermissions } from "../MainCommunicationInterface";

interface ChannelSidebarProps {
  channels: Channel[];
  activeChannelId: string | null;
  onChannelSelect: (channelId: string) => void;
  onCreateChannel: () => void;
  userPermissions: CommunicationPermissions;
  isLoading: boolean;
  collapsed?: boolean;
}

type ChannelFilter = 'all' | 'unread' | 'team' | 'project' | 'private' | 'dm';

export function ChannelSidebar({
  channels,
  activeChannelId,
  onChannelSelect,
  onCreateChannel,
  userPermissions,
  isLoading,
  collapsed = false
}: ChannelSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<ChannelFilter>('all');

  // Filter and search channels
  const filteredChannels = useMemo(() => {
    let filtered = channels;

    // Apply filter
    if (filter !== 'all') {
      filtered = filtered.filter(channel => {
        switch (filter) {
          case 'unread':
            return (channel as any).unreadCount > 0;
          case 'team':
            return channel.type === 'team';
          case 'project':
            return channel.type === 'project';
          case 'private':
            return channel.type === 'private';
          case 'dm':
            return channel.type === 'dm';
          default:
            return true;
        }
      });
    }

    // Apply search
    if (searchQuery.trim()) {
      filtered = filtered.filter(channel =>
        channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        channel.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [channels, filter, searchQuery]);

  const getChannelIcon = (type: Channel['type']) => {
    switch (type) {
      case 'private':
        return <Lock className="h-4 w-4" />;
      case 'dm':
        return <Users className="h-4 w-4" />;
      case 'announcement':
        return <Megaphone className="h-4 w-4" />;
      default:
        return <Hash className="h-4 w-4" />;
    }
  };

  const getChannelColor = (type: Channel['type']) => {
    switch (type) {
      case 'private':
        return 'text-red-500';
      case 'dm':
        return 'text-green-500';
      case 'announcement':
        return 'text-orange-500';
      case 'project':
        return 'text-blue-500';
      default:
        return 'text-muted-foreground';
    }
  };

  if (collapsed) {
    return (
      <div className="w-16 border-r bg-muted/30 flex flex-col">
        <div className="p-3 border-b">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCreateChannel}
            disabled={!userPermissions.canCreateChannels}
            className="w-10 h-10 p-0"
            title="Create Channel"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredChannels.map((channel) => (
            <div
              key={channel.id}
              onClick={() => onChannelSelect(channel.id)}
              className={cn(
                "w-10 h-10 m-2 rounded-lg flex items-center justify-center cursor-pointer transition-colors",
                "hover:bg-muted",
                activeChannelId === channel.id && "bg-primary/10 border border-primary/20"
              )}
              title={channel.name}
            >
              <div className={getChannelColor(channel.type)}>
                {getChannelIcon(channel.type)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full border-r bg-muted/30 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Channels</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCreateChannel}
            disabled={!userPermissions.canCreateChannels}
            className="h-8 w-8 p-0"
            title="Create Channel"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-1">
          {[
            { key: 'all', label: 'All' },
            { key: 'unread', label: 'Unread' },
            { key: 'team', label: 'Team' },
            { key: 'project', label: 'Project' },
            { key: 'private', label: 'Private' },
            { key: 'dm', label: 'DM' }
          ].map(({ key, label }) => (
            <Button
              key={key}
              variant={filter === key ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilter(key as ChannelFilter)}
              className="text-xs h-6"
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Channel List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-10 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : filteredChannels.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <div className="text-sm">
              {searchQuery ? 'No matching channels' : 'No channels found'}
            </div>
            {filter === 'all' && !searchQuery && userPermissions.canCreateChannels && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCreateChannel}
                className="mt-2 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Create First Channel
              </Button>
            )}
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredChannels.map((channel) => (
              <div
                key={channel.id}
                onClick={() => onChannelSelect(channel.id)}
                className={cn(
                  "group flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-colors",
                  "hover:bg-muted",
                  activeChannelId === channel.id && "bg-primary/10 border border-primary/20"
                )}
              >
                <div className={cn("flex-shrink-0", getChannelColor(channel.type))}>
                  {getChannelIcon(channel.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "text-sm font-medium truncate",
                      activeChannelId === channel.id ? "text-primary" : "text-foreground"
                    )}>
                      {channel.name}
                    </span>
                    {(channel as any).unreadCount > 0 && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {(channel as any).unreadCount > 99 ? '99+' : (channel as any).unreadCount}
                      </Badge>
                    )}
                  </div>
                  {channel.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {channel.description}
                    </p>
                  )}
                </div>

                <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle channel settings
                    }}
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 