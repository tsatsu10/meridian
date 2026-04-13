// @epic-3.1-messaging: New Conversation Modal Component
// @persona-sarah: PM needs to quickly start conversations with team members
// @persona-david: Team lead needs to initiate team discussions

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  User, 
  Users, 
  Hash, 
  Lock,
  Check,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL, API_URL } from '@/constants/urls';
import useWorkspaceStore from '@/store/workspace';
import useAuth from '@/components/providers/auth-provider/hooks/use-auth';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: 'online' | 'away' | 'offline';
  department?: string;
}

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateConversation: (type: 'dm' | 'channel' | 'group', data: any) => void;
}

export const NewConversationModal: React.FC<NewConversationModalProps> = ({
  isOpen,
  onClose,
  onCreateConversation
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [channelName, setChannelName] = useState('');
  const [channelDescription, setChannelDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [activeTab, setActiveTab] = useState<'dm' | 'channel' | 'group'>('dm');
  
  const { workspace } = useWorkspaceStore();
  const { user: currentUser } = useAuth();

  // ✅ Load real workspace users from API
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['workspace-users', workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return []
      const response = await fetch(`${API_BASE_URL}/workspace-user/${workspace.id}/users`, {
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error('Failed to load users')
      }
      const data = await response.json()
      // ✅ API returns data directly, not wrapped
      return Array.isArray(data) ? data : []
    },
    enabled: Boolean(workspace?.id && isOpen),
    staleTime: 60000, // 1 minute
  })

  // Format users for the modal
  const mockUsers: User[] = (usersData || [])
    .filter((u: any) => u.email !== currentUser?.email) // Don't show current user
    .map((u: any) => ({
      id: u.id,
      name: u.name || u.email,
      email: u.email,
      avatar: u.avatar || `https://avatar.vercel.sh/${u.email}`,
      status: 'offline' as const, // TODO: Get real online status from presence system
      department: u.role || 'Member', // Show role as department for now
    }));

  const filteredUsers = mockUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreate = () => {
    if (activeTab === 'dm') {
      if (selectedUsers.length === 1) {
        const user = mockUsers.find(u => u.id === selectedUsers[0]);
        onCreateConversation('dm', { userId: selectedUsers[0], user });
        resetAndClose();
      }
    } else if (activeTab === 'channel') {
      if (channelName.trim()) {
        onCreateConversation('channel', {
          name: channelName.trim(),
          description: channelDescription.trim(),
          isPrivate
        });
        resetAndClose();
      }
    } else if (activeTab === 'group') {
      if (selectedUsers.length >= 2) {
        onCreateConversation('group', {
          members: selectedUsers,
          users: mockUsers.filter(u => selectedUsers.includes(u.id))
        });
        resetAndClose();
      }
    }
  };

  const resetAndClose = () => {
    setSearchQuery('');
    setSelectedUsers([]);
    setChannelName('');
    setChannelDescription('');
    setIsPrivate(false);
    onClose();
  };

  const canCreate = () => {
    if (activeTab === 'dm') return selectedUsers.length === 1;
    if (activeTab === 'channel') return channelName.trim().length > 0;
    if (activeTab === 'group') return selectedUsers.length >= 2;
    return false;
  };

  return (
    <Dialog open={isOpen} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>Start a Conversation</DialogTitle>
          <DialogDescription>
            Send a direct message, create a channel, or start a group chat
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1">
          <div className="px-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="dm" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Direct Message</span>
                <span className="sm:hidden">DM</span>
              </TabsTrigger>
              <TabsTrigger value="channel" className="flex items-center gap-2">
                <Hash className="w-4 h-4" />
                <span className="hidden sm:inline">Channel</span>
                <span className="sm:hidden">Channel</span>
              </TabsTrigger>
              <TabsTrigger value="group" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Group Chat</span>
                <span className="sm:hidden">Group</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Direct Message Tab */}
          <TabsContent value="dm" className="mt-4 px-6 space-y-4">
            <div>
              <Label>Select a person</Label>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {usersLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex gap-3 p-3 animate-pulse">
                      <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                        <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                      </div>
                    </div>
                  ))
                ) : filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUsers([user.id])}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
                      selectedUsers.includes(user.id)
                        ? "bg-blue-50 dark:bg-blue-500/20 border-2 border-blue-500"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800 border-2 border-transparent"
                    )}
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900",
                        getStatusColor(user.status)
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    {user.department && (
                      <Badge variant="secondary" className="text-xs">
                        {user.department}
                      </Badge>
                    )}
                    {selectedUsers.includes(user.id) && (
                      <Check className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    )}
                  </button>
                ))}
                {!usersLoading && filteredUsers.length === 0 && (
                  <div className="text-center py-8">
                    <User className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">No users found</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Channel Tab */}
          <TabsContent value="channel" className="mt-4 px-6 space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="channel-name">Channel Name *</Label>
                <div className="relative mt-2">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="channel-name"
                    placeholder="e.g. marketing, engineering"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                    className="pl-9"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Channel names must be lowercase without spaces
                </p>
              </div>

              <div>
                <Label htmlFor="channel-description">Description (optional)</Label>
                <Input
                  id="channel-description"
                  placeholder="What's this channel about?"
                  value={channelDescription}
                  onChange={(e) => setChannelDescription(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center gap-3">
                  {isPrivate ? (
                    <Lock className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  ) : (
                    <Hash className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  )}
                  <div>
                    <p className="font-medium text-sm">
                      {isPrivate ? 'Private Channel' : 'Public Channel'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isPrivate
                        ? 'Only invited members can see this channel'
                        : 'Anyone in the workspace can join'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPrivate(!isPrivate)}
                >
                  {isPrivate ? 'Make Public' : 'Make Private'}
                </Button>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  💡 <strong>Tip:</strong> Channels are best for teams, topics, or projects that multiple people will participate in.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Group Chat Tab */}
          <TabsContent value="group" className="mt-4 px-6 space-y-4">
            <div>
              <Label>Select members (at least 2)</Label>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                {selectedUsers.map(userId => {
                  const user = mockUsers.find(u => u.id === userId);
                  return user ? (
                    <Badge key={userId} variant="secondary" className="pl-1 pr-2">
                      <Avatar className="h-5 w-5 mr-1">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback className="text-xs">{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      {user.name}
                    </Badge>
                  ) : null;
                })}
              </div>
            )}

            <ScrollArea className="h-[240px] pr-4">
              <div className="space-y-2">
                {usersLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex gap-3 p-3 animate-pulse">
                      <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                        <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                      </div>
                    </div>
                  ))
                ) : filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => toggleUserSelection(user.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
                      selectedUsers.includes(user.id)
                        ? "bg-blue-50 dark:bg-blue-500/20 border-2 border-blue-500"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800 border-2 border-transparent"
                    )}
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900",
                        getStatusColor(user.status)
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    {user.department && (
                      <Badge variant="secondary" className="text-xs">
                        {user.department}
                      </Badge>
                    )}
                    {selectedUsers.includes(user.id) && (
                      <Check className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    )}
                  </button>
                ))}
                {!usersLoading && filteredUsers.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">No users found</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter className="p-6 pt-4">
          <Button variant="outline" onClick={resetAndClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!canCreate()}>
            {activeTab === 'dm' && 'Start Conversation'}
            {activeTab === 'channel' && 'Create Channel'}
            {activeTab === 'group' && `Create Group (${selectedUsers.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewConversationModal;
