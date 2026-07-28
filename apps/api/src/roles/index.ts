import { Hono } from "hono";
import { and, eq, isNull } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getDatabase } from "../database/connection";
import {
  workspaceUserTable,
  userTable,
  roleAssignmentTable,
} from "../database/schema";
import { roles } from "../database/schema/rbac-unified";
import { ROLE_PERMISSIONS } from "../constants/rbac";
import {
  requirePermission,
  checkWorkspacePermission,
} from "../middlewares/rbac";
import { listRoles } from "./controllers/list-roles";
import { getRole } from "./controllers/get-role";
import { getRoleUsage } from "./controllers/get-role-usage";
import { resolveRolePermissions } from "./lib/resolve-role-permissions";
import { isSystemRoleId } from "./lib/system-roles";
import { createRole } from "./controllers/create-role";
import { updateRole } from "./controllers/update-role";
import { deleteRole } from "./controllers/delete-role";
import { cloneRole } from "./controllers/clone-role";

/**
 * Every permission key the system knows about.
 *
 * Deliberately the union across all roles, not the keys of the most
 * privileged one: workspace-manager is missing canViewAssignedTasks,
 * canUpdateAssignedTasks and canManageDepartment, which other roles define.
 * Taking any single role's keys would silently omit permissions from the
 * editor.
 */
const ALL_PERMISSION_KEYS = [
  ...new Set(
    Object.values(ROLE_PERMISSIONS).flatMap((permissions) =>
      Object.keys(permissions as Record<string, boolean>),
    ),
  ),
].sort();

const rolesRouter = new Hono<{
  Variables: { userEmail: string; userId?: string };
}>();

/** Workspaces the caller belongs to — the tenant boundary for custom roles. */
async function memberWorkspaceIds(userEmail: string): Promise<string[]> {
  const rows = await getDatabase()
    .select({ workspaceId: workspaceUserTable.workspaceId })
    .from(workspaceUserTable)
    .where(eq(workspaceUserTable.userEmail, userEmail));
  return rows.map((row) => row.workspaceId);
}

/**
 * The actor's own effective role and permissions — the ceiling for any role
 * they create.
 *
 * The assignment lookup is filtered on three things, all load-bearing:
 *
 * - `userId`, obviously.
 * - `workspaceId` (the workspace the role is being created in). Without it, a
 *   caller with a low-privilege assignment in the target workspace but an
 *   admin-level assignment elsewhere could mint an admin-level role there:
 *   `.limit(1)` with no `orderBy` returns whichever assignment the database
 *   happens to return first, so the ceiling must be pinned to the workspace
 *   in play, not "any assignment this user holds."
 * - `isActive`. /api/rbac/assign does not delete the old assignment when a
 *   user's role changes — it flips the old row to isActive:false and inserts
 *   a new one — so a demoted user has BOTH rows for the same workspace, and
 *   `.limit(1)` with no `orderBy` may return either. Every other assignment
 *   lookup in the RBAC surface (checkWorkspacePermission,
 *   checkProjectPermission, requirePermission, requireRole) filters on
 *   isActive, so without it here the gate in front of this function would
 *   read the caller's CURRENT role while the ceiling behind it read a
 *   revoked one: a user demoted from workspace-manager to a narrow custom
 *   role could pass the gate on the narrow role and still mint a role
 *   carrying their old workspace-manager permission set.
 *
 * With no matching ACTIVE assignment for that workspace the role falls back
 * to "guest" — NOT to `{}`. Guest is not empty: it grants
 * canViewPublicProjects (see ROLE_PERMISSIONS), so a caller in that state
 * can still mint a role granting exactly that one permission and nothing
 * else. Every other requested permission trips the escalation guard in
 * `createRole`. In practice the routes gate on canManageRolesInWorkspace
 * first, so a caller with no active assignment never reaches here.
 */
async function actorContext(userEmail: string, workspaceId: string) {
  const db = getDatabase();
  const [user] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, userEmail))
    .limit(1);

  if (!user) {
    throw new HTTPException(404, { message: "User not found" });
  }

  const [assignment] = await db
    .select()
    .from(roleAssignmentTable)
    .where(
      and(
        eq(roleAssignmentTable.userId, user.id),
        eq(roleAssignmentTable.workspaceId, workspaceId),
        eq(roleAssignmentTable.isActive, true),
      ),
    )
    .limit(1);

  const role = assignment?.role ?? "guest";
  const permissions = await resolveRolePermissions(
    role,
    assignment?.workspaceId ?? null,
  );

  return { userId: user.id, role, permissions };
}

