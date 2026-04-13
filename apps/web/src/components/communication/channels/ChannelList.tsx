// @epic-3.5-communication: Channel list component with search, filtering, and management
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Plus, 
  Hash, 
  Lock, 
  Users, 
  MessageCircle,
  Megaphone,
  FolderOpen,
  MoreHorizontal,
  Settings,
  UserPlus,
  Archive,
  Trash2,
  Volume2,
  VolumeX,
  Pin,
  Filter
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { Channel, TeamMember } from "../chat/ChatInterface";
import { useTeamPermissions } from "@/hooks/useTeamPermissions";

// Icon wrappers
const SearchIcon = Search as React.FC<{ className?: string }>;
const PlusIcon = Plus as React.FC<{ className?: string }>;
const HashIcon = Hash as React.FC<{ className?: string }>;
const LockIcon = Lock as React.FC<{ className?: string }>;
const UsersIcon = Users as React.FC<{ className?: string }>;
const MessageCircleIcon = MessageCircle as React.FC<{ className?: string }>;
const MegaphoneIcon = Megaphone as React.FC<{ className?: string }>;
const FolderOpenIcon = FolderOpen as React.FC<{ className?: string }>;
const MoreHorizontalIcon = MoreHorizontal as React.FC<{ className?: string }>;
const SettingsIcon = Settings as React.FC<{ className?: string }>;
const UserPlusIcon = UserPlus as React.FC<{ className?: string }>;
const ArchiveIcon = Archive as React.FC<{ className?: string }>;
const Trash2Icon = Trash2 as React.FC<{ className?: string }>;
const Volume2Icon = Volume2 as React.FC<{ className?: string }>;
const VolumeXIcon = VolumeX as React.FC<{ className?: string }>;
const PinIcon = Pin as React.FC<{ className?: string }>;
const FilterIcon = Filter as React.FC<{ className?: string }>;

interface ChannelListProps {
  channels: Channel[];
  activeChannelId: string;
  onChannelSelect: (channelId: string) => void;
  onCreateChannel?: () => void;
  onChannelAction?: (action: string, channel: Channel) => void;
  teamMembers?: TeamMember[];
  isCollapsed?: boolean;
  canCreateChannels?: boolean;
  className?: string;
}

type ChannelFilter = 'all' | 'unread' | 'mentions' | 'muted' | 'archived';
type ChannelSort = 'recent' | 'alphabetical' | 'unread' | 'type';

const CHANNEL_ICONS = {
  project: <FolderOpenIcon className="h-4 w-4" />,
  team: <UsersIcon className="h-4 w-4" />,
  dm: <MessageCircleIcon className="h-4 w-4" />,
  announcement: <MegaphoneIcon className="h-4 w-4" />,
  private: <LockIcon className="h-4 w-4" />
};

const CHANNEL_COLORS = {
  project: "text-blue-600",
  team: "text-green-600", 
  dm: "text-purple-600",
  announcement: "text-orange-600",
  private: "text-red-600"
};

