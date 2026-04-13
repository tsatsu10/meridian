import { sha256 } from "@oslojs/crypto/sha2";
import { encodeHexLowerCase } from "@oslojs/encoding";
import { getDatabase } from "../../database/connection";
import { sessionTable } from "../../database/schema";

async function createSession(token: string, userId: string) {
  console.log(`💾 [createSession] Creating session for user: ${userId}`);
  console.log(`💾 [createSession] Token: ${token.substring(0, 20)}...`);
  
  const db = getDatabase();
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
  
  console.log(`💾 [createSession] Hashed session ID: ${sessionId.substring(0, 20)}...`);
  
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  const session = {
    id: sessionId,
    userId,
    expiresAt,
  };
  
  console.log(`💾 [createSession] Expires at: ${expiresAt}`);
  
  try {
    await db.insert(sessionTable).values(session);
    console.log(`✅ [createSession] Session created successfully in database`);
  } catch (error) {
    console.error('❌ [createSession] Database insert failed:', error);
    throw error;
  }
  
  return session;
}

export default createSession;

