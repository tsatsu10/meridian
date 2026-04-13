// Phase 1.1: Project Reference Extraction Utilities
// Extracts project, task, and milestone references from chat messages

import { TaskReference, ProjectReference, MilestoneReference } from '@/types/chat-context';

/**
 * Extract task references from message content
 * Patterns: #TASK-123, @task:task-id, "Task: Title", TASK-ABC-123
 */
export function extractTaskReferences(
  content: string,
  availableTasks: Array<{
    id: string;
    title: string;
    status: string;
    projectId: string;
    assigneeEmail?: string;
    dueDate?: string;
  }> = []
): TaskReference[] {
  const references: TaskReference[] = [];
  
  // Pattern 1: #TASK-123 format
  const taskIdPattern = /#TASK-([A-Z0-9-]+)/gi;
  let match;
  while ((match = taskIdPattern.exec(content)) !== null) {
    const taskId = match[1];
    const task = availableTasks.find(t => t.id.includes(taskId) || t.id === taskId);
    if (task) {
      references.push({
        id: task.id,
        title: task.title,
        status: task.status,
        projectId: task.projectId,
        assigneeEmail: task.assigneeEmail,
        dueDate: task.dueDate,
        matched: {
          type: 'id',
          text: match[0],
          position: match.index
        }
      });
    }
  }
  
  // Pattern 2: @task:task-id format
  const taskMentionPattern = /@task:([a-zA-Z0-9-_]+)/gi;
  while ((match = taskMentionPattern.exec(content)) !== null) {
    const taskId = match[1];
    const task = availableTasks.find(t => t.id === taskId);
    if (task) {
      references.push({
        id: task.id,
        title: task.title,
        status: task.status,
        projectId: task.projectId,
        assigneeEmail: task.assigneeEmail,
        dueDate: task.dueDate,
        matched: {
          type: 'mention',
          text: match[0],
          position: match.index
        }
      });
    }
  }
  
  // Pattern 3: Fuzzy title matching for task titles in quotes or after "Task:"
  const taskTitlePattern = /(?:Task:|")(.*?)(?:"|$|\n|\s{2,})/gi;
  while ((match = taskTitlePattern.exec(content)) !== null) {
    const titleText = match[1].trim();
    if (titleText.length > 5) { // Minimum length to avoid false positives
      const task = availableTasks.find(t => 
        t.title.toLowerCase().includes(titleText.toLowerCase()) ||
        titleText.toLowerCase().includes(t.title.toLowerCase())
      );
      if (task && !references.find(r => r.id === task.id)) {
        references.push({
          id: task.id,
          title: task.title,
          status: task.status,
          projectId: task.projectId,
          assigneeEmail: task.assigneeEmail,
          dueDate: task.dueDate,
          matched: {
            type: 'title',
            text: match[0],
            position: match.index
          }
        });
      }
    }
  }
  
  return references;
}

/**
 * Extract project references from message content
 * Patterns: #PROJECT-123, @project:project-id, "Project: Name"
 */
export function extractProjectReferences(
  content: string,
  availableProjects: Array<{
    id: string;
    name: string;
    status: string;
    workspaceId: string;
  }> = []
): ProjectReference[] {
  const references: ProjectReference[] = [];
  
  // Pattern 1: #PROJECT-123 format
  const projectIdPattern = /#PROJECT-([A-Z0-9-]+)/gi;
  let match;
  while ((match = projectIdPattern.exec(content)) !== null) {
    const projectId = match[1];
    const project = availableProjects.find(p => p.id.includes(projectId) || p.id === projectId);
    if (project) {
      references.push({
        id: project.id,
        name: project.name,
        status: project.status,
        workspaceId: project.workspaceId,
        matched: {
          type: 'id',
          text: match[0],
          position: match.index
        }
      });
    }
  }
  
  // Pattern 2: @project:project-id format
  const projectMentionPattern = /@project:([a-zA-Z0-9-_]+)/gi;
  while ((match = projectMentionPattern.exec(content)) !== null) {
    const projectId = match[1];
    const project = availableProjects.find(p => p.id === projectId);
    if (project) {
      references.push({
        id: project.id,
        name: project.name,
        status: project.status,
        workspaceId: project.workspaceId,
        matched: {
          type: 'mention',
          text: match[0],
          position: match.index
        }
      });
    }
  }
  
  // Pattern 3: Project name matching
  const projectNamePattern = /(?:Project:|")(.*?)(?:"|$|\n|\s{2,})/gi;
  while ((match = projectNamePattern.exec(content)) !== null) {
    const nameText = match[1].trim();
    if (nameText.length > 3) {
      const project = availableProjects.find(p => 
        p.name.toLowerCase().includes(nameText.toLowerCase()) ||
        nameText.toLowerCase().includes(p.name.toLowerCase())
      );
      if (project && !references.find(r => r.id === project.id)) {
        references.push({
          id: project.id,
          name: project.name,
          status: project.status,
          workspaceId: project.workspaceId,
          matched: {
            type: 'name',
            text: match[0],
            position: match.index
          }
        });
      }
    }
  }
  
  return references;
}

