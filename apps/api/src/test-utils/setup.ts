/**
 * Global test setup and utilities
 */

import { beforeAll, afterAll, afterEach } from 'vitest';
import { getDatabase } from '../database/connection';
import { sql } from 'drizzle-orm';

let testDb: ReturnType<typeof getDatabase>;

// Setup test database connection
beforeAll(async () => {
  try {
    const { initializeDatabase } = await import('../database/connection');
    await initializeDatabase();
    testDb = getDatabase();
    console.log('✅ Test database initialized');
  } catch (error) {
    console.error('❌ Failed to initialize test database:', error);
    throw error;
  }
});

// Clean up after all tests
afterAll(async () => {
  try {
    const { closeDatabase } = await import('../database/connection');
    await closeDatabase();
    console.log('✅ Test database closed');
  } catch (error) {
    console.error('❌ Failed to close test database:', error);
  }
});

// Clean up after each test
afterEach(async () => {
  // Optional: Clean up test data after each test
  // This prevents test pollution but may slow down tests
});

export { testDb };

