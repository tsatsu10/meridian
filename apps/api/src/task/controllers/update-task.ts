import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { getDatabase } from "../../database/connection";
import { taskTable, userTable, projectTable } from "../../database/schema";
import { publishEvent } from "../../events";
import { getWebSocketServer } from "../../realtime/websocket-singleton";
import { ActivityTracker } from "../../services/team-awareness/activity-tracker";
import logger from '../../utils/logger';
import { sanitizeText, sanitizeRichText } from "../../lib/universal-sanitization";
import { captureException, addBreadcrumb } from "../../services/monitoring/sentry";

async function updateTask(
  id: string,
  title: string,
  status: string,
  dueDate: Date,
  projectId: string,
  description: string,
  priority: string,
  position: number,
  userEmail?: string,
  parentId?: string,
  assignedTeamId?: string,
  updaterId?: string, // User who is making the update
) {
  try {
    const db = getDatabase();
    const existingTask = await db.query.taskTable.findFirst({
      where: eq(taskTable.id, id),
    });

  if (!existingTask) {
    throw new HTTPException(404, {
      message: "Task not found",
    });
  }

  // Validate that we're not trying to assign to both user and team
  if (userEmail && assignedTeamId) {
    throw new HTTPException(400, {
      message: "Task cannot be assigned to both a user and a team",
    });
  }

  // 🔒 SECURITY: Sanitize all user inputs
  const sanitizedTitle = sanitizeText(title || '', { maxLength: 200, stripHtmlTags: true });
  const sanitizedDescription = sanitizeRichText(description || '', { maxLength: 5000 });
  
  if (!sanitizedTitle || sanitizedTitle.length === 0) {
    throw new HTTPException(400, {
      message: "Task title cannot be empty or contain only dangerous content",
    });
  }

  // Get assignee ID if email is provided
  const [assignee] = userEmail ? await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, userEmail)) : [null];

  const [updatedTask] = await db
    .update(taskTable)
    .set({
      title: sanitizedTitle,
      status,
      dueDate,
      projectId,
      description: sanitizedDescription,
      priority,
      position,
      assigneeId: assignee?.id || null, // Use assigneeId instead of userEmail
      parentTaskId: parentId || null, // Use parentTaskId instead of parentId
      // Note: assignedTeamId not in schema - store in task metadata if needed
    })
    .where(eq(taskTable.id, id))
    .returning();

  if (!updatedTask) {
    throw new HTTPException(500, {
      message: "Failed to update task",
    });
  }

  if (existingTask.status !== status) {
    await publishEvent("task.status_changed", {
      taskId: updatedTask.id,
      assigneeId: updatedTask.assigneeId,
      oldStatus: existingTask.status,
      newStatus: status,
      title: updatedTask.title,
    });
    
    // Phase 3: Emit WebSocket event for task completion
    if (status === 'done' && existingTask.status !== 'done') {
      const wsServer = getWebSocketServer();
      const workspaceId = updatedTask.workspaceId || 'default';
      
      if (wsServer && updatedTask.projectId) {
        wsServer.emitToWorkspace(workspaceId, 'task:completed', {
          taskId: updatedTask.id,
          title: updatedTask.title,
          projectId: updatedTask.projectId,
          workspaceId,
          completedAt: new Date(),
        });
      }

      // 🎯 Log activity for completed task
      try {
        const [project] = await db
          .select({ workspaceId: projectTable.workspaceId })
          .from(projectTable)
          .where(eq(projectTable.id, projectId));

        if (project && project.workspaceId) {
          const actorUserId = updaterId || updatedTask.assigneeId || "";
          
          if (actorUserId) {
            await ActivityTracker.logTaskActivity(
              actorUserId,
              project.workspaceId,
              projectId,
              'completed',
              updatedTask.id,
              title
            );
          }
        }
      } catch (error) {
        logger.error('Failed to log task completion activity:', error);
      }
    } else if (existingTask.status !== status) {
      // 🎯 Log activity for status change (not completed)
      try {
        const [project] = await db
          .select({ workspaceId: projectTable.workspaceId })
          .from(projectTable)
          .where(eq(projectTable.id, projectId));

        if (project && project.workspaceId) {
          const actorUserId = updaterId || updatedTask.assigneeId || "";
          
          if (actorUserId) {
            await ActivityTracker.logTaskActivity(
              actorUserId,
              project.workspaceId,
              projectId,
              'updated',
              updatedTask.id,
              title,
              { oldStatus: existingTask.status, newStatus: status }
            );
          }
        }
      } catch (error) {
        logger.error('Failed to log task update activity:', error);
      }
    }
  }

  if (existingTask.assigneeId !== updatedTask.assigneeId) {
    await publishEvent("task.assignee_changed", {
      taskId: updatedTask.id,
      newAssigneeId: updatedTask.assigneeId || undefined,
      newTeam: assignedTeamId || undefined,
      title: updatedTask.title,
    });
  }

    // 📊 SENTRY: Add breadcrumb for successful update
    addBreadcrumb('Task updated successfully', 'task', 'info', {
      taskId: id,
      statusChanged: existingTask.status !== status,
      assigneeChanged: existingTask.assigneeId !== updatedTask.assigneeId,
    });

    return updatedTask;
  } catch (error) {
    logger.error("Error updating task:", error);
    
    // 📊 SENTRY: Capture task update errors
    if (!(error instanceof HTTPException)) {
      captureException(error as Error, {
        feature: 'tasks',
        action: 'update_task',
        taskId: id,
        projectId,
        title: title?.substring(0, 100),
      });
    }
    
    if (error instanceof HTTPException) {
      throw error;
    }

    throw new HTTPException(500, { message: "Failed to update task" });
  }
}

export default updateTask;

