/**
 * 🛡️ Theme (backlog-category) authorization middleware
 *
 * Theme routes previously authenticated (required a logged-in user) but never
 * authorized — any user could read/modify any project's themes. These guards
 * enforce project-scoped RBAC via the shared checkProjectPermission helper.
 *
 * - create/read routes carry :projectId  -> requireThemeProjectPermission
 * - update/delete routes carry :themeId  -> requireThemePermission resolves the
 *   theme to its project first, then runs the same check.
 */

import { createMiddleware } from "hono/factory";
import { eq } from "drizzle-orm";
import { getDatabase } from "../database/connection";
import { backlogThemesTable } from "../database/schema";
import { checkProjectPermission } from "../middlewares/rbac";
import type { PermissionAction } from "../types/rbac";

type ThemeContext = { Variables: { userEmail: string } };

/** Guard a route that carries the project id in a path param. */
export function requireThemeProjectPermission(
  permission: PermissionAction,
  projectIdParam = "projectId",
) {
  return createMiddleware<ThemeContext>(async (c, next) => {
    const projectId = c.req.param(projectIdParam);
    if (!projectId) {
      return c.json({ success: false, error: "Project context required" }, 400);
    }

    const result = await checkProjectPermission(
      c.get("userEmail"),
      projectId,
      permission,
    );
    if (!result.allowed) {
      return c.json({ success: false, ...result.body }, result.status ?? 403);
    }

    await next();
  });
}

/** Guard a route that carries the theme id; resolve it to its project first. */
export function requireThemePermission(
  permission: PermissionAction,
  themeIdParam = "themeId",
) {
  return createMiddleware<ThemeContext>(async (c, next) => {
    const themeId = c.req.param(themeIdParam);
    if (!themeId) {
      return c.json({ success: false, error: "Theme context required" }, 400);
    }

    const db = getDatabase();
    const [theme] = await db
      .select({ projectId: backlogThemesTable.projectId })
      .from(backlogThemesTable)
      .where(eq(backlogThemesTable.id, themeId))
      .limit(1);

    if (!theme) {
      return c.json({ success: false, error: "Theme not found" }, 404);
    }

    const result = await checkProjectPermission(
      c.get("userEmail"),
      theme.projectId,
      permission,
    );
    if (!result.allowed) {
      return c.json({ success: false, ...result.body }, result.status ?? 403);
    }

    await next();
  });
}
