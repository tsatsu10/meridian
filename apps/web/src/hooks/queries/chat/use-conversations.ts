// @epic-3.6-communication: Conversations hook
import { useQuery } from '@tanstack/react-query';
import useWorkspaceStore from '@/store/workspace';
import useAuth from '@/components/providers/auth-provider/hooks/use-auth';
import { API_BASE_URL, API_URL } from '@/constants/urls';

export interface Conversation {
  id: string;
  name: string;
  type: 'direct' | 'channel' | 'group';
  channelType?: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
  isOnline?: boolean;
  participants?: string[];
  workspaceId?: string;
}

export const useConversations = () => {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const { user } = useAuth();

  return useQuery({
    queryKey: ['conversations', workspace?.id, user?.email],
    queryFn: async () => {
      if (!workspace?.id || !user?.email) {
        return [];
      }

      // Fetch channels for workspace
      const channelsResponse = await fetch(
        `${API_BASE_URL}/channel/${workspace.id}`,
        {
          credentials: 'include',
        }
      );

      if (!channelsResponse.ok) {
        console.error('Failed to fetch channels:', channelsResponse.status);
        // Return empty array instead of throwing to prevent widget crash
        return [];
      }

      const channelsData = await channelsResponse.json();
      const channels = channelsData.channels || [];

      // Fetch direct message conversations
      const dmResponse = await fetch(
        `${API_BASE_URL}/message/conversations?userEmail=${user.email}`,
        {
          credentials: 'include',
        }
      );

      let directMessages: any[] = [];
      if (dmResponse.ok) {
        directMessages = await dmResponse.json();
      }

      // Combine and format conversations
      const allConversations: Conversation[] = [
        // Format channels
        ...channels.map((channel: any) => ({
          id: channel.id,
          name: channel.name || 'Unnamed Channel',
          type: channel.isDirectMessage ? 'direct' : (channel.channelType || 'group'),
          channelType: channel.channelType,
          lastMessage: channel.lastMessage?.content,
          lastMessageTime: channel.lastMessageAt ? new Date(channel.lastMessageAt) : undefined,
          unreadCount: 0, // TODO: Fetch from backend
          participants: channel.participants || [],
          workspaceId: channel.workspaceId,
        })),
        // Format direct messages
        ...directMessages.map((dm: any) => ({
          id: dm.channelId,
          name: dm.otherUserName || dm.otherUserEmail || 'Unknown User',
          type: 'direct' as const,
          lastMessage: dm.lastMessage?.content,
          lastMessageTime: dm.lastMessageAt ? new Date(dm.lastMessageAt) : undefined,
          unreadCount: dm.unreadCount || 0,
          isOnline: dm.isOnline,
          participants: [dm.otherUserEmail],
        })),
      ];

      // Deduplicate conversations by ID to prevent React key warnings
      const conversationsMap = new Map<string, Conversation>();
      allConversations.forEach(conv => {
        if (conv.id && !conversationsMap.has(conv.id)) {
          conversationsMap.set(conv.id, conv);
        }
      });
      const conversations = Array.from(conversationsMap.values());

      // Sort by last message time
      return conversations.sort((a, b) => {
        const timeA = a.lastMessageTime?.getTime() || 0;
        const timeB = b.lastMessageTime?.getTime() || 0;
        return timeB - timeA;
      });
    },
    enabled: !!workspace && !!user,
    staleTime: 30 * 1000, // 30 seconds
  });
};

