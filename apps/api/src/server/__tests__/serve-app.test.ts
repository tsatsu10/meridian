import { Hono } from "hono";
import { afterEach, describe, expect, it } from "vitest";
import { startHttpServer } from "../serve-app";

/**
 * Regression tests for the HTTP server bootstrap.
 *
 * The server used to be a hand-rolled `createServer` that buffered the request
 * body **only** when content-type included "application/json", then rebuilt the
 * request as `new Request(url, { headers, body })`. Two bugs fell out of that:
 *
 *  1. Any non-JSON body (i.e. every file upload) reached Hono as
 *     `body: undefined` while still carrying its `multipart/form-data` header,
 *     so `c.req.parseBody()` threw "Failed to parse body as FormData" (500).
 *     That broke every upload route in the app, not just avatars.
 *  2. It buffered with `bodyData += chunk.toString()` — a UTF-8 *string*
 *     concat — which silently corrupts binary payloads. So merely extending
 *     the buffering to multipart would still have mangled real images.
 */

let running: { close: (cb?: () => void) => void } | undefined;

afterEach(async () => {
  const server = running;
  running = undefined;
  if (server)
    await new Promise<void>((resolve) => server.close(() => resolve()));
});

async function startEchoServer() {
  const app = new Hono();

  app.post("/upload", async (c) => {
    const body = await c.req.parseBody();
    const file = body.file as File;
    const bytes = new Uint8Array(await file.arrayBuffer());
    return c.json({
      fieldNames: Object.keys(body),
      fileName: file.name,
      bytes: Array.from(bytes),
    });
  });

  app.post("/json", async (c) => c.json({ received: await c.req.json() }));

  const { server, port } = await new Promise<{
    server: ReturnType<typeof startHttpServer>;
    port: number;
  }>((resolve) => {
    const s = startHttpServer(app, 0, () => {
      const address = (
        s as { address?: () => { port: number } | null }
      ).address?.();
      resolve({ server: s, port: address ? address.port : 0 });
    });
  });

  running = server as unknown as { close: (cb?: () => void) => void };
  return `http://127.0.0.1:${port}`;
}

describe("startHttpServer", () => {
  it("parses multipart uploads instead of dropping the body", async () => {
    const base = await startEchoServer();

    const form = new FormData();
    form.append(
      "file",
      new File([new Uint8Array([1, 2, 3])], "a.png", {
        type: "image/png",
      }),
    );

    const res = await fetch(`${base}/upload`, { method: "POST", body: form });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.fieldNames).toEqual(["file"]);
    expect(json.fileName).toBe("a.png");
  });

  it("preserves binary bytes exactly, including invalid UTF-8 sequences", async () => {
    const base = await startEchoServer();

    // PNG magic number followed by bytes that are not valid UTF-8 — these are
    // what a `chunk.toString()` buffer silently replaces with U+FFFD.
    const original = [
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xff, 0xfe, 0x00, 0x80,
    ];

    const form = new FormData();
    form.append(
      "file",
      new File([new Uint8Array(original)], "b.png", { type: "image/png" }),
    );

    const res = await fetch(`${base}/upload`, { method: "POST", body: form });
    const json = await res.json();

    expect(json.bytes).toEqual(original);
  });

  it("still handles JSON bodies", async () => {
    const base = await startEchoServer();

    const res = await fetch(`${base}/json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hello: "world" }),
    });

    expect(await res.json()).toEqual({ received: { hello: "world" } });
  });
});
