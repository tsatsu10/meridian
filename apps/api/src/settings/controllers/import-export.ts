/**
 * Import/Export Controller
 * Handles workspace data export and import with validation
 */

import { eq, and, inArray, type SQL } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import {
  workspaceTable,
  projectTable,
  taskTable,
  userTable,
  roleAssignmentTable,
} from "../../database/schema";
import { createId } from "@paralleldrive/cuid2";
import { getErrorMessage } from "../../utils/error-utils";

export interface ExportOptions {
  format: "json" | "csv";
  includeProjects?: boolean;
  includeTasks?: boolean;
  includeUsers?: boolean;
  includeRoles?: boolean;
  projectIds?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface ImportOptions {
  format: "json" | "csv";
  validateOnly?: boolean;
  skipDuplicates?: boolean;
  updateExisting?: boolean;
}

export interface ImportResult {
  success: boolean;
  totalRecords: number;
  importedRecords: number;
  skippedRecords: number;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
}

interface ExportDataBag {
  exportDate: string;
  workspaceId: string;
  version: string;
  workspace?: Record<string, unknown>;
  projects?: Record<string, unknown>[];
  tasks?: Record<string, unknown>[];
  users?: Record<string, unknown>[];
  roleAssignments?: Record<string, unknown>[];
}

// Arbitrary user-submitted import data (JSON body or parsed CSV row) --
// genuinely untyped at this boundary, not a case of laziness.
type ImportRecord = Record<string, unknown>;

interface ParsedImportData {
  projects?: ImportRecord[];
  tasks?: ImportRecord[];
  users?: ImportRecord[];
}

function getStringField(record: ImportRecord, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

// Export workspace data
export async function exportWorkspaceData(
  workspaceId: string,
  options: ExportOptions,
): Promise<{ data: string; filename: string; mimeType: string }> {
  const db = getDatabase();
  const exportData: ExportDataBag = {
    exportDate: new Date().toISOString(),
    workspaceId,
    version: "1.0",
  };

  // Export workspace info
  const [workspace] = await db
    .select()
    .from(workspaceTable)
    .where(eq(workspaceTable.id, workspaceId))
    .limit(1);

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  exportData.workspace = {
    name: workspace.name,
    description: workspace.description,
  };

  // Export projects
  if (options.includeProjects) {
    const projectWhere: SQL<unknown>[] = [
      eq(projectTable.workspaceId, workspaceId),
    ];

    if (options.projectIds && options.projectIds.length > 0) {
      projectWhere.push(inArray(projectTable.id, options.projectIds));
    }

    const projects = await db
      .select()
      .from(projectTable)
      .where(and(...projectWhere));

    exportData.projects = projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      status: p.status,
      startDate: p.startDate,
      endDate: p.dueDate,
      ownerId: p.ownerId,
      createdAt: p.createdAt,
    }));
  }

  // Export tasks
  if (options.includeTasks) {
    const taskWhere: SQL<unknown>[] = [
      eq(projectTable.workspaceId, workspaceId),
    ];

    if (options.projectIds && options.projectIds.length > 0) {
      taskWhere.push(inArray(taskTable.projectId, options.projectIds));
    }

    const taskRows = await db
      .select({ task: taskTable })
      .from(taskTable)
      .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
      .where(and(...taskWhere));
    const tasks = taskRows.map((r) => r.task);

    exportData.tasks = tasks.map((t) => ({
      id: t.id,
      projectId: t.projectId,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      assigneeId: t.assigneeId,
      dueDate: t.dueDate,
      createdAt: t.createdAt,
    }));
  }

  // Export users
  if (options.includeUsers) {
    const users = await db
      .select({
        email: userTable.email,
        name: userTable.name,
        role: userTable.role,
        createdAt: userTable.createdAt,
      })
      .from(userTable);

    exportData.users = users;
  }

  // Export role assignments
  if (options.includeRoles) {
    const roles = await db
      .select()
      .from(roleAssignmentTable)
      .where(eq(roleAssignmentTable.workspaceId, workspaceId));

    exportData.roleAssignments = roles.map((r) => ({
      userId: r.userId,
      role: r.role,
      projectIds: r.projectIds,
      assignedAt: r.assignedAt,
    }));
  }

  const timestamp = new Date().toISOString().split("T")[0];

  if (options.format === "json") {
    return {
      data: JSON.stringify(exportData, null, 2),
      filename: `workspace-export-${timestamp}.json`,
      mimeType: "application/json",
    };
  }
  // CSV format
  const csv = convertToCSV(exportData);
  return {
    data: csv,
    filename: `workspace-export-${timestamp}.csv`,
    mimeType: "text/csv",
  };
}

