/**
 * Get Tasks Controller Tests
 * Unit tests for retrieving tasks
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HTTPException } from 'hono/http-exception';
import { createMockDb, mockProjects, mockTasks, resetMockDb } from '../../../tests/helpers/test-database';

// Mock dependencies
vi.mock('../../../database/connection', () => ({
  getDatabase: vi.fn(() => mockDb),
}));

const mockDb = createMockDb();

// Import after mocking
const getTasks = (await import('../get-tasks')).default;

describe('GetTasks Controller', () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
  });

  describe('Successful task retrieval', () => {
    it('should return tasks for a valid project', async () => {
      // Arrange
      const projectId = 'project-1';

      mockDb.query.projectTable.findFirst.mockResolvedValue(mockProjects.activeProject);
      
      // Mock select() calls in order: 1st returns tasks, 2nd returns users
      const tasksData = [
        { ...mockTasks.openTask, status: 'planned', userEmail: 'test@example.com' },
        {
          ...mockTasks.openTask,
          id: 'task-2',
          title: 'Second Task',
          status: 'planned',
          userEmail: 'test@example.com',
        },
      ];
      const usersData = [{ id: 'user-1', email: 'test@example.com', name: 'Test User' }];
      mockDb.__setSelectResults(tasksData, usersData);

      // Act
      const result = await getTasks(projectId);

      // Assert
      expect(result).toBeDefined();
      const allTasks = [...(result.archivedTasks || []), ...(result.plannedTasks || [])];
      expect(allTasks).toHaveLength(2);
      expect(allTasks[0].id).toBe('task-1');
      expect(allTasks[1].id).toBe('task-2');
    });

    it('should return empty array for project with no tasks', async () => {
      // Arrange
      const projectId = 'empty-project';

      mockDb.query.projectTable.findFirst.mockResolvedValue(mockProjects.activeProject);
      
      // Mock empty select results: no tasks, no users
      mockDb.__setSelectResults([], []);

      // Act
      const result = await getTasks(projectId);

      // Assert
      expect(result).toBeDefined();
      const allTasks = [...(result.archivedTasks || []), ...(result.plannedTasks || [])];
      expect(allTasks).toHaveLength(0);
    });

    it('should include status columns in response', async () => {
      // Arrange
      const projectId = 'project-1';

      mockDb.query.projectTable.findFirst.mockResolvedValue(mockProjects.activeProject);
      
      // Mock tasks and users
      mockDb.__setSelectResults([mockTasks.openTask], []);

      // Act
      const result = await getTasks(projectId);

      // Assert
      expect(result.columns).toBeDefined();
      expect(Array.isArray(result.columns)).toBe(true);
      expect(result.columns.length).toBeGreaterThan(0);
    });

    it('should return default status columns', async () => {
      // Arrange
      const projectId = 'project-1';

      mockDb.query.projectTable.findFirst.mockResolvedValue(mockProjects.activeProject);
      mockDb.__setSelectResults([], []);

      // Act
      const result = await getTasks(projectId);

      // Assert
      expect(result.columns).toContainEqual(
        expect.objectContaining({
          id: 'to-do',
          name: 'To Do',
          isDefault: true,
        })
      );
      expect(result.columns).toContainEqual(
        expect.objectContaining({
          id: 'in-progress',
          name: 'In Progress',
          isDefault: true,
        })
      );
      expect(result.columns).toContainEqual(
        expect.objectContaining({
          id: 'done',
          name: 'Done',
          isDefault: true,
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should throw 404 error for non-existent project', async () => {
      // Arrange
      const projectId = 'non-existent-project';

      mockDb.query.projectTable.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(getTasks(projectId)).rejects.toThrow(HTTPException);
      await expect(getTasks(projectId)).rejects.toThrow('Project not found');
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const projectId = 'project-1';

      mockDb.query.projectTable.findFirst.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(getTasks(projectId)).rejects.toThrow('Database connection failed');
    });

    it('should handle task query errors', async () => {
      // Arrange
      const projectId = 'project-1';

      mockDb.query.projectTable.findFirst.mockResolvedValue(mockProjects.activeProject);
      
      // Mock select() to throw error on the first call
      const originalSelect = mockDb.select;
      mockDb.select = vi.fn(() => {
        // Restore original after this call
        mockDb.select = originalSelect;
        throw new Error('Task query failed');
      });

      // Act & Assert
      await expect(getTasks(projectId)).rejects.toThrow('Task query failed');
    });
  });

  describe('Task grouping by status', () => {
    it('should group tasks by their status columns', async () => {
      // Arrange
      const projectId = 'project-1';

      mockDb.query.projectTable.findFirst.mockResolvedValue(mockProjects.activeProject);
      
      const tasksData = [
        { ...mockTasks.openTask, id: 'task-1', status: 'to-do' },
        { ...mockTasks.openTask, id: 'task-2', status: 'in-progress' },
        { ...mockTasks.openTask, id: 'task-3', status: 'done' },
      ];
      mockDb.__setSelectResults(tasksData, []);

      // Act
      const result = await getTasks(projectId);

      // Assert
      // Tasks are grouped into columns by status, not into archivedTasks/plannedTasks
      expect(result.columns).toBeDefined();
      const todoColumn = result.columns.find((c: any) => c.id === 'to-do');
      const inProgressColumn = result.columns.find((c: any) => c.id === 'in-progress');
      const doneColumn = result.columns.find((c: any) => c.id === 'done');

      expect(todoColumn.tasks).toHaveLength(1);
      expect(inProgressColumn.tasks).toHaveLength(1);
      expect(doneColumn.tasks).toHaveLength(1);
    });
  });

  describe('Task ordering', () => {
    it('should return tasks in a consistent order', async () => {
      // Arrange
      const projectId = 'project-1';

      mockDb.query.projectTable.findFirst.mockResolvedValue(mockProjects.activeProject);
      
      const tasksData = [
        { ...mockTasks.openTask, id: 'task-3', number: 3, position: 2, status: 'planned' },
        { ...mockTasks.openTask, id: 'task-1', number: 1, position: 0, status: 'planned' },
        { ...mockTasks.openTask, id: 'task-2', number: 2, position: 1, status: 'planned' },
      ];
      mockDb.__setSelectResults(tasksData, []);

      // Act
      const result = await getTasks(projectId);

      // Assert
      const allTasks = [...(result.archivedTasks || []), ...(result.plannedTasks || [])];
      expect(allTasks).toHaveLength(3);
      // Verify tasks are sorted by position
      expect(allTasks[0].id).toBe('task-1');
      expect(allTasks[1].id).toBe('task-2');
      expect(allTasks[2].id).toBe('task-3');
    });
  });

  describe('Status column properties', () => {
    it('should include color for each status column', async () => {
      // Arrange
      const projectId = 'project-1';

      mockDb.query.projectTable.findFirst.mockResolvedValue(mockProjects.activeProject);
      mockDb.__setSelectResults([], []);

      // Act
      const result = await getTasks(projectId);

      // Assert
      result.columns.forEach((column: any) => {
        expect(column).toHaveProperty('color');
        expect(typeof column.color).toBe('string');
        expect(column.color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });

    it('should include position for each status column', async () => {
      // Arrange
      const projectId = 'project-1';

      mockDb.query.projectTable.findFirst.mockResolvedValue(mockProjects.activeProject);
      mockDb.__setSelectResults([], []);

      // Act
      const result = await getTasks(projectId);

      // Assert
      result.columns.forEach((column: any) => {
        expect(column).toHaveProperty('position');
        expect(typeof column.position).toBe('number');
      });
    });
  });
});

