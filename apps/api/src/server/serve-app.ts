import { serve } from "@hono/node-server";

type FetchHandler = {
  fetch: (request: Request) => Response | Promise<Response>;
};

/**
 * Boots the API's HTTP server.
 *
 * This used to be a hand-rolled `createServer` that buffered the request body
 * itself and then rebuilt the request as `new Request(url, { headers, body })`.
 * That approach had two defects:
 *
 *  1. It only buffered when the content-type was "application/json". Every
 *     other body — i.e. every multipart file upload — reached Hono as
 *     `body: undefined` while still carrying its `multipart/form-data` header,
 *     so `c.req.parseBody()` threw "Failed to parse body as FormData" (500).
 *     That silently broke every upload route in the app.
 *  2. It buffered into a string via `chunk.toString()`, which decodes as UTF-8
 *     and corrupts any binary payload.
 *
 * `@hono/node-server` streams the body straight through, so both problems go
 * away and there is no bespoke parsing to keep correct.
 */
export function startHttpServer(
  app: FetchHandler,
  port: number,
  onListen?: () => void,
) {
  return serve({ fetch: app.fetch, port }, onListen && (() => onListen()));
}
