/**
 * Real Authentication Integration Tests
 * Tests actual API endpoints without mocks
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { waitForServer, shouldSkipIntegrationTests, createTestUser, getTestConfig } from '../setup/test-server';

const SKIP_TESTS = shouldSkipIntegrationTests();

describe.skipIf(SKIP_TESTS)('Authentication Integration Tests (Real API)', () => {
  const config = getTestConfig();
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    // Ensure server is running
    await waitForServer();
  });

  describe('User Registration', () => {
    it('should register a new user successfully', async () => {
      const timestamp = Date.now();
      const email = `test-${timestamp}@example.com`;
      const password = 'TestPassword123!';

      const response = await fetch(`${config.apiUrl}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          name: 'Integration Test User',
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('token');
      expect(data).toHaveProperty('user');
      expect(data.user.email).toBe(email);

      authToken = data.token;
      testUserId = data.user.id;
    });

    it('should reject duplicate email registration', async () => {
      const email = `duplicate-${Date.now()}@example.com`;

      // First registration
      await fetch(`${config.apiUrl}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password: 'TestPassword123!',
          name: 'Test User',
        }),
      });

      // Second registration with same email
      const response = await fetch(`${config.apiUrl}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password: 'TestPassword123!',
          name: 'Test User 2',
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should validate email format', async () => {
      const response = await fetch(`${config.apiUrl}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'TestPassword123!',
          name: 'Test User',
        }),
      });

      expect(response.status).toBe(400);
    });

    it('should validate password strength', async () => {
      const response = await fetch(`${config.apiUrl}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: `test-${Date.now()}@example.com`,
          password: '123', // Weak password
          name: 'Test User',
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('User Login', () => {
    const testEmail = `login-test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    beforeAll(async () => {
      // Create test user
      await fetch(`${config.apiUrl}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          name: 'Login Test User',
        }),
      });
    });

    it('should login with correct credentials', async () => {
      const response = await fetch(`${config.apiUrl}/api/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('token');
      expect(data).toHaveProperty('user');
      expect(data.user.email).toBe(testEmail);
    });

    it('should reject incorrect password', async () => {
      const response = await fetch(`${config.apiUrl}/api/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testEmail,
          password: 'WrongPassword123!',
        }),
      });

      expect(response.status).toBe(401);
    });

    it('should reject non-existent user', async () => {
      const response = await fetch(`${config.apiUrl}/api/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'TestPassword123!',
        }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Protected Endpoints', () => {
    let userToken: string;

    beforeAll(async () => {
      const result = await createTestUser(
        `protected-test-${Date.now()}@example.com`,
        'TestPassword123!'
      );
      userToken = result.token;
    });

    it('should access protected endpoint with valid token', async () => {
      const response = await fetch(`${config.apiUrl}/api/user/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('user');
    });

    it('should reject request without token', async () => {
      const response = await fetch(`${config.apiUrl}/api/user/me`, {
        method: 'GET',
      });

      expect(response.status).toBe(401);
    });

    it('should reject request with invalid token', async () => {
      const response = await fetch(`${config.apiUrl}/api/user/me`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid-token',
        },
      });

      expect(response.status).toBe(401);
    });
  });
});
