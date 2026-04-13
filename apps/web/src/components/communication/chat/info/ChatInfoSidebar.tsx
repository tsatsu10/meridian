import React, { useState } from 'react';
import { 
  Pin, 
  Paperclip, 
  Settings, 
  Users, 
  Calendar,
  Archive,
  Volume2,
  VolumeX,
  UserPlus,
  MoreVertical,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { BlurFade } from "@/components/magicui/blur-fade";
import { Channel } from "@/hooks/use-channels";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  role: string;
  isActive: boolean;
}

interface ChatTeam {
  id: string;
  name: string;
  members: TeamMember[];
  lead: string;
}

interface ChatInfoSidebarProps {
  activeChannel: Channel | null;
  team?: ChatTeam;
  onChannelAction: (channelId: string, action: string) => void;
  className?: string;
}

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

const getStatusColor = (status: TeamMember['status']) => {
  switch (status) {
    case 'online': return 'bg-green-500';
    case 'away': return 'bg-yellow-500';
    case 'busy': return 'bg-red-500';
    default: return 'bg-gray-400';
  }
};

const MemberAvatar: React.FC<{ member: TeamMember }> = ({ member }) => (
  <div className="relative">
    <Avatar className="w-8 h-8">
      <AvatarFallback className="text-xs font-medium">
        {member.name.split(' ').map(n => n[0]).join('')}
      </AvatarFallback>
    </Avatar>
    <div 
      className={cn(
        "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
        getStatusColor(member.status)
      )} 
    />
  </div>
);

export const ChatInfoSidebar: React.FC<ChatInfoSidebarProps> = ({
  activeChannel,
  team,
  onChannelAction,
  className
}) => {
  const [membersExpanded, setMembersExpanded] = useState(true);
  const [quickActionsExpanded, setQuickActionsExpanded] = useState(true);

  if (!activeChannel) {
    return (
      <div className={cn("w-80 bg-muted border-l p-4", className)}>
        <BlurFade delay={0.2} inView>
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Select a channel to view details</p>
            </div>
          </div>
        </BlurFade>
      </div>
    );
  }

  const onlineMembers = team?.members.filter(m => m.status === 'online') || [];
  const awayMembers = team?.members.filter(m => m.status === 'away') || [];
  const otherMembers = team?.members.filter(m => !['online', 'away'].includes(m.status)) || [];

  return (
    <div className={cn("w-80 bg-muted border-l", className)}>
      <ScrollArea className="h-full">
        <div className="p-4 space-y-6">
          
          {/* Channel Header */}
          <BlurFade delay={0.1} inView>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                {getChannelIcon(activeChannel.type)}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate">{activeChannel.name}</h3>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <span className="capitalize">{activeChannel.type}</span>
                    {(activeChannel as any).isPrivate && (
                      <Badge variant="secondary" className="text-xs">Private</Badge>
                    )}
                  </div>
                </div>
              </div>
              
              {activeChannel.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {activeChannel.description}
                </p>
              )}
            </div>
          </BlurFade>

          <Separator />

          {/* Channel Stats */}
          <BlurFade delay={0.15} inView>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 rounded-lg bg-background">
                <div className="text-2xl font-bold text-primary">{activeChannel.memberCount || 0}</div>
                <div className="text-xs text-muted-foreground">Members</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-background">
                <div className="text-2xl font-bold text-primary">{(activeChannel as any).messageCount || 0}</div>
                <div className="text-xs text-muted-foreground">Messages</div>
              </div>
            </div>
          </BlurFade>

          {/* Channel Details */}
          <BlurFade delay={0.2} inView>
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Channel Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{activeChannel.createdAt.toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="capitalize">{activeChannel.type}</span>
                </div>
                {(activeChannel as any).lastActivity && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Last Activity</span>
                    <span>{new Date((activeChannel as any).lastActivity).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          </BlurFade>

          <Separator />

          {/* Quick Actions */}
          <BlurFade delay={0.25} inView>
            <Collapsible open={quickActionsExpanded} onOpenChange={setQuickActionsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                  <h4 className="font-medium text-sm">Quick Actions</h4>
                  {quickActionsExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start group"
                  onClick={() =>};

export default ChatInfoSidebar; 