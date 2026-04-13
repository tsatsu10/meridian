import { createId } from "@paralleldrive/cuid2";
import { getDatabase } from "../../database/connection";
import {
  projectTemplates,
  templateTasks,
  templateSubtasks,
  templateDependencies,
} from "../../database/schema";
import type { CreateTemplateInput } from "../../types/templates";

export default async function createTemplate(
  input: CreateTemplateInput,
  userId: string
) {
  const db = getDatabase();

  const templateId = createId();

  // Insert template
  const [template] = await db
    .insert(projectTemplates)
    .values({
      id: templateId,
      name: input.name,
      description: input.description,
      profession: input.profession,
      industry: input.industry,
      category: input.category,
      icon: input.icon,
      color: input.color || "#6366f1",
      estimatedDuration: input.estimatedDuration,
      difficulty: input.difficulty || "intermediate",
      tags: input.tags || [],
      settings: input.settings || {},
      isPublic: input.isPublic !== false,
      isOfficial: false, // Only admins can set this to true
      createdBy: userId,
    })
    .returning();

  // Insert tasks if provided
  if (input.tasks && input.tasks.length > 0) {
    const taskIds: string[] = [];
    const taskPositionToId: Record<number, string> = {};

    // First pass: Create all tasks
    for (const taskInput of input.tasks) {
      const taskId = createId();
      taskIds.push(taskId);
      taskPositionToId[taskInput.position] = taskId;

      await getDatabase().insert(templateTasks).values({
        id: taskId,
        templateId: templateId,
        title: taskInput.title,
        description: taskInput.description,
        position: taskInput.position,
        priority: taskInput.priority || "medium",
        estimatedHours: taskInput.estimatedHours,
        suggestedAssigneeRole: taskInput.suggestedAssigneeRole,
        relativeStartDay: taskInput.relativeStartDay,
        relativeDueDay: taskInput.relativeDueDay,
        tags: taskInput.tags || [],
        metadata: {},
      });

      // Insert subtasks for this task
      if (taskInput.subtasks && taskInput.subtasks.length > 0) {
        for (const subtaskInput of taskInput.subtasks) {
          await getDatabase().insert(templateSubtasks).values({
            id: createId(),
            templateTaskId: taskId,
            title: subtaskInput.title,
            description: subtaskInput.description,
            position: subtaskInput.position,
            estimatedHours: subtaskInput.estimatedHours,
            suggestedAssigneeRole: subtaskInput.suggestedAssigneeRole,
            metadata: {},
          });
        }
      }
    }

    // Second pass: Create dependencies
    for (const taskInput of input.tasks) {
      const taskId = taskPositionToId[taskInput.position];

      if (taskInput.dependencies && taskInput.dependencies.length > 0) {
        for (const depInput of taskInput.dependencies) {
          const requiredTaskId = taskPositionToId[depInput.requiredTaskPosition];

          if (requiredTaskId) {
            await getDatabase().insert(templateDependencies).values({
              id: createId(),
              dependentTaskId: taskId,
              requiredTaskId: requiredTaskId,
              type: depInput.type || "blocks",
            });
          }
        }
      }
    }
  }

  return template;
}


