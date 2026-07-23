/**
 * Regression: `/api/` responses are per-user and mutable. If the browser is
 * allowed to reuse a stored response without revalidating, a client that
 * refetches after a mutation keeps rendering pre-mutation data until the entry
 * expires — e.g. creating your first workspace and having the workspace list
 * keep returning `[]` until a manual page reload.
 */

import { Hono } from "hono";
import { describe, it, expect } from "vitest";
import cacheHeaders from "../cache-headers";

function buildApp() {
  const app = new Hono();
  app.use("*", cacheHeaders());
  app.get("/api/workspaces", (c) => c.json([{ id: "ws-1" }]));
  app.get("/uploads/logo.png", (c) => c.text("png-bytes"));
  app.get("/api/missing", (c) => c.json({ error: "nope" }, 404));
  app.post("/api/workspace", (c) => c.json({ id: "ws-1" }, 201));
  return app;
}

const cacheControlOf = (res: Response) =>
  res.headers.get("Cache-Control") ?? "";

describe("cacheHeaders middleware", () => {
  describe("/api/ responses", () => {
    it("does not let the browser reuse a response without revalidating", async () => {
      const res = await buildApp().request("/api/workspaces");
      const cc = cacheControlOf(res);

      // Either never stored, or stored but always revalidated first.
      expect(cc).toMatch(/no-store|no-cache/);
    });

    it("does not advertise a positive freshness lifetime", async () => {
      const res = await buildApp().request("/api/workspaces");
      const cc = cacheControlOf(res);

      // `max-age=60` keeps the response fresh for 60s, so the browser serves it
      // from cache and the refetch after a mutation never reaches the server.
      expect(cc).not.toMatch(/max-age=[1-9]/);
    });

    it("stays private to the user", async () => {
      const res = await buildApp().request("/api/workspaces");
      expect(cacheControlOf(res)).toContain("private");
    });

    it("still sets an ETag so revalidation is cheap", async () => {
      const res = await buildApp().request("/api/workspaces");
      expect(res.headers.get("ETag")).toBeTruthy();
    });

    it("answers 304 when the client's ETag still matches", async () => {
      const app = buildApp();
      const first = await app.request("/api/workspaces");
      const etag = first.headers.get("ETag") as string;

      const second = await app.request("/api/workspaces", {
        headers: { "if-none-match": etag },
      });

      expect(second.status).toBe(304);
    });

    it("returns a fresh body once the resource changes", async () => {
      const app = buildApp();
      const stale = await app.request("/api/workspaces");
      const staleEtag = stale.headers.get("ETag") as string;

      // A different payload must not be short-circuited by the old ETag.
      const app2 = new Hono();
      app2.use("*", cacheHeaders());
      app2.get("/api/workspaces", (c) =>
        c.json([{ id: "ws-1" }, { id: "ws-2" }]),
      );

      const res = await app2.request("/api/workspaces", {
        headers: { "if-none-match": staleEtag },
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toHaveLength(2);
    });
  });

  describe("other responses", () => {
    it("caches static assets aggressively", async () => {
      const res = await buildApp().request("/uploads/logo.png");
      expect(cacheControlOf(res)).toBe("public, max-age=31536000, immutable");
    });

    it("leaves non-200 responses alone", async () => {
      const res = await buildApp().request("/api/missing");
      expect(res.headers.get("Cache-Control")).toBeNull();
    });

    it("leaves non-GET responses alone", async () => {
      const res = await buildApp().request("/api/workspace", {
        method: "POST",
      });
      expect(res.headers.get("Cache-Control")).toBeNull();
    });
  });
});
