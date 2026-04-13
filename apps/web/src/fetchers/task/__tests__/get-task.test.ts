import { describe, it, expect, beforeEach, vi } from 'vitest';
import getTask from '../get-task';

// Mock the client
vi.mock('@meridian/libs', () => ({
  client: {
    task: {
      ':id': {
        $get: vi.fn(),
      },
    },
  },
}));

import { client } from '@meridian/libs';

describe('getTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockTask = {
    id: 'task-123',
    title: 'Test Task',
    description: 'Test description',
    status: 'in-progress',
    priority: 'high',
    userEmail: 'user@example.com',
    projectId: 'project-123',
    dueDate: '2024-12-31T00:00:00.000Z',
    position: 1,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  };

  it('should fetch a task successfully', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTask,
    });

    (client.task[':id'].$get as any) = mockGet;

    const result = await getTask('task-123');

    expect(mockGet).toHaveBeenCalledWith({
      param: { id: 'task-123' },
    });

    expect(result).toEqual(mockTask);
  });

  it('should pass correct task ID in param', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTask,
    });

    (client.task[':id'].$get as any) = mockGet;

    await getTask('specific-task-id');

    expect(mockGet).toHaveBeenCalledWith({
      param: { id: 'specific-task-id' },
    });
  });

  it('should return task with all properties', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTask,
    });

    (client.task[':id'].$get as any) = mockGet;

    const result = await getTask('task-123');

    expect(result.id).toBe('task-123');
    expect(result.title).toBe('Test Task');
    expect(result.description).toBe('Test description');
    expect(result.status).toBe('in-progress');
    expect(result.priority).toBe('high');
    expect(result.userEmail).toBe('user@example.com');
    expect(result.projectId).toBe('project-123');
  });

  it('should throw error when task not found', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      ok: false,
      text: async () => 'Task not found',
    });

    (client.task[':id'].$get as any) = mockGet;

    await expect(
      getTask('nonexistent-task')
    ).rejects.toThrow('Task not found');
  });

  it('should handle permission errors', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      ok: false,
      text: async () => 'Permission denied: Cannot access this task',
    });

    (client.task[':id'].$get as any) = mockGet;

    await expect(
      getTask('task-123')
    ).rejects.toThrow('Permission denied: Cannot access this task');
  });

  it('should handle network errors', async () => {
    const mockGet = vi.fn().mockRejectedValue(new Error('Network error'));

    (client.task[':id'].$get as any) = mockGet;

    await expect(
      getTask('task-123')
    ).rejects.toThrow('Network error');
  });

  it('should fetch task with subtasks', async () => {
    const taskWithSubtasks = {
      ...mockTask,
      subtasks: [
        { id: 'subtask-1', title: 'Subtask 1' },
        { id: 'subtask-2', title: 'Subtask 2' },
      ],
    };

    const mockGet = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => taskWithSubtasks,
    });

    (client.task[':id'].$get as any) = mockGet;

    const result = await getTask('task-123');

    expect(result.subtasks).toHaveLength(2);
    expect(result.subtasks[0].id).toBe('subtask-1');
  });

  it('should fetch task with labels', async () => {
    const taskWithLabels = {
      ...mockTask,
      labels: [
        { id: 'label-1', name: 'Bug' },
        { id: 'label-2', name: 'Feature' },
      ],
    };

    const mockGet = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => taskWithLabels,
    });

    (client.task[':id'].$get as any) = mockGet;

    const result = await getTask('task-123');

    expect(result.labels).toHaveLength(2);
    expect(result.labels[0].name).toBe('Bug');
  });

  it('should fetch task with assignee details', async () => {
    const taskWithAssignee = {
      ...mockTask,
      assignee: {
        email: 'user@example.com',
        name: 'Test User',
        avatar: 'https://example.com/avatar.jpg',
      },
    };

    const mockGet = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => taskWithAssignee,
    });

    (client.task[':id'].$get as any) = mockGet;

    const result = await getTask('task-123');

    expect(result.assignee.email).toBe('user@example.com');
    expect(result.assignee.name).toBe('Test User');
  });

  it('should handle unauthorized access (401)', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      ok: false,
      text: async () => 'Unauthorized: Please log in',
    });

    (client.task[':id'].$get as any) = mockGet;

    await expect(
      getTask('task-123')
    ).rejects.toThrow('Unauthorized: Please log in');
  });

  it('should handle server errors (500)', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      ok: false,
      text: async () => 'Internal server error',
    });

    (client.task[':id'].$get as any) = mockGet;

    await expect(
      getTask('task-123')
    ).rejects.toThrow('Internal server error');
  });

  it('should be called only once per fetch', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTask,
    });

    (client.task[':id'].$get as any) = mockGet;

    await getTask('task-123');

    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('should fetch task with parent task reference', async () => {
    const taskWithParent = {
      ...mockTask,
      parentId: 'parent-task-123',
      parentTask: {
        id: 'parent-task-123',
        title: 'Parent Task',
      },
    };

    const mockGet = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => taskWithParent,
    });

    (client.task[':id'].$get as any) = mockGet;

    const result = await getTask('task-123');

    expect(result.parentId).toBe('parent-task-123');
    expect(result.parentTask.title).toBe('Parent Task');
  });

  it('should handle empty task ID', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      ok: false,
      text: async () => 'Invalid task ID',
    });

    (client.task[':id'].$get as any) = mockGet;

    await expect(
      getTask('')
    ).rejects.toThrow('Invalid task ID');
  });
});
