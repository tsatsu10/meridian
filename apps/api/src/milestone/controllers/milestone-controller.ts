/**
 * Consolidated Milestone Controller
 * Uses base CRUD controller to eliminate duplication
 */

import { Context } from 'hono';
import { eq, inArray } from 'drizzle-orm';
import { getDatabase } from "../../database/connection";
import { milestoneTable, taskTable, userTable, activityTable } from '../../database/schema';
import { BaseCrudController } from '../../utils/crud-controller-base';
import { createId } from '@paralleldrive/cuid2';
import createNotification from '../../notification/controllers/create-notification';

class MilestoneController extends BaseCrudController {
  constructor() {
    super(milestoneTable, {
      tableName: 'milestone',
      idField: 'id',
      userField: 'createdBy',
      requiredFields: ['title', 'type', 'dueDate', 'projectId'],
      searchableFields: ['title', 'description'],
      timestampFields: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt'
      }
    });
  }

  protected async processCreateData(data: any, c: Context): Promise<any> {
    const db = await getDatabase();
    const {
      title,
      description,
      type,
      dueDate,
      projectId,
      riskLevel,
      riskDescription,
      dependencyTaskIds,
      stakeholderIds,
    } = data;

    // Advanced validation: dependencies
    if (dependencyTaskIds && Array.isArray(dependencyTaskIds)) {
      // Prevent self-dependency
      if (dependencyTaskIds.includes('TEMP_MILESTONE_ID')) {
        throw new Error('A milestone cannot depend on itself.');
      }

      // Check all dependencies are valid tasks in the same project
      const tasks = await db
        .select({ id: taskTable.id, projectId: taskTable.projectId })
        .from(taskTable)
        .where(inArray(taskTable.id, dependencyTaskIds));
      
      const invalid = tasks.filter(t => t.projectId !== projectId);
      if (tasks.length !== dependencyTaskIds.length || invalid.length > 0) {
        throw new Error('One or more dependencies are invalid or not in this project.');
      }
    }

    // Advanced validation: stakeholders
    if (stakeholderIds && Array.isArray(stakeholderIds)) {
      const users = await db
        .select({ email: userTable.email })
        .from(userTable)
        .where(inArray(userTable.email, stakeholderIds));
      
      if (users.length !== stakeholderIds.length) {
        throw new Error('One or more stakeholders are not valid users.');
      }
    }

    return {
      ...data,
      riskLevel: riskLevel || "low",
      dependencyTaskIds: dependencyTaskIds ? JSON.stringify(dependencyTaskIds) : null,
      stakeholderIds: stakeholderIds ? JSON.stringify(stakeholderIds) : null,
      dueDate: new Date(dueDate),
    };
  }

  protected async afterCreate(milestone: any, c: Context): Promise<void> {
    const db = await getDatabase();
    const userId = c.get("userId");

    // Log activity
    await db.insert(activityTable).values({
      id: createId(),
      taskId: milestone.id,
      type: 'milestone_created',
      userEmail: userId,
      content: `Milestone "${milestone.title}" was created by user ${userId}.`,
      createdAt: new Date(),
    });

    // Notify all stakeholders
    if (milestone.stakeholderIds) {
      const stakeholderIds = JSON.parse(milestone.stakeholderIds);
      if (Array.isArray(stakeholderIds)) {
        await Promise.all(stakeholderIds.map((userEmail: string) =>
          createNotification({
            userEmail,
            title: `Milestone Created: ${milestone.title}`,
            content: `A new milestone "${milestone.title}" was created in project "${milestone.projectId}".`,
            type: 'milestone',
            resourceId: milestone.id,
            resourceType: 'milestone',
          })
        ));
      }
    }
  }

  protected async afterUpdate(updated: any, original: any, c: Context): Promise<void> {
    const db = await getDatabase();
    const userId = c.get("userId");

    // Log activity for updates
    await db.insert(activityTable).values({
      id: createId(),
      taskId: updated.id,
      type: 'milestone_updated',
      userEmail: userId,
      content: `Milestone "${updated.title}" was updated by user ${userId}.`,
      createdAt: new Date(),
    });
  }

  protected async beforeDelete(milestone: any, c: Context): Promise<void> {
    const db = await getDatabase();
    const userId = c.get("userId");

    // Log activity for deletion
    await db.insert(activityTable).values({
      id: createId(),
      taskId: milestone.id,
      type: 'milestone_deleted',
      userEmail: userId,
      content: `Milestone "${milestone.title}" was deleted by user ${userId}.`,
      createdAt: new Date(),
    });
  }
}

// Create controller instance
const milestoneController = new MilestoneController();

// Export individual methods for backward compatibility
export const createMilestone = (c: Context) => milestoneController.create(c);
export const getMilestone = (c: Context) => milestoneController.getById(c);
export const getMilestones = (c: Context) => milestoneController.list(c);
export const updateMilestone = (c: Context) => milestoneController.update(c);
export const deleteMilestone = (c: Context) => milestoneController.delete(c);

