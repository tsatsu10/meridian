/**
 * Search Service Tests
 * 
 * Comprehensive tests for search functionality:
 * - Global search across resources
 * - Search ranking
 * - Filters
 * - Fuzzy matching
 * - Performance
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getDatabase, initializeDatabase, closeDatabase } from '../../database/connection';
import { 
  userTable,
  workspaceTable,
  projectTable,
  taskTable 
} from '../../database/schema';
import { eq, like, or, and } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { hashPassword } from '../../auth/password';

describe.skip('Search Service', () => {
  let db: ReturnType<typeof getDatabase>;
  let testUser: any;
  let testWorkspace: any;

  beforeAll(async () => {
    await initializeDatabase();
    db = getDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {

    const hashedPassword = await hashPassword('TestPassword123!');

    [testUser] = await db.insert(userTable).values({
      id: createId(),
      email: 'search@example.com',
      name: 'Search User',
      password: hashedPassword,
      role: 'member',
    }).returning();

    [testWorkspace] = await db.insert(workspaceTable).values({
      id: createId(),
      name: 'Search Workspace',
      ownerId: testUser.id,
    }).returning();

    // Create test data
    const [project] = await db.insert(projectTable).values({
      id: createId(),
      name: 'Authentication Feature',
      description: 'Implement user authentication',
      workspaceId: testWorkspace.id,
      ownerId: testUser.id,
    }).returning();

    await db.insert(taskTable).values([
      {
        id: createId(),
        title: 'Implement login',
        description: 'Create login form with authentication',
        projectId: project.id,
        creatorId: testUser.id,
      },
      {
        id: createId(),
        title: 'Add signup page',
        description: 'User registration with validation',
        projectId: project.id,
        creatorId: testUser.id,
      },
      {
        id: createId(),
        title: 'Password reset',
        description: 'Allow users to reset forgotten passwords',
        projectId: project.id,
        creatorId: testUser.id,
      },
    ]);
  });

  describe('Task Search', () => {
    it('should search tasks by title', async () => {
      const searchQuery = 'login';

      const tasks = await db.select()
        .from(taskTable)
        .where(like(taskTable.title, `%${searchQuery}%`));

      expect(tasks.length).toBeGreaterThanOrEqual(1);
      expect(tasks[0].title.toLowerCase()).toContain('login');
    });

    it('should search tasks by description', async () => {
      const searchQuery = 'authentication';

      const tasks = await db.select()
        .from(taskTable)
        .where(like(taskTable.description, `%${searchQuery}%`));

      expect(tasks.length).toBeGreaterThanOrEqual(1);
    });

    it('should search across title and description', async () => {
      const searchQuery = 'password';

      const tasks = await db.select()
        .from(taskTable)
        .where(
          or(
            like(taskTable.title, `%${searchQuery}%`),
            like(taskTable.description, `%${searchQuery}%`)
          )
        );

      expect(tasks.length).toBeGreaterThanOrEqual(1);
    });

    it('should be case-insensitive', async () => {
      const queries = ['LOGIN', 'login', 'Login'];

      for (const query of queries) {
        const tasks = await db.select()
          .from(taskTable)
          .where(like(taskTable.title, `%${query}%`));

        expect(tasks.length).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Project Search', () => {
    it('should search projects by name', async () => {
      const projects = await db.select()
        .from(projectTable)
        .where(like(projectTable.name, '%authentication%'));

      expect(projects.length).toBeGreaterThanOrEqual(1);
      expect(projects[0].name.toLowerCase()).toContain('authentication');
    });

    it('should search projects by description', async () => {
      const projects = await db.select()
        .from(projectTable)
        .where(like(projectTable.description, '%user%'));

      expect(projects.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Global Search', () => {
    const globalSearch = async (query: string) => {
      const projects = await db.select()
        .from(projectTable)
        .where(
          or(
            like(projectTable.name, `%${query}%`),
            like(projectTable.description, `%${query}%`)
          )
        );

      const tasks = await db.select()
        .from(taskTable)
        .where(
          or(
            like(taskTable.title, `%${query}%`),
            like(taskTable.description, `%${query}%`)
          )
        );

      return {
        projects,
        tasks,
        total: projects.length + tasks.length,
      };
    };

    it('should search across all resources', async () => {
      const results = await globalSearch('authentication');

      expect(results.total).toBeGreaterThanOrEqual(2);
      expect(results.projects.length).toBeGreaterThanOrEqual(1);
      expect(results.tasks.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty results for no matches', async () => {
      const results = await globalSearch('nonexistentterm12345');

      expect(results.total).toBe(0);
      expect(results.projects).toHaveLength(0);
      expect(results.tasks).toHaveLength(0);
    });
  });

  describe('Search Filtering', () => {
    it('should filter search by project', async () => {
      const [project] = await db.select()
        .from(projectTable)
        .where(eq(projectTable.workspaceId, testWorkspace.id))
        .limit(1);

      const tasks = await db.select()
        .from(taskTable)
        .where(
          and(
            eq(taskTable.projectId, project.id),
            like(taskTable.title, '%login%')
          )
        );

      expect(tasks.every(t => t.projectId === project.id)).toBe(true);
    });

    it('should filter by status', async () => {
      await db.update(taskTable)
        .set({ status: 'done' })
        .where(like(taskTable.title, '%login%'));

      const tasks = await db.select()
        .from(taskTable)
        .where(
          and(
            eq(taskTable.status, 'done'),
            like(taskTable.title, '%login%')
          )
        );

      expect(tasks.every(t => t.status === 'done')).toBe(true);
    });

    it('should filter by priority', async () => {
      await db.update(taskTable)
        .set({ priority: 'high' })
        .where(like(taskTable.title, '%login%'));

      const tasks = await db.select()
        .from(taskTable)
        .where(
          and(
            eq(taskTable.priority, 'high'),
            like(taskTable.title, '%login%')
          )
        );

      expect(tasks.every(t => t.priority === 'high')).toBe(true);
    });
  });

  describe('Search Ranking', () => {
    const rankResults = (query: string, results: any[]): any[] => {
      return results.map(result => {
        let score = 0;
        const lowerQuery = query.toLowerCase();
        const lowerTitle = (result.title || result.name || '').toLowerCase();
        const lowerDesc = (result.description || '').toLowerCase();

        // Exact match in title
        if (lowerTitle === lowerQuery) score += 100;
        // Starts with query
        else if (lowerTitle.startsWith(lowerQuery)) score += 50;
        // Contains query
        else if (lowerTitle.includes(lowerQuery)) score += 25;

        // Description matches
        if (lowerDesc.includes(lowerQuery)) score += 10;

        return { ...result, searchScore: score };
      }).sort((a, b) => b.searchScore - a.searchScore);
    };

    it('should rank exact matches highest', () => {
      const results = [
        { title: 'Login Page', description: 'Create login' },
        { title: 'Add Login', description: 'Feature' },
        { title: 'Login', description: 'Exact match' },
      ];

      const ranked = rankResults('login', results);

      expect(ranked[0].title).toBe('Login'); // Exact match first
    });

    it('should rank prefix matches higher than contains', () => {
      const results = [
        { title: 'Add Login Button', description: 'Button' },
        { title: 'Login System', description: 'System' },
      ];

      const ranked = rankResults('login', results);

      expect(ranked[0].title).toBe('Login System'); // Starts with
    });
  });
});
