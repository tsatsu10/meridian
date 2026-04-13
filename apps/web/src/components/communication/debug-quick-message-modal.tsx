import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  Send,
  Users,
  User,
  Hash,
  Search,
  X,
  MessageCircle,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { logger } from "../../lib/logger";

interface Recipient {
  id: string;
  name: string;
  type: 'user' | 'team' | 'channel';
  email?: string;
}

interface DebugQuickMessageModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
}

// Mock data for testing
const mockUsers = [
  { id: '1', name: 'John Doe', type: 'user', email: 'john@example.com' },
  { id: '2', name: 'Jane Smith', type: 'user', email: 'jane@example.com' },
  { id: '3', name: 'Admin User', type: 'user', email: 'admin@example.com' },
] as Recipient[];

const mockTeams = [
  { id: '1', name: 'Development Team', type: 'team' },
  { id: '2', name: 'Design Team', type: 'team' },
] as Recipient[];

const mockChannels = [
  { id: '1', name: '#general', type: 'channel' },
  { id: '2', name: '#development', type: 'channel' },
] as Recipient[];

export default function DebugQuickMessageModal({
  open,
  onClose,
  workspaceId,
}: DebugQuickMessageModalProps) {
  const [message, setMessage] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<Recipient[]>([]);
  const [isRecipientPopoverOpen, setIsRecipientPopoverOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Simple textarea handler - no complex callbacks
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    logger.info("Message change:");
    setMessage(e.target.value);
  };

  // Simple recipient handler
  const handleAddRecipient = (recipient: Recipient) => {
    logger.info("Adding recipient:");
    setSelectedRecipients(prev => [...prev, recipient]);
    setIsRecipientPopoverOpen(false);
    toast.success(`Added ${recipient.name}`);
  };

  const handleRemoveRecipient = (recipientId: string, type: string) => {
    setSelectedRecipients(prev => 
      prev.filter(r => !(r.id === recipientId && r.type === type))
    );
  };

  const handleSendMessage = async () => {
    if (!message.trim() || selectedRecipients.length === 0) {
      toast.error('Please enter a message and select at least one recipient');
      return;
    }

    setIsSending(true);
    
    // Simulate sending
    setTimeout(() => {
      toast.success('Message sent successfully!');
      setMessage('');
      setSelectedRecipients([]);
      setIsSending(false);
      onClose();
    }, 1000);
  };

  // All available recipients
  const availableRecipients = [
    ...mockUsers.filter(u => !selectedRecipients.find(r => r.id === u.id && r.type === 'user')),
    ...mockTeams.filter(t => !selectedRecipients.find(r => r.id === t.id && r.type === 'team')),
    ...mockChannels.filter(c => !selectedRecipients.find(r => r.id === c.id && r.type === 'channel')),
  ];

  const getRecipientIcon = (type: string) => {
    switch (type) {
      case 'user': return <User className="w-4 h-4" />;
      case 'team': return <Users className="w-4 h-4" />;
      case 'channel': return <Hash className="w-4 h-4" />;
      default: return <MessageCircle className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden">
        <div className="p-6 space-y-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-600" />
              Debug Quick Message
            </DialogTitle>
            <DialogDescription>
              Simplified version for testing recipient search and message input.
            </DialogDescription>
          </DialogHeader>

          {/* Recipients Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">To:</label>
              <span className="text-xs text-muted-foreground">
                {selectedRecipients.length} recipient{selectedRecipients.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            {/* Selected Recipients */}
            {selectedRecipients.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-md">
                {selectedRecipients.map((recipient) => (
                  <Badge
                    key={`${recipient.type}-${recipient.id}`}
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                  >
                    {getRecipientIcon(recipient.type)}
                    <span className="max-w-[120px] truncate">{recipient.name}</span>
                    <button
                      onClick={() => handleRemoveRecipient(recipient.id, recipient.type)}
                      className="ml-1 p-0.5 hover:bg-gray-200 rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Add Recipients */}
            <Popover open={isRecipientPopoverOpen} onOpenChange={setIsRecipientPopoverOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-gray-500"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Add recipients...
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Search users, teams, or channels..." 
                  />
                  <CommandList>
                    <CommandEmpty>No recipients found.</CommandEmpty>
                    
                    {availableRecipients.filter(r => r.type === 'user').length > 0 && (
                      <CommandGroup heading="Users">
                        {availableRecipients
                          .filter(r => r.type === 'user')
                          .map((recipient) => (
                            <CommandItem
                              key={`${recipient.type}-${recipient.id}`}
                              onSelect={() => handleAddRecipient(recipient)}
                              className="cursor-pointer"
                            >
                              <User className="w-4 h-4 mr-2" />
                              <div className="flex-1">
                                <div className="font-medium">{recipient.name}</div>
                                {recipient.email && (
                                  <div className="text-xs text-gray-500">{recipient.email}</div>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    )}
                    
                    {availableRecipients.filter(r => r.type === 'team').length > 0 && (
                      <CommandGroup heading="Teams">
                        {availableRecipients
                          .filter(r => r.type === 'team')
                          .map((recipient) => (
                            <CommandItem
                              key={`${recipient.type}-${recipient.id}`}
                              onSelect={() => handleAddRecipient(recipient)}
                              className="cursor-pointer"
                            >
                              <Users className="w-4 h-4 mr-2" />
                              <span>{recipient.name}</span>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    )}
                    
                    {availableRecipients.filter(r => r.type === 'channel').length > 0 && (
                      <CommandGroup heading="Channels">
                        {availableRecipients
                          .filter(r => r.type === 'channel')
                          .map((recipient) => (
                            <CommandItem
                              key={`${recipient.type}-${recipient.id}`}
                              onSelect={() => handleAddRecipient(recipient)}
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

          {/* Message Input */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Message:</label>
            <Textarea
              value={message}
              onChange={handleMessageChange}
              placeholder="Type your message here..."
              className="min-h-[120px] resize-none"
              disabled={isSending}
            />
          </div>

          {/* Send Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || selectedRecipients.length === 0 || isSending}
              className="flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {isSending ? 'Sending...' : 'Send'}
            </Button>
          </div>

          {/* Debug Info */}
          <div className="text-xs bg-gray-100 p-3 rounded-md">
            <div className="font-medium mb-1">Debug Info:</div>
            <div>Message length: {message.length}</div>
            <div>Selected recipients: {selectedRecipients.length}</div>
            <div>Available recipients: {availableRecipients.length}</div>
            <div>Popover open: {isRecipientPopoverOpen ? 'Yes' : 'No'}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}