/**
 * Loads just enough of a role to authorize a mutation against it: whether it
 * exists (and isn't already soft-deleted) and, if so, which workspace it
 * belongs to. update/delete/clone all need the workspace *before* they can
 * call actorContext (the actor's permission ceiling is workspace-scoped), so
 * this runs ahead of that — a second, lighter read than the one
 * updateRole/deleteRole perform themselves, but the tenant check can't be
 * skipped just because it's redundant.
 */
async function loadRoleForMutation(
  id: string,
): Promise<{ id: string; workspaceId: string | null } | null> {
  const [row] = await getDatabase()
    .select({ id: roles.id, workspaceId: roles.workspaceId })
    .from(roles)
    .where(and(eq(roles.id, id), isNull(roles.deletedAt)))
    .limit(1);
  return row ?? null;
}

/**
 * The tenant + permission boundary every role mutation must clear: an
 * ACTIVE assignment in this SPECIFIC workspace that itself grants
 * canManageRoles there. Workspace membership alone is not enough —
 * requirePermission's own check is workspace-unscoped (its own comment:
 * "does this user hold canManageRoles *anywhere*?", via `.limit(1)` with no
 * `orderBy` on whichever active assignment the query happens to return
 * first). Without pinning the check to the workspace actually being
 * mutated, a workspace-manager of their OWN workspace A — holding
 * canManageRoles there — could update/delete/clone a role in an unrelated
 * workspace B merely by being a plain member of B, despite holding no
 * canManageRoles grant in B at all. `checkWorkspacePermission` selects the
 * assignment scoped to the target workspace, so it answers the right
 * question.
 *
 * Always collapses to a boolean: whatever the underlying reason for denial
 * (no assignment in that workspace, an assignment there without the
 * permission, workspace doesn't exist), the route returns the same 404
 * `{ error: "Workspace not found" }` — never checkWorkspacePermission's own
 * 403 body, which would confirm to an outsider that the workspace (and the
 * role inside it) exists.
 */
async function canManageRolesInWorkspace(
  userEmail: string,
  workspaceId: string | null,
): Promise<boolean> {
  if (!workspaceId) return false;
  const result = await checkWorkspacePermission(
    userEmail,
    workspaceId,
    "canManageRoles",
  );
  return result.allowed;
}

