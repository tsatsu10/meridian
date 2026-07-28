import { sha256 } from "@oslojs/crypto/sha2";
import { encodeHexLowerCase } from "@oslojs/encoding";
import { and, eq, ne } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { sessionTable } from "../../database/schema";

/**
 * Deletes every session belonging to `userId` except the one identified by
 * `keepToken` (the caller's own).
 *
 * Changing a password used to leave every other session alive for the full
 * 30-day window — verified against the running API: sign in twice, change the
 * password from session A, and session B still authenticated afterwards. That
 * is the one action a user takes when they believe an account is compromised,
 * and combined with a Security page that showed a fabricated single-session
 * list and disabled "End All Others" buttons, there was no way at all to evict
 * an attacker.
 *
 * Returns the number of sessions removed.
 */
async function revokeOtherSessions(
  userId: string,
  keepToken?: string | null,
): Promise<number> {
  const db = getDatabase();

  const keepSessionId = keepToken
    ? encodeHexLowerCase(sha256(new TextEncoder().encode(keepToken)))
    : null;

  const deleted = await db
    .delete(sessionTable)
    .where(
      keepSessionId
        ? and(
            eq(sessionTable.userId, userId),
            ne(sessionTable.id, keepSessionId),
          )
        : eq(sessionTable.userId, userId),
    )
    .returning({ id: sessionTable.id });

  return deleted.length;
}

export default revokeOtherSessions;
