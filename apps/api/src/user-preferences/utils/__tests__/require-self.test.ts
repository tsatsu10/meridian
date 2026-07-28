import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { requireSelf } from "../require-self";

/**
 * Regression: every route in src/user-preferences took its target user from
 * `:userEmail` / `?userEmail` / the JSON body and never compared it to the
 * session. The router is authenticated by the global /api/* middleware but had
 * no authorization at all, so any signed-in user could read and overwrite any
 * other user's preferences by changing the email in the URL. Verified against
 * the running dev server before this guard existed: signed in as user A, a
 * PATCH to user B's font preferences returned 200 and B's row changed.
 */
function buildApp() {
  const app = new Hono();

  // Stands in for the global auth middleware, which sets this variable.
  app.use("*", async (c, next) => {
    const session = c.req.header("x-test-session");
    if (session) {
      c.set("userEmail", session);
    }
    await next();
  });

  app.get("/prefs/:userEmail", (c) => {
    const auth = requireSelf(c, c.req.param("userEmail"));
    if (!auth.ok) {
      return auth.response;
    }
    return c.json({ ok: true, userEmail: auth.userEmail });
  });

  return app;
}

describe("requireSelf", () => {
  it("allows a user to reach their own preferences", async () => {
    const res = await buildApp().request("/prefs/owner@example.com", {
      headers: { "x-test-session": "owner@example.com" },
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      userEmail: "owner@example.com",
    });
  });

  it("blocks reading another user's preferences with 403", async () => {
    const res = await buildApp().request("/prefs/victim@example.com", {
      headers: { "x-test-session": "attacker@example.com" },
    });

    expect(res.status).toBe(403);
  });

  it("does not leak whether the other account exists", async () => {
    const res = await buildApp().request("/prefs/victim@example.com", {
      headers: { "x-test-session": "attacker@example.com" },
    });

    const body = (await res.json()) as Record<string, unknown>;
    expect(JSON.stringify(body)).not.toContain("victim@example.com");
  });

  it("rejects with 401 when there is no session at all", async () => {
    const res = await buildApp().request("/prefs/anyone@example.com");

    expect(res.status).toBe(401);
  });

  it("rejects a missing target with 400 rather than falling through", async () => {
    const app = new Hono();
    app.use("*", async (c, next) => {
      c.set("userEmail", "owner@example.com");
      await next();
    });
    app.get("/prefs", (c) => {
      const auth = requireSelf(c, undefined);
      if (!auth.ok) {
        return auth.response;
      }
      return c.json({ ok: true });
    });

    const res = await app.request("/prefs");
    expect(res.status).toBe(400);
  });

  it("is case-sensitive — a differently-cased address is not the same account", async () => {
    // users.email is the FK target across 19 tables and is matched exactly
    // everywhere else, so authorization must not be looser than lookup.
    const res = await buildApp().request("/prefs/Owner@Example.com", {
      headers: { "x-test-session": "owner@example.com" },
    });

    expect(res.status).toBe(403);
  });

  it("ignores a non-string target instead of coercing it", async () => {
    const app = new Hono();
    app.use("*", async (c, next) => {
      c.set("userEmail", "owner@example.com");
      await next();
    });
    app.post("/prefs", async (c) => {
      const body = (await c.req.json()) as { userEmail?: unknown };
      const auth = requireSelf(c, body.userEmail);
      if (!auth.ok) {
        return auth.response;
      }
      return c.json({ ok: true });
    });

    const res = await app.request("/prefs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userEmail: { toString: "owner@example.com" } }),
    });

    expect(res.status).toBe(400);
  });
});
