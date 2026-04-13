import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { commonSchemas, userSchemas, projectSchemas, taskSchemas } from '../validation';
import { errorHandler } from '../errors';

describe('Validation Middleware', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.onError(errorHandler());
    vi.clearAllMocks();
  });

  describe('zValidator', () => {
    it('validates request body successfully', async () => {
      app.post('/users', zValidator('json', userSchemas.create), (c) => {
        const user = c.req.valid('json');
        return c.json({ success: true, user });
      });

      const res = await app.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
        }),
      });

      expect(res.status).toBe(200);
      const result = await res.json();
      expect(result.success).toBe(true);
      expect(result.user.email).toBe('test@example.com');
    });

    it('rejects invalid request body', async () => {
      app.post('/users', zValidator('json', userSchemas.create), (c) => c.json({ success: true }));

      const res = await app.request('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'weak',
          firstName: 'T',
          lastName: 'U',
        }),
      });

      expect(res.status).toBe(400);
      const result = await res.json();
      expect(result.success).toBe(false);
    });

    it('validates query parameters', async () => {
      app.get('/search', zValidator('query', commonSchemas.pagination), (c) => {
        const query = c.req.valid('query');
        return c.json({ success: true, query });
      });

      const res = await app.request('/search?page=2&limit=20');
      expect(res.status).toBe(200);
      const result = await res.json();
      expect(result.query.page).toBe(2);
      expect(result.query.limit).toBe(20);
    });
  });

  describe('Common Schemas', () => {
    describe('ID Validation', () => {
      it('validates UUID format', () => {
        const validId = '123e4567-e89b-12d3-a456-426614174000';
        const parsed = commonSchemas.id.safeParse(validId);
        expect(parsed.success).toBe(true);
      });

      it('validates slug-like ID format', () => {
        const validSlugId = 'valid-id_123';
        const parsed = commonSchemas.id.safeParse(validSlugId);
        expect(parsed.success).toBe(true);
      });

      it('rejects invalid ID format', () => {
        const invalidId = 'invalid@id#$%'; // Contains special chars not allowed
        const parsed = commonSchemas.id.safeParse(invalidId);
        expect(parsed.success).toBe(false);
      });
    });

    describe('Email Validation', () => {
      it('validates email format', () => {
        const validEmail = 'test@example.com';
        const parsed = commonSchemas.email.safeParse(validEmail);
        expect(parsed.success).toBe(true);
      });

      it('rejects invalid email format', () => {
        const invalidEmail = 'not-an-email';
        const parsed = commonSchemas.email.safeParse(invalidEmail);
        expect(parsed.success).toBe(false);
      });
    });

    describe('Password Validation', () => {
      it('validates strong passwords', () => {
        const strongPassword = 'StrongPassword123!';
        const parsed = commonSchemas.password.safeParse(strongPassword);
        expect(parsed.success).toBe(true);
      });

      it('rejects weak passwords', () => {
        const weakPassword = 'weak';
        const parsed = commonSchemas.password.safeParse(weakPassword);
        expect(parsed.success).toBe(false);
      });
    });

    describe('Pagination Validation', () => {
      it('validates pagination parameters', () => {
        const pagination = { page: 2, limit: 20 };
        const parsed = commonSchemas.pagination.safeParse(pagination);
        expect(parsed.success).toBe(true);
        if (parsed.success) {
          expect(parsed.data.page).toBe(2);
          expect(parsed.data.limit).toBe(20);
        }
      });

      it('uses default values for missing parameters', () => {
        const pagination = {};
        const parsed = commonSchemas.pagination.safeParse(pagination);
        expect(parsed.success).toBe(true);
        if (parsed.success) {
          expect(parsed.data.page).toBe(1);
          expect(parsed.data.limit).toBe(20);
        }
      });

      it('rejects invalid pagination parameters', () => {
        const pagination = { page: 0, limit: 101 };
        const parsed = commonSchemas.pagination.safeParse(pagination);
        expect(parsed.success).toBe(false);
      });
    });
  });

  describe('User Schemas', () => {
    describe('User Creation', () => {
      it('validates user creation data', () => {
        const userData = {
          email: 'test@example.com',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
        };
        const parsed = userSchemas.create.safeParse(userData);
        expect(parsed.success).toBe(true);
      });

      it('rejects invalid email', () => {
        const userData = {
          email: 'invalid-email',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
        };
        const parsed = userSchemas.create.safeParse(userData);
        expect(parsed.success).toBe(false);
      });

      it('rejects weak password', () => {
        const userData = {
          email: 'test@example.com',
          password: 'weak',
          firstName: 'Test',
          lastName: 'User',
        };
        const parsed = userSchemas.create.safeParse(userData);
        expect(parsed.success).toBe(false);
      });
    });

    describe('User Login', () => {
      it('validates login data', () => {
        const loginData = {
          email: 'test@example.com',
          password: 'Password123!',
        };
        const parsed = userSchemas.login.safeParse(loginData);
        expect(parsed.success).toBe(true);
      });

      it('rejects empty password', () => {
        const loginData = {
          email: 'test@example.com',
          password: '',
        };
        const parsed = userSchemas.login.safeParse(loginData);
        expect(parsed.success).toBe(false);
      });
    });

    describe('User Update', () => {
      it('validates user update data', () => {
        const updateData = {
          firstName: 'NewFirst',
          lastName: 'NewLast',
        };
        const parsed = userSchemas.update.safeParse(updateData);
        expect(parsed.success).toBe(true);
      });

      it('allows partial updates', () => {
        const updateData = {
          firstName: 'NewFirst',
        };
        const parsed = userSchemas.update.safeParse(updateData);
        expect(parsed.success).toBe(true);
      });
    });
  });

  describe('Project Schemas', () => {
    describe('Project Creation', () => {
      it('validates project creation data', () => {
        const projectData = {
          name: 'Test Project',
          description: 'A test project',
          startDate: '2023-01-01T00:00:00Z',
          endDate: '2023-12-31T23:59:59Z',
          status: 'planning' as const,
        };
        const parsed = projectSchemas.create.safeParse(projectData);
        expect(parsed.success).toBe(true);
      });

      it('uses default status', () => {
        const projectData = {
          name: 'Test Project',
        };
        const parsed = projectSchemas.create.safeParse(projectData);
        expect(parsed.success).toBe(true);
        if (parsed.success) {
          expect(parsed.data.status).toBe('planning');
        }
      });

      it('rejects empty name', () => {
        const projectData = {
          name: '',
        };
        const parsed = projectSchemas.create.safeParse(projectData);
        expect(parsed.success).toBe(false);
      });
    });

    describe('Project Update', () => {
      it('validates project update data', () => {
        const updateData = {
          name: 'Updated Project',
          description: 'Updated description',
          status: 'active' as const,
        };
        const parsed = projectSchemas.update.safeParse(updateData);
        expect(parsed.success).toBe(true);
      });

      it('allows partial updates', () => {
        const updateData = {
          description: 'Updated description only',
        };
        const parsed = projectSchemas.update.safeParse(updateData);
        expect(parsed.success).toBe(true);
      });
    });
  });

  describe('Task Schemas', () => {
    describe('Task Creation', () => {
      it('validates task creation data', () => {
        const taskData = {
          title: 'Test Task',
          description: 'A test task',
          projectId: '123e4567-e89b-12d3-a456-426614174000',
          assigneeId: '123e4567-e89b-12d3-a456-426614174001',
          dueDate: '2023-12-31T23:59:59Z',
          status: 'todo' as const,
          priority: 'high' as const,
        };
        const parsed = taskSchemas.create.safeParse(taskData);
        expect(parsed.success).toBe(true);
      });

      it('uses default values', () => {
        const taskData = {
          title: 'Test Task',
        };
        const parsed = taskSchemas.create.safeParse(taskData);
        expect(parsed.success).toBe(true);
        if (parsed.success) {
          expect(parsed.data.status).toBe('todo');
          expect(parsed.data.priority).toBe('medium');
        }
      });

      it('rejects empty title', () => {
        const taskData = {
          title: '',
        };
        const parsed = taskSchemas.create.safeParse(taskData);
        expect(parsed.success).toBe(false);
      });
    });

    describe('Task Update', () => {
      it('validates task update data', () => {
        const updateData = {
          title: 'Updated Task',
          description: 'Updated description',
          status: 'in-progress' as const,
          priority: 'critical' as const,
        };
        const parsed = taskSchemas.update.safeParse(updateData);
        expect(parsed.success).toBe(true);
      });

      it('allows partial updates', () => {
        const updateData = {
          status: 'done' as const,
        };
        const parsed = taskSchemas.update.safeParse(updateData);
        expect(parsed.success).toBe(true);
      });
    });
  });
});

