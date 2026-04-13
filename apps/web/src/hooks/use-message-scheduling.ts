// @epic-3.1-messaging: React Query hooks for message scheduling
// @persona-sarah: PM needs to schedule messages for team coordination
// @persona-david: Team lead needs to schedule reminders and announcements

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { schedulingAPI, ScheduledMessage } from '@/services/scheduling-api';
import { ScheduleData } from '@/components/schedule/schedule-picker';

/**
 * Hook to schedule a new message
 */
export function useScheduleMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      channelId: string;
      content: string;
      scheduleData: ScheduleData;
      messageType?: string;
      parentMessageId?: string;
      mentions?: string[];
      attachments?: File[];
      maxRetries?: number;
    }) => schedulingAPI.scheduleMessage(data),
    onSuccess: () => {
      // Invalidate scheduled messages queries
      queryClient.invalidateQueries({ queryKey: ['scheduledMessages'] });
    },
  });
}

/**
 * Hook to get user's scheduled messages
 */
export function useUserScheduledMessages(status?: string) {
  return useQuery({
    queryKey: ['scheduledMessages', 'user', status],
    queryFn: () => schedulingAPI.getUserScheduledMessages(status),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

/**
 * Hook to get channel's scheduled messages
 */
export function useChannelScheduledMessages(channelId: string, status?: string) {
  return useQuery({
    queryKey: ['scheduledMessages', 'channel', channelId, status],
    queryFn: () => schedulingAPI.getChannelScheduledMessages(channelId, status),
    refetchInterval: 30000,
    enabled: !!channelId,
  });
}

/**
 * Hook to update a scheduled message
 */
export function useUpdateScheduledMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, updates }: {
      messageId: string;
      updates: {
        content?: string;
        messageType?: string;
        mentions?: string[];
        attachments?: any[];
        scheduledFor?: string;
        timezone?: string;
        maxRetries?: number;
      };
    }) => schedulingAPI.updateScheduledMessage(messageId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledMessages'] });
    },
  });
}

/**
 * Hook to cancel a scheduled message
 */
export function useCancelScheduledMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageId: string) => schedulingAPI.cancelScheduledMessage(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledMessages'] });
    },
  });
}

/**
 * Hook to get a specific scheduled message
 */
export function useScheduledMessage(messageId: string) {
  return useQuery({
    queryKey: ['scheduledMessages', 'single', messageId],
    queryFn: () => schedulingAPI.getScheduledMessage(messageId),
    enabled: !!messageId,
  });
}

/**
 * Hook to get scheduling statistics
 */
export function useSchedulingStats() {
  return useQuery({
    queryKey: ['schedulingStats'],
    queryFn: () => schedulingAPI.getSchedulingStats(),
    refetchInterval: 60000, // Refetch every minute
  });
}

/**
 * Hook to optimistically update scheduled message status
 */
export function useOptimisticScheduledMessageUpdate() {
  const queryClient = useQueryClient();

  const updateScheduledMessageOptimistically = (messageId: string, updates: Partial<ScheduledMessage>) => {
    // Update user's scheduled messages
    queryClient.setQueryData(['scheduledMessages', 'user'], (oldData: any) => {
      if (!oldData) return oldData;
      
      return {
        ...oldData,
        scheduledMessages: oldData.scheduledMessages.map((msg: ScheduledMessage) =>
          msg.id === messageId ? { ...msg, ...updates } : msg
        ),
      };
    });

    // Update channel scheduled messages
    queryClient.setQueriesData(
      { queryKey: ['scheduledMessages', 'channel'] },
      (oldData: any) => {
        if (!oldData) return oldData;
        
        return {
          ...oldData,
          scheduledMessages: oldData.scheduledMessages.map((msg: ScheduledMessage) =>
            msg.id === messageId ? { ...msg, ...updates } : msg
          ),
        };
      }
    );
  };

  return { updateScheduledMessageOptimistically };
}