// @epic-3.6-communication: Messages hook
import { useQuery } from '@tanstack/react-query';
import useAuth from '@/components/providers/auth-provider/hooks/use-auth';
import { API_BASE_URL } from '@/constants/urls';

export interface Message {
  id: string;
  content: string;
  userEmail: string;
  userName?: string;
  timestamp: Date;
  isOwn: boolean;
  messageType?: string;
  attachments?: any[];
  isEdited?: boolean;
  readStatus?: string;
}

export const useMessages = (channelId: string | null) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['messages', channelId],
    queryFn: async () => {
      if (!channelId) {
        return [];
      }

      const response = await fetch(
        `${API_BASE_URL}/message/channel/${channelId}`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const messagesData = await response.json();

      // Format messages
      const allMessages = messagesData.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        userEmail: msg.userEmail,
        userName: msg.userName || msg.userEmail,
        timestamp: new Date(msg.createdAt),
        isOwn: msg.userEmail === user?.email,
        messageType: msg.messageType,
        attachments: msg.attachments ? JSON.parse(msg.attachments) : [],
        isEdited: msg.isEdited,
        readStatus: msg.readStatus,
      }));

      // Deduplicate messages by ID to prevent React key warnings
      const messagesMap = new Map<string, Message>();
      allMessages.forEach(msg => {
        if (msg.id && !messagesMap.has(msg.id)) {
          messagesMap.set(msg.id, msg);
        }
      });

      return Array.from(messagesMap.values());
    },
    enabled: !!channelId && !!user,
    staleTime: 0, // Always fetch fresh messages
    refetchOnMount: 'always', // Refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });
};

