import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Paperclip,
  Smile,
  AtSign,
  CheckCircle2,
  Clock,
  MessageCircle,
  BookTemplate,
  Mic,
  ThumbsUp,
  Languages,
  Brain,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { toast } from '@/lib/toast';
import { ShineBorder } from '@/components/magicui/shine-border';
import { MagicCard } from '@/components/magicui/magic-card';
import useWorkspaceStore from '@/store/workspace';
import useProjectStore from '@/store/project';
import useGetActiveWorkspaceUsers from '@/hooks/queries/workspace-users/use-active-workspace-users';
import { useTeams } from '@/hooks/use-teams';
import { 
  sendQuickMessage, 
  getWorkspaceChannels, 
  getRecentConversations,
  saveDraft,
  loadDraft,
  clearDraft,
  type Channel,
  type ConversationHistory
} from '@/services/quick-message-api';

interface WorkspaceUser {
  id: string;
  userEmail: string | null;
  userName: string;
  role: string;
  status: string;
  workspaceId: string;
  isOnline?: boolean;
}

interface Team {
  id: string;
  name: string;
  description: string | null;
  workspaceId: string;
  memberCount?: number;
}

interface Recipient {
  id: string;
  name: string;
  type: 'user' | 'team' | 'channel';
  email?: string;
  isOnline?: boolean;
  avatar?: string;
}

interface NewQuickMessageModalProps {
  open: boolean;
  onClose: () => void;
  defaultRecipients?: Recipient[];
  workspaceId: string;
  contextType?: 'project' | 'task' | 'general';
  contextId?: string;
}

