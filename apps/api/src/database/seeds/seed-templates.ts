/**
 * Seed Script for Project Templates
 * Populates PostgreSQL database with profession-based project templates
 */

import { createId } from "@paralleldrive/cuid2";
import { getDatabase, initializeDatabase } from "../connection"; // PostgreSQL connection
import {
  projectTemplates,
  templateTasks,
  templateSubtasks,
  templateDependencies,
} from "../schema";
import { allTemplates } from "./project-templates";
import logger from '../../utils/logger';
// Set DATABASE_URL environment variable
process.env.DATABASE_URL = "postgresql://neondb_owner:npg_PoJlUnKCf32a@ep-dry-mode-ae1fy7m1-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

export async function seedProjectTemplates() {
  // Initialize database connection if not already initialized
  await initializeDatabase();
  logger.debug("🌱 Seeding project templates...");

  let templatesCreated = 0;
  let tasksCreated = 0;
  let subtasksCreated = 0;
  let dependenciesCreated = 0;

  for (const templateInput of allTemplates) {
    try {
      const templateId = createId();

      // Insert template
      await getDatabase().insert(projectTemplates).values({
        id: templateId,
        name: templateInput.name,
        description: templateInput.description,
        profession: templateInput.profession,
        industry: templateInput.industry,
        category: templateInput.category,
        icon: templateInput.icon,
        color: templateInput.color || "#6366f1",
        estimatedDuration: templateInput.estimatedDuration,
        difficulty: templateInput.difficulty || "intermediate",
        tags: templateInput.tags || [],
        settings: templateInput.settings || {},
        isPublic: templateInput.isPublic !== false,
        isOfficial: true, // These are official Meridian templates
        createdBy: null, // System-created
      });

      templatesCreated++;
      logger.debug(`  ✅ Created template: ${templateInput.name}`);

      // Insert tasks if provided
      if (templateInput.tasks && templateInput.tasks.length > 0) {
        const taskPositionToId: Record<number, string> = {};

        // First pass: Create all tasks
        for (const taskInput of templateInput.tasks) {
          const taskId = createId();
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

          tasksCreated++;

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

              subtasksCreated++;
            }
          }
        }

        // Second pass: Create dependencies
        for (const taskInput of templateInput.tasks) {
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

                dependenciesCreated++;
              }
            }
          }
        }
      }
    } catch (error) {
      logger.error(`  ❌ Error creating template "${templateInput.name}":`, error);
    }
  }

  logger.debug("\n📊 Template Seeding Summary:");
  logger.debug(`  Templates: ${templatesCreated}`);
  logger.debug(`  Tasks: ${tasksCreated}`);
  logger.debug(`  Subtasks: ${subtasksCreated}`);
  logger.debug(`  Dependencies: ${dependenciesCreated}`);
  logger.debug("✅ Template seeding complete!\n");

  return {
    templatesCreated,
    tasksCreated,
    subtasksCreated,
    dependenciesCreated,
  };
}

// Run if executed directly
if (require.main === module) {
  seedProjectTemplates()
    .then(() => {
      logger.debug("Seeding completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      logger.error("Seeding failed:", error);
      process.exit(1);
    });
}


