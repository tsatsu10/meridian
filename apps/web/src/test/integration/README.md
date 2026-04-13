# Integration Tests

This directory contains real integration tests that test against the actual running API server.

## Structure

```
integration/
├── setup/
│   ├── global-setup.ts      # Global test setup (server check)
│   └── test-server.ts       # Server utilities
└── real-tests/
    ├── auth.integration.test.ts       # Authentication tests
    ├── tasks.integration.test.ts      # Task management tests
    └── websocket.integration.test.ts  # WebSocket tests
```

## Running Integration Tests

### Prerequisites

1. **Start the API server**:
   ```bash
   cd apps/api
   npm run dev
   ```

2. **Ensure database is running**:
   - PostgreSQL should be accessible
   - Redis (optional, but recommended)

3. **Set environment variable**:
   ```bash
   export RUN_INTEGRATION_TESTS=true
   ```

### Run Tests

```bash
# From apps/web directory
npm run test:integration

# Watch mode
npm run test:integration:watch

# With verbose output
npm run test:integration -- --reporter=verbose
```

## Test Categories

### Authentication Tests
**File**: `real-tests/auth.integration.test.ts`

Tests:
- User registration with validation
- User login/logout
- JWT token generation
- Protected endpoint access
- Invalid credentials handling

### Task Management Tests
**File**: `real-tests/tasks.integration.test.ts`

Tests:
- Create, read, update, delete tasks
- Task filtering and search
- Task dependencies
- Task assignments
- Workspace and project creation

### WebSocket Tests
**File**: `real-tests/websocket.integration.test.ts`

Tests:
- WebSocket connection establishment
- Real-time messaging
- Typing indicators
- User presence tracking
- Channel join/leave operations
- Automatic reconnection

## Writing New Integration Tests

### Template

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import {
  waitForServer,
  shouldSkipIntegrationTests,
  createTestUser,
  getTestConfig
} from '../setup/test-server';

const SKIP_TESTS = shouldSkipIntegrationTests();

describe.skipIf(SKIP_TESTS)('My Integration Tests', () => {
  const config = getTestConfig();
  let authToken: string;

  beforeAll(async () => {
    await waitForServer();
    const result = await createTestUser(
      `test-${Date.now()}@example.com`,
      'TestPassword123!'
    );
    authToken = result.token;
  });

  it('should test something', async () => {
    const response = await fetch(`${config.apiUrl}/api/endpoint`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toBeDefined();
  });
});
```

### Best Practices

1. **Always skip when server not running**:
   ```typescript
   const SKIP_TESTS = shouldSkipIntegrationTests();
   describe.skipIf(SKIP_TESTS)('...', () => {});
   ```

2. **Use unique test data**:
   ```typescript
   const email = `test-${Date.now()}@example.com`;
   ```

3. **Clean up after tests**:
   ```typescript
   afterAll(async () => {
     await cleanupTestData(authToken);
   });
   ```

4. **Test both success and failure cases**:
   ```typescript
   it('should succeed with valid data', async () => {});
   it('should fail with invalid data', async () => {});
   ```

5. **Use descriptive test names**:
   ```typescript
   it('should reject registration with duplicate email', async () => {});
   ```

## Debugging

### Enable Verbose Logging

```bash
npm run test:integration -- --reporter=verbose
```

### Run Single Test File

```bash
npm run test:integration -- real-tests/auth.integration.test.ts
```

### Run Single Test

```bash
npm run test:integration -- -t "should register a new user"
```

### Check Server Status

```typescript
import { isServerRunning } from '../setup/test-server';

const running = await isServerRunning();
console.log('Server running:', running);
```

## Common Issues

### "API server is not running"

**Solution**:
1. Start API: `cd apps/api && npm run dev`
2. Verify it's running: `curl http://localhost:3000/health`

### "Connection refused"

**Solution**:
- Check API is on correct port (default: 3000)
- Check `.env.test` has correct `VITE_API_URL`
- Ensure no firewall blocking localhost

### "Tests timeout"

**Solution**:
- Increase timeout:
  ```typescript
  it('slow test', async () => {
    // test
  }, 30000); // 30 seconds
  ```
- Check API response time
- Verify database is responding

### "Database errors"

**Solution**:
- Ensure PostgreSQL is running
- Check connection string in `apps/api/.env.test`
- Run migrations: `cd apps/api && npm run db:migrate`

## CI/CD Integration

Integration tests can be run in CI/CD with proper setup:

```yaml
- name: Start PostgreSQL
  uses: docker://postgres:15

- name: Start API server
  run: |
    cd apps/api
    npm run dev &
    sleep 5

- name: Run integration tests
  run: |
    cd apps/web
    npm run test:integration
  env:
    RUN_INTEGRATION_TESTS: true
```

## Performance

Integration tests are slower than unit tests because they:
- Make real HTTP requests
- Query actual database
- Establish WebSocket connections

**Typical execution times**:
- Auth tests: ~5-10 seconds
- Task tests: ~10-15 seconds
- WebSocket tests: ~15-20 seconds

**Optimization tips**:
- Reuse auth tokens across tests
- Run tests in parallel where possible
- Use test database with minimal data
- Clean up test data efficiently

## Test Data Management

### Creating Test Data

```typescript
const user = await createTestUser('test@example.com', 'password');
const workspace = await createTestWorkspace(user.token);
const project = await createTestProject(user.token, workspace.id);
```

### Cleaning Up

```typescript
afterAll(async () => {
  // Delete test resources
  await deleteTestProject(authToken, projectId);
  await deleteTestWorkspace(authToken, workspaceId);
});
```

### Isolation

Each test should be independent:
- Use unique IDs/emails
- Don't rely on test execution order
- Clean up or use transactions
