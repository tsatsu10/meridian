import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Users, Plus, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  unreadCount?: number;
  lastMessage?: {
    content: string;
    timestamp: string;
  };
}

interface DirectMessagePanelProps {
  workspaceId?: string;
  selectedUserId: string | null;
  onUserSelect: (userId: string) => void;
  hasPermission: (permission: string) => boolean;
}

export const DirectMessagePanel: React.FC<DirectMessagePanelProps> = ({
  workspaceId,
  selectedUserId,
  onUserSelect,
  hasPermission
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Mock data
  const users: User[] = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      status: 'online',
      unreadCount: 3,
      lastMessage: {
        content: 'Hey, how are you doing?',
        timestamp: '2 minutes ago'
      }
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      status: 'away',
      lastMessage: {
        content: 'Thanks for the update!',
        timestamp: '1 hour ago'
      }
    }
  ];

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Direct Messages</h3>
          {hasPermission('canStartDirectMessages') && (
            <button className="h-6 w-6 rounded-md hover:bg-muted flex items-center justify-center">
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search people..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* User List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredUsers.map((user) => (
            <button
              key={user.id}
              onClick={() => onUserSelect(user.id)}
              className={cn(
                "w-full flex items-center space-x-3 p-2 rounded-md text-left transition-colors",
                "hover:bg-muted/50 focus:bg-muted/50 focus:outline-none",
                selectedUserId === user.id && "bg-primary/10 text-primary"
              )}
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="text-sm">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm truncate">
                    {user.name}
                  </span>
                  {user.unreadCount && user.unreadCount > 0 && (
                    <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                      {user.unreadCount}
                    </Badge>
                  )}
                </div>
                
                {user.lastMessage && (
                  <div className="text-xs text-muted-foreground truncate">
                    {user.lastMessage.content}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}; 