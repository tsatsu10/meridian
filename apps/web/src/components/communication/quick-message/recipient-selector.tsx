import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Users,
  User,
  Hash,
  Search,
  X,
  Clock,
} from 'lucide-react';

interface Recipient {
  id: string;
  name: string;
  type: 'user' | 'team' | 'channel';
  email?: string;
  isOnline?: boolean;
  avatar?: string;
}

interface ConversationHistory {
  id: string;
  participants: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  }[];
  lastMessage?: {
    content: string;
    timestamp: string;
    senderName: string;
  };
  unreadCount: number;
}

interface RecipientSelectorProps {
  selectedRecipients: Recipient[];
  availableRecipients: Recipient[];
  recentConversations: ConversationHistory[];
  showRecentConversations: boolean;
  isLoadingChannels: boolean;
  isRecipientPopoverOpen: boolean;
  onRecipientPopoverOpenChange: (open: boolean) => void;
  onAddRecipient: (recipient: Recipient) => void;
  onRemoveRecipient: (recipientId: string, type: string) => void;
  onToggleRecentConversations: () => void;
  onSelectFromRecentConversations: (conversation: ConversationHistory) => void;
}

const getRecipientIcon = (type: string) => {
  switch (type) {
    case 'user': return <User className="w-4 h-4" />;
    case 'team': return <Users className="w-4 h-4" />;
    case 'channel': return <Hash className="w-4 h-4" />;
    default: return <User className="w-4 h-4" />;
  }
};

export default function RecipientSelector({
  selectedRecipients,
  availableRecipients,
  recentConversations,
  showRecentConversations,
  isLoadingChannels,
  isRecipientPopoverOpen,
  onRecipientPopoverOpenChange,
  onAddRecipient,
  onRemoveRecipient,
  onToggleRecentConversations,
  onSelectFromRecentConversations,
}: RecipientSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">To:</label>
        <span className="text-xs text-muted-foreground">
          {selectedRecipients.length} recipient{selectedRecipients.length !== 1 ? 's' : ''}
        </span>
      </div>
      
      {/* Selected Recipients */}
      {selectedRecipients.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-muted/50 rounded-md">
          {selectedRecipients.map((recipient) => (
            <Badge
              key={`${recipient.type}-${recipient.id}`}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              {getRecipientIcon(recipient.type)}
              <span className="max-w-[120px] truncate">{recipient.name}</span>
              {recipient.isOnline && (
                <div className="w-2 h-2 bg-green-500 rounded-full" />
              )}
              <button
                onClick={() => onRemoveRecipient(recipient.id, recipient.type)}
                className="ml-1 p-0.5 hover:bg-muted rounded-full"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Recent Conversations Quick Select */}
      {recentConversations.length > 0 && (
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleRecentConversations}
            className="text-xs text-muted-foreground"
          >
            <Clock className="w-3 h-3 mr-1" />
            Recent conversations
          </Button>
          
          {showRecentConversations && (
            <div className="grid grid-cols-1 gap-1">
              {recentConversations.slice(0, 3).map((conversation) => (
                <Button
                  key={conversation.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => onSelectFromRecentConversations(conversation)}
                  className="justify-start text-left h-auto p-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">
                      {conversation.participants.map(p => p.name).join(', ')}
                    </div>
                    {conversation.lastMessage && (
                      <div className="text-xs text-muted-foreground truncate">
                        {conversation.lastMessage.content}
                      </div>
                    )}
                  </div>
                  {conversation.unreadCount > 0 && (
                    <Badge variant="secondary" className="text-xs ml-2">
                      {conversation.unreadCount}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Recipients Popover */}
      <Popover open={isRecipientPopoverOpen} onOpenChange={onRecipientPopoverOpenChange}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-start text-muted-foreground"
            disabled={isLoadingChannels}
          >
            <Search className="w-4 h-4 mr-2" />
            {isLoadingChannels ? 'Loading...' : 'Add recipients...'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700" align="start">
          <Command>
            <CommandInput 
              placeholder="Search users, teams, or channels..." 
            />
            <CommandList>
              <CommandEmpty>No recipients found.</CommandEmpty>
              
              {/* Users */}
              {availableRecipients.filter(r => r.type === 'user').length > 0 && (
                <CommandGroup heading="Users">
                  {availableRecipients
                    .filter(r => r.type === 'user')
                    .slice(0, 5)
                    .map((recipient) => (
                      <CommandItem
                        key={`${recipient.type}-${recipient.id}`}
                        onSelect={() => onAddRecipient(recipient)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="text-xs">
                              {recipient.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="font-medium">{recipient.name}</div>
                            {recipient.email && (
                              <div className="text-xs text-muted-foreground">{recipient.email}</div>
                            )}
                          </div>
                          {recipient.isOnline && (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full" />
                              <span className="text-xs text-green-600">Online</span>
                            </div>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                </CommandGroup>
              )}
              
              {/* Teams */}
              {availableRecipients.filter(r => r.type === 'team').length > 0 && (
                <CommandGroup heading="Teams">
                  {availableRecipients
                    .filter(r => r.type === 'team')
                    .map((recipient) => (
                      <CommandItem
                        key={`${recipient.type}-${recipient.id}`}
                        onSelect={() => onAddRecipient(recipient)}
                        className="cursor-pointer"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        <span>{recipient.name}</span>
                      </CommandItem>
                    ))}
                </CommandGroup>
              )}
              
              {/* Channels */}
              {availableRecipients.filter(r => r.type === 'channel').length > 0 && (
                <CommandGroup heading="Channels">
                  {availableRecipients
                    .filter(r => r.type === 'channel')
                    .map((recipient) => (
                      <CommandItem
                        key={`${recipient.type}-${recipient.id}`}
                        onSelect={() => onAddRecipient(recipient)}
                        className="cursor-pointer"
                      >
                        <Hash className="w-4 h-4 mr-2" />
                        <span>{recipient.name}</span>
                      </CommandItem>
                    ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}