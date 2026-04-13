import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { getDatabase } from "../../database/connection";
import { taskTable, userTable, teamTable, projectTable } from "../../database/schema";
import { publishEvent } from "../../events";
import getNextTaskNumber from "./get-next-task-number";
import { ActivityTracker } from "../../services/team-awareness/activity-tracker";
import { sanitizeText, sanitizeRichText } from "../../lib/universal-sanitization";
import { captureException, addBreadcrumb } from "../../services/monitoring/sentry";
import logger from "../../utils/logger";

async function createTask({
  projectId,
  userEmail,
  assignedTeamId,
  title,
  status,
  dueDate,
  description,
  priority,
  parentId,
  creatorId, // Add creatorId to track who created the task
}: {
  projectId: string;
  userEmail?: string;
  assignedTeamId?: string;
  title: string;
  status: string;
  dueDate?: Date;
  description?: string;
  priority?: string;
  parentId?: string;
  creatorId?: string; // Optional - will use assigneeId as fallback
}) {
  try {
    const db = getDatabase();

  // Validate that we're not trying to assign to both user and team
  if (userEmail && assignedTeamId) {
    throw new HTTPException(400, {
      message: "Task cannot be assigned to both a user and a team",
    });
  }

  // Get assignee ID and name if it's a user assignment
  const [assignee] = userEmail ? await db
    .select({ id: userTable.id, name: userTable.name })
    .from(userTable)
    .where(eq(userTable.email, userEmail)) : [null];

  // Get team name if it's a team assignment
  const [team] = assignedTeamId ? await db
    .select({ name: teamTable.name })
    .from(teamTable)
    .where(eq(teamTable.id, assignedTeamId)) : [null];

  // 🔒 SECURITY: Sanitize all user inputs to prevent XSS
  const sanitizedTitle = sanitizeText(title || '', { maxLength: 200, stripHtmlTags: true });
  const sanitizedDescription = sanitizeRichText(description || '', { maxLength: 5000 });
  
  if (!sanitizedTitle || sanitizedTitle.length === 0) {
    throw new HTTPException(400, {
      message: "Task title cannot be empty or contain only dangerous content",
    });
  }

  const nextTaskNumber = await getNextTaskNumber(projectId);

  const [createdTask] = await db
    .insert(taskTable)
    .values({
      projectId,
      assigneeId: assignee?.id || null, // Use assigneeId instead of userEmail
      title: sanitizedTitle,
      status: status || "",
      dueDate: dueDate || new Date(),
      description: sanitizedDescription,
      priority: priority || "",
      parentTaskId: parentId || null, // Use parentTaskId instead of parentId
      number: nextTaskNumber + 1,
      // Note: assignedTeamId not in schema - store in task metadata/settings if needed
    })
    .returning();

  if (!createdTask) {
    throw new HTTPException(500, {
      message: "Failed to create task",
    });
  }

  await publishEvent("task.created", {
    taskId: createdTask.id,
    assigneeId: createdTask.assigneeId ?? "",
    teamId: assignedTeamId ?? "", // From function parameter
    type: "create",
    content: "created the task",
  });

  // 🎯 Log activity for real-time dashboard tracking
  try {
    // Get project to retrieve workspaceId
    const [project] = await db
      .select({ workspaceId: projectTable.workspaceId })
      .from(projectTable)
      .where(eq(projectTable.id, projectId));

    if (project && project.workspaceId) {
      const actorUserId = creatorId || createdTask.assigneeId || "";
      
      if (actorUserId) {
        await ActivityTracker.logTaskActivity(
          actorUserId,
          project.workspaceId,
          projectId,
          'created',
          createdTask.id,
          title
        );
      }
    }
  } catch (error) {
    // Don't fail task creation if activity logging fails
    console.error('Failed to log task creation activity:', error);
  }

    // 📊 SENTRY: Add breadcrumb for successful task creation
    addBreadcrumb('Task created successfully', 'task', 'info', {
      taskId: createdTask.id,
      projectId,
      hasDescription: !!description,
      priority,
      status,
    });

    return {
      ...createdTask,
      assigneeName: assignee?.name,
      assignedTeam: team?.name ? { id: assignedTeamId, name: team.name } : undefined,
    };
  } catch (error) {
    logger.error("Error creating task:", error);
    
    // 📊 SENTRY: Capture task creation errors
    if (!(error instanceof HTTPException)) {
      captureException(error as Error, {
        feature: 'tasks',
        action: 'create_task',
        projectId,
        userEmail,
        title: title?.substring(0, 100),
      });
    }
    
    if (error instanceof HTTPException) {
      throw error;
    }

    throw new HTTPException(500, { message: "Failed to create task" });
  }
}

export default createTask;

