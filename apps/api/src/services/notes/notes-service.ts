/**
 * Notes Service
 * Phase 2.6 - Project Notes System
 * 
 * Handles all note operations including:
 * - CRUD operations
 * - Version history
 * - Real-time collaboration
 * - Comments
 * - Templates
 */

import { getDatabase } from '../../database/connection';
import { note, noteVersion, noteComment, noteCollaborator, noteTemplate } from '../../database/schema/notes';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { logger } from '../logging/logger';

export class NotesService {
  private getDb() {
    return getDatabase();
  }

  /**
   * Create a new note
   */
  async createNote(data: {
    title: string;
    content: any; // TipTap JSON
    contentHtml: string;
    contentText: string;
    projectId?: string;
    taskId?: string;
    createdBy: string;
    visibility?: string;
  }): Promise<any> {
    try {
      // Create note
      const [newNote] = await this.getDb().insert(note).values({
        title: data.title,
        content: data.content,
        contentHtml: data.contentHtml,
        contentText: data.contentText,
        projectId: data.projectId,
        taskId: data.taskId,
        createdBy: data.createdBy,
        lastEditedBy: data.createdBy,
        visibility: data.visibility || 'project',
        currentVersion: 1,
      }).returning();

      // Create initial version
      await this.getDb().insert(noteVersion).values({
        noteId: newNote.id,
        version: 1,
        content: data.content,
        contentHtml: data.contentHtml,
        changedBy: data.createdBy,
        changeType: 'create',
        addedCharacters: data.contentText.length,
        deletedCharacters: 0,
      });

      logger.info('[Notes] Note created', {
        noteId: newNote.id,
        userId: data.createdBy,
      });

      return newNote;
    } catch (error: any) {
      logger.error('[Notes] Failed to create note', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Update a note
   */
  async updateNote(
    noteId: string,
    userId: string,
    data: {
      title?: string;
      content?: any;
      contentHtml?: string;
      contentText?: string;
      changeDescription?: string;
    }
  ): Promise<any> {
    try {
      // Get current note
      const [currentNote] = await this.getDb()
        .select()
        .from(note)
        .where(eq(note.id, noteId))
        .limit(1);

      if (!currentNote) {
        throw new Error('Note not found');
      }

      // Check if note is locked
      if (currentNote.isLocked && currentNote.lockedBy !== userId) {
        throw new Error('Note is locked by another user');
      }

      const newVersion = currentNote.currentVersion + 1;

      // Calculate character changes
      const oldLength = currentNote.contentText?.length || 0;
      const newLength = data.contentText?.length || oldLength;
      const added = Math.max(0, newLength - oldLength);
      const deleted = Math.max(0, oldLength - newLength);

      // Update note
      const [updatedNote] = await this.getDb()
        .update(note)
        .set({
          title: data.title || currentNote.title,
          content: data.content || currentNote.content,
          contentHtml: data.contentHtml || currentNote.contentHtml,
          contentText: data.contentText || currentNote.contentText,
          currentVersion: newVersion,
          lastEditedBy: userId,
          updatedAt: new Date(),
        })
        .where(eq(note.id, noteId))
        .returning();

      // Create version history
      await this.getDb().insert(noteVersion).values({
        noteId,
        version: newVersion,
        content: data.content || currentNote.content,
        contentHtml: data.contentHtml || currentNote.contentHtml,
        changedBy: userId,
        changeDescription: data.changeDescription,
        changeType: 'edit',
        addedCharacters: added,
        deletedCharacters: deleted,
      });

      logger.info('[Notes] Note updated', {
        noteId,
        userId,
        version: newVersion,
      });

      return updatedNote;
    } catch (error: any) {
      logger.error('[Notes] Failed to update note', {
        error: error.message,
        noteId,
      });
      throw error;
    }
  }

  /**
   * Get note by ID with version history
   */
  async getNoteById(noteId: string, includeVersions = false): Promise<any> {
    try {
      const [noteData] = await this.getDb()
        .select()
        .from(note)
        .where(eq(note.id, noteId))
        .limit(1);

      if (!noteData) {
        throw new Error('Note not found');
      }

      if (includeVersions) {
        const versions = await this.getDb()
          .select()
          .from(noteVersion)
          .where(eq(noteVersion.noteId, noteId))
          .orderBy(desc(noteVersion.version));

        return {
          ...noteData,
          versions,
        };
      }

      return noteData;
    } catch (error: any) {
      logger.error('[Notes] Failed to get note', {
        error: error.message,
        noteId,
      });
      throw error;
    }
  }

  /**
   * Get all notes for a project or task
   */
  async getNotes(filters: {
    projectId?: string;
    taskId?: string;
    userId?: string;
    visibility?: string;
    isPinned?: boolean;
    isArchived?: boolean;
  }): Promise<any[]> {
    try {
      const conditions: any[] = [];

      if (filters.projectId) {
        conditions.push(eq(note.projectId, filters.projectId));
      }

      if (filters.taskId) {
        conditions.push(eq(note.taskId, filters.taskId));
      }

      if (filters.visibility) {
        conditions.push(eq(note.visibility, filters.visibility));
      }

      if (filters.isPinned !== undefined) {
        conditions.push(eq(note.isPinned, filters.isPinned));
      }

      if (filters.isArchived !== undefined) {
        conditions.push(eq(note.isArchived, filters.isArchived));
      }

      const notes = await this.getDb()
        .select()
        .from(note)
        .where(and(...conditions))
        .orderBy(desc(note.updatedAt));

      return notes;
    } catch (error: any) {
      logger.error('[Notes] Failed to get notes', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Delete a note
   */
  async deleteNote(noteId: string, userId: string): Promise<void> {
    try {
      // Verify ownership or permissions
      const [noteData] = await this.getDb()
        .select()
        .from(note)
        .where(eq(note.id, noteId))
        .limit(1);

      if (!noteData) {
        throw new Error('Note not found');
      }

      if (noteData.createdBy !== userId) {
        throw new Error('Unauthorized to delete this note');
      }

      // Delete note (cascade will handle versions, comments, collaborators)
      await this.getDb().delete(note).where(eq(note.id, noteId));

      logger.info('[Notes] Note deleted', {
        noteId,
        userId,
      });
    } catch (error: any) {
      logger.error('[Notes] Failed to delete note', {
        error: error.message,
        noteId,
      });
      throw error;
    }
  }

  /**
   * Restore a previous version
   */
  async restoreVersion(
    noteId: string,
    versionNumber: number,
    userId: string
  ): Promise<any> {
    try {
      // Get the version to restore
      const [version] = await this.getDb()
        .select()
        .from(noteVersion)
        .where(
          and(
            eq(noteVersion.noteId, noteId),
            eq(noteVersion.version, versionNumber)
          )
        )
        .limit(1);

      if (!version) {
        throw new Error('Version not found');
      }

      // Get current note for version increment
      const [currentNote] = await this.getDb()
        .select()
        .from(note)
        .where(eq(note.id, noteId))
        .limit(1);

      if (!currentNote) {
        throw new Error('Note not found');
      }

      const newVersion = currentNote.currentVersion + 1;

      // Update note with restored content
      const [updatedNote] = await this.getDb()
        .update(note)
        .set({
          content: version.content,
          contentHtml: version.contentHtml,
          currentVersion: newVersion,
          lastEditedBy: userId,
          updatedAt: new Date(),
        })
        .where(eq(note.id, noteId))
        .returning();

      // Create new version entry for the restore
      await this.getDb().insert(noteVersion).values({
        noteId,
        version: newVersion,
        content: version.content,
        contentHtml: version.contentHtml,
        changedBy: userId,
        changeDescription: `Restored version ${versionNumber}`,
        changeType: 'restore',
      });

      logger.info('[Notes] Version restored', {
        noteId,
        restoredVersion: versionNumber,
        newVersion,
        userId,
      });

      return updatedNote;
    } catch (error: any) {
      logger.error('[Notes] Failed to restore version', {
        error: error.message,
        noteId,
        versionNumber,
      });
      throw error;
    }
  }

  /**
   * Add a comment to a note
   */
  async addComment(data: {
    noteId: string;
    userId: string;
    content: string;
    parentCommentId?: string;
    selectionStart?: number;
    selectionEnd?: number;
    selectedText?: string;
  }): Promise<any> {
    try {
      const [comment] = await this.getDb().insert(noteComment).values({
        noteId: data.noteId,
        userId: data.userId,
        content: data.content,
        parentCommentId: data.parentCommentId,
        selectionStart: data.selectionStart,
        selectionEnd: data.selectionEnd,
        selectedText: data.selectedText,
      }).returning();

      logger.info('[Notes] Comment added', {
        noteId: data.noteId,
        commentId: comment.id,
        userId: data.userId,
      });

      return comment;
    } catch (error: any) {
      logger.error('[Notes] Failed to add comment', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get comments for a note
   */
  async getComments(noteId: string): Promise<any[]> {
    try {
      const comments = await this.getDb()
        .select()
        .from(noteComment)
        .where(eq(noteComment.noteId, noteId))
        .orderBy(noteComment.createdAt);

      return comments;
    } catch (error: any) {
      logger.error('[Notes] Failed to get comments', {
        error: error.message,
        noteId,
      });
      throw error;
    }
  }

  /**
   * Join note collaboration session
   */
  async joinCollaboration(
    noteId: string,
    userId: string,
    color: string
  ): Promise<any> {
    try {
      // Check if user already has an active session
      const existing = await this.getDb()
        .select()
        .from(noteCollaborator)
        .where(
          and(
            eq(noteCollaborator.noteId, noteId),
            eq(noteCollaborator.userId, userId),
            eq(noteCollaborator.isActive, true)
          )
        );

      if (existing.length > 0) {
        // Update last activity
        const [updated] = await this.getDb()
          .update(noteCollaborator)
          .set({ lastActivity: new Date() })
          .where(eq(noteCollaborator.id, existing[0].id))
          .returning();
        
        return updated;
      }

      // Create new collaboration session
      const [collaborator] = await this.getDb().insert(noteCollaborator).values({
        noteId,
        userId,
        color,
        isActive: true,
      }).returning();

      logger.info('[Notes] User joined collaboration', {
        noteId,
        userId,
      });

      return collaborator;
    } catch (error: any) {
      logger.error('[Notes] Failed to join collaboration', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Leave note collaboration session
   */
  async leaveCollaboration(noteId: string, userId: string): Promise<void> {
    try {
      await this.getDb()
        .update(noteCollaborator)
        .set({ isActive: false })
        .where(
          and(
            eq(noteCollaborator.noteId, noteId),
            eq(noteCollaborator.userId, userId)
          )
        );

      logger.info('[Notes] User left collaboration', {
        noteId,
        userId,
      });
    } catch (error: any) {
      logger.error('[Notes] Failed to leave collaboration', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get active collaborators for a note
   */
  async getActiveCollaborators(noteId: string): Promise<any[]> {
    try {
      const collaborators = await this.getDb()
        .select()
        .from(noteCollaborator)
        .where(
          and(
            eq(noteCollaborator.noteId, noteId),
            eq(noteCollaborator.isActive, true)
          )
        );

      return collaborators;
    } catch (error: any) {
      logger.error('[Notes] Failed to get collaborators', {
        error: error.message,
        noteId,
      });
      throw error;
    }
  }

  /**
   * Create a note template
   */
  async createTemplate(data: {
    name: string;
    description?: string;
    category?: string;
    content: any;
    contentHtml: string;
    createdBy?: string;
    isPublic?: boolean;
  }): Promise<any> {
    try {
      const [template] = await this.getDb().insert(noteTemplate).values({
        name: data.name,
        description: data.description,
        category: data.category,
        content: data.content,
        contentHtml: data.contentHtml,
        createdBy: data.createdBy,
        isPublic: data.isPublic || false,
      }).returning();

      logger.info('[Notes] Template created', {
        templateId: template.id,
        name: data.name,
      });

      return template;
    } catch (error: any) {
      logger.error('[Notes] Failed to create template', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get note templates
   */
  async getTemplates(filters: {
    category?: string;
    isPublic?: boolean;
    createdBy?: string;
  }): Promise<any[]> {
    try {
      const conditions: any[] = [];

      if (filters.category) {
        conditions.push(eq(noteTemplate.category, filters.category));
      }

      if (filters.isPublic !== undefined) {
        conditions.push(eq(noteTemplate.isPublic, filters.isPublic));
      }

      if (filters.createdBy) {
        conditions.push(eq(noteTemplate.createdBy, filters.createdBy));
      }

      const templates = await this.getDb()
        .select()
        .from(noteTemplate)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(noteTemplate.usageCount));

      return templates;
    } catch (error: any) {
      logger.error('[Notes] Failed to get templates', {
        error: error.message,
      });
      throw error;
    }
  }
}

export const notesService = new NotesService();



