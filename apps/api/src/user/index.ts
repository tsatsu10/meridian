import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { z } from "zod";
import changePassword from "./controllers/change-password";
import signIn from "./controllers/sign-in";
import signUp from "./controllers/sign-up";
import createSession from "./utils/create-session";
import generateSessionToken from "./utils/generate-session-token";
import invalidateSession from "./utils/invalidate-session";
import isInSecureMode from "./utils/is-in-secure-mode";
import { validateSessionToken } from "./utils/validate-session-token";
import statusRouter from "./status";
// 🔒 Import auth rate limiter for sign-in/sign-up protection
import { authRateLimiter } from "../middlewares/security";
import { generatePending2FAToken } from "../auth/utils/pending-2fa-token";

const user = new Hono<{
  Variables: {
    userEmail: string;
  };
}>()
  .get("/me", async (c) => {
    // Try to get session from cookie first
    let session = getCookie(c, "session");

    // Fallback: Try Authorization header (for cross-port development)
    if (!session) {
      const authHeader = c.req.header("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        session = authHeader.substring(7);
      }
    }

    if (!session) {
      return c.json({ user: null });
    }

    const { user } = await validateSessionToken(session);

    if (user === null) {
      return c.json({ user: null });
    }

    return c.json({ user });
  })
  .post(
    "/sign-in",
    authRateLimiter, // 🔒 Apply strict rate limiting (20 req/min)
    zValidator("json", z.object({ email: z.string(), password: z.string() })),
    async (c) => {
      const { email, password } = c.req.valid("json");

      const user = await signIn(email, password);

      // SECURITY: 2FA must gate session issuance, not just exist as a
      // separate opt-in check nothing ever calls. If the user has 2FA
      // enabled, stop here — no cookie, no session — and tell the client
      // to complete verification first. /auth/two-factor/verify-login is
      // the only place a session gets created for this account from here.
      //
      // The client gets a short-lived signed pendingToken, not the raw
      // userId: verify-login derives the target user FROM this token, so
      // presenting a valid 2FA code for an arbitrary userId (leaked via any
      // channel that never involved that account's password) isn't enough
      // by itself — the token only exists because this password check just
      // passed for this specific user.
      if (user.twoFactorEnabled) {
        return c.json({
          twoFactorRequired: true,
          pendingToken: generatePending2FAToken(user.id),
          email: user.email,
        });
      }

      const token = generateSessionToken();
      const session = await createSession(token, user.id);

      const isProduction = process.env.NODE_ENV === "production";
      setCookie(c, "session", token, {
        path: "/",
        // Share cookie across all localhost ports in dev; real host in prod.
        domain: isProduction ? undefined : "localhost",
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        expires: session.expiresAt,
      });

      return c.json({
        ...user,
        // Include session token in response for development fallback (WebSocket auth)
        sessionToken:
          process.env.NODE_ENV === "development" ? token : undefined,
      });
    },
  )
  .post(
    "/sign-up",
    authRateLimiter, // 🔒 Apply strict rate limiting (20 req/min)
    zValidator(
      "json",
      z.object({ email: z.string(), password: z.string(), name: z.string() }),
    ),
    async (c) => {
      const { email, password, name } = c.req.valid("json");

      const user = await signUp(email, password, name);

      const token = generateSessionToken();
      const session = await createSession(token, user.id);

      const isProduction = process.env.NODE_ENV === "production";
      setCookie(c, "session", token, {
        path: "/",
        domain: isProduction ? undefined : "localhost",
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        expires: session.expiresAt,
      });

      return c.json(user);
    },
  )
  .post(
    "/change-password",
    zValidator(
      "json",
      z.object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: z.string().min(1, "New password is required"),
      }),
    ),
    async (c) => {
      const userEmail = c.get("userEmail");
      if (!userEmail) {
        return c.json({ error: "Authentication required" }, 401);
      }

      const { currentPassword, newPassword } = c.req.valid("json");
      await changePassword(userEmail, currentPassword, newPassword);

      return c.json({ message: "Password updated" });
    },
  )
  .post("/sign-out", async (c) => {
    const token = getCookie(c, "session");

    // In demo mode or if no session token, just return success
    if (!token) {
      // Clear the cookie anyway if it exists
      deleteCookie(c, "session");
      return c.json({ message: "Signed out" });
    }

    await invalidateSession(token);
    deleteCookie(c, "session");

    return c.json({ message: "Signed out" });
  });

// Mount status router
user.route("/status", statusRouter);

export default user;
