import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getDatabase } from "../database/connection";
import {
  workspaceUserTable,
  userTable,
  roleAssignmentTable,
} from "../database/schema";
import { ROLE_PERMISSIONS } from "../constants/rbac";
import { requirePermission } from "../middlewares/rbac";
import { listRoles } from "./controllers/list-roles";
import { getRole } from "./controllers/get-role";
import { getRoleUsage } from "./controllers/get-role-usage";
import { resolveRolePermissions } from "./lib/resolve-role-permissions";
import { createRole } from "./controllers/create-role";

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

/** The actor's own effective permissions — the ceiling for any role they create. */
async function actorContext(userEmail: string) {
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
    .where(eq(roleAssignmentTable.userId, user.id))
    .limit(1);

  const permissions = await resolveRolePermissions(
    assignment?.role ?? "guest",
    assignment?.workspaceId ?? null,
  );

  return { userId: user.id, permissions };
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
      const actor = await actorContext(c.get("userEmail"));
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
  });

export default rolesRouter;
