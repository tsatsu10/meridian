/**
 * Test Server Utilities
 * Provides functions to check if API server is running and wait for it to be ready
 */

const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:3000';
const MAX_RETRIES = 30;
const RETRY_DELAY = 1000; // 1 second

/**
 * Check if the API server is running
 */
export async function isServerRunning(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Wait for the API server to be ready
 */
export async function waitForServer(maxRetries = MAX_RETRIES): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    const running = await isServerRunning();
    if (running) {
      console.log('✓ API server is ready');
      return;
    }

    if (i === 0) {
      console.log('⏳ Waiting for API server to start...');
    }

    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
  }

  throw new Error(
    `API server is not running at ${API_BASE_URL}. ` +
    `Please start the API server with 'npm run dev' in the apps/api directory.`
  );
}

/**
 * Check if we should skip integration tests
 * By default, integration tests run if included via test pattern
 * Set SKIP_INTEGRATION_TESTS=true to force skip
 */
export function shouldSkipIntegrationTests(): boolean {
  return (
    process.env.SKIP_INTEGRATION_TESTS === 'true' ||
    process.env.CI === 'true'
  );
}

/**
 * Create a test user and return auth token
 */
export async function createTestUser(email: string, password: string): Promise<{
  token: string;
  user: any;
}> {
  const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      name: 'Test User',
    }),
  });

  if (!response.ok) {
    // User might already exist, try to login
    const loginResponse = await fetch(`${API_BASE_URL}/api/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    if (!loginResponse.ok) {
      throw new Error('Failed to create or login test user');
    }

    return loginResponse.json();
  }

  return response.json();
}

/**
 * Clean up test data
 */
export async function cleanupTestData(token: string): Promise<void> {
  // This would call test-specific cleanup endpoints
  // For now, we'll rely on database transactions or manual cleanup
  try {
    await fetch(`${API_BASE_URL}/api/test/cleanup`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    // Cleanup endpoint might not exist yet
    console.warn('Could not clean up test data:', error);
  }
}

/**
 * Get test configuration
 */
export function getTestConfig() {
  return {
    apiUrl: API_BASE_URL,
    wsUrl: process.env.VITE_WS_URL || 'ws://localhost:3000',
    testUser: {
      email: process.env.TEST_USER_EMAIL || 'test@example.com',
      password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
    },
  };
}
