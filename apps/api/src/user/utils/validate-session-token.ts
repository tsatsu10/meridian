import { sha256 } from "@oslojs/crypto/sha2";
import { encodeHexLowerCase } from "@oslojs/encoding";
import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { sessionTable, userTable } from "../../database/schema";
import logger from "../../utils/logger";
import { getSecurityPreferences } from "./security-preferences";

/** Reads a positive-integer minute count from the environment. */
function minutesFromEnv(name: string, fallbackMinutes: number): number {
  const raw = process.env[name];
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  const minutes =
    Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackMinutes;
  return minutes * 60 * 1000;
}

/**
 * How long a session may sit unused before "Auto Session Timeout" ends it.
 * Deliberately generous — an idle logout, not a hard session cap. Override with
 * SESSION_IDLE_TIMEOUT_MINUTES; the default is a judgement call, not a
 * requirement from anywhere.
 */
const IDLE_TIMEOUT_MS = minutesFromEnv("SESSION_IDLE_TIMEOUT_MINUTES", 12 * 60);

/**
 * Don't rewrite `lastActivity` more often than this. Session validation runs on
 * every authenticated request; an unthrottled stamp turns each one into a row
 * update for no visible benefit. Override with
 * SESSION_ACTIVITY_THROTTLE_MINUTES.
 */
const ACTIVITY_WRITE_THROTTLE_MS = minutesFromEnv(
  "SESSION_ACTIVITY_THROTTLE_MINUTES",
  1,
);

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

  if (sessions.length < 1 || !sessions[0]) {
    logger.debug("session.validate.miss", undefined, "AUTH");
    return { session: null, user: null };
  }

  const { user, session } = sessions[0];

  const isSessionExpired = Date.now() >= session.expiresAt.getTime();

  if (isSessionExpired) {
    logger.warn("session.validate.expired", { sessionId: session.id }, "AUTH");
    await db.delete(sessionTable).where(eq(sessionTable.id, session.id));
    return { session: null, user: null };
  }

  // "Auto Session Timeout" on the Security page. The switch stored a boolean
  // that nothing read, so a session stayed valid for its full 30 days no
  // matter how long it sat unused. Only enforced once a session has a
  // lastActivity stamp — rows predating that column have no idle history and
  // must not be logged out on the strength of a null.
  if (session.lastActivity) {
    const idleFor = Date.now() - session.lastActivity.getTime();
    if (idleFor >= IDLE_TIMEOUT_MS) {
      const { sessionTimeout } = await getSecurityPreferences(user.email);
      if (sessionTimeout) {
        logger.warn(
          "session.validate.idle_timeout",
          { sessionId: session.id },
          "AUTH",
        );
        await db.delete(sessionTable).where(eq(sessionTable.id, session.id));
        return { session: null, user: null };
      }
    }
  }

  const isSessionHalfWayExpired =
    Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15;

  if (isSessionHalfWayExpired) {
    session.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  }

  // Record activity, so the Security page's session list can say when each
  // device was last used and /stats can count idle sessions.
  //
  // Throttled: this runs on every authenticated request, so writing on each
  // one would add a row update to every single API call. A session list shows
  // activity at minute granularity at best, so a stamp no more than a minute
  // stale is indistinguishable to the reader and costs almost nothing.
  const now = new Date();
  const activityIsStale =
    !session.lastActivity ||
    now.getTime() - session.lastActivity.getTime() >=
      ACTIVITY_WRITE_THROTTLE_MS;

  if (isSessionHalfWayExpired || activityIsStale) {
    session.lastActivity = now;
    await db
      .update(sessionTable)
      .set({
        expiresAt: session.expiresAt,
        lastActivity: now,
      })
      .where(eq(sessionTable.id, session.id));
  }

  return { session, user };
}
