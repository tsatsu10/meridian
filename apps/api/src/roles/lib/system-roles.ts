import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
// NOTE: imported from the subfile, not "../../database/schema". The barrel's
// `export * from "./schema/rbac-unified"` is circular (rbac-unified imports
// back from ../schema), so these names are absent from the barrel at runtime.
import { roles } from "../../database/schema/rbac-unified";
import { ROLE_PERMISSIONS } from "../../constants/rbac";
import logger from "../../utils/logger";

/**
 * The built-in roles. Their ids are the same slugs already stored in
 * `role_assignment.role`, so seeding them does not invalidate any existing
 * assignment.
 */
export const SYSTEM_ROLE_IDS = Object.keys(
  ROLE_PERMISSIONS,
) as readonly string[];

const SYSTEM_ROLE_ID_SET = new Set(SYSTEM_ROLE_IDS);

export function isSystemRoleId(value: string): boolean {
  return SYSTEM_ROLE_ID_SET.has(value);
}

function toDisplayName(id: string): string {
  return id
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Idempotent. `permissions` is deliberately left NULL for system roles: their
 * permissions continue to come from the ROLE_PERMISSIONS constant, so there is
 * exactly one source of truth.
 */
export async function seedSystemRoles(): Promise<void> {
  const db = getDatabase();

  for (const id of SYSTEM_ROLE_IDS) {
    const existing = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.id, id))
      .limit(1);

    if (existing.length > 0) {
      continue;
    }

    await db.insert(roles).values({
      id,
      name: toDisplayName(id),
      description: `Built-in ${toDisplayName(id)} role`,
      type: "system",
      permissions: null,
      workspaceId: null,
      isActive: true,
    });
  }

  logger.debug(`🛡️ Seeded ${SYSTEM_ROLE_IDS.length} system roles`);
}
