import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { getDatabase } from "../../database/connection";
import { projectTable, workspaceTable } from "../../database/schema";

async function getProject(id: string, workspaceId: string) {
  const db = getDatabase();
  const [project] = await db
    .select({
      id: projectTable.id,
      name: projectTable.name,
      slug: projectTable.slug,
      description: projectTable.description,
      workspaceId: projectTable.workspaceId,
      ownerId: projectTable.ownerId,
      workspace: workspaceTable,
      icon: projectTable.icon,
      color: projectTable.color,
      status: projectTable.status,
      priority: projectTable.priority,
      startDate: projectTable.startDate,
      dueDate: projectTable.dueDate,
      completedAt: projectTable.completedAt,
      settings: projectTable.settings, // Important: includes all extra fields!
      isArchived: projectTable.isArchived,
      createdAt: projectTable.createdAt,
      updatedAt: projectTable.updatedAt,
    })
    .from(projectTable)
    .leftJoin(workspaceTable, eq(projectTable.workspaceId, workspaceTable.id))
    .where(
      and(eq(projectTable.id, id), eq(projectTable.workspaceId, workspaceId)),
    );

  if (!project) {
    throw new HTTPException(404, {
      message: "Project not found",
    });
  }

  return project;
}

export default getProject;

