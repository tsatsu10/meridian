import type { MiddlewareHandler } from "hono";

/**
 * Adds caching headers to successful GET responses.
 *
 * `/api/` responses are per-user and mutable, so they must never be reused from
 * the browser cache without asking the server first: a stored response would
 * outlive the mutation that invalidated it, and the client would keep rendering
 * pre-mutation data until the entry expired. `no-cache` still allows storing —
 * revalidation is cheap because of the ETag below, which lets the server answer
 * with a bodyless 304.
 */
function cacheHeaders(): MiddlewareHandler {
  return async (c, next) => {
    await next();

    // Only add caching to successful GET requests
    if (c.req.method === "GET" && c.res.status === 200) {
      const path = c.req.path;

      // Static assets - aggressive caching
      if (path.includes("/uploads/") || path.includes("/assets/")) {
        c.header("Cache-Control", "public, max-age=31536000, immutable");
      }
      // API responses - always revalidate, 304 when unchanged
      else if (path.startsWith("/api/")) {
        c.header("Cache-Control", "private, no-cache, must-revalidate");

        // Add ETag for conditional requests and return 304 when matched
        const body = await c.res.clone().text();
        if (body) {
          const hash = Buffer.from(body).toString("base64").substring(0, 27);
          const etag = `"${hash}"`;
          c.header("ETag", etag);

          const ifNoneMatch = c.req.header("if-none-match");
          if (ifNoneMatch && ifNoneMatch === etag) {
            // Short-circuit with 304 Not Modified
            c.res = new Response(null, { status: 304, headers: c.res.headers });
          }
        }
      }
    }
  };
}

export default cacheHeaders;
