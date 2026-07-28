import { and, eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { userSettingsTable } from "../../database/schema";
import logger from "../../utils/logger";

/**
 * Reads the security section of a user's settings.
 *
 * These preferences were previously write-only: the Security page stored
 * `loginNotifications`, `sessionTimeout`, `deviceTracking` and
 * `suspiciousActivityAlerts`, but the API referenced them nowhere except as
 * keys in a defaults object, so every switch was inert. This is the read side
 * for the two that are now enforced.
 *
 * Defaults match the settings UI's defaults, and any failure falls back to
 * them — a settings lookup must never be able to lock someone out.
 */

export type SecurityPreferences = {
  /** Sign out sessions that have been idle beyond the idle window. */
  sessionTimeout: boolean;
  /** Email the account when a sign-in comes from an unrecognised device. */
  loginNotifications: boolean;
};

const DEFAULTS: SecurityPreferences = {
  sessionTimeout: true,
  loginNotifications: true,
};

export async function getSecurityPreferences(
  userEmail: string,
): Promise<SecurityPreferences> {
  try {
    const db = getDatabase();
    const [row] = await db
      .select({ settings: userSettingsTable.settings })
      .from(userSettingsTable)
      .where(
        and(
          eq(userSettingsTable.userEmail, userEmail),
          eq(userSettingsTable.section, "security"),
        ),
      )
      .limit(1);

    if (!row?.settings) {
      return DEFAULTS;
    }

    const parsed = JSON.parse(row.settings) as Partial<SecurityPreferences>;

    return {
      sessionTimeout:
        typeof parsed.sessionTimeout === "boolean"
          ? parsed.sessionTimeout
          : DEFAULTS.sessionTimeout,
      loginNotifications:
        typeof parsed.loginNotifications === "boolean"
          ? parsed.loginNotifications
          : DEFAULTS.loginNotifications,
    };
  } catch (error) {
    logger.warn(
      "Could not read security preferences, using defaults:",
      error instanceof Error ? error.message : error,
    );
    return DEFAULTS;
  }
}

export default getSecurityPreferences;
