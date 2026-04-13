/**
 * Task Management Flow E2E Tests
 * 
 * End-to-end tests for task operations:
 * - Create tasks
 * - Edit tasks
 * - Move tasks between columns
 * - Assign tasks
 * - Complete tasks
 */

import { test, expect } from '@playwright/test';

test.describe('Task Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Assume user is authenticated
    await page.goto('/dashboard');
  });

  test.describe('Create Task', () => {
    test('should create new task', async ({ page }) => {
      await page.click('button:has-text("New Task")');

      await page.fill('[name="title"]', 'Implement new feature');
      await page.fill('[name="description"]', 'Feature description');
      await page.selectOption('[name="priority"]', 'high');
      await page.click('button[type="submit"]');

      // Task should appear in list
      await expect(page.locator('text=Implement new feature')).toBeVisible();
    });

    test('should create task with assignee', async ({ page }) => {
      await page.click('button:has-text("New Task")');

      await page.fill('[name="title"]', 'Assigned task');
      await page.click('[name="assignee"]');
      await page.click('text=John Doe');
      await page.click('button[type="submit"]');

      await expect(page.locator('text=Assigned task')).toBeVisible();
    });
  });

  test.describe('Edit Task', () => {
    test('should edit existing task', async ({ page }) => {
      // Click on existing task
      await page.click('text=Existing task');

      // Edit button
      await page.click('button:has-text("Edit")');

      // Update title
      const titleInput = page.locator('[name="title"]');
      await titleInput.clear();
      await titleInput.fill('Updated task title');
      
      await page.click('button:has-text("Save")');

      await expect(page.locator('text=Updated task title')).toBeVisible();
    });
  });

  test.describe('Move Task', () => {
    test('should move task to different column', async ({ page }) => {
      // Drag task from todo to in progress
      const task = page.locator('[data-task-id="task-1"]');
      const targetColumn = page.locator('[data-column="in_progress"]');

      await task.dragTo(targetColumn);

      // Verify task moved
      await expect(targetColumn.locator('text=task-1')).toBeVisible();
    });

    test('should update task status when moved', async ({ page }) => {
      await page.click('[data-task-id="task-1"]');

      // Should show new status
      await expect(page.locator('text=In Progress')).toBeVisible();
    });
  });

  test.describe('Assign Task', () => {
    test('should assign task to user', async ({ page }) => {
      await page.click('[data-task-id="task-1"]');
      await page.click('button:has-text("Assign")');
      await page.click('text=John Doe');

      await expect(page.locator('text=John Doe')).toBeVisible();
    });

    test('should reassign task', async ({ page }) => {
      await page.click('[data-task-id="task-1"]');
      await page.click('[aria-label="Change assignee"]');
      await page.click('text=Jane Smith');

      await expect(page.locator('text=Jane Smith')).toBeVisible();
    });
  });

  test.describe('Complete Task', () => {
    test('should mark task as complete', async ({ page }) => {
      // Move to done column or click complete
      await page.click('[data-task-id="task-1"]');
      await page.click('button:has-text("Mark Complete")');

      // Should show completion checkmark
      await expect(page.locator('[data-task-id="task-1"] [data-completed="true"]')).toBeVisible();
    });

    test('should set completion timestamp', async ({ page }) => {
      await page.click('[data-task-id="task-1"]');

      // Should show "Completed X minutes ago"
      await expect(page.locator('text=/completed.*ago/i')).toBeVisible();
    });
  });

  test.describe('Task Dependencies', () => {
    test('should add task dependency', async ({ page }) => {
      await page.click('[data-task-id="task-1"]');
      await page.click('button:has-text("Add Dependency")');
      await page.click('[data-task-suggestion="task-2"]');

      await expect(page.locator('text=Depends on: task-2')).toBeVisible();
    });

    test('should show blocked status', async ({ page }) => {
      // Task should show blocked indicator if dependency not complete
      await expect(page.locator('[data-task-id="task-1"][data-blocked="true"]')).toBeVisible();
    });
  });

  test.describe('Task Comments', () => {
    test('should add comment to task', async ({ page }) => {
      await page.click('[data-task-id="task-1"]');
      await page.fill('[name="comment"]', 'This is a test comment');
      await page.click('button:has-text("Add Comment")');

      await expect(page.locator('text=This is a test comment')).toBeVisible();
    });
  });

  test.describe('Task Time Tracking', () => {
    test('should start time tracking', async ({ page }) => {
      await page.click('[data-task-id="task-1"]');
      await page.click('button:has-text("Start Timer")');

      // Timer should be running
      await expect(page.locator('[data-timer-active="true"]')).toBeVisible();
    });

    test('should stop time tracking', async ({ page }) => {
      await page.click('[data-task-id="task-1"]');
      await page.click('button:has-text("Stop Timer")');

      // Should show tracked time
      await expect(page.locator('text=/tracked.*time/i')).toBeVisible();
    });
  });
});

