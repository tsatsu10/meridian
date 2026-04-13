import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { MessageSquare, Users, Hash, Search, Plus, Settings, Phone, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWebSocket } from '@/hooks/use-websocket';
import { useRBACAuth } from '@/lib/permissions/provider';
import { useMessages } from '@/hooks/queries/message/use-messages';
import { useChannels } from '@/hooks/queries/channel/use-channels';
import { useUser } from '@/hooks/use-user';
import { cn } from '@/lib/utils';
import { ChannelSidebar } from './components/ChannelSidebar';
import { MessageArea } from './components/MessageArea';
import { MessageInput } from './components/MessageInput';
import { ChannelHeader } from './components/ChannelHeader';
import { UserList } from './components/UserList';
import { CreateChannelModal } from './components/CreateChannelModal';
import { DirectMessagePanel } from './components/DirectMessagePanel';
import { logger } from "../../lib/logger";

interface UnifiedCommunicationHubProps {
  workspaceId?: string;
  teamId?: string;
  className?: string;
}

interface CommunicationState {
  selectedChannelId: string | null;
  selectedUserId: string | null;
  isDirectMessage: boolean;
  sidebarCollapsed: boolean;
  showUserList: boolean;
  showCreateChannel: boolean;
}

export const UnifiedCommunicationHub: React.FC<UnifiedCommunicationHubProps> = ({
  workspaceId,
  teamId,
  className
}) => {
  const navigate = useNavigate();
  const search = useSearch();
  const { user } = useUser();
  const { hasPermission } = useRBACAuth();
  
  // State management
  const [state, setState] = useState<CommunicationState>({
    selectedChannelId: search.channelId || null,
    selectedUserId: search.userId || null,
    isDirectMessage: false,
    sidebarCollapsed: false,
    showUserList: true,
    showCreateChannel: false
  });

  // WebSocket connection
  const { isConnected, sendMessage } = useWebSocket({
    workspaceId,
    teamId,
    onMessage: handleWebSocketMessage
  });

  // Data hooks
  const { data: channels, isLoading: channelsLoading } = useChannels(workspaceId);
  const { data: messages, isLoading: messagesLoading, sendMessage: sendChatMessage } = useMessages({
    channelId: state.selectedChannelId,
    userId: state.selectedUserId,
    isDirectMessage: state.isDirectMessage
  });

  // Update URL when selection changes
  useEffect(() => {
    if (state.selectedChannelId) {
      navigate({
        to: '/dashboard/communication',
        search: { channelId: state.selectedChannelId }
      });
    } else if (state.selectedUserId) {
      navigate({
        to: '/dashboard/communication',
        search: { userId: state.selectedUserId }
      });
    }
  }, [state.selectedChannelId, state.selectedUserId, navigate]);

  // Handle WebSocket messages
  function handleWebSocketMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'message:new':
          // Handle new message
          break;
        case 'message:typing':
          // Handle typing indicator
          break;
        case 'presence:update':
          // Handle presence update
          break;
        case 'channel:created':
          // Handle new channel
          break;
        default:
          logger.info("Unknown WebSocket message type:");
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  // Event handlers
  const handleChannelSelect = useCallback((channelId: string) => {
    setState(prev => ({
      ...prev,
      selectedChannelId: channelId,
      selectedUserId: null,
      isDirectMessage: false
    }));
  }, []);

  const handleUserSelect = useCallback((userId: string) => {
    setState(prev => ({
      ...prev,
      selectedUserId: userId,
      selectedChannelId: null,
      isDirectMessage: true
    }));
  }, []);

  const handleSendMessage = useCallback(async (content: string, attachments?: File[]) => {
    if (!content.trim() && (!attachments || attachments.length === 0)) return;

    try {
      if (state.isDirectMessage && state.selectedUserId) {
        await sendChatMessage({
          content,
          attachments,
          recipientId: state.selectedUserId,
          type: 'direct'
        });
      } else if (state.selectedChannelId) {
        await sendChatMessage({
          content,
          attachments,
          channelId: state.selectedChannelId,
          type: 'channel'
        });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [state.selectedChannelId, state.selectedUserId, state.isDirectMessage, sendChatMessage]);

  const toggleSidebar = useCallback(() => {
    setState(prev => ({ ...prev, sidebarCollapsed: !prev.sidebarCollapsed }));
  }, []);

  const toggleUserList = useCallback(() => {
    setState(prev => ({ ...prev, showUserList: !prev.showUserList }));
  }, []);

  // Get current conversation info
  const getCurrentConversation = () => {
    if (state.isDirectMessage && state.selectedUserId) {
      // Find user info
      return { type: 'direct', name: 'Direct Message', id: state.selectedUserId };
    } else if (state.selectedChannelId) {
      // Find channel info
      const channel = channels?.find(c => c.id === state.selectedChannelId);
      return { type: 'channel', name: channel?.name || 'Unknown Channel', id: state.selectedChannelId };
    }
    return null;
  };

  const currentConversation = getCurrentConversation();

  return (
    <div className={cn(
      "flex h-full bg-background border rounded-lg overflow-hidden",
      className
    )}>
      {/* Sidebar */}
      <div className={cn(
        "flex flex-col border-r bg-muted/30 transition-all duration-300",
        state.sidebarCollapsed ? "w-16" : "w-80"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          {!state.sidebarCollapsed && (
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Communication</h2>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="h-8 w-8 p-0"
          >
            <Hash className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation Tabs */}
        {!state.sidebarCollapsed && (
          <Tabs defaultValue="channels" className="flex-1">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="channels" className="flex items-center space-x-2">
                <Hash className="h-4 w-4" />
                <span>Channels</span>
              </TabsTrigger>
              <TabsTrigger value="direct" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Direct</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="channels" className="flex-1 mt-0">
              <ChannelSidebar
                channels={channels || []}
                selectedChannelId={state.selectedChannelId}
                onChannelSelect={handleChannelSelect}
                onCreateChannel={() => setState(prev => ({ ...prev, showCreateChannel: true }))}
                hasPermission={hasPermission}
              />
            </TabsContent>

            <TabsContent value="direct" className="flex-1 mt-0">
              <DirectMessagePanel
                workspaceId={workspaceId}
                selectedUserId={state.selectedUserId}
                onUserSelect={handleUserSelect}
                hasPermission={hasPermission}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        {currentConversation && (
          <ChannelHeader
            conversation={currentConversation}
            isConnected={isConnected}
            onToggleUserList={toggleUserList}
            showUserList={state.showUserList}
            hasPermission={hasPermission}
          />
        )}

        {/* Messages Area */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex flex-col">
            <MessageArea
              messages={messages || []}
              isLoading={messagesLoading}
              currentUserId={user?.id}
              isConnected={isConnected}
            />
            
            <MessageInput
              onSendMessage={handleSendMessage}
              disabled={!currentConversation || !isConnected}
              hasPermission={hasPermission}
            />
          </div>

          {/* User List */}
          {state.showUserList && (
            <div className="w-64 border-l bg-muted/30">
              <UserList
                workspaceId={workspaceId}
                teamId={teamId}
                isConnected={isConnected}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateChannelModal
        open={state.showCreateChannel}
        onOpenChange={(open) => setState(prev => ({ ...prev, showCreateChannel: open }))}
        workspaceId={workspaceId}
        teamId={teamId}
      />
    </div>
  );
}; 