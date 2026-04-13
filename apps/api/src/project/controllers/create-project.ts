import { getDatabase } from "../../database/connection";
import { projectTable, teamTable, teamMemberTable } from "../../database/schema";
import { ActivityTracker } from "../../services/team-awareness/activity-tracker";
import { sanitizeText, sanitizeRichText, sanitizeSlug } from "../../lib/universal-sanitization";
import { captureException, addBreadcrumb } from "../../services/monitoring/sentry";
import logger from "../../utils/logger";
import { HTTPException } from "hono/http-exception";

interface CreateProjectData {
  workspaceId: string;
  name: string;
  description?: string;
  icon?: string;
  slug: string;
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

async function createProject(data: CreateProjectData, ownerId: string) {
  try {
    const db = getDatabase();
    const {
      workspaceId,
      name,
      description,
      icon = "Layout",
      slug,
      status = "planning",
      category = "development",
      priority = "medium",
      visibility = "team",
      allowGuestAccess = false,
      requireApprovalForJoining = true,
      timeTrackingEnabled = true,
      requireTimeEntry = false,
      enableSubtasks = true,
      enableDependencies = true,
      enableBudgetTracking = false,
      startDate,
      endDate,
      budget = 0,
      estimatedHours = 0,
      emailNotifications = true,
      slackNotifications = false,
    } = data;

    // 🔒 SECURITY: Sanitize all user inputs to prevent XSS
    const sanitizedName = sanitizeText(name || '', { maxLength: 100, stripHtmlTags: true });
    const sanitizedDescription = sanitizeRichText(description || '', { maxLength: 2000 });
    const sanitizedSlug = sanitizeSlug(slug || sanitizedName);
    
    if (!sanitizedName || sanitizedName.length === 0) {
      throw new HTTPException(400, {
        message: "Project name cannot be empty or contain only dangerous content",
      });
    }

    if (!sanitizedSlug || sanitizedSlug.length === 0) {
      throw new HTTPException(400, {
        message: "Project slug is invalid",
      });
    }

    // Map to actual schema fields
    const [newProject] = await db
      .insert(projectTable)
      .values({
        workspaceId,
        ownerId,
        name: sanitizedName,
        description: sanitizedDescription,
        icon,
        slug: sanitizedSlug,
      status, // Maps to schema status
      priority, // Maps to schema priority
      startDate: startDate ? new Date(startDate) : undefined,
      dueDate: endDate ? new Date(endDate) : undefined, // endDate -> dueDate
      // Store extra fields in settings JSON
      settings: {
        category,
        visibility,
        allowGuestAccess,
        requireApprovalForJoining,
        timeTrackingEnabled,
        requireTimeEntry,
        enableSubtasks,
        enableDependencies,
        enableBudgetTracking,
        budget,
        estimatedHours,
        emailNotifications,
        slackNotifications,
      },
    })
    .returning();

  // Automatically create a team for this project
  const [newTeam] = await db
    .insert(teamTable)
    .values({
      name: `${name} Team`,
      description: `Team for ${name} project`,
      workspaceId,
      projectId: newProject.id,
      createdBy: ownerId,
      isActive: true,
      settings: {
        type: 'project',
        autoCreated: true,
      },
    })
    .returning();

  // Add the project owner as the first team member with 'lead' role
  await db
    .insert(teamMemberTable)
    .values({
      teamId: newTeam.id,
      userId: ownerId,
      role: 'lead',
      addedBy: ownerId,
    });

    // 🎯 Log activity for project creation
    try {
      await ActivityTracker.logProjectActivity(
        ownerId,
        workspaceId,
        'created',
        newProject.id,
        sanitizedName
      );
    } catch (error) {
      console.error('Failed to log project creation activity:', error);
    }

    // 📊 SENTRY: Add breadcrumb for successful project creation
    addBreadcrumb('Project created successfully', 'project', 'info', {
      projectId: newProject.id,
      workspaceId,
      hasDescription: !!description,
      status,
      priority,
    });

    return newProject;
  } catch (error) {
    logger.error("Error creating project:", error);
    
    // 📊 SENTRY: Capture project creation errors
    if (!(error instanceof HTTPException)) {
      captureException(error as Error, {
        feature: 'projects',
        action: 'create_project',
        workspaceId: data.workspaceId,
        name: data.name?.substring(0, 100),
      });
    }
    
    if (error instanceof HTTPException) {
      throw error;
    }

    throw new HTTPException(500, { message: "Failed to create project" });
  }
}

export default createProject;

