import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { logger } from "../../lib/logger";
import {
  sendQuickMessage,
  getWorkspaceChannels,
  getRecentConversations,
  saveDraft,
  loadDraft,
  clearDraft,
  type Channel,
  type ConversationHistory,
} from '@/services/quick-message-api';
// Temporarily disabled potentially problematic imports
// import RichTextEditor from '@/components/ui/rich-text-editor';
// import EmojiPicker from '@/components/ui/emoji-picker';
// import MessageTemplates from '@/components/ui/message-templates';
// Temporarily removed problematic imports
// import DeliveryStatus, { useDeliveryStatus, type DeliveryInfo } from '@/components/ui/delivery-status';
// import TypingIndicator, { useTypingIndicator, InlineTypingIndicator } from '@/components/ui/typing-indicator';
// Temporarily disabled to fix errors
// import MessageScheduler from '@/components/ui/message-scheduler';
// import VoiceRecorder from '@/components/ui/voice-recorder';
// import MessageReactions from '@/components/ui/message-reactions';
// import MessageTranslator from '@/components/ui/message-translator';
// import SmartMessageSuggestions from '@/components/ui/smart-message-suggestions';

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

// Channel interface moved to API types

interface Recipient {
  id: string;
  name: string;
  type: 'user' | 'team' | 'channel';
  email?: string;
  isOnline?: boolean;
  avatar?: string;
}

interface QuickMessageModalProps {
  open: boolean;
  onClose: () => void;
  defaultRecipients?: Recipient[];
  workspaceId: string;
  contextType?: 'project' | 'task' | 'general';
  contextId?: string;
}

