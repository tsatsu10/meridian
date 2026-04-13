import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { getDatabase } from "../../database/connection";
import { workspaceUserTable } from "../../database/schema";

async function getWorkspaceUser(id: string) {
  const db = getDatabase();
  const [workspaceUser] = await db
    .select()
    .from(workspaceUserTable)
    .where(eq(workspaceUserTable.id, id))
    .limit(1);

  if (!workspaceUser) {
    throw new HTTPException(404, {
      message: "Workspace user not found",
    });
  }

  return workspaceUser;
}

export default getWorkspaceUser;

