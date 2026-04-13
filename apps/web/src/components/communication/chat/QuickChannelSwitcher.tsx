import React, { useState, useEffect, useMemo } from 'react';
import { Search, Hash, Lock, Users, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BlurFade } from "@/components/magicui/blur-fade";

interface Channel {
  id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  memberCount?: number;
  unreadCount?: number;
  lastActivity?: Date;
}

interface QuickChannelSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  channels: Channel[];
  selectedChannelId: string | null;
  onChannelSelect: (channelId: string) => void;
}

export default function QuickChannelSwitcher({
  isOpen,
  onClose,
  channels,
  selectedChannelId,
  onChannelSelect
}: QuickChannelSwitcherProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter channels based on search
  const filteredChannels = useMemo(() => {
    if (!searchQuery.trim()) return channels;
    
    return channels.filter(channel => 
      channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      channel.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [channels, searchQuery]);

  // Reset search and selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredChannels.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredChannels.length - 1
          );
          break;
        case 'Enter':
          event.preventDefault();
          if (filteredChannels[selectedIndex]) {
            onChannelSelect(filteredChannels[selectedIndex].id);
            onClose();
          }
          break;
        case 'Escape':
          event.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredChannels, selectedIndex, onChannelSelect, onClose]);

  const handleChannelClick = (channelId: string) => {
    onChannelSelect(channelId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogTitle className="sr-only">Quick Channel Switcher</DialogTitle>
      <DialogDescription className="sr-only">
        Search and switch between channels quickly
      </DialogDescription>
      <DialogContent className="max-w-2xl p-0 border-border/50">
        <BlurFade delay={0.1}>
          <div className="flex flex-col h-[500px]">
            {/* Search Header */}
            <div className="p-4 border-b border-border/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedIndex(0); // Reset selection when searching
                  }}
                  placeholder="Search channels..."
                  className="pl-10 border-none focus:ring-0 bg-transparent"
                  autoFocus
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <span>{filteredChannels.length} channel{filteredChannels.length !== 1 ? 's' : ''}</span>
                <div className="flex items-center space-x-2">
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">↑↓</kbd>
                  <span>navigate</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">Enter</kbd>
                  <span>select</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">Esc</kbd>
                  <span>close</span>
                </div>
              </div>
            </div>

            {/* Channel List */}
            <ScrollArea className="flex-1">
              <div className="p-2">
                {filteredChannels.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <div className="text-center">
                      <Hash className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No channels found</p>
                      <p className="text-xs">Try a different search term</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredChannels.map((channel, index) => (
                      <BlurFade key={channel.id} delay={index * 0.05}>
                        <div
                          onClick={() => handleChannelClick(channel.id)}
                          className={cn(
                            "flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all duration-200",
                            "hover:bg-accent/50",
                            selectedIndex === index && "bg-accent ring-1 ring-ring",
                            selectedChannelId === channel.id && "bg-primary/10 border border-primary/20"
                          )}
                        >
                          {/* Channel Icon */}
                          <div className="flex-shrink-0">
                            {channel.isPrivate ? (
                              <Lock className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Hash className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>

                          {/* Channel Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-sm truncate">
                                {channel.name}
                              </span>
                              {channel.unreadCount && channel.unreadCount > 0 && (
                                <Badge className="h-4 px-1.5 text-xs">
                                  {channel.unreadCount > 99 ? '99+' : channel.unreadCount}
                                </Badge>
                              )}
                              {selectedChannelId === channel.id && (
                                <Badge variant="outline" className="h-4 px-1.5 text-xs">
                                  Current
                                </Badge>
                              )}
                            </div>
                            {channel.description && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {channel.description}
                              </p>
                            )}
                          </div>

                          {/* Channel Stats */}
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            {channel.memberCount && (
                              <div className="flex items-center space-x-1">
                                <Users className="h-3 w-3" />
                                <span>{channel.memberCount}</span>
                              </div>
                            )}
                            {channel.lastActivity && (
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>
                                  {new Date(channel.lastActivity).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </BlurFade>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </BlurFade>
      </DialogContent>
    </Dialog>
  );
} 