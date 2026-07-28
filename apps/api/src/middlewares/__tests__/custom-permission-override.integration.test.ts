/**
 * applyCustomPermissionOverride — integration tests against a real database.
 *
 * Custom overrides sit at the very end of every permission decision: whatever
 * the caller's role concluded, an override can flip it. Before this module
 * they were resolved by a query filtered on `userId` + `permission` alone, so
 * the `workspaceId`, `projectId` and `expiresAt` columns on the table were
 * decorative — one row granted or revoked a permission in EVERY workspace,
 * forever.
 *
 * All of that behaviour is a SQL WHERE clause plus a scope-matching filter,
 * and the shared mock in `tests/helpers/test-database.ts` discards predicates
 * (`chain.where = vi.fn().mockReturnValue(chain)`). A mocked test cannot tell
 * an expiring, workspace-scoped lookup from the unscoped one it replaced.
 *
 * The revoke direction matters as much as the grant direction: an override
 * that fails to apply where it should is a privilege the admin thought they
 * had removed.
 *
 * Skips cleanly when no database is provisioned.
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDatabase, initializeDatabase } from "../../database/connection";
import {
  customPermissionTable,
  projectTable,
  userTable,
  workspaceTable,
} from "../../database/schema";
import { applyCustomPermissionOverride } from "../custom-permission-override";

const EMAIL = "custom-override-fixture@example.invalid";
const FIXTURE_WS = "custom-override-fixture-ws";
const PERMISSION = "canManageRoles";

let db: ReturnType<typeof getDatabase>;
let userId = "";
let wsA = "";
let wsB = "";
// A real project row: custom_permissions.project_id is a foreign key, so the
// project-scoped cases cannot use an invented id.
let projectId = "";

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

async function override(values: {
  granted: boolean;
  workspaceId?: string | null;
  projectId?: string | null;
  expiresAt?: Date | null;
}) {
  await db.insert(customPermissionTable).values({
    userId,
    permission: PERMISSION,
    granted: values.granted,
    workspaceId: values.workspaceId ?? null,
    projectId: values.projectId ?? null,
    expiresAt: values.expiresAt ?? null,
  });
}

describe.skipIf(!dbAvailable)(
  "applyCustomPermissionOverride (integration)",
  () => {
    beforeAll(async () => {
      db = getDatabase();
      await db.delete(userTable).where(eq(userTable.email, EMAIL));

      const [user] = await db
        .insert(userTable)
        .values({ email: EMAIL, name: "override fixture", password: "x" })
        .returning();
      if (!user) throw new Error("fixture user insert failed");
      userId = user.id;

      const [a] = await db
        .insert(workspaceTable)
        .values({ name: FIXTURE_WS, ownerId: userId })
        .returning();
      const [b] = await db
        .insert(workspaceTable)
        .values({ name: FIXTURE_WS, ownerId: userId })
        .returning();
      if (!a || !b) throw new Error("fixture workspace insert failed");
      wsA = a.id;
      wsB = b.id;

      const [project] = await db
        .insert(projectTable)
        .values({ name: FIXTURE_WS, workspaceId: wsA, ownerId: userId })
        .returning();
      if (!project) throw new Error("fixture project insert failed");
      projectId = project.id;
    });

    afterEach(async () => {
      await db
        .delete(customPermissionTable)
        .where(eq(customPermissionTable.userId, userId));
    });

    afterAll(async () => {
      if (!dbAvailable || !userId) return;
      await db.delete(userTable).where(eq(userTable.email, EMAIL));
    });

    it("returns the role's decision unchanged when no override exists", async () => {
      await expect(
        applyCustomPermissionOverride(userId, PERMISSION, false, {
          workspaceId: wsA,
        }),
      ).resolves.toBe(false);
      await expect(
        applyCustomPermissionOverride(userId, PERMISSION, true, {
          workspaceId: wsA,
        }),
      ).resolves.toBe(true);
    });

    describe("workspace scoping", () => {
      it("applies a workspace-scoped grant inside its own workspace", async () => {
        await override({ granted: true, workspaceId: wsA });

        await expect(
          applyCustomPermissionOverride(userId, PERMISSION, false, {
            workspaceId: wsA,
          }),
        ).resolves.toBe(true);
      });

      // THE bug this module exists for: one row must not grant everywhere.
      it("does NOT apply a workspace-scoped grant in a different workspace", async () => {
        await override({ granted: true, workspaceId: wsA });

        await expect(
          applyCustomPermissionOverride(userId, PERMISSION, false, {
            workspaceId: wsB,
          }),
        ).resolves.toBe(false);
      });

      // The coarse gate has no workspace context. Honouring a scoped row there
      // is precisely how a single workspace's override became global.
      it("does NOT apply a workspace-scoped grant to a check with no workspace", async () => {
        await override({ granted: true, workspaceId: wsA });

        await expect(
          applyCustomPermissionOverride(userId, PERMISSION, false),
        ).resolves.toBe(false);
      });

      it("applies an unscoped override anywhere, including with no workspace", async () => {
        await override({ granted: true, workspaceId: null });

        await expect(
          applyCustomPermissionOverride(userId, PERMISSION, false, {
            workspaceId: wsB,
          }),
        ).resolves.toBe(true);
        await expect(
          applyCustomPermissionOverride(userId, PERMISSION, false),
        ).resolves.toBe(true);
      });

      // Revokes must be scoped identically — a revoke leaking across workspaces
      // is a denial-of-service on the other tenant.
      it("does NOT apply a workspace-scoped revoke in a different workspace", async () => {
        await override({ granted: false, workspaceId: wsA });

        await expect(
          applyCustomPermissionOverride(userId, PERMISSION, true, {
            workspaceId: wsB,
          }),
        ).resolves.toBe(true);
        await expect(
          applyCustomPermissionOverride(userId, PERMISSION, true, {
            workspaceId: wsA,
          }),
        ).resolves.toBe(false);
      });
    });

    describe("project scoping", () => {
      it("does NOT apply a project-scoped override to the workspace at large", async () => {
        await override({
          granted: true,
          workspaceId: wsA,
          projectId,
        });

        await expect(
          applyCustomPermissionOverride(userId, PERMISSION, false, {
            workspaceId: wsA,
          }),
        ).resolves.toBe(false);
      });

      it("applies a project-scoped override to its own project", async () => {
        await override({
          granted: true,
          workspaceId: wsA,
          projectId,
        });

        await expect(
          applyCustomPermissionOverride(userId, PERMISSION, false, {
            workspaceId: wsA,
            projectId,
          }),
        ).resolves.toBe(true);
      });
    });

    describe("expiry", () => {
      // Pins the expiresAt predicate. An expired grant that still applies is a
      // permission nobody believes is outstanding.
      it("ignores an expired grant", async () => {
        await override({
          granted: true,
          workspaceId: wsA,
          expiresAt: new Date(Date.now() - 60_000),
        });

        await expect(
          applyCustomPermissionOverride(userId, PERMISSION, false, {
            workspaceId: wsA,
          }),
        ).resolves.toBe(false);
      });

      it("ignores an expired revoke, restoring the role's decision", async () => {
        await override({
          granted: false,
          workspaceId: wsA,
          expiresAt: new Date(Date.now() - 60_000),
        });

        await expect(
          applyCustomPermissionOverride(userId, PERMISSION, true, {
            workspaceId: wsA,
          }),
        ).resolves.toBe(true);
      });

      it("honours an override that has not expired yet", async () => {
        await override({
          granted: true,
          workspaceId: wsA,
          expiresAt: new Date(Date.now() + 3_600_000),
        });

        await expect(
          applyCustomPermissionOverride(userId, PERMISSION, false, {
            workspaceId: wsA,
          }),
        ).resolves.toBe(true);
      });
    });

    it("lets the most recent applicable row win", async () => {
      await override({ granted: true, workspaceId: wsA });
      // Ensure a strictly later createdAt rather than relying on clock ties.
      await new Promise((resolve) => setTimeout(resolve, 1100));
      await override({ granted: false, workspaceId: wsA });

      await expect(
        applyCustomPermissionOverride(userId, PERMISSION, true, {
          workspaceId: wsA,
        }),
      ).resolves.toBe(false);
    });

    // Precedence must be decided among APPLICABLE rows only: a newer row scoped
    // to another workspace must not suppress an older row that does apply.
    it("ignores a newer row scoped elsewhere when picking the winner", async () => {
      await override({ granted: true, workspaceId: wsA });
      await new Promise((resolve) => setTimeout(resolve, 1100));
      await override({ granted: false, workspaceId: wsB });

      await expect(
        applyCustomPermissionOverride(userId, PERMISSION, false, {
          workspaceId: wsA,
        }),
      ).resolves.toBe(true);
    });
  },
);
