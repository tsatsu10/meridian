import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import {
  projectTemplates,
  templateTasks,
  templateSubtasks,
  templateDependencies,
} from "../../database/schema";
import type { TemplateWithTasks } from "../../types/templates";

export default async function getTemplate(templateId: string): Promise<TemplateWithTasks | null> {

  // Get template
  const template = await getDatabase().query.projectTemplates.findFirst({
    where: eq(projectTemplates.id, templateId),
  });

  if (!template) {
    return null;
  }

  // Get tasks for this template
  const tasks = await getDatabase()
    .select()
    .from(templateTasks)
    .where(eq(templateTasks.templateId, templateId))
    .orderBy(templateTasks.position);

  // Get subtasks for these tasks
  const taskIds = tasks.map((t) => t.id);
  let subtasks: any[] = [];

  if (taskIds.length > 0) {
    subtasks = await getDatabase()
      .select()
      .from(templateSubtasks)
      .where(eq(templateSubtasks.templateTaskId, taskIds[0]))
      .orderBy(templateSubtasks.position);

    // If there are multiple tasks, get all subtasks
    if (taskIds.length > 1) {
      for (let i = 1; i < taskIds.length; i++) {
        const moreSubtasks = await getDatabase()
          .select()
          .from(templateSubtasks)
          .where(eq(templateSubtasks.templateTaskId, taskIds[i]))
          .orderBy(templateSubtasks.position);
        subtasks = [...subtasks, ...moreSubtasks];
      }
    }
  }

  // Get dependencies for these tasks
  let dependencies: any[] = [];

  if (taskIds.length > 0) {
    dependencies = await getDatabase()
      .select()
      .from(templateDependencies)
      .where(eq(templateDependencies.dependentTaskId, taskIds[0]));

    // If there are multiple tasks, get all dependencies
    if (taskIds.length > 1) {
      for (let i = 1; i < taskIds.length; i++) {
        const moreDeps = await getDatabase()
          .select()
          .from(templateDependencies)
          .where(eq(templateDependencies.dependentTaskId, taskIds[i]));
        dependencies = [...dependencies, ...moreDeps];
      }
    }
  }

  // Group subtasks by task
  const subtasksByTask = subtasks.reduce((acc, subtask) => {
    if (!acc[subtask.templateTaskId]) {
      acc[subtask.templateTaskId] = [];
    }
    acc[subtask.templateTaskId].push(subtask);
    return acc;
  }, {} as Record<string, any[]>);

  // Group dependencies by task
  const depsByTask = dependencies.reduce((acc, dep) => {
    if (!acc[dep.dependentTaskId]) {
      acc[dep.dependentTaskId] = [];
    }
    acc[dep.dependentTaskId].push(dep);
    return acc;
  }, {} as Record<string, any[]>);

  // Combine tasks with their subtasks and dependencies
  const tasksWithDetails = tasks.map((task) => ({
    ...task,
    subtasks: subtasksByTask[task.id] || [],
    dependencies: depsByTask[task.id] || [],
  }));

  return {
    ...template,
    rating: template.rating / 10, // Convert back to 0-5 scale
    tasks: tasksWithDetails,
  } as TemplateWithTasks;
}


