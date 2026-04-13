export interface ChatDeeplinkParams {
  channelId?: string;
  messageId?: string;
  userId?: string;
}

export function buildChatDeeplink(params: ChatDeeplinkParams): string {
  const search = new URLSearchParams();
  if (params.channelId) search.set('channel', params.channelId);
  if (params.messageId) search.set('message', params.messageId);
  if (params.userId) search.set('userId', params.userId);
  const query = search.toString();
  return query ? `/dashboard/chat?${query}` : '/dashboard/chat';
}

