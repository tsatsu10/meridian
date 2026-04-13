// @epic-3.1-messaging: Message scheduling API service
// @persona-sarah: PM needs to schedule messages for team coordination
// @persona-david: Team lead needs to schedule reminders and announcements

import { ScheduleData } from '@/components/schedule/schedule-picker';
import { fetchApi } from '@/lib/fetch';

export interface ScheduledMessage {
  id: string;
  channelId: string;
  userEmail: string;
  content: string;
  messageType: string;
  scheduledFor: string;
  scheduledForLocal: string;
  timezone: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  sentAt?: string;
  sentMessageId?: string;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  mentions: string[];
  attachments: any[];
  createdAt: string;
  updatedAt: string;
}

export interface SchedulingStats {
  totalScheduled: number;
  pending: number;
  sent: number;
  failed: number;
  cancelled: number;
  upcomingIn24Hours: number;
  averageSuccessRate: number;
}

class SchedulingAPI {
  private baseUrl = '/message';

  /**
   * Schedule a new message
   */
  async scheduleMessage(data: {
    channelId: string;
    content: string;
    scheduleData: ScheduleData;
    messageType?: string;
    parentMessageId?: string;
    mentions?: string[];
    attachments?: File[];
    maxRetries?: number;
  }): Promise<{ success: boolean; scheduledMessageId: string; scheduledFor: string; timezone: string }> {
    // Handle file uploads if attachments are provided
    let attachmentData: any[] = [];
    if (data.attachments && data.attachments.length > 0) {
      // TODO: Implement file upload to attachments API
      // For now, we'll pass file metadata
      attachmentData = data.attachments.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
        // In a real implementation, upload the file and get the URL
        url: URL.createObjectURL(file)
      }));
    }

    return fetchApi(`${this.baseUrl}/schedule`, {
      method: 'POST',
      body: JSON.stringify({
        channelId: data.channelId,
        content: data.content,
        messageType: data.messageType || 'text',
        parentMessageId: data.parentMessageId,
        mentions: data.mentions || [],
        attachments: attachmentData,
        scheduledFor: data.scheduleData.scheduledFor.toISOString(),
        timezone: data.scheduleData.timezone,
        maxRetries: data.maxRetries || 3,
      }),
    });
  }

  /**
   * Get user's scheduled messages
   */
  async getUserScheduledMessages(status?: string): Promise<{
    scheduledMessages: ScheduledMessage[];
    count: number;
    status: string;
  }> {
    const params = new URLSearchParams();
    if (status && status !== 'all') {
      params.set('status', status);
    }

    return fetchApi(`${this.baseUrl}/scheduled?${params}`);
  }

  /**
   * Get scheduled messages for a channel
   */
  async getChannelScheduledMessages(channelId: string, status?: string): Promise<{
    scheduledMessages: ScheduledMessage[];
    channelId: string;
    count: number;
    status: string;
  }> {
    const params = new URLSearchParams();
    if (status && status !== 'all') {
      params.set('status', status);
    }

    return fetchApi(`${this.baseUrl}/channel/${channelId}/scheduled?${params}`);
  }

  /**
   * Update a scheduled message
   */
  async updateScheduledMessage(messageId: string, updates: {
    content?: string;
    messageType?: string;
    mentions?: string[];
    attachments?: any[];
    scheduledFor?: string;
    timezone?: string;
    maxRetries?: number;
  }): Promise<{
    success: boolean;
    messageId: string;
    updated: string[];
  }> {
    return fetchApi(`${this.baseUrl}/scheduled/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Cancel a scheduled message
   */
  async cancelScheduledMessage(messageId: string): Promise<{
    success: boolean;
    messageId: string;
    status: string;
  }> {
    return fetchApi(`${this.baseUrl}/scheduled/${messageId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get a specific scheduled message
   */
  async getScheduledMessage(messageId: string): Promise<{
    scheduledMessage: ScheduledMessage;
  }> {
    return fetchApi(`${this.baseUrl}/scheduled/${messageId}`);
  }

  /**
   * Get scheduling statistics
   */
  async getSchedulingStats(): Promise<{
    stats: SchedulingStats;
    timestamp: string;
  }> {
    return fetchApi(`${this.baseUrl}/scheduled/stats`);
  }
}

export const schedulingAPI = new SchedulingAPI();
export default schedulingAPI;