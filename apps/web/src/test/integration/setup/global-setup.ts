/**
 * Global Integration Test Setup
 * Runs before all integration tests to ensure the API server is ready
 */

import { waitForServer, shouldSkipIntegrationTests } from './test-server';

export default async function globalSetup() {
  // Skip if integration tests are disabled
  if (shouldSkipIntegrationTests()) {
    console.log('⏭️  Skipping integration test setup (integration tests disabled)');
    return;
  }

  console.log('🚀 Setting up integration tests...');

  try {
    // Wait for API server to be ready
    await waitForServer();

    console.log('✅ Integration test setup complete');
  } catch (error) {
    console.error('❌ Integration test setup failed:', error);
    console.error(
      '\n' +
      '  To run integration tests, you need to:\n' +
      '  1. Start the API server: cd apps/api && npm run dev\n' +
      '  2. Set RUN_INTEGRATION_TESTS=true in your environment\n' +
      '  3. Run tests: npm run test:integration\n'
    );
    throw error;
  }
}
