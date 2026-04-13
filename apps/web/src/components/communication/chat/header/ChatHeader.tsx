import React, { useState } from 'react';
import { 
  Hash, 
  Lock, 
  Users, 
  Star, 
  StarOff, 
  Settings, 
  Search, 
  Phone, 
  Video, 
  Info,
  MoreVertical,
  Pin,
  Archive,
  Volume2,
  VolumeX,
  UserPlus
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Channel } from "@/hooks/use-channels";

interface ChatHeaderProps {
  channel: Channel | null;
  onChannelSettings: () => void;
  onToggleFavorite: () => void;
  onInviteMembers: () => void;
  onTogglePins: () => void;
  onToggleMute: () => void;
  onSearchMessages: () => void;
  onStartCall: () => void;
  onStartVideo: () => void;
  isFavorited?: boolean;
  isMuted?: boolean;
  showPins?: boolean;
  memberCount?: number;
  onlineMembers?: number;
}

const PresenceIndicator = ({ count, total }: { count: number; total: number }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>{count}/{total}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{count} of {total} members online</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export default function ChatHeader({
  channel,
  onChannelSettings,
  onToggleFavorite,
  onInviteMembers,
  onTogglePins,
  onToggleMute,
  onSearchMessages,
  onStartCall,
  onStartVideo,
  isFavorited = false,
  isMuted = false,
  showPins = false,
  memberCount = 0,
  onlineMembers = 0
}: ChatHeaderProps) {
  if (!channel) {
    return (
      <div className="h-16 border-b border-border flex items-center justify-center">
        <p className="text-muted-foreground">Select a channel to start messaging</p>
      </div>
    );
  }

  const getChannelIcon = () => {
    if (channel.isPrivate || channel.type === 'private') {
      return <Lock className="h-5 w-5" />;
    }
    switch (channel.type) {
      case 'dm':
        return <Avatar className="h-5 w-5"><AvatarFallback className="text-xs">DM</AvatarFallback></Avatar>;
      case 'announcement':
        return <Volume2 className="h-5 w-5" />;
      default:
        return <Hash className="h-5 w-5" />;
    }
  };

  const isDM = channel.type === 'dm';

  return (
    <div className="h-16 border-b border-border bg-background flex items-center justify-between px-4">
      {/* Left Section - Channel Info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {getChannelIcon()}
          <h1 className="text-lg font-semibold truncate">{channel.name}</h1>
          
          {/* Channel Badges */}
          <div className="flex items-center gap-1">
            {isFavorited && (
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            )}
            {isMuted && (
              <VolumeX className="h-4 w-4 text-muted-foreground" />
            )}
            {channel.isPrivate && (
              <Badge variant="secondary" className="text-xs">
                Private
              </Badge>
            )}
          </div>
        </div>

        {/* Channel Description & Members */}
        <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
          {channel.description && (
            <span className="truncate max-w-xs">{channel.description}</span>
          )}
          
          {!isDM && memberCount > 0 && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{memberCount}</span>
              {onlineMembers > 0 && (
                <PresenceIndicator count={onlineMembers} total={memberCount} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Section - Actions */}
      <div className="flex items-center gap-2">
        {/* Quick Actions */}
        <div className="hidden sm:flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSearchMessages}
                  className="h-8 w-8 p-0"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Search messages</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {!isDM && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onStartCall}
                      className="h-8 w-8 p-0"
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Start voice call</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onStartVideo}
                      className="h-8 w-8 p-0"
                    >
                      <Video className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Start video call</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onTogglePins}
                  className={cn("h-8 w-8 p-0", showPins && "bg-accent")}
                >
                  <Pin className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle pinned messages</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* More Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={onChannelSettings}>
              <Settings className="mr-2 h-4 w-4" />
              Channel Settings
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={onToggleFavorite}>
              {isFavorited ? (
                <>
                  <StarOff className="mr-2 h-4 w-4" />
                  Remove from Favorites
                </>
              ) : (
                <>
                  <Star className="mr-2 h-4 w-4" />
                  Add to Favorites
                </>
              )}
            </DropdownMenuItem>

            <DropdownMenuItem onClick={onToggleMute}>
              {isMuted ? (
                <>
                  <Volume2 className="mr-2 h-4 w-4" />
                  Unmute Channel
                </>
              ) : (
                <>
                  <VolumeX className="mr-2 h-4 w-4" />
                  Mute Channel
                </>
              )}
            </DropdownMenuItem>

            {!isDM && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onInviteMembers}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite Members
                </DropdownMenuItem>
              </>
            )}

            <DropdownMenuSeparator />
            
            {/* Mobile-only actions */}
            <div className="sm:hidden">
              <DropdownMenuItem onClick={onSearchMessages}>
                <Search className="mr-2 h-4 w-4" />
                Search Messages
              </DropdownMenuItem>
              
              {!isDM && (
                <>
                  <DropdownMenuItem onClick={onStartCall}>
                    <Phone className="mr-2 h-4 w-4" />
                    Start Voice Call
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onStartVideo}>
                    <Video className="mr-2 h-4 w-4" />
                    Start Video Call
                  </DropdownMenuItem>
                </>
              )}
              
              <DropdownMenuItem onClick={onTogglePins}>
                <Pin className="mr-2 h-4 w-4" />
                {showPins ? 'Hide' : 'Show'} Pinned Messages
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
            </div>

            <DropdownMenuItem className="text-destructive">
              <Archive className="mr-2 h-4 w-4" />
              {isDM ? 'Archive Conversation' : 'Leave Channel'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
} 