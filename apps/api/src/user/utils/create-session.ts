import { sha256 } from "@oslojs/crypto/sha2";
import { encodeHexLowerCase } from "@oslojs/encoding";
import { getDatabase } from "../../database/connection";
import { sessionTable } from "../../database/schema";

export type SessionProvenance = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

/**
 * Creates a session row for a freshly issued token.
 *
 * Provenance (IP + user agent) is recorded so the Security settings page can
 * show a real session list. This used to store only id/userId/expiresAt, which
 * is why that page fabricated its "current device" entry from
 * navigator.userAgent and a timezone guess — there was nothing real to show.
 */
async function createSession(
  token: string,
  userId: string,
  provenance: SessionProvenance = {},
) {
  const db = getDatabase();
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));

  const now = new Date();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  const session = {
    id: sessionId,
    userId,
    expiresAt,
    createdAt: now,
    lastActivity: now,
    // Truncated: a user agent is attacker-controlled free text and only its
    // leading part is ever parsed or displayed.
    ipAddress: provenance.ipAddress?.slice(0, 100) ?? null,
    userAgent: provenance.userAgent?.slice(0, 500) ?? null,
  };

  try {
    await db.insert(sessionTable).values(session);
  } catch (error) {
    console.error("❌ [createSession] Database insert failed:", error);
    throw error;
  }

  return session;
}

export default createSession;
