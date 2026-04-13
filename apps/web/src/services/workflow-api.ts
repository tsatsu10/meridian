import { api } from '@/lib/fetch';

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  triggers: WorkflowTrigger[];
  actions: WorkflowAction[];
  executions?: WorkflowExecution[];
}

export interface WorkflowTriggerConditions {
  projectId?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  taskStatus?: string;
  requiresQA?: boolean;
  [key: string]: string | boolean | number | undefined;
}

export interface WorkflowTrigger {
  id: string;
  workflowId: string;
  type: 'task_created' | 'task_updated' | 'task_completed' | 'milestone_reached' | 'schedule';
  conditions?: WorkflowTriggerConditions;
  schedule?: string; // cron expression
  createdAt: string;
}

export interface WorkflowActionParameters {
  // Notification parameters
  title?: string;
  message?: string;
  recipients?: string[];
  priority?: 'low' | 'medium' | 'high';
  
  // Task parameters
  taskId?: string;
  projectId?: string;
  assigneeId?: string;
  description?: string;
  dueDate?: string;
  updates?: {
    status?: string;
    assigneeId?: string;
    priority?: string;
    [key: string]: string | undefined;
  };
  
  // Email parameters
  subject?: string;
  body?: string;
  attachments?: string[];
  
  // Webhook parameters
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  payload?: unknown;
  headers?: Record<string, string>;
  
  [key: string]: unknown;
}

export interface WorkflowAction {
  id: string;
  workflowId: string;
  type: 'send_notification' | 'create_task' | 'update_task' | 'send_email' | 'webhook' | 'create_milestone';
  parameters: WorkflowActionParameters;
  order: number;
  createdAt: string;
}

export interface WorkflowExecutionContext {
  userId?: string;
  projectId?: string;
  workspaceId?: string;
  nextAvailableUser?: string;
  qaLead?: string;
  reviewDeadline?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface WorkflowExecutionResult {
  actionId: string;
  actionType: string;
  success: boolean;
  data?: unknown;
  error?: string;
  executedAt: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed';
  triggerData?: Record<string, unknown>;
  context?: WorkflowExecutionContext;
  results?: WorkflowExecutionResult[];
  error?: string;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  isActive?: boolean;
  triggers: {
    type: WorkflowTrigger['type'];
    conditions?: WorkflowTriggerConditions;
    schedule?: string;
  }[];
  actions: {
    type: WorkflowAction['type'];
    parameters: WorkflowActionParameters;
  }[];
}

export interface ExecuteWorkflowRequest {
  workflowId: string;
  triggerData: Record<string, unknown>;
  context?: WorkflowExecutionContext;
}

export class WorkflowAPI {
  // Create a new workflow
  static async createWorkflow(data: CreateWorkflowRequest): Promise<{ success: boolean; workflow: Workflow }> {
    const response = await api.post('/workflow/api/workflows', data);
    return response.json();
  }

  // Get all workflows
  static async getWorkflows(): Promise<{ success: boolean; workflows: Workflow[] }> {
    const response = await api.get('/workflow/api/workflows');
    return response.json();
  }

  // Execute a workflow
  static async executeWorkflow(data: ExecuteWorkflowRequest): Promise<{
    success: boolean;
    executionId: string;
    status: string;
    results: WorkflowExecutionResult[];
    error?: string;
  }> {
    const response = await api.post('/workflow/api/workflows/execute', data);
    return response.json();
  }

  // Get workflow execution history
  static async getWorkflowExecutions(workflowId: string): Promise<{
    success: boolean;
    executions: WorkflowExecution[];
  }> {
    const response = await api.get(`/workflow/api/workflows/${workflowId}/executions`);
    return response.json();
  }

