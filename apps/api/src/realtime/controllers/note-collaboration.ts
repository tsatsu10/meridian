/**
 * Note Collaboration Handler - Phase 5.3
 * Real-time collaboration features for project notes
 * Handles live editing, cursor positions, presence indicators, and notifications
 */

import { Socket } from 'socket.io';
import { getDatabase } from '../../database/connection';
import { projectNotesTable, users } from '../../database/schema';
import { eq } from 'drizzle-orm';
import logger from '../../utils/logger';

interface CursorPosition {
  userEmail: string;
  userName: string;
  position: number; // Cursor offset in content
  selection?: { start: number; end: number }; // Selection range
  color: string; // User-specific cursor color
}

interface NotePresence {
  noteId: string;
  users: Map<string, {
    userEmail: string;
    userName: string;
    socketId: string;
    color: string;
    lastActivity: Date;
  }>;
}

interface NoteEdit {
  noteId: string;
  userEmail: string;
  userName: string;
  timestamp: Date;
  changes: {
    type: 'insert' | 'delete' | 'replace';
    position: number;
    content?: string;
    length?: number;
  }[];
}

export class NoteCollaborationHandler {
  private noteRooms: Map<string, NotePresence> = new Map();
  private cursors: Map<string, Map<string, CursorPosition>> = new Map(); // noteId -> userEmail -> position
  private userColors: Map<string, string> = new Map(); // userEmail -> color

  constructor() {
    this.initializeUserColors();
  }

  /**
   * Initialize a pool of colors for user cursors
   */
  private initializeUserColors() {
    // Predefined colors for cursors (high contrast, accessible)
    this.colorPool = [
      '#3B82F6', // Blue
      '#EF4444', // Red
      '#10B981', // Green
      '#F59E0B', // Amber
      '#8B5CF6', // Purple
      '#EC4899', // Pink
      '#14B8A6', // Teal
      '#F97316', // Orange
      '#06B6D4', // Cyan
      '#84CC16', // Lime
    ];
  }

  private colorPool: string[] = [];

  /**
   * Get or assign a color for a user
   */
  private getUserColor(userEmail: string): string {
    if (this.userColors.has(userEmail)) {
      return this.userColors.get(userEmail)!;
    }

    const color = this.colorPool[this.userColors.size % this.colorPool.length];
    this.userColors.set(userEmail, color);
    return color;
  }

  /**
   * Handle user joining a note for collaboration
   */
  async joinNote(socket: Socket, data: { noteId: string; userEmail: string }) {
    const { noteId, userEmail } = data;

    try {
      // Get user info
      const db = getDatabase();
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, userEmail))
        .limit(1);

      if (!user) {
        socket.emit('note:error', { message: 'User not found' });
        return;
      }

      // Join socket room for the note
      socket.join(`note:${noteId}`);

      // Initialize note presence if not exists
      if (!this.noteRooms.has(noteId)) {
        this.noteRooms.set(noteId, {
          noteId,
          users: new Map(),
        });
      }

      const notePresence = this.noteRooms.get(noteId)!;
      const color = this.getUserColor(userEmail);

      // Add user to note presence
      notePresence.users.set(userEmail, {
        userEmail,
        userName: user.name || user.email,
        socketId: socket.id,
        color,
        lastActivity: new Date(),
      });

      // Initialize cursor tracking for this note
      if (!this.cursors.has(noteId)) {
        this.cursors.set(noteId, new Map());
      }

      // Notify other users about the new collaborator
      socket.to(`note:${noteId}`).emit('note:user_joined', {
        userEmail,
        userName: user.name || user.email,
        color,
        timestamp: new Date().toISOString(),
      });

      // Send current presence and cursors to the joining user
      const currentUsers = Array.from(notePresence.users.values()).map(u => ({
        userEmail: u.userEmail,
        userName: u.userName,
        color: u.color,
      }));

      const currentCursors = Array.from(this.cursors.get(noteId)?.entries() || []).map(
        ([email, cursor]) => cursor
      );

      socket.emit('note:joined', {
        noteId,
        users: currentUsers,
        cursors: currentCursors,
      });

