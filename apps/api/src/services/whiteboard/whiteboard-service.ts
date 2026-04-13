/**
 * Whiteboard Collaboration Service
 * Real-time collaborative drawing and canvas management
 * Phase 4.2 - Whiteboard Collaboration
 */

import { getDatabase } from '../../database/connection';
import {
  whiteboard,
  whiteboardElement,
  whiteboardCollaborator,
  whiteboardHistory,
  whiteboardComment,
  whiteboardTemplate,
  whiteboardExport,
} from '../../database/schema/whiteboard';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '../logging/logger';

interface WhiteboardConfig {
  workspaceId: string;
  projectId?: string;
  taskId?: string;
  videoRoomId?: string;
  name: string;
  description?: string;
  templateType?: string;
  createdBy: string;
  width?: number;
  height?: number;
  backgroundColor?: string;
}

interface ElementConfig {
  whiteboardId: string;
  elementType: string;
  userId: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
  opacity?: number;
  pathData?: string;
  content?: string;
  fontSize?: number;
  fontFamily?: string;
  properties?: any;
}

export class WhiteboardService {
  private getDb() {
    return getDatabase();
  }

  /**
   * Create whiteboard
   */
  async createWhiteboard(config: WhiteboardConfig): Promise<any> {
    try {
      const [board] = await this.getDb()
        .insert(whiteboard)
        .values({
          workspaceId: config.workspaceId,
          projectId: config.projectId,
          taskId: config.taskId,
          videoRoomId: config.videoRoomId,
          name: config.name,
          description: config.description,
          templateType: config.templateType || 'blank',
          createdBy: config.createdBy,
          width: config.width || 3000,
          height: config.height || 2000,
          backgroundColor: config.backgroundColor || '#ffffff',
        })
        .returning();

      logger.info('Whiteboard created', { whiteboardId: board.id });
      return board;
    } catch (error: any) {
      logger.error('Failed to create whiteboard', { error: error.message });
      throw error;
    }
  }

  /**
   * Get whiteboard by ID with elements
   */
  async getWhiteboard(whiteboardId: string): Promise<any> {
    try {
      const [board] = await this.getDb()
        .select()
        .from(whiteboard)
        .where(eq(whiteboard.id, whiteboardId));

      if (!board) {
        throw new Error('Whiteboard not found');
      }

      // Get elements
      const elements = await this.getDb()
        .select()
        .from(whiteboardElement)
        .where(eq(whiteboardElement.whiteboardId, whiteboardId))
        .orderBy(whiteboardElement.zIndex);

      // Get active collaborators
      const collaborators = await this.getDb()
        .select()
        .from(whiteboardCollaborator)
        .where(and(
          eq(whiteboardCollaborator.whiteboardId, whiteboardId),
          eq(whiteboardCollaborator.isActive, true)
        ));

      return {
        ...board,
        elements,
        collaborators,
      };
    } catch (error: any) {
      logger.error('Failed to get whiteboard', { error: error.message });
      throw error;
    }
  }

  /**
   * Add element to whiteboard
   */
  async addElement(config: ElementConfig): Promise<any> {
    try {
      // Get max z-index
      const elements = await this.getDb()
        .select()
        .from(whiteboardElement)
        .where(eq(whiteboardElement.whiteboardId, config.whiteboardId));

      const maxZIndex = elements.reduce((max, el) => Math.max(max, el.zIndex || 0), 0);

      const [element] = await this.getDb()
        .insert(whiteboardElement)
        .values({
          ...config,
          zIndex: maxZIndex + 1,
        })
        .returning();

      // Track in history
      await this.trackHistory(
        config.whiteboardId,
        config.userId,
        'create',
        element.id,
        null,
        element
      );

      logger.info('Element added', { elementId: element.id });
      return element;
    } catch (error: any) {
      logger.error('Failed to add element', { error: error.message });
      throw error;
    }
  }

