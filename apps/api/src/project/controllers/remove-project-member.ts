import { eq, and } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { getDatabase } from "../../database/connection";
import { projectMemberTable } from "../../database/schema";

async function removeProjectMember(projectId: string, memberEmail: string) {
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

  // Remove member from project
  await db
    .delete(projectMemberTable)
    .where(
      and(
        eq(projectMemberTable.projectId, projectId),
        eq(projectMemberTable.userEmail, memberEmail)
      )
    );

  return { 
    success: true, 
    message: "Project member removed successfully",
    removedMember: existingMember 
  };
}

export default removeProjectMember; 
