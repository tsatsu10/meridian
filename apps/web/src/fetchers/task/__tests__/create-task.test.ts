import { describe, it, expect, beforeEach, vi } from 'vitest';
import createTask from '../create-task';

// Mock the client
vi.mock('@meridian/libs', () => ({
  client: {
    task: {
      ':projectId': {
        $post: vi.fn(),
      },
    },
  },
}));

import { client } from '@meridian/libs';

describe('createTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a task successfully', async () => {
    const mockResponse = {
      id: 'task-123',
      title: 'Test Task',
      description: 'Test Description',
      projectId: 'project-123',
      userEmail: 'test@example.com',
      status: 'todo',
      priority: 'medium',
      dueDate: '2024-12-31T00:00:00.000Z',
    };

    const mockPost = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    (client.task[':projectId'].$post as any) = mockPost;

    const dueDate = new Date('2024-12-31');
    const result = await createTask(
      'Test Task',
      'Test Description',
      'project-123',
      'test@example.com',
      'todo',
      dueDate,
      'medium'
    );

    expect(mockPost).toHaveBeenCalledWith({
      json: {
        title: 'Test Task',
        description: 'Test Description',
        userEmail: 'test@example.com',
        status: 'todo',
        dueDate: dueDate.toISOString(),
        priority: 'medium',
        parentId: undefined,
      },
      param: { projectId: 'project-123' },
    });

    expect(result).toEqual(mockResponse);
  });

  it('should create a subtask with parentId', async () => {
    const mockResponse = {
      id: 'task-456',
      title: 'Subtask',
      parentId: 'task-123',
    };

    const mockPost = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    (client.task[':projectId'].$post as any) = mockPost;

    const dueDate = new Date('2024-12-31');
    const result = await createTask(
      'Subtask',
      'Subtask Description',
      'project-123',
      'test@example.com',
      'todo',
      dueDate,
      'high',
      'task-123' // parentId
    );

    expect(mockPost).toHaveBeenCalledWith(
      expect.objectContaining({
        json: expect.objectContaining({
          parentId: 'task-123',
        }),
      })
    );

    expect(result.parentId).toBe('task-123');
  });

  it('should handle different priority levels', async () => {
    const mockPost = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'task-123' }),
    });

    (client.task[':projectId'].$post as any) = mockPost;

    const dueDate = new Date('2024-12-31');

    await createTask(
      'High Priority Task',
      'Description',
      'project-123',
      'test@example.com',
      'todo',
      dueDate,
      'high'
    );

    expect(mockPost).toHaveBeenCalledWith(
      expect.objectContaining({
        json: expect.objectContaining({
          priority: 'high',
        }),
      })
    );
  });

  it('should handle different status values', async () => {
    const mockPost = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'task-123' }),
    });

    (client.task[':projectId'].$post as any) = mockPost;

    const dueDate = new Date('2024-12-31');

    await createTask(
      'In Progress Task',
      'Description',
      'project-123',
      'test@example.com',
      'in-progress',
      dueDate,
      'medium'
    );

    expect(mockPost).toHaveBeenCalledWith(
      expect.objectContaining({
        json: expect.objectContaining({
          status: 'in-progress',
        }),
      })
    );
  });

  it('should convert Date to ISO string', async () => {
    const mockPost = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'task-123' }),
    });

    (client.task[':projectId'].$post as any) = mockPost;

    const dueDate = new Date('2024-06-15T10:30:00');

    await createTask(
      'Task',
      'Description',
      'project-123',
      'test@example.com',
      'todo',
      dueDate,
      'medium'
    );

    expect(mockPost).toHaveBeenCalledWith(
      expect.objectContaining({
        json: expect.objectContaining({
          dueDate: dueDate.toISOString(),
        }),
      })
    );
  });

  it('should throw error when response is not ok', async () => {
    const mockPost = vi.fn().mockResolvedValue({
      ok: false,
      text: async () => 'Task creation failed: Invalid project ID',
    });

    (client.task[':projectId'].$post as any) = mockPost;

    const dueDate = new Date('2024-12-31');

    await expect(
      createTask(
        'Test Task',
        'Description',
        'invalid-project',
        'test@example.com',
        'todo',
        dueDate,
        'medium'
      )
    ).rejects.toThrow('Task creation failed: Invalid project ID');
  });

  it('should include all required fields in request', async () => {
    const mockPost = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'task-123' }),
    });

    (client.task[':projectId'].$post as any) = mockPost;

    const dueDate = new Date('2024-12-31');

    await createTask(
      'Complete Task',
      'Full Description',
      'project-789',
      'user@meridian.app',
      'done',
      dueDate,
      'low'
    );

    expect(mockPost).toHaveBeenCalledWith({
      json: {
        title: 'Complete Task',
        description: 'Full Description',
        userEmail: 'user@meridian.app',
        status: 'done',
        dueDate: dueDate.toISOString(),
        priority: 'low',
        parentId: undefined,
      },
      param: { projectId: 'project-789' },
    });
  });

  it('should handle long descriptions', async () => {
    const longDescription = 'A'.repeat(1000);
    const mockPost = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'task-123', description: longDescription }),
    });

    (client.task[':projectId'].$post as any) = mockPost;

    const dueDate = new Date('2024-12-31');

    const result = await createTask(
      'Task',
      longDescription,
      'project-123',
      'test@example.com',
      'todo',
      dueDate,
      'medium'
    );

    expect(result.description).toBe(longDescription);
  });

  it('should handle special characters in title and description', async () => {
    const specialTitle = 'Task with "quotes" & <tags>';
    const specialDescription = "Description with 'single' and \"double\" quotes";

    const mockPost = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'task-123' }),
    });

    (client.task[':projectId'].$post as any) = mockPost;

    const dueDate = new Date('2024-12-31');

    await createTask(
      specialTitle,
      specialDescription,
      'project-123',
      'test@example.com',
      'todo',
      dueDate,
      'medium'
    );

    expect(mockPost).toHaveBeenCalledWith(
      expect.objectContaining({
        json: expect.objectContaining({
          title: specialTitle,
          description: specialDescription,
        }),
      })
    );
  });
});
