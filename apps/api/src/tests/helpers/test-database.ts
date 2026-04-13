/**
 * Test Database Utilities
 * Mock database operations for testing
 */

import { vi } from 'vitest';

// Mock user data
export const mockUsers = {
  validUser: {
    id: 'test-user-1',
    email: 'test@example.com',
    name: 'Test User',
    password: '$2b$10$YourHashedPasswordHere', // bcrypt hash of 'password123'
    isEmailVerified: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  adminUser: {
    id: 'admin-user-1',
    email: 'admin@example.com',
    name: 'Admin User',
    password: '$2b$10$YourHashedPasswordHere',
    isEmailVerified: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
};

// Mock workspace data
export const mockWorkspaces = {
  defaultWorkspace: {
    id: 'workspace-1',
    name: 'Test Workspace',
    slug: 'test-workspace',
    ownerId: 'test-user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
};

// Mock project data
export const mockProjects = {
  activeProject: {
    id: 'project-1',
    name: 'Test Project',
    description: 'A test project',
    workspaceId: 'workspace-1',
    status: 'active',
    createdById: 'test-user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
};

// Mock task data
export const mockTasks = {
  openTask: {
    id: 'task-1',
    title: 'Test Task',
    description: 'A test task',
    status: 'todo',
    priority: 'medium',
    projectId: 'project-1',
    workspaceId: 'workspace-1',
    assigneeId: 'test-user-1',
    createdById: 'test-user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
};

// Mock session data
export const mockSessions = {
  validSession: {
    id: 'session-1',
    token: 'valid-session-token-123',
    userId: 'test-user-1',
    workspaceId: 'workspace-1',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    createdAt: new Date(),
  },
};

/**
 * Create mock database query builder
 */
export function createMockDb() {
  // Store query results in order they'll be called
  const selectResults: any[] = [];
  let selectCallIndex = 0;
  
  const mockDb: any = {
    // Query builder methods that return chainable objects
    select: vi.fn((fields?: any) => {
      const currentIndex = selectCallIndex++;
      
      // Each select() call creates a new chain
      const chain: any = {};
      chain.from = vi.fn().mockReturnValue(chain);
      chain.where = vi.fn().mockReturnValue(chain);
      chain.limit = vi.fn().mockReturnValue(chain);
      chain.orderBy = vi.fn().mockReturnValue(chain);
      chain.innerJoin = vi.fn().mockReturnValue(chain); // Add innerJoin support
      chain.leftJoin = vi.fn().mockReturnValue(chain); // Add leftJoin support
      // Make chainable and await-able - return results for this specific select() call
      chain.then = (resolve: any) => {
        const results = selectResults[currentIndex] || [];
        return Promise.resolve(results).then(resolve);
      };
      return chain;
    }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(), // Add at top level too
    leftJoin: vi.fn().mockReturnThis(), // Add at top level too
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    execute: vi.fn().mockResolvedValue([]),
    
    // Helper to set query results in order
    __setSelectResults: (...results: any[][]) => {
      selectResults.length = 0;
      selectResults.push(...results);
      selectCallIndex = 0;
    },
    
    query: {
      userTable: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      workspaceTable: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      projectTable: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      taskTable: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      sessionTable: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
  };

  return mockDb;
}

/**
 * Reset all mock database methods
 */
export function resetMockDb(mockDb: ReturnType<typeof createMockDb>) {
  // Reset select results
  mockDb.__setSelectResults();
  
  Object.values(mockDb).forEach(method => {
    if (typeof method === 'function' && 'mockClear' in method) {
      method.mockClear();
    }
  });

  // Reset query methods
  Object.values(mockDb.query).forEach(table => {
    Object.values(table).forEach(method => {
      if (typeof method === 'function' && 'mockClear' in method) {
        method.mockClear();
      }
    });
  });
}