// Convert data to CSV format
function convertToCSV(data: ExportDataBag): string {
  const lines: string[] = [];

  // Projects CSV
  const firstProject = data.projects?.[0];
  if (data.projects && data.projects.length > 0 && firstProject) {
    lines.push("## PROJECTS ##");
    const headers = Object.keys(firstProject);
    lines.push(headers.join(","));

    for (const project of data.projects) {
      const values = headers.map((h) => {
        const value = project[h] || "";
        return typeof value === "string" && value.includes(",")
          ? `"${value}"`
          : value;
      });
      lines.push(values.join(","));
    }
    lines.push("");
  }

  // Tasks CSV
  const firstTask = data.tasks?.[0];
  if (data.tasks && data.tasks.length > 0 && firstTask) {
    lines.push("## TASKS ##");
    const headers = Object.keys(firstTask);
    lines.push(headers.join(","));

    for (const task of data.tasks) {
      const values = headers.map((h) => {
        const value = task[h] || "";
        return typeof value === "string" && value.includes(",")
          ? `"${value}"`
          : value;
      });
      lines.push(values.join(","));
    }
    lines.push("");
  }

  // Users CSV
  const firstUser = data.users?.[0];
  if (data.users && data.users.length > 0 && firstUser) {
    lines.push("## USERS ##");
    const headers = Object.keys(firstUser);
    lines.push(headers.join(","));

    for (const user of data.users) {
      const values = headers.map((h) => {
        const value = user[h] || "";
        return typeof value === "string" && value.includes(",")
          ? `"${value}"`
          : value;
      });
      lines.push(values.join(","));
    }
  }

  return lines.join("\n");
}

// Validate import data
export async function validateImportData(
  workspaceId: string,
  data: unknown,
  format: "json" | "csv",
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    totalRecords: 0,
    importedRecords: 0,
    skippedRecords: 0,
    errors: [],
  };

  try {
    let parsedData: ParsedImportData;

    if (format === "json") {
      parsedData = (
        typeof data === "string" ? JSON.parse(data) : data
      ) as ParsedImportData;
    } else {
      parsedData = parseCSV(data as string);
    }

    // Validate projects
    if (parsedData.projects) {
      result.totalRecords += parsedData.projects.length;

      for (const [i, project] of parsedData.projects.entries()) {
        const errors = validateProject(project);

        if (errors.length > 0) {
          result.errors.push(
            ...errors.map((e) => ({
              row: i + 1,
              field: e.field,
              message: e.message,
            })),
          );
          result.skippedRecords++;
        } else {
          result.importedRecords++;
        }
      }
    }

    // Validate tasks
    if (parsedData.tasks) {
      result.totalRecords += parsedData.tasks.length;

      for (const [i, task] of parsedData.tasks.entries()) {
        const errors = validateTask(task);

        if (errors.length > 0) {
          result.errors.push(
            ...errors.map((e) => ({
              row: i + 1,
              field: e.field,
              message: e.message,
            })),
          );
          result.skippedRecords++;
        } else {
          result.importedRecords++;
        }
      }
    }

    // Validate users
    if (parsedData.users) {
      result.totalRecords += parsedData.users.length;

      for (const [i, user] of parsedData.users.entries()) {
        const errors = validateUser(user);

        if (errors.length > 0) {
          result.errors.push(
            ...errors.map((e) => ({
              row: i + 1,
              field: e.field,
              message: e.message,
            })),
          );
          result.skippedRecords++;
        } else {
          result.importedRecords++;
        }
      }
    }

    result.success = result.errors.length === 0;
  } catch (error) {
    result.success = false;
    result.errors.push({
      row: 0,
      message: `Failed to parse import data: ${getErrorMessage(error)}`,
    });
  }

  return result;
}

