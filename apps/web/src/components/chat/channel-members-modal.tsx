// @epic-3.1-messaging: Channel Members Modal Component
// @persona-sarah: PM needs to see and manage team members in channels
// @persona-david: Team lead needs to view team presence and availability

import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Search, 
  UserPlus, 
  MoreVertical, 
  Crown, 
  Shield, 
  User as UserIcon,
  Mail,
  Phone,
  UserMinus,
  UserCog,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { API_BASE_URL } from '@/lib/api-url';
import { usePresence } from '@/hooks/use-presence';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { logger } from "@/lib/logger";
import { ClickableUserProfile } from '@/components/user/clickable-user-profile';

interface ChannelMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'member';
  status: 'online' | 'away' | 'offline';
  lastSeen?: string;
}

interface ChannelMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  channelId: string;
  channelName: string;
  isChannelOwner?: boolean;
}

export const ChannelMembersModal: React.FC<ChannelMembersModalProps> = ({
  isOpen,
  onClose,
  channelId,
  channelName,
  isChannelOwner = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<'all' | 'owner' | 'admin' | 'member'>('all');
  const queryClient = useQueryClient();
  
  // Get workspace ID for presence
  const { workspace } = useWorkspaceStore();
  const workspaceId = workspace?.id;
  
  // Fetch real-time presence data
  const { getUserStatus, getUserPresence } = usePresence(workspaceId);

  // Fetch channel members from API
  const { data: membersData, isLoading } = useQuery({
    queryKey: ['channel-members', channelId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/channel/${channelId}/members`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch channel members');
      }
      
      const data = await response.json();
      
      // Map API response to ChannelMember format with real presence
      return (data.members || []).map((member: any) => {
        // Get real-time presence for this user
        const userPresence = getUserPresence(member.userEmail);
        
        return {
          id: member.id || member.userEmail,
          name: member.userName || member.userEmail,
          email: member.userEmail,
          avatar: member.userAvatar,
          // Determine role based on channel permissions
          role: (member.canManageChannel || member.role === 'owner') ? 'owner' : 
                (member.canManagePermissions || member.role === 'admin') ? 'admin' : 'member',
          // ✅ Now using real presence data!
          status: (getUserStatus(member.userEmail) as 'online' | 'away' | 'offline') || 'offline',
          lastSeen: userPresence?.lastSeen ? new Date(userPresence.lastSeen).toISOString() : undefined,
        };
      }) as ChannelMember[];
    },
    enabled: isOpen && !!channelId,
  });

  const members = membersData || [];

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'all' || member.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-3 h-3 text-yellow-500" />;
      case 'admin':
        return <Shield className="w-3 h-3 text-blue-500" />;
      default:
        return <UserIcon className="w-3 h-3 text-slate-400" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'admin':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  // ✅ Invite member to channel
  const handleInviteMember = () => {
    // TODO: Open invite member modal (UI component)
    // API endpoint exists: POST /api/channel/:channelId/members
    logger.debug('Opening invite member dialog - UI modal not implemented yet');
  };

  // ✅ Remove member from channel
  const handleRemoveMember = async (memberEmail: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/channel/${channelId}/members/${encodeURIComponent(memberEmail)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove member');
      }
      
      // Refresh member list
      queryClient.invalidateQueries({ queryKey: ['channel-members', channelId] });
      logger.debug('Member removed successfully');
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  // ✅ Change member role
  const handleChangeRole = async (memberEmail: string, newRole: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/channel/${channelId}/members/${encodeURIComponent(memberEmail)}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: newRole }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to change role');
      }
      
      // Refresh member list
      queryClient.invalidateQueries({ queryKey: ['channel-members', channelId] });
      logger.debug('Role changed successfully');
    } catch (error) {
      console.error('Error changing role:', error);
    }
  };

  const handleMessageMember = (memberEmail: string) => {
    logger.debug('Opening DM with:', memberEmail);
    // TODO: Navigate to DM or open DM modal
  };

  const handleViewProfile = (memberId: string) => {
    logger.debug('Viewing profile:', memberId);
    // TODO: Open user profile modal or navigate to profile
  };

  const membersByStatus = {
    online: filteredMembers.filter(m => m.status === 'online'),
    away: filteredMembers.filter(m => m.status === 'away'),
    offline: filteredMembers.filter(m => m.status === 'offline')
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">#{channelName}</h2>
              <p className="text-sm text-muted-foreground font-normal mt-1">
                {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''}
              </p>
            </div>
            {isChannelOwner && (
              <Button onClick={handleInviteMember} size="sm">
                <UserPlus className="w-4 h-4 mr-2" />
                Invite
              </Button>
            )}
          </DialogTitle>
          <DialogDescription className="sr-only">
            View and manage channel members
          </DialogDescription>
        </DialogHeader>

        {/* Search and Filter */}
        <div className="px-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Role Filter */}
          <div className="flex gap-2">
            {(['all', 'owner', 'admin', 'member'] as const).map((role) => (
              <Button
                key={role}
                variant={selectedRole === role ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedRole(role)}
                className="capitalize"
              >
                {role} {role !== 'all' && `(${members.filter(m => m.role === role).length})`}
              </Button>
            ))}
          </div>
        </div>

        <Separator className="mt-4" />

        {/* Members List */}
        <ScrollArea className="flex-1 px-6 py-4 max-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading members...</span>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No members found</p>
            </div>
          ) : (
          <div className="space-y-6">
            {/* Online Members */}
            {membersByStatus.online.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  Online — {membersByStatus.online.length}
                </h3>
                <div className="space-y-2">
                  {membersByStatus.online.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="relative">
                          <ClickableUserProfile
                            userId={member.id}
                            userEmail={member.email}
                            userName={member.name}
                            userAvatar={member.avatar}
                            size="md"
                            openMode="both"
                          >
                            {getRoleIcon(member.role)}
                          </ClickableUserProfile>
                          <div className={cn(
                            "absolute top-7 left-7 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900",
                            getStatusColor(member.status)
                          )} />
                        </div>
                        <div className="flex-1 min-w-0" />
                        <Badge className={cn('text-xs', getRoleBadgeColor(member.role))}>
                          {member.role}
                        </Badge>
                      </div>

                      {/* Actions Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewProfile(member.id)}>
                            <UserIcon className="w-4 h-4 mr-2" />
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleMessageMember(member.email)}>
                            <Mail className="w-4 h-4 mr-2" />
                            Send Message
                          </DropdownMenuItem>
                          {isChannelOwner && member.role !== 'owner' && (
                            <>
                              <DropdownMenuItem onClick={() => handleChangeRole(member.email, 'admin')}>
                                <UserCog className="w-4 h-4 mr-2" />
                                {member.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleRemoveMember(member.email)}
                                className="text-red-600 dark:text-red-400"
                              >
                                <UserMinus className="w-4 h-4 mr-2" />
                                Remove from Channel
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Away Members */}
            {membersByStatus.away.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  Away — {membersByStatus.away.length}
                </h3>
                <div className="space-y-2">
                  {membersByStatus.away.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors opacity-80"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="relative">
                          <ClickableUserProfile
                            userId={member.id}
                            userEmail={member.email}
                            userName={member.name}
                            userAvatar={member.avatar}
                            size="md"
                            openMode="both"
                          >
                            {getRoleIcon(member.role)}
                          </ClickableUserProfile>
                          <div className={cn(
                            "absolute top-7 left-7 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900",
                            getStatusColor(member.status)
                          )} />
                        </div>
                        <div className="flex-1 min-w-0" />
                        <Badge className={cn('text-xs', getRoleBadgeColor(member.role))}>
                          {member.role}
                        </Badge>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewProfile(member.id)}>
                            <UserIcon className="w-4 h-4 mr-2" />
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleMessageMember(member.email)}>
                            <Mail className="w-4 h-4 mr-2" />
                            Send Message
                          </DropdownMenuItem>
                          {isChannelOwner && member.role !== 'owner' && (
                            <>
                              <DropdownMenuItem onClick={() => handleChangeRole(member.email, 'admin')}>
                                <UserCog className="w-4 h-4 mr-2" />
                                {member.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleRemoveMember(member.email)}
                                className="text-red-600 dark:text-red-400"
                              >
                                <UserMinus className="w-4 h-4 mr-2" />
                                Remove from Channel
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Offline Members */}
            {membersByStatus.offline.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-500" />
                  Offline — {membersByStatus.offline.length}
                </h3>
                <div className="space-y-2">
                  {membersByStatus.offline.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors opacity-60"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="relative">
                          <ClickableUserProfile
                            userId={member.id}
                            userEmail={member.email}
                            userName={member.name}
                            userAvatar={member.avatar}
                            size="md"
                            openMode="both"
                          >
                            {getRoleIcon(member.role)}
                          </ClickableUserProfile>
                          <div className={cn(
                            "absolute top-7 left-7 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900",
                            getStatusColor(member.status)
                          )} />
                        </div>
                        <div className="flex-1 min-w-0" />
                        <Badge className={cn('text-xs', getRoleBadgeColor(member.role))}>
                          {member.role}
                        </Badge>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewProfile(member.id)}>
                            <UserIcon className="w-4 h-4 mr-2" />
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleMessageMember(member.email)}>
                            <Mail className="w-4 h-4 mr-2" />
                            Send Message
                          </DropdownMenuItem>
                          {isChannelOwner && member.role !== 'owner' && (
                            <>
                              <DropdownMenuItem onClick={() => handleChangeRole(member.email, 'admin')}>
                                <UserCog className="w-4 h-4 mr-2" />
                                {member.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleRemoveMember(member.email)}
                                className="text-red-600 dark:text-red-400"
                              >
                                <UserMinus className="w-4 h-4 mr-2" />
                                Remove from Channel
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ChannelMembersModal;

