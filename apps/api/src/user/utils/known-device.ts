import { and, eq, ne } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { sessionTable } from "../../database/schema";

/**
 * Has this account signed in from this device before?
 *
 * "Before" means: some *other* session row for the same user already carries
 * the same user agent. Deliberately coarse — this only decides whether to send
 * a courtesy email, never whether to allow the sign-in, so a false negative
 * costs an extra email and a false positive costs one unsent notice.
 */
export async function isKnownDevice(
  userId: string,
  userAgent: string | null,
  currentSessionId: string,
): Promise<boolean> {
  if (!userAgent) {
    // No fingerprint at all: treat as known so scripted/API clients don't
    // generate an alert on every call.
    return true;
  }

  const db = getDatabase();
  const [match] = await db
    .select({ id: sessionTable.id })
    .from(sessionTable)
    .where(
      and(
        eq(sessionTable.userId, userId),
        eq(sessionTable.userAgent, userAgent),
        ne(sessionTable.id, currentSessionId),
      ),
    )
    .limit(1);

  return Boolean(match);
}

export default isKnownDevice;
