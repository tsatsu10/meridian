import { describe, it, expect, beforeEach, vi } from 'vitest';
import deleteTask from '../delete-task';

// Mock the client
vi.mock('@meridian/libs', () => ({
  client: {
    task: {
      ':id': {
        $delete: vi.fn(),
      },
    },
  },
}));

import { client } from '@meridian/libs';

describe('deleteTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete a task successfully', async () => {
    const mockResponse = { success: true, id: 'task-123' };

    const mockDelete = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    (client.task[':id'].$delete as any) = mockDelete;

    const result = await deleteTask('task-123');

    expect(mockDelete).toHaveBeenCalledWith({
      param: { id: 'task-123' },
    });

    expect(result).toEqual(mockResponse);
  });

  it('should pass correct task ID in param', async () => {
    const mockDelete = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    (client.task[':id'].$delete as any) = mockDelete;

    await deleteTask('specific-task-id');

    expect(mockDelete).toHaveBeenCalledWith({
      param: { id: 'specific-task-id' },
    });
  });

  it('should throw error when response is not ok', async () => {
    const mockDelete = vi.fn().mockResolvedValue({
      ok: false,
      text: async () => 'Task deletion failed: Task not found',
    });

    (client.task[':id'].$delete as any) = mockDelete;

    await expect(
      deleteTask('invalid-task')
    ).rejects.toThrow('Task deletion failed: Task not found');
  });

  it('should handle permission errors', async () => {
    const mockDelete = vi.fn().mockResolvedValue({
      ok: false,
      text: async () => 'Permission denied: Cannot delete task',
    });

    (client.task[':id'].$delete as any) = mockDelete;

    await expect(
      deleteTask('task-123')
    ).rejects.toThrow('Permission denied: Cannot delete task');
  });

  it('should handle network errors', async () => {
    const mockDelete = vi.fn().mockRejectedValue(new Error('Network error'));

    (client.task[':id'].$delete as any) = mockDelete;

    await expect(
      deleteTask('task-123')
    ).rejects.toThrow('Network error');
  });

  it('should return deletion response data', async () => {
    const mockResponse = {
      success: true,
      id: 'task-123',
      message: 'Task deleted successfully',
    };

    const mockDelete = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    (client.task[':id'].$delete as any) = mockDelete;

    const result = await deleteTask('task-123');

    expect(result.success).toBe(true);
    expect(result.id).toBe('task-123');
    expect(result.message).toBe('Task deleted successfully');
  });

  it('should handle deletion of task with subtasks', async () => {
    const mockResponse = {
      success: true,
      id: 'task-123',
      deletedSubtasks: ['subtask-1', 'subtask-2'],
    };

    const mockDelete = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    (client.task[':id'].$delete as any) = mockDelete;

    const result = await deleteTask('task-123');

    expect(result.deletedSubtasks).toHaveLength(2);
  });

  it('should handle empty task ID', async () => {
    const mockDelete = vi.fn().mockResolvedValue({
      ok: false,
      text: async () => 'Invalid task ID',
    });

    (client.task[':id'].$delete as any) = mockDelete;

    await expect(
      deleteTask('')
    ).rejects.toThrow('Invalid task ID');
  });

  it('should be called only once per deletion', async () => {
    const mockDelete = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    (client.task[':id'].$delete as any) = mockDelete;

    await deleteTask('task-123');

    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  it('should handle server errors (500)', async () => {
    const mockDelete = vi.fn().mockResolvedValue({
      ok: false,
      text: async () => 'Internal server error',
    });

    (client.task[':id'].$delete as any) = mockDelete;

    await expect(
      deleteTask('task-123')
    ).rejects.toThrow('Internal server error');
  });

  it('should handle task not found (404)', async () => {
    const mockDelete = vi.fn().mockResolvedValue({
      ok: false,
      text: async () => 'Task not found',
    });

    (client.task[':id'].$delete as any) = mockDelete;

    await expect(
      deleteTask('nonexistent-task')
    ).rejects.toThrow('Task not found');
  });

  it('should handle unauthorized deletion (401)', async () => {
    const mockDelete = vi.fn().mockResolvedValue({
      ok: false,
      text: async () => 'Unauthorized: Please log in',
    });

    (client.task[':id'].$delete as any) = mockDelete;

    await expect(
      deleteTask('task-123')
    ).rejects.toThrow('Unauthorized: Please log in');
  });
});