export default function ChannelList({
  channels,
  activeChannelId,
  onChannelSelect,
  onCreateChannel,
  onChannelAction,
  teamMembers = [],
  isCollapsed = false,
  canCreateChannels = false,
  className
}: ChannelListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<ChannelFilter>('all');
  const [sortBy, setSortBy] = useState<ChannelSort>('recent');
  const [showFilters, setShowFilters] = useState(false);
  const [activeChannelMenu, setActiveChannelMenu] = useState<string | null>(null);
  const [mutedChannels, setMutedChannels] = useState<Set<string>>(new Set());
  const [pinnedChannels, setPinnedChannels] = useState<Set<string>>(new Set());

  const { permissions } = useTeamPermissions();

  // Filter and sort channels
  const filteredAndSortedChannels = useMemo(() => {
    let filtered = channels.filter(channel => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        if (!channel.name.toLowerCase().includes(searchLower) &&
            !channel.description?.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Status filters
      switch (activeFilter) {
        case 'unread':
          return channel.unreadCount > 0;
        case 'mentions':
          return channel.unreadCount > 0; // In real app, check for mentions
        case 'muted':
          return mutedChannels.has(channel.id);
        case 'archived':
          return channel.archived;
        case 'all':
        default:
          return !channel.archived; // Don't show archived by default
      }
    });

    // Sort channels
    filtered.sort((a, b) => {
      // Pinned channels always first
      const aPinned = pinnedChannels.has(a.id);
      const bPinned = pinnedChannels.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      switch (sortBy) {
        case 'alphabetical':
          return a.name.localeCompare(b.name);
        case 'unread':
          return (b.unreadCount || 0) - (a.unreadCount || 0);
        case 'type':
          if (a.type !== b.type) {
            const typeOrder = ['announcement', 'team', 'project', 'dm'];
            return typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type);
          }
          return a.name.localeCompare(b.name);
        case 'recent':
        default:
          // Sort by last message time (mock with createdAt for now)
          return b.createdAt.getTime() - a.createdAt.getTime();
      }
    });

    return filtered;
  }, [channels, searchTerm, activeFilter, sortBy, mutedChannels, pinnedChannels]);

  const handleChannelAction = (action: string, channel: Channel) => {
    setActiveChannelMenu(null);
    
    switch (action) {
      case 'mute':
        setMutedChannels(prev => new Set([...prev, channel.id]));
        break;
      case 'unmute':
        setMutedChannels(prev => {
          const next = new Set(prev);
          next.delete(channel.id);
          return next;
        });
        break;
      case 'pin':
        setPinnedChannels(prev => new Set([...prev, channel.id]));
        break;
      case 'unpin':
        setPinnedChannels(prev => {
          const next = new Set(prev);
          next.delete(channel.id);
          return next;
        });
        break;
      default:
        onChannelAction?.(action, channel);
    }
  };

  const getChannelIcon = (channel: Channel) => {
    const Icon = CHANNEL_ICONS[channel.type] || HashIcon;
    const colorClass = CHANNEL_COLORS[channel.type] || "text-muted-foreground";
    
    return (
      <span className={cn(colorClass, "flex-shrink-0")}>
        {Icon}
      </span>
    );
  };

  const getUnreadIndicator = (channel: Channel) => {
    if (channel.unreadCount === 0) return null;
    
    const isMuted = mutedChannels.has(channel.id);
    
    if (isMuted) {
      return (
        <div className="w-2 h-2 bg-muted-foreground rounded-full" />
      );
    }
    
    if (channel.unreadCount > 99) {
      return (
        <Badge variant="destructive" className="text-xs px-1.5 min-w-[20px] h-5">
          99+
        </Badge>
      );
    }
    
    return (
      <Badge variant="destructive" className="text-xs px-1.5 min-w-[20px] h-5">
        {channel.unreadCount}
      </Badge>
    );
  };

  const filterOptions: { value: ChannelFilter; label: string; count?: number }[] = [
    { value: 'all', label: 'All Channels', count: channels.filter(c => !c.archived).length },
    { value: 'unread', label: 'Unread', count: channels.filter(c => c.unreadCount > 0).length },
    { value: 'mentions', label: 'Mentions', count: 0 }, // Mock
    { value: 'muted', label: 'Muted', count: mutedChannels.size },
    { value: 'archived', label: 'Archived', count: channels.filter(c => c.archived).length }
  ];

  if (isCollapsed) {
    return (
      <div className={cn("w-16 bg-muted border-r", className)}>
        <div className="p-2 space-y-2">
          {filteredAndSortedChannels.slice(0, 8).map((channel) => (
            <button
              key={channel.id}
              onClick={() => onChannelSelect(channel.id)}
              className={cn(
                "w-12 h-12 rounded-lg flex items-center justify-center transition-colors relative",
                "hover:bg-background/80",
                activeChannelId === channel.id ? "bg-background border border-border" : ""
              )}
              title={channel.name}
            >
              {getChannelIcon(channel)}
              {channel.unreadCount > 0 && !mutedChannels.has(channel.id) && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full" />
              )}
            </button>
          ))}
          
          {canCreateChannels && (
            <button
              onClick={onCreateChannel}
              className="w-12 h-12 rounded-lg flex items-center justify-center hover:bg-background/80 border-2 border-dashed border-muted-foreground/20"
              title="Create Channel"
            >
              <PlusIcon className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-64 bg-muted border-r flex flex-col", className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Channels</h3>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="h-8 w-8 p-0"
            >
              <FilterIcon className="h-4 w-4" />
            </Button>
            {canCreateChannels && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCreateChannel}
                className="h-8 w-8 p-0"
              >
                <PlusIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search channels..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-8"
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-3 space-y-2">
            <div className="grid grid-cols-2 gap-1">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setActiveFilter(option.value)}
                  className={cn(
                    "flex items-center justify-between p-2 rounded text-xs transition-colors",
                    activeFilter === option.value 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-background/80"
                  )}
                >
                  <span>{option.label}</span>
                  {option.count !== undefined && option.count > 0 && (
                    <Badge variant="secondary" className="text-xs h-4 px-1">
                      {option.count}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
            
            <div className="pt-2 border-t">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as ChannelSort)}
                className="w-full text-xs p-1 rounded border border-input bg-background"
              >
                <option value="recent">Recent Activity</option>
                <option value="alphabetical">Alphabetical</option>
                <option value="unread">Unread Count</option>
                <option value="type">Channel Type</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Channel List */}
      <div className="flex-1 overflow-y-auto">
        {filteredAndSortedChannels.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <div className="space-y-2">
              <MessageCircleIcon className="h-8 w-8 mx-auto opacity-50" />
              <p className="text-sm">
                {searchTerm ? "No channels found" : "No channels available"}
              </p>
              {canCreateChannels && !searchTerm && (
                <Button variant="outline" size="sm" onClick={onCreateChannel}>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Channel
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredAndSortedChannels.map((channel) => (
              <div key={channel.id} className="group relative">
                <button
                  onClick={() => onChannelSelect(channel.id)}
                  className={cn(
                    "w-full text-left p-2 rounded-lg transition-colors flex items-center space-x-2",
                    "hover:bg-background/80",
                    activeChannelId === channel.id && "bg-background border border-border"
                  )}
                >
                  {/* Channel Icon */}
                  {getChannelIcon(channel)}
                  
                  {/* Channel Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-1">
                      <span className={cn(
                        "font-medium truncate text-sm",
                        mutedChannels.has(channel.id) && "text-muted-foreground"
                      )}>
                        {channel.name}
                      </span>
                      
                      {pinnedChannels.has(channel.id) && (
                        <PinIcon className="h-3 w-3 text-muted-foreground" />
                      )}
                      
                      {mutedChannels.has(channel.id) && (
                        <VolumeXIcon className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                    
                    {channel.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {channel.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground">
                        {channel.memberCount} member{channel.memberCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Unread Badge */}
                  <div className="flex items-center space-x-1">
                    {getUnreadIndicator(channel)}
                  </div>
                </button>

                {/* Channel Menu */}
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveChannelMenu(activeChannelMenu === channel.id ? null : channel.id);
                    }}
                  >
                    <MoreHorizontalIcon className="h-3 w-3" />
                  </Button>

                  {activeChannelMenu === channel.id && (
                    <div className="absolute top-full right-0 mt-1 w-48 bg-background border border-border rounded-lg shadow-lg z-10">
                      <div className="py-1">
                        <button
                          onClick={() => handleChannelAction(
                            mutedChannels.has(channel.id) ? 'unmute' : 'mute', 
                            channel
                          )}
                          className="flex items-center space-x-2 px-3 py-2 text-sm hover:bg-muted w-full text-left"
                        >
                          {mutedChannels.has(channel.id) ? (
                            <>
                              <Volume2Icon className="h-4 w-4" />
                              <span>Unmute</span>
                            </>
                          ) : (
                            <>
                              <VolumeXIcon className="h-4 w-4" />
                              <span>Mute</span>
                            </>
                          )}
                        </button>
                        
                        <button
                          onClick={() => handleChannelAction(
                            pinnedChannels.has(channel.id) ? 'unpin' : 'pin',
                            channel
                          )}
                          className="flex items-center space-x-2 px-3 py-2 text-sm hover:bg-muted w-full text-left"
                        >
                          <PinIcon className="h-4 w-4" />
                          <span>{pinnedChannels.has(channel.id) ? 'Unpin' : 'Pin'}</span>
                        </button>

                        {channel.permissions.canManage && (
                          <>
                            <div className="border-t border-border my-1" />
                            <button
                              onClick={() => handleChannelAction('invite', channel)}
                              className="flex items-center space-x-2 px-3 py-2 text-sm hover:bg-muted w-full text-left"
                            >
                              <UserPlusIcon className="h-4 w-4" />
                              <span>Invite Members</span>
                            </button>
                            <button
                              onClick={() => handleChannelAction('settings', channel)}
                              className="flex items-center space-x-2 px-3 py-2 text-sm hover:bg-muted w-full text-left"
                            >
                              <SettingsIcon className="h-4 w-4" />
                              <span>Channel Settings</span>
                            </button>
                            <button
                              onClick={() => handleChannelAction('archive', channel)}
                              className="flex items-center space-x-2 px-3 py-2 text-sm hover:bg-muted w-full text-left text-yellow-600"
                            >
                              <ArchiveIcon className="h-4 w-4" />
                              <span>Archive Channel</span>
                            </button>
                            <button
                              onClick={() => handleChannelAction('delete', channel)}
                              className="flex items-center space-x-2 px-3 py-2 text-sm hover:bg-muted w-full text-left text-red-600"
                            >
                              <Trash2Icon className="h-4 w-4" />
                              <span>Delete Channel</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Click outside to close menu */}
      {activeChannelMenu && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setActiveChannelMenu(null)}
        />
      )}
    </div>
  );
} 