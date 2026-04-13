# Testing Guide

This document explains the testing strategy and how to run different types of tests in the Meridian project.

## Test Types

### 1. Unit Tests
Unit tests test individual components and functions in isolation using mocks.

**Location**: `src/**/__tests__/*.test.tsx` or `src/**/*.test.ts`

**Run with**:
```bash
npm run test:unit
```

**Features**:
- Fast execution
- No external dependencies required
- Uses mocks for API calls and external services
- Runs in CI/CD pipeline

### 2. Integration Tests (Real API)
Integration tests test against the actual running API server without mocks.

**Location**: `src/test/integration/real-tests/**/*.test.ts`

**Run with**:
```bash
# Terminal 1: Start the API server
cd apps/api
npm run dev

# Terminal 2: Run integration tests
cd apps/web
npm run test:integration
```

**Features**:
- Tests real API endpoints
- Requires running API server
- Creates and cleans up test data
- Tests actual database operations
- Validates real WebSocket connections

**Watch mode**:
```bash
npm run test:integration:watch
```

### 3. E2E Tests
End-to-end tests using Playwright to test the full application flow.

**Location**: `e2e/**/*.spec.ts`

**Run with**:
```bash
npm run test:e2e        # Headless mode
npm run test:e2e:ui     # Interactive UI mode
npm run test:e2e:headed # With browser visible
```

## Quick Start

### Running All Tests

```bash
# Run all unit tests (default, fastest)
npm test

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Running Integration Tests

**Prerequisites**:
1. PostgreSQL database running
2. Redis running (optional)
3. API server running on port 3000

**Setup**:
```bash
# 1. Set up environment
cp .env.test .env

# 2. Start services
# Terminal 1: API
cd apps/api
npm run dev

# Terminal 2: Run tests
cd apps/web
npm run test:integration
```

## Test Configuration

### Environment Variables

#### `.env.test` (Web)
```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
RUN_INTEGRATION_TESTS=true
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=TestPassword123!
```

#### `.env.test` (API)
```env
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/meridian_test
NODE_ENV=test
```

### Vitest Configuration

Key settings in `vitest.config.ts`:
- `testTimeout`: 10000ms for integration tests
- `globalSetup`: Checks if API server is running
- Separate patterns for unit vs integration tests

## Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

// Mock API calls
vi.mock('@/hooks/use-data', () => ({
  useData: vi.fn(() => ({
    data: mockData,
    isLoading: false,
  })),
}));

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Integration Test Example

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { waitForServer, createTestUser, getTestConfig } from '../setup/test-server';

describe.skipIf(shouldSkipIntegrationTests())('My Integration Tests', () => {
  let authToken: string;
  const config = getTestConfig();

  beforeAll(async () => {
    await waitForServer();
    const result = await createTestUser('test@example.com', 'password');
    authToken = result.token;
  });

  it('should create a resource', async () => {
    const response = await fetch(`${config.apiUrl}/api/resource`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ name: 'Test' }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.resource.name).toBe('Test');
  });
});
```

## Test Utilities

### Test Server Utilities

Located in `src/test/integration/setup/test-server.ts`:

- `waitForServer()`: Wait for API server to be ready
- `isServerRunning()`: Check if server is running
- `createTestUser(email, password)`: Create and authenticate test user
- `getTestConfig()`: Get test configuration
- `shouldSkipIntegrationTests()`: Check if integration tests should be skipped

### Usage:

```typescript
import {
  waitForServer,
  createTestUser,
  getTestConfig
} from '../setup/test-server';

const config = getTestConfig();
await waitForServer();
const { token, user } = await createTestUser('test@example.com', 'password');
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run test:unit

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run build
      - name: Start API
        run: npm run dev &
        working-directory: apps/api
      - name: Run integration tests
        run: npm run test:integration
        working-directory: apps/web
        env:
          RUN_INTEGRATION_TESTS: true
```

## Troubleshooting

### Integration Tests Failing

**Error**: "API server is not running"
- **Solution**: Start the API server: `cd apps/api && npm run dev`

**Error**: "Connection refused"
- **Solution**: Check that API is running on correct port (default: 3000)
- Check `.env.test` has correct `VITE_API_URL`

**Error**: "Database connection failed"
- **Solution**: Ensure PostgreSQL is running
- Check `DATABASE_URL` in `apps/api/.env.test`

### Tests Timing Out

**Solution**: Increase timeout in test file:
```typescript
it('slow test', async () => {
  // test code
}, 30000); // 30 second timeout
```

Or globally in `vitest.config.ts`:
```typescript
test: {
  testTimeout: 30000,
}
```

### Mock vs Real Tests

**When to use mocks** (Unit tests):
- Testing component logic
- Testing edge cases
- Fast feedback during development
- No external dependencies needed

**When to use real tests** (Integration tests):
- Testing API contracts
- Testing database operations
- Testing WebSocket connections
- Validating full request/response cycle
- Before deploying to production

## Best Practices

1. **Unit tests should be fast** - Use mocks liberally
2. **Integration tests should be comprehensive** - Test happy path and error cases
3. **Clean up test data** - Each test should be independent
4. **Use descriptive test names** - Describe what is being tested
5. **Test user-facing behavior** - Not implementation details
6. **Keep tests simple** - One assertion per test when possible
7. **Use test utilities** - Don't duplicate setup code

## Coverage Goals

- **Unit Tests**: 80%+ coverage
- **Integration Tests**: Cover all critical API endpoints
- **E2E Tests**: Cover main user workflows

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)
