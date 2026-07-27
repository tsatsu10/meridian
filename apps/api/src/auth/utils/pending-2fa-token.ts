import crypto from "node:crypto";
import { appSettings } from "../../config/settings";

const TTL_MS = 5 * 60 * 1000; // 5 minutes

interface PendingTokenPayload {
  userId: string;
  exp: number;
}

/**
 * Short-lived, signed proof that a specific user's PASSWORD was just
 * verified by /sign-in, without yet granting a session (2FA still pending).
 *
 * /auth/two-factor/verify-login must derive the target user from this token
 * rather than trusting a bare `userId` in the request body — otherwise
 * presenting a valid TOTP/backup code for ANY userId (obtained through any
 * channel that never involved that account's password) is sufficient on its
 * own to obtain a session, which defeats the point of having two factors.
 */
export function generatePending2FAToken(userId: string): string {
  const payload: PendingTokenPayload = { userId, exp: Date.now() + TTL_MS };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );
  const signature = crypto
    .createHmac("sha256", appSettings.jwtSecret)
    .update(payloadB64)
    .digest("hex");
  return `${payloadB64}.${signature}`;
}

export function verifyPending2FAToken(pendingToken: string): string | null {
  const [payloadB64, signature] = pendingToken.split(".");
  if (!payloadB64 || !signature) return null;

  const expectedSignature = crypto
    .createHmac("sha256", appSettings.jwtSecret)
    .update(payloadB64)
    .digest("hex");

  // Constant-time compare to avoid a timing side-channel on the signature.
  const sigBuf = Buffer.from(signature, "hex");
  const expectedBuf = Buffer.from(expectedSignature, "hex");
  if (
    sigBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expectedBuf)
  ) {
    return null;
  }

  try {
    const payload: PendingTokenPayload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString(),
    );
    if (!payload.userId || Date.now() > payload.exp) return null;
    return payload.userId;
  } catch {
    return null;
  }
}
