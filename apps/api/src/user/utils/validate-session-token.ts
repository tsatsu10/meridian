import { sha256 } from "@oslojs/crypto/sha2";
import { encodeHexLowerCase } from "@oslojs/encoding";
import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { sessionTable, userTable } from "../../database/schema";

export async function validateSessionToken(token: string) {
  console.log(`🔍 [validate] Validating token: ${token.substring(0, 20)}...`);
  
  const db = getDatabase();
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
  
  console.log(`🔍 [validate] Hashed session ID: ${sessionId.substring(0, 20)}...`);
  
  const sessions = await db
    .select({ user: userTable, session: sessionTable })
    .from(sessionTable)
    .innerJoin(userTable, eq(sessionTable.userId, userTable.id))
    .where(eq(sessionTable.id, sessionId));

  console.log(`🔍 [validate] Found ${sessions.length} matching sessions`);

  if (sessions.length < 1 || !sessions[0]) {
    console.error('❌ [validate] No session found in database');
    return { session: null, user: null };
  }

  const { user, session } = sessions[0];
  
  console.log(`🔍 [validate] Session found for user: ${user.email}`);
  console.log(`🔍 [validate] Session expires at: ${session.expiresAt}`);
  console.log(`🔍 [validate] Current time: ${new Date()}`);

  const isSessionExpired = Date.now() >= session.expiresAt.getTime();

  if (isSessionExpired) {
    console.error('❌ [validate] Session expired, deleting');
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

