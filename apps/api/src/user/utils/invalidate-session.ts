import { sha256 } from "@oslojs/crypto/sha2";
import { encodeHexLowerCase } from "@oslojs/encoding";
import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { sessionTable } from "../../database/schema";

async function invalidateSession(token: string) {
  const db = getDatabase();
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
  await db.delete(sessionTable).where(eq(sessionTable.id, sessionId));
}

export default invalidateSession;

