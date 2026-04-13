// @epic-3.5-communication: Main communication interface with modular architecture
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageSquare, 
  Phone, 
  Video, 
  Plus, 
  Settings, 
  Search, 
  Filter,
  Pin,
  MoreHorizontal,
  Hash,
  Users,
  Send,
  Smile,
  Paperclip 
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useChannels, useCreateChannel } from "@/hooks/use-channels";
import { useMessages, useSendMessage } from "@/hooks/use-messages";
import { useUnifiedWebSocket } from '@/hooks/useUnifiedWebSocket';
import useAuth from '@/components/providers/auth-provider/hooks/use-auth';
import useWorkspaceStore from '@/store/workspace';
import { toast } from "sonner";

// Component imports
import { ChannelSidebar } from "./components/ChannelSidebar";
import { MessageArea } from "./components/MessageArea";
import { MessageInput } from "./components/MessageInput";
import { ChannelHeader } from "./components/ChannelHeader";
import { UserList } from "./components/UserList";
import { CreateChannelModal } from "./modals/CreateChannelModal";

// Type definitions
export interface CommunicationPermissions {
  canSendMessages: boolean;
  canCreateChannels: boolean;
  canManageChannels: boolean;
  canViewCommunication: boolean;
  canMentionUsers: boolean;
  canShareFiles: boolean;
  canPinMessages: boolean;
  canModerateChat: boolean;
}

interface MainCommunicationInterfaceProps {
  workspaceId?: string;
  userPermissions: CommunicationPermissions;
  className?: string;
}

interface CommunicationState {
  activeChannelId: string | null;
  selectedThreadId: string | null;
  showUserList: boolean;
  showCreateChannel: boolean;
  isMobile: boolean;
  sidebarCollapsed: boolean;
}

