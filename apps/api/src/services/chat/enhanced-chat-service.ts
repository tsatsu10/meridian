/**
 * Enhanced Chat Service
 * Advanced messaging features with threading, voice, and AI
 * Phase 4.3 - Enhanced Chat Features
 */

import { getDatabase } from '../../database/connection';
import {
  messageThread,
  threadMessage,
  pinnedMessage,
  messageReaction,
  voiceMessage,
  messageSearchIndex,
  aiMessageSummary,
  messageReadReceipt,
  messageDraft,
} from '../../database/schema/enhanced-chat';
import { eq, and, desc, like, inArray, sql } from 'drizzle-orm';
import { logger } from '../logging/logger';

interface ThreadConfig {
  channelId: string;
  parentMessageId: string;
  title?: string;
  createdBy: string;
}

interface ThreadMessageConfig {
  threadId: string;
  userId: string;
  content: string;
  contentHtml?: string;
  messageType?: string;
  voiceUrl?: string;
  voiceDuration?: number;
  attachments?: any[];
  mentions?: string[];
}

export class EnhancedChatService {
  private getDb() {
    return getDatabase();
  }

  /**
   * Create message thread
   */
  async createThread(config: ThreadConfig): Promise<any> {
    try {
      const [thread] = await this.getDb()
        .insert(messageThread)
        .values({
          channelId: config.channelId,
          parentMessageId: config.parentMessageId,
          title: config.title,
          createdBy: config.createdBy,
          lastMessageAt: new Date(),
        })
        .returning();

      logger.info('Thread created', { threadId: thread.id });
      return thread;
    } catch (error: any) {
      logger.error('Failed to create thread', { error: error.message });
      throw error;
    }
  }

