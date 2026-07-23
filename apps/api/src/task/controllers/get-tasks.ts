import { eq, or, SQL } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { getDatabase } from "../../database/connection";
import { projectTable, taskTable, userTable } from "../../database/schema";

interface StatusColumn {
  id: string;
  dbId?: string; // Optional since default columns don't have database IDs
  name: string;
  color: string;
  position: number;
  isDefault: boolean;
}

// Column ids MUST equal the task_status enum values (todo|in_progress|done) —
// tasks are bucketed by `task.status === column.id`. The previous hyphenated
// ids ("to-do"/"in-progress") never matched, so boards rendered empty columns;
// "in-review" was dropped because the enum has no such status.
const DEFAULT_COLUMNS: StatusColumn[] = [
  { id: "todo", name: "To Do", color: "#6b7280", position: 0, isDefault: true },
  {
    id: "in_progress",
    name: "In Progress",
    color: "#3b82f6",
    position: 1,
    isDefault: true,
  },
  { id: "done", name: "Done", color: "#10b981", position: 2, isDefault: true },
];

async function getTasks(projectId: string) {
  const db = getDatabase();
  const project = await db.query.projectTable.findFirst({
    where: eq(projectTable.id, projectId),
  });

  if (!project) {
    throw new HTTPException(404, {
      message: "Project not found",
    });
  }

  // See https://github.com/tsatsu10/meridian/issues/63
  const customColumns: StatusColumn[] = []; // Empty until schema exists

  // Use default columns until custom columns are implemented
  const allColumns: StatusColumn[] = [...DEFAULT_COLUMNS];

  // Add custom columns that aren't defaults
  for (const customCol of customColumns) {
    if (!customCol.isDefault) {
      allColumns.push({
        id: customCol.id,
        dbId: customCol.dbId,
        name: customCol.name,
        color: customCol.color,
        position: customCol.position,
        isDefault: false,
      });
    }
  }

  // Sort by position
  allColumns.sort((a, b) => a.position - b.position);

  // Fetch tasks using simple query without joins to avoid Drizzle ORM issues
  const tasksFromDb = await db
    .select()
    .from(taskTable)
    .where(eq(taskTable.projectId, projectId));

  // Fetch users separately and create lookup map
  const userEmails = [
    ...new Set(
      tasksFromDb
        .map((t) => t.userEmail)
        .filter((email): email is string => Boolean(email)),
    ),
  ];
  const users =
    userEmails.length > 0
      ? await db
          .select()
          .from(userTable)
          .where(or(...userEmails.map((email) => eq(userTable.email, email))))
      : [];
  const userMap = new Map(users.map((u) => [u.email, u]));

  // Transform to expected format
  const tasks = tasksFromDb
    .map((task) => {
      const assignee = task.userEmail ? userMap.get(task.userEmail) : null;
      return {
        id: task.id,
        title: task.title,
        number: task.number,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        position: task.position,
        createdAt: task.createdAt,
        userEmail: task.userEmail,
        assigneeName: assignee?.name || null,
        assigneeEmail: assignee?.email || null,
        projectId: task.projectId,
        parentId: task.parentTaskId, // Fixed: use parentTaskId not parentId
      };
    })
    .sort((a, b) => (a.position || 0) - (b.position || 0)); // Sort by position

  // @epic-1.2-dependencies: Fetch all dependencies for tasks in this project (simplified for now)
  const taskIds = tasks.map((task) => task.id);
  const dependencies: unknown[] = []; // Temporarily disabled to fix TypeScript issues

  // Create a task lookup map for dependency resolution
  const taskLookupMap = new Map(tasks.map((task) => [task.id, task]));

  // Create dependency maps for quick lookup with related task information
  const dependencyMap = new Map<
    string,
    { dependencies: unknown[]; blockedBy: unknown[] }
  >();

  // Initialize dependency arrays for all tasks
  for (const taskId of taskIds) {
    dependencyMap.set(taskId, { dependencies: [], blockedBy: [] });
  }

  // Populate dependency relationships with related task information (temporarily disabled)
  // Will be re-enabled once TypeScript issues are resolved

  // Build hierarchical task structure with progress calculation and dependencies
  type MappedTask = (typeof tasks)[number];
  type TaskNode = MappedTask & {
    subtasks: TaskNode[];
    dependencies: unknown[];
    blockedBy: unknown[];
    subtaskProgress?: { completed: number; total: number; percentage: number };
  };

  const buildTaskHierarchy = (taskList: MappedTask[]) => {
    const taskMap = new Map<string, TaskNode>();
    const rootTasks: TaskNode[] = [];

    // First pass: create task map with dependencies
    for (const task of taskList) {
      const taskDeps = dependencyMap.get(task.id) || {
        dependencies: [],
        blockedBy: [],
      };
      taskMap.set(task.id, {
        ...task,
        subtasks: [],
        dependencies: taskDeps.dependencies,
        blockedBy: taskDeps.blockedBy,
      });
    }

    // Second pass: build hierarchy
    for (const task of taskList) {
      const taskWithSubtasks = taskMap.get(task.id);
      if (!taskWithSubtasks) continue;
      const parent = task.parentId ? taskMap.get(task.parentId) : undefined;
      if (parent) {
        parent.subtasks.push(taskWithSubtasks);
      } else {
        rootTasks.push(taskWithSubtasks);
      }
    }

    // Third pass: calculate progress for parent tasks
    const calculateProgress = (task: TaskNode): TaskNode => {
      if (task.subtasks && task.subtasks.length > 0) {
        // Recursively calculate progress for nested subtasks
        task.subtasks = task.subtasks.map(calculateProgress);

        // Calculate completion percentage
        const completedSubtasks = task.subtasks.filter(
          (subtask: TaskNode) => subtask.status === "done",
        ).length;

        task.subtaskProgress = {
          completed: completedSubtasks,
          total: task.subtasks.length,
          percentage: Math.round(
            (completedSubtasks / task.subtasks.length) * 100,
          ),
        };
      }
      return task;
    };

    return rootTasks.map(calculateProgress);
  };

  const columns = allColumns.map((column) => ({
    id: column.id,
    dbId: column.dbId,
    name: column.name,
    color: column.color,
    position: column.position,
    isDefault: column.isDefault,
    tasks: buildTaskHierarchy(
      tasks.filter((task) => task.status === column.id),
    ),
  }));

  // The task_status enum is todo|in_progress|done — "archived"/"planned"
  // never existed as statuses, so these buckets are honestly empty.
  const archivedTasks: typeof tasks = [];
  const plannedTasks: typeof tasks = [];

  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    icon: project.icon,
    description: project.description,
    workspaceId: project.workspaceId,
    columns,
    archivedTasks,
    plannedTasks,
  };
}

export default getTasks;
