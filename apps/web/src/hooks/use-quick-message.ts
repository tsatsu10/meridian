import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from '@/lib/toast';
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
import useGetActiveWorkspaceUsers from '@/hooks/queries/workspace-users/use-active-workspace-users';
import { useTeams } from '@/hooks/use-teams';
import { MESSAGE_LIMITS, AUTO_SAVE } from '@/components/communication/quick-message/constants';
import { validateMessagePayload, sanitizeMessage } from '@/components/communication/quick-message/validation';
import { withNetworkAwareRetry } from '@/components/communication/quick-message/retry-logic';
import { logger } from "../lib/logger";

interface Recipient {
  id: string;
  name: string;
  type: 'user' | 'team' | 'channel';
  email?: string;
  isOnline?: boolean;
  avatar?: string;
}

interface UseQuickMessageProps {
  workspaceId: string;
  defaultRecipients?: Recipient[];
  contextType?: 'project' | 'task' | 'general';
  contextId?: string;
  isOpen: boolean;
}

interface QuickMessageState {
  message: string;
  htmlMessage: string;
  selectedRecipients: Recipient[];
  attachments: File[];
  channels: Channel[];
  recentConversations: ConversationHistory[];
  useRichText: boolean;
  scheduledFor: Date | null;
  lastMessageId: string | null;
  
  // UI state
  isLoading: boolean;
  isSending: boolean;
  isLoadingChannels: boolean;
  showRecentConversations: boolean;
}

