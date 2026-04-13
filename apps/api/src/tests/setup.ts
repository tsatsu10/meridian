/**
 * Test Setup and Configuration
 * Global setup for Vitest tests
 * Enhanced for Production Readiness
 */

import { beforeAll, afterAll, afterEach, vi } from 'vitest';
import logger from '../utils/logger';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.DATABASE_URL = 'postgresql://postgres:test@localhost:5432/meridian_test';
process.env.SENDGRID_API_KEY = 'test-sendgrid-key';
process.env.STORAGE_PROVIDER = 'local';
process.env.VIRUS_SCAN_ENABLED = 'false';
process.env.UPLOAD_DIR = './test-uploads';
process.env.SESSION_DURATION_HOURS = '24';
process.env.CORS_ALLOWED_ORIGIN = 'http://localhost:3000';
process.env.DISABLE_RATE_LIMITING = 'true';
process.env.DISABLE_CSRF = 'true';

let testDb: any;

// Global test setup
beforeAll(async () => {
  logger.debug('🧪 Setting up test environment...');
  
  try {
    const { initializeDatabase, getDatabase } = await import('../database/connection');
    await initializeDatabase();
    testDb = getDatabase();
    logger.debug('✅ Test database initialized');
  } catch (error) {
    logger.error('❌ Failed to initialize test database:', error);
    // Don't throw - allow tests to run without database if needed
  }
  
  logger.debug('✅ Test environment ready');
});

// Clean up after each test
afterEach(async () => {
  // Reset all mocks after each test
  vi.clearAllMocks();
});

// Global test teardown
afterAll(async () => {
  logger.debug('🧹 Cleaning up test environment...');
  
  try {
    const { closeDatabase } = await import('../database/connection');
    await closeDatabase();
    logger.debug('✅ Test database closed');
  } catch (error) {
    logger.error('❌ Failed to close test database:', error);
  }
  
  logger.debug('✅ Test environment cleaned up');
});

export { testDb };

// Helper function to create test user
export function createTestUser(overrides: any = {}) {
  const defaultUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashedPassword123',
    isEmailVerified: false,
    workspaceId: 'test_workspace_123',
    role: 'team-member',
    createdAt: new Date(),
    ...overrides,
  };

  return defaultUser;
}

// Helper function to create test workspace
export async function createTestWorkspace(overrides = {}) {
  const defaultWorkspace = {
    id: 'test-workspace-id',
    name: 'Test Workspace',
    ownerId: 'test-user-id',
    createdAt: new Date(),
    ...overrides,
  };
  
  return defaultWorkspace;
}

// Helper function to create test file
export async function createTestFile(overrides = {}) {
  const defaultFile = {
    id: 'test-file-id',
    fileName: 'test-file.txt',
    originalName: 'test-file.txt',
    fileId: 'file-123',
    mimeType: 'text/plain',
    size: 1024,
    url: '/uploads/test-file.txt',
    uploadedBy: 'test-user-id',
    workspaceId: 'test-workspace-id',
    virusScanStatus: 'clean',
    createdAt: new Date(),
    ...overrides,
  };
  
  return defaultFile;
}

// Mock email service
export const mockEmailService = {
  sendVerificationEmail: vi.fn().mockResolvedValue({ success: true }),
  sendPasswordResetEmail: vi.fn().mockResolvedValue({ success: true }),
  sendWelcomeEmail: vi.fn().mockResolvedValue({ success: true }),
};

// Mock storage service
export const mockStorageService = {
  uploadFile: vi.fn().mockResolvedValue({
    success: true,
    fileId: 'test-file-id',
    fileName: 'test-file.txt',
    url: '/uploads/test-file.txt',
    size: 1024,
  }),
  deleteFile: vi.fn().mockResolvedValue(true),
  getSignedUrl: vi.fn().mockResolvedValue('https://signed-url.example.com'),
};

// Mock virus scanner
export const mockVirusScanner = {
  scanBuffer: vi.fn().mockResolvedValue({
    isClean: true,
    status: 'clean',
    scanTime: 100,
  }),
  scanFile: vi.fn().mockResolvedValue({
    isClean: true,
    status: 'clean',
    scanTime: 100,
  }),
};

// Helper to generate mock JWT token
export function generateMockToken(payload: any = {}) {
  const defaultPayload = {
    userId: 'test-user-id',
    email: 'test@example.com',
    exp: Date.now() + 3600000, // 1 hour
    ...payload,
  };
  
  return Buffer.from(JSON.stringify(defaultPayload)).toString('base64');
}

// Helper to create mock request
export function createMockRequest(options: any = {}) {
  return {
    method: options.method || 'GET',
    path: options.path || '/',
    headers: options.headers || {},
    body: options.body || {},
    query: options.query || {},
    params: options.params || {},
    ...options,
  };
}

// Helper to create mock response
export function createMockResponse() {
  const response: any = {
    status: 200,
    headers: {},
    body: null,
  };
  
  return {
    json: vi.fn((data, status = 200) => {
      response.body = data;
      response.status = status;
      return response;
    }),
    header: vi.fn((name, value) => {
      response.headers[name] = value;
    }),
    redirect: vi.fn((url) => {
      response.redirectUrl = url;
    }),
    get: vi.fn((key) => response[key]),
    set: vi.fn((key, value) => {
      response[key] = value;
    }),
  };
}

