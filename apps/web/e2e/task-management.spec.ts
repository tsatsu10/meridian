import { test, expect } from '@playwright/test';

test.describe('Task Management', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in before each test
    await page.goto('/');
    await page.fill('input[type="email"]', 'admin@meridian.app');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should create a new task', async ({ page }) => {
    await page.goto('/dashboard/all-tasks');
    
    // Click create task button
    await page.click('button:has-text("New Task")');
    
    // Fill in task details
    await page.fill('input[name="title"]', 'E2E Test Task');
    await page.fill('textarea[name="description"]', 'Created by E2E test');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Verify task appears
    await expect(page.locator('text=E2E Test Task')).toBeVisible({ timeout: 5000 });
  });

  test('should navigate between kanban and list views', async ({ page }) => {
    await page.goto('/dashboard/all-tasks');
    
    // Check kanban view
    await page.click('text=Kanban');
    await expect(page.locator('[data-testid="kanban-board"]')).toBeVisible();
    
    // Switch to list view
    await page.click('text=List');
    await expect(page.locator('[data-testid="task-list"]')).toBeVisible();
  });
});