  // Delete a workflow
  static async deleteWorkflow(workflowId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/workflow/api/workflows/${workflowId}`);
    return response.json();
  }

  // Predefined workflow templates
  static getWorkflowTemplates() {
    return [
      {
        id: 'task-auto-assign',
        name: 'Auto-Assign New Tasks',
        description: 'Automatically assign new tasks to team members based on workload',
        triggers: [
          {
            type: 'task_created' as const,
            conditions: { projectId: '{{projectId}}' }
          }
        ],
        actions: [
          {
            type: 'update_task' as const,
            parameters: {
              taskId: '{{triggerData.taskId}}',
              updates: { assigneeId: '{{context.nextAvailableUser}}' }
            }
          },
          {
            type: 'send_notification' as const,
            parameters: {
              title: 'New Task Assigned',
              message: 'You have been assigned a new task: {{triggerData.taskTitle}}',
              recipients: ['{{context.nextAvailableUser}}']
            }
          }
        ]
      },
      {
        id: 'milestone-celebration',
        name: 'Milestone Achievement Celebration',
        description: 'Send congratulations when milestones are completed',
        triggers: [
          {
            type: 'milestone_reached' as const,
            conditions: { status: 'completed' }
          }
        ],
        actions: [
          {
            type: 'send_notification' as const,
            parameters: {
              title: '🎉 Milestone Achieved!',
              message: 'Congratulations! The milestone "{{triggerData.milestoneTitle}}" has been completed.',
              recipients: ['{{triggerData.projectTeam}}'],
              priority: 'high'
            }
          },
          {
            type: 'send_email' as const,
            parameters: {
              recipients: ['{{triggerData.stakeholders}}'],
              subject: 'Project Milestone Completed - {{triggerData.milestoneTitle}}',
              body: 'We are pleased to announce that the milestone "{{triggerData.milestoneTitle}}" has been successfully completed on {{triggerData.completionDate}}.'
            }
          }
        ]
      },
      {
        id: 'overdue-task-escalation',
        name: 'Overdue Task Escalation',
        description: 'Escalate overdue tasks to project managers',
        triggers: [
          {
            type: 'schedule' as const,
            schedule: '0 9 * * *', // Daily at 9 AM
            conditions: { taskStatus: 'overdue' }
          }
        ],
        actions: [
          {
            type: 'send_notification' as const,
            parameters: {
              title: '⚠️ Overdue Tasks Alert',
              message: 'You have {{triggerData.overdueCount}} overdue tasks that need attention.',
              recipients: ['{{triggerData.taskAssignees}}'],
              priority: 'high'
            }
          },
          {
            type: 'send_notification' as const,
            parameters: {
              title: 'Team Overdue Tasks Report',
              message: 'There are {{triggerData.overdueCount}} overdue tasks in your project that may need escalation.',
              recipients: ['{{triggerData.projectManagers}}'],
              priority: 'medium'
            }
          }
        ]
      },
      {
        id: 'quality-check-automation',
        name: 'Automated Quality Check',
        description: 'Automatically create quality check tasks when tasks are completed',
        triggers: [
          {
            type: 'task_completed' as const,
            conditions: { priority: 'high', requiresQA: true }
          }
        ],
        actions: [
          {
            type: 'create_task' as const,
            parameters: {
              title: 'Quality Review: {{triggerData.taskTitle}}',
              description: 'Review the completed task "{{triggerData.taskTitle}}" for quality assurance.',
              projectId: '{{triggerData.projectId}}',
              assigneeId: '{{context.qaLead}}',
              priority: 'high',
              dueDate: '{{context.reviewDeadline}}'
            }
          },
          {
            type: 'send_notification' as const,
            parameters: {
              title: 'QA Review Required',
              message: 'A high-priority task has been completed and requires quality review.',
              recipients: ['{{context.qaLead}}']
            }
          }
        ]
      }
    ];
  }

  // Get workflow template by ID
  static getWorkflowTemplate(templateId: string) {
    return this.getWorkflowTemplates().find(template => template.id === templateId);
  }

  // Create workflow from template
  static async createWorkflowFromTemplate(
    templateId: string, 
    customization: {
      name?: string;
      description?: string;
      projectId?: string;
      [key: string]: any;
    }
  ): Promise<{ success: boolean; workflow: Workflow }> {
    const template = this.getWorkflowTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const workflowData: CreateWorkflowRequest = {
      name: customization.name || template.name,
      description: customization.description || template.description,
      isActive: true,
      triggers: template.triggers.map(trigger => ({
        ...trigger,
        conditions: this.processTemplateVariables(trigger.conditions || {}, customization)
      })),
      actions: template.actions.map(action => ({
        ...action,
        parameters: this.processTemplateVariables(action.parameters, customization)
      }))
    };

    return this.createWorkflow(workflowData);
  }

  // Process template variables
  private static processTemplateVariables(obj: unknown, variables: Record<string, unknown>): unknown {
    if (typeof obj === 'string') {
      return obj.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        const value = variables[key];
        return value !== undefined ? String(value) : match;
      });
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.processTemplateVariables(item, variables));
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const processed: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        processed[key] = this.processTemplateVariables(value, variables);
      }
      return processed;
    }
    
    return obj;
  }
}

export default WorkflowAPI;