export default function NewQuickMessageModal({
  open,
  onClose,
  defaultRecipients = [],
  workspaceId,
  contextType = 'general',
  contextId,
}: NewQuickMessageModalProps) {
  const { workspace } = useWorkspaceStore();
  const { project } = useProjectStore();
  
  // Data fetching
  const { data: workspaceUsers } = useGetActiveWorkspaceUsers(workspaceId);
  const { data: teams } = useTeams(workspaceId);
  
  // Simple state - minimal to prevent re-renders
  const [message, setMessage] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<Recipient[]>(defaultRecipients);
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  
  // Optional visual-only state
  const [isRecipientPopoverOpen, setIsRecipientPopoverOpen] = useState(false);

  // Simple cleanup on close - no complex effects
  useEffect(() => {
    if (!open) {
      setMessage('');
      setSelectedRecipients([]);
      setAttachments([]);
    }
  }, [open]);

  // Simple message change handler 
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  // Simple recipient processing - no memoization to avoid re-render issues
  const availableUsers = workspaceUsers ? workspaceUsers.filter(user => 
    !selectedRecipients.some(r => r.id === user.id && r.type === 'user')
  ).map(user => ({
    id: user.id,
    name: user.userName || user.userEmail || 'Unknown',
    type: 'user' as const,
    email: user.userEmail,
  })) : [];

  const availableTeams = teams?.teams ? teams.teams.filter(team => 
    !selectedRecipients.some(r => r.id === team.id && r.type === 'team')
  ).map(team => ({
    id: team.id,
    name: team.name,
    type: 'team' as const,
  })) : [];

  // Simple recipient management
  const addRecipient = (recipient: Recipient) => {
    const alreadyExists = selectedRecipients.some(r => r.id === recipient.id && r.type === recipient.type);
    if (alreadyExists) {
      toast.info('Already selected');
      return;
    }
    
    setSelectedRecipients(prev => [...prev, recipient]);
    setIsRecipientPopoverOpen(false);
    toast.success(`Added ${recipient.name}`);
  };

  const removeRecipient = (recipientId: string, type: string) => {
    setSelectedRecipients(prev => 
      prev.filter(r => !(r.id === recipientId && r.type === type))
    );
  };

  const handleSend = async () => {
    if (!message.trim() || selectedRecipients.length === 0) {
      toast.error('Please enter a message and select at least one recipient');
      return;
    }

    setIsSending(true);
    
    try {
      const response = await sendQuickMessage({
        recipients: selectedRecipients.map(r => ({
          type: r.type,
          id: r.id,
          email: r.email,
        })),
        content: message.trim(),
        contextType,
        contextId,
      });

      if (response.success) {
        toast.success(`Message sent to ${selectedRecipients.length} recipient${selectedRecipients.length > 1 ? 's' : ''}`);
        handleClose();
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setMessage('');
    setSelectedRecipients([]);
    setAttachments([]);
    onClose();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Check file size (max 10MB per file)
    const maxSize = 10 * 1024 * 1024;
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        toast.error(`File ${file.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      setAttachments(prev => [...prev, ...validFiles]);
      toast.success(`Added ${validFiles.length} file${validFiles.length > 1 ? 's' : ''}`);
    }
    
    // Reset input
    event.target.value = '';
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Content wrapper for magic UI styling
  const ContentWrapper = ({ children }: { children: React.ReactNode }) => (
    <>
      {/* Light mode: Professional styling */}
      <div className="block dark:hidden">
        {children}
      </div>
      
      {/* Dark mode: Magic UI styling */}
      <div className="hidden dark:block">
        <ShineBorder
          className="relative overflow-hidden rounded-lg border-0 bg-white dark:bg-gray-900"
          color={["#A07CFE", "#FE8FB5", "#FFBE7B"]}
        >
          <MagicCard className="cursor-pointer border-0 bg-white dark:bg-gray-900 shadow-none">
            {children}
          </MagicCard>
        </ShineBorder>
      </div>
    </>
  );

  if (!workspace?.id) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden bg-white dark:bg-gray-900">
        <ContentWrapper>
          <div className="bg-white dark:bg-gray-900 p-6 space-y-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-blue-600" />
                Quick Message
                {contextType !== 'general' && (
                  <Badge variant="secondary" className="text-xs">
                    {contextType === 'project' && project?.name}
                    {contextType === 'task' && 'Task Context'}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                Send a message to users, teams, or channels with rich formatting, emojis, and file attachments.
              </DialogDescription>
            </DialogHeader>

            {/* Recipients Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">To:</label>
                <span className="text-xs text-muted-dual">
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
                      {recipient.type === 'user' ? <User className="w-3 h-3" /> : 
                       recipient.type === 'team' ? <Users className="w-3 h-3" /> : 
                       <Hash className="w-3 h-3" />}
                      <span className="max-w-[120px] truncate">{recipient.name}</span>
                      <button
                        onClick={() => removeRecipient(recipient.id, recipient.type)}
                        className="ml-1 hover:bg-red-200 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}


              {/* Add Recipients - Simple Button Based (Stable) */}
              <div className="space-y-3 border border-gray-200 rounded-lg p-3">
                <div className="text-sm font-medium text-gray-700">Available Recipients:</div>
                
                {/* Available Users */}
                {availableUsers.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-gray-600">Users:</div>
                    <div className="flex flex-wrap gap-1">
                      {availableUsers.slice(0, 10).map((user) => (
                        <button
                          key={user.id}
                          onClick={() => addRecipient(user)}
                          className="text-xs bg-green-100 hover:bg-green-200 px-2 py-1 rounded flex items-center gap-1 border"
                        >
                          <User className="w-3 h-3" />
                          {user.name}
                        </button>
                      ))}
                      {availableUsers.length > 10 && (
                        <span className="text-xs text-gray-500 px-2 py-1">
                          +{availableUsers.length - 10} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Available Teams */}
                {availableTeams.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-gray-600">Teams:</div>
                    <div className="flex flex-wrap gap-1">
                      {availableTeams.map((team) => (
                        <button
                          key={team.id}
                          onClick={() => addRecipient(team)}
                          className="text-xs bg-purple-100 hover:bg-purple-200 px-2 py-1 rounded flex items-center gap-1 border"
                        >
                          <Users className="w-3 h-3" />
                          {team.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {availableUsers.length === 0 && availableTeams.length === 0 && (
                  <div className="text-sm text-gray-500 text-center py-2">
                    No recipients available
                  </div>
                )}
              </div>
            </div>

            {/* Message Input - Simple and Stable */}
            <div className="space-y-3">
              <label className="text-sm font-medium block">Message:</label>
              <Textarea
                value={message}
                onChange={handleMessageChange}
                placeholder="Type your message here..."
                className="min-h-[120px] border-2 border-gray-300 focus:border-blue-500"
                disabled={isSending}
              />
              <div className="text-xs text-gray-500">
                Character count: {message.length}/1000
              </div>

              {/* File Attachments */}
              {attachments.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Attachments:</div>
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-gray-100 rounded-md p-2 text-sm"
                      >
                        <Paperclip className="w-4 h-4" />
                        <span className="truncate max-w-[150px]">{file.name}</span>
                        <span className="text-xs text-gray-500">
                          ({Math.round(file.size / 1024)}KB)
                        </span>
                        <button
                          onClick={() => handleRemoveAttachment(index)}
                          className="p-0.5 hover:bg-red-200 rounded-full"
                          disabled={isSending}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                    accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt,.zip"
                    disabled={isSending}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    disabled={isSending}
                    title="Attach files"
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={handleClose} disabled={isSending}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSend}
                    disabled={!message.trim() || selectedRecipients.length === 0 || isSending}
                  >
                    {isSending ? (
                      <>Sending...</>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="text-xs text-muted-dual bg-muted/30 p-3 rounded-md">
              <div className="font-medium mb-1">Quick tips:</div>
              <ul className="space-y-1">
                <li>• Press Ctrl/Cmd + Enter to send quickly</li>
                <li>• Switch to "Rich" mode for formatting (bold, italic, links, lists)</li>
                <li>• Use @ to mention team members (in rich text mode)</li>
                <li>• Click 📄 for message templates (meetings, status updates, etc.)</li>
                <li>• Add emojis 😊 and attach files up to 10MB each</li>
                <li>• Messages auto-save as drafts and show delivery status</li>
                <li>• 🚧 Advanced features (voice, scheduling, AI) coming soon!</li>
              </ul>
            </div>
          </div>
        </ContentWrapper>
      </DialogContent>
    </Dialog>
  );
}