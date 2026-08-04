/**
 * Test Database Utilities
 * Mock database operations for testing
 */

import { vi } from "vitest";

// Mock user data
export const mockUsers = {
  validUser: {
    id: "test-user-1",
    email: "test@example.com",
    name: "Test User",
    password: "$2b$10$YourHashedPasswordHere", // bcrypt hash of 'password123'
    isEmailVerified: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  adminUser: {
    id: "admin-user-1",
    email: "admin@example.com",
    name: "Admin User",
    password: "$2b$10$YourHashedPasswordHere",
    isEmailVerified: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
};

// Mock workspace data
export const mockWorkspaces = {
  defaultWorkspace: {
    id: "workspace-1",
    name: "Test Workspace",
    slug: "test-workspace",
    ownerId: "test-user-1",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
};

// Mock project data
export const mockProjects = {
  activeProject: {
    id: "project-1",
    name: "Test Project",
    description: "A test project",
    workspaceId: "workspace-1",
    status: "active",
    createdById: "test-user-1",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
};

// Mock task data
export const mockTasks = {
  openTask: {
    id: "task-1",
    title: "Test Task",
    description: "A test task",
    status: "todo",
    priority: "medium",
    projectId: "project-1",
    workspaceId: "workspace-1",
    assigneeId: "test-user-1",
    createdById: "test-user-1",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
};

// Mock session data
export const mockSessions = {
  validSession: {
    id: "session-1",
    token: "valid-session-token-123",
    userId: "test-user-1",
    workspaceId: "workspace-1",
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    createdAt: new Date(),
  },
};

/**
 * Create mock database query builder
 */
export function createMockDb() {
  // Store query results in order they'll be called
  const selectResults: unknown[] = [];
  let selectCallIndex = 0;

  /**
   * What each select() chain was actually asked for.
   *
   * The chain below returns canned rows keyed only on call order, so it cannot
   * tell a correctly-filtered query from one missing a `.where()` — both get
   * the same rows. That blind spot is not theoretical: a missing `isActive`
   * filter survived 24 commits and 5 reviews behind it, because no test could
   * have caught it.
   *
   * Recording the arguments does not change what the chain returns (every
   * existing test behaves exactly as before), but it makes the omission
   * assertable:
   *
   *   expect(mockDb.__selectCalls[0].where).toHaveLength(1);
   *
   * Predicates are drizzle SQL objects, so assert on their presence/shape
   * rather than deep-equality against a hand-built expression.
   */
  const selectCalls: Array<{
    where: unknown[];
    limit: unknown[];
    orderBy: unknown[];
    innerJoin: unknown[];
    leftJoin: unknown[];
  }> = [];

  const mockDb: Record<string, unknown> = {
    // Query builder methods that return chainable objects
    select: vi.fn((fields?: unknown) => {
      const currentIndex = selectCallIndex++;

      const calls = {
        where: [] as unknown[],
        limit: [] as unknown[],
        orderBy: [] as unknown[],
        innerJoin: [] as unknown[],
        leftJoin: [] as unknown[],
      };
      selectCalls[currentIndex] = calls;

      // Each select() call creates a new chain
      const chain: Record<string, unknown> = {};
      chain.from = vi.fn().mockReturnValue(chain);
      chain.where = vi.fn((...args: unknown[]) => {
        calls.where.push(...args);
        return chain;
      });
      chain.limit = vi.fn((...args: unknown[]) => {
        calls.limit.push(...args);
        return chain;
      });
      chain.orderBy = vi.fn((...args: unknown[]) => {
        calls.orderBy.push(...args);
        return chain;
      });
      chain.innerJoin = vi.fn((...args: unknown[]) => {
        calls.innerJoin.push(...args);
        return chain;
      });
      chain.leftJoin = vi.fn((...args: unknown[]) => {
        calls.leftJoin.push(...args);
        return chain;
      });
      // Make chainable and await-able - return results for this specific select() call
      // biome-ignore lint/suspicious/noThenProperty: the mock must be thenable so `await db.select()...` chains resolve like drizzle's query builder
      chain.then = (resolve: (value: unknown) => unknown) => {
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
    onConflictDoNothing: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    execute: vi.fn().mockResolvedValue([]),

    // Helper to set query results in order
    __setSelectResults: (...results: unknown[][]) => {
      selectResults.length = 0;
      selectResults.push(...results);
      selectCallIndex = 0;
      selectCalls.length = 0;
    },

    /**
     * Per-select() record of the arguments each chain received, in call order.
     * See the note on `selectCalls` above for why this exists.
     */
    __selectCalls: selectCalls,

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
      statusColumnTable: {
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

  for (const method of Object.values(mockDb)) {
    if (typeof method === "function" && "mockClear" in method) {
      method.mockClear();
    }
  }

  // Reset query methods
  for (const table of Object.values(mockDb.query)) {
    for (const method of Object.values(table)) {
      if (typeof method === "function" && "mockClear" in method) {
        method.mockClear();
      }
    }
  }
}
