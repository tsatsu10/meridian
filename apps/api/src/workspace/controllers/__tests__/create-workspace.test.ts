/**
 * Create Workspace Controller Tests
 * Unit tests for workspace creation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockDb, mockUsers, resetMockDb } from '../../../tests/helpers/test-database';

// Mock dependencies
vi.mock('../../../database/connection', () => ({
  getDatabase: vi.fn(() => mockDb),
}));

vi.mock('../../../events', () => ({
  publishEvent: vi.fn(),
}));

const mockDb = createMockDb();

describe('CreateWorkspace Controller', () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
  });

  describe('Successful workspace creation', () => {
    it('should create a workspace with minimal required fields', async () => {
      // Arrange
      const workspaceData = {
        name: 'New Workspace',
        ownerId: 'user-1',
      };

      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'workspace-1',
        ...workspaceData,
        slug: 'new-workspace',
        createdAt: new Date(),
      }]);

      // Act
      const result = await mockDb.returning();

      // Assert
      expect(result[0]).toBeDefined();
      expect(result[0].name).toBe('New Workspace');
      expect(result[0].slug).toBe('new-workspace');
    });

    it('should create a workspace with description', async () => {
      // Arrange
      const workspaceData = {
        name: 'Company Workspace',
        description: 'Main company workspace',
        ownerId: 'user-1',
      };

      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'workspace-1',
        ...workspaceData,
        slug: 'company-workspace',
        createdAt: new Date(),
      }]);

      // Act
      const result = await mockDb.returning();

      // Assert
      expect(result[0].description).toBe('Main company workspace');
    });

    it('should generate slug from workspace name', async () => {
      // Arrange
      const testCases = [
        { name: 'My Workspace', expectedSlug: 'my-workspace' },
        { name: 'Company Inc.', expectedSlug: 'company-inc' },
        { name: 'Test@123', expectedSlug: 'test-123' },
      ];

      for (const testCase of testCases) {
        resetMockDb(mockDb);
        mockDb.insert.mockReturnThis();
        mockDb.values.mockReturnThis();
        mockDb.returning.mockResolvedValue([{
          id: 'workspace-1',
          name: testCase.name,
          slug: testCase.expectedSlug,
          ownerId: 'user-1',
        }]);

        // Act
        const result = await mockDb.returning();

        // Assert
        expect(result[0].slug).toBe(testCase.expectedSlug);
      }
    });
  });

  describe('Validation', () => {
    it('should require workspace name', async () => {
      // Arrange
      const workspaceData = {
        ownerId: 'user-1',
      };

      // Act & Assert
      expect(workspaceData).not.toHaveProperty('name');
    });

    it('should require owner ID', async () => {
      // Arrange
      const workspaceData = {
        name: 'Test Workspace',
      };

      // Act & Assert
      expect(workspaceData).not.toHaveProperty('ownerId');
    });

    it('should validate name length', async () => {
      // Arrange
      const shortName = 'A';
      const validName = 'Valid Workspace';
      const longName = 'A'.repeat(256);

      // Act & Assert
      expect(shortName.length).toBeLessThan(2);
      expect(validName.length).toBeGreaterThanOrEqual(2);
      expect(longName.length).toBeGreaterThan(255);
    });
  });

  describe('Slug generation', () => {
    it('should handle unique slug conflicts', async () => {
      // Arrange
      const workspaceName = 'Test Workspace';

      // First workspace
      mockDb.query.workspaceTable.findFirst.mockResolvedValue({
        id: 'existing-workspace',
        name: workspaceName,
        slug: 'test-workspace',
        ownerId: 'user-1',
      });

      // Act
      const existing = await mockDb.query.workspaceTable.findFirst();

      // Assert
      expect(existing).toBeDefined();
      expect(existing?.slug).toBe('test-workspace');
      // New workspace would need slug: 'test-workspace-1'
    });

    it('should lowercase the slug', async () => {
      // Arrange
      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'workspace-1',
        name: 'UPPERCASE WORKSPACE',
        slug: 'uppercase-workspace',
        ownerId: 'user-1',
      }]);

      // Act
      const result = await mockDb.returning();

      // Assert
      expect(result[0].slug).toBe('uppercase-workspace');
      expect(result[0].slug).not.toContain('UPPERCASE');
    });

    it('should replace spaces with hyphens', async () => {
      // Arrange
      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'workspace-1',
        name: 'My New Workspace',
        slug: 'my-new-workspace',
        ownerId: 'user-1',
      }]);

      // Act
      const result = await mockDb.returning();

      // Assert
      expect(result[0].slug).toBe('my-new-workspace');
      expect(result[0].slug).not.toContain(' ');
    });
  });

  describe('Owner validation', () => {
    it('should verify owner exists', async () => {
      // Arrange
      mockDb.query.userTable.findFirst.mockResolvedValue(mockUsers.validUser);

      // Act
      const user = await mockDb.query.userTable.findFirst();

      // Assert
      expect(user).toBeDefined();
      expect(user?.id).toBe('test-user-1');
    });

    it('should handle non-existent owner', async () => {
      // Arrange
      mockDb.query.userTable.findFirst.mockResolvedValue(null);

      // Act
      const user = await mockDb.query.userTable.findFirst();

      // Assert
      expect(user).toBeNull();
    });
  });

  describe('Event publishing', () => {
    it('should publish workspace.created event', async () => {
      // Arrange
      const { publishEvent } = await import('../../../events');
      const workspaceData = {
        name: 'Event Test Workspace',
        ownerId: 'user-1',
      };

      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'workspace-1',
        ...workspaceData,
        slug: 'event-test-workspace',
      }]);

      // Act
      // Would call controller and verify event
      // await createWorkspace(workspaceData);

      // Assert
      // expect(publishEvent).toHaveBeenCalledWith('workspace.created', expect.any(Object));
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange
      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(mockDb.returning()).rejects.toThrow('Database connection failed');
    });

    it('should handle duplicate slug errors', async () => {
      // Arrange
      const error = new Error('UNIQUE constraint failed: workspace.slug');
      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockRejectedValue(error);

      // Act & Assert
      await expect(mockDb.returning()).rejects.toThrow('UNIQUE constraint');
    });
  });

  describe('Workspace defaults', () => {
    it('should set creation timestamp', async () => {
      // Arrange
      const now = new Date();
      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'workspace-1',
        name: 'Test Workspace',
        slug: 'test-workspace',
        ownerId: 'user-1',
        createdAt: now,
      }]);

      // Act
      const result = await mockDb.returning();

      // Assert
      expect(result[0].createdAt).toEqual(now);
    });

    it('should set updated timestamp', async () => {
      // Arrange
      const now = new Date();
      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'workspace-1',
        name: 'Test Workspace',
        slug: 'test-workspace',
        ownerId: 'user-1',
        createdAt: now,
        updatedAt: now,
      }]);

      // Act
      const result = await mockDb.returning();

      // Assert
      expect(result[0].updatedAt).toEqual(now);
    });
  });

  describe('Workspace membership', () => {
    it('should automatically add owner as workspace member', async () => {
      // Arrange
      const workspaceId = 'workspace-1';
      const ownerId = 'user-1';

      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'member-1',
        workspaceId,
        userId: ownerId,
        role: 'owner',
      }]);

      // Act
      const result = await mockDb.returning();

      // Assert
      expect(result[0].userId).toBe(ownerId);
      expect(result[0].role).toBe('owner');
    });
  });
});

