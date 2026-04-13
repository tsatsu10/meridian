import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { getDatabase } from "../../database/connection";
import { projectTable } from "../../database/schema";
import { ActivityTracker } from "../../services/team-awareness/activity-tracker";
import { sanitizeText, sanitizeRichText, sanitizeSlug } from "../../lib/universal-sanitization";
import { captureException, addBreadcrumb } from "../../services/monitoring/sentry";
import logger from "../../utils/logger";

interface UpdateProjectData {
  name?: string;
  description?: string;
  icon?: string;
  slug?: string;
  // Enhanced metadata
  status?: string;
  category?: string;
  priority?: string;
  // Visibility and access
  visibility?: string;
  allowGuestAccess?: boolean;
  requireApprovalForJoining?: boolean;
  // Time tracking
  timeTrackingEnabled?: boolean;
  requireTimeEntry?: boolean;
  // Feature toggles
  enableSubtasks?: boolean;
  enableDependencies?: boolean;
  enableBudgetTracking?: boolean;
  // Timeline and budget
  startDate?: string;
  endDate?: string;
  budget?: number;
  estimatedHours?: number;
  // Notifications
  emailNotifications?: boolean;
  slackNotifications?: boolean;
}

async function updateProject(
  id: string,
  data: UpdateProjectData,
  updaterId?: string,
) {
  try {
    const db = getDatabase();
    const [existingProject] = await db
      .select()
      .from(projectTable)
      .where(eq(projectTable.id, id));

    const isProjectExisting = Boolean(existingProject);

    if (!isProjectExisting) {
      throw new HTTPException(404, {
        message: "Project doesn't exist",
      });
    }

    // Build update object with only schema fields
    const updateFields: any = {
      updatedAt: new Date(),
    };

    // 🔒 SECURITY: Sanitize user inputs to prevent XSS
    if (data.name !== undefined) {
      const sanitizedName = sanitizeText(data.name, { maxLength: 100, stripHtmlTags: true });
      if (!sanitizedName || sanitizedName.length === 0) {
        throw new HTTPException(400, {
          message: "Project name cannot be empty or contain only dangerous content",
        });
      }
      updateFields.name = sanitizedName;
    }
    
    if (data.description !== undefined) {
      updateFields.description = sanitizeRichText(data.description || '', { maxLength: 2000 });
    }
    
    if (data.slug !== undefined) {
      const sanitizedSlug = sanitizeSlug(data.slug);
      if (sanitizedSlug.length === 0) {
        throw new HTTPException(400, {
          message: "Project slug is invalid",
        });
      }
      updateFields.slug = sanitizedSlug;
    }

    // Basic fields that exist in schema
    if (data.icon !== undefined) updateFields.icon = data.icon;
  if (data.status !== undefined) updateFields.status = data.status;
  if (data.priority !== undefined) updateFields.priority = data.priority;
  if (data.startDate !== undefined) updateFields.startDate = data.startDate ? new Date(data.startDate) : null;
  if (data.endDate !== undefined) updateFields.dueDate = data.endDate ? new Date(data.endDate) : null; // Map endDate -> dueDate

  // Build settings object for extra fields
  const currentSettings = existingProject.settings || {};
  const newSettings = { ...currentSettings };

  // Store non-schema fields in settings JSONB
  if (data.category !== undefined) newSettings.category = data.category;
  if (data.visibility !== undefined) newSettings.visibility = data.visibility;
  if (data.allowGuestAccess !== undefined) newSettings.allowGuestAccess = data.allowGuestAccess;
  if (data.requireApprovalForJoining !== undefined) newSettings.requireApprovalForJoining = data.requireApprovalForJoining;
  if (data.timeTrackingEnabled !== undefined) newSettings.timeTrackingEnabled = data.timeTrackingEnabled;
  if (data.requireTimeEntry !== undefined) newSettings.requireTimeEntry = data.requireTimeEntry;
  if (data.enableSubtasks !== undefined) newSettings.enableSubtasks = data.enableSubtasks;
  if (data.enableDependencies !== undefined) newSettings.enableDependencies = data.enableDependencies;
  if (data.enableBudgetTracking !== undefined) newSettings.enableBudgetTracking = data.enableBudgetTracking;
  if (data.budget !== undefined) newSettings.budget = data.budget;
  if (data.estimatedHours !== undefined) newSettings.estimatedHours = data.estimatedHours;
  if (data.emailNotifications !== undefined) newSettings.emailNotifications = data.emailNotifications;
  if (data.slackNotifications !== undefined) newSettings.slackNotifications = data.slackNotifications;

  updateFields.settings = newSettings;

  const [updatedProject] = await db
    .update(projectTable)
    .set(updateFields)
    .where(eq(projectTable.id, id))
    .returning();

    // 🎯 Log activity for project update
    try {
      if (updaterId && updatedProject.workspaceId) {
        await ActivityTracker.logProjectActivity(
          updaterId,
          updatedProject.workspaceId,
          'updated',
          updatedProject.id,
          updatedProject.name
        );
      }
    } catch (error) {
      console.error('Failed to log project update activity:', error);
    }

    // 📊 SENTRY: Add breadcrumb for successful update
    addBreadcrumb('Project updated successfully', 'project', 'info', {
      projectId: id,
      fieldsUpdated: Object.keys(updateFields),
    });

    return updatedProject;
  } catch (error) {
    logger.error("Error updating project:", error);
    
    // 📊 SENTRY: Capture project update errors
    if (!(error instanceof HTTPException)) {
      captureException(error as Error, {
        feature: 'projects',
        action: 'update_project',
        projectId: id,
        name: data.name?.substring(0, 100),
      });
    }
    
    if (error instanceof HTTPException) {
      throw error;
    }

    throw new HTTPException(500, { message: "Failed to update project" });
  }
}

export default updateProject;

