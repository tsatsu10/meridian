import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import createTask from "./controllers/create-task";
import deleteTask from "./controllers/delete-task";
import exportTasks from "./controllers/export-tasks";
import getTask from "./controllers/get-task";
import getTasks from "./controllers/get-tasks";
import getAllTasks from "./controllers/get-all-tasks";
import getWorkspaceTaskStats from "./controllers/get-workspace-task-stats";
import importTasks from "./controllers/import-tasks";
import updateTask from "./controllers/update-task";
import createTaskDependency from "./controllers/create-dependency";
import getTaskDependencies from "./controllers/get-task-dependencies";
import deleteTaskDependency from "./controllers/delete-dependency";
import {
  bulkUpdateStatus,
  bulkUpdatePriority,
  bulkAssignTasks,
  bulkDeleteTasks,
  bulkArchiveTasks,
} from "./controllers/bulk-operations";
import rbacMiddleware from "../middlewares/rbac";
import { checkRateLimit, RATE_LIMITS } from "../middlewares/chat-rate-limiter";

// Define response schemas for proper TypeScript inference
const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  number: z.number().nullable(),
  description: z.string().nullable(),
  status: z.string(),
  priority: z.string(),
  dueDate: z.string().nullable(),
  position: z.number(),
  createdAt: z.string(),
  userEmail: z.string().nullable(),
  assigneeName: z.string().nullable(),
  assigneeEmail: z.string().nullable(),
  projectId: z.string(),
  parentId: z.string().nullable(),
  subtasks: z.array(z.any()).optional(),
  dependencies: z.array(z.any()).optional(),
  blockedBy: z.array(z.any()).optional(),
  subtaskProgress: z.object({
    completed: z.number(),
    total: z.number(),
    percentage: z.number(),
  }).optional(),
});

const ColumnSchema = z.object({
  id: z.string(),
  dbId: z.string().optional(),
  name: z.string(),
  color: z.string(),
  position: z.number(),
  isDefault: z.boolean(),
  tasks: z.array(TaskSchema),
});

const ProjectWithTasksSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  icon: z.string(),
  description: z.string().nullable(),
  workspaceId: z.string(),
  columns: z.array(ColumnSchema),
  archivedTasks: z.array(TaskSchema),
  plannedTasks: z.array(TaskSchema),
});

