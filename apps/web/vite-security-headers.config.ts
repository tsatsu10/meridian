/**
 * Security Headers Configuration for Vite
 * 
 * These headers MUST be set by the server, not in HTML meta tags.
 * Add these to your production server configuration.
 */

export const securityHeaders = {
  // Content Security Policy (comprehensive version)
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://plausible.meridian.app",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' http://localhost:* https: wss: ws:", // Allow localhost API in development
    "frame-src 'self' https://www.youtube.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'", // Only works as HTTP header
    "upgrade-insecure-requests"
  ].join('; '),

  // Prevent clickjacking (only works as HTTP header)
  'X-Frame-Options': 'DENY',

  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Enable XSS protection
  'X-XSS-Protection': '1; mode=block',

  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // HTTPS enforcement (enable in production)
  // 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  // Permissions policy
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

/**
 * Vite Plugin to add security headers in development
 */
export function securityHeadersPlugin() {
  return {
    name: 'security-headers',
    configureServer(server: any) {
      server.middlewares.use((_req: any, res: any, next: any) => {
        // Add security headers to all responses
        Object.entries(securityHeaders).forEach(([key, value]) => {
          res.setHeader(key, value);
        });
        next();
      });
    },
  };
}

/**
 * For production deployment:
 * 
 * ### Nginx
 * ```nginx
 * location / {
 *   add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'...";
 *   add_header X-Frame-Options "DENY";
 *   add_header X-Content-Type-Options "nosniff";
 *   add_header X-XSS-Protection "1; mode=block";
 *   add_header Referrer-Policy "strict-origin-when-cross-origin";
 *   add_header Permissions-Policy "camera=(), microphone=(), geolocation=()";
 * }
 * ```
 * 
 * ### Vercel (vercel.json)
 * ```json
 * {
 *   "headers": [
 *     {
 *       "source": "/(.*)",
 *       "headers": [
 *         { "key": "X-Frame-Options", "value": "DENY" },
 *         { "key": "X-Content-Type-Options", "value": "nosniff" }
 *       ]
 *     }
 *   ]
 * }
 * ```
 * 
 * ### Netlify (_headers file)
 * ```
 * /*
 *   X-Frame-Options: DENY
 *   X-Content-Type-Options: nosniff
 *   X-XSS-Protection: 1; mode=block
 * ```
 * 
 * ### Express.js
 * ```javascript
 * app.use((req, res, next) => {
 *   res.setHeader('X-Frame-Options', 'DENY');
 *   res.setHeader('X-Content-Type-Options', 'nosniff');
 *   next();
 * });
 * ```
 */

