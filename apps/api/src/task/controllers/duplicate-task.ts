import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { getDatabase } from "../../database/connection";
import { taskTable, userTable, teamTable, channelTable, projectTable, labelTaskTable } from "../../database/schema";
import { publishEvent } from "../../events";
import getNextTaskNumber from "./get-next-task-number";
import { createId } from "@paralleldrive/cuid2";
import logger from "../../utils/logger";

async function duplicateTask({
  taskId,
  duplicatedBy,
}: {
  taskId: string;
  duplicatedBy: string;
}) {
  const db = getDatabase();

  // Fetch the original task with all related data
  const originalTask = await db.query.taskTable.findFirst({
    where: eq(taskTable.id, taskId),
  });

  if (!originalTask) {
    throw new HTTPException(404, {
      message: "Original task not found",
    });
  }

  // Get assignee name if it's a user assignment
  const [assignee] = originalTask.userEmail ? await db
    .select({ name: userTable.name })
    .from(userTable)
    .where(eq(userTable.email, originalTask.userEmail)) : [null];

  // Get team name if it's a team assignment
  const [team] = originalTask.assignedTeamId ? await db
    .select({ name: teamTable.name })
    .from(teamTable)
    .where(eq(teamTable.id, originalTask.assignedTeamId)) : [null];

  // Get the next task number for the project
  const nextTaskNumber = await getNextTaskNumber(originalTask.projectId);

  // Generate a smart title with copy suffix
  let duplicatedTitle = `${originalTask.title} (Copy)`;

  // Check if there are already copies and increment number
  const existingCopies = await db
    .select({ title: taskTable.title })
    .from(taskTable)
    .where(eq(taskTable.projectId, originalTask.projectId));

  const copyPattern = new RegExp(`^${originalTask.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\(Copy( \\d+)?\\)$`);
  const copies = existingCopies.filter(task => copyPattern.test(task.title));

  if (copies.length > 0) {
    const copyNumbers = copies
      .map(task => {
        const match = task.title.match(/Copy( (\d+))?/);
        return match ? (match[2] ? parseInt(match[2]) : 1) : 0;
      })
      .filter(num => num > 0);

    const maxCopyNumber = Math.max(...copyNumbers, 0);
    duplicatedTitle = `${originalTask.title} (Copy ${maxCopyNumber + 1})`;
  }

  // Create the duplicated task
  const [duplicatedTask] = await db
    .insert(taskTable)
    .values({
      projectId: originalTask.projectId,
      userEmail: originalTask.userEmail,
      assignedTeamId: originalTask.assignedTeamId,
      title: duplicatedTitle,
      status: "to-do", // Reset status for new task
      dueDate: originalTask.dueDate,
      description: originalTask.description,
      priority: originalTask.priority,
      parentId: originalTask.parentId,
      number: nextTaskNumber + 1,
      position: 0, // Place at top of column
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  if (!duplicatedTask) {
    throw new HTTPException(500, {
      message: "Failed to duplicate task",
    });
  }

  // Duplicate task labels if any exist
  try {
    const taskLabels = await db
      .select()
      .from(labelTaskTable)
      .where(eq(labelTaskTable.taskId, taskId));

    if (taskLabels.length > 0) {
      const labelInserts = taskLabels.map(label => ({
        id: createId(),
        labelId: label.labelId,
        taskId: duplicatedTask.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await db.insert(labelTaskTable).values(labelInserts);
      logger.info(`✅ Duplicated ${taskLabels.length} labels for task ${duplicatedTask.id}`);
    }
  } catch (error) {
    logger.warn(`⚠️ Failed to duplicate labels for task ${duplicatedTask.id}:`, error);
    // Continue execution - label duplication is not critical
  }

  // Publish duplication event
  await publishEvent("task.duplicated", {
    originalTaskId: taskId,
    duplicatedTaskId: duplicatedTask.id,
    userEmail: duplicatedBy,
    type: "duplicate",
    content: `duplicated task "${originalTask.title}"`,
  });

  // Create a dedicated channel for the duplicated task
  try {
    const project = await db
      .select({ workspaceId: projectTable.workspaceId })
      .from(projectTable)
      .where(eq(projectTable.id, originalTask.projectId))
      .limit(1);

    const workspaceId = project[0]?.workspaceId;
    if (workspaceId) {
      await db
        .insert(channelTable)
        .values({
          name: duplicatedTitle,
          description: `Chat for duplicated task: ${duplicatedTitle}`,
          type: "task",
          workspaceId: workspaceId,
          projectId: originalTask.projectId,
          createdBy: duplicatedBy,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      logger.info(`✅ Created channel for duplicated task ${duplicatedTask.id}`);
    }
  } catch (error) {
    logger.warn(`⚠️ Failed to create channel for duplicated task ${duplicatedTask.id}:`, error);
    // Continue execution - channel creation is not critical
  }

  logger.info(`✅ Successfully duplicated task ${taskId} -> ${duplicatedTask.id}`);

  return {
    ...duplicatedTask,
    assigneeName: assignee?.name,
    assignedTeam: team?.name ? { id: originalTask.assignedTeamId, name: team.name } : undefined,
  };
}

export default duplicateTask;

