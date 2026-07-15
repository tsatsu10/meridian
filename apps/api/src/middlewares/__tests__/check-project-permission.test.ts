import { describe, it, expect, afterEach } from "vitest";
import { checkProjectPermission } from "../rbac";
import { initializeDatabase } from "../../database/connection";

// The demo-bypass and unauthenticated branches short-circuit before any DB
// access, so they run everywhere. The role-lookup branch needs the test
// database and is gated below.
const dbAvailable = await initializeDatabase()
  .then(() => true)
  .catch(() => false);

describe("checkProjectPermission", () => {
  const savedEnv = { ...process.env };
  afterEach(() => {
    process.env = { ...savedEnv };
  });

  describe("auth + demo branches (no database)", () => {
    it("bypasses the check for the demo admin in demo mode", async () => {
      process.env.DEMO_MODE = "true";
      process.env.ADMIN_EMAIL = "admin@meridian.app";

      const result = await checkProjectPermission(
        "admin@meridian.app",
        "project-1",
        "canManageProjectSettings",
      );

      expect(result.allowed).toBe(true);
    });

    it("does not bypass a non-admin email even in demo mode", async () => {
      // A non-admin in demo mode must fall through to the real check, not be
      // blanket-allowed. With no DB it should surface the DB failure path,
      // never { allowed: true }.
      process.env.DEMO_MODE = "true";
      process.env.ADMIN_EMAIL = "admin@meridian.app";

      const result = await checkProjectPermission(
        "someone-else@example.com",
        "project-1",
        "canManageProjectSettings",
      ).catch(() => ({ allowed: false as const }));

      expect(result.allowed).toBe(false);
    });

    it("denies with 401 when unauthenticated and not in demo mode", async () => {
      process.env.DEMO_MODE = "false";

      const result = await checkProjectPermission(
        undefined,
        "project-1",
        "canManageProjectSettings",
      );

      expect(result.allowed).toBe(false);
      expect(result.status).toBe(401);
    });
  });

  describe.skipIf(!dbAvailable)("role-lookup branch (needs test DB)", () => {
    it("denies with 404 for an unknown user", async () => {
      process.env.DEMO_MODE = "false";

      const result = await checkProjectPermission(
        `missing-${Date.now()}@example.com`,
        "project-1",
        "canManageProjectSettings",
      );

      expect(result.allowed).toBe(false);
      expect(result.status).toBe(404);
    });
  });
});
