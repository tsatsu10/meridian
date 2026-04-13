// @epic-5.1-project-notes: Project Notes API endpoints
import { Hono } from "hono";
import { eq, and, desc, like } from "drizzle-orm";
import { getDatabase } from "../database/connection";
import { projectNotesTable, noteVersionsTable, noteCommentsTable, users } from "../database/schema";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import logger from '../utils/logger';

const app = new Hono();

// ========================================
// 📝 PROJECT NOTES CRUD
// ========================================

// Create a new note
app.post(
  "/projects/:projectId/notes",
  zValidator("json", z.object({
    title: z.string().min(1).max(200),
    content: z.string().optional(),
    tags: z.array(z.string()).optional(),
    isPinned: z.boolean().optional(),
  })),
  async (c) => {
    const projectId = c.req.param("projectId");
    const data = c.req.valid("json");
    const userEmail = c.get("userEmail");

    if (!userEmail) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    try {
      const db = getDatabase();
      
      // Get user ID
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, userEmail))
        .limit(1);

      if (!user) {
        return c.json({ error: "User not found" }, 404);
      }

      const [note] = await db
        .insert(projectNotesTable)
        .values({
          projectId,
          title: data.title,
          content: data.content || "",
          tags: data.tags || [],
          isPinned: data.isPinned || false,
          createdBy: user.id,
          lastEditedBy: user.id,
        })
        .returning();

      // Create initial version
      await db.insert(noteVersionsTable).values({
        noteId: note.id,
        content: data.content || "",
        editedBy: user.id,
        versionNumber: 1,
        changeDescription: "Initial version",
      });

      return c.json({
        data: note,
        success: true,
        message: "Note created successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to create note:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Get all notes for a project
app.get("/projects/:projectId/notes", async (c) => {
  const projectId = c.req.param("projectId");
  const userEmail = c.get("userEmail");
  const includeArchived = c.req.query("includeArchived") === "true";
  const search = c.req.query("search");

  if (!userEmail) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const db = getDatabase();
    
    let query = db
      .select()
      .from(projectNotesTable)
      .where(eq(projectNotesTable.projectId, projectId));

    if (!includeArchived) {
      query = query.where(eq(projectNotesTable.isArchived, false));
    }

    let notes = await query.orderBy(
      desc(projectNotesTable.isPinned),
      desc(projectNotesTable.updatedAt)
    );

    // Filter by search if provided
    if (search) {
      const searchLower = search.toLowerCase();
      notes = notes.filter(note =>
        note.title.toLowerCase().includes(searchLower) ||
        note.content?.toLowerCase().includes(searchLower)
      );
    }

    return c.json({
      data: notes,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to fetch notes:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get a specific note
app.get("/notes/:noteId", async (c) => {
  const noteId = c.req.param("noteId");
  const userEmail = c.get("userEmail");

  if (!userEmail) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const db = getDatabase();
    const [note] = await db
      .select()
      .from(projectNotesTable)
      .where(eq(projectNotesTable.id, noteId))
      .limit(1);

    if (!note) {
      return c.json({ error: "Note not found" }, 404);
    }

    return c.json({
      data: note,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to fetch note:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Update a note
app.patch(
  "/notes/:noteId",
  zValidator("json", z.object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().optional(),
    tags: z.array(z.string()).optional(),
    isPinned: z.boolean().optional(),
    isArchived: z.boolean().optional(),
    changeDescription: z.string().optional(),
  })),
  async (c) => {
    const noteId = c.req.param("noteId");
    const updates = c.req.valid("json");
    const userEmail = c.get("userEmail");

    if (!userEmail) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    try {
      const db = getDatabase();
      
      // Get user ID
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, userEmail))
        .limit(1);

      if (!user) {
        return c.json({ error: "User not found" }, 404);
      }

      // Get current note for version history
      const [currentNote] = await db
        .select()
        .from(projectNotesTable)
        .where(eq(projectNotesTable.id, noteId))
        .limit(1);

      if (!currentNote) {
        return c.json({ error: "Note not found" }, 404);
      }

      // Update note
      const [note] = await db
        .update(projectNotesTable)
        .set({
          ...updates,
          lastEditedBy: user.id,
          updatedAt: new Date(),
        })
        .where(eq(projectNotesTable.id, noteId))
        .returning();

      // Create new version if content changed
      if (updates.content !== undefined && updates.content !== currentNote.content) {
        // Get latest version number
        const versions = await db
          .select()
          .from(noteVersionsTable)
          .where(eq(noteVersionsTable.noteId, noteId))
          .orderBy(desc(noteVersionsTable.versionNumber))
          .limit(1);

        const nextVersion = (versions[0]?.versionNumber || 0) + 1;

        await db.insert(noteVersionsTable).values({
          noteId,
          content: updates.content,
          editedBy: user.id,
          versionNumber: nextVersion,
          changeDescription: updates.changeDescription || `Version ${nextVersion}`,
        });
      }

      return c.json({
        data: note,
        success: true,
        message: "Note updated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to update note:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Delete a note
app.delete("/notes/:noteId", async (c) => {
  const noteId = c.req.param("noteId");
  const userEmail = c.get("userEmail");

  if (!userEmail) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const db = getDatabase();
    
    await db
      .delete(projectNotesTable)
      .where(eq(projectNotesTable.id, noteId));

    return c.json({
      success: true,
      message: "Note deleted successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to delete note:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Pin/unpin a note
app.patch("/notes/:noteId/pin", async (c) => {
  const noteId = c.req.param("noteId");
  const userEmail = c.get("userEmail");

  if (!userEmail) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const db = getDatabase();
    
    // Get current note
    const [currentNote] = await db
      .select()
      .from(projectNotesTable)
      .where(eq(projectNotesTable.id, noteId))
      .limit(1);

    if (!currentNote) {
      return c.json({ error: "Note not found" }, 404);
    }

    // Toggle pin status
    const [note] = await db
      .update(projectNotesTable)
      .set({
        isPinned: !currentNote.isPinned,
        updatedAt: new Date(),
      })
      .where(eq(projectNotesTable.id, noteId))
      .returning();

    return c.json({
      data: note,
      success: true,
      message: note.isPinned ? "Note pinned" : "Note unpinned",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to pin/unpin note:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========================================
// 📜 VERSION HISTORY
// ========================================

// Get version history for a note
app.get("/notes/:noteId/versions", async (c) => {
  const noteId = c.req.param("noteId");
  const userEmail = c.get("userEmail");

  if (!userEmail) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const db = getDatabase();
    const versions = await db
      .select()
      .from(noteVersionsTable)
      .where(eq(noteVersionsTable.noteId, noteId))
      .orderBy(desc(noteVersionsTable.versionNumber));

    return c.json({
      data: versions,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to fetch versions:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========================================
// 💬 COMMENTS
// ========================================

// Get comments for a note
app.get("/notes/:noteId/comments", async (c) => {
  const noteId = c.req.param("noteId");
  const userEmail = c.get("userEmail");

  if (!userEmail) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const db = getDatabase();
    const comments = await db
      .select()
      .from(noteCommentsTable)
      .where(eq(noteCommentsTable.noteId, noteId))
      .orderBy(noteCommentsTable.createdAt);

    return c.json({
      data: comments,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to fetch comments:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Add a comment to a note
app.post(
  "/notes/:noteId/comments",
  zValidator("json", z.object({
    comment: z.string().min(1).max(2000),
  })),
  async (c) => {
    const noteId = c.req.param("noteId");
    const { comment } = c.req.valid("json");
    const userEmail = c.get("userEmail");

    if (!userEmail) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    try {
      const db = getDatabase();
      
      const [newComment] = await db
        .insert(noteCommentsTable)
        .values({
          noteId,
          userEmail,
          comment,
        })
        .returning();

      return c.json({
        data: newComment,
        success: true,
        message: "Comment added successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to add comment:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Update a comment
app.patch(
  "/notes/:noteId/comments/:commentId",
  zValidator("json", z.object({
    comment: z.string().min(1).max(2000),
  })),
  async (c) => {
    const commentId = c.req.param("commentId");
    const { comment } = c.req.valid("json");
    const userEmail = c.get("userEmail");

    if (!userEmail) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    try {
      const db = getDatabase();
      
      const [updatedComment] = await db
        .update(noteCommentsTable)
        .set({
          comment,
          isEdited: true,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(noteCommentsTable.id, commentId),
            eq(noteCommentsTable.userEmail, userEmail)
          )
        )
        .returning();

      if (!updatedComment) {
        return c.json({ error: "Comment not found or unauthorized" }, 404);
      }

      return c.json({
        data: updatedComment,
        success: true,
        message: "Comment updated successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("Failed to update comment:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Delete a comment
app.delete("/notes/:noteId/comments/:commentId", async (c) => {
  const commentId = c.req.param("commentId");
  const userEmail = c.get("userEmail");

  if (!userEmail) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const db = getDatabase();
    
    await db
      .delete(noteCommentsTable)
      .where(
        and(
          eq(noteCommentsTable.id, commentId),
          eq(noteCommentsTable.userEmail, userEmail)
        )
      );

    return c.json({
      success: true,
      message: "Comment deleted successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Failed to delete comment:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;


