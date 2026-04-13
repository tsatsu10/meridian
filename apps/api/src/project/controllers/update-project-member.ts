import { eq, and } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { getDatabase } from "../../database/connection";
import { projectMemberTable } from "../../database/schema";

interface UpdateMemberData {
  role?: string;
  hoursPerWeek?: number;
  isActive?: boolean;
  notificationSettings?: Record<string, boolean>;
}

async function updateProjectMember(
  projectId: string, 
  memberEmail: string, 
  data: UpdateMemberData
) {
  const db = getDatabase();
  // Check if member exists
  const [existingMember] = await db
    .select()
    .from(projectMemberTable)
    .where(
      and(
        eq(projectMemberTable.projectId, projectId),
        eq(projectMemberTable.userEmail, memberEmail)
      )
    );

  if (!existingMember) {
    throw new HTTPException(404, {
      message: "Project member not found",
    });
  }

  // Build update object
  const updateFields: any = {};
  
  if (data.role !== undefined) updateFields.role = data.role;
  if (data.hoursPerWeek !== undefined) updateFields.hoursPerWeek = data.hoursPerWeek;
  if (data.isActive !== undefined) updateFields.isActive = data.isActive;
  if (data.notificationSettings !== undefined) {
    updateFields.notificationSettings = JSON.stringify(data.notificationSettings);
  }

  // Update member
  const [updatedMember] = await db
    .update(projectMemberTable)
    .set(updateFields)
    .where(
      and(
        eq(projectMemberTable.projectId, projectId),
        eq(projectMemberTable.userEmail, memberEmail)
      )
    )
    .returning();

  return updatedMember;
}

export default updateProjectMember; 
