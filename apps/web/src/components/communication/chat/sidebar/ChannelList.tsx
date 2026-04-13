import React from 'react';
import { Hash, Lock, Users, Volume2, VolumeX, MoreHorizontal, Circle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Channel } from "@/hooks/use-channels";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

// Import Magic UI BlurFade component
import { BlurFade } from "@/components/magicui/blur-fade";

interface ChannelListProps {
  channels: Channel[];
  selectedChannelId: string | null;
  onChannelSelect: (channelId: string) => void;
  onChannelSettings: (channel: Channel) => void;
  isLoading?: boolean;
}

interface ChannelItemProps {
  channel: Channel;
  isSelected: boolean;
  onSelect: () => void;
  onSettings: () => void;
  index: number;
}

function ChannelItem({ channel, isSelected, onSelect, onSettings, index }: ChannelItemProps) {
  const getChannelIcon = () => {
    if (channel.isPrivate || channel.type === 'private') {
      return <Lock className="h-4 w-4" />;
    }
    switch (channel.type) {
      case 'dm':
        return <Circle className="h-3 w-3 fill-green-500 text-green-500" />;
      case 'announcement':
        return <Volume2 className="h-4 w-4" />;
      default:
        return <Hash className="h-4 w-4" />;
    }
  };

  const formatLastActivity = (date?: Date) => {
    if (!date) return '';
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    return 'now';
  };

  return (
    <BlurFade delay={index * 0.05}>
      <div className={cn(
        "group flex items-center w-full p-2 rounded-lg text-left hover:bg-accent/50 transition-colors relative",
        isSelected && "bg-accent text-accent-foreground"
      )}>
        <Button
          variant="ghost"
          onClick={onSelect}
          className={cn(
            "flex-1 justify-start gap-3 h-auto p-2 font-normal",
            isSelected && "bg-transparent"
          )}
        >
          <div className="flex items-center justify-center">
            {getChannelIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className={cn(
                "text-sm truncate",
                isSelected ? "font-medium" : "font-normal"
              )}>
                {channel.name}
              </span>
              
              {/* Unread Badge */}
              {channel.unreadCount && channel.unreadCount > 0 && (
                                 <Badge 
                   variant="default" 
                   className="h-5 w-5 p-0 text-xs flex items-center justify-center ml-2 bg-red-500 text-white"
                 >
                  {channel.unreadCount > 99 ? '99+' : channel.unreadCount}
                </Badge>
              )}
            </div>
            
            {/* Last message preview */}
            {channel.lastMessage && (
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                <span className="truncate flex-1 mr-2">
                  {channel.lastMessage}
                </span>
                <span className="flex-shrink-0">
                  {formatLastActivity(channel.lastActivity)}
                </span>
              </div>
            )}
            
            {/* Member count for non-DM channels */}
            {channel.type !== 'dm' && channel.memberCount && (
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                <Users className="h-3 w-3 mr-1" />
                <span>{channel.memberCount}</span>
              </div>
            )}
          </div>
        </Button>

        {/* Channel Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm"
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onSettings}>
              Channel Settings
            </DropdownMenuItem>
            <DropdownMenuItem>
              Mute Channel
            </DropdownMenuItem>
            <DropdownMenuItem>
              Copy Link
            </DropdownMenuItem>
            {!channel.isPrivate && (
              <DropdownMenuItem className="text-destructive">
                Leave Channel
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </BlurFade>
  );
}

export default function ChannelList({ 
  channels, 
  selectedChannelId, 
  onChannelSelect, 
  onChannelSettings,
  isLoading = false 
}: ChannelListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2 py-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-3 p-2">
            <Skeleton className="h-4 w-4" />
            <div className="space-y-1 flex-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (channels.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <Hash className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No channels found</p>
        <p className="text-xs mt-1">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 py-2">
      {channels.map((channel, index) => (
        <ChannelItem
          key={channel.id}
          channel={channel}
          isSelected={selectedChannelId === channel.id}
          onSelect={() => onChannelSelect(channel.id)}
          onSettings={() => onChannelSettings(channel)}
          index={index}
        />
      ))}
    </div>
  );
} 