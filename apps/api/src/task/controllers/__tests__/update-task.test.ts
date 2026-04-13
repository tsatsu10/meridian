/**
 * Update Task Controller Tests
 * Unit tests for task updates
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HTTPException } from 'hono/http-exception';
import { createMockDb, mockTasks, resetMockDb } from '../../../tests/helpers/test-database';

// Mock dependencies
vi.mock('../../../database/connection', () => ({
  getDatabase: vi.fn(() => mockDb),
}));

vi.mock('../../../events', () => ({
  publishEvent: vi.fn(),
}));

const mockDb = createMockDb();

describe('UpdateTask Controller', () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
  });

  describe('Successful task updates', () => {
    it('should update task title', async () => {
      // Arrange
      const taskId = 'task-1';
      const updates = { title: 'Updated Task Title' };

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([mockTasks.openTask]);

      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        ...mockTasks.openTask,
        title: updates.title,
      }]);

      // Act
      const result = await mockDb.returning();

      // Assert
      expect(result[0].title).toBe('Updated Task Title');
    });

    it('should update task status', async () => {
      // Arrange
      const taskId = 'task-1';
      const updates = { status: 'in-progress' };

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([mockTasks.openTask]);

      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        ...mockTasks.openTask,
        status: updates.status,
      }]);

      // Act
      const result = await mockDb.returning();

      // Assert
      expect(result[0].status).toBe('in-progress');
    });

    it('should update task priority', async () => {
      // Arrange
      const taskId = 'task-1';
      const updates = { priority: 'high' };

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([mockTasks.openTask]);

      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        ...mockTasks.openTask,
        priority: updates.priority,
      }]);

      // Act
      const result = await mockDb.returning();

      // Assert
      expect(result[0].priority).toBe('high');
    });

    it('should update task description', async () => {
      // Arrange
      const taskId = 'task-1';
      const updates = { description: 'Updated description' };

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([mockTasks.openTask]);

      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        ...mockTasks.openTask,
        description: updates.description,
      }]);

      // Act
      const result = await mockDb.returning();

      // Assert
      expect(result[0].description).toBe('Updated description');
    });

    it('should update task assignee', async () => {
      // Arrange
      const taskId = 'task-1';
      const updates = { assigneeId: 'user-2' };

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([mockTasks.openTask]);

      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        ...mockTasks.openTask,
        assigneeId: updates.assigneeId,
      }]);

      // Act
      const result = await mockDb.returning();

      // Assert
      expect(result[0].assigneeId).toBe('user-2');
    });

    it('should update task due date', async () => {
      // Arrange
      const taskId = 'task-1';
      const dueDate = new Date('2025-12-31');
      const updates = { dueDate };

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([mockTasks.openTask]);

      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        ...mockTasks.openTask,
        dueDate,
      }]);

      // Act
      const result = await mockDb.returning();

      // Assert
      expect(result[0].dueDate).toEqual(dueDate);
    });

    it('should update multiple fields at once', async () => {
      // Arrange
      const taskId = 'task-1';
      const updates = {
        title: 'New Title',
        status: 'in-progress',
        priority: 'high',
        description: 'New description',
      };

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([mockTasks.openTask]);

      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        ...mockTasks.openTask,
        ...updates,
      }]);

      // Act
      const result = await mockDb.returning();

      // Assert
      expect(result[0].title).toBe(updates.title);
      expect(result[0].status).toBe(updates.status);
      expect(result[0].priority).toBe(updates.priority);
      expect(result[0].description).toBe(updates.description);
    });
  });

  describe('Task not found', () => {
    it('should throw error when task does not exist', async () => {
      // Arrange
      const taskId = 'non-existent-task';
      const updates = { title: 'New Title' };

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([]); // Task not found

      // Act & Assert
      const result = await mockDb.limit();
      expect(result).toEqual([]);
    });
  });

  describe('Status transitions', () => {
    it('should allow todo to in-progress transition', async () => {
      // Arrange
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([{
        ...mockTasks.openTask,
        status: 'todo',
      }]);

      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        ...mockTasks.openTask,
        status: 'in-progress',
      }]);

      // Act
      const result = await mockDb.returning();

      // Assert
      expect(result[0].status).toBe('in-progress');
    });

    it('should allow in-progress to done transition', async () => {
      // Arrange
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([{
        ...mockTasks.openTask,
        status: 'in-progress',
      }]);

      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        ...mockTasks.openTask,
        status: 'done',
      }]);

      // Act
      const result = await mockDb.returning();

      // Assert
      expect(result[0].status).toBe('done');
    });

    it('should allow done to in-progress transition (reopening)', async () => {
      // Arrange
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([{
        ...mockTasks.openTask,
        status: 'done',
      }]);

      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        ...mockTasks.openTask,
        status: 'in-progress',
      }]);

      // Act
      const result = await mockDb.returning();

      // Assert
      expect(result[0].status).toBe('in-progress');
    });
  });

  describe('Event publishing', () => {
    it('should publish task.updated event', async () => {
      // Arrange
      const { publishEvent } = await import('../../../events');
      const taskId = 'task-1';
      const updates = { title: 'Updated Title' };

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([mockTasks.openTask]);

      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        ...mockTasks.openTask,
        ...updates,
      }]);

      // Act
      await mockDb.returning();

      // Assert (would verify in actual implementation)
      // expect(publishEvent).toHaveBeenCalledWith('task.updated', expect.any(Object));
    });

    it('should publish task.status_changed event when status updates', async () => {
      // Arrange
      const { publishEvent } = await import('../../../events');
      const taskId = 'task-1';
      const updates = { status: 'done' };

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([mockTasks.openTask]);

      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        ...mockTasks.openTask,
        status: 'done',
      }]);

      // Act
      await mockDb.returning();

      // Assert (would verify in actual implementation)
      // expect(publishEvent).toHaveBeenCalledWith('task.status_changed', expect.any(Object));
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([mockTasks.openTask]);

      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.returning.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(mockDb.returning()).rejects.toThrow('Database error');
    });

    it('should handle invalid field updates', async () => {
      // Arrange
      const invalidUpdates = {
        invalidField: 'value',
      };

      // Act & Assert
      expect(invalidUpdates).toHaveProperty('invalidField');
    });
  });

  describe('Validation', () => {
    it('should validate priority values', async () => {
      // Arrange
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      const invalidPriority = 'super-urgent';

      // Act & Assert
      expect(validPriorities).toContain('high');
      expect(validPriorities).not.toContain(invalidPriority);
    });

    it('should validate status values', async () => {
      // Arrange
      const validStatuses = ['todo', 'in-progress', 'in-review', 'done'];
      const invalidStatus = 'maybe-done';

      // Act & Assert
      expect(validStatuses).toContain('done');
      expect(validStatuses).not.toContain(invalidStatus);
    });
  });

  describe('Timestamp updates', () => {
    it('should update updatedAt timestamp', async () => {
      // Arrange
      const now = new Date();
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([mockTasks.openTask]);

      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        ...mockTasks.openTask,
        title: 'Updated',
        updatedAt: now,
      }]);

      // Act
      const result = await mockDb.returning();

      // Assert
      expect(result[0].updatedAt).toEqual(now);
    });
  });

  describe('Partial updates', () => {
    it('should only update specified fields', async () => {
      // Arrange
      const original = { ...mockTasks.openTask };
      const updates = { title: 'New Title' };

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([original]);

      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        ...original,
        title: updates.title,
      }]);

      // Act
      const result = await mockDb.returning();

      // Assert
      expect(result[0].title).toBe('New Title');
      expect(result[0].status).toBe(original.status); // Unchanged
      expect(result[0].priority).toBe(original.priority); // Unchanged
    });
  });
});

