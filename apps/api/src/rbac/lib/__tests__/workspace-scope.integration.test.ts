/**
 * Workspace-scoping helpers — integration tests against a real database.
 *
 * These helpers are the tenant boundary for the whole /api/rbac read surface:
 * every route that used to answer instance-wide now narrows its query to the
 * ids one of them returns. Their entire correctness lives in SQL predicates
 * and in a set of empty-array edge cases, and the shared mock in
 * `tests/helpers/test-database.ts` sets
 * `chain.where = vi.fn().mockReturnValue(chain)` — it accepts predicates and
 * discards them. So a mocked test cannot tell a scoped query from an
 * unscoped one, which is the only thing worth testing here.
 *
 * The empty-array cases matter as much as the positive ones: every caller
 * checks `length === 0` before building an `inArray(...)` predicate, because
 * `inArray(column, [])` is not reliably a false predicate. A helper that
 * wrongly returned a non-empty list, or a caller that skipped the check, would
 * leak the whole table.
 *
 * Skips cleanly when no database is provisioned.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { getDatabase, initializeDatabase } from "../../../database/connection";
import {
  roleAssignmentTable,
  userTable,
  workspaceTable,
  workspaceUserTable,
} from "../../../database/schema";
import {
  memberWorkspaceIds,
  userIdForEmail,
  visibleWorkspaceIdsOrNone,
  workspaceIdsGranting,
} from "../workspace-scope";

const OWNER_EMAIL = "ws-scope-owner@example.invalid";
const OUTSIDER_EMAIL = "ws-scope-outsider@example.invalid";
const FIXTURE_WS = "ws-scope-fixture";

let db: ReturnType<typeof getDatabase>;
let ownerId = "";
let outsiderId = "";
let managedWs = ""; // owner is workspace-manager here
let memberWs = ""; // owner is only a `member` here
let foreignWs = ""; // owner has nothing to do with this one

async function connect(): Promise<boolean> {
  if (
    await initializeDatabase()
      .then(() => true)
      .catch(() => false)
  ) {
    return true;
  }
  const { config } = await import("dotenv");
  const fallback = config({ path: "./.env" }).parsed?.DATABASE_URL;
  if (!fallback) return false;
  process.env.DATABASE_URL = fallback;
  return initializeDatabase()
    .then(() => true)
    .catch(() => false);
}

const dbAvailable = await connect();

describe.skipIf(!dbAvailable)("rbac workspace scoping (integration)", () => {
  beforeAll(async () => {
    db = getDatabase();

    for (const email of [OWNER_EMAIL, OUTSIDER_EMAIL]) {
      await db.delete(userTable).where(eq(userTable.email, email));
    }

    const [owner] = await db
      .insert(userTable)
      .values({
        email: OWNER_EMAIL,
        name: "scope owner",
        password: "x",
      })
      .returning();
    const [outsider] = await db
      .insert(userTable)
      .values({
        email: OUTSIDER_EMAIL,
        name: "scope outsider",
        password: "x",
      })
      .returning();
    if (!owner || !outsider) throw new Error("fixture user insert failed");
    ownerId = owner.id;
    outsiderId = outsider.id;

    const made: string[] = [];
    for (let i = 0; i < 3; i++) {
      const [ws] = await db
        .insert(workspaceTable)
        .values({ name: FIXTURE_WS, ownerId })
        .returning();
      if (!ws) throw new Error("fixture workspace insert failed");
      made.push(ws.id);
    }
    [managedWs, memberWs, foreignWs] = made as [string, string, string];

    // Owner administers `managedWs` and is a plain member of `memberWs`.
    await db.insert(roleAssignmentTable).values([
      {
        userId: ownerId,
        role: "workspace-manager",
        workspaceId: managedWs,
        isActive: true,
      },
      {
        userId: ownerId,
        role: "member",
        workspaceId: memberWs,
        isActive: true,
      },
      // An INACTIVE admin assignment in the foreign workspace: must not count.
      {
        userId: ownerId,
        role: "workspace-manager",
        workspaceId: foreignWs,
        isActive: false,
      },
    ]);

    await db.insert(workspaceUserTable).values([
      {
        workspaceId: managedWs,
        userId: ownerId,
        userEmail: OWNER_EMAIL,
      },
      {
        workspaceId: memberWs,
        userId: ownerId,
        userEmail: OWNER_EMAIL,
      },
      {
        workspaceId: foreignWs,
        userId: outsiderId,
        userEmail: OUTSIDER_EMAIL,
      },
    ]);
  });

  afterAll(async () => {
    if (!dbAvailable || !ownerId) return;
    await db
      .delete(workspaceTable)
      .where(inArray(workspaceTable.id, [managedWs, memberWs, foreignWs]));
    for (const email of [OWNER_EMAIL, OUTSIDER_EMAIL]) {
      await db.delete(userTable).where(eq(userTable.email, email));
    }
  });

  describe("memberWorkspaceIds", () => {
    it("returns only the workspaces the caller belongs to", async () => {
      const ids = await memberWorkspaceIds(OWNER_EMAIL);

      expect(new Set(ids)).toEqual(new Set([managedWs, memberWs]));
      expect(ids).not.toContain(foreignWs);
    });

    // The empty case every caller depends on before building inArray().
    it("returns empty for a caller with no workspaces", async () => {
      await expect(
        memberWorkspaceIds("nobody-at-all@example.invalid"),
      ).resolves.toEqual([]);
    });

    it("returns empty for an absent email rather than throwing", async () => {
      await expect(memberWorkspaceIds(undefined)).resolves.toEqual([]);
    });
  });

  describe("workspaceIdsGranting", () => {
    // The distinction the administrative routes rely on: membership is NOT
    // permission. `memberWs` must not appear — the owner is only a `member`
    // there and `member` does not grant canManageRoles.
    it("returns only workspaces where the role actually grants the permission", async () => {
      const ids = await workspaceIdsGranting(OWNER_EMAIL, "canManageRoles");

      expect(ids).toEqual([managedWs]);
      expect(ids).not.toContain(memberWs);
    });

    // Pins eq(isActive, true): the foreign workspace carries an INACTIVE
    // workspace-manager row. A revoked assignment must not widen the scope.
    it("ignores inactive assignments", async () => {
      const ids = await workspaceIdsGranting(OWNER_EMAIL, "canManageRoles");

      expect(ids).not.toContain(foreignWs);
    });

    it("returns empty when the caller holds the permission nowhere", async () => {
      await expect(
        workspaceIdsGranting(OUTSIDER_EMAIL, "canManageRoles"),
      ).resolves.toEqual([]);
    });

    it("returns empty for an absent email rather than throwing", async () => {
      await expect(
        workspaceIdsGranting(undefined, "canManageRoles"),
      ).resolves.toEqual([]);
    });
  });

  describe("userIdForEmail", () => {
    it("resolves a known email", async () => {
      await expect(userIdForEmail(OWNER_EMAIL)).resolves.toBe(ownerId);
    });

    // Must be null, never undefined-compared-to-a-param: a self check of the
    // form `userIdForEmail(...) === req.param("userId")` has to be false for
    // an unknown caller, not accidentally true.
    it("returns null for an unknown email", async () => {
      await expect(
        userIdForEmail("no-such-user@example.invalid"),
      ).resolves.toBeNull();
    });

    it("returns null for an absent email", async () => {
      await expect(userIdForEmail(undefined)).resolves.toBeNull();
    });
  });

  describe("visibleWorkspaceIdsOrNone", () => {
    it("returns the full visible set when nothing specific is requested", () => {
      expect(visibleWorkspaceIdsOrNone(["a", "b"], undefined)).toEqual([
        "a",
        "b",
      ]);
    });

    it("narrows to a requested workspace the caller may see", () => {
      expect(visibleWorkspaceIdsOrNone(["a", "b"], "b")).toEqual(["b"]);
    });

    // The important direction: a workspace the caller may NOT see must yield
    // an empty list, so the route returns nothing instead of everything.
    it("returns empty for a workspace the caller may not see", () => {
      expect(visibleWorkspaceIdsOrNone(["a", "b"], "z")).toEqual([]);
    });
  });
});
