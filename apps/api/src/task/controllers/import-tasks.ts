import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { getDatabase } from "../../database/connection";
import { projectTable, taskTable, userTable, teamTable } from "../../database/schema";
import { publishEvent } from "../../events";
import getNextTaskNumber from "./get-next-task-number";

type ImportTask = {
  title: string;
  description?: string;
  status: string;
  priority?: string;
  dueDate?: string;
  userEmail?: string | null;
  assignedTeamId?: string | null;
};

async function importTasks(projectId: string, tasksToImport: ImportTask[]) {
  const db = getDatabase();
  const project = await db.query.projectTable.findFirst({
    where: eq(projectTable.id, projectId),
  });

  if (!project) {
    throw new HTTPException(404, {
      message: "Project not found",
    });
  }

  const nextTaskNumber = await getNextTaskNumber(projectId);
  let taskNumber = nextTaskNumber;

  const results = [];

  for (const taskData of tasksToImport) {
    try {
      // Validate that we're not trying to assign to both user and team
      if (taskData.userEmail && taskData.assignedTeamId) {
        throw new HTTPException(400, {
          message: "Task cannot be assigned to both a user and a team",
        });
      }

      // Get assignee name if it's a user assignment
      const [assignee] = taskData.userEmail ? await db
        .select({ name: userTable.name })
        .from(userTable)
        .where(eq(userTable.email, taskData.userEmail)) : [null];

      // Get team name if it's a team assignment  
      const [team] = taskData.assignedTeamId ? await db
        .select({ name: teamTable.name })
        .from(teamTable)
        .where(eq(teamTable.id, taskData.assignedTeamId)) : [null];

      const [createdTask] = await db
        .insert(taskTable)
        .values({
          projectId,
          userEmail: taskData.userEmail || null,
          assignedTeamId: taskData.assignedTeamId || null,
          title: taskData.title,
          status: taskData.status,
          dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
          description: taskData.description || "",
          priority: taskData.priority || "low",
          number: ++taskNumber,
        })
        .returning();

      if (createdTask) {
        await publishEvent("task.created", {
          taskId: createdTask.id,
          userEmail: createdTask.userEmail ?? "",
          teamId: createdTask.assignedTeamId ?? "",
          type: "create",
          content: "imported the task",
        });

        results.push({
          success: true,
          task: {
            ...createdTask,
            assigneeName: assignee?.name,
            assignedTeam: team?.name ? { id: taskData.assignedTeamId, name: team.name } : undefined,
          },
        });
      } else {
        results.push({
          success: false,
          error: "Failed to create task",
          task: taskData,
        });
      }
    } catch (error) {
      results.push({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        task: taskData,
      });
    }
  }

  return {
    importedAt: new Date().toISOString(),
    project: {
      id: project.id,
      name: project.name,
      slug: project.slug,
    },
    results: {
      total: tasksToImport.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      tasks: results,
    },
  };
}

export default importTasks;

