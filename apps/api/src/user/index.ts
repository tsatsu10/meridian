import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { z } from "zod";
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
      const authHeader = c.req.header('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        session = authHeader.substring(7);
        console.log(`🔍 [/me] Using session from Authorization header`);
      }
    }

    console.log(`🔍 [/me] Session: ${session ? session.substring(0, 20) + '...' : 'MISSING'}`);

    if (!session) {
      console.log('❌ [/me] No session token found (cookie or header)');
      return c.json({ user: null });
    }

    const { user } = await validateSessionToken(session);

    console.log(`🔍 [/me] Validation result: ${user ? `User ${user.email}` : 'NULL'}`);

    if (user === null) {
      console.log('❌ [/me] Session validation returned null user');
      return c.json({ user: null });
    }

    console.log(`✅ [/me] Returning user: ${user.email}`);
    return c.json({ user });
  })
  .post(
    "/sign-in",
    authRateLimiter, // 🔒 Apply strict rate limiting (20 req/min)
    zValidator("json", z.object({ email: z.string(), password: z.string() })),
    async (c) => {
      const { email, password } = c.req.valid("json");

      const user = await signIn(email, password);

      console.log(`🔐 [sign-in] User authenticated: ${user.email}`);

      const token = generateSessionToken();
      console.log(`🔑 [sign-in] Generated token: ${token.substring(0, 20)}...`);
      
      const session = await createSession(token, user.id);
      console.log(`💾 [sign-in] Session created with hashed ID`);

      // For development, set domain to localhost (without port) to share across ports
      // For production, use SameSite=Lax for same-site requests
      const isProduction = process.env.NODE_ENV === 'production';
      setCookie(c, "session", token, {
        path: "/",
        domain: "localhost", // Share cookie across all localhost ports
        secure: false, // False in dev (http://localhost), true in production (https)
        sameSite: "lax", // Lax works for same-domain requests
        expires: session.expiresAt,
      });
      
      console.log(`🍪 [sign-in] Cookie set: session=${token.substring(0, 20)}... (Domain=localhost, SameSite=lax)`);

      return c.json({
        ...user,
        // Include session token in response for development fallback (WebSocket auth)
        sessionToken: process.env.NODE_ENV === 'development' ? token : undefined,
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

      // For development, set domain to localhost (without port) to share across ports
      // For production, use SameSite=Lax for same-site requests
      const isProduction = process.env.NODE_ENV === 'production';
      setCookie(c, "session", token, {
        path: "/",
        domain: "localhost", // Share cookie across all localhost ports
        secure: false, // False in dev (http://localhost), true in production (https)
        sameSite: "lax", // Lax works for same-domain requests
        expires: session.expiresAt,
      });

      return c.json(user);
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