// Parse CSV data
function parseCSV(csvData: string): Required<ParsedImportData> {
  const result: Required<ParsedImportData> = {
    projects: [],
    tasks: [],
    users: [],
  };

  const sections = csvData.split("##").filter((s) => s.trim());

  for (const section of sections) {
    const lines = section.trim().split("\n");
    if (lines.length < 2) continue;

    const type = lines[0]?.trim().toLowerCase() ?? "";
    const headers = (lines[1] ?? "").split(",").map((h) => h.trim());

    for (let i = 2; i < lines.length; i++) {
      const line = lines[i];
      if (!line || !line.trim()) continue;

      const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const record: ImportRecord = {};

      for (const [index, header] of headers.entries()) {
        record[header] = values[index] || "";
      }

      if (type.includes("project")) {
        result.projects.push(record);
      } else if (type.includes("task")) {
        result.tasks.push(record);
      } else if (type.includes("user")) {
        result.users.push(record);
      }
    }
  }

  return result;
}

// Validation helpers
function validateProject(
  project: ImportRecord,
): Array<{ field: string; message: string }> {
  const errors: Array<{ field: string; message: string }> = [];
  const name = getStringField(project, "name");
  const status = getStringField(project, "status");

  if (!name || name.length < 1) {
    errors.push({ field: "name", message: "Project name is required" });
  }

  if (name && name.length > 100) {
    errors.push({
      field: "name",
      message: "Project name must be 100 characters or less",
    });
  }

  if (
    status &&
    !["active", "completed", "archived", "on-hold"].includes(status)
  ) {
    errors.push({ field: "status", message: "Invalid project status" });
  }

  return errors;
}

function validateTask(
  task: ImportRecord,
): Array<{ field: string; message: string }> {
  const errors: Array<{ field: string; message: string }> = [];
  const title = getStringField(task, "title");
  const status = getStringField(task, "status");
  const priority = getStringField(task, "priority");

  if (!title || title.length < 1) {
    errors.push({ field: "title", message: "Task title is required" });
  }

  if (title && title.length > 200) {
    errors.push({
      field: "title",
      message: "Task title must be 200 characters or less",
    });
  }

  if (
    status &&
    !["backlog", "todo", "in-progress", "review", "done"].includes(status)
  ) {
    errors.push({ field: "status", message: "Invalid task status" });
  }

  if (priority && !["low", "medium", "high", "urgent"].includes(priority)) {
    errors.push({ field: "priority", message: "Invalid task priority" });
  }

  return errors;
}

function validateUser(
  user: ImportRecord,
): Array<{ field: string; message: string }> {
  const errors: Array<{ field: string; message: string }> = [];
  const email = getStringField(user, "email");
  const name = getStringField(user, "name");

  if (!email) {
    errors.push({ field: "email", message: "User email is required" });
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push({ field: "email", message: "Invalid email format" });
  }

  if (!name || name.length < 1) {
    errors.push({ field: "name", message: "User name is required" });
  }

  return errors;
}

