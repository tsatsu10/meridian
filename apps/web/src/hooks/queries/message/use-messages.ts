import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/hooks/use-user';

interface Message {
  id: string;
  content: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  timestamp: string;
  type: 'text' | 'file' | 'system';
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
  reactions?: Array<{
    emoji: string;
    count: number;
    users: string[];
  }>;
  isEdited?: boolean;
  replyTo?: {
    id: string;
    content: string;
    userName: string;
  };
}

interface UseMessagesOptions {
  channelId?: string;
  userId?: string;
  isDirectMessage?: boolean;
}

interface SendMessageParams {
  content: string;
  attachments?: File[];
  channelId?: string;
  recipientId?: string;
  type: 'channel' | 'direct';
}

export const useMessages = (options: UseMessagesOptions) => {
  const { channelId, userId, isDirectMessage } = options;
  const { user } = useUser();
  const queryClient = useQueryClient();

  // Query key for messages
  const queryKey = ['messages', channelId, userId, isDirectMessage];

  // Fetch messages
  const { data: messages, isLoading, error } = useQuery({
    queryKey,
    queryFn: async (): Promise<Message[]> => {
      if (!channelId && !userId) {
        return [];
      }

      // TODO: Replace with actual API call
      // For now, return mock data
      return [
        {
          id: '1',
          content: 'Hello everyone! 👋',
          userId: 'user1',
          userName: 'John Doe',
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
          type: 'text' as const,
          reactions: [
            { emoji: '👋', count: 2, users: ['user1', 'user2'] }
          ]
        },
        {
          id: '2',
          content: 'How is the project going?',
          userId: 'user2',
          userName: 'Jane Smith',
          timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(), // 3 minutes ago
          type: 'text' as const
        },
        {
          id: '3',
          content: 'Great progress! Here\'s the latest update:',
          userId: 'user1',
          userName: 'John Doe',
          timestamp: new Date(Date.now() - 1000 * 60 * 1).toISOString(), // 1 minute ago
          type: 'file' as const,
          attachments: [
            {
              id: 'att1',
              name: 'project-update.pdf',
              url: '/uploads/project-update.pdf',
              type: 'application/pdf',
              size: 1024 * 1024 // 1MB
            }
          ]
        }
      ];
    },
    enabled: !!(channelId || userId),
    staleTime: 0, // Always fetch fresh messages
    refetchOnMount: 'always', // Refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch on window focus
    gcTime: 1000 * 60 * 5, // 5 minutes
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (params: SendMessageParams): Promise<Message> => {
      // TODO: Replace with actual API call
      const newMessage: Message = {
        id: `msg_${Date.now()}`,
        content: params.content,
        userId: user?.id || 'unknown',
        userName: user?.name || 'Unknown User',
        userAvatar: user?.avatar,
        timestamp: new Date().toISOString(),
        type: params.attachments && params.attachments.length > 0 ? 'file' : 'text',
        attachments: params.attachments?.map((file, index) => ({
          id: `att_${Date.now()}_${index}`,
          name: file.name,
          url: URL.createObjectURL(file),
          type: file.type,
          size: file.size
        }))
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      return newMessage;
    },
    onSuccess: (newMessage) => {
      // Optimistically update the messages list
      queryClient.setQueryData(queryKey, (oldMessages: Message[] = []) => {
        return [...oldMessages, newMessage];
      });

      // Invalidate and refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
      // TODO: Show error toast
    }
  });

  // Send message function
  const sendMessage = async (params: SendMessageParams) => {
    return sendMessageMutation.mutateAsync(params);
  };

  // Add reaction mutation
  const addReactionMutation = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 200));
      return { messageId, emoji };
    },
    onSuccess: ({ messageId, emoji }) => {
      // Update the message with the new reaction
      queryClient.setQueryData(queryKey, (oldMessages: Message[] = []) => {
        return oldMessages.map(message => {
          if (message.id === messageId) {
            const existingReaction = message.reactions?.find(r => r.emoji === emoji);
            if (existingReaction) {
              return {
                ...message,
                reactions: message.reactions?.map(r => 
                  r.emoji === emoji 
                    ? { ...r, count: r.count + 1, users: [...r.users, user?.id || 'unknown'] }
                    : r
                )
              };
            } else {
              return {
                ...message,
                reactions: [
                  ...(message.reactions || []),
                  { emoji, count: 1, users: [user?.id || 'unknown'] }
                ]
              };
            }
          }
          return message;
        });
      });
    }
  });

  // Add reaction function
  const addReaction = async (messageId: string, emoji: string) => {
    return addReactionMutation.mutateAsync({ messageId, emoji });
  };

  // Edit message mutation
  const editMessageMutation = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 300));
      return { messageId, content };
    },
    onSuccess: ({ messageId, content }) => {
      // Update the message content
      queryClient.setQueryData(queryKey, (oldMessages: Message[] = []) => {
        return oldMessages.map(message => {
          if (message.id === messageId) {
            return {
              ...message,
              content,
              isEdited: true
            };
          }
          return message;
        });
      });
    }
  });

  // Edit message function
  const editMessage = async (messageId: string, content: string) => {
    return editMessageMutation.mutateAsync({ messageId, content });
  };

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 300));
      return messageId;
    },
    onSuccess: (messageId) => {
      // Remove the message from the list
      queryClient.setQueryData(queryKey, (oldMessages: Message[] = []) => {
        return oldMessages.filter(message => message.id !== messageId);
      });
    }
  });

  // Delete message function
  const deleteMessage = async (messageId: string) => {
    return deleteMessageMutation.mutateAsync(messageId);
  };

  return {
    // Query data
    data: messages,
    isLoading,
    error,
    
    // Mutations
    sendMessage,
    addReaction,
    editMessage,
    deleteMessage,
    
    // Mutation states
    isSending: sendMessageMutation.isPending,
    isAddingReaction: addReactionMutation.isPending,
    isEditing: editMessageMutation.isPending,
    isDeleting: deleteMessageMutation.isPending
  };
}; 