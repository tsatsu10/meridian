import { getDatabase } from "../../database/connection";
import { roleAuditLog } from "../../database/schema/rbac-unified";
import logger from "../../utils/logger";

export type RoleAuditInput = {
  action: "role_created" | "role_updated" | "role_deleted";
  roleId: string;
  changedBy: string;
  workspaceId: string | null;
  previousValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  userAgent?: string;
};

/**
 * Records a role *definition* change.
 *
 * Deliberately not role_history: that table records assignment changes and its
 * user_id is NOT NULL, whereas creating a role involves no user. The
 * assignmentId column here references the unused role_assignments table and is
 * left null.
 *
 * Auditing must never break the operation it is recording, so failures are
 * logged rather than thrown.
 */
export async function recordRoleAudit(input: RoleAuditInput): Promise<void> {
  try {
    await getDatabase()
      .insert(roleAuditLog)
      .values({
        action: input.action,
        roleId: input.roleId,
        changedBy: input.changedBy,
        workspaceId: input.workspaceId,
        previousValue: input.previousValue ?? null,
        newValue: input.newValue ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      });
  } catch (error) {
    logger.error("Failed to record role audit entry:", error);
  }
}
