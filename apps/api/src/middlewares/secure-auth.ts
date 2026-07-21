/**
 * Secure Authentication Middleware - FIXED VERSION
 *
 * SECURITY: This middleware provides secure authentication using httpOnly cookies
 * instead of localStorage tokens. Implements role-based access control.
 */

import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import type { SessionUser } from "./redis-session";
import { getSecurityLoggingService } from "../services/security-logging";
import logger from "../utils/logger";

// Import session validation utility
type ValidateSessionResult = {
  session: { id: string; expiresAt: Date } | null;
  user: {
    id: string;
    email: string;
    role: string | null;
  } | null;
};

/**
 * Authentication middleware that validates session tokens from httpOnly cookies
 * SECURITY: Provides secure authentication without exposing tokens to JavaScript
 */
export const authMiddleware = () => {
  const securityLogger = getSecurityLoggingService();

  return async (c: Context, next: Next) => {
    const ip =
      c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
    const userAgent = c.req.header("user-agent");
    const path = c.req.path;

    try {
      // Get session token from httpOnly cookie (primary method)
      let sessionToken = getCookie(c, "session");

      // Fallback: Check Authorization header for API clients
      if (!sessionToken) {
        const authHeader = c.req.header("Authorization");
        if (authHeader?.startsWith("Bearer ")) {
          sessionToken = authHeader.substring(7);
        }
      }

      if (!sessionToken) {
        logger.warn("🔒 AUTH MIDDLEWARE: No session token found");

        securityLogger.logAuthenticationEvent("login_failure", undefined, ip, {
          reason: "no_token",
          path,
          userAgent,
        });

        throw new HTTPException(401, { message: "Authentication required" });
      }

      // Validate session token
      const { validateSessionToken } = await import(
        "../user/utils/validate-session-token.js"
      );
      const result: ValidateSessionResult =
        await validateSessionToken(sessionToken);

      if (!result.user || !result.session) {
        logger.warn("🔒 AUTH MIDDLEWARE: Invalid or expired session");

        securityLogger.logAuthenticationEvent("login_failure", undefined, ip, {
          reason: "invalid_session",
          path,
          userAgent,
        });

        throw new HTTPException(401, { message: "Invalid or expired session" });
      }

      // SECURITY: Map database user to SessionUser format.
      // workspaceId/permissions are intentionally left empty: this layer
      // authenticates a request but doesn't know which workspace it's
      // scoped to, so per-workspace role/permission checks are done by
      // middlewares/rbac.ts against the DB, not read off this object.
      const sessionUser: SessionUser = {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role || "member",
        workspaceId: "",
        permissions: [],
        sessionId: result.session.id,
        lastActivity: Date.now(),
      };

      // Set user context for authenticated requests
      c.set("userId", sessionUser.id);
      c.set("userEmail", sessionUser.email);
      c.set("user", sessionUser);
      c.set("sessionId", sessionUser.sessionId);

      // Log successful authentication
      securityLogger.logAuthenticationEvent(
        "login_success",
        sessionUser.id,
        ip,
        {
          method: "session_validation",
          path,
          userAgent,
        },
      );

      logger.debug(
        `🔒 AUTH MIDDLEWARE: Authenticated user: ${sessionUser.email}`,
      );

      await next();
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      logger.error("🔒 AUTH MIDDLEWARE: Authentication error:", error);

      securityLogger.logEvent({
        type: "authentication",
        severity: "high",
        ip,
        userAgent,
        resource: path,
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
          middleware: "auth",
        },
        blocked: true,
      });

      throw new HTTPException(401, { message: "Authentication failed" });
    }
  };
};

export default authMiddleware;