// @epic-3.5-communication: Main communication interface with real-time integration
export function MainCommunicationInterface({ 
  workspaceId, 
  userPermissions, 
  className 
}: MainCommunicationInterfaceProps) {
  // State management
  const [state, setState] = useState<CommunicationState>({
    activeChannelId: null,
    selectedThreadId: null,
    showUserList: true,
    showCreateChannel: false,
    isMobile: false,
    sidebarCollapsed: false,
  });

  // API hooks
  const { data: channels = [], isLoading: channelsLoading } = useChannels(workspaceId || '');
  const { data: messages = [], refetch: refetchMessages } = useMessages(state.activeChannelId || '');
  const { mutate: sendMessage } = useSendMessage();
  const { mutate: createChannel } = useCreateChannel();

  const { user } = useAuth();
  const { workspace } = useWorkspaceStore();
  const { connectionState } = useUnifiedWebSocket({ 
    enabled: Boolean(user?.email),
    userEmail: user?.email || 'elidegbotse@gmail.com',
    workspaceId: workspace?.id || 'demo-workspace-123'
  });
  const isConnected = connectionState.isConnected;

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setState(prev => ({ ...prev, isMobile: window.innerWidth < 768 }));
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-select first channel
  useEffect(() => {
    if (channels.length > 0 && !state.activeChannelId) {
      setState(prev => ({ ...prev, activeChannelId: channels[0].id }));
    }
  }, [channels, state.activeChannelId]);

  // Handle real-time message updates
  useEffect(() => {
    if (state.activeChannelId) {
      refetchMessages();
    }
  }, [state.activeChannelId, refetchMessages]);

  // Handlers
  const handleChannelSelect = useCallback((channelId: string) => {
    setState(prev => ({ ...prev, activeChannelId: channelId, selectedThreadId: null }));
  }, []);

  const handleSendMessage = useCallback(async (content: string, attachments?: File[]) => {
    if (!state.activeChannelId || !content.trim()) return;

    try {
      await sendMessage({
        channelId: state.activeChannelId,
        content: content.trim(),
        attachments: attachments?.map(f => ({ name: f.name, size: f.size, type: f.type })) || []
      });

      // Real-time notification will be handled by the WebSocket provider
    } catch (error) {
      toast.error('Failed to send message');
    }
  }, [state.activeChannelId, sendMessage]);

  const handleCreateChannel = useCallback(async (channelData: any) => {
    if (!workspaceId) return;

    try {
      await createChannel({
        ...channelData,
        workspaceId
      });
      setState(prev => ({ ...prev, showCreateChannel: false }));
      toast.success('Channel created successfully');
    } catch (error) {
      toast.error('Failed to create channel');
    }
  }, [workspaceId, createChannel]);

  const updateState = useCallback((updates: Partial<CommunicationState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Get active channel
  const activeChannel = channels.find(c => c.id === state.activeChannelId);

  // Permission checks
  if (!userPermissions.canViewCommunication) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
          <p className="text-muted-foreground">
            You don't have permission to view team communication.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("h-full flex flex-col bg-background", className)}>
      {/* Real-time connection indicator */}
      {workspaceId && (
        <div className={cn(
          "px-4 py-1 text-xs flex items-center justify-between border-b",
          isConnected ? "bg-green-50 text-green-700 dark:bg-green-900/20" : "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20"
        )}>
          <div className="flex items-center space-x-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-green-500" : "bg-yellow-500"
            )} />
            <span>{isConnected ? "Connected" : "Connecting..."}</span>
          </div>
          {state.isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => updateState({ sidebarCollapsed: !state.sidebarCollapsed })}
              className="h-6 px-2"
            >
              <ChevronLeft className={cn("h-3 w-3 transition-transform", state.sidebarCollapsed && "rotate-180")} />
            </Button>
          )}
        </div>
      )}

      <div className="flex-1 min-h-0">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Channel Sidebar */}
          {(!state.isMobile || !state.sidebarCollapsed) && (
            <>
              <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
                <ChannelSidebar
                  channels={channels}
                  activeChannelId={state.activeChannelId}
                  onChannelSelect={handleChannelSelect}
                  onCreateChannel={() => updateState({ showCreateChannel: true })}
                  userPermissions={userPermissions}
                  isLoading={channelsLoading}
                  collapsed={state.sidebarCollapsed}
                />
              </ResizablePanel>
              <ResizableHandle />
            </>
          )}

          {/* Main Chat Area */}
          <ResizablePanel defaultSize={state.showUserList ? 60 : 80}>
            <div className="h-full flex flex-col">
              {/* Channel Header */}
              <ChannelHeader
                channel={activeChannel}
                onToggleUserList={() => updateState({ showUserList: !state.showUserList })}
                showUserList={state.showUserList}
                userPermissions={userPermissions}
                isMobile={state.isMobile}
                onToggleSidebar={() => updateState({ sidebarCollapsed: !state.sidebarCollapsed })}
              />

              {/* Messages Area */}
              <div className="flex-1 min-h-0">
                <MessageArea
                  messages={messages}
                  channelId={state.activeChannelId}
                  threadId={state.selectedThreadId}
                  userPermissions={userPermissions}
                  onSelectThread={(threadId) => updateState({ selectedThreadId: threadId })}
                />
              </div>

              {/* Message Input */}
              {userPermissions.canSendMessages && state.activeChannelId && (
                <MessageInput
                  onSendMessage={handleSendMessage}
                  placeholder={`Message #${activeChannel?.name || 'channel'}`}
                  userPermissions={userPermissions}
                  disabled={!isConnected}
                />
              )}
            </div>
          </ResizablePanel>

          {/* User List */}
          {state.showUserList && !state.isMobile && (
            <>
              <ResizableHandle />
              <ResizablePanel defaultSize={20} minSize={15} maxSize={25}>
                <UserList
                  channelId={state.activeChannelId}
                  workspaceId={workspaceId}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {/* Modals */}
      <CreateChannelModal
        open={state.showCreateChannel}
        onClose={() => updateState({ showCreateChannel: false })}
        onCreateChannel={handleCreateChannel}
        workspaceId={workspaceId}
      />
    </div>
  );
} 