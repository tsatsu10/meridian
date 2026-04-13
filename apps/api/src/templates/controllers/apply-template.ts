import { createId } from "@paralleldrive/cuid2";
import { eq, and } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import {
  projectTemplates,
  templateTasks,
  templateSubtasks,
  templateDependencies,
  tasks as tasksTable,
  taskDependencies as taskDependenciesTable,
  projects as projectsTable,
  workspaces as workspacesTable,
  users as usersTable,
} from "../../database/schema";
import type { TemplateApplicationResult } from "../../types/templates";

interface ApplyTemplateInput {
  templateId: string;
  projectId: string;
  workspaceId: string;
  userId: string;
  startDate?: Date;
  assigneeMapping?: Record<string, string>; // role -> userId
}

export default async function applyTemplate(
  input: ApplyTemplateInput
): Promise<{ success: boolean; error?: string; result?: TemplateApplicationResult }> {

  const { templateId, projectId, workspaceId, userId, startDate, assigneeMapping } = input;

  // Verify project exists and user has access
  const project = await getDatabase().query.projectTable.findFirst({
    where: and(
      eq(projectsTable.id, projectId),
      eq(projectsTable.workspaceId, workspaceId)
    ),
  });

  if (!project) {
    return { success: false, error: "Project not found" };
  }

  // Get template
  const template = await getDatabase().query.projectTemplates.findFirst({
    where: eq(projectTemplates.id, templateId),
  });

  if (!template) {
    return { success: false, error: "Template not found" };
  }

  // Get template tasks
  const templateTasksList = await getDatabase()
    .select()
    .from(templateTasks)
    .where(eq(templateTasks.templateId, templateId))
    .orderBy(templateTasks.position);

  if (templateTasksList.length === 0) {
    return { success: false, error: "Template has no tasks" };
  }

  const projectStartDate = startDate || new Date();
  const createdTaskIds: string[] = [];
  const templateTaskIdToRealTaskId: Record<string, string> = {};
  let subtasksCreated = 0;

  // Create tasks
  for (const templateTask of templateTasksList) {
    const taskId = createId();
    templateTaskIdToRealTaskId[templateTask.id] = taskId;

    // Calculate dates based on relative days
    const taskStartDate = templateTask.relativeStartDay
      ? new Date(projectStartDate.getTime() + templateTask.relativeStartDay * 24 * 60 * 60 * 1000)
      : undefined;

    const taskDueDate = templateTask.relativeDueDay
      ? new Date(projectStartDate.getTime() + templateTask.relativeDueDay * 24 * 60 * 60 * 1000)
      : undefined;

    // Determine assignee based on role mapping
    const assigneeId = templateTask.suggestedAssigneeRole
      ? assigneeMapping?.[templateTask.suggestedAssigneeRole]
      : undefined;

    // Get user email if assignee is specified
    let assigneeEmail: string | undefined;
    if (assigneeId) {
      const user = await getDatabase().query.userTable.findFirst({
        where: eq(usersTable.id, assigneeId),
      });
      assigneeEmail = user?.email;
    }

    // Create task
    const [createdTask] = await getDatabase()
      .insert(tasksTable)
      .values({
        id: taskId,
        projectId: projectId,
        title: templateTask.title,
        description: templateTask.description,
        priority: templateTask.priority,
        estimatedHours: templateTask.estimatedHours,
        assigneeId: assigneeId,
        userEmail: assigneeEmail,
        startDate: taskStartDate,
        dueDate: taskDueDate,
        status: "todo",
        position: templateTask.position,
      })
      .returning();

    createdTaskIds.push(createdTask.id);

    // Get and create subtasks
    const templateSubtasksList = await getDatabase()
      .select()
      .from(templateSubtasks)
      .where(eq(templateSubtasks.templateTaskId, templateTask.id))
      .orderBy(templateSubtasks.position);

    for (const templateSubtask of templateSubtasksList) {
      const subtaskId = createId();

      // Determine subtask assignee
      const subtaskAssigneeId = templateSubtask.suggestedAssigneeRole
        ? assigneeMapping?.[templateSubtask.suggestedAssigneeRole]
        : undefined;

      let subtaskAssigneeEmail: string | undefined;
      if (subtaskAssigneeId) {
        const user = await getDatabase().query.userTable.findFirst({
          where: eq(usersTable.id, subtaskAssigneeId),
        });
        subtaskAssigneeEmail = user?.email;
      }

      await getDatabase().insert(tasksTable).values({
        id: subtaskId,
        projectId: projectId,
        title: templateSubtask.title,
        description: templateSubtask.description,
        estimatedHours: templateSubtask.estimatedHours,
        assigneeId: subtaskAssigneeId,
        userEmail: subtaskAssigneeEmail,
        parentTaskId: createdTask.id,
        status: "todo",
        position: templateSubtask.position,
      });

      subtasksCreated++;
    }
  }

  // Create dependencies
  let dependenciesCreated = 0;

  for (const templateTask of templateTasksList) {
    const realTaskId = templateTaskIdToRealTaskId[templateTask.id];

    const templateDeps = await getDatabase()
      .select()
      .from(templateDependencies)
      .where(eq(templateDependencies.dependentTaskId, templateTask.id));

    for (const templateDep of templateDeps) {
      const realRequiredTaskId = templateTaskIdToRealTaskId[templateDep.requiredTaskId];

      if (realRequiredTaskId) {
        await getDatabase().insert(taskDependenciesTable).values({
          id: createId(),
          dependentTaskId: realTaskId,
          requiredTaskId: realRequiredTaskId,
          type: templateDep.type,
        });

        dependenciesCreated++;
      }
    }
  }

  // Increment template usage count
  await getDatabase()
    .update(projectTemplates)
    .set({
      usageCount: template.usageCount + 1,
    })
    .where(eq(projectTemplates.id, templateId));

  return {
    success: true,
    result: {
      projectId,
      tasksCreated: createdTaskIds.length,
      subtasksCreated,
      dependenciesCreated,
      taskIds: createdTaskIds,
    },
  };
}


