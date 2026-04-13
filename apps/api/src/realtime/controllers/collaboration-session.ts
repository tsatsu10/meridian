// @epic-2.2-realtime: Collaboration session management for tracking editing activity
import { eq, and } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { collaborationSessionTable, userTable } from "../../database/schema";
import logger from '../../utils/logger';

export interface CreateCollaborationSessionData {
  userEmail: string;
  resourceId: string;
  resourceType: string;
  sessionType: string;
  metadata: string;
}

export interface UpdateCollaborationSessionData {
  lastActivity: Date;
  metadata?: string;
}

export async function createCollaborationSession(data: CreateCollaborationSessionData) {
  const db = getDatabase();
  try {
    // Check if session already exists for this user and resource
    const existingSession = await db.query.collaborationSessionTable.findFirst({
      where: and(
        eq(collaborationSessionTable.userEmail, data.userEmail),
        eq(collaborationSessionTable.resourceId, data.resourceId),
        eq(collaborationSessionTable.resourceType, data.resourceType)
      ),
    });

    if (existingSession) {
      // Update existing session
      const [updatedSession] = await db
        .update(collaborationSessionTable)
        .set({
          sessionType: data.sessionType,
          lastActivity: new Date(),
          metadata: data.metadata,
        })
        .where(
          and(
            eq(collaborationSessionTable.userEmail, data.userEmail),
            eq(collaborationSessionTable.resourceId, data.resourceId),
            eq(collaborationSessionTable.resourceType, data.resourceType)
          )
        )
        .returning();

      return updatedSession;
    } else {
      // Create new session
      const [newSession] = await db
        .insert(collaborationSessionTable)
        .values({
          userEmail: data.userEmail,
          resourceId: data.resourceId,
          resourceType: data.resourceType,
          sessionType: data.sessionType,
          startedAt: new Date(),
          lastActivity: new Date(),
          metadata: data.metadata,
        })
        .returning();

      return newSession;
    }
  } catch (error) {
    logger.error('❌ Error creating collaboration session:', error);
    throw error;
  }
}

export async function updateCollaborationSession(
  userEmail: string,
  resourceId: string,
  data: UpdateCollaborationSessionData
) {
  try {
    const db = getDatabase();
    const [updatedSession] = await db
      .update(collaborationSessionTable)
      .set({
        lastActivity: data.lastActivity,
        metadata: data.metadata,
      })
      .where(
        and(
          eq(collaborationSessionTable.userEmail, userEmail),
          eq(collaborationSessionTable.resourceId, resourceId)
        )
      )
      .returning();

    return updatedSession;
  } catch (error) {
    logger.error('❌ Error updating collaboration session:', error);
    throw error;
  }
} 
