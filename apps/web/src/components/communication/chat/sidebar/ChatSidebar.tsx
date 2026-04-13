import React, { useState, useMemo } from 'react';
import { Search, Plus, Hash, Lock, Users, Settings, Filter, SortAsc } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useChannels } from "@/hooks/use-channels";
import { Channel } from "@/hooks/use-channels";
import ChannelList from "./ChannelList";
import ChannelSearch from "./ChannelSearch";
import ChannelActions from "./ChannelActions";

// Import Magic UI BlurFade component
import { BlurFade } from "@/components/magicui/blur-fade";

interface ChatSidebarProps {
  selectedChannelId: string | null;
  onChannelSelect: (channelId: string) => void;
  onNewChannel: () => void;
  onChannelSettings: (channel: Channel) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function ChatSidebar({ 
  selectedChannelId, 
  onChannelSelect, 
  onNewChannel,
  onChannelSettings,
  isCollapsed = false,
  onToggleCollapse 
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<'name' | 'activity' | 'members'>('activity');
  const [filterType, setFilterType] = useState<'all' | 'public' | 'private'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: channels = [], isLoading } = useChannels("default-workspace"); // TODO: Get from context

  // Filter and sort channels
  const filteredChannels = useMemo(() => {
    let filtered = channels.filter(channel => {
      const matchesSearch = channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (channel.description?.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesFilter = filterType === 'all' || 
                           (filterType === 'public' && !channel.isPrivate) ||
                           (filterType === 'private' && channel.isPrivate);
      
      return matchesSearch && matchesFilter;
    });

    // Sort channels
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'members':
          return (b.memberCount || 0) - (a.memberCount || 0);
        case 'activity':
        default:
          return new Date(b.lastActivity || 0).getTime() - new Date(a.lastActivity || 0).getTime();
      }
    });

    return filtered;
  }, [channels, searchQuery, sortBy, filterType]);

  if (isCollapsed) {
    return (
      <div className="w-16 bg-background border-r border-border flex flex-col items-center py-4 space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="w-10 h-10 p-0"
        >
          <Hash className="h-4 w-4" />
        </Button>
        
        <div className="flex flex-col space-y-2">
          {filteredChannels.slice(0, 5).map((channel, index) => (
            <BlurFade key={channel.id} delay={index * 0.1}>
              <Button
                variant={selectedChannelId === channel.id ? "default" : "ghost"}
                size="sm"
                onClick={() => onChannelSelect(channel.id)}
                className="w-10 h-10 p-0 relative"
                title={channel.name}
              >
                {channel.isPrivate ? <Lock className="h-3 w-3" /> : <Hash className="h-3 w-3" />}
                {channel.unreadCount && channel.unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs">
                    {channel.unreadCount > 99 ? '99+' : channel.unreadCount}
                  </Badge>
                )}
              </Button>
            </BlurFade>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-background border-r border-border flex flex-col h-full">
      {/* Header */}
      <BlurFade delay={0}>
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Channels</h2>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateModal(true)}
                className="h-8 w-8 p-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
              {onToggleCollapse && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleCollapse}
                  className="h-8 w-8 p-0"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Search */}
          <ChannelSearch 
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortBy={sortBy}
            onSortChange={setSortBy}
            filterType={filterType}
            onFilterChange={setFilterType}
          />
        </div>
      </BlurFade>

      {/* Channel List */}
      <ScrollArea className="flex-1 px-2">
        <BlurFade delay={0.2}>
          <ChannelList
            channels={filteredChannels}
            selectedChannelId={selectedChannelId}
            onChannelSelect={onChannelSelect}
            onChannelSettings={onChannelSettings}
            isLoading={isLoading}
          />
        </BlurFade>
      </ScrollArea>

      {/* Create Channel Modal */}
      {showCreateModal && (
        <ChannelActions
          onClose={() => setShowCreateModal(false)}
          onChannelCreated={onNewChannel}
        />
      )}
    </div>
  );
} 