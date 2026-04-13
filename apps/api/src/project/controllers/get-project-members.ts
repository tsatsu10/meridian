import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { userTable } from "../../database/schema";
import logger from '../../utils/logger';

async function getProjectMembers(projectId: string) {
  // TODO: projectMemberTable doesn't exist in schema yet
  // Return empty array for now to prevent 500 errors
  // This feature needs proper database schema migration

  logger.debug(`⚠️ getProjectMembers called for project ${projectId} - table not implemented yet`);

  return [];

  /* Future implementation when projectMemberTable is added to schema:
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

  return members.map(member => ({
    ...member,
    permissions: member.permissions ? JSON.parse(member.permissions) : null,
    notificationSettings: member.notificationSettings ? JSON.parse(member.notificationSettings) : null,
  }));
  */
}

export default getProjectMembers; 