      logger.debug(`✅ User ${userEmail} joined note ${noteId}`);
    } catch (error) {
      logger.error('Error joining note:', error);
      socket.emit('note:error', { message: 'Failed to join note' });
    }
  }

  /**
   * Handle user leaving a note
   */
  async leaveNote(socket: Socket, data: { noteId: string; userEmail: string }) {
    const { noteId, userEmail } = data;

    // Leave socket room
    socket.leave(`note:${noteId}`);

    // Remove from presence
    const notePresence = this.noteRooms.get(noteId);
    if (notePresence) {
      notePresence.users.delete(userEmail);

      // Clean up if no users left
      if (notePresence.users.size === 0) {
        this.noteRooms.delete(noteId);
        this.cursors.delete(noteId);
      }
    }

    // Remove cursor
    this.cursors.get(noteId)?.delete(userEmail);

    // Notify other users
    socket.to(`note:${noteId}`).emit('note:user_left', {
      userEmail,
      timestamp: new Date().toISOString(),
    });

    logger.debug(`👋 User ${userEmail} left note ${noteId}`);
  }

  /**
   * Handle cursor position updates
   */
  updateCursor(socket: Socket, data: {
    noteId: string;
    userEmail: string;
    position: number;
    selection?: { start: number; end: number };
  }) {
    const { noteId, userEmail, position, selection } = data;

    const cursorsForNote = this.cursors.get(noteId);
    if (!cursorsForNote) return;

    const notePresence = this.noteRooms.get(noteId);
    if (!notePresence) return;

    const userPresence = notePresence.users.get(userEmail);
    if (!userPresence) return;

    const cursorData: CursorPosition = {
      userEmail,
      userName: userPresence.userName,
      position,
      selection,
      color: userPresence.color,
    };

    cursorsForNote.set(userEmail, cursorData);

    // Broadcast cursor position to other users
    socket.to(`note:${noteId}`).emit('note:cursor_update', cursorData);
  }

  /**
   * Handle content changes (for operational transform or CRDT)
   */
  async handleContentChange(socket: Socket, data: NoteEdit) {
    const { noteId, userEmail, userName, changes } = data;

    // Update last activity
    const notePresence = this.noteRooms.get(noteId);
    if (notePresence) {
      const userPresence = notePresence.users.get(userEmail);
      if (userPresence) {
        userPresence.lastActivity = new Date();
      }
    }

    // Broadcast changes to other users (excluding sender)
    socket.to(`note:${noteId}`).emit('note:content_change', {
      userEmail,
      userName,
      changes,
      timestamp: new Date().toISOString(),
    });

    logger.debug(`✏️ Content change in note ${noteId} by ${userEmail}`);
  }

  /**
   * Handle typing indicators
   */
  handleTyping(socket: Socket, data: { noteId: string; userEmail: string; isTyping: boolean }) {
    const { noteId, userEmail, isTyping } = data;

    socket.to(`note:${noteId}`).emit('note:typing', {
      userEmail,
      isTyping,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle disconnection - clean up user from all notes
   */
  handleDisconnect(socket: Socket, userEmail?: string) {
    if (!userEmail) return;

    // Find all notes the user was in
    for (const [noteId, presence] of this.noteRooms.entries()) {
      const userPresence = presence.users.get(userEmail);
      if (userPresence && userPresence.socketId === socket.id) {
        // Remove user from presence
        presence.users.delete(userEmail);

        // Remove cursor
        this.cursors.get(noteId)?.delete(userEmail);

        // Notify other users
        socket.to(`note:${noteId}`).emit('note:user_left', {
          userEmail,
          timestamp: new Date().toISOString(),
        });

        // Clean up if no users left
        if (presence.users.size === 0) {
          this.noteRooms.delete(noteId);
          this.cursors.delete(noteId);
        }
      }
    }
  }

  /**
   * Get current collaborators for a note
   */
  getCollaborators(noteId: string) {
    const notePresence = this.noteRooms.get(noteId);
    if (!notePresence) return [];

    return Array.from(notePresence.users.values()).map(u => ({
      userEmail: u.userEmail,
      userName: u.userName,
      color: u.color,
      lastActivity: u.lastActivity,
    }));
  }

  /**
   * Register all note collaboration handlers
   */
  registerHandlers(socket: Socket) {
    socket.on('note:join', (data) => this.joinNote(socket, data));
    socket.on('note:leave', (data) => this.leaveNote(socket, data));
    socket.on('note:cursor', (data) => this.updateCursor(socket, data));
    socket.on('note:change', (data) => this.handleContentChange(socket, data));
    socket.on('note:typing', (data) => this.handleTyping(socket, data));
  }
}

// Export singleton instance
export const noteCollaborationHandler = new NoteCollaborationHandler();


