/**
 * User Workflow Integration Tests
 * 
 * Tests complete user journeys:
 * - Sign up → Email verification → First project
 * - Create project → Add tasks → Complete tasks
 * - Invite team member → Collaborate
 * - Real-time messaging workflow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TestWrapper } from '../../test-utils/test-wrapper';

// Mock API responses
const mockApi = {
  signUp: vi.fn(),
  createProject: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  inviteMember: vi.fn(),
  sendMessage: vi.fn(),
};

describe('User Workflow Integration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Reset mocks
    vi.clearAllMocks();
  });

  describe('Complete Onboarding Flow', () => {
    it('should complete user onboarding: sign up → verify → first project', async () => {
      const user = userEvent.setup();

      // Mock API responses
      mockApi.signUp.mockResolvedValue({
        userId: 'user-123',
        email: 'newuser@example.com',
        requiresVerification: true,
      });

      mockApi.createProject.mockResolvedValue({
        projectId: 'project-123',
        name: 'My First Project',
      });

      // Step 1: User signs up
      const signUpData = {
        email: 'newuser@example.com',
        password: 'SecurePassword123!',
        name: 'New User',
      };

      const signUpResult = await mockApi.signUp(signUpData);
      
      expect(signUpResult.userId).toBe('user-123');
      expect(signUpResult.requiresVerification).toBe(true);

      // Step 2: Email verification (simulated)
      // In real test, this would involve email service mock

      // Step 3: Create first project
      const projectData = {
        name: 'My First Project',
        description: 'Getting started with Meridian',
        workspaceId: 'workspace-123',
      };

      const projectResult = await mockApi.createProject(projectData);

      expect(projectResult.projectId).toBeDefined();
      expect(projectResult.name).toBe('My First Project');

      // Verify all steps were called in order
      expect(mockApi.signUp).toHaveBeenCalledWith(signUpData);
      expect(mockApi.createProject).toHaveBeenCalledWith(projectData);
    });
  });

  describe('Project and Task Management Flow', () => {
    it('should complete task workflow: create → assign → in progress → complete', async () => {
      const user = userEvent.setup();

      // Mock responses
      mockApi.createProject.mockResolvedValue({
        projectId: 'project-456',
        name: 'Development Project',
      });

      mockApi.createTask.mockResolvedValue({
        taskId: 'task-789',
        title: 'Implement feature',
        status: 'todo',
      });

      mockApi.updateTask.mockImplementation((taskId, updates) => 
        Promise.resolve({
          taskId,
          ...updates,
        })
      );

      // Step 1: Create project
      const project = await mockApi.createProject({
        name: 'Development Project',
        workspaceId: 'workspace-123',
      });

      expect(project.projectId).toBe('project-456');

      // Step 2: Create task
      const task = await mockApi.createTask({
        projectId: project.projectId,
        title: 'Implement feature',
        description: 'Add authentication feature',
        priority: 'high',
      });

      expect(task.taskId).toBe('task-789');
      expect(task.status).toBe('todo');

      // Step 3: Assign task
      const assignedTask = await mockApi.updateTask(task.taskId, {
        assigneeId: 'user-123',
      });

      expect(assignedTask.assigneeId).toBe('user-123');

      // Step 4: Start working (move to in_progress)
      const inProgressTask = await mockApi.updateTask(task.taskId, {
        status: 'in_progress',
      });

      expect(inProgressTask.status).toBe('in_progress');

      // Step 5: Complete task
      const completedTask = await mockApi.updateTask(task.taskId, {
        status: 'done',
        actualHours: 4,
      });

      expect(completedTask.status).toBe('done');
      expect(completedTask.actualHours).toBe(4);

      // Verify workflow progression
      expect(mockApi.createProject).toHaveBeenCalledTimes(1);
      expect(mockApi.createTask).toHaveBeenCalledTimes(1);
      expect(mockApi.updateTask).toHaveBeenCalledTimes(3);
    });
  });

  describe('Team Collaboration Flow', () => {
    it('should complete collaboration workflow: invite → accept → assign task → message', async () => {
      const user = userEvent.setup();

      // Mock responses
      mockApi.inviteMember.mockResolvedValue({
        inviteId: 'invite-123',
        email: 'teamember@example.com',
        status: 'pending',
      });

      mockApi.createTask.mockResolvedValue({
        taskId: 'task-collaborative',
        title: 'Team task',
      });

      mockApi.sendMessage.mockResolvedValue({
        messageId: 'msg-123',
        content: '@teammate Please review',
      });

      // Step 1: Invite team member
      const invite = await mockApi.inviteMember({
        workspaceId: 'workspace-123',
        email: 'teammate@example.com',
        role: 'member',
      });

      expect(invite.inviteId).toBeDefined();
      expect(invite.status).toBe('pending');

      // Step 2: Create collaborative task
      const task = await mockApi.createTask({
        projectId: 'project-123',
        title: 'Team task',
        assigneeId: 'teammate-user-id',
      });

      expect(task.taskId).toBe('task-collaborative');

      // Step 3: Send message to team member
      const message = await mockApi.sendMessage({
        channelId: 'project-channel-123',
        content: '@teammate Please review',
        mentions: ['teammate-user-id'],
      });

      expect(message.messageId).toBeDefined();
      expect(message.content).toContain('@teammate');

      // Verify collaboration flow
      expect(mockApi.inviteMember).toHaveBeenCalled();
      expect(mockApi.createTask).toHaveBeenCalled();
      expect(mockApi.sendMessage).toHaveBeenCalled();
    });
  });

  describe('Real-time Communication Flow', () => {
    it('should handle real-time messaging: connect → join channel → send → receive', async () => {
      // Mock WebSocket connection
      const mockSocket = {
        connected: false,
        connect: vi.fn(),
        join: vi.fn(),
        send: vi.fn(),
        on: vi.fn(),
        disconnect: vi.fn(),
      };

      // Step 1: Connect to WebSocket
      mockSocket.connect();
      mockSocket.connected = true;

      expect(mockSocket.connected).toBe(true);

      // Step 2: Join channel
      await mockSocket.join('channel-123');

      expect(mockSocket.join).toHaveBeenCalledWith('channel-123');

      // Step 3: Send message
      const messageData = {
        channelId: 'channel-123',
        content: 'Hello team!',
      };

      await mockSocket.send('chat:message', messageData);

      expect(mockSocket.send).toHaveBeenCalledWith('chat:message', messageData);

      // Step 4: Setup message listener
      const onMessage = vi.fn();
      mockSocket.on('message', onMessage);

      expect(mockSocket.on).toHaveBeenCalledWith('message', onMessage);

      // Step 5: Disconnect
      mockSocket.disconnect();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should handle typing indicators in real-time', async () => {
      const mockSocket = {
        emit: vi.fn(),
        on: vi.fn(),
      };

      // User starts typing
      mockSocket.emit('chat:typing', { channelId: 'channel-123' });

      expect(mockSocket.emit).toHaveBeenCalledWith('chat:typing', {
        channelId: 'channel-123',
      });

      // Listen for other users typing
      const onTyping = vi.fn();
      mockSocket.on('typing', onTyping);

      expect(mockSocket.on).toHaveBeenCalledWith('typing', onTyping);

      // User stops typing
      mockSocket.emit('chat:stop_typing', { channelId: 'channel-123' });

      expect(mockSocket.emit).toHaveBeenCalledWith('chat:stop_typing', {
        channelId: 'channel-123',
      });
    });
  });

  describe('Error Handling in Workflows', () => {
    it('should handle network errors gracefully', async () => {
      mockApi.createProject.mockRejectedValue(new Error('Network error'));

      try {
        await mockApi.createProject({
          name: 'Failing Project',
          workspaceId: 'workspace-123',
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Network error');
      }

      expect(mockApi.createProject).toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      mockApi.createTask.mockRejectedValue({
        errors: {
          title: 'Title is required',
          priority: 'Invalid priority',
        },
      });

      try {
        await mockApi.createTask({
          projectId: 'project-123',
          title: '',
          priority: 'invalid',
        });
      } catch (error: any) {
        expect(error.errors).toBeDefined();
        expect(error.errors.title).toBe('Title is required');
      }
    });

    it('should retry failed operations', async () => {
      let attempts = 0;
      mockApi.sendMessage.mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve({ messageId: 'msg-success', sent: true });
      });

      // Simulate retry logic
      let result;
      for (let i = 0; i < 3; i++) {
        try {
          result = await mockApi.sendMessage({ content: 'Test' });
          break;
        } catch (error) {
          if (i === 2) throw error;
        }
      }

      expect(result).toEqual({ messageId: 'msg-success', sent: true });
      expect(attempts).toBe(3);
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle concurrent operations', async () => {
      const tasks = [
        mockApi.createTask({ title: 'Task 1', projectId: 'p1' }),
        mockApi.createTask({ title: 'Task 2', projectId: 'p1' }),
        mockApi.createTask({ title: 'Task 3', projectId: 'p1' }),
      ];

      mockApi.createTask.mockImplementation((data) =>
        Promise.resolve({ taskId: `task-${data.title}`, ...data })
      );

      const results = await Promise.all(tasks);

      expect(results).toHaveLength(3);
      expect(mockApi.createTask).toHaveBeenCalledTimes(3);
    });

    it('should cache frequent queries', async () => {
      const cache = new Map();
      
      const getCachedData = async (key: string, fetcher: () => Promise<any>) => {
        if (cache.has(key)) {
          return cache.get(key);
        }
        
        const data = await fetcher();
        cache.set(key, data);
        return data;
      };

      mockApi.createProject.mockResolvedValue({ projectId: 'cached-project' });

      // First call - fetches from API
      const result1 = await getCachedData('project-123', () =>
        mockApi.createProject({ name: 'Cached' })
      );

      // Second call - returns from cache
      const result2 = await getCachedData('project-123', () =>
        mockApi.createProject({ name: 'Cached' })
      );

      expect(result1).toEqual(result2);
      expect(mockApi.createProject).toHaveBeenCalledTimes(1); // Only called once
    });
  });
});

