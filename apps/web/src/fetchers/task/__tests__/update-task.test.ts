import { describe, it, expect, beforeEach, vi } from 'vitest';
import updateTask from '../update-task';
import type Task from '@/types/task';

// Mock the client
vi.mock('@meridian/libs', () => ({
  client: {
    task: {
      ':id': {
        $put: vi.fn(),
      },
    },
  },
}));

import { client } from '@meridian/libs';

describe('updateTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockTask: Task = {
    id: 'task-123',
    title: 'Updated Task',
    description: 'Updated description',
    status: 'in-progress',
    priority: 'high',
    userEmail: 'user@example.com',
    dueDate: new Date('2024-12-31'),
    position: 1,
    projectId: 'project-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('should update a task successfully', async () => {
    const mockResponse = { ...mockTask, updatedAt: new Date() };

    const mockPut = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    (client.task[':id'].$put as any) = mockPut;

    const result = await updateTask('task-123', mockTask);

    expect(mockPut).toHaveBeenCalledWith({
      param: { id: 'task-123' },
      json: {
        userEmail: 'user@example.com',
        title: 'Updated Task',
        description: 'Updated description',
        status: 'in-progress',
        priority: 'high',
        dueDate: mockTask.dueDate?.toString(),
        position: 1,
        projectId: 'project-123',
        parentId: undefined,
      },
    });

    expect(result).toEqual(mockResponse);
  });

  it('should handle task with parentId', async () => {
    const taskWithParent: Task = {
      ...mockTask,
      parentId: 'parent-task-123',
    };

    const mockPut = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => taskWithParent,
    });

    (client.task[':id'].$put as any) = mockPut;

    await updateTask('task-123', taskWithParent);

    expect(mockPut).toHaveBeenCalledWith(
      expect.objectContaining({
        json: expect.objectContaining({
          parentId: 'parent-task-123',
        }),
      })
    );
  });

  it('should handle missing optional fields with defaults', async () => {
    const minimalTask: Partial<Task> = {
      id: 'task-123',
      title: 'Minimal Task',
      status: 'todo',
      projectId: 'project-123',
    };

    const mockPut = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => minimalTask,
    });

    (client.task[':id'].$put as any) = mockPut;

    await updateTask('task-123', minimalTask as Task);

    const call = mockPut.mock.calls[0][0];
    expect(call.json.userEmail).toBe('');
    expect(call.json.description).toBe('');
    expect(call.json.priority).toBe('');
    expect(call.json.position).toBe(0);
    expect(call.json.parentId).toBeUndefined();
  });

  it('should use current date when dueDate is missing', async () => {
    const taskNoDueDate: Partial<Task> = {
      id: 'task-123',
      title: 'Task',
      status: 'todo',
      projectId: 'project-123',
    };

    const mockPut = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => taskNoDueDate,
    });

    (client.task[':id'].$put as any) = mockPut;

    await updateTask('task-123', taskNoDueDate as Task);

    const call = mockPut.mock.calls[0][0];
    expect(call.json.dueDate).toBeTruthy();
    expect(typeof call.json.dueDate).toBe('string');
  });

  it('should update task status', async () => {
    const taskNewStatus = { ...mockTask, status: 'done' };

    const mockPut = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => taskNewStatus,
    });

    (client.task[':id'].$put as any) = mockPut;

    await updateTask('task-123', taskNewStatus);

    expect(mockPut).toHaveBeenCalledWith(
      expect.objectContaining({
        json: expect.objectContaining({
          status: 'done',
        }),
      })
    );
  });

  it('should update task priority', async () => {
    const taskNewPriority = { ...mockTask, priority: 'urgent' };

    const mockPut = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => taskNewPriority,
    });

    (client.task[':id'].$put as any) = mockPut;

    await updateTask('task-123', taskNewPriority);

    expect(mockPut).toHaveBeenCalledWith(
      expect.objectContaining({
        json: expect.objectContaining({
          priority: 'urgent',
        }),
      })
    );
  });

  it('should update task position', async () => {
    const taskNewPosition = { ...mockTask, position: 5 };

    const mockPut = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => taskNewPosition,
    });

    (client.task[':id'].$put as any) = mockPut;

    await updateTask('task-123', taskNewPosition);

    expect(mockPut).toHaveBeenCalledWith(
      expect.objectContaining({
        json: expect.objectContaining({
          position: 5,
        }),
      })
    );
  });

  it('should throw error when response is not ok', async () => {
    const mockPut = vi.fn().mockResolvedValue({
      ok: false,
      text: async () => 'Task update failed: Task not found',
    });

    (client.task[':id'].$put as any) = mockPut;

    await expect(
      updateTask('invalid-task', mockTask)
    ).rejects.toThrow('Task update failed: Task not found');
  });

  it('should handle permission errors', async () => {
    const mockPut = vi.fn().mockResolvedValue({
      ok: false,
      text: async () => 'Permission denied',
    });

    (client.task[':id'].$put as any) = mockPut;

    await expect(
      updateTask('task-123', mockTask)
    ).rejects.toThrow('Permission denied');
  });

  it('should convert dueDate to string', async () => {
    const mockPut = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTask,
    });

    (client.task[':id'].$put as any) = mockPut;

    await updateTask('task-123', mockTask);

    const call = mockPut.mock.calls[0][0];
    expect(typeof call.json.dueDate).toBe('string');
  });

  it('should update assignee (userEmail)', async () => {
    const taskNewAssignee = { ...mockTask, userEmail: 'newuser@example.com' };

    const mockPut = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => taskNewAssignee,
    });

    (client.task[':id'].$put as any) = mockPut;

    await updateTask('task-123', taskNewAssignee);

    expect(mockPut).toHaveBeenCalledWith(
      expect.objectContaining({
        json: expect.objectContaining({
          userEmail: 'newuser@example.com',
        }),
      })
    );
  });

  it('should handle empty description', async () => {
    const taskNoDesc = { ...mockTask, description: '' };

    const mockPut = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => taskNoDesc,
    });

    (client.task[':id'].$put as any) = mockPut;

    await updateTask('task-123', taskNoDesc);

    expect(mockPut).toHaveBeenCalledWith(
      expect.objectContaining({
        json: expect.objectContaining({
          description: '',
        }),
      })
    );
  });

  it('should handle null/undefined userEmail with empty string', async () => {
    const taskNoUser = { ...mockTask, userEmail: undefined };

    const mockPut = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => taskNoUser,
    });

    (client.task[':id'].$put as any) = mockPut;

    await updateTask('task-123', taskNoUser as Task);

    const call = mockPut.mock.calls[0][0];
    expect(call.json.userEmail).toBe('');
  });

  it('should pass correct task ID in param', async () => {
    const mockPut = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTask,
    });

    (client.task[':id'].$put as any) = mockPut;

    await updateTask('specific-task-id', mockTask);

    expect(mockPut).toHaveBeenCalledWith(
      expect.objectContaining({
        param: { id: 'specific-task-id' },
      })
    );
  });
});