/**
 * Extract milestone references from message content
 * Patterns: #MILESTONE-123, @milestone:milestone-id, "Milestone: Title"
 */
export function extractMilestoneReferences(
  content: string,
  availableMilestones: Array<{
    id: string;
    title: string;
    status: 'upcoming' | 'achieved' | 'missed';
    projectId: string;
    dueDate: string;
  }> = []
): MilestoneReference[] {
  const references: MilestoneReference[] = [];
  
  // Pattern 1: #MILESTONE-123 format
  const milestoneIdPattern = /#MILESTONE-([A-Z0-9-]+)/gi;
  let match;
  while ((match = milestoneIdPattern.exec(content)) !== null) {
    const milestoneId = match[1];
    const milestone = availableMilestones.find(m => m.id.includes(milestoneId) || m.id === milestoneId);
    if (milestone) {
      references.push({
        id: milestone.id,
        title: milestone.title,
        status: milestone.status,
        projectId: milestone.projectId,
        dueDate: milestone.dueDate,
        matched: {
          type: 'id',
          text: match[0],
          position: match.index
        }
      });
    }
  }
  
  // Pattern 2: @milestone:milestone-id format
  const milestoneMentionPattern = /@milestone:([a-zA-Z0-9-_]+)/gi;
  while ((match = milestoneMentionPattern.exec(content)) !== null) {
    const milestoneId = match[1];
    const milestone = availableMilestones.find(m => m.id === milestoneId);
    if (milestone) {
      references.push({
        id: milestone.id,
        title: milestone.title,
        status: milestone.status,
        projectId: milestone.projectId,
        dueDate: milestone.dueDate,
        matched: {
          type: 'mention',
          text: match[0],
          position: match.index
        }
      });
    }
  }
  
  // Pattern 3: Milestone title matching
  const milestoneTitlePattern = /(?:Milestone:|")(.*?)(?:"|$|\n|\s{2,})/gi;
  while ((match = milestoneTitlePattern.exec(content)) !== null) {
    const titleText = match[1].trim();
    if (titleText.length > 5) {
      const milestone = availableMilestones.find(m => 
        m.title.toLowerCase().includes(titleText.toLowerCase()) ||
        titleText.toLowerCase().includes(m.title.toLowerCase())
      );
      if (milestone && !references.find(r => r.id === milestone.id)) {
        references.push({
          id: milestone.id,
          title: milestone.title,
          status: milestone.status,
          projectId: milestone.projectId,
          dueDate: milestone.dueDate,
          matched: {
            type: 'title',
            text: match[0],
            position: match.index
          }
        });
      }
    }
  }
  
  return references;
}

/**
 * Extract action items from message content
 * Patterns: TODO:, Action:, @username do something, [ ] checkbox items
 */
export function extractActionItems(content: string, availableUsers: string[] = []): Array<{
  id: string;
  text: string;
  assignee?: string;
  dueDate?: string;
  completed: boolean;
}> {
  const actionItems = [];
  
  // Pattern 1: TODO: format
  const todoPattern = /TODO:\s*(.+?)(?:\n|$)/gi;
  let match;
  while ((match = todoPattern.exec(content)) !== null) {
    actionItems.push({
      id: `todo-${Date.now()}-${Math.random()}`,
      text: match[1].trim(),
      completed: false
    });
  }
  
  // Pattern 2: Action: format with optional assignee
  const actionPattern = /Action:\s*(?:@(\w+))?\s*(.+?)(?:\n|$)/gi;
  while ((match = actionPattern.exec(content)) !== null) {
    const assignee = match[1];
    const text = match[2].trim();
    actionItems.push({
      id: `action-${Date.now()}-${Math.random()}`,
      text,
      assignee: assignee && availableUsers.includes(assignee) ? assignee : undefined,
      completed: false
    });
  }
  
  // Pattern 3: Checkbox items
  const checkboxPattern = /\[\s*([x ])\s*\]\s*(.+?)(?:\n|$)/gi;
  while ((match = checkboxPattern.exec(content)) !== null) {
    const completed = match[1].toLowerCase() === 'x';
    const text = match[2].trim();
    actionItems.push({
      id: `checkbox-${Date.now()}-${Math.random()}`,
      text,
      completed
    });
  }
  
  return actionItems;
}

/**
 * Enhanced message processor that combines all extractions
 */
export function enhanceMessageWithContext(
  content: string,
  context: {
    availableTasks?: any[];
    availableProjects?: any[];
    availableMilestones?: any[];
    availableUsers?: string[];
  } = {}
) {
  return {
    projectReferences: extractProjectReferences(content, context.availableProjects),
    taskReferences: extractTaskReferences(content, context.availableTasks),
    milestoneReferences: extractMilestoneReferences(content, context.availableMilestones),
    actionItems: extractActionItems(content, context.availableUsers),
  };
}