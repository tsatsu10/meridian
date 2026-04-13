import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
  Clock,
  MessageCircle,
  AlertCircle,
  Loader2,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { motion, AnimatePresence } from 'framer-motion';
import useWorkspaceStore from '@/store/workspace';
import useProjectStore from '@/store/project';
import useGetActiveWorkspaceUsers from '@/hooks/queries/workspace-users/use-active-workspace-users';
import { useTeams } from '@/hooks/use-teams';

// Fixed interfaces
interface Recipient {
  id: string;
  name: string;
  type: 'user' | 'team' | 'channel';
  email?: string;
  isOnline?: boolean;
  avatar?: string;
  memberCount?: number;
}

interface AttachmentFile {
  id: string;
  name: string;
  file: File;
  preview?: string;
}

interface QuickMessageModalProps {
  open: boolean;
  onClose: () => void;
  defaultRecipients?: Recipient[];
  workspaceId: string;
  contextType?: 'project' | 'task' | 'general';
  contextId?: string;
  defaultMessage?: string;
}

// Fixed quick message modal with stable state management
export default function FixedQuickMessageModal({
  open,
  onClose,
  defaultRecipients = [],
  workspaceId,
  contextType = 'general',
  contextId,
  defaultMessage = '',
}: QuickMessageModalProps) {
  const { workspace } = useWorkspaceStore();
  const { project } = useProjectStore();
  
  // Data fetching
  const { data: workspaceUsers, isLoading: isLoadingUsers } = useGetActiveWorkspaceUsers(workspaceId);
  const { data: teams, isLoading: isLoadingTeams } = useTeams(workspaceId);
  
  // Core state - using stable initial values
  const [message, setMessage] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<Recipient[]>([]);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [isRecipientPopoverOpen, setIsRecipientPopoverOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  
  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialized = useRef(false);

  // Initialize only when modal opens - STABLE DEPENDENCY ARRAY
  useEffect(() => {
    if (open && !initialized.current) {
      setMessage(defaultMessage);
      setSelectedRecipients([...defaultRecipients]);
      setAttachments([]);
      setRecipientSearch('');
      setIsRecipientPopoverOpen(false);
      setSendProgress(0);
      initialized.current = true;
    } else if (!open) {
      initialized.current = false;
    }
  }, [open]); // Only depend on open, not other props

  // Set default values only on first render
  useEffect(() => {
    if (defaultMessage && !message) {
      setMessage(defaultMessage);
    }
  }, []); // Empty dependency array - only run once

  useEffect(() => {
    if (defaultRecipients.length > 0 && selectedRecipients.length === 0) {
      setSelectedRecipients([...defaultRecipients]);
    }
  }, []); // Empty dependency array - only run once

  // Memoize available recipients to prevent re-renders
  const availableRecipients = useMemo(() => {
    const recipients: Recipient[] = [];
    
    // Add users - only if data exists
    if (workspaceUsers && Array.isArray(workspaceUsers)) {
      workspaceUsers.forEach(user => {
        // Check if already selected using a stable comparison
        const isSelected = selectedRecipients.some(r => r.id === user.id && r.type === 'user');
        if (!isSelected) {
          recipients.push({
            id: user.id,
            name: user.userName || user.userEmail || 'Unknown User',
            type: 'user',
            email: user.userEmail || undefined,
            isOnline: user.isOnline || false,
          });
        }
      });
    }
    
    // Add teams - only if data exists
    if (teams && Array.isArray(teams)) {
      teams.forEach(team => {
        const isSelected = selectedRecipients.some(r => r.id === team.id && r.type === 'team');
        if (!isSelected) {
          recipients.push({
            id: team.id,
            name: team.name,
            type: 'team',
            memberCount: team.memberCount,
          });
        }
      });
    }
    
    // Filter by search term
    if (recipientSearch.trim()) {
      return recipients.filter(recipient =>
        recipient.name.toLowerCase().includes(recipientSearch.toLowerCase())
      );
    }
    
    return recipients;
  }, [workspaceUsers, teams, selectedRecipients, recipientSearch]);

  // Stable callback for adding recipients
  const handleAddRecipient = useCallback((recipient: Recipient) => {
    setSelectedRecipients(prev => {
      // Check if already exists
      const exists = prev.some(r => r.id === recipient.id && r.type === recipient.type);
      if (exists) return prev;
      
      return [...prev, recipient];
    });
    setIsRecipientPopoverOpen(false);
    setRecipientSearch('');
  }, []);

  // Stable callback for removing recipients
  const handleRemoveRecipient = useCallback((recipientId: string, type: string) => {
    setSelectedRecipients(prev => 
      prev.filter(r => !(r.id === recipientId && r.type === type))
    );
  }, []);

  // Stable message change handler - THE FIX FOR TEXT INPUT ISSUE
  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);
  }, []); // Empty dependencies - this callback never changes

  // Stable file upload handler
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const newAttachments: AttachmentFile[] = [];
    
    files.forEach(file => {
      // File size validation
      if (file.size > 25 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 25MB per file)`);
        return;
      }

      const attachmentFile: AttachmentFile = {
        id: Date.now().toString() + Math.random().toString(36).substring(7),
        name: file.name,
        file,
      };
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        attachmentFile.preview = URL.createObjectURL(file);
      }
      
      newAttachments.push(attachmentFile);
    });

    if (newAttachments.length > 0) {
      setAttachments(prev => [...prev, ...newAttachments]);
      toast.success(`Added ${newAttachments.length} file${newAttachments.length > 1 ? 's' : ''}`);
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleRemoveAttachment = useCallback((id: string) => {
    setAttachments(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  }, []);

  // Validation - memoized
  const validation = useMemo(() => {
    const errors: string[] = [];
    
    if (!message.trim()) {
      errors.push('Message content is required');
    } else if (message.length > 2000) {
      errors.push('Message is too long (max 2000 characters)');
    }
    
    if (selectedRecipients.length === 0) {
      errors.push('At least one recipient is required');
    }
    
    if (attachments.length > 10) {
      errors.push('Too many attachments (max 10)');
    }
    
    return {
      errors,
      isValid: errors.length === 0,
    };
  }, [message, selectedRecipients, attachments]);

  // Send message handler
  const handleSendMessage = useCallback(async () => {
    if (!validation.isValid) {
      validation.errors.forEach(error => toast.error(error));
      return;
    }

    setIsSending(true);
    setSendProgress(0);
    
    try {
      // Simulate progress
      setSendProgress(20);
      
      // Mock sending process
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSendProgress(60);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      setSendProgress(80);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      setSendProgress(100);
      
      toast.success(`Message sent to ${selectedRecipients.length} recipient${selectedRecipients.length > 1 ? 's' : ''}`);
      
      // Reset form
      setMessage('');
      setSelectedRecipients([]);
      setAttachments([]);
      onClose();
      
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
      setSendProgress(0);
    }
  }, [validation, selectedRecipients, onClose]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Get file icon
  const getFileIcon = useCallback((type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    if (type.startsWith('video/')) return <Film className="w-4 h-4" />;
    if (type.startsWith('audio/')) return <Music className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  }, []);

  // Get recipient icon
  const getRecipientIcon = useCallback((type: string) => {
    switch (type) {
      case 'user': return <User className="w-4 h-4" />;
      case 'team': return <Users className="w-4 h-4" />;
      case 'channel': return <Hash className="w-4 h-4" />;
      default: return <MessageCircle className="w-4 h-4" />;
    }
  }, []);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-600" />
            Send Message
            {contextType !== 'general' && (
              <Badge variant="secondary" className="text-xs">
                {contextType === 'project' && project?.name}
                {contextType === 'task' && 'Task Context'}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Send a message to users, teams, or channels with attachments.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Recipients Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Recipients:</label>
              <Badge variant={selectedRecipients.length > 0 ? "default" : "secondary"} className="text-xs">
                {selectedRecipients.length} selected
              </Badge>
            </div>
            
            {/* Selected Recipients */}
            <AnimatePresence>
              {selectedRecipients.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg"
                >
                  {selectedRecipients.map((recipient) => (
                    <motion.div
                      key={`${recipient.type}-${recipient.id}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                    >
                      <Badge
                        variant="secondary"
                        className="flex items-center gap-2 pr-1 hover:bg-muted-foreground/20 transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          {getRecipientIcon(recipient.type)}
                          <span className="max-w-[120px] truncate">{recipient.name}</span>
                          {recipient.memberCount && (
                            <span className="text-xs text-muted-foreground">({recipient.memberCount})</span>
                          )}
                          {recipient.isOnline && (
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveRecipient(recipient.id, recipient.type)}
                          className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Add Recipients */}
            <Popover open={isRecipientPopoverOpen} onOpenChange={setIsRecipientPopoverOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-muted-foreground"
                  disabled={isLoadingUsers || isLoadingTeams}
                >
                  {isLoadingUsers || isLoadingTeams ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4 mr-2" />
                  )}
                  Add recipients...
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Search users, teams..." 
                    value={recipientSearch}
                    onValueChange={setRecipientSearch}
                  />
                  <CommandList>
                    <CommandEmpty>No recipients found.</CommandEmpty>
                    
                    {availableRecipients.filter(r => r.type === 'user').length > 0 && (
                      <CommandGroup heading="Users">
                        {availableRecipients
                          .filter(r => r.type === 'user')
                          .slice(0, 8)
                          .map((recipient) => (
                            <CommandItem
                              key={`${recipient.type}-${recipient.id}`}
                              onSelect={() => handleAddRecipient(recipient)}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <Avatar className="w-6 h-6">
                                  <AvatarImage src={recipient.avatar} />
                                  <AvatarFallback className="text-xs">
                                    {recipient.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{recipient.name}</div>
                                  {recipient.email && (
                                    <div className="text-xs text-muted-foreground truncate">{recipient.email}</div>
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
                              <Users className="w-4 h-4 mr-3" />
                              <div className="flex-1">
                                <span className="font-medium">{recipient.name}</span>
                                {recipient.memberCount && (
                                  <span className="text-xs text-muted-foreground ml-2">
                                    ({recipient.memberCount} members)
                                  </span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Message Input - THE CRITICAL FIX */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Message:</label>
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={handleMessageChange} // Using stable callback
              onKeyDown={handleKeyDown}
              placeholder="Type your message here... (Ctrl/Cmd + Enter to send)"
              className="min-h-[120px] resize-none"
              disabled={isSending}
              key="message-textarea" // Stable key to prevent remounting
            />
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>{message.length}/2000</span>
              <span>Ctrl/Cmd + Enter to send</span>
            </div>
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-3"
            >
              <label className="text-sm font-medium">Attachments:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {attachments.map((attachment) => (
                  <motion.div
                    key={attachment.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-3 bg-muted/50 rounded-lg p-3"
                  >
                    {attachment.preview ? (
                      <img
                        src={attachment.preview}
                        alt={attachment.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                        {getFileIcon(attachment.file.type)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{attachment.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {(attachment.file.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAttachment(attachment.id)}
                      disabled={isSending}
                      className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Validation Errors */}
          <AnimatePresence>
            {validation.errors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                {validation.errors.map((error, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    <span>{error}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.json,.zip"
              disabled={isSending}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending || attachments.length >= 10}
              title={attachments.length >= 10 ? "Maximum 10 attachments" : "Attach files"}
            >
              <Paperclip className="w-4 h-4 mr-2" />
              Attach
            </Button>
            <span className="text-xs text-muted-foreground">
              {attachments.length}/10 files
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            {isSending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{sendProgress}%</span>
              </div>
            )}
            <Button
              onClick={handleSendMessage}
              disabled={!validation.isValid || isSending}
              className="flex items-center gap-2"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {isSending ? 'Sending...' : 'Send Message'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}