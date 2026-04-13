import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { workspaceUserTable } from "../../database/schema";

async function updateWorkspaceUser(userEmail: string, status: string) {
  const db = getDatabase();
  const [updatedWorkspaceUser] = await db
    .update(workspaceUserTable)
    .set({ status })
    .where(eq(workspaceUserTable.userEmail, userEmail))
    .returning();

  return updatedWorkspaceUser;
}

export default updateWorkspaceUser;

