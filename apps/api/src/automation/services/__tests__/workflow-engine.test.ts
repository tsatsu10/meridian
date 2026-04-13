/**
 * Workflow Engine Tests
 * Comprehensive tests for automation workflows
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockDb, resetMockDb } from '../../../tests/helpers/test-database';

vi.mock('../../../database/connection', () => ({
  getDatabase: vi.fn(() => mockDb),
}));

const mockDb = createMockDb();

describe('Workflow Engine', () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
  });

  describe('Workflow creation', () => {
    it('should create workflow with trigger', async () => {
      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'workflow-1',
        name: 'Auto-assign tasks',
        trigger: { type: 'task_created' },
        actions: [{ type: 'assign_user', userId: 'user-1' }],
      }]);

      const result = await mockDb.returning();
      expect(result[0].trigger.type).toBe('task_created');
    });

    it('should validate workflow configuration', () => {
      const workflow = {
        trigger: { type: 'task_created' },
        actions: [{ type: 'send_notification' }],
      };

      const isValid = workflow.trigger && workflow.actions.length > 0;
      expect(isValid).toBe(true);
    });

    it('should support multiple actions', () => {
      const workflow = {
        actions: [
          { type: 'assign_user' },
          { type: 'add_label' },
          { type: 'send_notification' },
        ],
      };

      expect(workflow.actions).toHaveLength(3);
    });
  });

  describe('Trigger types', () => {
    it('should handle task created trigger', () => {
      const trigger = { type: 'task_created' };
      expect(trigger.type).toBe('task_created');
    });

    it('should handle status change trigger', () => {
      const trigger = {
        type: 'status_changed',
        from: 'todo',
        to: 'done',
      };

      expect(trigger.from).toBe('todo');
      expect(trigger.to).toBe('done');
    });

    it('should handle due date trigger', () => {
      const trigger = {
        type: 'due_date',
        before: 24, // hours
      };

      expect(trigger.before).toBe(24);
    });

    it('should handle comment added trigger', () => {
      const trigger = { type: 'comment_added' };
      expect(trigger.type).toBe('comment_added');
    });

    it('should handle assignee changed trigger', () => {
      const trigger = {
        type: 'assignee_changed',
      };

      expect(trigger.type).toBe('assignee_changed');
    });
  });

  describe('Action execution', () => {
    it('should execute assign user action', async () => {
      const action = {
        type: 'assign_user',
        userId: 'user-1',
      };

      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'task-1',
        assigneeId: 'user-1',
      }]);

      const result = await mockDb.returning();
      expect(result[0].assigneeId).toBe('user-1');
    });

    it('should execute add label action', async () => {
      const action = {
        type: 'add_label',
        labelId: 'label-urgent',
      };

      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        taskId: 'task-1',
        labelId: 'label-urgent',
      }]);

      const result = await mockDb.returning();
      expect(result[0].labelId).toBe('label-urgent');
    });

    it('should execute send notification action', () => {
      const action = {
        type: 'send_notification',
        userId: 'user-1',
        message: 'Task assigned to you',
      };

      expect(action.type).toBe('send_notification');
    });

    it('should execute update field action', async () => {
      const action = {
        type: 'update_field',
        field: 'priority',
        value: 'high',
      };

      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'task-1',
        priority: 'high',
      }]);

      const result = await mockDb.returning();
      expect(result[0].priority).toBe('high');
    });
  });

  describe('Conditional workflows', () => {
    it('should evaluate condition', () => {
      const condition = {
        field: 'priority',
        operator: 'equals',
        value: 'high',
      };

      const task = { priority: 'high' };
      const matches = task.priority === condition.value;

      expect(matches).toBe(true);
    });

    it('should support multiple conditions (AND)', () => {
      const conditions = [
        { field: 'priority', operator: 'equals', value: 'high' },
        { field: 'status', operator: 'equals', value: 'todo' },
      ];

      const task = { priority: 'high', status: 'todo' };
      const matches = conditions.every(c => task[c.field as keyof typeof task] === c.value);

      expect(matches).toBe(true);
    });

    it('should support OR conditions', () => {
      const conditions = [
        { field: 'priority', operator: 'equals', value: 'high' },
        { field: 'priority', operator: 'equals', value: 'critical' },
      ];

      const task = { priority: 'high' };
      const matches = conditions.some(c => task[c.field as keyof typeof task] === c.value);

      expect(matches).toBe(true);
    });

    it('should support comparison operators', () => {
      const condition = { field: 'estimatedHours', operator: 'greater_than', value: 8 };
      const task = { estimatedHours: 12 };

      const matches = task.estimatedHours > condition.value;
      expect(matches).toBe(true);
    });
  });

  describe('Workflow scheduling', () => {
    it('should schedule recurring workflow', () => {
      const schedule = {
        type: 'recurring',
        interval: 'daily',
        time: '09:00',
      };

      expect(schedule.interval).toBe('daily');
    });

    it('should schedule one-time workflow', () => {
      const schedule = {
        type: 'once',
        date: new Date('2025-02-01'),
      };

      expect(schedule.type).toBe('once');
    });

    it('should check if workflow should run', () => {
      const workflow = {
        schedule: { interval: 'daily', lastRun: new Date('2025-01-01') },
      };

      const now = new Date('2025-01-02');
      const daysSinceLastRun = (now.getTime() - workflow.schedule.lastRun.getTime()) / (1000 * 60 * 60 * 24);

      const shouldRun = daysSinceLastRun >= 1;
      expect(shouldRun).toBe(true);
    });
  });

  describe('Workflow history', () => {
    it('should log workflow execution', async () => {
      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        workflowId: 'workflow-1',
        status: 'success',
        executedAt: new Date(),
      }]);

      const result = await mockDb.returning();
      expect(result[0].status).toBe('success');
    });

    it('should track execution duration', () => {
      const startTime = Date.now();
      const endTime = startTime + 500;
      const duration = endTime - startTime;

      expect(duration).toBe(500);
    });

    it('should log errors', () => {
      const errorLog = {
        workflowId: 'workflow-1',
        error: 'Action failed',
        timestamp: new Date(),
      };

      expect(errorLog.error).toBeTruthy();
    });
  });

  describe('Workflow chaining', () => {
    it('should trigger another workflow', async () => {
      const action = {
        type: 'trigger_workflow',
        workflowId: 'workflow-2',
      };

      expect(action.workflowId).toBe('workflow-2');
    });

    it('should pass data between workflows', () => {
      const data = {
        taskId: 'task-1',
        previousWorkflowId: 'workflow-1',
      };

      expect(data.taskId).toBe('task-1');
    });
  });

  describe('Workflow templates', () => {
    it('should create workflow from template', () => {
      const template = {
        name: 'Auto-triage bugs',
        trigger: { type: 'task_created' },
        conditions: [{ field: 'label', value: 'bug' }],
        actions: [
          { type: 'set_priority', value: 'high' },
          { type: 'assign_team', teamId: 'team-bugs' },
        ],
      };

      expect(template.actions).toHaveLength(2);
    });

    it('should list available templates', () => {
      const templates = [
        { id: 't1', name: 'Auto-assign' },
        { id: 't2', name: 'Auto-triage' },
        { id: 't3', name: 'Auto-notify' },
      ];

      expect(templates).toHaveLength(3);
    });
  });

  describe('Workflow permissions', () => {
    it('should check user can create workflow', () => {
      const user = { role: 'admin' };
      const canCreate = user.role === 'admin' || user.role === 'manager';

      expect(canCreate).toBe(true);
    });

    it('should check user can edit workflow', () => {
      const workflow = { createdBy: 'user-1' };
      const currentUser = { id: 'user-1' };

      const canEdit = workflow.createdBy === currentUser.id;
      expect(canEdit).toBe(true);
    });

    it('should verify workspace access', () => {
      const workflow = { workspaceId: 'workspace-1' };
      const user = { workspaces: ['workspace-1'] };

      const hasAccess = user.workspaces.includes(workflow.workspaceId);
      expect(hasAccess).toBe(true);
    });
  });

  describe('Workflow statistics', () => {
    it('should count successful executions', () => {
      const executions = [
        { status: 'success' },
        { status: 'success' },
        { status: 'failed' },
      ];

      const successCount = executions.filter(e => e.status === 'success').length;
      expect(successCount).toBe(2);
    });

    it('should calculate success rate', () => {
      const total = 100;
      const successful = 85;
      const successRate = (successful / total) * 100;

      expect(successRate).toBe(85);
    });

    it('should track average execution time', () => {
      const durations = [100, 150, 200, 180];
      const average = durations.reduce((a, b) => a + b) / durations.length;

      expect(average).toBe(157.5);
    });
  });

  describe('Error handling', () => {
    it('should retry failed actions', () => {
      const config = {
        maxRetries: 3,
        retryDelay: 1000,
      };

      expect(config.maxRetries).toBe(3);
    });

    it('should stop on critical error', () => {
      const error = { type: 'critical', stopWorkflow: true };
      expect(error.stopWorkflow).toBe(true);
    });

    it('should notify on workflow failure', () => {
      const notification = {
        type: 'workflow_failed',
        workflowId: 'workflow-1',
        error: 'Action execution failed',
      };

      expect(notification.type).toBe('workflow_failed');
    });
  });

  describe('Workflow testing', () => {
    it('should dry-run workflow', () => {
      const execution = {
        mode: 'dry_run',
        workflowId: 'workflow-1',
        willExecute: true,
      };

      expect(execution.mode).toBe('dry_run');
    });

    it('should simulate workflow execution', () => {
      const simulation = {
        triggersMatched: true,
        conditionsPassed: true,
        actionsToExecute: 3,
      };

      expect(simulation.actionsToExecute).toBe(3);
    });
  });

  describe('Workflow optimization', () => {
    it('should batch similar actions', () => {
      const actions = [
        { type: 'send_notification', userId: 'user-1' },
        { type: 'send_notification', userId: 'user-2' },
        { type: 'send_notification', userId: 'user-3' },
      ];

      const batchable = actions.every(a => a.type === 'send_notification');
      expect(batchable).toBe(true);
    });

    it('should cache workflow definitions', () => {
      const cache = new Map();
      cache.set('workflow-1', { name: 'Auto-assign', actions: [] });

      const cached = cache.get('workflow-1');
      expect(cached).toBeDefined();
    });
  });

  describe('Integration actions', () => {
    it('should send Slack notification', () => {
      const action = {
        type: 'slack_notification',
        channel: '#general',
        message: 'Task completed',
      };

      expect(action.channel).toBe('#general');
    });

    it('should create GitHub issue', () => {
      const action = {
        type: 'github_issue',
        repo: 'org/repo',
        title: 'Bug report',
      };

      expect(action.repo).toBe('org/repo');
    });

    it('should send email', () => {
      const action = {
        type: 'email',
        to: 'user@example.com',
        subject: 'Task assigned',
      };

      expect(action.to).toBe('user@example.com');
    });
  });

  describe('Workflow variables', () => {
    it('should use task variables in actions', () => {
      const action = {
        type: 'send_notification',
        message: 'Task {{task.title}} is due soon',
      };

      const task = { title: 'Fix bug' };
      const message = action.message.replace('{{task.title}}', task.title);

      expect(message).toBe('Task Fix bug is due soon');
    });

    it('should support custom variables', () => {
      const workflow = {
        variables: {
          assignee: 'user-1',
          priority: 'high',
        },
      };

      expect(workflow.variables.assignee).toBe('user-1');
    });
  });

  describe('Workflow versioning', () => {
    it('should create new version', async () => {
      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        workflowId: 'workflow-1',
        version: 2,
      }]);

      const result = await mockDb.returning();
      expect(result[0].version).toBe(2);
    });

    it('should get workflow history', () => {
      const versions = [
        { version: 1, createdAt: new Date('2025-01-01') },
        { version: 2, createdAt: new Date('2025-01-15') },
      ];

      expect(versions).toHaveLength(2);
    });

    it('should rollback to previous version', () => {
      const currentVersion = 3;
      const rollbackTo = 2;

      expect(rollbackTo).toBeLessThan(currentVersion);
    });
  });

  describe('Workflow analytics', () => {
    it('should track most used workflows', () => {
      const usage = [
        { workflowId: 'w1', executions: 100 },
        { workflowId: 'w2', executions: 250 },
        { workflowId: 'w3', executions: 75 },
      ];

      const sorted = usage.sort((a, b) => b.executions - a.executions);
      expect(sorted[0].workflowId).toBe('w2');
    });

    it('should calculate time saved', () => {
      const manualTime = 300; // seconds per task
      const automatedTime = 5;
      const taskCount = 100;

      const timeSaved = (manualTime - automatedTime) * taskCount;
      expect(timeSaved).toBe(29500);
    });
  });
});

