import { and, eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { roleAssignmentTable } from "../../database/schema";

export async function getRoleUsage(roleId: string): Promise<{
  usersCount: number;
  lastUsedAt: Date | null;
  assignments: { userId: string; assignedAt: Date | null }[];
}> {
  const rows = await getDatabase()
    .select({
      userId: roleAssignmentTable.userId,
      assignedAt: roleAssignmentTable.assignedAt,
    })
    .from(roleAssignmentTable)
    .where(
      and(
        eq(roleAssignmentTable.role, roleId),
        eq(roleAssignmentTable.isActive, true),
      ),
    );

  let lastUsedAt: Date | null = null;
  for (const row of rows) {
    const at = row.assignedAt ? new Date(row.assignedAt) : null;
    if (at && (!lastUsedAt || at > lastUsedAt)) {
      lastUsedAt = at;
    }
  }

  return { usersCount: rows.length, lastUsedAt, assignments: rows };
}
