/**
 * Task Lifecycle Integration Tests
 * End-to-end tests for complete task workflows
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockDb, mockProjects, mockTasks, resetMockDb } from '../../tests/helpers/test-database';
import createTask from '../../task/controllers/create-task';
import getTasks from '../../task/controllers/get-tasks';
import updateTask from '../../task/controllers/update-task';
import deleteTask from '../../task/controllers/delete-task';

// Mock database
vi.mock('../../database/connection', () => ({
  getDatabase: vi.fn(() => mockDb),
}));

vi.mock('../../events', () => ({
  publishEvent: vi.fn(),
}));

vi.mock('../../task/controllers/get-next-task-number', () => ({
  default: vi.fn().mockImplementation((projectId) => {
    // Return incremental task numbers
    const counts: Record<string, number> = {};
    if (!counts[projectId]) counts[projectId] = 0;
    return Promise.resolve(++counts[projectId]);
  }),
}));

vi.mock('../../realtime/websocket-singleton', () => ({
  getWebSocketServer: vi.fn(() => null),
}));

const mockDb = createMockDb();

// Helper function to call updateTask with partial update object
// The actual updateTask requires all positional parameters, so we fetch the task first
// and merge updates with existing values
async function updateTaskPartial(id: string, updates: any) {
  const updateTask = (await import('../../task/controllers/update-task')).default;
  
  // Fetch existing task to get current values
  const existingTask = await mockDb.query.taskTable.findFirst({
    where: (taskTable: any, { eq }: any) => eq(taskTable.id, id),
  }) || {
    id,
    title: '',
    status: 'todo',
    dueDate: new Date(),
    projectId: '',
    description: '',
    priority: 'medium',
    position: 0,
  };

  // Merge updates with existing values
  return updateTask(
    id,
    updates.title ?? existingTask.title,
    updates.status ?? existingTask.status,
    updates.dueDate ?? existingTask.dueDate ?? new Date(),
    updates.projectId ?? existingTask.projectId,
    updates.description ?? existingTask.description ?? '',
    updates.priority ?? existingTask.priority ?? 'medium',
    updates.position ?? existingTask.position ?? 0,
    updates.userEmail,
    updates.parentId,
    updates.assignedTeamId,
  );
}

describe('Task Lifecycle Integration', () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
  });

  describe('Complete task workflow', () => {
    it('should create, retrieve, update, and delete a task', async () => {
      // Import controllers
      const createTask = (await import('../../task/controllers/create-task')).default;
      const getTasks = (await import('../../task/controllers/get-tasks')).default;
      const updateTask = (await import('../../task/controllers/update-task')).default;
      const deleteTask = (await import('../../task/controllers/delete-task')).default;

      const projectId = 'project-1';

      // Step 1: Create task
      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      const taskData = {
        id: 'new-task-1',
        projectId,
        title: 'New Feature',
        status: 'to-do', // Must match column id from DEFAULT_COLUMNS
        priority: 'high',
        number: 1, // getTasks expects 'number' not 'taskNumber'
        description: '',
        dueDate: new Date(),
        position: 0,
        userEmail: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDb.returning.mockResolvedValue([taskData]);

      const createdTask = await createTask({
        projectId,
        title: 'New Feature',
        status: 'to-do', // Must match column id from DEFAULT_COLUMNS
        priority: 'high',
      });

      expect(createdTask).toBeDefined();
      expect(createdTask.id).toBe('new-task-1');

      // Step 2: Retrieve tasks
      resetMockDb(mockDb); // Reset first

      // getTasks makes three queries:
      // 1. db.query.projectTable.findFirst() - get project
      // 2. db.select().from(taskTable).where(...) - get tasks
      // 3. db.select().from(userTable).where(...) - get users
      mockDb.query.projectTable.findFirst.mockResolvedValue(mockProjects.activeProject);
      
      // Setup mock for select() calls in getTasks
      // __setSelectResults takes variadic arguments, not an array
      mockDb.__setSelectResults(
        [taskData], // First select() - tasks from taskTable
        []          // Second select() - users (empty since no userEmail)
      );

      // Debug: Check what taskData looks like
      console.log('taskData being mocked:', JSON.stringify(taskData, null, 2));

      const tasks = await getTasks(projectId);

      // Debug: Let's see what we actually got
      console.log('Tasks result:', JSON.stringify(tasks, null, 2));
      console.log('Columns:', tasks.columns.map(c => ({ id: c.id, taskCount: c.tasks.length })));

      // getTasks returns {columns, archivedTasks, plannedTasks}
      // Tasks are organized by status in columns
      // Note: column id is 'to-do' not 'todo' (matches DEFAULT_COLUMNS in get-tasks.ts)
      const todoColumn = tasks.columns.find(col => col.id === 'to-do');
      expect(todoColumn).toBeDefined();
      expect(todoColumn?.tasks).toHaveLength(1);
      expect(todoColumn?.tasks[0].id).toBe('new-task-1');

      // Step 3: Update task status
      resetMockDb(mockDb);
      // Mock query for existing task lookup
      mockDb.query.taskTable.findFirst.mockResolvedValue({
        ...createdTask,
        dueDate: createdTask.dueDate || new Date(),
        description: createdTask.description || '',
        priority: createdTask.priority || 'medium',
        position: createdTask.position || 0,
      });

      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        ...createdTask,
        status: 'in-progress',
        dueDate: createdTask.dueDate || new Date(),
        description: createdTask.description || '',
        priority: createdTask.priority || 'medium',
        position: createdTask.position || 0,
      }]);

      const updatedTask = await updateTaskPartial('new-task-1', {
        status: 'in-progress',
        projectId,
        title: createdTask.title,
        dueDate: createdTask.dueDate || new Date(),
        description: createdTask.description || '',
        priority: createdTask.priority || 'medium',
        position: createdTask.position || 0,
      });

      expect(updatedTask.status).toBe('in-progress');

      // Step 4: Delete task
      resetMockDb(mockDb);
      // deleteTask uses db.delete().where().returning().execute()
      // So we need to mock the chain properly
      const deleteChain = {
        returning: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue([updatedTask]),
      };
      const deleteWithWhere = {
        where: vi.fn().mockReturnValue(deleteChain),
      };
      mockDb.delete.mockReturnValue(deleteWithWhere);

      const deletedTask = await deleteTask('new-task-1');

      // deleteTask now returns a single task object, not an array
      expect(deletedTask).toBeDefined();
      expect(deletedTask.id).toBe('new-task-1');
    });
  });

  describe('Task assignment workflow', () => {
    it('should assign task to user and reassign', async () => {
      // Import controller
      const createTask = (await import('../../task/controllers/create-task')).default;
      const updateTask = (await import('../../task/controllers/update-task')).default;

      const projectId = 'project-1';

      // Create unassigned task
      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'task-1',
        projectId,
        title: 'Unassigned Task',
        status: 'todo',
        assigneeId: null,
        taskNumber: 1,
      }]);

      const task = await createTask({
        projectId,
        title: 'Unassigned Task',
        status: 'todo',
      });

      expect(task.assigneeId).toBeNull();

      // Assign to user
      resetMockDb(mockDb);
      // Mock query for existing task lookup
      mockDb.query.taskTable.findFirst.mockResolvedValue({
        ...task,
        dueDate: new Date(),
        description: '',
        priority: 'medium',
        position: 0,
      });
      
      // Mock user lookup - need to properly chain select().from().where()
      const userLookupChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ id: 'user-1', email: 'user1@example.com' }]),
      };
      mockDb.select.mockReturnValue(userLookupChain);

      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        ...task,
        assigneeId: 'user-1',
        dueDate: new Date(),
        description: '',
        priority: 'medium',
        position: 0,
      }]);

      const assignedTask = await updateTaskPartial('task-1', {
        projectId,
        title: task.title,
        status: task.status,
        assigneeId: 'user-1',
        userEmail: 'user1@example.com',
      });

      expect(assignedTask.assigneeId).toBe('user-1');
    });
  });

  describe('Task priority workflow', () => {
    it('should escalate task priority', async () => {
      // Import controllers
      const createTask = (await import('../../task/controllers/create-task')).default;
      const updateTask = (await import('../../task/controllers/update-task')).default;

      const projectId = 'project-1';

      // Create low priority task
      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'task-1',
        projectId,
        title: 'Low Priority Task',
        status: 'todo',
        priority: 'low',
        taskNumber: 1,
      }]);

      const task = await createTask({
        projectId,
        title: 'Low Priority Task',
        status: 'todo',
        priority: 'low',
      });

      expect(task.priority).toBe('low');

      // Escalate to urgent
      resetMockDb(mockDb);
      mockDb.query.taskTable.findFirst.mockResolvedValue({
        ...task,
        dueDate: new Date(),
        description: '',
        priority: 'low',
        position: 0,
      });

      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        ...task,
        priority: 'urgent',
        dueDate: new Date(),
        description: '',
        position: 0,
      }]);

      const escalatedTask = await updateTaskPartial('task-1', {
        projectId,
        title: task.title,
        status: task.status,
        priority: 'urgent',
      });

      expect(escalatedTask.priority).toBe('urgent');
    });
  });

  describe('Task status progression', () => {
    it('should move task through status workflow', async () => {
      // Import controllers
      const createTask = (await import('../../task/controllers/create-task')).default;
      const updateTask = (await import('../../task/controllers/update-task')).default;

      const projectId = 'project-1';
      const statuses = ['todo', 'in-progress', 'in-review', 'done'];

      // Create task
      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'task-1',
        projectId,
        title: 'Progressive Task',
        status: 'todo',
        taskNumber: 1,
      }]);

      let currentTask = await createTask({
        projectId,
        title: 'Progressive Task',
        status: 'todo',
      });

      // Progress through statuses
      for (let i = 1; i < statuses.length; i++) {
        resetMockDb(mockDb);
        mockDb.query.taskTable.findFirst.mockResolvedValue({
          ...currentTask,
          dueDate: new Date(),
          description: '',
          priority: 'medium',
          position: 0,
        });

        mockDb.update.mockReturnThis();
        mockDb.set.mockReturnThis();
        mockDb.where.mockReturnThis();
        mockDb.returning.mockResolvedValue([{
          ...currentTask,
          status: statuses[i],
          dueDate: new Date(),
          description: '',
          priority: 'medium',
          position: 0,
        }]);

        currentTask = await updateTaskPartial('task-1', {
          projectId,
          title: currentTask.title,
          status: statuses[i],
        });

        expect(currentTask.status).toBe(statuses[i]);
      }
    });
  });

  describe('Subtask workflow', () => {
    it('should create parent task and subtasks', async () => {
      // Import controller
      const createTask = (await import('../../task/controllers/create-task')).default;

      const projectId = 'project-1';

      // Create parent task
      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'parent-task',
        projectId,
        title: 'Parent Task',
        status: 'todo',
        parentId: null,
        taskNumber: 1,
      }]);

      const parentTask = await createTask({
        projectId,
        title: 'Parent Task',
        status: 'todo',
      });

      expect(parentTask.parentId).toBeNull();

      // Create subtask 1
      resetMockDb(mockDb);
      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'subtask-1',
        projectId,
        title: 'Subtask 1',
        status: 'todo',
        parentId: 'parent-task',
        taskNumber: 2,
      }]);

      const subtask1 = await createTask({
        projectId,
        title: 'Subtask 1',
        status: 'todo',
        parentId: 'parent-task',
      });

      expect(subtask1.parentId).toBe('parent-task');

      // Create subtask 2
      resetMockDb(mockDb);
      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'subtask-2',
        projectId,
        title: 'Subtask 2',
        status: 'todo',
        parentId: 'parent-task',
        taskNumber: 3,
      }]);

      const subtask2 = await createTask({
        projectId,
        title: 'Subtask 2',
        status: 'todo',
        parentId: 'parent-task',
      });

      expect(subtask2.parentId).toBe('parent-task');
    });
  });

  describe('Event publishing workflow', () => {
    it('should publish events throughout task lifecycle', async () => {
      // Import controllers and events
      const createTask = (await import('../../task/controllers/create-task')).default;
      const updateTask = (await import('../../task/controllers/update-task')).default;
      const deleteTask = (await import('../../task/controllers/delete-task')).default;
      const { publishEvent } = await import('../../events');

      const projectId = 'project-1';

      // Create task - should publish task.created
      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'task-1',
        projectId,
        title: 'Event Task',
        status: 'todo',
        taskNumber: 1,
      }]);

      await createTask({
        projectId,
        title: 'Event Task',
        status: 'todo',
      });

      expect(publishEvent).toHaveBeenCalledWith('task.created', expect.any(Object));

      // Update task - should publish task.status_changed (not task.updated)
      resetMockDb(mockDb);
      vi.clearAllMocks();
      mockDb.query.taskTable.findFirst.mockResolvedValue({
        id: 'task-1',
        projectId,
        title: 'Event Task',
        status: 'todo',
        number: 1,
        dueDate: new Date(),
        description: '',
        priority: 'medium',
        position: 0,
        assigneeId: null,
      });

      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'task-1',
        projectId,
        title: 'Updated Event Task',
        status: 'in-progress',
        number: 1,
        dueDate: new Date(),
        description: '',
        priority: 'medium',
        position: 0,
        assigneeId: null,
      }]);

      await updateTaskPartial('task-1', {
        projectId,
        title: 'Updated Event Task',
        status: 'in-progress',
      });

      expect(publishEvent).toHaveBeenCalledWith('task.status_changed', expect.any(Object));

      // Delete task - should publish task.deleted
      resetMockDb(mockDb);
      vi.clearAllMocks();
      // deleteTask uses db.delete().where().returning().execute()
      const deleteChain = {
        returning: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue([{
          id: 'task-1',
        }]),
      };
      const deleteWithWhere = {
        where: vi.fn().mockReturnValue(deleteChain),
      };
      mockDb.delete.mockReturnValue(deleteWithWhere);

      await deleteTask('task-1');

      expect(publishEvent).toHaveBeenCalledWith('task.deleted', expect.any(Object));
    });
  });
});

