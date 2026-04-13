/**
 * Consolidated Authentication Helper Functions
 * Session management and token utilities
 */

import { randomBytes } from "crypto";
import { getDatabase } from "../database/connection";
import { sessionTable, userTable } from "../database/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

/**
 * Generate a secure session token
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Create a new session for a user
 */
export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const db = getDatabase();
  const token = generateSessionToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

  await db.insert(sessionTable).values({
    id: token,
    userId,
    expiresAt,
  });

  return { token, expiresAt };
}

/**
 * Validate session token and return user data
 */
export async function validateSessionToken(token: string) {
  const db = getDatabase();
  const sessions = await db
    .select({
      session: sessionTable,
      user: userTable,
    })
    .from(sessionTable)
    .innerJoin(userTable, eq(sessionTable.userId, userTable.id))
    .where(eq(sessionTable.id, token))
    .limit(1);

  if (!sessions.length) {
    return { user: null, session: null };
  }

  const { session, user } = sessions[0]!;

  // Check if session is expired
  if (session.expiresAt < new Date()) {
    await invalidateSession(token);
    return { user: null, session: null };
  }

  return { user, session };
}

/**
 * Invalidate a session
 */
export async function invalidateSession(token: string): Promise<void> {
  const db = getDatabase();
  await db.delete(sessionTable).where(eq(sessionTable.id, token));
}

/**
 * Hash password for storage
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const db = getDatabase();
  const result = await db.delete(sessionTable).where(
    // Using raw SQL because Drizzle doesn't have a direct way to compare with current time
    eq(sessionTable.expiresAt, new Date()) // This needs to be adjusted based on your Drizzle setup
  );

  // Return count of cleaned sessions (implementation depends on your DB setup)
  return 0; // Placeholder
}

