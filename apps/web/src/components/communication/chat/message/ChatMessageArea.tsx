import React, { useState, useRef, useEffect } from 'react';
import { Search, Pin, Paperclip, Settings, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { BlurFade } from "@/components/magicui/blur-fade";
import MessageList from "../MessageList";
import MessageInput from "../MessageInput";
import { Channel } from "@/hooks/use-channels";

interface Message {
  id: string;
  content: string;
  userId?: string;
  userName?: string;
  userEmail: string;
  channelId?: string;
  timestamp?: Date;
  messageType: 'text' | 'file' | 'system' | 'thread_reply';
  parentMessageId?: string;
  mentions?: string;
  reactions?: { emoji: string; users: string[] }[];
  attachments?: {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }[];
  isEdited?: boolean;
  editedAt?: Date;
  createdAt: Date;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  role: string;
  isActive: boolean;
}

interface ChatMessageAreaProps {
  activeChannel: Channel | null;
  messages: Message[];
  onSendMessage: (content: string, attachments?: File[], mentions?: string[]) => void;
  onMessageReaction: (messageId: string, emoji: string) => void;
  onMessageReply: (message: Message) => void;
  onMessageEdit: (message: Message) => void;
  onMessageDelete: (messageId: string) => void;
  onMessagePin: (messageId: string) => void;
  onMessageThread: (message: Message) => void;
  teamMembers: TeamMember[];
  permissions: {
    canSendMessages: boolean;
    canShareFiles: boolean;
    canStartVideoCall: boolean;
  };
  replyingTo: {
    id: string;
    userName: string;
    content: string;
  } | null;
  onCancelReply: () => void;
  onClose: () => void;
  className?: string;
}

interface HeaderActionProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

const HeaderAction: React.FC<HeaderActionProps> = ({ 
  icon, 
  label, 
  onClick, 
  variant = "ghost" 
}) => (
  <BlurFade delay={0.1} inView>
    <Button 
      variant={variant} 
      size="sm" 
      onClick={onClick}
      className="group relative overflow-hidden"
    >
      <span className="relative z-10 flex items-center">
        {icon}
        <span className="sr-only">{label}</span>
      </span>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
    </Button>
  </BlurFade>
);

const getChannelIcon = (type: Channel['type']) => {
  const iconClass = "h-4 w-4";
  switch (type) {
    case 'project': return <div className={cn(iconClass, "text-blue-500")}>📁</div>;
    case 'team': return <div className={cn(iconClass, "text-green-500")}>👥</div>;
    case 'announcement': return <div className={cn(iconClass, "text-orange-500")}>📢</div>;
    case 'private': return <div className={cn(iconClass, "text-red-500")}>🔒</div>;
    case 'dm': return <div className={cn(iconClass, "text-purple-500")}>💬</div>;
    default: return <div className={cn(iconClass, "text-gray-500")}>#</div>;
  }
};

export const ChatMessageArea: React.FC<ChatMessageAreaProps> = ({
  activeChannel,
  messages,
  onSendMessage,
  onMessageReaction,
  onMessageReply,
  onMessageEdit,
  onMessageDelete,
  onMessagePin,
  onMessageThread,
  teamMembers,
  permissions,
  replyingTo,
  onCancelReply,
  onClose,
  className
}) => {
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const filteredMessages = messages.filter(message =>
    searchQuery === '' || 
    message.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    message.userName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!activeChannel) {
    return (
      <div className={cn("flex-1 flex flex-col", className)}>
        <BlurFade delay={0.2} inView>
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-lg font-medium mb-2">Select a channel to start messaging</h3>
              <p className="text-sm">Choose a channel from the sidebar to view and send messages</p>
            </div>
          </div>
        </BlurFade>
      </div>
    );
  }

  return (
    <div className={cn("flex-1 flex flex-col", className)}>
      {/* Chat Header */}
      <BlurFade delay={0.05} inView>
        <div className="p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BlurFade delay={0.1} inView>
                {getChannelIcon(activeChannel.type)}
              </BlurFade>
              
              <BlurFade delay={0.15} inView>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-lg">{activeChannel.name}</h3>
                                         {(activeChannel as any).pinned && (
                       <Pin className="h-4 w-4 text-primary" />
                     )}
                     {(activeChannel as any).muted && (
                       <div className="h-4 w-4 text-muted-foreground">🔇</div>
                     )}
                    {activeChannel.type === 'private' && (
                      <Badge variant="secondary" className="text-xs">
                        Private
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <span>{activeChannel.memberCount} members</span>
                    {activeChannel.description && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-xs">{activeChannel.description}</span>
                      </>
                    )}
                  </div>
                </div>
              </BlurFade>
            </div>
            
            <BlurFade delay={0.2} inView>
              <div className="flex items-center space-x-1">
                {permissions.canStartVideoCall && (
                  <>
                    <HeaderAction
                      icon={<div className="h-4 w-4">📞</div>}
                      label="Start voice call"
                      onClick={() =>};

export default ChatMessageArea; 