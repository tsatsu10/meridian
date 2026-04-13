import { Context, Next } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import logger from '../utils/logger';

/**
 * CSRF Protection Middleware
 * Implements Double Submit Cookie pattern for CSRF protection
 * 
 * How it works:
 * 1. Server generates a random CSRF token and stores it in a cookie
 * 2. Client includes this token in a custom header for state-changing requests
 * 3. Server validates that cookie token matches header token
 * 
 * @example
 * ```typescript
 * import { csrfProtection } from "./middlewares/csrf";
 * 
 * app.use("/api/*", csrfProtection({
 *   cookieName: "XSRF-TOKEN",
 *   headerName: "X-XSRF-TOKEN",
 *   excludePaths: ["/api/auth/login", "/api/auth/register"]
 * }));
 * ```
 */

interface CSRFOptions {
  /**
   * Name of the cookie to store the CSRF token
   * @default "XSRF-TOKEN"
   */
  cookieName?: string;
  
  /**
   * Name of the header to check for the CSRF token
   * @default "X-XSRF-TOKEN"
   */
  headerName?: string;
  
  /**
   * Paths to exclude from CSRF protection (e.g., login, register)
   * @default []
   */
  excludePaths?: string[];
  
  /**
   * Token expiry time in seconds
   * @default 3600 (1 hour)
   */
  tokenExpiry?: number;
  
  /**
   * Whether to use secure cookies (HTTPS only)
   * @default true in production
   */
  secure?: boolean;
  
  /**
   * SameSite cookie attribute
   * @default "strict"
   */
  sameSite?: "strict" | "lax" | "none";
}

/**
 * Generate a cryptographically secure random token
 */
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if the request path should be excluded from CSRF protection
 */
function isExcludedPath(path: string, excludePaths: string[]): boolean {
  return excludePaths.some(excluded => 
    path === excluded || path.startsWith(excluded + '/')
  );
}

/**
 * CSRF Protection Middleware Factory
 */
export function csrfProtection(options: CSRFOptions = {}) {
  const {
    cookieName = "XSRF-TOKEN",
    headerName = "X-XSRF-TOKEN",
    excludePaths = [],
    tokenExpiry = 3600,
    secure = process.env.NODE_ENV === "production",
    sameSite = "strict",
  } = options;

  return createMiddleware(async (c: Context, next: Next) => {
    const path = c.req.path;
    const method = c.req.method;

    // Skip CSRF protection for excluded paths
    if (isExcludedPath(path, excludePaths)) {
      return next();
    }

    // Skip CSRF protection for safe methods (GET, HEAD, OPTIONS)
    if (["GET", "HEAD", "OPTIONS"].includes(method)) {
      // Generate and set token for safe methods if it doesn't exist
      let token = getCookie(c, cookieName);
      
      if (!token) {
        token = generateToken();
        setCookie(c, cookieName, token, {
          httpOnly: false, // Must be accessible by JavaScript
          secure,
          sameSite,
          maxAge: tokenExpiry,
          path: "/",
        });
      }
      
      return next();
    }

    // Validate CSRF token for unsafe methods (POST, PUT, DELETE, PATCH)
    const cookieToken = getCookie(c, cookieName);
    const headerToken = c.req.header(headerName);

    if (!cookieToken) {
      logger.warn(`CSRF: Missing cookie token for ${method} ${path}`);
      return c.json(
        { 
          error: "CSRF token missing", 
          message: "Please refresh the page and try again" 
        }, 
        403
      );
    }

    if (!headerToken) {
      logger.warn(`CSRF: Missing header token for ${method} ${path}`);
      return c.json(
        { 
          error: "CSRF token missing in request", 
          message: "Please include the CSRF token in your request" 
        }, 
        403
      );
    }

    // Constant-time comparison to prevent timing attacks
    if (!constantTimeCompare(cookieToken, headerToken)) {
      logger.warn(`CSRF: Token mismatch for ${method} ${path}`);
      return c.json(
        { 
          error: "Invalid CSRF token", 
          message: "CSRF token validation failed. Please refresh and try again." 
        }, 
        403
      );
    }

    // Token is valid, proceed with the request
    return next();
  });
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Helper function to get the CSRF token from a Hono context
 * Useful for passing the token to the frontend
 */
export function getCSRFToken(c: Context, cookieName = "XSRF-TOKEN"): string | undefined {
  return getCookie(c, cookieName);
}

/**
 * Express-style CSRF middleware (alternative interface)
 */
export const csrf = csrfProtection;

export default csrfProtection;


