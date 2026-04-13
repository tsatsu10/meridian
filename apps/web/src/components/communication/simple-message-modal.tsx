import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X, Send, User, Users } from 'lucide-react';
import { toast } from '@/lib/toast';
import useGetActiveWorkspaceUsers from '@/hooks/queries/workspace-users/use-active-workspace-users';
import { useTeams } from '@/hooks/use-teams';
import { logger } from "../../lib/logger";

interface SimpleRecipient {
  id: string;
  name: string;
  type: 'user' | 'team';
  email?: string;
}

interface SimpleMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

export default function SimpleMessageModal({ isOpen, onClose, workspaceId }: SimpleMessageModalProps) {
  // Basic state - no complex initialization
  const [message, setMessage] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<SimpleRecipient[]>([]);
  const [showRecipientList, setShowRecipientList] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // Data
  const { data: workspaceUsers } = useGetActiveWorkspaceUsers(workspaceId);
  const { data: teams } = useTeams(workspaceId);
  
  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // SIMPLE message change handler - no useCallback, no complexity
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    logger.info("Message changing:"); // Debug log
    setMessage(e.target.value);
  };

  // SIMPLE recipient add - direct state update
  const addRecipient = (recipient: SimpleRecipient) => {
    logger.info("Adding recipient:"); // Debug log
    
    // Check if already added
    const alreadyAdded = selectedRecipients.some(r => r.id === recipient.id && r.type === recipient.type);
    if (alreadyAdded) {
      toast.info(`${recipient.name} is already selected`);
      return;
    }
    
    // Add to list
    setSelectedRecipients(prev => [...prev, recipient]);
    setShowRecipientList(false);
    toast.success(`Added ${recipient.name}`);
  };

  // SIMPLE recipient remove
  const removeRecipient = (recipientId: string, type: string) => {
    logger.info("Removing recipient:"); // Debug log
    setSelectedRecipients(prev => prev.filter(r => !(r.id === recipientId && r.type === type)));
  };

  // SIMPLE send handler
  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }
    
    if (selectedRecipients.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }

    setIsSending(true);
    
    try {
      // Mock send process
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success(`Message sent to ${selectedRecipients.length} recipient(s)`);
      
      // Reset form
      setMessage('');
      setSelectedRecipients([]);
      onClose();
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  // Build available recipients list - simple approach
  const availableRecipients: SimpleRecipient[] = [];
  
  // Add users
  if (workspaceUsers) {
    workspaceUsers.forEach(user => {
      const isSelected = selectedRecipients.some(r => r.id === user.id && r.type === 'user');
      if (!isSelected) {
        availableRecipients.push({
          id: user.id,
          name: user.userName || user.userEmail || 'Unknown',
          type: 'user',
          email: user.userEmail || undefined,
        });
      }
    });
  }
  
  // Add teams
  if (teams) {
    teams.forEach(team => {
      const isSelected = selectedRecipients.some(r => r.id === team.id && r.type === 'team');
      if (!isSelected) {
        availableRecipients.push({
          id: team.id,
          name: team.name,
          type: 'team',
        });
      }
    });
  }

  // Handle dialog close
  const handleClose = () => {
    logger.info("Modal closing"); // Debug log
    setMessage('');
    setSelectedRecipients([]);
    setShowRecipientList(false);
    onClose();
  };

  logger.info("Rendering modal, message:"); // Debug log

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Send Message</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Recipients Section */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Recipients ({selectedRecipients.length} selected)
            </label>
            
            {/* Selected Recipients */}
            {selectedRecipients.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3 p-2 bg-gray-50 rounded">
                {selectedRecipients.map((recipient) => (
                  <Badge key={`${recipient.type}-${recipient.id}`} variant="secondary" className="flex items-center gap-1">
                    {recipient.type === 'user' ? <User className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                    <span>{recipient.name}</span>
                    <button
                      type="button"
                      onClick={() => removeRecipient(recipient.id, recipient.type)}
                      className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            
            {/* Add Recipients Button */}
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowRecipientList(!showRecipientList)}
              className="w-full"
            >
              {showRecipientList ? 'Hide Recipients' : 'Add Recipients'}
            </Button>
            
            {/* Available Recipients List */}
            {showRecipientList && (
              <div className="mt-2 max-h-48 overflow-y-auto border rounded p-2 bg-white">
                {availableRecipients.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No available recipients</p>
                ) : (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-500 mb-2">Users</div>
                    {availableRecipients.filter(r => r.type === 'user').map((recipient) => (
                      <button
                        key={`${recipient.type}-${recipient.id}`}
                        type="button"
                        onClick={() => addRecipient(recipient)}
                        className="w-full text-left p-2 hover:bg-gray-100 rounded flex items-center gap-2"
                      >
                        <User className="w-4 h-4" />
                        <div>
                          <div className="font-medium">{recipient.name}</div>
                          {recipient.email && <div className="text-xs text-gray-500">{recipient.email}</div>}
                        </div>
                      </button>
                    ))}
                    
                    {availableRecipients.filter(r => r.type === 'team').length > 0 && (
                      <>
                        <div className="text-xs font-medium text-gray-500 mb-2 mt-4">Teams</div>
                        {availableRecipients.filter(r => r.type === 'team').map((recipient) => (
                          <button
                            key={`${recipient.type}-${recipient.id}`}
                            type="button"
                            onClick={() => addRecipient(recipient)}
                            className="w-full text-left p-2 hover:bg-gray-100 rounded flex items-center gap-2"
                          >
                            <Users className="w-4 h-4" />
                            <div className="font-medium">{recipient.name}</div>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Message Input - CRITICAL SECTION */}
          <div>
            <label className="text-sm font-medium mb-2 block">Message</label>
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={handleMessageChange}
              placeholder="Type your message here..."
              className="min-h-[100px] resize-none"
              disabled={isSending}
              autoFocus
            />
            <div className="text-xs text-gray-500 mt-1">
              {message.length}/2000 characters
            </div>
          </div>

          {/* Send Button */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSending}>
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleSend} 
              disabled={!message.trim() || selectedRecipients.length === 0 || isSending}
            >
              <Send className="w-4 h-4 mr-2" />
              {isSending ? 'Sending...' : 'Send Message'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}