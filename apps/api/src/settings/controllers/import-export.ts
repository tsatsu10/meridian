/**
 * Import/Export Controller
 * Handles workspace data export and import with validation
 */

import { eq, and, inArray } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import {
  workspaceTable,
  projectTable,
  taskTable,
  userTable,
  roleAssignmentTable,
} from "../../database/schema";
import { createId } from "@paralleldrive/cuid2";

export interface ExportOptions {
  format: 'json' | 'csv';
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
  format: 'json' | 'csv';
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

// Export workspace data
export async function exportWorkspaceData(
  workspaceId: string,
  options: ExportOptions
): Promise<{ data: string; filename: string; mimeType: string }> {
  const db = getDatabase();
  const exportData: any = {
    exportDate: new Date().toISOString(),
    workspaceId,
    version: '1.0',
  };
  
  // Export workspace info
  const [workspace] = await db
    .select()
    .from(workspaceTable)
    .where(eq(workspaceTable.id, workspaceId))
    .limit(1);
  
  if (!workspace) {
    throw new Error('Workspace not found');
  }
  
  exportData.workspace = {
    name: workspace.name,
    description: workspace.description,
  };
  
  // Export projects
  if (options.includeProjects) {
    const projectWhere: any[] = [eq(projectTable.workspaceId, workspaceId)];
    
    if (options.projectIds && options.projectIds.length > 0) {
      projectWhere.push(inArray(projectTable.id, options.projectIds));
    }
    
    const projects = await db
      .select()
      .from(projectTable)
      .where(and(...projectWhere));
    
    exportData.projects = projects.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      status: p.status,
      startDate: p.startDate,
      endDate: p.endDate,
      ownerEmail: p.ownerEmail,
      createdAt: p.createdAt,
    }));
  }
  
  // Export tasks
  if (options.includeTasks) {
    const taskWhere: any[] = [eq(taskTable.workspaceId, workspaceId)];
    
    if (options.projectIds && options.projectIds.length > 0) {
      taskWhere.push(inArray(taskTable.projectId, options.projectIds));
    }
    
    const tasks = await db
      .select()
      .from(taskTable)
      .where(and(...taskWhere));
    
    exportData.tasks = tasks.map(t => ({
      id: t.id,
      projectId: t.projectId,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      assignee: t.assignee,
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
    
    exportData.roleAssignments = roles.map(r => ({
      userEmail: r.userEmail,
      role: r.role,
      projectId: r.projectId,
      assignedAt: r.assignedAt,
    }));
  }
  
  const timestamp = new Date().toISOString().split('T')[0];
  
  if (options.format === 'json') {
    return {
      data: JSON.stringify(exportData, null, 2),
      filename: `workspace-export-${timestamp}.json`,
      mimeType: 'application/json',
    };
  } else {
    // CSV format
    const csv = convertToCSV(exportData);
    return {
      data: csv,
      filename: `workspace-export-${timestamp}.csv`,
      mimeType: 'text/csv',
    };
  }
}

// Convert data to CSV format
function convertToCSV(data: any): string {
  const lines: string[] = [];
  
  // Projects CSV
  if (data.projects && data.projects.length > 0) {
    lines.push('## PROJECTS ##');
    const headers = Object.keys(data.projects[0]);
    lines.push(headers.join(','));
    
    for (const project of data.projects) {
      const values = headers.map(h => {
        const value = project[h] || '';
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      });
      lines.push(values.join(','));
    }
    lines.push('');
  }
  
  // Tasks CSV
  if (data.tasks && data.tasks.length > 0) {
    lines.push('## TASKS ##');
    const headers = Object.keys(data.tasks[0]);
    lines.push(headers.join(','));
    
    for (const task of data.tasks) {
      const values = headers.map(h => {
        const value = task[h] || '';
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      });
      lines.push(values.join(','));
    }
    lines.push('');
  }
  
  // Users CSV
  if (data.users && data.users.length > 0) {
    lines.push('## USERS ##');
    const headers = Object.keys(data.users[0]);
    lines.push(headers.join(','));
    
    for (const user of data.users) {
      const values = headers.map(h => {
        const value = user[h] || '';
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      });
      lines.push(values.join(','));
    }
  }
  
  return lines.join('\n');
}

// Validate import data
export async function validateImportData(
  workspaceId: string,
  data: any,
  format: 'json' | 'csv'
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    totalRecords: 0,
    importedRecords: 0,
    skippedRecords: 0,
    errors: [],
  };
  
  try {
    let parsedData: any;
    
    if (format === 'json') {
      parsedData = typeof data === 'string' ? JSON.parse(data) : data;
    } else {
      parsedData = parseCSV(data);
    }
    
    // Validate projects
    if (parsedData.projects) {
      result.totalRecords += parsedData.projects.length;
      
      for (let i = 0; i < parsedData.projects.length; i++) {
        const project = parsedData.projects[i];
        const errors = validateProject(project);
        
        if (errors.length > 0) {
          result.errors.push(...errors.map(e => ({
            row: i + 1,
            field: e.field,
            message: e.message,
          })));
          result.skippedRecords++;
        } else {
          result.importedRecords++;
        }
      }
    }
    
    // Validate tasks
    if (parsedData.tasks) {
      result.totalRecords += parsedData.tasks.length;
      
      for (let i = 0; i < parsedData.tasks.length; i++) {
        const task = parsedData.tasks[i];
        const errors = validateTask(task);
        
        if (errors.length > 0) {
          result.errors.push(...errors.map(e => ({
            row: i + 1,
            field: e.field,
            message: e.message,
          })));
          result.skippedRecords++;
        } else {
          result.importedRecords++;
        }
      }
    }
    
    // Validate users
    if (parsedData.users) {
      result.totalRecords += parsedData.users.length;
      
      for (let i = 0; i < parsedData.users.length; i++) {
        const user = parsedData.users[i];
        const errors = validateUser(user);
        
        if (errors.length > 0) {
          result.errors.push(...errors.map(e => ({
            row: i + 1,
            field: e.field,
            message: e.message,
          })));
          result.skippedRecords++;
        } else {
          result.importedRecords++;
        }
      }
    }
    
    result.success = result.errors.length === 0;
  } catch (error: any) {
    result.success = false;
    result.errors.push({
      row: 0,
      message: `Failed to parse import data: ${error.message}`,
    });
  }
  
  return result;
}

// Parse CSV data
function parseCSV(csvData: string): any {
  const result: any = {
    projects: [],
    tasks: [],
    users: [],
  };
  
  const sections = csvData.split('##').filter(s => s.trim());
  
  for (const section of sections) {
    const lines = section.trim().split('\n');
    if (lines.length < 2) continue;
    
    const type = lines[0].trim().toLowerCase();
    const headers = lines[1].split(',').map(h => h.trim());
    
    for (let i = 2; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const record: any = {};
      
      headers.forEach((header, index) => {
        record[header] = values[index] || '';
      });
      
      if (type.includes('project')) {
        result.projects.push(record);
      } else if (type.includes('task')) {
        result.tasks.push(record);
      } else if (type.includes('user')) {
        result.users.push(record);
      }
    }
  }
  
  return result;
}

// Validation helpers
function validateProject(project: any): Array<{ field: string; message: string }> {
  const errors: Array<{ field: string; message: string }> = [];
  
  if (!project.name || project.name.length < 1) {
    errors.push({ field: 'name', message: 'Project name is required' });
  }
  
  if (project.name && project.name.length > 100) {
    errors.push({ field: 'name', message: 'Project name must be 100 characters or less' });
  }
  
  if (project.status && !['active', 'completed', 'archived', 'on-hold'].includes(project.status)) {
    errors.push({ field: 'status', message: 'Invalid project status' });
  }
  
  return errors;
}

function validateTask(task: any): Array<{ field: string; message: string }> {
  const errors: Array<{ field: string; message: string }> = [];
  
  if (!task.title || task.title.length < 1) {
    errors.push({ field: 'title', message: 'Task title is required' });
  }
  
  if (task.title && task.title.length > 200) {
    errors.push({ field: 'title', message: 'Task title must be 200 characters or less' });
  }
  
  if (task.status && !['backlog', 'todo', 'in-progress', 'review', 'done'].includes(task.status)) {
    errors.push({ field: 'status', message: 'Invalid task status' });
  }
  
  if (task.priority && !['low', 'medium', 'high', 'urgent'].includes(task.priority)) {
    errors.push({ field: 'priority', message: 'Invalid task priority' });
  }
  
  return errors;
}

function validateUser(user: any): Array<{ field: string; message: string }> {
  const errors: Array<{ field: string; message: string }> = [];
  
  if (!user.email) {
    errors.push({ field: 'email', message: 'User email is required' });
  }
  
  if (user.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }
  
  if (!user.name || user.name.length < 1) {
    errors.push({ field: 'name', message: 'User name is required' });
  }
  
  return errors;
}

// Import workspace data
export async function importWorkspaceData(
  workspaceId: string,
  data: any,
  options: ImportOptions
): Promise<ImportResult> {
  const db = getDatabase();
  
  // First validate
  const validationResult = await validateImportData(workspaceId, data, options.format);
  
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
    let parsedData: any;
    
    if (options.format === 'json') {
      parsedData = typeof data === 'string' ? JSON.parse(data) : data;
    } else {
      parsedData = parseCSV(data);
    }
    
    // Import projects
    if (parsedData.projects) {
      for (const project of parsedData.projects) {
        try {
          const projectId = project.id || createId();
          
          await db.insert(projectTable).values({
            id: projectId,
            workspaceId,
            name: project.name,
            description: project.description || null,
            status: project.status || 'active',
            startDate: project.startDate ? new Date(project.startDate) : null,
            endDate: project.endDate ? new Date(project.endDate) : null,
            ownerEmail: project.ownerEmail,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          
          result.importedRecords++;
        } catch (error: any) {
          if (options.skipDuplicates && error.message.includes('duplicate')) {
            result.skippedRecords++;
          } else {
            result.errors.push({
              row: result.totalRecords,
              message: error.message,
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
          const taskId = task.id || createId();
          
          await db.insert(taskTable).values({
            id: taskId,
            workspaceId,
            projectId: task.projectId,
            title: task.title,
            description: task.description || null,
            status: task.status || 'backlog',
            priority: task.priority || 'medium',
            assignee: task.assignee || null,
            dueDate: task.dueDate ? new Date(task.dueDate) : null,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          
          result.importedRecords++;
        } catch (error: any) {
          if (options.skipDuplicates && error.message.includes('duplicate')) {
            result.skippedRecords++;
          } else {
            result.errors.push({
              row: result.totalRecords,
              message: error.message,
            });
          }
        }
        
        result.totalRecords++;
      }
    }
    
    result.success = result.errors.length === 0;
  } catch (error: any) {
    result.success = false;
    result.errors.push({
      row: 0,
      message: `Import failed: ${error.message}`,
    });
  }
  
  return result;
}

// Get export templates
export function getExportTemplates() {
  return {
    projects: {
      name: 'Project Template',
      fields: ['id', 'name', 'description', 'status', 'startDate', 'endDate', 'ownerEmail'],
      example: {
        id: 'proj_123',
        name: 'Example Project',
        description: 'Project description',
        status: 'active',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        ownerEmail: 'owner@example.com',
      },
    },
    tasks: {
      name: 'Task Template',
      fields: ['id', 'projectId', 'title', 'description', 'status', 'priority', 'assignee', 'dueDate'],
      example: {
        id: 'task_123',
        projectId: 'proj_123',
        title: 'Example Task',
        description: 'Task description',
        status: 'todo',
        priority: 'medium',
        assignee: 'user@example.com',
        dueDate: '2024-06-30',
      },
    },
    users: {
      name: 'User Template',
      fields: ['email', 'name', 'role'],
      example: {
        email: 'user@example.com',
        name: 'John Doe',
        role: 'member',
      },
    },
  };
}


