/**
 * Create Task Controller Tests
 * Unit tests for task creation functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HTTPException } from 'hono/http-exception';
import { createMockDb, mockUsers, mockProjects, resetMockDb } from '../../../tests/helpers/test-database';

// Mock dependencies
vi.mock('../../../database/connection', () => ({
  getDatabase: vi.fn(() => mockDb),
}));

vi.mock('../../../events', () => ({
  publishEvent: vi.fn(),
}));

vi.mock('../get-next-task-number', () => ({
  default: vi.fn().mockResolvedValue(1),
}));

const mockDb = createMockDb();

// Import after mocking
const createTask = (await import('../create-task')).default;

describe('CreateTask Controller', () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
  });

  describe('Successful task creation', () => {
    it('should create a task with minimal required fields', async () => {
      // Arrange
      const taskData = {
        projectId: 'project-1',
        title: 'New Task',
        status: 'todo',
      };

      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'task-1',
        ...taskData,
        taskNumber: 1,
        createdAt: new Date(),
      }]);

      // Act
      const result = await createTask(taskData);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('task-1');
      expect(result.title).toBe(taskData.title);
      expect(result.status).toBe(taskData.status);
    });

    it('should create a task with user assignment', async () => {
      // Arrange
      const taskData = {
        projectId: 'project-1',
        userEmail: 'test@example.com',
        title: 'Assigned Task',
        status: 'in-progress',
      };

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockResolvedValue([{
        id: 'user-1',
        name: 'Test User',
      }]);

      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'task-1',
        ...taskData,
        assigneeId: 'user-1',
        taskNumber: 1,
      }]);

      // Act
      const result = await createTask(taskData);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('task-1');
    });

    it('should create a task with team assignment', async () => {
      // Arrange
      const taskData = {
        projectId: 'project-1',
        assignedTeamId: 'team-1',
        title: 'Team Task',
        status: 'todo',
      };

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockResolvedValue([{
        name: 'Engineering Team',
      }]);

      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'task-1',
        ...taskData,
        taskNumber: 1,
      }]);

      // Act
      const result = await createTask(taskData);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('task-1');
    });

    it('should create a task with all optional fields', async () => {
      // Arrange
      const taskData = {
        projectId: 'project-1',
        title: 'Complex Task',
        status: 'in-progress',
        description: 'Detailed description',
        priority: 'high',
        dueDate: new Date('2025-12-31'),
        parentId: 'parent-task-1',
      };

      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'task-1',
        ...taskData,
        taskNumber: 1,
      }]);

      // Act
      const result = await createTask(taskData);

      // Assert
      expect(result).toBeDefined();
      expect(result.title).toBe(taskData.title);
      expect(result.description).toBe(taskData.description);
      expect(result.priority).toBe(taskData.priority);
    });
  });

  describe('Validation errors', () => {
    it('should throw error when assigning to both user and team', async () => {
      // Arrange
      const taskData = {
        projectId: 'project-1',
        userEmail: 'test@example.com',
        assignedTeamId: 'team-1',
        title: 'Invalid Task',
        status: 'todo',
      };

      // Act & Assert
      await expect(createTask(taskData)).rejects.toThrow(HTTPException);
      await expect(createTask(taskData)).rejects.toThrow('cannot be assigned to both');
    });
  });

  describe('Task numbering', () => {
    it('should assign incremental task numbers', async () => {
      // Arrange
      const getNextTaskNumber = (await import('../get-next-task-number')).default;
      vi.mocked(getNextTaskNumber).mockResolvedValueOnce(5);

      const taskData = {
        projectId: 'project-1',
        title: 'Task #5',
        status: 'todo',
      };

      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'task-1',
        ...taskData,
        taskNumber: 5,
      }]);

      // Act
      const result = await createTask(taskData);

      // Assert
      expect(result.taskNumber).toBe(5);
      expect(getNextTaskNumber).toHaveBeenCalledWith('project-1');
    });
  });

  describe('Event publishing', () => {
    it('should publish task.created event', async () => {
      // Arrange
      const { publishEvent } = await import('../../../events');
      const taskData = {
        projectId: 'project-1',
        title: 'Event Task',
        status: 'todo',
      };

      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'task-1',
        ...taskData,
        taskNumber: 1,
      }]);

      // Act
      await createTask(taskData);

      // Assert
      // createTask publishes activity object, not task object
      expect(publishEvent).toHaveBeenCalledWith(
        'task.created',
        expect.objectContaining({
          taskId: 'task-1',
          type: 'create',
          content: 'created the task',
        })
      );
    });
  });

  describe('Priority handling', () => {
    it('should accept valid priority values', async () => {
      // Arrange
      const priorities = ['low', 'medium', 'high', 'urgent'];

      for (const priority of priorities) {
        resetMockDb(mockDb);

        mockDb.insert.mockReturnThis();
        mockDb.values.mockReturnThis();
        mockDb.returning.mockResolvedValue([{
          id: `task-${priority}`,
          projectId: 'project-1',
          title: `Task with ${priority} priority`,
          status: 'todo',
          priority,
          taskNumber: 1,
        }]);

        // Act
        const result = await createTask({
          projectId: 'project-1',
          title: `Task with ${priority} priority`,
          status: 'todo',
          priority,
        });

        // Assert
        expect(result.priority).toBe(priority);
      }
    });
  });

  describe('Parent task handling', () => {
    it('should create subtask with parent reference', async () => {
      // Arrange
      const taskData = {
        projectId: 'project-1',
        title: 'Subtask',
        status: 'todo',
        parentId: 'parent-task-1',
      };

      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'subtask-1',
        ...taskData,
        taskNumber: 1,
      }]);

      // Act
      const result = await createTask(taskData);

      // Assert
      expect(result.parentId).toBe('parent-task-1');
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange
      const taskData = {
        projectId: 'project-1',
        title: 'Error Task',
        status: 'todo',
      };

      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(createTask(taskData)).rejects.toThrow('Database error');
    });

    it('should handle user lookup failures', async () => {
      // Arrange
      const taskData = {
        projectId: 'project-1',
        userEmail: 'nonexistent@example.com',
        title: 'Task',
        status: 'todo',
      };

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockResolvedValue([]); // User not found

      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'task-1',
        ...taskData,
        taskNumber: 1,
      }]);

      // Act - Should not throw, but assignee should be null
      const result = await createTask(taskData);

      // Assert
      expect(result).toBeDefined();
    });
  });
});