export function useQuickMessage({
  workspaceId,
  defaultRecipients = [],
  contextType = 'general',
  contextId,
  isOpen
}: UseQuickMessageProps) {
  // Data fetching
  const { data: workspaceUsers } = useGetActiveWorkspaceUsers(workspaceId);
  const { data: teams } = useTeams(workspaceId);

  // Consolidated state
  const [state, setState] = useState<QuickMessageState>({
    message: '',
    htmlMessage: '',
    selectedRecipients: [],
    attachments: [],
    channels: [],
    recentConversations: [],
    useRichText: false,
    scheduledFor: null,
    lastMessageId: null,
    isLoading: false,
    isSending: false,
    isLoadingChannels: false,
    showRecentConversations: false,
  });

  // Update state helper
  const updateState = useCallback((updates: Partial<QuickMessageState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Load data when modal opens
  const loadData = useCallback(async () => {
    if (!isOpen || !workspaceId) return;

    updateState({ isLoadingChannels: true });
    
    try {
      // Load channels with retry logic
      const channelsResponse = await withNetworkAwareRetry(
        () => getWorkspaceChannels(workspaceId),
        'Loading channels',
        { maxAttempts: 2 }
      );
      
      if (channelsResponse.success) {
        updateState({ channels: channelsResponse.data.channels });
      }
      
      // Try to load conversations with retry
      try {
        const conversationsResponse = await withNetworkAwareRetry(
          () => getRecentConversations(workspaceId, 5),
          'Loading recent conversations',
          { maxAttempts: 2 }
        );
        
        if (conversationsResponse.success) {
          updateState({ recentConversations: conversationsResponse.data.conversations });
        }
      } catch (conversationError) {
        logger.info("Conversations endpoint not available, skipping recent conversations");
        updateState({ recentConversations: [] });
      }
    } catch (error) {
      console.error('Failed to load channels:', error);
      toast.error('Failed to load channels. Some features may be limited.');
    } finally {
      updateState({ isLoadingChannels: false });
    }
  }, [isOpen, workspaceId, updateState]);

  // Draft loading is now handled inline in useEffect

  // Auto-save draft with less aggressive timing
  useEffect(() => {
    if (isOpen && state.message.trim() && state.message.length > 5) {
      const saveTimer = setTimeout(() => {
        saveDraft(workspaceId, state.message, state.selectedRecipients);
      }, 5000); // Increased to 5 seconds to reduce interference
      
      return () => clearTimeout(saveTimer);
    }
  }, [state.message, state.selectedRecipients, isOpen, workspaceId]);

  // Cleanup file URLs when component unmounts or attachments change
  useEffect(() => {
    const currentAttachments = state.attachments;
    
    return () => {
      // Cleanup any file URLs that were created
      currentAttachments.forEach(file => {
        if (file.type.startsWith('blob:')) {
          URL.revokeObjectURL(file.name); // name contains the blob URL in our case
        }
      });
    };
  }, [state.attachments]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up any remaining file URLs
      state.attachments.forEach(file => {
        if (typeof file === 'object' && file.name && file.name.startsWith('blob:')) {
          URL.revokeObjectURL(file.name);
        }
      });
    };
  }, []);

  // Process available recipients
  const availableRecipients = useMemo(() => {
    const recipients: Recipient[] = [];
    
    // Add users
    if (workspaceUsers) {
      workspaceUsers.forEach(user => {
        if (!state.selectedRecipients.find(r => r.id === user.id && r.type === 'user')) {
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
        if (!state.selectedRecipients.find(r => r.id === team.id && r.type === 'team')) {
          recipients.push({
            id: team.id,
            name: team.name,
            type: 'team',
          });
        }
      });
    }
    
    // Add channels
    state.channels.forEach(channel => {
      if (!state.selectedRecipients.find(r => r.id === channel.id && r.type === 'channel')) {
        recipients.push({
          id: channel.id,
          name: `#${channel.name}`,
          type: 'channel',
        });
      }
    });
    
    return recipients;
  }, [workspaceUsers, teams, state.channels, state.selectedRecipients]);

  // Get mention suggestions
  const mentionSuggestions = useMemo(() => {
    return workspaceUsers?.map(user => ({
      id: user.id,
      name: user.userName || user.userEmail || 'Unknown User',
      email: user.userEmail || undefined,
    })) || [];
  }, [workspaceUsers]);

  // Actions
  const actions = {
    // Message actions
    setMessage: useCallback((message: string) => {
      updateState({ message });
    }, [updateState]),
    setHtmlMessage: useCallback((htmlMessage: string) => {
      updateState({ htmlMessage });
    }, [updateState]),
    toggleRichText: () => updateState({ useRichText: !state.useRichText }),
    
    // Recipient actions
    addRecipient: (recipient: Recipient) => {
      updateState({ 
        selectedRecipients: [...state.selectedRecipients, recipient] 
      });
    },
    
    removeRecipient: (recipientId: string, type: string) => {
      updateState({ 
        selectedRecipients: state.selectedRecipients.filter(
          r => !(r.id === recipientId && r.type === type)
        )
      });
    },
    
    setSelectedRecipients: (recipients: Recipient[]) => {
      updateState({ selectedRecipients: recipients });
    },
    
    // Attachment actions
    addAttachments: (files: File[]) => {
      const validFiles = files.filter(file => {
        if (file.size > MESSAGE_LIMITS.MAX_FILE_SIZE) {
          toast.error(`File ${file.name} is too large (max ${MESSAGE_LIMITS.MAX_FILE_SIZE / (1024 * 1024)}MB)`);
          return false;
        }
        return true;
      });

      if (validFiles.length > 0) {
        updateState({ 
          attachments: [...state.attachments, ...validFiles] 
        });
        toast.success(`Added ${validFiles.length} file${validFiles.length > 1 ? 's' : ''}`);
      }
    },
    
    removeAttachment: (index: number) => {
      updateState({ 
        attachments: state.attachments.filter((_, i) => i !== index) 
      });
    },
    
    // UI actions
    toggleRecentConversations: () => {
      updateState({ showRecentConversations: !state.showRecentConversations });
    },
    
    selectFromRecentConversations: (conversation: ConversationHistory) => {
      const recipients: Recipient[] = conversation.participants.map(p => ({
        id: p.id,
        name: p.name,
        type: 'user' as const,
        email: p.email,
      }));
      
      updateState({ 
        selectedRecipients: recipients,
        showRecentConversations: false 
      });
      toast.info(`Selected conversation with ${recipients.map(r => r.name).join(', ')}`);
    },
    
    // Send message
    sendMessage: async () => {
      // Comprehensive validation
      const validation = validateMessagePayload(
        state.message,
        state.selectedRecipients,
        state.attachments
      );

      if (!validation.isValid) {
        validation.errors.forEach(error => toast.error(error));
        return false;
      }

      // Show warnings if any
      validation.warnings.forEach(warning => toast.warning(warning));

      updateState({ isSending: true });
      
      // Sanitize message content
      const sanitizedMessage = sanitizeMessage(state.message.trim());
      
      try {
        const attachmentData = await Promise.all(
          state.attachments.map(async (file) => ({
            id: Date.now().toString() + Math.random().toString(36).substring(7),
            name: file.name,
            url: URL.createObjectURL(file),
            type: file.type,
            size: file.size,
          }))
        );

        const response = await withNetworkAwareRetry(
          () => sendQuickMessage({
            recipients: state.selectedRecipients.map(r => ({
              type: r.type as 'user' | 'team' | 'channel',
              id: r.id,
              email: r.email,
            })),
            content: sanitizedMessage,
            attachments: attachmentData.length > 0 ? attachmentData : undefined,
            contextType,
            contextId,
          }),
          'Sending message',
          { maxAttempts: 3 }
        );

        if (response.success) {
          const successMessage = response.data.failedRecipients?.length 
            ? `Message sent to ${response.data.sentTo} of ${state.selectedRecipients.length} recipients`
            : `Message sent to ${response.data.sentTo} recipient${response.data.sentTo > 1 ? 's' : ''}`;
          
          toast.success(successMessage);
          
          if (response.data.failedRecipients?.length) {
            toast.warning(`Failed to send to ${response.data.failedRecipients.length} recipients`);
          }
          
          updateState({ lastMessageId: response.data.messageId });
          clearDraft(workspaceId);
          
          return true;
        } else {
          throw new Error('Failed to send message');
        }
      } catch (error) {
        console.error('Failed to send message:', error);
        toast.error('Failed to send message. Please try again.');
        return false;
      } finally {
        updateState({ isSending: false });
      }
    },
    
    // Reset form and clear draft
    reset: () => {
      // Clear any existing draft
      clearDraft(workspaceId);
      
      setState({
        message: '',
        htmlMessage: '',
        selectedRecipients: [],
        attachments: [],
        channels: [],
        recentConversations: [],
        useRichText: false,
        scheduledFor: null,
        lastMessageId: null,
        isLoading: false,
        isSending: false,
        isLoadingChannels: false,
        showRecentConversations: false,
      });
    }
  };

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  // Load draft only once when modal first opens and no defaults
  useEffect(() => {
    if (isOpen && defaultRecipients.length === 0) {
      const draft = loadDraft(workspaceId);
      if (draft && draft.content.trim() && !state.message) {
        updateState({ 
          message: draft.content,
          selectedRecipients: draft.recipients || []
        });
      }
    }
  }, [isOpen, workspaceId, defaultRecipients.length]); // Simple dependencies

  // Set default recipients when modal opens
  useEffect(() => {
    if (isOpen && defaultRecipients.length > 0) {
      updateState({ selectedRecipients: [...defaultRecipients] });
    }
  }, [isOpen, defaultRecipients, updateState]);

  return {
    state,
    actions: {
      ...actions,
      updateState, // Expose updateState for edge cases
    },
    availableRecipients,
    mentionSuggestions,
  };
}