rolesRouter
  .get("/", async (c) => {
    const type = c.req.query("type") as "all" | "system" | "custom" | undefined;
    const search = c.req.query("search") ?? undefined;
    const roleList = await listRoles({
      memberWorkspaceIds: await memberWorkspaceIds(c.get("userEmail")),
      type,
      search,
    });
    return c.json({ roles: roleList });
  })
  .post(
    "/",
    requirePermission("canManageRoles"),
    zValidator(
      "json",
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).nullable().optional(),
        color: z
          .string()
          .regex(/^#[0-9A-Fa-f]{6}$/)
          .optional(),
        permissions: z.array(z.string()).default([]),
        workspaceId: z.string().min(1),
      }),
    ),
    async (c) => {
      const body = c.req.valid("json");

      // Tenant + permission boundary: a custom role can only be created by
      // someone who holds canManageRoles IN that workspace. See
      // canManageRolesInWorkspace for why membership alone is not enough.
      // 404, not 403 — consistent with the read routes, and it doesn't
      // confirm the workspace exists to someone outside it.
      if (
        !(await canManageRolesInWorkspace(c.get("userEmail"), body.workspaceId))
      ) {
        return c.json({ error: "Workspace not found" }, 404);
      }

      const actor = await actorContext(c.get("userEmail"), body.workspaceId);
      const role = await createRole({
        name: body.name,
        description: body.description ?? null,
        color: body.color ?? "#3B82F6",
        permissions: body.permissions,
        workspaceId: body.workspaceId,
        actorUserId: actor.userId,
        actorRole: actor.role,
        actorPermissions: actor.permissions,
        ipAddress: c.req.header("x-forwarded-for"),
        userAgent: c.req.header("user-agent"),
      });
      return c.json({ role }, 201);
    },
  )
  // Registered before "/:id" so the literal path is not captured as an id.
  // RoleModal already queries this to populate its permission picker.
  .get("/permissions/all", (c) => c.json({ permissions: ALL_PERMISSION_KEYS }))
  .get("/:id/usage", async (c) => {
    const memberIds = await memberWorkspaceIds(c.get("userEmail"));
    return c.json(await getRoleUsage(c.req.param("id"), memberIds));
  })
  .get("/:id", async (c) => {
    const memberIds = await memberWorkspaceIds(c.get("userEmail"));
    return c.json({ role: await getRole(c.req.param("id"), memberIds) });
  })
  .put(
    "/:id",
    requirePermission("canManageRoles"),
    zValidator(
      "json",
      z.object({
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).nullable().optional(),
        color: z
          .string()
          .regex(/^#[0-9A-Fa-f]{6}$/)
          .optional(),
        permissions: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),
      }),
    ),
    async (c) => {
      const id = c.req.param("id");
      const target = await loadRoleForMutation(id);
      if (!target) {
        return c.json({ error: "Role not found" }, 404);
      }

      // Tenant + permission boundary: see canManageRolesInWorkspace. System
      // roles have no workspace and are rejected below by updateRole itself
      // (400, "built-in"), so the check is skipped for them rather than
      // producing a misleading 404 first.
      if (
        !isSystemRoleId(target.id) &&
        !(await canManageRolesInWorkspace(
          c.get("userEmail"),
          target.workspaceId,
        ))
      ) {
        return c.json({ error: "Workspace not found" }, 404);
      }

      const actor = await actorContext(
        c.get("userEmail"),
        target.workspaceId ?? "",
      );
      const role = await updateRole(id, {
        ...c.req.valid("json"),
        actorUserId: actor.userId,
        actorPermissions: actor.permissions,
        ipAddress: c.req.header("x-forwarded-for"),
        userAgent: c.req.header("user-agent"),
      });
      return c.json({ role });
    },
  )
  .delete("/:id", requirePermission("canManageRoles"), async (c) => {
    const id = c.req.param("id");
    const target = await loadRoleForMutation(id);
    if (!target) {
      return c.json({ error: "Role not found" }, 404);
    }

    if (
      !isSystemRoleId(target.id) &&
      !(await canManageRolesInWorkspace(c.get("userEmail"), target.workspaceId))
    ) {
      return c.json({ error: "Workspace not found" }, 404);
    }

    // Threaded into deleteRole so getRoleUsage's own tenant check (the same
    // primitive getRole uses) is answered by the caller's REAL membership
    // list, not derived from the row being acted on — deriving it from the
    // role's own workspace would make that check a tautology.
    const memberIds = await memberWorkspaceIds(c.get("userEmail"));
    const actor = await actorContext(
      c.get("userEmail"),
      target.workspaceId ?? "",
    );
    return c.json(
      await deleteRole(id, actor.userId, memberIds, {
        ipAddress: c.req.header("x-forwarded-for"),
        userAgent: c.req.header("user-agent"),
      }),
    );
  })
  .post(
    "/:id/clone",
    requirePermission("canManageRoles"),
    zValidator(
      "json",
      z.object({
        name: z.string().min(1).max(100).optional(),
        workspaceId: z.string().min(1),
      }),
    ),
    async (c) => {
      const body = c.req.valid("json");

      // Same tenant + permission boundary as POST /: the caller must hold
      // canManageRoles in the clone's DESTINATION workspace. The source
      // role's own visibility (system, or a custom role in a workspace the
      // caller can see) is enforced separately inside cloneRole via getRole,
      // using plain membership (below) — reading a role you can see and
      // authoring a copy of it into a workspace you administer are two
      // different questions.
      if (
        !(await canManageRolesInWorkspace(c.get("userEmail"), body.workspaceId))
      ) {
        return c.json({ error: "Workspace not found" }, 404);
      }

      const memberIds = await memberWorkspaceIds(c.get("userEmail"));
      const actor = await actorContext(c.get("userEmail"), body.workspaceId);
      const role = await cloneRole(c.req.param("id"), {
        name: body.name,
        workspaceId: body.workspaceId,
        actorUserId: actor.userId,
        actorRole: actor.role,
        actorPermissions: actor.permissions,
        memberWorkspaceIds: memberIds,
        ipAddress: c.req.header("x-forwarded-for"),
        userAgent: c.req.header("user-agent"),
      });
      return c.json({ role }, 201);
    },
  );

export default rolesRouter;
