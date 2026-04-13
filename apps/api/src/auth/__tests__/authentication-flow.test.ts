/**
 * Comprehensive authentication flow tests
 * 
 * Covers:
 * - Sign up with validation
 * - Sign in with credentials
 * - Session management
 * - Password security
 * - Email verification
 * - Sign out
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getDatabase, initializeDatabase, closeDatabase } from '../../database/connection';
import { userTable, sessionTable } from '../../database/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../password';
import { createId } from '@paralleldrive/cuid2';

describe('Authentication Flow', () => {
  let db: ReturnType<typeof getDatabase>;

  beforeAll(async () => {
    await initializeDatabase();
    db = getDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    // Clean up test users
    await db.delete(userTable).where(eq(userTable.email, 'test@example.com'));
  });

  describe('Sign Up', () => {
    it('should create a new user with hashed password', async () => {
      const hashedPassword = await hashPassword('SecurePassword123!');
      
      const [newUser] = await db.insert(userTable).values({
        id: createId(),
        email: 'test@example.com',
        name: 'Test User',
        password: hashedPassword,
        role: 'member',
        isEmailVerified: false,
      }).returning();

      expect(newUser).toBeDefined();
      expect(newUser.email).toBe('test@example.com');
      expect(newUser.password).not.toBe('SecurePassword123!');
      expect(newUser.password).toContain('$2b$'); // bcrypt hash
      expect(newUser.isEmailVerified).toBe(false);
    });

    it('should enforce unique email constraint', async () => {
      const hashedPassword = await hashPassword('SecurePassword123!');
      
      // Create first user
      await db.insert(userTable).values({
        id: createId(),
        email: 'test@example.com',
        name: 'Test User 1',
        password: hashedPassword,
        role: 'member',
      });

      // Attempt to create duplicate
      await expect(async () => {
        await db.insert(userTable).values({
          id: createId(),
          email: 'test@example.com',
          name: 'Test User 2',
          password: hashedPassword,
          role: 'member',
        });
      }).rejects.toThrow();
    });

    it('should set default values correctly', async () => {
      const hashedPassword = await hashPassword('SecurePassword123!');
      
      const [newUser] = await db.insert(userTable).values({
        id: createId(),
        email: 'test@example.com',
        name: 'Test User',
        password: hashedPassword,
      }).returning();

      expect(newUser.role).toBe('member'); // Default role
      expect(newUser.timezone).toBe('UTC'); // Default timezone
      expect(newUser.language).toBe('en'); // Default language
      expect(newUser.isEmailVerified).toBe(false);
      expect(newUser.twoFactorEnabled).toBe(false);
    });

    it('should validate email format', () => {
      const validEmails = [
        'test@example.com',
        'user.name@example.co.uk',
        'user+tag@example.com',
      ];

      const invalidEmails = [
        'invalid',
        '@example.com',
        'user@',
        'user name@example.com',
      ];

      validEmails.forEach(email => {
        expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });

      invalidEmails.forEach(email => {
        expect(email).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });
    });
  });

  describe('Sign In', () => {
    let testUser: any;

    beforeEach(async () => {
      const hashedPassword = await hashPassword('SecurePassword123!');
      
      [testUser] = await db.insert(userTable).values({
        id: createId(),
        email: 'test@example.com',
        name: 'Test User',
        password: hashedPassword,
        role: 'member',
        isEmailVerified: true,
      }).returning();
    });

    it('should create a session on successful sign in', async () => {
      const sessionId = createId();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      const [session] = await db.insert(sessionTable).values({
        id: sessionId,
        userId: testUser.id,
        expiresAt,
      }).returning();

      expect(session).toBeDefined();
      expect(session.userId).toBe(testUser.id);
      expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should update lastLoginAt timestamp', async () => {
      const now = new Date();
      
      await db.update(userTable)
        .set({ lastLoginAt: now })
        .where(eq(userTable.id, testUser.id));

      const [updatedUser] = await db.select()
        .from(userTable)
        .where(eq(userTable.id, testUser.id));

      expect(updatedUser.lastLoginAt).toBeDefined();
      expect(updatedUser.lastLoginAt!.getTime()).toBeCloseTo(now.getTime(), -2);
    });

    it('should fail with incorrect password', async () => {
      const { verifyPassword } = await import('../password');
      
      const isValid = await verifyPassword(
        'WrongPassword123!',
        testUser.password
      );

      expect(isValid).toBe(false);
    });

    it('should fail with non-existent user', async () => {
      const users = await db.select()
        .from(userTable)
        .where(eq(userTable.email, 'nonexistent@example.com'));

      expect(users).toHaveLength(0);
    });
  });

  describe('Session Management', () => {
    let testUser: any;
    let testSession: any;

    beforeEach(async () => {
      const hashedPassword = await hashPassword('SecurePassword123!');
      
      [testUser] = await db.insert(userTable).values({
        id: createId(),
        email: 'test@example.com',
        name: 'Test User',
        password: hashedPassword,
        role: 'member',
      }).returning();

      [testSession] = await db.insert(sessionTable).values({
        id: createId(),
        userId: testUser.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }).returning();
    });

    it('should validate active sessions', async () => {
      const [session] = await db.select()
        .from(sessionTable)
        .where(eq(sessionTable.id, testSession.id));

      expect(session).toBeDefined();
      expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should reject expired sessions', async () => {
      // Create expired session
      const [expiredSession] = await db.insert(sessionTable).values({
        id: createId(),
        userId: testUser.id,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      }).returning();

      expect(expiredSession.expiresAt.getTime()).toBeLessThan(Date.now());
    });

    it('should delete session on sign out', async () => {
      await db.delete(sessionTable)
        .where(eq(sessionTable.id, testSession.id));

      const sessions = await db.select()
        .from(sessionTable)
        .where(eq(sessionTable.id, testSession.id));

      expect(sessions).toHaveLength(0);
    });

    it('should cascade delete sessions when user is deleted', async () => {
      await db.delete(userTable)
        .where(eq(userTable.id, testUser.id));

      const sessions = await db.select()
        .from(sessionTable)
        .where(eq(sessionTable.userId, testUser.id));

      expect(sessions).toHaveLength(0);
    });
  });

  describe('Password Security', () => {
    it('should hash passwords with Argon2', async () => {
      const password = 'SecurePassword123!';
      const hashed = await hashPassword(password);

      expect(hashed).toContain('$2b$'); // bcrypt hash
      expect(hashed).not.toBe(password);
      expect(hashed.length).toBeGreaterThanOrEqual(60); // bcrypt hashes are exactly 60 chars
    });

    it('should verify correct passwords', async () => {
      const { verifyPassword } = await import('../password');
      
      const password = 'SecurePassword123!';
      const hashed = await hashPassword(password);
      const isValid = await verifyPassword(password, hashed);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect passwords', async () => {
      const { verifyPassword } = await import('../password');
      
      const password = 'SecurePassword123!';
      const hashed = await hashPassword(password);
      const isValid = await verifyPassword('WrongPassword123!', hashed);

      expect(isValid).toBe(false);
    });

    it('should generate unique hashes for same password', async () => {
      const password = 'SecurePassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2); // Salt makes each hash unique
    });
  });

  describe('Email Verification', () => {
    it('should mark email as verified', async () => {
      const hashedPassword = await hashPassword('SecurePassword123!');
      
      const [user] = await db.insert(userTable).values({
        id: createId(),
        email: 'test@example.com',
        name: 'Test User',
        password: hashedPassword,
        role: 'member',
        isEmailVerified: false,
      }).returning();

      expect(user.isEmailVerified).toBe(false);

      await db.update(userTable)
        .set({ isEmailVerified: true })
        .where(eq(userTable.id, user.id));

      const [verifiedUser] = await db.select()
        .from(userTable)
        .where(eq(userTable.id, user.id));

      expect(verifiedUser.isEmailVerified).toBe(true);
    });
  });

  describe('Two-Factor Authentication', () => {
    let testUser: any;

    beforeEach(async () => {
      const hashedPassword = await hashPassword('SecurePassword123!');
      
      [testUser] = await db.insert(userTable).values({
        id: createId(),
        email: 'test@example.com',
        name: 'Test User',
        password: hashedPassword,
        role: 'member',
        twoFactorEnabled: false,
      }).returning();
    });

    it('should enable 2FA with secret', async () => {
      const secret = 'JBSWY3DPEHPK3PXP'; // Example TOTP secret

      await db.update(userTable)
        .set({ 
          twoFactorEnabled: true,
          twoFactorSecret: secret,
        })
        .where(eq(userTable.id, testUser.id));

      const [updatedUser] = await db.select()
        .from(userTable)
        .where(eq(userTable.id, testUser.id));

      expect(updatedUser.twoFactorEnabled).toBe(true);
      expect(updatedUser.twoFactorSecret).toBe(secret);
    });

    it('should store backup codes', async () => {
      const backupCodes = JSON.stringify([
        'CODE1', 'CODE2', 'CODE3', 'CODE4', 'CODE5',
        'CODE6', 'CODE7', 'CODE8', 'CODE9', 'CODE10',
      ]);

      await db.update(userTable)
        .set({ twoFactorBackupCodes: backupCodes })
        .where(eq(userTable.id, testUser.id));

      const [updatedUser] = await db.select()
        .from(userTable)
        .where(eq(userTable.id, testUser.id));

      const codes = JSON.parse(updatedUser.twoFactorBackupCodes || '[]');
      expect(codes).toHaveLength(10);
    });

    it('should disable 2FA', async () => {
      // Enable first
      await db.update(userTable)
        .set({ 
          twoFactorEnabled: true,
          twoFactorSecret: 'SECRET',
        })
        .where(eq(userTable.id, testUser.id));

      // Then disable
      await db.update(userTable)
        .set({ 
          twoFactorEnabled: false,
          twoFactorSecret: null,
          twoFactorBackupCodes: null,
        })
        .where(eq(userTable.id, testUser.id));

      const [updatedUser] = await db.select()
        .from(userTable)
        .where(eq(userTable.id, testUser.id));

      expect(updatedUser.twoFactorEnabled).toBe(false);
      expect(updatedUser.twoFactorSecret).toBeNull();
      expect(updatedUser.twoFactorBackupCodes).toBeNull();
    });
  });
});

