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
import { requirePermission } from "../middlewares/rbac";
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
 * The actor's own effective permissions — the ceiling for any role they
 * create.
 *
 * The assignment lookup is filtered to `workspaceId` (the workspace the role
 * is being created in), not just `userId`. Without that filter, a caller
 * with a low-privilege assignment in the target workspace but an
 * admin-level assignment elsewhere could mint an admin-level role there:
 * `.limit(1)` with no `orderBy` returns whichever assignment the database
 * happens to return first, so the ceiling must be pinned to the workspace in
 * play, not "any assignment this user holds." No matching assignment for
 * that workspace resolves to `{}` (fails closed), so any requested
 * permission trips the escalation guard in `createRole`.
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
      ),
    )
    .limit(1);

  const permissions = await resolveRolePermissions(
    assignment?.role ?? "guest",
    assignment?.workspaceId ?? null,
  );

  return { userId: user.id, permissions };
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
 * Same tenant boundary the POST route enforces, applied to a role that
 * already exists: the caller must belong to the workspace the role lives in
 * before they can update, delete, or clone-from-into it. Without this, the
 * cross-workspace escalation POST was just fixed for would simply reopen
 * through PUT/DELETE/clone. System roles have no workspace to check — they
 * are rejected on their own terms (400, "built-in") inside the controllers.
 */
async function assertMemberOfRoleWorkspace(
  userEmail: string,
  workspaceId: string | null,
): Promise<boolean> {
  if (!workspaceId) return false;
  const memberIds = await memberWorkspaceIds(userEmail);
  return memberIds.includes(workspaceId);
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

      // Tenant boundary: a custom role can only be created in a workspace
      // the caller is a member of. Without this, requirePermission's
      // unscoped assignment lookup ("do they hold canManageRoles
      // *anywhere*?") would let a manager in workspace A mint roles inside
      // workspace B despite having no membership there. 404, not 403 —
      // consistent with the read routes, and it doesn't confirm the
      // workspace exists to someone outside it.
      const memberIds = await memberWorkspaceIds(c.get("userEmail"));
      if (!memberIds.includes(body.workspaceId)) {
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

      // Tenant boundary: see assertMemberOfRoleWorkspace. System roles have
      // no workspace and are rejected below by updateRole itself.
      if (
        !isSystemRoleId(target.id) &&
        !(await assertMemberOfRoleWorkspace(
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
      !(await assertMemberOfRoleWorkspace(
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
    return c.json(
      await deleteRole(id, actor.userId, {
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

      // Same tenant boundary as POST /: the clone's destination workspace
      // must be one the caller belongs to. The source role's own visibility
      // (system, or a custom role in a workspace the caller can see) is
      // enforced separately inside cloneRole via getRole.
      const memberIds = await memberWorkspaceIds(c.get("userEmail"));
      if (!memberIds.includes(body.workspaceId)) {
        return c.json({ error: "Workspace not found" }, 404);
      }

      const actor = await actorContext(c.get("userEmail"), body.workspaceId);
      const role = await cloneRole(c.req.param("id"), {
        name: body.name,
        workspaceId: body.workspaceId,
        actorUserId: actor.userId,
        actorPermissions: actor.permissions,
        memberWorkspaceIds: memberIds,
        ipAddress: c.req.header("x-forwarded-for"),
        userAgent: c.req.header("user-agent"),
      });
      return c.json({ role }, 201);
    },
  );

export default rolesRouter;
