# Task Card E2E Tests - Real End-to-End Testing

## 🎯 What Makes These Tests "Real"?

### ❌ Mock/Unit Tests (task-card.test.tsx):
```typescript
// Mocks everything - nothing is real
vi.mock('@tanstack/react-router')     // Fake navigation
vi.mock('@/lib/permissions')            // Fake permissions
vi.mock('@/store/workspace')            // Fake state
vi.mock('@/store/project')              // Fake data

// What it tests:
✓ Component renders without crashing
✓ Shows "john" when given "john@meridian.app"
✓ Function gets called with right params

// What it DOESN'T test:
✗ Real navigation actually works
✗ Real backend API calls succeed
✗ Real database has correct data
✗ Real user can actually click and navigate
✗ Real drag-and-drop works
✗ Real WebSocket updates work
```

### ✅ E2E Tests (task-card.spec.ts):
```typescript
// Uses REAL everything
✓ Real browser (Chromium/Firefox/Safari)
✓ Real frontend running on localhost:5174
✓ Real backend API on localhost:3000
✓ Real database with real data
✓ Real user authentication
✓ Real mouse clicks and keyboard events
✓ Real navigation between pages
✓ Real WebSocket connections
✓ Real drag-and-drop operations

// What it tests:
✓ Actual user can log in
✓ Actual task cards load from database
✓ Actual clicking navigates to task details
✓ Actual drag-and-drop changes task status
✓ Actual assignee data displays correctly
✓ Actual real-time updates via WebSocket
✓ Actual performance under load
```

## 📋 Test Coverage

### 1. **Task Card Rendering** (7 tests)
- ✅ Displays real task data from database
- ✅ Shows real assignee information
- ✅ Displays real due dates in correct format
- ✅ Shows real priority indicators with colors
- ✅ Displays real subtask counts
- ✅ Handles unassigned tasks gracefully
- ✅ Shows task numbers in correct format (e.g., "TEST-123")

### 2. **Task Card Interactions** (7 tests)
- ✅ Real navigation when clicked
- ✅ Real keyboard navigation (Enter/Space)
- ✅ Real drag handle appears on hover
- ✅ Real expand/collapse of subtasks
- ✅ Real context menu on right-click
- ✅ Real mouse and keyboard events
- ✅ Real focus management

### 3. **Drag and Drop** (2 tests)
- ✅ Real drag-and-drop between columns
- ✅ Real visual feedback during drag
- ✅ Real status updates in backend

### 4. **Accessibility** (3 tests)
- ✅ Real ARIA labels and roles
- ✅ Real keyboard navigation
- ✅ Real focus indicators
- ✅ Real screen reader compatibility

### 5. **Real-time Updates** (1 test)
- ✅ Real WebSocket connections
- ✅ Multi-user real-time collaboration
- ✅ Live status updates across browsers

### 6. **Edge Cases** (3 tests)
- ✅ Very long titles (truncation)
- ✅ Missing due dates
- ✅ Task dependencies

### 7. **Performance** (2 tests)
- ✅ Real load time measurement
- ✅ Performance with many tasks
- ✅ Response time under load

**Total: 25 comprehensive E2E tests**

## 🚀 How to Run

### Prerequisites

1. **Start Backend Server:**
   ```bash
   cd apps/api
   npm run dev
   ```
   Backend should run on `http://localhost:3000`

2. **Start Frontend:**
   ```bash
   cd apps/web
   npm run dev
   ```
   Frontend should run on `http://localhost:5174`

3. **Ensure Test Data Exists:**
   - Test user: `test@example.com` / `password123`
   - At least one project with tasks
   - Database seeded with sample data

### Run All E2E Tests

```bash
cd apps/web

# Run all E2E tests (headless)
npm run test:e2e

# Run only task card E2E tests
npx playwright test task-card.spec.ts

# Run with UI (see browser)
npx playwright test task-card.spec.ts --ui

# Run in headed mode (see browser window)
npx playwright test task-card.spec.ts --headed

# Run in debug mode
npx playwright test task-card.spec.ts --debug
```

### Run Specific Test

```bash
# Run only rendering tests
npx playwright test task-card.spec.ts -g "Task Card Rendering"

# Run only interaction tests
npx playwright test task-card.spec.ts -g "Task Card Interactions"

# Run single test
npx playwright test task-card.spec.ts -g "should navigate to task details when clicked"
```

### View Test Results

```bash
# Generate and open HTML report
npx playwright show-report
```

## 🎭 Test Browsers

Tests run on multiple browsers:
- ✅ Chromium (Chrome, Edge)
- ✅ Firefox
- ✅ WebKit (Safari)
- ✅ Mobile Chrome
- ✅ Mobile Safari

## 📊 Comparison: Mock vs E2E Tests

| Aspect | Mock Tests | E2E Tests |
|--------|-----------|-----------|
| **Speed** | ⚡ Very Fast (200ms) | 🐢 Slower (10-30s) |
| **Reliability** | ⚠️ Can pass when app broken | ✅ Only pass if app works |
| **Setup** | Easy (no deps) | Complex (needs servers) |
| **CI/CD** | ✅ Always works | ⚠️ Needs infrastructure |
| **Debugging** | Easy (simple errors) | Hard (many moving parts) |
| **Real Bugs** | ❌ Misses integration bugs | ✅ Catches real issues |
| **Coverage** | Component logic only | Full user flow |
| **Confidence** | Low | **High** |

## 🎯 When to Use Each

### Use Mock/Unit Tests For:
- Component logic (show/hide, conditional rendering)
- Prop handling
- State management within component
- Edge case handling
- Fast feedback during development

### Use E2E Tests For:
- Critical user flows
- Integration between systems
- Real navigation
- Real API calls
- Real-time features
- Payment flows
- Authentication flows
- **Anything a user actually does**

## 🐛 Debugging Failed Tests

### 1. Test Times Out
```bash
# Increase timeout
npx playwright test task-card.spec.ts --timeout=60000
```

### 2. Can't Find Element
```bash
# Run with UI to see what's happening
npx playwright test task-card.spec.ts --ui
```

### 3. Backend Not Running
```
Error: fetch failed
```
Solution: Start backend server on port 3000

### 4. Authentication Failed
```
Error: Expected URL to match /\/dashboard/
```
Solution: Check test credentials exist in database

## 📈 Continuous Integration

Add to CI/CD pipeline:

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install dependencies
        run: npm ci
      
      - name: Start backend
        run: npm run dev --workspace=@meridian/api &
      
      - name: Start frontend
        run: npm run dev --workspace=@meridian/web &
      
      - name: Wait for servers
        run: npx wait-on http://localhost:3000 http://localhost:5174
      
      - name: Run E2E tests
        run: npx playwright test task-card.spec.ts
      
      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## 🎉 Success Criteria

E2E tests pass = **Your app actually works for real users!**

- ✅ Users can see task cards
- ✅ Users can click and navigate
- ✅ Users can drag and drop tasks
- ✅ Real-time updates work
- ✅ Accessibility is functional
- ✅ Performance is acceptable

## 📚 Further Reading

- [Playwright Documentation](https://playwright.dev/)
- [E2E Testing Best Practices](https://playwright.dev/docs/best-practices)
- [Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)

