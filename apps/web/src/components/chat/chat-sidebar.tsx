// @epic-3.1-messaging: Chat Sidebar Component
// @persona-sarah: PM needs organized chat channels for team coordination
// @persona-david: Team lead needs quick access to team channels

"use client"

import { useState } from 'react'
import { Search, Hash, Users, MessageCircle, Plus, Settings, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useDirectMessaging } from '@/hooks/use-direct-messaging'
import useAuth from '@/components/providers/auth-provider/hooks/use-auth'
import useWorkspaceStore from '@/store/workspace'
import { formatDistanceToNow } from 'date-fns'
import { NewConversationModal } from './new-conversation-modal'
import { GeneralSettingsModal } from './general-settings-modal'
import { useQuery } from '@tanstack/react-query'
import { chatService } from '@/services/chatService'
import { API_BASE_URL, API_URL } from '@/constants/urls'
import { Loader2 } from 'lucide-react'
import { logger } from "@/lib/logger";

interface ChatSidebarProps {
  selectedChatId: string | null
  onSelectChat: (chatId: string) => void
}

export function ChatSidebar({ selectedChatId, onSelectChat }: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewConversationModal, setShowNewConversationModal] = useState(false)
  const [showGeneralSettings, setShowGeneralSettings] = useState(false)
  const [expandedSections, setExpandedSections] = useState({
    channels: true,
    groups: true,
    directMessages: true
  })

  const { user } = useAuth()
  const { workspace } = useWorkspaceStore()

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleCreateConversation = async (type: 'dm' | 'channel' | 'group', data: any) => {
    try {
      if (type === 'dm') {
        // ✅ Create DM conversation using our API
        const response = await fetch(`${API_BASE_URL}/message/conversations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            otherUserId: data.userId,
            workspaceId: workspace?.id,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create conversation');
        }

        const result = await response.json();
        
        // Close modal
        setShowNewConversationModal(false);
        
        // Select the new/existing conversation
        if (result.conversation) {
          onSelectChat(result.conversation.conversationId);
        }
        
        // Show success message
        if (result.created) {
          logger.debug('✅ New conversation created!');
        } else {
          logger.debug('✅ Opening existing conversation');
        }
      } else if (type === 'channel') {
        // ✅ Create channel using chat service
        try {
          logger.debug('createChannel', { workspaceId: workspace?.id });
          const channel = await chatService.createChannel(workspace?.id || '', data.name);
          
          // Close modal
          setShowNewConversationModal(false);
          
          // Select the new channel
          if (channel && channel.id) {
            onSelectChat(channel.id);
          }
          
          // Show success message
          logger.debug(`✅ Channel "${data.name}" created successfully!`);
        } catch (error) {
          logger.error('Error creating channel', { error });
          alert('Failed to create channel. Please try again.');
        }
      } else if (type === 'group') {
        // ✅ Implement group chat creation
        try {
          // Group chats need a channel to be created
          const groupName = `Group: ${data.users.map((u: any) => u.name).join(', ')}`;
          const channel = await chatService.createChannel(workspace?.id || '', groupName);
          
          // Close modal
          setShowNewConversationModal(false);
          
          // Select the new group channel
          if (channel && channel.id) {
            onSelectChat(channel.id);
          }
          
          // Show success message
          logger.debug(`✅ Group chat created successfully!`);
        } catch (error) {
          logger.error('Error creating group chat', { error });
          alert('Failed to create group chat. Please try again.');
        }
      }
    } catch (error) {
      logger.error('Error creating conversation', { error });
      alert('Failed to create conversation. Please try again.');
    }
  }

  // ✅ Load real channels from API
  const { data: channelsData, isLoading: channelsLoading, error: channelsError, refetch: refetchChannels } = useQuery({
    queryKey: ['channels', workspace?.id],
    queryFn: () => chatService.getChannels(workspace?.id!),
    enabled: Boolean(workspace?.id),
    staleTime: 30000, // 30 seconds
  })

  // ✅ Load real direct messaging data
  const { conversations, onlineUsers } = useDirectMessaging()

  // TODO: Implement groups API endpoint in backend
  // For now, using empty array until backend is ready
  const groups: any[] = []
  
  // ✅ Format channels data from API
  const channels = (channelsData || []).map((channel: any) => ({
    id: channel.id,
    name: channel.name,
    unread: 0, // TODO: Implement unread count from backend
    lastMessage: channel.description || 'No messages yet',
    isPrivate: channel.type === 'private',
    lastMessageTime: channel.updatedAt ? formatDistanceToNow(new Date(channel.updatedAt), { addSuffix: true }) : '',
  }))

  const directMessages = conversations.map(conv => {
    const otherUserEmail = conv.user1Email === user?.email ? conv.user2Email : conv.user1Email
    const otherUserStatus = onlineUsers.find(u => u.userEmail === otherUserEmail)?.status || 'offline'
    const unreadCount = conv.user1Email === user?.email ? conv.unreadCount1 : conv.unreadCount2
    
    return {
      id: conv.channelId || conv.id, // Use channelId for message fetching, fallback to conversation id
      conversationId: conv.id, // Keep conversation id for reference
      name: otherUserEmail.split('@')[0],
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${otherUserEmail}`,
      isOnline: otherUserStatus === 'online',
      unread: unreadCount,
      lastMessage: conv.lastMessageContent || 'No messages yet',
      lastMessageTime: conv.lastMessageAt ? formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true }) : ''
    }
  })

  const filteredChannels = channels.filter(channel => 
    channel.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const filteredGroups = groups.filter((group: any) => 
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const filteredDMs = directMessages.filter(dm => 
    dm.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const SectionHeader = ({ title, count, isExpanded, onToggle, icon: Icon }: {
    title: string
    count: number
    isExpanded: boolean
    onToggle: () => void
    icon: React.ComponentType<{ className?: string }>
  }) => (
    <button
      onClick={onToggle}
      className="flex items-center justify-between w-full p-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors group"
    >
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {title}
        </span>
        <Badge variant="secondary" className="text-xs px-1.5 py-0.5 h-auto">
          {count}
        </Badge>
      </div>
      <ChevronDown 
        className={cn(
          "w-4 h-4 text-slate-400 transition-transform duration-200",
          isExpanded && "rotate-180"
        )}
      />
    </button>
  )

  const ChatItem = ({ 
    id, 
    type, 
    name, 
    unread, 
    lastMessage, 
    lastMessageTime,
    icon: Icon,
    avatar,
    isOnline,
    members,
    isPrivate 
  }: {
    id: string
    type: 'channel' | 'group' | 'dm'
    name: string
    unread: number
    lastMessage: string
    lastMessageTime: string
    icon?: React.ComponentType<{ className?: string }>
    avatar?: string
    isOnline?: boolean
    members?: number
    isPrivate?: boolean
  }) => {
    const isSelected = selectedChatId === id
    
    return (
      <button
        onClick={() => onSelectChat(id)}
        className={cn(
          "w-full flex items-center gap-3 p-2 rounded-lg transition-all duration-200 text-left group",
          isSelected
            ? "bg-blue-100 dark:bg-blue-500/20 text-blue-900 dark:text-blue-100"
            : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
        )}
      >
        {/* Icon/Avatar */}
        <div className="flex-shrink-0 relative">
          {type === 'dm' ? (
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm">
                {avatar}
              </div>
              {isOnline && (
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border border-white dark:border-slate-900"></div>
              )}
            </div>
          ) : Icon ? (
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              type === 'channel' 
                ? "bg-emerald-100 dark:bg-emerald-500/20" 
                : "bg-blue-100 dark:bg-blue-500/20"
            )}>
              <Icon className={cn(
                "w-4 h-4",
                type === 'channel' 
                  ? "text-emerald-600 dark:text-emerald-400" 
                  : "text-blue-600 dark:text-blue-400"
              )} />
            </div>
          ) : null}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
              <span className={cn(
                "font-medium text-sm truncate block",
                isSelected ? "text-blue-900 dark:text-blue-100" : "text-slate-900 dark:text-white"
              )}>
                {type === 'channel' ? `#${name}` : name}
              </span>
              {isPrivate && (
                <span className="text-xs text-slate-400 flex-shrink-0">🔒</span>
              )}
              {type === 'group' && members && (
                <span className="text-xs text-slate-400 flex-shrink-0">({members})</span>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-xs text-slate-400 whitespace-nowrap">{lastMessageTime}</span>
              {unread > 0 && (
                <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5 h-auto min-w-[18px] text-center flex-shrink-0">
                  {unread > 99 ? '99+' : unread}
                </Badge>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 overflow-hidden">
            {lastMessage}
          </p>
        </div>
      </button>
    )
  }

  // Loading skeleton component
  if (channelsLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
            <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
          </div>
          <div className="h-10 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
        </div>
        <div className="flex-1 p-4 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (channelsError) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8">
        <div className="text-center">
          <MessageCircle className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Failed to load conversations
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Unable to connect to chat service
          </p>
          <Button 
            onClick={() => void refetchChannels()}
            variant="outline"
            size="sm"
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
            Messages
          </h1>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={() => setShowNewConversationModal(true)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New conversation</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700",
              "bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white",
              "placeholder-slate-500 dark:placeholder-slate-400",
              "focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500",
              "transition-all duration-200 text-sm"
            )}
          />
        </div>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-1">
          {/* Channels Section */}
          <div>
            <SectionHeader
              title="Channels"
              count={filteredChannels.length}
              isExpanded={expandedSections.channels}
              onToggle={() => toggleSection('channels')}
              icon={Hash}
            />
            
            {expandedSections.channels && (
              <div className="mt-1 space-y-0.5 ml-2">
                {filteredChannels.map((channel) => (
                  <ChatItem
                    key={channel.id}
                    id={channel.id}
                    type="channel"
                    name={channel.name}
                    unread={channel.unread}
                    lastMessage={channel.lastMessage}
                    lastMessageTime={channel.lastMessageTime}
                    icon={Hash}
                    isPrivate={channel.isPrivate}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Groups Section */}
          <div>
            <SectionHeader
              title="Groups"
              count={filteredGroups.length}
              isExpanded={expandedSections.groups}
              onToggle={() => toggleSection('groups')}
              icon={Users}
            />
            
            {expandedSections.groups && (
              <div className="mt-1 space-y-0.5 ml-2">
                {filteredGroups.map((group) => (
                  <ChatItem
                    key={group.id}
                    id={group.id}
                    type="group"
                    name={group.name}
                    unread={group.unread}
                    lastMessage={group.lastMessage}
                    lastMessageTime={group.lastMessageTime}
                    icon={Users}
                    members={group.members}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Direct Messages Section */}
          <div>
            <SectionHeader
              title="Direct Messages"
              count={filteredDMs.length}
              isExpanded={expandedSections.directMessages}
              onToggle={() => toggleSection('directMessages')}
              icon={MessageCircle}
            />
            
            {expandedSections.directMessages && (
              <div className="mt-1 space-y-0.5 ml-2">
                {filteredDMs.map((dm) => (
                  <ChatItem
                    key={dm.id}
                    id={dm.id}
                    type="dm"
                    name={dm.name}
                    unread={dm.unread}
                    lastMessage={dm.lastMessage}
                    lastMessageTime={dm.lastMessageTime}
                    avatar={dm.avatar}
                    isOnline={dm.isOnline}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-700">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          onClick={() => setShowGeneralSettings(true)}
        >
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </Button>
      </div>

      {/* New Conversation Modal */}
      <NewConversationModal
        isOpen={showNewConversationModal}
        onClose={() => setShowNewConversationModal(false)}
        onCreateConversation={handleCreateConversation}
      />

      {/* General Settings Modal */}
      <GeneralSettingsModal
        isOpen={showGeneralSettings}
        onClose={() => setShowGeneralSettings(false)}
      />
    </div>
  )
} 