  /**
   * Add message to thread
   */
  async addThreadMessage(config: ThreadMessageConfig): Promise<any> {
    try {
      const [message] = await this.getDb()
        .insert(threadMessage)
        .values({
          threadId: config.threadId,
          userId: config.userId,
          content: config.content,
          contentHtml: config.contentHtml,
          messageType: config.messageType || 'text',
          voiceUrl: config.voiceUrl,
          voiceDuration: config.voiceDuration,
          attachments: config.attachments || [],
          mentions: config.mentions || [],
        })
        .returning();

      // Update thread stats
      await this.getDb()
        .update(messageThread)
        .set({
          messageCount: sql`${messageThread.messageCount} + 1`,
          lastMessageAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(messageThread.id, config.threadId));

      logger.info('Thread message added', { messageId: message.id });
      return message;
    } catch (error: any) {
      logger.error('Failed to add thread message', { error: error.message });
      throw error;
    }
  }

  /**
   * Get thread with messages
   */
  async getThread(threadId: string, limit: number = 50): Promise<any> {
    try {
      const [thread] = await this.getDb()
        .select()
        .from(messageThread)
        .where(eq(messageThread.id, threadId));

      if (!thread) {
        throw new Error('Thread not found');
      }

      const messages = await this.getDb()
        .select()
        .from(threadMessage)
        .where(and(
          eq(threadMessage.threadId, threadId),
          eq(threadMessage.isDeleted, false)
        ))
        .orderBy(threadMessage.createdAt)
        .limit(limit);

      return {
        ...thread,
        messages,
      };
    } catch (error: any) {
      logger.error('Failed to get thread', { error: error.message });
      throw error;
    }
  }

  /**
   * Resolve thread
   */
  async resolveThread(threadId: string, userId: string): Promise<any> {
    try {
      const [thread] = await this.getDb()
        .update(messageThread)
        .set({
          isResolved: true,
          resolvedBy: userId,
          resolvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(messageThread.id, threadId))
        .returning();

      return thread;
    } catch (error: any) {
      logger.error('Failed to resolve thread', { error: error.message });
      throw error;
    }
  }

  /**
   * Pin message
   */
  async pinMessage(
    channelId: string,
    messageId: string,
    userId: string,
    note?: string,
    expiresAt?: Date
  ): Promise<any> {
    try {
      const [pin] = await this.getDb()
        .insert(pinnedMessage)
        .values({
          channelId,
          messageId,
          pinnedBy: userId,
          note,
          expiresAt,
        })
        .returning();

      logger.info('Message pinned', { pinId: pin.id });
      return pin;
    } catch (error: any) {
      logger.error('Failed to pin message', { error: error.message });
      throw error;
    }
  }

  /**
   * Unpin message
   */
  async unpinMessage(pinId: string): Promise<void> {
    try {
      await this.getDb().delete(pinnedMessage).where(eq(pinnedMessage.id, pinId));
      logger.info('Message unpinned', { pinId });
    } catch (error: any) {
      logger.error('Failed to unpin message', { error: error.message });
      throw error;
    }
  }

  /**
   * Get pinned messages
   */
  async getPinnedMessages(channelId: string): Promise<any[]> {
    try {
      const pins = await this.getDb()
        .select()
        .from(pinnedMessage)
        .where(eq(pinnedMessage.channelId, channelId))
        .orderBy(desc(pinnedMessage.pinnedAt));

      return pins;
    } catch (error: any) {
      logger.error('Failed to get pinned messages', { error: error.message });
      throw error;
    }
  }

  /**
   * Add reaction
   */
  async addReaction(messageId: string, userId: string, emoji: string): Promise<any> {
    try {
      // Check if reaction already exists
      const existing = await this.getDb()
        .select()
        .from(messageReaction)
        .where(and(
          eq(messageReaction.messageId, messageId),
          eq(messageReaction.userId, userId),
          eq(messageReaction.emoji, emoji)
        ));

      if (existing.length > 0) {
        return existing[0];
      }

      const [reaction] = await this.getDb()
        .insert(messageReaction)
        .values({
          messageId,
          userId,
          emoji,
        })
        .returning();

      return reaction;
    } catch (error: any) {
      logger.error('Failed to add reaction', { error: error.message });
      throw error;
    }
  }

  /**
   * Remove reaction
   */
  async removeReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    try {
      await this.getDb()
        .delete(messageReaction)
        .where(and(
          eq(messageReaction.messageId, messageId),
          eq(messageReaction.userId, userId),
          eq(messageReaction.emoji, emoji)
        ));
    } catch (error: any) {
      logger.error('Failed to remove reaction', { error: error.message });
      throw error;
    }
  }

  /**
   * Get message reactions
   */
  async getReactions(messageId: string): Promise<any[]> {
    try {
      const reactions = await this.getDb()
        .select()
        .from(messageReaction)
        .where(eq(messageReaction.messageId, messageId));

      return reactions;
    } catch (error: any) {
      logger.error('Failed to get reactions', { error: error.message });
      throw error;
    }
  }

  /**
   * Create voice message
   */
  async createVoiceMessage(
    messageId: string,
    userId: string,
    fileUrl: string,
    duration: number,
    fileSize?: number,
    waveformData?: any
  ): Promise<any> {
    try {
      const [voice] = await this.getDb()
        .insert(voiceMessage)
        .values({
          messageId,
          userId,
          fileUrl,
          duration,
          fileSize,
          waveformData,
        })
        .returning();

      logger.info('Voice message created', { voiceId: voice.id });
      return voice;
    } catch (error: any) {
      logger.error('Failed to create voice message', { error: error.message });
      throw error;
    }
  }

  /**
   * Search messages
   */
  async searchMessages(
    workspaceId: string,
    query: string,
    channelId?: string,
    limit: number = 20
  ): Promise<any[]> {
    try {
      let searchQuery = this.getDb()
        .select()
        .from(messageSearchIndex)
        .where(eq(messageSearchIndex.workspaceId, workspaceId));

      if (channelId) {
        searchQuery = searchQuery.where(eq(messageSearchIndex.channelId, channelId));
      }

      // Simple text search (would use full-text search in production)
      const results = await searchQuery
        .where(like(messageSearchIndex.content, `%${query}%`))
        .orderBy(desc(messageSearchIndex.createdAt))
        .limit(limit);

      return results;
    } catch (error: any) {
      logger.error('Failed to search messages', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate AI summary
   */
  async generateSummary(
    channelId: string,
    summaryType: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    try {
      // This would integrate with AI service (OpenAI, Anthropic, etc.)
      // For now, return placeholder
      const summary = `AI-generated summary for ${summaryType} from ${startDate.toDateString()} to ${endDate.toDateString()}`;
      const keyPoints = [
        'Key discussion point 1',
        'Key discussion point 2',
        'Key discussion point 3',
      ];
      const actionItems = [
        'Action item 1',
        'Action item 2',
      ];

      const [result] = await this.getDb()
        .insert(aiMessageSummary)
        .values({
          channelId,
          summaryType,
          startDate,
          endDate,
          summary,
          keyPoints,
          actionItems,
          sentiment: 'neutral',
        })
        .returning();

      logger.info('Summary generated', { summaryId: result.id });
      return result;
    } catch (error: any) {
      logger.error('Failed to generate summary', { error: error.message });
      throw error;
    }
  }

  /**
   * Get summaries
   */
  async getSummaries(channelId?: string, threadId?: string, limit: number = 10): Promise<any[]> {
    try {
      let query = this.getDb().select().from(aiMessageSummary);

      if (channelId) {
        query = query.where(eq(aiMessageSummary.channelId, channelId));
      }

      if (threadId) {
        query = query.where(eq(aiMessageSummary.threadId, threadId));
      }

      const summaries = await query
        .orderBy(desc(aiMessageSummary.generatedAt))
        .limit(limit);

      return summaries;
    } catch (error: any) {
      logger.error('Failed to get summaries', { error: error.message });
      throw error;
    }
  }

  /**
   * Mark as read
   */
  async markAsRead(messageId: string, userId: string, threadId?: string): Promise<void> {
    try {
      await this.getDb().insert(messageReadReceipt).values({
        messageId,
        threadId,
        userId,
      });
    } catch (error: any) {
      // Silently fail for read receipts
    }
  }

  /**
   * Save draft
   */
  async saveDraft(
    userId: string,
    content: string,
    contentHtml?: string,
    channelId?: string,
    threadId?: string,
    attachments?: any[]
  ): Promise<any> {
    try {
      // Check if draft exists
      let query = this.getDb()
        .select()
        .from(messageDraft)
        .where(eq(messageDraft.userId, userId));

      if (channelId) {
        query = query.where(eq(messageDraft.channelId, channelId));
      }

      if (threadId) {
        query = query.where(eq(messageDraft.threadId, threadId));
      }

      const existing = await query;

      if (existing.length > 0) {
        // Update existing draft
        const [draft] = await this.getDb()
          .update(messageDraft)
          .set({
            content,
            contentHtml,
            attachments: attachments || [],
            updatedAt: new Date(),
          })
          .where(eq(messageDraft.id, existing[0].id))
          .returning();

        return draft;
      }

      // Create new draft
      const [draft] = await this.getDb()
        .insert(messageDraft)
        .values({
          userId,
          channelId,
          threadId,
          content,
          contentHtml,
          attachments: attachments || [],
        })
        .returning();

      return draft;
    } catch (error: any) {
      logger.error('Failed to save draft', { error: error.message });
      throw error;
    }
  }

  /**
   * Get draft
   */
  async getDraft(userId: string, channelId?: string, threadId?: string): Promise<any> {
    try {
      let query = this.getDb()
        .select()
        .from(messageDraft)
        .where(eq(messageDraft.userId, userId));

      if (channelId) {
        query = query.where(eq(messageDraft.channelId, channelId));
      }

      if (threadId) {
        query = query.where(eq(messageDraft.threadId, threadId));
      }

      const drafts = await query.limit(1);
      return drafts[0] || null;
    } catch (error: any) {
      logger.error('Failed to get draft', { error: error.message });
      throw error;
    }
  }

  /**
   * Delete draft
   */
  async deleteDraft(draftId: string): Promise<void> {
    try {
      await this.getDb().delete(messageDraft).where(eq(messageDraft.id, draftId));
    } catch (error: any) {
      logger.error('Failed to delete draft', { error: error.message });
      throw error;
    }
  }
}

export default EnhancedChatService;



