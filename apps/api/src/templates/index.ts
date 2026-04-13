import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import listTemplates from "./controllers/list-templates";
import getTemplate from "./controllers/get-template";
import createTemplate from "./controllers/create-template";
import applyTemplate from "./controllers/apply-template";
import deleteTemplate from "./controllers/delete-template";
import updateTemplate from "./controllers/update-template";
import getTemplateStats from "./controllers/get-template-stats";
import rateTemplate from "./controllers/rate-template";
import rbacMiddleware from "../middlewares/rbac";
import logger from '../utils/logger';

// Validation schemas
const difficultySchema = z.enum(["beginner", "intermediate", "advanced"]);
const prioritySchema = z.enum(["low", "medium", "high", "urgent"]);
const dependencyTypeSchema = z.enum(["blocks", "blocked_by"]);
const sortBySchema = z.enum(["popular", "recent", "rating", "name"]);
const sortOrderSchema = z.enum(["asc", "desc"]);

const templateSubtaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  position: z.number().int().min(0),
  estimatedHours: z.number().int().min(0).optional(),
  suggestedAssigneeRole: z.string().optional(),
});

const templateTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  position: z.number().int().min(0),
  priority: prioritySchema.optional().default("medium"),
  estimatedHours: z.number().int().min(0).optional(),
  suggestedAssigneeRole: z.string().optional(),
  relativeStartDay: z.number().int().min(0).optional(),
  relativeDueDay: z.number().int().min(0).optional(),
  tags: z.array(z.string()).optional().default([]),
  subtasks: z.array(templateSubtaskSchema).optional().default([]),
  dependencies: z.array(z.object({
    requiredTaskPosition: z.number().int().min(0),
    type: dependencyTypeSchema.optional().default("blocks"),
  })).optional().default([]),
});

const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(10).max(2000),
  profession: z.string().min(1).max(200),
  industry: z.string().min(1).max(200),
  category: z.string().max(100).optional(),
  icon: z.string().max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  estimatedDuration: z.number().int().min(1).optional(),
  difficulty: difficultySchema.optional().default("intermediate"),
  tags: z.array(z.string()).optional().default([]),
  settings: z.record(z.any()).optional().default({}),
  isPublic: z.boolean().optional().default(true),
  tasks: z.array(templateTaskSchema).optional().default([]),
});

const templates = new Hono<{
  Variables: {
    userEmail: string;
    userId: string;
  };
}>()
  // List templates with filtering
  .get(
    "/",
    zValidator(
      "query",
      z.object({
        industry: z.string().optional(),
        profession: z.string().optional(),
        category: z.string().optional(),
        difficulty: difficultySchema.optional(),
        tags: z.string().optional(), // comma-separated
        searchQuery: z.string().optional(),
        isOfficial: z.string().optional().transform(val => val === "true"),
        minRating: z.string().optional().transform(val => val ? parseInt(val) : undefined),
        sortBy: sortBySchema.optional().default("popular"),
        sortOrder: sortOrderSchema.optional().default("desc"),
        limit: z.string().optional().transform(val => val ? parseInt(val) : 50),
        offset: z.string().optional().transform(val => val ? parseInt(val) : 0),
      })
    ),
    async (c) => {
      try {
        const filters = c.req.valid("query");

        // Parse tags if provided
        const parsedFilters = {
          ...filters,
          tags: filters.tags ? filters.tags.split(",").map(t => t.trim()) : undefined,
        };

        const result = await listTemplates(parsedFilters);
        return c.json(result);
      } catch (error) {
        logger.error("Failed to list templates:", error);
        // Return empty results if table doesn't exist yet
        if (error instanceof Error && error.message.includes('relation "project_templates" does not exist')) {
          return c.json({
            templates: [],
            total: 0,
            limit: 50,
            offset: 0,
            warning: "Template tables not yet created in database. Run 'npm run db:push' to create them."
          });
        }
        return c.json({ error: "Failed to list templates", details: error instanceof Error ? error.message : String(error) }, 500);
      }
    }
  )

  // Get template statistics
  .get("/stats", async (c) => {
    const stats = await getTemplateStats();
    return c.json(stats);
  })

  // Get single template by ID
  .get(
    "/:templateId",
    zValidator("param", z.object({ templateId: z.string() })),
    async (c) => {
      const { templateId } = c.req.valid("param");
      const template = await getTemplate(templateId);

      if (!template) {
        return c.json({ error: "Template not found" }, 404);
      }

      return c.json(template);
    }
  )

  // Create new template (requires admin or specific permission)
  .post(
    "/",
    rbacMiddleware.canCreateProjects, // Reuse project creation permission for now
    zValidator("json", createTemplateSchema),
    async (c) => {
      const templateData = c.req.valid("json");
      const userId = c.get("userId");

      if (!userId) {
        return c.json({ error: "User ID not found in context" }, 401);
      }

      const template = await createTemplate(templateData, userId);
      return c.json(template, 201);
    }
  )

  // Update template
  .put(
    "/:templateId",
    rbacMiddleware.canEditProjects, // Reuse project edit permission for now
    zValidator("param", z.object({ templateId: z.string() })),
    zValidator("json", createTemplateSchema.partial()),
    async (c) => {
      const { templateId } = c.req.valid("param");
      const updateData = c.req.valid("json");
      const userId = c.get("userId");

      const template = await updateTemplate(templateId, updateData, userId);

      if (!template) {
        return c.json({ error: "Template not found or unauthorized" }, 404);
      }

      return c.json(template);
    }
  )

  // Delete template
  .delete(
    "/:templateId",
    rbacMiddleware.canDeleteProjects, // Reuse project delete permission for now
    zValidator("param", z.object({ templateId: z.string() })),
    async (c) => {
      const { templateId } = c.req.valid("param");
      const userId = c.get("userId");

      const result = await deleteTemplate(templateId, userId);

      if (!result.success) {
        return c.json({ error: result.error || "Failed to delete template" }, 404);
      }

      return c.json({ success: true, message: "Template deleted successfully" });
    }
  )

  // Apply template to project
  .post(
    "/:templateId/apply",
    rbacMiddleware.canCreateProjects,
    zValidator("param", z.object({ templateId: z.string() })),
    zValidator(
      "json",
      z.object({
        projectId: z.string(),
        workspaceId: z.string(),
        startDate: z.string().datetime().optional(),
        assigneeMapping: z.record(z.string()).optional(), // Map role to userId
      })
    ),
    async (c) => {
      const { templateId } = c.req.valid("param");
      const { projectId, workspaceId, startDate, assigneeMapping } = c.req.valid("json");
      const userId = c.get("userId");

      const result = await applyTemplate({
        templateId,
        projectId,
        workspaceId,
        userId,
        startDate: startDate ? new Date(startDate) : new Date(),
        assigneeMapping: assigneeMapping || {},
      });

      if (!result.success) {
        return c.json({ error: result.error || "Failed to apply template" }, 400);
      }

      return c.json(result);
    }
  )

  // Rate template
  .post(
    "/:templateId/rate",
    zValidator("param", z.object({ templateId: z.string() })),
    zValidator(
      "json",
      z.object({
        rating: z.number().int().min(1).max(5),
      })
    ),
    async (c) => {
      const { templateId } = c.req.valid("param");
      const { rating } = c.req.valid("json");
      const userId = c.get("userId");

      if (!userId) {
        return c.json({ error: "User ID not found in context" }, 401);
      }

      const result = await rateTemplate(templateId, userId, rating);

      if (!result.success) {
        return c.json({ error: result.error || "Failed to rate template" }, 400);
      }

      return c.json(result);
    }
  );

export default templates;


