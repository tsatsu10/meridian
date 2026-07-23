import { eq, inArray } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import {
  projectTemplates,
  templateTasks,
  templateSubtasks,
  templateDependencies,
} from "../../database/schema";
import type { TemplateWithTasks } from "../../types/templates";

type SubtaskRow = typeof templateSubtasks.$inferSelect;
type DepRow = typeof templateDependencies.$inferSelect;

export default async function getTemplate(
  templateId: string,
): Promise<TemplateWithTasks | null> {
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
  let subtasks: SubtaskRow[] = [];

  if (taskIds.length > 0) {
    subtasks = await getDatabase()
      .select()
      .from(templateSubtasks)
      .where(inArray(templateSubtasks.templateTaskId, taskIds))
      .orderBy(templateSubtasks.position);
  }

  // Get dependencies for these tasks
  let dependencies: DepRow[] = [];

  if (taskIds.length > 0) {
    dependencies = await getDatabase()
      .select()
      .from(templateDependencies)
      .where(inArray(templateDependencies.dependentTaskId, taskIds));
  }

  // Group subtasks by task
  const subtasksByTask = subtasks.reduce(
    (acc, subtask) => {
      if (!acc[subtask.templateTaskId]) acc[subtask.templateTaskId] = [];
      acc[subtask.templateTaskId]?.push(subtask);
      return acc;
    },
    {} as Record<string, SubtaskRow[]>,
  );

  // Group dependencies by task
  const depsByTask = dependencies.reduce(
    (acc, dep) => {
      if (!acc[dep.dependentTaskId]) acc[dep.dependentTaskId] = [];
      acc[dep.dependentTaskId]?.push(dep);
      return acc;
    },
    {} as Record<string, DepRow[]>,
  );

  // Combine tasks with their subtasks and dependencies
  const tasksWithDetails = tasks.map((task) => ({
    ...task,
    subtasks: subtasksByTask[task.id] || [],
    dependencies: depsByTask[task.id] || [],
  }));

  return {
    ...template,
    rating: (template.rating ?? 0) / 10, // Convert back to 0-5 scale
    tasks: tasksWithDetails,
  } as TemplateWithTasks;
}
