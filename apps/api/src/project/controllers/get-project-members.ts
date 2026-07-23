import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { projectMemberTable, userTable } from "../../database/schema";

async function getProjectMembers(projectId: string) {
  const db = getDatabase();

  const members = await db
    .select({
      id: projectMemberTable.id,
      projectId: projectMemberTable.projectId,
      userEmail: projectMemberTable.userEmail,
      role: projectMemberTable.role,
      permissions: projectMemberTable.permissions,
      assignedAt: projectMemberTable.assignedAt,
      assignedBy: projectMemberTable.assignedBy,
      hoursPerWeek: projectMemberTable.hoursPerWeek,
      isActive: projectMemberTable.isActive,
      notificationSettings: projectMemberTable.notificationSettings,
      userName: userTable.name,
      userCreatedAt: userTable.createdAt,
    })
    .from(projectMemberTable)
    .leftJoin(userTable, eq(projectMemberTable.userEmail, userTable.email))
    .where(eq(projectMemberTable.projectId, projectId));

  return members;
}

export default getProjectMembers;
