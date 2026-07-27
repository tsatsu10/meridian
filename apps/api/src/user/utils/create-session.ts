import { sha256 } from "@oslojs/crypto/sha2";
import { encodeHexLowerCase } from "@oslojs/encoding";
import { getDatabase } from "../../database/connection";
import { sessionTable } from "../../database/schema";

async function createSession(token: string, userId: string) {
  const db = getDatabase();
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));

  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  const session = {
    id: sessionId,
    userId,
    expiresAt,
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
