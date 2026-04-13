/**
 * Test data factories for creating test fixtures
 */

import { createId } from '@paralleldrive/cuid2';
import type { NewUser, NewWorkspace, NewProject, NewTask } from '../database/schema';

export const userFactory = {
  build: (overrides?: Partial<NewUser>): NewUser => ({
    id: createId(),
    email: `test-${Date.now()}@example.com`,
    name: 'Test User',
    password: '$argon2id$v=19$m=65536,t=3,p=4$testhashedpassword', // Pre-hashed for testing
    role: 'member',
    avatar: null,
    timezone: 'UTC',
    language: 'en',
    isEmailVerified: true,
    twoFactorEnabled: false,
    ...overrides,
  }),

  buildMany: (count: number, overrides?: Partial<NewUser>): NewUser[] => {
    return Array.from({ length: count }, (_, i) => 
      userFactory.build({ 
        email: `test-${Date.now()}-${i}@example.com`,
        name: `Test User ${i + 1}`,
        ...overrides 
      })
    );
  },
};

export const workspaceFactory = {
  build: (overrides?: Partial<NewWorkspace>): NewWorkspace => ({
    id: createId(),
    name: `Test Workspace ${Date.now()}`,
    description: 'A test workspace',
    ownerId: '', // Must be set by caller
    slug: `test-workspace-${Date.now()}`,
    logo: null,
    settings: {},
    isActive: true,
    ...overrides,
  }),

  buildMany: (count: number, overrides?: Partial<NewWorkspace>): NewWorkspace[] => {
    return Array.from({ length: count }, (_, i) => 
      workspaceFactory.build({ 
        name: `Test Workspace ${Date.now()}-${i}`,
        slug: `test-workspace-${Date.now()}-${i}`,
        ...overrides 
      })
    );
  },
};

export const projectFactory = {
  build: (overrides?: Partial<any>): any => ({
    id: createId(),
    name: `Test Project ${Date.now()}`,
    description: 'A test project',
    workspaceId: '', // Must be set by caller
    ownerId: '', // Must be set by caller
    status: 'active',
    priority: 'medium',
    startDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    settings: {},
    ...overrides,
  }),

  buildMany: (count: number, overrides?: Partial<any>): any[] => {
    return Array.from({ length: count }, (_, i) => 
      projectFactory.build({ 
        name: `Test Project ${Date.now()}-${i}`,
        ...overrides 
      })
    );
  },
};

export const taskFactory = {
  build: (overrides?: Partial<any>): any => ({
    id: createId(),
    title: `Test Task ${Date.now()}`,
    description: 'A test task',
    projectId: '', // Must be set by caller
    assigneeId: null,
    creatorId: '', // Must be set by caller
    status: 'todo',
    priority: 'medium',
    dueDate: null,
    estimatedHours: null,
    actualHours: null,
    tags: [],
    dependencies: [],
    ...overrides,
  }),

  buildMany: (count: number, overrides?: Partial<any>): any[] => {
    return Array.from({ length: count }, (_, i) => 
      taskFactory.build({ 
        title: `Test Task ${Date.now()}-${i}`,
        ...overrides 
      })
    );
  },
};

/**
 * Helper to create a complete test scenario with user, workspace, project, and tasks
 */
export async function createTestScenario(db: any) {
  const user = userFactory.build();
  const workspace = workspaceFactory.build({ ownerId: user.id });
  const project = projectFactory.build({ 
    workspaceId: workspace.id,
    ownerId: user.id 
  });
  const tasks = taskFactory.buildMany(3, { 
    projectId: project.id,
    creatorId: user.id 
  });

  return {
    user,
    workspace,
    project,
    tasks,
  };
}

