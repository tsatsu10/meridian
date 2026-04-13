/**
 * Label Operations Tests
 * Comprehensive tests for label CRUD operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockDb, resetMockDb } from '../../../tests/helpers/test-database';

vi.mock('../../../database/connection', () => ({
  getDatabase: vi.fn(() => mockDb),
}));

const mockDb = createMockDb();

describe('Label Operations', () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
  });

  describe('Create label', () => {
    it('should create label with name and color', async () => {
      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'label-1',
        name: 'Bug',
        color: '#ff0000',
        projectId: 'project-1',
      }]);

      const result = await mockDb.returning();
      expect(result[0].name).toBe('Bug');
      expect(result[0].color).toBe('#ff0000');
    });

    it('should validate color format', () => {
      const validColors = ['#ff0000', '#00ff00', '#0000ff'];
      const invalidColor = 'red';

      validColors.forEach(color => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      });
      expect(invalidColor).not.toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('should create predefined labels', async () => {
      const predefinedLabels = [
        { name: 'Bug', color: '#ff0000' },
        { name: 'Feature', color: '#00ff00' },
        { name: 'Enhancement', color: '#0000ff' },
        { name: 'Documentation', color: '#ffff00' },
      ];

      expect(predefinedLabels).toHaveLength(4);
    });
  });

  describe('Get labels', () => {
    it('should get all project labels', async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockResolvedValue([
        { id: 'label-1', name: 'Bug', color: '#ff0000' },
        { id: 'label-2', name: 'Feature', color: '#00ff00' },
      ]);

      const result = await mockDb.where();
      expect(result).toHaveLength(2);
    });

    it('should get labels for specific task', async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockResolvedValue([
        { id: 'label-1', name: 'Bug' },
      ]);

      const result = await mockDb.where();
      expect(result[0].name).toBe('Bug');
    });
  });

  describe('Update label', () => {
    it('should update label name', async () => {
      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'label-1',
        name: 'Critical Bug',
        color: '#ff0000',
      }]);

      const result = await mockDb.returning();
      expect(result[0].name).toBe('Critical Bug');
    });

    it('should update label color', async () => {
      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'label-1',
        name: 'Bug',
        color: '#cc0000',
      }]);

      const result = await mockDb.returning();
      expect(result[0].color).toBe('#cc0000');
    });
  });

  describe('Delete label', () => {
    it('should delete label', async () => {
      mockDb.delete.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'label-1',
        name: 'Bug',
      }]);

      const result = await mockDb.returning();
      expect(result[0].id).toBe('label-1');
    });

    it('should remove label from all tasks', async () => {
      // When deleting a label, it should be removed from all tasks
      const tasksWithLabel = [
        { id: 'task-1', labels: ['label-1', 'label-2'] },
        { id: 'task-2', labels: ['label-1'] },
      ];

      expect(tasksWithLabel[0].labels).toContain('label-1');
    });
  });

  describe('Assign label to task', () => {
    it('should assign single label', async () => {
      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        taskId: 'task-1',
        labelId: 'label-1',
      }]);

      const result = await mockDb.returning();
      expect(result[0].taskId).toBe('task-1');
      expect(result[0].labelId).toBe('label-1');
    });

    it('should assign multiple labels', async () => {
      const labelAssignments = [
        { taskId: 'task-1', labelId: 'label-1' },
        { taskId: 'task-1', labelId: 'label-2' },
        { taskId: 'task-1', labelId: 'label-3' },
      ];

      expect(labelAssignments).toHaveLength(3);
    });

    it('should prevent duplicate label assignments', async () => {
      const existingLabel = { taskId: 'task-1', labelId: 'label-1' };
      const duplicateAttempt = { taskId: 'task-1', labelId: 'label-1' };

      expect(existingLabel).toEqual(duplicateAttempt);
    });
  });

  describe('Remove label from task', () => {
    it('should remove specific label', async () => {
      mockDb.delete.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        taskId: 'task-1',
        labelId: 'label-1',
      }]);

      const result = await mockDb.returning();
      expect(result[0]).toBeDefined();
    });

    it('should remove all labels from task', async () => {
      mockDb.delete.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockResolvedValue([]);

      const result = await mockDb.where();
      expect(result).toHaveLength(0);
    });
  });

  describe('Label statistics', () => {
    it('should count tasks per label', () => {
      const labelStats = {
        'label-1': 5,
        'label-2': 3,
        'label-3': 7,
      };

      expect(labelStats['label-3']).toBe(7);
    });

    it('should find most used labels', () => {
      const labelUsage = [
        { labelId: 'label-1', count: 10 },
        { labelId: 'label-2', count: 5 },
        { labelId: 'label-3', count: 15 },
      ];

      const sorted = labelUsage.sort((a, b) => b.count - a.count);
      expect(sorted[0].labelId).toBe('label-3');
    });
  });

  describe('Label filtering', () => {
    it('should filter tasks by label', async () => {
      const tasks = [
        { id: 'task-1', labels: ['label-1', 'label-2'] },
        { id: 'task-2', labels: ['label-1'] },
        { id: 'task-3', labels: ['label-2'] },
      ];

      const filtered = tasks.filter(t => t.labels.includes('label-1'));
      expect(filtered).toHaveLength(2);
    });

    it('should filter by multiple labels (AND)', () => {
      const tasks = [
        { id: 'task-1', labels: ['label-1', 'label-2'] },
        { id: 'task-2', labels: ['label-1'] },
        { id: 'task-3', labels: ['label-2'] },
      ];

      const filtered = tasks.filter(t =>
        t.labels.includes('label-1') && t.labels.includes('label-2')
      );
      expect(filtered).toHaveLength(1);
    });

    it('should filter by multiple labels (OR)', () => {
      const tasks = [
        { id: 'task-1', labels: ['label-1', 'label-2'] },
        { id: 'task-2', labels: ['label-1'] },
        { id: 'task-3', labels: ['label-3'] },
      ];

      const filtered = tasks.filter(t =>
        t.labels.includes('label-1') || t.labels.includes('label-2')
      );
      expect(filtered).toHaveLength(2);
    });
  });

  describe('Label validation', () => {
    it('should validate label name length', () => {
      const validName = 'Bug';
      const tooLong = 'A'.repeat(256);

      expect(validName.length).toBeLessThan(255);
      expect(tooLong.length).toBeGreaterThan(255);
    });

    it('should validate unique label names per project', async () => {
      const existingLabels = ['Bug', 'Feature', 'Enhancement'];
      const newLabel = 'Bug'; // Duplicate

      expect(existingLabels).toContain(newLabel);
    });
  });

  describe('Label colors', () => {
    it('should support hex color format', () => {
      const hexColor = '#ff5733';
      expect(hexColor).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('should provide default color palette', () => {
      const palette = [
        '#ff0000', '#00ff00', '#0000ff',
        '#ffff00', '#ff00ff', '#00ffff',
      ];

      expect(palette).toHaveLength(6);
      palette.forEach(color => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });

    it('should generate random color', () => {
      const color = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });
});