  /**
   * Update element
   */
  async updateElement(
    elementId: string,
    userId: string,
    updates: Partial<ElementConfig>
  ): Promise<any> {
    try {
      // Get current state
      const [current] = await this.getDb()
        .select()
        .from(whiteboardElement)
        .where(eq(whiteboardElement.id, elementId));

      if (!current) {
        throw new Error('Element not found');
      }

      // Update element
      const [updated] = await this.getDb()
        .update(whiteboardElement)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(whiteboardElement.id, elementId))
        .returning();

      // Track in history
      await this.trackHistory(
        current.whiteboardId,
        userId,
        'update',
        elementId,
        current,
        updated
      );

      return updated;
    } catch (error: any) {
      logger.error('Failed to update element', { error: error.message });
      throw error;
    }
  }

  /**
   * Delete element
   */
  async deleteElement(elementId: string, userId: string): Promise<void> {
    try {
      // Get current state
      const [element] = await this.getDb()
        .select()
        .from(whiteboardElement)
        .where(eq(whiteboardElement.id, elementId));

      if (!element) {
        throw new Error('Element not found');
      }

      // Delete element
      await this.getDb()
        .delete(whiteboardElement)
        .where(eq(whiteboardElement.id, elementId));

      // Track in history
      await this.trackHistory(
        element.whiteboardId,
        userId,
        'delete',
        elementId,
        element,
        null
      );

      logger.info('Element deleted', { elementId });
    } catch (error: any) {
      logger.error('Failed to delete element', { error: error.message });
      throw error;
    }
  }

  /**
   * Join whiteboard (add collaborator)
   */
  async joinWhiteboard(
    whiteboardId: string,
    userId: string,
    displayName: string,
    role: string = 'editor'
  ): Promise<any> {
    try {
      // Check if already joined
      const existing = await this.getDb()
        .select()
        .from(whiteboardCollaborator)
        .where(and(
          eq(whiteboardCollaborator.whiteboardId, whiteboardId),
          eq(whiteboardCollaborator.userId, userId)
        ));

      if (existing.length > 0) {
        // Update to active
        const [collaborator] = await this.getDb()
          .update(whiteboardCollaborator)
          .set({
            isActive: true,
            lastSeenAt: new Date(),
          })
          .where(eq(whiteboardCollaborator.id, existing[0].id))
          .returning();

        return collaborator;
      }

      // Generate cursor color
      const cursorColor = this.generateCursorColor(userId);

      // Add new collaborator
      const [collaborator] = await this.getDb()
        .insert(whiteboardCollaborator)
        .values({
          whiteboardId,
          userId,
          displayName,
          role,
          cursorColor,
          isActive: true,
        })
        .returning();

      logger.info('Collaborator joined', { whiteboardId, userId });
      return collaborator;
    } catch (error: any) {
      logger.error('Failed to join whiteboard', { error: error.message });
      throw error;
    }
  }

  /**
   * Leave whiteboard
   */
  async leaveWhiteboard(whiteboardId: string, userId: string): Promise<void> {
    try {
      await this.getDb()
        .update(whiteboardCollaborator)
        .set({
          isActive: false,
          lastSeenAt: new Date(),
        })
        .where(and(
          eq(whiteboardCollaborator.whiteboardId, whiteboardId),
          eq(whiteboardCollaborator.userId, userId)
        ));

      logger.info('Collaborator left', { whiteboardId, userId });
    } catch (error: any) {
      logger.error('Failed to leave whiteboard', { error: error.message });
      throw error;
    }
  }

  /**
   * Update cursor position
   */
  async updateCursor(
    whiteboardId: string,
    userId: string,
    cursorX: number,
    cursorY: number
  ): Promise<void> {
    try {
      await this.getDb()
        .update(whiteboardCollaborator)
        .set({
          cursorX,
          cursorY,
          lastSeenAt: new Date(),
        })
        .where(and(
          eq(whiteboardCollaborator.whiteboardId, whiteboardId),
          eq(whiteboardCollaborator.userId, userId)
        ));
    } catch (error: any) {
      // Don't log cursor updates to reduce noise
    }
  }

  /**
   * Add comment
   */
  async addComment(
    whiteboardId: string,
    userId: string,
    content: string,
    x: number,
    y: number,
    elementId?: string
  ): Promise<any> {
    try {
      const [comment] = await this.getDb()
        .insert(whiteboardComment)
        .values({
          whiteboardId,
          elementId,
          userId,
          content,
          x,
          y,
        })
        .returning();

      logger.info('Comment added', { commentId: comment.id });
      return comment;
    } catch (error: any) {
      logger.error('Failed to add comment', { error: error.message });
      throw error;
    }
  }

  /**
   * Get comments
   */
  async getComments(whiteboardId: string): Promise<any[]> {
    try {
      const comments = await this.getDb()
        .select()
        .from(whiteboardComment)
        .where(eq(whiteboardComment.whiteboardId, whiteboardId))
        .orderBy(desc(whiteboardComment.createdAt));

      return comments;
    } catch (error: any) {
      logger.error('Failed to get comments', { error: error.message });
      throw error;
    }
  }

  /**
   * Create template from whiteboard
   */
  async createTemplate(
    whiteboardId: string,
    userId: string,
    name: string,
    description: string,
    category: string
  ): Promise<any> {
    try {
      const board = await this.getWhiteboard(whiteboardId);

      const [template] = await this.getDb()
        .insert(whiteboardTemplate)
        .values({
          workspaceId: board.workspaceId,
          name,
          description,
          category,
          templateData: { elements: board.elements },
          createdBy: userId,
        })
        .returning();

      logger.info('Template created', { templateId: template.id });
      return template;
    } catch (error: any) {
      logger.error('Failed to create template', { error: error.message });
      throw error;
    }
  }

  /**
   * Get templates
   */
  async getTemplates(workspaceId?: string): Promise<any[]> {
    try {
      if (workspaceId) {
        const templates = await this.getDb()
          .select()
          .from(whiteboardTemplate)
          .where(eq(whiteboardTemplate.workspaceId, workspaceId));

        return templates;
      }

      // Get public templates
      const templates = await this.getDb()
        .select()
        .from(whiteboardTemplate)
        .where(eq(whiteboardTemplate.isPublic, true));

      return templates;
    } catch (error: any) {
      logger.error('Failed to get templates', { error: error.message });
      throw error;
    }
  }

  /**
   * Export whiteboard
   */
  async exportWhiteboard(
    whiteboardId: string,
    userId: string,
    format: string,
    resolution: string = '1x'
  ): Promise<any> {
    try {
      // Generate export (would integrate with export service)
      const fileUrl = `/exports/${whiteboardId}/${Date.now()}.${format}`;
      const fileSize = 1024 * 1024; // Placeholder

      const [exportRecord] = await this.getDb()
        .insert(whiteboardExport)
        .values({
          whiteboardId,
          userId,
          format,
          fileUrl,
          fileSize,
          resolution,
        })
        .returning();

      logger.info('Whiteboard exported', { exportId: exportRecord.id });
      return exportRecord;
    } catch (error: any) {
      logger.error('Failed to export whiteboard', { error: error.message });
      throw error;
    }
  }

  /**
   * Get history
   */
  async getHistory(whiteboardId: string, limit: number = 50): Promise<any[]> {
    try {
      const history = await this.getDb()
        .select()
        .from(whiteboardHistory)
        .where(eq(whiteboardHistory.whiteboardId, whiteboardId))
        .orderBy(desc(whiteboardHistory.timestamp))
        .limit(limit);

      return history;
    } catch (error: any) {
      logger.error('Failed to get history', { error: error.message });
      throw error;
    }
  }

  /**
   * Track history
   */
  private async trackHistory(
    whiteboardId: string,
    userId: string,
    action: string,
    elementId: string | null,
    previousState: any,
    newState: any
  ): Promise<void> {
    try {
      await this.getDb().insert(whiteboardHistory).values({
        whiteboardId,
        userId,
        action,
        elementId,
        previousState,
        newState,
      });
    } catch (error: any) {
      logger.error('Failed to track history', { error: error.message });
    }
  }

  /**
   * Generate cursor color
   */
  private generateCursorColor(userId: string): string {
    const colors = [
      '#3b82f6', // blue
      '#ef4444', // red
      '#10b981', // green
      '#f59e0b', // amber
      '#8b5cf6', // purple
      '#ec4899', // pink
      '#06b6d4', // cyan
      '#f97316', // orange
    ];

    // Generate color based on user ID
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }
}

export default WhiteboardService;



