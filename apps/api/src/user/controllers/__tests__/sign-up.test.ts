/**
 * Sign-Up Controller Tests
 * Unit tests for user registration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import bcrypt from 'bcrypt';
import { HTTPException } from 'hono/http-exception';
import signUp from '../sign-up';
import { createMockDb, resetMockDb } from '../../../tests/helpers/test-database';

// Mock dependencies
vi.mock('../../../database/connection', () => ({
  getDatabase: vi.fn(() => mockDb),
}));

vi.mock('../../../events', () => ({
  publishEvent: vi.fn(),
}));

vi.mock('../../../utils/get-settings', () => ({
  default: vi.fn(() => ({
    disableRegistration: false,
    isDemoMode: false,
  })),
}));

const mockDb = createMockDb();

describe('SignUp Controller', () => {
  beforeEach(() => {
    resetMockDb(mockDb);
    vi.clearAllMocks();
  });

  describe('Successful registration', () => {
    it('should successfully create a new user account', async () => {
      // Arrange
      const email = 'newuser@example.com';
      const password = 'securepassword123';
      const name = 'New User';

      mockDb.query.userTable.findFirst.mockResolvedValue(null); // Email not taken
      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'new-user-id',
        email,
        name,
        password: 'hashed',
      }]);

      // Act
      const result = await signUp(email, password, name);

      // Assert
      expect(result).toBeDefined();
      expect(result.email).toBe(email);
      expect(result.name).toBe(name);
      expect(result.id).toBe('new-user-id');
      expect(result).not.toHaveProperty('password');
    });

    it('should hash the password before storing', async () => {
      // Arrange
      const email = 'newuser@example.com';
      const password = 'plainpassword';
      const name = 'New User';
      const bcryptHashSpy = vi.spyOn(bcrypt, 'hash');

      mockDb.query.userTable.findFirst.mockResolvedValue(null);
      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'new-user-id',
        email,
        name,
        password: 'hashed',
      }]);

      // Act
      await signUp(email, password, name);

      // Assert
      expect(bcryptHashSpy).toHaveBeenCalledWith(password, 10);
      bcryptHashSpy.mockRestore();
    });

    it('should publish user.signed_up event', async () => {
      // Arrange
      const email = 'newuser@example.com';
      const password = 'securepassword123';
      const name = 'New User';
      const { publishEvent } = await import('../../../events');

      mockDb.query.userTable.findFirst.mockResolvedValue(null);
      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'new-user-id',
        email,
        name,
        password: 'hashed',
      }]);

      // Act
      await signUp(email, password, name);

      // Assert
      expect(publishEvent).toHaveBeenCalledWith('user.signed_up', {
        email,
      });
    });
  });

  describe('Registration restrictions', () => {
    it('should throw error when registration is disabled', async () => {
      // Arrange
      const getSettings = (await import('../../../utils/get-settings')).default;
      vi.mocked(getSettings).mockReturnValue({
        disableRegistration: true,
        isDemoMode: false,
      } as any);

      const email = 'newuser@example.com';
      const password = 'password123';
      const name = 'New User';

      // Act & Assert
      await expect(signUp(email, password, name)).rejects.toThrow(HTTPException);
      await expect(signUp(email, password, name)).rejects.toThrow('Registration is disabled');
    });

    it('should allow registration in demo mode even if disabled', async () => {
      // Arrange
      const getSettings = (await import('../../../utils/get-settings')).default;
      vi.mocked(getSettings).mockReturnValue({
        disableRegistration: true,
        isDemoMode: true,
      } as any);

      const email = 'newuser@example.com';
      const password = 'password123';
      const name = 'New User';

      mockDb.query.userTable.findFirst.mockResolvedValue(null);
      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'new-user-id',
        email,
        name,
        password: 'hashed',
      }]);

      // Act
      const result = await signUp(email, password, name);

      // Assert
      expect(result).toBeDefined();
      expect(result.email).toBe(email);
    });

    it('should throw error when email is already taken', async () => {
      // Arrange
      const email = 'existing@example.com';
      const password = 'password123';
      const name = 'New User';

      mockDb.query.userTable.findFirst.mockResolvedValue({
        id: 'existing-user-id',
        email,
      });

      // Act & Assert
      await expect(signUp(email, password, name)).rejects.toThrow(HTTPException);
      await expect(signUp(email, password, name)).rejects.toThrow('Email taken');
    });
  });

  describe('Error handling', () => {
    it('should throw error when user creation fails', async () => {
      // Arrange
      const email = 'newuser@example.com';
      const password = 'password123';
      const name = 'New User';

      mockDb.query.userTable.findFirst.mockResolvedValue(null);
      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([]); // Empty array = failed creation

      // Act & Assert
      await expect(signUp(email, password, name)).rejects.toThrow(HTTPException);
      await expect(signUp(email, password, name)).rejects.toThrow('Failed to create an account');
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const email = 'newuser@example.com';
      const password = 'password123';
      const name = 'New User';

      mockDb.query.userTable.findFirst.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(signUp(email, password, name)).rejects.toThrow('Database error');
    });
  });

  describe('Input validation', () => {
    it('should handle various email formats', async () => {
      // Arrange
      const testEmails = [
        'test@example.com',
        'test.user@example.com',
        'test+tag@example.co.uk',
      ];

      for (const email of testEmails) {
        resetMockDb(mockDb);
        mockDb.query.userTable.findFirst.mockResolvedValue(null);
        mockDb.insert.mockReturnThis();
        mockDb.values.mockReturnThis();
        mockDb.returning.mockResolvedValue([{
          id: 'user-id',
          email,
          name: 'Test',
          password: 'hashed',
        }]);

        // Act
        const result = await signUp(email, 'password123', 'Test');

        // Assert
        expect(result.email).toBe(email);
      }
    });

    it('should handle names with special characters', async () => {
      // Arrange
      const email = 'test@example.com';
      const password = 'password123';
      const name = "O'Brien-Smith";

      mockDb.query.userTable.findFirst.mockResolvedValue(null);
      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'user-id',
        email,
        name,
        password: 'hashed',
      }]);

      // Act
      const result = await signUp(email, password, name);

      // Assert
      expect(result.name).toBe(name);
    });
  });

  describe('Security', () => {
    it('should use strong password hashing (bcrypt with rounds=10)', async () => {
      // Arrange
      const email = 'newuser@example.com';
      const password = 'securepassword';
      const name = 'New User';

      mockDb.query.userTable.findFirst.mockResolvedValue(null);
      mockDb.insert.mockReturnThis();
      mockDb.values.mockImplementation((values: any) => {
        // Verify the hashed password format
        expect(values.password).toMatch(/^\$2b\$10\$/);
        return mockDb;
      });
      mockDb.returning.mockResolvedValue([{
        id: 'new-user-id',
        email,
        name,
        password: 'hashed',
      }]);

      // Act
      await signUp(email, password, name);

      // Assert
      expect(mockDb.values).toHaveBeenCalled();
    });

    it('should not return password in response', async () => {
      // Arrange
      const email = 'newuser@example.com';
      const password = 'password123';
      const name = 'New User';

      mockDb.query.userTable.findFirst.mockResolvedValue(null);
      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([{
        id: 'new-user-id',
        email,
        name,
        password: 'hashedpassword',
      }]);

      // Act
      const result = await signUp(email, password, name);

      // Assert
      expect(result).not.toHaveProperty('password');
      expect(Object.keys(result)).toEqual(['id', 'email', 'name']);
    });
  });
});

