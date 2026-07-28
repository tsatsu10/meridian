import emailService from "../../services/email-service";
import logger from "../../utils/logger";
import { isKnownDevice } from "./known-device";
import { getSecurityPreferences } from "./security-preferences";
import { describeUserAgent } from "./session-provenance";

/**
 * Emails the account owner when a sign-in arrives from a device they have not
 * used before.
 *
 * This is what makes the Security page's "Login Alerts → Email Alerts" switch
 * real. That switch stored `loginNotifications` and nothing anywhere read it;
 * there was no login-alert code in the API at all, so it promised
 * notifications that could never arrive.
 *
 * Best-effort by design: a sign-in must never fail because a notification
 * could not be sent, so everything here is swallowed and logged.
 */

export type LoginAlertInput = {
  userId: string;
  userEmail: string;
  userName: string;
  ipAddress: string | null;
  userAgent: string | null;
  currentSessionId?: string;
};

export async function sendLoginAlert(input: LoginAlertInput): Promise<void> {
  try {
    const { loginNotifications } = await getSecurityPreferences(
      input.userEmail,
    );
    if (!loginNotifications) {
      return;
    }

    const known = await isKnownDevice(
      input.userId,
      input.userAgent,
      input.currentSessionId ?? "",
    );
    if (known) {
      return;
    }

    const device = describeUserAgent(input.userAgent);
    const when = new Date().toUTCString();

    const body = [
      `Hi ${input.userName},`,
      "",
      "Your Meridian account was just signed in to from a device we haven't seen before.",
      "",
      `Device: ${device.deviceName}`,
      `IP address: ${input.ipAddress ?? "not recorded"}`,
      `Time: ${when}`,
      "",
      "If this was you, no action is needed.",
      "",
      "If it wasn't, change your password now — that also signs out every other session — from Settings → Security.",
    ].join("\n");

    await emailService.sendNotificationEmail(
      input.userEmail,
      "New sign-in to your Meridian account",
      body,
    );
  } catch (error) {
    logger.warn(
      "Could not send login alert:",
      error instanceof Error ? error.message : error,
    );
  }
}

export default sendLoginAlert;