const task = new Hono<{
  Variables: {
    userEmail: string;
  };
}>()
  // Root endpoint - API documentation
  .get("/", async (c) => {
    return c.json({
      message: "Task API",
      version: "1.0.0",
      endpoints: {
        "GET /all/:workspaceId": "Get all tasks across projects in a workspace",
        "GET /tasks/:projectId": "Get tasks for a specific project",
        "POST /:projectId": "Create a new task in a project",
        "PUT /:taskId": "Update a task",
        "DELETE /:taskId": "Delete a task",
        "POST /dependencies": "Create task dependency",
        "GET /dependencies/:taskId": "Get task dependencies",
        "DELETE /dependencies/:dependencyId": "Delete task dependency",
        "POST /import/:projectId": "Import tasks from CSV/JSON",
        "GET /export/:projectId": "Export tasks to CSV/JSON"
      },
      examples: {
        getAllTasks: "/api/task/all/workspace-id-123",
        getProjectTasks: "/api/task/tasks/project-id-456"
      }
    });
  })
  // @epic-3.2-time: Cross-project task view for Mike's efficient task management
  .get(
    "/all/:workspaceId/stats",
    zValidator("param", z.object({ workspaceId: z.string() })),
    async (c) => {
      const { workspaceId } = c.req.valid("param");
      const stats = await getWorkspaceTaskStats(workspaceId);
      return c.json(stats);
    }
  )
  .get(
    "/all/:workspaceId",
    zValidator("param", z.object({ workspaceId: z.string() })),
    zValidator(
      "query",
      z.object({
        userEmail: z.string().optional(),
        status: z.string().optional(),
        priority: z.string().optional(),
        assignedToMe: z.string().optional(),
        projectIds: z.string().optional(),
        dueAfter: z.string().optional(),
        dueBefore: z.string().optional(),
        search: z.string().optional(),
        limit: z.string().optional(),
        offset: z.string().optional(),
      })
    ),
    async (c) => {
      const { workspaceId } = c.req.valid("param");
      const query = c.req.valid("query");

      const options = {
        workspaceId,
        userEmail: query.userEmail,
        status: query.status ? query.status.split(",") : undefined,
        priority: query.priority ? query.priority.split(",") : undefined,
        assignedToMe: query.assignedToMe === "true",
        projectIds: query.projectIds ? query.projectIds.split(",") : undefined,
        dueAfter: query.dueAfter ? new Date(query.dueAfter) : undefined,
        dueBefore: query.dueBefore ? new Date(query.dueBefore) : undefined,
        search: query.search,
        limit: query.limit ? parseInt(query.limit) : undefined,
        offset: query.offset ? parseInt(query.offset) : undefined,
      };

      const result = await getAllTasks(options);
      return c.json(result);
    }
  )
  .get(
    "/tasks/:projectId",
    zValidator("param", z.object({ projectId: z.string() })),
    async (c): Promise<Response> => {
      const { projectId } = c.req.valid("param");

      const tasks = await getTasks(projectId);

      // Explicitly type the response to ensure position field is recognized
      return c.json(tasks as z.infer<typeof ProjectWithTasksSchema>);
    },
  )
  .post(
    "/:projectId",
    rbacMiddleware.canCreateTasks,
    zValidator(
      "json",
      z.object({
        title: z.string(),
        description: z.string(),
        dueDate: z.string(),
        priority: z.string(),
        status: z.string(),
        userEmail: z.string().optional(),
        parentId: z.string().optional(),
      }),
    ),
    async (c) => {
      // 🔒 SECURITY: Rate limit task creation (20 per minute)
      const userId = c.get("userId");
      if (userId) {
        try {
          await checkRateLimit(userId, RATE_LIMITS.CREATE_TASK);
        } catch (rateLimitError) {
          return c.json({ error: 'Too many tasks created. Please wait a moment.' }, 429);
        }
      }

      const { projectId } = c.req.param();
      const { title, description, dueDate, priority, status, userEmail, parentId } =
        c.req.valid("json");

      const task = await createTask({
        projectId,
        userEmail,
        title,
        description,
        dueDate: new Date(dueDate),
        priority,
        status,
        parentId,
      });

      return c.json(task);
    },
  )
  .get("/:id", zValidator("param", z.object({ id: z.string() })), async (c) => {
    const { id } = c.req.valid("param");

    const task = await getTask(id);

    return c.json(task);
  })
  .put(
    "/:id",
    zValidator("param", z.object({ id: z.string() })),
    zValidator(
      "json",
      z.object({
        title: z.string(),
        description: z.string(),
        dueDate: z.string(),
        priority: z.string(),
        status: z.string(),
        projectId: z.string(),
        position: z.number(),
        userEmail: z.string().optional(),
        parentId: z.string().optional(),
      }),
    ),
    async (c) => {
      const { id } = c.req.valid("param");
      const {
        title,
        description,
        dueDate,
        priority,
        status,
        projectId,
        position,
        userEmail,
        parentId,
      } = c.req.valid("json");

      // 🔒 SECURITY: Rate limit task updates (50 per minute)
      const userId = c.get("userId");
      if (userId) {
        try {
          await checkRateLimit(userId, RATE_LIMITS.UPDATE_TASK);
        } catch (rateLimitError) {
          return c.json({ error: 'Too many task updates. Please slow down.' }, 429);
        }
      }

      const task = await updateTask(
        id,
        title,
        status,
        new Date(dueDate),
        projectId,
        description,
        priority,
        position,
        userEmail,
        parentId,
      );

      return c.json(task);
    },
  )
  .get(
    "/export/:projectId",
    zValidator("param", z.object({ projectId: z.string() })),
    async (c) => {
      const { projectId } = c.req.valid("param");

      const exportData = await exportTasks(projectId);

      return c.json(exportData);
    },
  )
  .post(
    "/import/:projectId",
    zValidator("param", z.object({ projectId: z.string() })),
    zValidator(
      "json",
      z.object({
        tasks: z.array(
          z.object({
            title: z.string(),
            description: z.string().optional(),
            status: z.string(),
            priority: z.string().optional(),
            dueDate: z.string().optional(),
            userEmail: z.string().nullable().optional(),
          }),
        ),
      }),
    ),
    async (c) => {
      const { projectId } = c.req.valid("param");
      const { tasks } = c.req.valid("json");

      const result = await importTasks(projectId, tasks);

      return c.json(result);
    },
  )
  .delete(
    "/:id",
    zValidator("param", z.object({ id: z.string() })),
    async (c) => {
      // 🔒 SECURITY: Rate limit task deletion (20 per minute)
      const userId = c.get("userId");
      if (userId) {
        try {
          await checkRateLimit(userId, RATE_LIMITS.DELETE_TASK);
        } catch (rateLimitError) {
          return c.json({ error: 'Too many deletions. Please wait a moment.' }, 429);
        }
      }

      const { id } = c.req.valid("param");

      const task = await deleteTask(id);

      return c.json(task);
    },
  )
  // @epic-1.2-dependencies: Task dependency management endpoints
  .get(
    "/:taskId/dependencies",
    zValidator("param", z.object({ taskId: z.string() })),
    async (c) => {
      const { taskId } = c.req.valid("param");

      const dependencies = await getTaskDependencies(taskId);

      return c.json(dependencies);
    },
  )
  .post(
    "/:taskId/dependencies",
    zValidator("param", z.object({ taskId: z.string() })),
    zValidator(
      "json",
      z.object({
        requiredTaskId: z.string(),
        type: z.enum(['blocks', 'blocked_by']).default('blocks'),
      }),
    ),
    async (c) => {
      const { taskId } = c.req.valid("param");
      const { requiredTaskId, type } = c.req.valid("json");

      const dependency = await createTaskDependency({
        dependentTaskId: taskId,
        requiredTaskId,
        type,
      });

      return c.json(dependency);
    },
  )
  .delete(
    "/dependencies/:dependencyId",
    zValidator("param", z.object({ dependencyId: z.string() })),
    async (c) => {
      const { dependencyId } = c.req.valid("param");

      const dependency = await deleteTaskDependency(dependencyId);

      return c.json(dependency);
    },
  )
  // ☑️ BULK OPERATIONS: Manage multiple tasks at once
  .post(
    "/bulk/status",
    zValidator(
      "json",
      z.object({
        taskIds: z.array(z.string()).min(1, "At least one task ID required"),
        status: z.enum(["todo", "in_progress", "done"]),
        userId: z.string(),
      }),
    ),
    async (c) => {
      const { taskIds, status, userId } = c.req.valid("json");

      const result = await bulkUpdateStatus(taskIds, status, userId);

      return c.json({
        success: true,
        message: `Updated ${result.updated} task(s)`,
        data: result,
      });
    },
  )
  .post(
    "/bulk/priority",
    zValidator(
      "json",
      z.object({
        taskIds: z.array(z.string()).min(1, "At least one task ID required"),
        priority: z.enum(["low", "medium", "high", "urgent"]),
        userId: z.string(),
      }),
    ),
    async (c) => {
      const { taskIds, priority, userId } = c.req.valid("json");

      const result = await bulkUpdatePriority(taskIds, priority, userId);

      return c.json({
        success: true,
        message: `Updated priority for ${result.updated} task(s)`,
        data: result,
      });
    },
  )
  .post(
    "/bulk/assign",
    zValidator(
      "json",
      z.object({
        taskIds: z.array(z.string()).min(1, "At least one task ID required"),
        assigneeId: z.string(),
        assigneeEmail: z.string().email(),
        userId: z.string(),
      }),
    ),
    async (c) => {
      const { taskIds, assigneeId, assigneeEmail, userId } = c.req.valid("json");

      const result = await bulkAssignTasks(taskIds, assigneeId, assigneeEmail, userId);

      return c.json({
        success: true,
        message: `Assigned ${result.updated} task(s)`,
        data: result,
      });
    },
  )
  .post(
    "/bulk/archive",
    zValidator(
      "json",
      z.object({
        taskIds: z.array(z.string()).min(1, "At least one task ID required"),
        userId: z.string(),
      }),
    ),
    async (c) => {
      const { taskIds, userId } = c.req.valid("json");

      const result = await bulkArchiveTasks(taskIds, userId);

      return c.json({
        success: true,
        message: `Archived ${result.archived} task(s)`,
        data: result,
      });
    },
  )
  .post(
    "/bulk/delete",
    zValidator(
      "json",
      z.object({
        taskIds: z.array(z.string()).min(1, "At least one task ID required"),
        userId: z.string(),
      }),
    ),
    async (c) => {
      const { taskIds, userId } = c.req.valid("json");

      const result = await bulkDeleteTasks(taskIds, userId);

      return c.json({
        success: true,
        message: `Deleted ${result.deleted} task(s)`,
        data: result,
      });
    },
  );
export default task;

