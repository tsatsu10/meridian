/**
 * Dev-server-only. Renders a diagnosable response when the Vite proxy cannot
 * reach the API.
 *
 * Vite's default behaviour on a proxy connection error is to answer the browser
 * with `500 Internal Server Error` and a text/plain body. In this repo that is
 * actively misleading: `apps/api` runs under `tsx watch`, and
 * `apps/api/src/index.ts` awaits `initializeDatabase()` before `startServer()`
 * binds port 3005 — so every save to the API reopens a multi-second window in
 * which port 3005 refuses connections and every /api call in the browser
 * reports a 500 that never came from the API at all.
 *
 * A 503 that names the unreachable target is honest about what happened
 * (upstream unavailable, retry) and cannot be confused with a server fault.
 *
 * Types here are structural rather than imported from `node:http` so this
 * module carries no Node dependency and typechecks under the app's DOM-only
 * tsconfig. Same reasoning as `apps/api/src/server/serve-app.ts`.
 */

type ProxyError = {
  message?: string;
  code?: string;
};

/**
 * Either a `ServerResponse` or, when a websocket upgrade fails, the raw
 * `net.Socket` that `http-proxy` passes instead — which has no `writeHead`.
 */
type ProxyErrorTarget = {
  headersSent?: boolean;
  writeHead?: (status: number, headers: Record<string, string>) => unknown;
  end?: (chunk?: string) => unknown;
  destroy?: () => unknown;
};

export const DEV_PROXY_UNREACHABLE_CODE = "DEV_PROXY_UPSTREAM_UNREACHABLE";

export function writeProxyErrorResponse({
  error,
  requestUrl,
  target,
  res,
  log = (message) => console.error(message),
}: {
  error: ProxyError;
  requestUrl: string | undefined;
  target: string;
  res: ProxyErrorTarget;
  log?: (message: string) => void;
}): void {
  const path = requestUrl ?? "(unknown path)";

  const reason = error.code ?? error.message ?? "unknown error";

  log(
    [
      `[dev-proxy] ${path} → ${target} failed: ${reason}.`,
      "The API is probably restarting (tsx watch); it does not accept",
      "connections until its database connection is ready.",
    ].join(" "),
  );

  // A raw upgrade socket can't be sent an HTTP response, and once headers are
  // out it's too late to change the status. Both cases: just drop it.
  if (typeof res.writeHead !== "function" || res.headersSent) {
    res.destroy?.();
    return;
  }

  const body = JSON.stringify({
    error: {
      message: [
        `Dev proxy could not reach the API at ${target}.`,
        "It is most likely still starting up — apps/api runs under `tsx watch`",
        "and does not bind its port until initializeDatabase() resolves, so",
        "every save to the API briefly refuses connections.",
        "Retry in a few seconds.",
        "This response came from the Vite dev proxy, not from the API.",
      ].join(" "),
      code: DEV_PROXY_UNREACHABLE_CODE,
      statusCode: 503,
      target,
      syscall: error.code,
      path,
      timestamp: new Date().toISOString(),
    },
  });

  res.writeHead(503, {
    "Content-Type": "application/json",
    // Nothing about this response should ever be cached or reused.
    "Cache-Control": "no-store",
    // Signal to the browser (and to fetch retry logic) that this is transient.
    "Retry-After": "2",
  });
  res.end?.(body);
}