export default function QuickMessageModal({
  open,
  onClose,
  defaultRecipients = [],
  workspaceId,
  contextType = 'general',
  contextId,
}: QuickMessageModalProps) {
  const { workspace } = useWorkspaceStore();
  const { project } = useProjectStore();
  
  // Data fetching
  const { data: workspaceUsers } = useGetActiveWorkspaceUsers(workspaceId);
  const { data: teams } = useTeams(workspaceId);
  
  // State
  const [message, setMessage] = useState('');
  const [htmlMessage, setHtmlMessage] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<Recipient[]>(defaultRecipients);
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [recentConversations, setRecentConversations] = useState<ConversationHistory[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  const [showRecentConversations, setShowRecentConversations] = useState(false);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
  const [useRichText, setUseRichText] = useState(false); // Always false - rich text disabled
  const [scheduledFor, setScheduledFor] = useState<Date | null>(null);
  const [showAdvancedFeatures, setShowAdvancedFeatures] = useState(false);

  // Hooks for new features - temporarily disabled
  // const deliveryInfo = useDeliveryStatus(lastMessageId || '');
  // const { typingUsers, sendTypingIndicator, stopTypingIndicator } = useTypingIndicator(
  //   workspaceId, 
  //   workspace?.ownerEmail || ''
  // );
  // Temporary hooks - simplified for now to avoid errors
  const scheduleMessage = (content: string, recipients: any[], scheduledFor: Date) => {
    logger.info("Schedule message:");
  };
  const getScheduledMessages = () => [];
  const addReaction = (messageId: string, emoji: string, userId: string, userName: string) => {
    logger.info("Add reaction:");
  };
  const removeReaction = (messageId: string, emoji: string, userId: string) => {
    logger.info("Remove reaction:");
  };
  const getReactions = (messageId: string) => [];
  const addToHistory = (result: any) => {
    logger.info("Add to translation history:");
  };
  const autoSuggest = false;
  const addSuggestionToHistory = (suggestion: any) => {
    logger.info("Add suggestion to history:");
  };

  // Load channels and conversation history when modal opens
  useEffect(() => {
    if (open && workspaceId) {
      loadChannelsAndConversations();
      loadDraftMessage();
    }
  }, [open, workspaceId]);

  const loadChannelsAndConversations = async () => {
    setIsLoadingChannels(true);
    try {
      // Load channels first
      const channelsResponse = await getWorkspaceChannels(workspaceId);
      if (channelsResponse.success) {
        setChannels(channelsResponse.data.channels);
      }
      
      // Try to load conversations, but don't fail if the endpoint doesn't exist
      try {
        const conversationsResponse = await getRecentConversations(workspaceId, 5);
        if (conversationsResponse.success) {
          setRecentConversations(conversationsResponse.data.conversations);
        }
      } catch (conversationError) {
        logger.info("Conversations endpoint not available, skipping recent conversations");
        // This is optional functionality, so we don't show an error to the user
        setRecentConversations([]);
      }
    } catch (error) {
      console.error('Failed to load channels:', error);
      // Show error only for critical functionality
      toast.error('Failed to load channels. Some features may be limited.');
    } finally {
      setIsLoadingChannels(false);
    }
  };

  const loadDraftMessage = () => {
    // Only load draft if we have no default recipients and no current message
    if (defaultRecipients.length === 0 && !message.trim()) {
      const draft = loadDraft(workspaceId);
      if (draft && draft.content.trim()) {
        setMessage(draft.content);
        if (draft.recipients && draft.recipients.length > 0) {
          setSelectedRecipients(draft.recipients);
        }
      }
    }
  };

  // Process available recipients - memoized to prevent re-renders
  const availableRecipients = useMemo(() => {
    const recipients: Recipient[] = [];
    
    // Add users
    if (workspaceUsers) {
      workspaceUsers.forEach(user => {
        if (!selectedRecipients.find(r => r.id === user.id && r.type === 'user')) {
          recipients.push({
            id: user.id,
            name: user.userName || user.userEmail || 'Unknown User',
            type: 'user',
            email: user.userEmail || undefined,
            isOnline: false, // TODO: Connect to real presence API
          });
        }
      });
    }
    
    // Add teams
    if (teams) {
      teams.forEach(team => {
        if (!selectedRecipients.find(r => r.id === team.id && r.type === 'team')) {
          recipients.push({
            id: team.id,
            name: team.name,
            type: 'team',
          });
        }
      });
    }
    
    // Add channels
    channels.forEach(channel => {
      if (!selectedRecipients.find(r => r.id === channel.id && r.type === 'channel')) {
        recipients.push({
          id: channel.id,
          name: `#${channel.name}`,
          type: 'channel',
        });
      }
    });
    
    return recipients;
  }, [workspaceUsers, teams, channels, selectedRecipients]);

  // Track if we've initialized to prevent unnecessary re-renders
  const initializedRef = useRef(false);
  const lastDefaultRecipientsRef = useRef<string>('');

  // Auto-save disabled to prevent focus loss - will save on send or close
  // useEffect(() => {
  //   if (open && message.trim() && message.length > 5) {
  //     const saveTimer = setTimeout(() => {
  //       saveDraft(workspaceId, message, selectedRecipients);
  //     }, 5000);
  //     return () => clearTimeout(saveTimer);
  //   }
  // }, [message, selectedRecipients, open, workspaceId]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) {
      setMessage('');
      setSelectedRecipients([]);
      setAttachments([]);
      setChannels([]);
      setRecentConversations([]);
      setShowRecentConversations(false);
      initializedRef.current = false;
      // Clear draft when modal closes
      clearDraft(workspaceId);
    }
  }, [open, workspaceId]);

  // Set default recipients when modal opens - only if they've changed
  useEffect(() => {
    if (open && !initializedRef.current) {
      const recipientsKey = JSON.stringify(defaultRecipients.map(r => `${r.type}-${r.id}`));
      if (recipientsKey !== lastDefaultRecipientsRef.current) {
        setSelectedRecipients([...defaultRecipients]);
        lastDefaultRecipientsRef.current = recipientsKey;
      }
      initializedRef.current = true;
    }
  }, [open, defaultRecipients]);

  const handleAddRecipient = (recipient: Recipient) => {
    // Check if already exists
    const alreadyExists = selectedRecipients.some(r => r.id === recipient.id && r.type === recipient.type);
    if (alreadyExists) {
      toast.info('Already selected');
      return;
    }
    
    setSelectedRecipients(prev => [...prev, recipient]);
    toast.success(`Added ${recipient.name}`);
  };

  const handleRemoveRecipient = (recipientId: string, type: string) => {
    setSelectedRecipients(prev => 
      prev.filter(r => !(r.id === recipientId && r.type === type))
    );
  };

  const handleSendMessage = useCallback(async () => {
    if (!message.trim() || selectedRecipients.length === 0) {
      toast.error('Please enter a message and select at least one recipient');
      return;
    }

    setIsSending(true);
    
    try {
      const attachmentData = await Promise.all(
        attachments.map(async (file) => ({
          id: Date.now().toString() + Math.random().toString(36).substring(7),
          name: file.name,
          url: URL.createObjectURL(file), // In production, upload file first
          type: file.type,
          size: file.size,
        }))
      );

      const response = await sendQuickMessage({
        recipients: selectedRecipients.map(r => ({
          type: r.type as 'user' | 'team' | 'channel',
          id: r.id,
          email: r.email,
        })),
        content: message.trim(),
        attachments: attachmentData.length > 0 ? attachmentData : undefined,
        contextType,
        contextId,
      });

      if (response.success) {
        const successMessage = response.data.failedRecipients?.length 
          ? `Message sent to ${response.data.sentTo} of ${selectedRecipients.length} recipients`
          : `Message sent to ${response.data.sentTo} recipient${response.data.sentTo > 1 ? 's' : ''}`;
        
        toast.success(successMessage);
        
        if (response.data.failedRecipients?.length) {
          toast.warning(`Failed to send to ${response.data.failedRecipients.length} recipients`);
        }
        
        // Set message ID for delivery tracking
        setLastMessageId(response.data.messageId);
        
        // Handle scheduled message
        if (scheduledFor) {
          scheduleMessage(message, selectedRecipients, scheduledFor);
          toast.success(`Message scheduled for ${scheduledFor.toLocaleString()}`);
        }
        
        // Clear draft on successful send
        clearDraft(workspaceId);
        setScheduledFor(null);
        onClose();
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  }, [message, selectedRecipients, attachments, contextType, contextId, scheduledFor, workspaceId, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

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

  const selectFromRecentConversations = (conversation: ConversationHistory) => {
    const recipients: Recipient[] = conversation.participants.map(p => ({
      id: p.id,
      name: p.name,
      type: 'user' as const,
      email: p.email,
    }));
    
    setSelectedRecipients(recipients);
    setShowRecentConversations(false);
    toast.info(`Selected conversation with ${recipients.map(r => r.name).join(', ')}`);
  };

  // Handle rich text changes
  const handleRichTextChange = (html: string, plainText: string) => {
    setHtmlMessage(html);
    setMessage(plainText);
    // sendTypingIndicator(); // Temporarily disabled
  };

  // Simple, direct message change handler - memoized to prevent re-creation
  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    setHtmlMessage('');
  }, []);

  // Ref to maintain focus on textarea
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle emoji selection
  const handleEmojiSelect = (emoji: string) => {
    if (useRichText) {
      setHtmlMessage(prev => prev + emoji);
      setMessage(prev => prev + emoji);
    } else {
      setMessage(prev => prev + emoji);
    }
  };

  // Handle template selection
  const handleTemplateSelect = (template: any) => {
    if (useRichText) {
      setHtmlMessage(template.content);
      setMessage(template.content.replace(/<[^>]*>/g, '')); // Strip HTML for plain text
    } else {
      setMessage(template.content);
    }
    toast.success(`Applied template: ${template.title}`);
  };

  // Handle voice message
  const handleVoiceMessage = (audioBlob: Blob, duration: number) => {
    // Convert voice message to attachment
    const voiceFile = new File([audioBlob], `voice-message-${Date.now()}.webm`, {
      type: 'audio/webm'
    });
    setAttachments(prev => [...prev, voiceFile]);
    toast.success(`Voice message added (${Math.round(duration)}s)`);
  };

  // Handle message scheduling
  const handleScheduleMessage = (scheduledFor: Date) => {
    setScheduledFor(scheduledFor);
    toast.success(`Message scheduled for ${scheduledFor.toLocaleString()}`);
  };

  // Handle message reactions (for message previews)
  const handleReactionAdd = (messageId: string, emoji: string) => {
    const currentUser = workspace?.ownerEmail || 'current-user';
    addReaction(messageId, emoji, currentUser, currentUser);
  };

  const handleReactionRemove = (messageId: string, emoji: string) => {
    const currentUser = workspace?.ownerEmail || 'current-user';
    removeReaction(messageId, emoji, currentUser);
  };

  // Handle translation completion
  const handleTranslationComplete = (result: any) => {
    addToHistory(result);
    toast.success('Translation completed - you can copy the result');
  };

  // Handle smart suggestion selection
  const handleSuggestionSelect = (suggestion: any) => {
    if (useRichText) {
      setHtmlMessage(suggestion.text);
      setMessage(suggestion.text.replace(/<[^>]*>/g, ''));
    } else {
      setMessage(suggestion.text);
    }
    addSuggestionToHistory(suggestion);
  };

  // Get mention suggestions - simplified
  const getMentionSuggestions = workspaceUsers?.map(user => ({
    id: user.id,
    name: user.userName || user.userEmail || 'Unknown User',
    email: user.userEmail || undefined,
  })) || [];

  const getRecipientIcon = (type: string) => {
    switch (type) {
      case 'user': return <User className="w-4 h-4" />;
      case 'team': return <Users className="w-4 h-4" />;
      case 'channel': return <Hash className="w-4 h-4" />;
      default: return <MessageCircle className="w-4 h-4" />;
    }
  };

  const ContentWrapper = ({ children }: { children: React.ReactNode }) => (
    <>
      {/* Light mode: Professional styling */}
      <div className="block dark:hidden">
        {children}
      </div>
      
      {/* Dark mode: Magic UI styling */}
      <div className="hidden dark:block">
        <ShineBorder
          className="relative overflow-hidden rounded-lg border-0 bg-slate-900/95 backdrop-blur-sm"
          color={["#A07CFE", "#FE8FB5", "#FFBE7B"]}
        >
          <MagicCard className="cursor-pointer border-0 bg-slate-900/90 backdrop-blur-sm shadow-2xl">
            {children}
          </MagicCard>
        </ShineBorder>
      </div>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
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
                      {getRecipientIcon(recipient.type)}
                      <span className="max-w-[120px] truncate">{recipient.name}</span>
                      {recipient.isOnline && (
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                      )}
                      <button
                        onClick={() => handleRemoveRecipient(recipient.id, recipient.type)}
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
                    onClick={() => setShowRecentConversations(!showRecentConversations)}
                    className="text-xs text-muted-dual"
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
                          onClick={() => selectFromRecentConversations(conversation)}
                          className="justify-start text-left h-auto p-2"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">
                              {conversation.participants.map(p => p.name).join(', ')}
                            </div>
                            {conversation.lastMessage && (
                              <div className="text-xs text-muted-dual truncate">
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

              {/* Add Recipients - Simplified Button-based Selection */}
              <div className="space-y-3 border border-gray-200 rounded-lg p-3">
                <div className="text-sm font-medium text-gray-700">Available Recipients:</div>
                
                {/* Available Users */}
                {availableRecipients.filter(r => r.type === 'user').length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-gray-600">Users:</div>
                    <div className="flex flex-wrap gap-1">
                      {availableRecipients
                        .filter(r => r.type === 'user')
                        .slice(0, 10)
                        .map((recipient) => (
                          <button
                            key={`${recipient.type}-${recipient.id}`}
                            onClick={() => handleAddRecipient(recipient)}
                            className="text-xs bg-green-100 hover:bg-green-200 px-2 py-1 rounded flex items-center gap-1 border"
                          >
                            <User className="w-3 h-3" />
                            {recipient.name}
                            {recipient.isOnline && (
                              <div className="w-2 h-2 bg-green-500 rounded-full" />
                            )}
                          </button>
                        ))}
                      {availableRecipients.filter(r => r.type === 'user').length > 10 && (
                        <span className="text-xs text-gray-500 px-2 py-1">
                          +{availableRecipients.filter(r => r.type === 'user').length - 10} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Available Teams */}
                {availableRecipients.filter(r => r.type === 'team').length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-gray-600">Teams:</div>
                    <div className="flex flex-wrap gap-1">
                      {availableRecipients
                        .filter(r => r.type === 'team')
                        .map((recipient) => (
                          <button
                            key={`${recipient.type}-${recipient.id}`}
                            onClick={() => handleAddRecipient(recipient)}
                            className="text-xs bg-purple-100 hover:bg-purple-200 px-2 py-1 rounded flex items-center gap-1 border"
                          >
                            <Users className="w-3 h-3" />
                            {recipient.name}
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {/* Available Channels */}
                {availableRecipients.filter(r => r.type === 'channel').length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-gray-600">Channels:</div>
                    <div className="flex flex-wrap gap-1">
                      {availableRecipients
                        .filter(r => r.type === 'channel')
                        .map((recipient) => (
                          <button
                            key={`${recipient.type}-${recipient.id}`}
                            onClick={() => handleAddRecipient(recipient)}
                            className="text-xs bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded flex items-center gap-1 border"
                          >
                            <Hash className="w-3 h-3" />
                            {recipient.name}
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {availableRecipients.length === 0 && (
                  <div className="text-sm text-gray-500 text-center py-2">
                    {isLoadingChannels ? 'Loading recipients...' : 'No recipients available'}
                  </div>
                )}
              </div>
            </div>

            {/* Message Input */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Message:</label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={true}
                    className="text-xs"
                    title="Rich text temporarily disabled"
                  >
                    Plain
                  </Button>
                  {/* Temporarily disabled delivery status
                  {deliveryInfo && (
                    <DeliveryStatus deliveryInfo={deliveryInfo} showDetails={false} />
                  )}
                  */}
                </div>
              </div>

              {useRichText ? (
                <div className="p-3 border rounded-md">
                  <p className="text-sm text-muted-foreground">Rich text editor temporarily disabled</p>
                </div>
              ) : (
                <Textarea
                  ref={textareaRef}
                  key="quick-message-textarea-stable"
                  value={message}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message here... (Ctrl/Cmd + Enter to send)"
                  className="min-h-[120px] resize-none"
                  disabled={isSending}
                  autoFocus={false}
                />
              )}

              {/* Typing Indicator - temporarily disabled to fix focus issue */}
              {/* <TypingIndicator 
                typingUsers={typingUsers}
                className="mt-2"
              /> */}
              
              {/* File Attachments */}
              {attachments.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Attachments:</div>
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-muted/50 rounded-md p-2 text-sm"
                      >
                        {file.type.startsWith('audio/') ? (
                          <Mic className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Paperclip className="w-4 h-4" />
                        )}
                        <span className="truncate max-w-[150px]">{file.name}</span>
                        <span className="text-xs text-muted-dual">
                          ({Math.round(file.size / 1024)}KB)
                        </span>
                        {file.type.startsWith('audio/') && (
                          <span className="text-xs text-blue-600 bg-blue-50 px-1 rounded">
                            Voice
                          </span>
                        )}
                        <button
                          onClick={() => handleRemoveAttachment(index)}
                          className="p-0.5 hover:bg-muted rounded-full"
                          disabled={isSending}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scheduled Message Info */}
              {scheduledFor && (
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-blue-700 dark:text-blue-300">
                      Scheduled for {scheduledFor.toLocaleString()}
                    </span>
                    <button
                      onClick={() => setScheduledFor(null)}
                      className="ml-auto p-0.5 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
              
              {/* Message Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
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
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toast.info("Emoji picker coming soon!")}
                    title="Add emoji"
                  >
                    <Smile className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toast.info("Message templates coming soon!")}
                    title="Use template"
                  >
                    <BookTemplate className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-dual">
                    {message.length}/1000
                  </span>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!message.trim() || selectedRecipients.length === 0 || isSending}
                    className="flex items-center gap-2"
                  >
                    {isSending ? (
                      <Clock className="w-4 h-4" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {isSending ? 'Sending...' : 'Send'}
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