import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { getDatabase } from "../database/connection";
import { workspaceUserTable } from "../database/schema";
import { ROLE_PERMISSIONS } from "../constants/rbac";
import { listRoles } from "./controllers/list-roles";
import { getRole } from "./controllers/get-role";
import { getRoleUsage } from "./controllers/get-role-usage";

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
  // Registered before "/:id" so the literal path is not captured as an id.
  // RoleModal already queries this to populate its permission picker.
  .get("/permissions/all", (c) => c.json({ permissions: ALL_PERMISSION_KEYS }))
  .get("/:id/usage", async (c) => c.json(await getRoleUsage(c.req.param("id"))))
  .get("/:id", async (c) => c.json({ role: await getRole(c.req.param("id")) }));

export default rolesRouter;
