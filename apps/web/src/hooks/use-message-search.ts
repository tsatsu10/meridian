import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/lib/fetch';

export interface MessageSearchFilters {
  query?: string;
  users?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  messageTypes?: string[];
  includeThreads?: boolean;
  pinnedOnly?: boolean;
  channelId?: string;
  limit?: number;
  offset?: number;
}

export interface MessageSearchResult {
  id: string;
  content: string;
  messageType: string;
  userEmail: string;
  userName?: string;
  channelId: string;
  createdAt: Date;
  isEdited: boolean;
  isPinned: boolean;
  attachments?: string;
  reactions?: string;
  parentMessageId?: string;
  threadMessageCount?: number;
  threadParticipantCount?: number;
  threadLastReplyAt?: Date;
  threadPreview?: string;
  threadStatus?: string;
}

export interface MessageSearchResponse {
  messages: MessageSearchResult[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export function useMessageSearch(filters: MessageSearchFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['messageSearch', filters],
    queryFn: async (): Promise<MessageSearchResponse> => {
      const params = new URLSearchParams();
      
      if (filters.query?.trim()) params.set('search', filters.query);
      if (filters.users?.length) params.set('user', filters.users.join(','));
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom.toISOString());
      if (filters.dateTo) params.set('dateTo', filters.dateTo.toISOString());
      if (filters.messageTypes?.length) params.set('type', filters.messageTypes.join(','));
      if (filters.includeThreads) params.set('includeThreads', 'true');
      if (filters.pinnedOnly) params.set('pinned', 'true');
      if (filters.limit) params.set('limit', filters.limit.toString());
      if (filters.offset) params.set('offset', filters.offset.toString());

      const endpoint = filters.channelId 
        ? `/message/channel/${filters.channelId}`
        : '/message/search';

      const url = `${endpoint}${params.toString() ? `?${params.toString()}` : ''}`;
      
      return await fetchApi(url);
    },
    enabled: options?.enabled !== false && (
      !!filters.query?.trim() || 
      !!filters.users?.length || 
      !!filters.dateFrom || 
      !!filters.pinnedOnly ||
      !!filters.messageTypes?.some(type => type !== 'text')
    ),
  });
}

// Hook for global search across all channels
export function useGlobalMessageSearch(filters: Omit<MessageSearchFilters, 'channelId'>) {
  return useMessageSearch(
    {
      ...filters,
      channelId: undefined, // Ensure global search
      limit: filters.limit || 100
    },
    { enabled: !!filters.query?.trim() || !!filters.users?.length || !!filters.dateFrom || !!filters.pinnedOnly }
  );
}

// Hook for quick search (just text query)
export function useQuickMessageSearch(query: string, channelId?: string) {
  return useMessageSearch(
    {
      query,
      channelId,
      limit: 20,
      messageTypes: ['text', 'file']
    },
    { enabled: query.trim().length >= 2 }
  );
}

// Hook for searching specific user's messages
export function useUserMessageSearch(userEmail: string, channelId?: string) {
  return useMessageSearch(
    {
      users: [userEmail],
      channelId,
      limit: 50,
      messageTypes: ['text', 'file']
    },
    { enabled: !!userEmail }
  );
}

// Hook for searching pinned messages
export function usePinnedMessageSearch(channelId?: string) {
  return useMessageSearch(
    {
      pinnedOnly: true,
      channelId,
      limit: 100
    },
    { enabled: !!channelId }
  );
}

// Hook for searching messages with attachments
export function useAttachmentSearch(channelId?: string) {
  return useMessageSearch(
    {
      messageTypes: ['file'],
      channelId,
      limit: 50
    },
    { enabled: !!channelId }
  );
}