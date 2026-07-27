import { and, eq, isNull } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { roles } from "../../database/schema/rbac-unified";
import { getRolePermissions } from "../../constants/rbac";
import type { UserRole } from "../../types/rbac";
import { isSystemRoleId } from "./system-roles";
import { permissionsToRecord } from "./permission-set";

const CACHE_TTL_MS = 30_000;

type CacheEntry = { permissions: Record<string, boolean>; expiresAt: number };

const cache = new Map<string, CacheEntry>();

export function invalidateRoleCache(roleId: string): void {
  for (const key of cache.keys()) {
    if (key === roleId || key.startsWith(`${roleId}:`)) {
      cache.delete(key);
    }
  }
}

/**
 * Resolves a stored `role_assignment.role` value into a permission record.
 *
 * Built-in role names resolve from the ROLE_PERMISSIONS constant exactly as
 * they always have — no query, no behaviour change. Anything else is treated
 * as a custom role id.
 *
 * Fails closed: an unknown, inactive, soft-deleted or wrong-workspace role
 * yields {}, which denies every permission check.
 */
export async function resolveRolePermissions(
  role: string,
  workspaceId: string | null,
): Promise<Record<string, boolean>> {
  if (isSystemRoleId(role)) {
    return getRolePermissions(role as UserRole);
  }

  const cacheKey = `${role}:${workspaceId ?? ""}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.permissions;
  }

  const db = getDatabase();
  const found = await db
    .select()
    .from(roles)
    .where(
      and(
        eq(roles.id, role),
        eq(roles.isActive, true),
        isNull(roles.deletedAt),
      ),
    )
    .limit(1);

  const [row] = found as {
    permissions: string[] | null;
    workspaceId: string | null;
  }[];

  let permissions: Record<string, boolean> = {};
  if (
    row?.permissions &&
    (row.workspaceId === null || row.workspaceId === workspaceId)
  ) {
    permissions = permissionsToRecord(row.permissions);
  }

  cache.set(cacheKey, { permissions, expiresAt: Date.now() + CACHE_TTL_MS });
  return permissions;
}