// Import workspace data
export async function importWorkspaceData(
  workspaceId: string,
  data: unknown,
  options: ImportOptions,
): Promise<ImportResult> {
  const db = getDatabase();

  // First validate
  const validationResult = await validateImportData(
    workspaceId,
    data,
    options.format,
  );

  if (options.validateOnly || !validationResult.success) {
    return validationResult;
  }

  const result: ImportResult = {
    success: true,
    totalRecords: 0,
    importedRecords: 0,
    skippedRecords: 0,
    errors: [],
  };

  try {
    let parsedData: ParsedImportData;

    if (options.format === "json") {
      parsedData = (
        typeof data === "string" ? JSON.parse(data) : data
      ) as ParsedImportData;
    } else {
      parsedData = parseCSV(data as string);
    }

    // Import projects
    if (parsedData.projects) {
      for (const project of parsedData.projects) {
        try {
          const projectId = getStringField(project, "id") || createId();
          const startDate = getStringField(project, "startDate");
          const endDate = getStringField(project, "endDate");

          await db.insert(projectTable).values({
            id: projectId,
            workspaceId,
            name: getStringField(project, "name") || "",
            description: getStringField(project, "description") || null,
            status: getStringField(project, "status") || "active",
            startDate: startDate ? new Date(startDate) : null,
            dueDate: endDate ? new Date(endDate) : null,
            // ownerId is NOT NULL/FK on the schema; an empty string here still
            // fails the FK constraint at insert time (caught below) exactly
            // as a `null` value used to under the previous `any` typing.
            ownerId: getStringField(project, "ownerId") ?? "",
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          result.importedRecords++;
        } catch (error) {
          if (
            options.skipDuplicates &&
            getErrorMessage(error).includes("duplicate")
          ) {
            result.skippedRecords++;
          } else {
            result.errors.push({
              row: result.totalRecords,
              message: getErrorMessage(error),
            });
          }
        }

        result.totalRecords++;
      }
    }

    // Import tasks
    if (parsedData.tasks) {
      for (const task of parsedData.tasks) {
        try {
          const taskId = getStringField(task, "id") || createId();
          const dueDate = getStringField(task, "dueDate");

          await db.insert(taskTable).values({
            id: taskId,
            projectId: getStringField(task, "projectId") || "",
            title: getStringField(task, "title") || "",
            description: getStringField(task, "description") || null,
            // request-boundary narrowing onto the enum columns
            status:
              (getStringField(task, "status") as
                | "todo"
                | "in_progress"
                | "done"
                | undefined) || "todo",
            priority:
              (getStringField(task, "priority") as
                | "low"
                | "medium"
                | "high"
                | "urgent"
                | undefined) || "medium",
            assigneeId: getStringField(task, "assigneeId") || null,
            dueDate: dueDate ? new Date(dueDate) : null,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          result.importedRecords++;
        } catch (error) {
          if (
            options.skipDuplicates &&
            getErrorMessage(error).includes("duplicate")
          ) {
            result.skippedRecords++;
          } else {
            result.errors.push({
              row: result.totalRecords,
              message: getErrorMessage(error),
            });
          }
        }

        result.totalRecords++;
      }
    }

    result.success = result.errors.length === 0;
  } catch (error) {
    result.success = false;
    result.errors.push({
      row: 0,
      message: `Import failed: ${getErrorMessage(error)}`,
    });
  }

  return result;
}

// Get export templates
export function getExportTemplates() {
  return {
    projects: {
      name: "Project Template",
      fields: [
        "id",
        "name",
        "description",
        "status",
        "startDate",
        "endDate",
        "ownerEmail",
      ],
      example: {
        id: "proj_123",
        name: "Example Project",
        description: "Project description",
        status: "active",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        ownerEmail: "owner@example.com",
      },
    },
    tasks: {
      name: "Task Template",
      fields: [
        "id",
        "projectId",
        "title",
        "description",
        "status",
        "priority",
        "assignee",
        "dueDate",
      ],
      example: {
        id: "task_123",
        projectId: "proj_123",
        title: "Example Task",
        description: "Task description",
        status: "todo",
        priority: "medium",
        assignee: "user@example.com",
        dueDate: "2024-06-30",
      },
    },
    users: {
      name: "User Template",
      fields: ["email", "name", "role"],
      example: {
        email: "user@example.com",
        name: "John Doe",
        role: "member",
      },
    },
  };
}
