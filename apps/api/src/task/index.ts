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
import rbacMiddleware, {
  checkProjectPermission,
  checkWorkspacePermission,
} from "../middlewares/rbac";
import { checkRateLimit, RATE_LIMITS } from "../middlewares/chat-rate-limiter";
import { getDatabase } from "../database/connection";
import { taskDependencyTable } from "../database/schema";
import { eq } from "drizzle-orm";

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
  subtaskProgress: z
    .object({
      completed: z.number(),
      total: z.number(),
      percentage: z.number(),
    })
    .optional(),
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
        "GET /export/:projectId": "Export tasks to CSV/JSON",
      },
      examples: {
        getAllTasks: "/api/task/all/workspace-id-123",
        getProjectTasks: "/api/task/tasks/project-id-456",
      },
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
    },
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
      }),
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
        limit: query.limit ? Number.parseInt(query.limit) : undefined,
        offset: query.offset ? Number.parseInt(query.offset) : undefined,
      };

      const result = await getAllTasks(options);
      return c.json(result);
    },
  )
  .get(
    "/tasks/:projectId",
    zValidator("param", z.object({ projectId: z.string() })),
    async (c): Promise<Response> => {
      const { projectId } = c.req.valid("param");

      const tasks = await getTasks(projectId);

      return c.json(tasks);
    },
  )
  .post(
    "/:projectId",
    rbacMiddleware.requireProjectPermission("canCreateTasks"),
    zValidator(
      "json",
      z.object({
        title: z.string(),
        description: z.string(),
        dueDate: z.string().nullable().optional(),
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
          return c.json(
            { error: "Too many tasks created. Please wait a moment." },
            429,
          );
        }
      }

      const { projectId } = c.req.param();
      const {
        title,
        description,
        dueDate,
        priority,
        status,
        userEmail,
        parentId,
      } = c.req.valid("json");

      const task = await createTask({
        projectId,
        userEmail,
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : undefined,
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

    // SECURITY: task lookup was previously unscoped — any authenticated
    // user could read any task in any workspace by ID.
    const permission = await checkProjectPermission(
      c.get("userEmail"),
      task.projectId,
      "canViewTasks",
    );
    if (!permission.allowed) {
      return c.json(permission.body ?? { error: "Forbidden" }, permission.status ?? 403);
    }

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

      // SECURITY: authorize against the task's REAL current project, not the
      // client-supplied one — otherwise a caller could edit a task they have
      // no access to just by asserting a projectId they do have access to.
      const existingTask = await getTask(id);
      const userEmailCtx = c.get("userEmail");
      const currentProjectPermission = await checkProjectPermission(
        userEmailCtx,
        existingTask.projectId,
        "canUpdateTasks",
      );
      if (!currentProjectPermission.allowed) {
        return c.json(
          currentProjectPermission.body ?? { error: "Forbidden" },
          currentProjectPermission.status ?? 403,
        );
      }
      // If this update also tries to move the task into a different
      // project, the caller must have edit access there too.
      if (projectId !== existingTask.projectId) {
        const targetProjectPermission = await checkProjectPermission(
          userEmailCtx,
          projectId,
          "canUpdateTasks",
        );
        if (!targetProjectPermission.allowed) {
          return c.json(
            targetProjectPermission.body ?? { error: "Forbidden" },
            targetProjectPermission.status ?? 403,
          );
        }
      }

      // 🔒 SECURITY: Rate limit task updates (50 per minute)
      const userId = c.get("userId");
      if (userId) {
        try {
          await checkRateLimit(userId, RATE_LIMITS.UPDATE_TASK);
        } catch (rateLimitError) {
          return c.json(
            { error: "Too many task updates. Please slow down." },
            429,
          );
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
    rbacMiddleware.requireProjectPermission("canViewTasks"),
    zValidator("param", z.object({ projectId: z.string() })),
    async (c) => {
      const { projectId } = c.req.valid("param");

      const exportData = await exportTasks(projectId);

      return c.json(exportData);
    },
  )
  .post(
    "/import/:projectId",
    rbacMiddleware.requireProjectPermission("canCreateTasks"),
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
      const { id } = c.req.valid("param");

      // SECURITY: was previously deletable by ID with no ownership check.
      const existingTask = await getTask(id);
      const permission = await checkProjectPermission(
        c.get("userEmail"),
        existingTask.projectId,
        "canDeleteTasks",
      );
      if (!permission.allowed) {
        return c.json(permission.body ?? { error: "Forbidden" }, permission.status ?? 403);
      }

      // 🔒 SECURITY: Rate limit task deletion (20 per minute)
      const userId = c.get("userId");
      if (userId) {
        try {
          await checkRateLimit(userId, RATE_LIMITS.DELETE_TASK);
        } catch (rateLimitError) {
          return c.json(
            { error: "Too many deletions. Please wait a moment." },
            429,
          );
        }
      }

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

      const task = await getTask(taskId);
      const permission = await checkProjectPermission(
        c.get("userEmail"),
        task.projectId,
        "canViewTasks",
      );
      if (!permission.allowed) {
        return c.json(permission.body ?? { error: "Forbidden" }, permission.status ?? 403);
      }

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
        type: z.enum(["blocks", "blocked_by"]).default("blocks"),
      }),
    ),
    async (c) => {
      const { taskId } = c.req.valid("param");
      const { requiredTaskId, type } = c.req.valid("json");

      const task = await getTask(taskId);
      const permission = await checkProjectPermission(
        c.get("userEmail"),
        task.projectId,
        "canUpdateTasks",
      );
      if (!permission.allowed) {
        return c.json(permission.body ?? { error: "Forbidden" }, permission.status ?? 403);
      }

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

      const db = getDatabase();
      const [existingDependency] = await db
        .select({ dependentTaskId: taskDependencyTable.dependentTaskId })
        .from(taskDependencyTable)
        .where(eq(taskDependencyTable.id, dependencyId))
        .limit(1);

      if (!existingDependency) {
        return c.json({ error: "Dependency not found" }, 404);
      }

      const task = await getTask(existingDependency.dependentTaskId);
      const permission = await checkProjectPermission(
        c.get("userEmail"),
        task.projectId,
        "canUpdateTasks",
      );
      if (!permission.allowed) {
        return c.json(permission.body ?? { error: "Forbidden" }, permission.status ?? 403);
      }

      const dependency = await deleteTaskDependency(dependencyId);

      return c.json(dependency);
    },
  )
  // ☑️ BULK OPERATIONS: Manage multiple tasks at once
  // SECURITY: workspaceId is now required and checked — both for
  // authorization (checkWorkspacePermission below; it's read from the JSON
  // body here, not a route param, so the requireWorkspacePermission
  // middleware doesn't apply) and for scoping (every task ID in the batch
  // must belong to it, see verifyTasksBelongToWorkspace). Previously these
  // routes had no workspace check at all: any authenticated user could
  // bulk-update/assign/archive/delete any task in any workspace by ID.
  .post(
    "/bulk/status",
    zValidator(
      "json",
      z.object({
        taskIds: z.array(z.string()).min(1, "At least one task ID required"),
        status: z.enum(["todo", "in_progress", "done"]),
        userId: z.string(),
        workspaceId: z.string(),
      }),
    ),
    async (c) => {
      const { taskIds, status, userId, workspaceId } = c.req.valid("json");

      const permission = await checkWorkspacePermission(
        c.get("userEmail"),
        workspaceId,
        "canUpdateTasks",
      );
      if (!permission.allowed) {
        return c.json(permission.body ?? { error: "Forbidden" }, permission.status ?? 403);
      }

      const result = await bulkUpdateStatus(
        taskIds,
        status,
        userId,
        workspaceId,
        permission.restrictedToProjectIds,
      );
      if ("error" in result) return c.json(result, 403);

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
        workspaceId: z.string(),
      }),
    ),
    async (c) => {
      const { taskIds, priority, userId, workspaceId } = c.req.valid("json");

      const permission = await checkWorkspacePermission(
        c.get("userEmail"),
        workspaceId,
        "canUpdateTasks",
      );
      if (!permission.allowed) {
        return c.json(permission.body ?? { error: "Forbidden" }, permission.status ?? 403);
      }

      const result = await bulkUpdatePriority(
        taskIds,
        priority,
        userId,
        workspaceId,
        permission.restrictedToProjectIds,
      );
      if ("error" in result) return c.json(result, 403);

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
        workspaceId: z.string(),
      }),
    ),
    async (c) => {
      const { taskIds, assigneeId, assigneeEmail, userId, workspaceId } =
        c.req.valid("json");

      const permission = await checkWorkspacePermission(
        c.get("userEmail"),
        workspaceId,
        "canAssignTasks",
      );
      if (!permission.allowed) {
        return c.json(permission.body ?? { error: "Forbidden" }, permission.status ?? 403);
      }

      const result = await bulkAssignTasks(
        taskIds,
        assigneeId,
        assigneeEmail,
        userId,
        workspaceId,
        permission.restrictedToProjectIds,
      );
      if ("error" in result) return c.json(result, 403);

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
        workspaceId: z.string(),
      }),
    ),
    async (c) => {
      const { taskIds, userId, workspaceId } = c.req.valid("json");

      const permission = await checkWorkspacePermission(
        c.get("userEmail"),
        workspaceId,
        "canUpdateTasks",
      );
      if (!permission.allowed) {
        return c.json(permission.body ?? { error: "Forbidden" }, permission.status ?? 403);
      }

      const result = await bulkArchiveTasks(
        taskIds,
        userId,
        workspaceId,
        permission.restrictedToProjectIds,
      );
      if ("error" in result) return c.json(result, 403);

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
        workspaceId: z.string(),
      }),
    ),
    async (c) => {
      const { taskIds, userId, workspaceId } = c.req.valid("json");

      const permission = await checkWorkspacePermission(
        c.get("userEmail"),
        workspaceId,
        "canDeleteTasks",
      );
      if (!permission.allowed) {
        return c.json(permission.body ?? { error: "Forbidden" }, permission.status ?? 403);
      }

      const result = await bulkDeleteTasks(
        taskIds,
        userId,
        workspaceId,
        permission.restrictedToProjectIds,
      );
      if ("error" in result) return c.json(result, 403);

      return c.json({
        success: true,
        message: `Deleted ${result.deleted} task(s)`,
        data: result,
      });
    },
  );
export default task;
