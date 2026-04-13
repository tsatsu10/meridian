/**
 * @epic-5.1-api-standardization - Validator unit tests
 * @persona-all - Testing input validation system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Validator, Schemas, CommonSchemas, UserSchemas, WorkspaceSchemas, ProjectSchemas, TaskSchemas, TeamSchemas, MessageSchemas, TimeEntrySchemas } from '../../core/Validator';
import { ValidationError } from '../../core/ErrorHandler';

describe('Validator', () => {
  beforeEach(() => {
    // Reset environment for consistent testing
    process.env.API_VERSION = '1.0.0';
  });

  describe('validate', () => {
    it('should validate valid data successfully', () => {
      const schema = CommonSchemas.id;
      const data = 'user_123';

      const result = Validator.validate(schema, data);

      expect(result).toBe('user_123');
    });

    it('should throw ValidationError for invalid data', () => {
      const schema = CommonSchemas.id;
      const data = '';

      expect(() => Validator.validate(schema, data)).toThrow(ValidationError);
    });

    it('should validate complex user data', () => {
      const data = {
        email: 'test@example.com',
        password: 'Password123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user',
      };

      const result = Validator.validate(UserSchemas.createUser, data);

      expect(result.email).toBe('test@example.com');
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.role).toBe('user');
    });

    it('should validate workspace data', () => {
      const data = {
        name: 'Test Workspace',
        description: 'A test workspace',
        settings: { theme: 'dark' },
      };

      const result = Validator.validate(WorkspaceSchemas.createWorkspace, data);

      expect(result.name).toBe('Test Workspace');
      expect(result.description).toBe('A test workspace');
      expect(result.settings).toEqual({ theme: 'dark' });
    });

    it('should validate project data', () => {
      const data = {
        name: 'Test Project',
        description: 'A test project',
        workspaceId: 'workspace_123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        status: 'active',
        priority: 'high',
        createdBy: 'user_123',
      };

      const result = Validator.validate(ProjectSchemas.createProject, data);

      expect(result.name).toBe('Test Project');
      expect(result.status).toBe('active');
      expect(result.priority).toBe('high');
    });

    it('should validate task data', () => {
      const data = {
        title: 'Test Task',
        description: 'A test task',
        projectId: 'project_123',
        assigneeId: 'user_123',
        priority: 'medium',
        status: 'in-progress',
        dueDate: new Date('2024-06-30'),
        estimatedHours: 8,
      };

      const result = Validator.validate(TaskSchemas.createTask, data);

      expect(result.title).toBe('Test Task');
      expect(result.priority).toBe('medium');
      expect(result.status).toBe('in-progress');
    });

    it('should validate team data', () => {
      const data = {
        name: 'Test Team',
        description: 'A test team',
        type: 'general',
        workspaceId: 'workspace_123',
      };

      const result = Validator.validate(TeamSchemas.createTeam, data);

      expect(result.name).toBe('Test Team');
      expect(result.type).toBe('general');
    });

    it('should validate message data', () => {
      const data = {
        content: 'Test message',
        channelId: 'channel_123',
        senderId: 'user_123',
        type: 'text',
      };

      const result = Validator.validate(MessageSchemas.createMessage, data);

      expect(result.content).toBe('Test message');
      expect(result.type).toBe('text');
    });

    it('should validate time entry data', () => {
      const data = {
        taskId: 'task_123',
        startTime: new Date('2024-01-01T09:00:00Z'),
        endTime: new Date('2024-01-01T17:00:00Z'),
        description: 'Work on feature',
        duration: 8,
      };

      const result = Validator.validate(TimeEntrySchemas.createTimeEntry, data);

      expect(result.taskId).toBe('task_123');
      expect(result.duration).toBe(8);
    });
  });

  describe('validatePartial', () => {
    it('should validate partial data successfully', () => {
      const schema = UserSchemas.updateUser;
      const data = {
        firstName: 'Jane',
        lastName: 'Smith',
      };

      const result = Validator.validatePartial(schema, data);

      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
    });

    it('should handle empty partial data', () => {
      const schema = UserSchemas.updateUser;
      const data = {};

      const result = Validator.validatePartial(schema, data);

      expect(result).toEqual({});
    });

    it('should throw ValidationError for invalid partial data', () => {
      const schema = UserSchemas.updateUser;
      const data = {
        firstName: '123-invalid-name!',
      };

      expect(() => Validator.validatePartial(schema, data)).toThrow(ValidationError);
    });
  });

  describe('validateQuery', () => {
    it('should validate query parameters successfully', () => {
      const schema = CommonSchemas.pagination;
      const query = {
        page: '1',
        limit: '10',
        sortBy: 'name',
        sortOrder: 'asc',
      };

      const result = Validator.validateQuery(schema, query);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.sortBy).toBe('name');
      expect(result.sortOrder).toBe('asc');
    });

    it('should use default values for missing query parameters', () => {
      const schema = CommonSchemas.pagination;
      const query = {};

      const result = Validator.validateQuery(schema, query);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.sortBy).toBeUndefined();
      expect(result.sortOrder).toBe('desc');
    });

    it('should throw ValidationError for invalid query parameters', () => {
      const schema = CommonSchemas.pagination;
      const query = {
        page: 'invalid',
        limit: '-5',
      };

      expect(() => Validator.validateQuery(schema, query)).toThrow(ValidationError);
    });
  });

  describe('validateId', () => {
    it('should validate valid ID', () => {
      const id = 'user_123';

      const result = Validator.validateId(id);

      expect(result).toBe('user_123');
    });

    it('should throw ValidationError for invalid ID', () => {
      const id = '';

      expect(() => Validator.validateId(id)).toThrow(ValidationError);
    });

    it('should throw ValidationError for non-string ID', () => {
      const id = 123 as any;

      expect(() => Validator.validateId(id)).toThrow(ValidationError);
    });
  });

  describe('validateEmail', () => {
    it('should validate valid email', () => {
      const email = 'test@example.com';

      const result = Validator.validateEmail(email);

      expect(result).toBe('test@example.com');
    });

    it('should throw ValidationError for invalid email', () => {
      const email = 'invalid-email';

      expect(() => Validator.validateEmail(email)).toThrow(ValidationError);
    });

    it('should throw ValidationError for empty email', () => {
      const email = '';

      expect(() => Validator.validateEmail(email)).toThrow(ValidationError);
    });
  });

  describe('validatePassword', () => {
    it('should validate valid password', () => {
      const password = 'Password123!';

      const result = Validator.validatePassword(password);

      expect(result).toBe('Password123!');
    });

    it('should throw ValidationError for weak password', () => {
      const password = '123';

      expect(() => Validator.validatePassword(password)).toThrow(ValidationError);
    });

    it('should throw ValidationError for empty password', () => {
      const password = '';

      expect(() => Validator.validatePassword(password)).toThrow(ValidationError);
    });
  });

  describe('validateDate', () => {
    it('should validate valid date string', () => {
      const date = '2024-01-01';

      const result = Validator.validateDate(date);

      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString().split('T')[0]).toBe('2024-01-01');
    });

    it('should validate valid date object', () => {
      const date = new Date('2024-01-01');

      const result = Validator.validateDate(date);

      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString().split('T')[0]).toBe('2024-01-01');
    });

    it('should throw ValidationError for invalid date', () => {
      const date = 'invalid-date';

      expect(() => Validator.validateDate(date)).toThrow(ValidationError);
    });
  });

  describe('validateEnum', () => {
    it('should validate valid enum value', () => {
      const value = 'active';
      const enumValues = ['active', 'inactive', 'pending'];

      const result = Validator.validateEnum(value, enumValues);

      expect(result).toBe('active');
    });

    it('should throw ValidationError for invalid enum value', () => {
      const value = 'invalid';
      const enumValues = ['active', 'inactive', 'pending'];

      expect(() => Validator.validateEnum(value, enumValues)).toThrow(ValidationError);
    });
  });

  describe('validateArray', () => {
    it('should validate valid array', () => {
      const array = ['item1', 'item2', 'item3'];
      const itemSchema = CommonSchemas.id;

      const result = Validator.validateArray(array, itemSchema);

      expect(result).toEqual(['item1', 'item2', 'item3']);
    });

    it('should throw ValidationError for invalid array item', () => {
      const array = ['item1', '', 'item3'];
      const itemSchema = CommonSchemas.id;

      expect(() => Validator.validateArray(array, itemSchema)).toThrow(ValidationError);
    });

    it('should throw ValidationError for non-array input', () => {
      const array = 'not-an-array';
      const itemSchema = CommonSchemas.id;

      expect(() => Validator.validateArray(array as any, itemSchema)).toThrow(ValidationError);
    });
  });

  describe('validateObject', () => {
    it('should validate valid object', () => {
      const obj = { key1: 'value1', key2: 'value2' };
      const schema = CommonSchemas.id;

      const result = Validator.validateObject(obj, schema);

      expect(result).toEqual({ key1: 'value1', key2: 'value2' });
    });

    it('should throw ValidationError for invalid object value', () => {
      const obj = { key1: 'value1', key2: '' };
      const schema = CommonSchemas.id;

      expect(() => Validator.validateObject(obj, schema)).toThrow(ValidationError);
    });

    it('should throw ValidationError for non-object input', () => {
      const obj = 'not-an-object';
      const schema = CommonSchemas.id;

      expect(() => Validator.validateObject(obj as any, schema)).toThrow(ValidationError);
    });
  });

  describe('Schemas', () => {
    it('should export all required schemas', () => {
      expect(Schemas.common).toBeDefined();
      expect(Schemas.user).toBeDefined();
      expect(Schemas.workspace).toBeDefined();
      expect(Schemas.project).toBeDefined();
      expect(Schemas.task).toBeDefined();
      expect(Schemas.team).toBeDefined();
      expect(Schemas.message).toBeDefined();
      expect(Schemas.timeEntry).toBeDefined();
    });

    it('should have consistent schema structure', () => {
      Object.values(Schemas).forEach(schemaGroup => {
        expect(typeof schemaGroup).toBe('object');
        expect(schemaGroup).not.toBeNull();
      });
    });
  });

  describe('Error Handling', () => {
    it('should provide detailed error information', () => {
      const schema = UserSchemas.createUser;
      const invalidData = {
        email: 'invalid-email',
        password: '123',
        firstName: '',
        lastName: '',
      };

      try {
        Validator.validate(schema, invalidData);
        fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toContain('Validation failed');
        expect(error.details).toBeDefined();
      }
    });
  });
}); 

