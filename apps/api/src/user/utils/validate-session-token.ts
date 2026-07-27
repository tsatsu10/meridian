import { sha256 } from "@oslojs/crypto/sha2";
import { encodeHexLowerCase } from "@oslojs/encoding";
import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { sessionTable, userTable } from "../../database/schema";

export async function validateSessionToken(token: string) {
  const db = getDatabase();
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));

  const sessions = await db
    .select({
      // SECURITY: never select password/twoFactorSecret/twoFactorBackupCodes —
      // this result is returned as-is by GET /api/users/me, so any column
      // selected here is exposed to the browser on every session check.
      user: {
        id: userTable.id,
        email: userTable.email,
        name: userTable.name,
        avatar: userTable.avatar,
        timezone: userTable.timezone,
        language: userTable.language,
        role: userTable.role,
        isEmailVerified: userTable.isEmailVerified,
        lastLoginAt: userTable.lastLoginAt,
        lastSeen: userTable.lastSeen,
        twoFactorEnabled: userTable.twoFactorEnabled,
        createdAt: userTable.createdAt,
        updatedAt: userTable.updatedAt,
      },
      session: sessionTable,
    })
    .from(sessionTable)
    .innerJoin(userTable, eq(sessionTable.userId, userTable.id))
    .where(eq(sessionTable.id, sessionId));

  console.log(`🔍 [validate] Found ${sessions.length} matching sessions`);

  if (sessions.length < 1 || !sessions[0]) {
    console.error("❌ [validate] No session found in database");
    return { session: null, user: null };
  }

  const { user, session } = sessions[0];

  console.log(`🔍 [validate] Session found for user: ${user.email}`);
  console.log(`🔍 [validate] Session expires at: ${session.expiresAt}`);
  console.log(`🔍 [validate] Current time: ${new Date()}`);

  const isSessionExpired = Date.now() >= session.expiresAt.getTime();

  if (isSessionExpired) {
    console.error("❌ [validate] Session expired, deleting");
    await db.delete(sessionTable).where(eq(sessionTable.id, session.id));
    return { session: null, user: null };
  }

  const isSessionHalfWayExpired =
    Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15;

  if (isSessionHalfWayExpired) {
    session.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    await db
      .update(sessionTable)
      .set({
        expiresAt: session.expiresAt,
      })
      .where(eq(sessionTable.id, session.id));
  }

  return { session, user };
}
