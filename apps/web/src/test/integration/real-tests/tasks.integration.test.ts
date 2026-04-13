/**
 * Real Task Management Integration Tests
 * Tests actual task CRUD operations against the running API
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { waitForServer, shouldSkipIntegrationTests, createTestUser, getTestConfig } from '../setup/test-server';

const SKIP_TESTS = shouldSkipIntegrationTests();

describe.skipIf(SKIP_TESTS)('Task Management Integration Tests (Real API)', () => {
  const config = getTestConfig();
  let authToken: string;
  let workspaceId: string;
  let projectId: string;
  let taskId: string;

  beforeAll(async () => {
    // Ensure server is running
    await waitForServer();

    // Create test user
    const result = await createTestUser(
      `task-test-${Date.now()}@example.com`,
      'TestPassword123!'
    );
    authToken = result.token;

    // Create test workspace
    const workspaceResponse = await fetch(`${config.apiUrl}/api/workspaces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: 'Test Workspace',
        slug: `test-workspace-${Date.now()}`,
      }),
    });

    const workspaceData = await workspaceResponse.json();
    workspaceId = workspaceData.workspace.id;

    // Create test project
    const projectResponse = await fetch(`${config.apiUrl}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: 'Test Project',
        workspaceId,
      }),
    });

    const projectData = await projectResponse.json();
    projectId = projectData.project.id;
  });

  describe('Create Task', () => {
    it('should create a new task', async () => {
      const response = await fetch(`${config.apiUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: 'Test Task',
          description: 'This is a test task',
          projectId,
          status: 'to-do',
          priority: 'medium',
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.task).toBeDefined();
      expect(data.task.title).toBe('Test Task');
      expect(data.task.projectId).toBe(projectId);

      taskId = data.task.id;
    });

    it('should validate required fields', async () => {
      const response = await fetch(`${config.apiUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          // Missing title
          projectId,
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should create task with custom fields', async () => {
      const response = await fetch(`${config.apiUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: 'Task with Custom Fields',
          projectId,
          status: 'to-do',
          priority: 'high',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          tags: ['urgent', 'feature'],
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.task.priority).toBe('high');
      expect(data.task.tags).toContain('urgent');
    });
  });

  describe('Read Tasks', () => {
    it('should get all tasks for a project', async () => {
      const response = await fetch(
        `${config.apiUrl}/api/projects/${projectId}/tasks`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data.tasks) || Array.isArray(data.columns)).toBe(true);
    });

    it('should get a specific task by ID', async () => {
      const response = await fetch(`${config.apiUrl}/api/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.task).toBeDefined();
      expect(data.task.id).toBe(taskId);
    });

    it('should filter tasks by status', async () => {
      const response = await fetch(
        `${config.apiUrl}/api/projects/${projectId}/tasks?status=to-do`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        }
      );

      expect(response.status).toBe(200);
    });
  });

  describe('Update Task', () => {
    it('should update task title', async () => {
      const newTitle = 'Updated Test Task';

      const response = await fetch(`${config.apiUrl}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: newTitle,
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.task.title).toBe(newTitle);
    });

    it('should update task status', async () => {
      const response = await fetch(`${config.apiUrl}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          status: 'in-progress',
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.task.status).toBe('in-progress');
    });

    it('should update task priority', async () => {
      const response = await fetch(`${config.apiUrl}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          priority: 'high',
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.task.priority).toBe('high');
    });
  });

  describe('Delete Task', () => {
    let deleteTaskId: string;

    beforeAll(async () => {
      // Create a task to delete
      const response = await fetch(`${config.apiUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: 'Task to Delete',
          projectId,
          status: 'to-do',
        }),
      });

      const data = await response.json();
      deleteTaskId = data.task.id;
    });

    it('should delete a task', async () => {
      const response = await fetch(`${config.apiUrl}/api/tasks/${deleteTaskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
    });

    it('should return 404 for deleted task', async () => {
      const response = await fetch(`${config.apiUrl}/api/tasks/${deleteTaskId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(404);
    });
  });

  describe('Task Dependencies', () => {
    let task1Id: string;
    let task2Id: string;

    beforeAll(async () => {
      // Create two tasks
      const response1 = await fetch(`${config.apiUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: 'Dependency Task 1',
          projectId,
          status: 'to-do',
        }),
      });

      const data1 = await response1.json();
      task1Id = data1.task.id;

      const response2 = await fetch(`${config.apiUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: 'Dependency Task 2',
          projectId,
          status: 'to-do',
        }),
      });

      const data2 = await response2.json();
      task2Id = data2.task.id;
    });

    it('should create task dependency', async () => {
      const response = await fetch(`${config.apiUrl}/api/tasks/${task2Id}/dependencies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          dependsOnTaskId: task1Id,
        }),
      });

      expect(response.status).toBe(200);
    });

    it('should get task dependencies', async () => {
      const response = await fetch(
        `${config.apiUrl}/api/tasks/${task2Id}/dependencies`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.dependencies).toBeDefined();
    });
  });
});
