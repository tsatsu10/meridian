// @epic-3.5-communication: Channel header with info and actions
import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Hash, 
  Lock, 
  Megaphone,
  MoreHorizontal,
  Search,
  Star,
  Pin,
  Menu,
  Info
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Channel } from "@/hooks/use-channels";
import { CommunicationPermissions } from "../MainCommunicationInterface";

interface ChannelHeaderProps {
  channel?: Channel;
  onToggleUserList: () => void;
  showUserList: boolean;
  userPermissions: CommunicationPermissions;
  isMobile: boolean;
  onToggleSidebar: () => void;
  className?: string;
}

export function ChannelHeader({
  channel,
  onToggleUserList,
  showUserList,
  userPermissions,
  isMobile,
  onToggleSidebar,
  className
}: ChannelHeaderProps) {
  if (!channel) {
    return (
      <div className={cn("h-16 border-b bg-background/95 backdrop-blur", className)}>
        <div className="h-full flex items-center justify-between px-4">
          <div className="flex items-center space-x-3">
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleSidebar}
                className="h-8 w-8 p-0"
              >
                <Menu className="h-4 w-4" />
              </Button>
            )}
            <div className="text-muted-foreground">
              Select a channel to start messaging
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getChannelIcon = () => {
    switch (channel.type) {
      case 'private':
        return <Lock className="h-5 w-5 text-red-500" />;
      case 'dm':
        return <Users className="h-5 w-5 text-green-500" />;
      case 'announcement':
        return <Megaphone className="h-5 w-5 text-orange-500" />;
      case 'project':
        return <Hash className="h-5 w-5 text-blue-500" />;
      default:
        return <Hash className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getChannelTypeLabel = () => {
    switch (channel.type) {
      case 'private':
        return 'Private Channel';
      case 'dm':
        return 'Direct Message';
      case 'announcement':
        return 'Announcement';
      case 'project':
        return 'Project Channel';
      default:
        return 'Channel';
    }
  };

  return (
    <div className={cn("h-16 border-b bg-background/95 backdrop-blur", className)}>
      <div className="h-full flex items-center justify-between px-4">
        {/* Left side - Channel info */}
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          {isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSidebar}
              className="h-8 w-8 p-0 flex-shrink-0"
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}
          
          <div className="flex items-center space-x-3 min-w-0">
            <div className="flex-shrink-0">
              {getChannelIcon()}
            </div>
            
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-semibold truncate">
                  {channel.name}
                </h1>
                {channel.type === 'private' && (
                  <Badge variant="secondary" className="text-xs">
                    Private
                  </Badge>
                )}
                {channel.archived && (
                  <Badge variant="outline" className="text-xs">
                    Archived
                  </Badge>
                )}
              </div>
              
              {channel.description && (
                <p className="text-sm text-muted-foreground truncate">
                  {channel.description}
                </p>
              )}
              
              {!channel.description && (
                <p className="text-sm text-muted-foreground">
                  {getChannelTypeLabel()} • {(channel as any).memberCount || 0} members
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          {/* Search */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Search in channel"
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Pinned Messages */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Pinned messages"
          >
            <Pin className="h-4 w-4" />
          </Button>

          {/* Toggle User List */}
          {!isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleUserList}
              className={cn(
                "h-8 w-8 p-0",
                showUserList && "bg-muted"
              )}
              title={showUserList ? "Hide members" : "Show members"}
            >
              <Users className="h-4 w-4" />
            </Button>
          )}

          {/* Channel Info */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Channel details"
          >
            <Info className="h-4 w-4" />
          </Button>

          {/* More Options */}
          {userPermissions.canManageChannels && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="More options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
} 