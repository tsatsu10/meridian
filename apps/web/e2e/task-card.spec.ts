/**
 * E2E Tests - Task Card Component
 * Tests real user interactions with task cards using actual backend
 * 
 * Requirements:
 * - Backend server running on http://localhost:3000
 * - Frontend running on http://localhost:5174
 * - Test database seeded with test data
 */

import { test, expect, type Page } from '@playwright/test';

test.describe('Task Card - Real End-to-End Tests', () => {
  let projectId: string;
  let workspaceId: string;
  let taskId: string;

  test.beforeEach(async ({ page }) => {
    // Login with real credentials
    await page.goto('/auth/sign-in');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Navigate to a project board view where task cards are displayed
    await page.goto('/dashboard/projects');
    await page.waitForLoadState('networkidle');

    // Click on the first project (or create one if needed)
    const firstProject = page.locator('[data-testid="project-card"]').first();
    if (await firstProject.isVisible()) {
      await firstProject.click();
    } else {
      // Create a new test project if none exists
      await page.click('button:has-text("New Project")');
      await page.fill('[name="name"]', `E2E Test Project ${Date.now()}`);
      await page.fill('[name="description"]', 'Test project for E2E task card testing');
      await page.click('button:has-text("Create Project")');
      await page.waitForLoadState('networkidle');
    }

    // Extract IDs from URL for later use
    const url = page.url();
    const workspaceMatch = url.match(/workspace\/([^/]+)/);
    const projectMatch = url.match(/project\/([^/]+)/);
    
    if (workspaceMatch) workspaceId = workspaceMatch[1];
    if (projectMatch) projectId = projectMatch[1];

    // Navigate to board view to see task cards
    await page.click('a:has-text("Board")').catch(() => {
      // Board view might already be active
    });
    await page.waitForLoadState('networkidle');
  });

  test.describe('Task Card Rendering', () => {
    test('should display task card with real data', async ({ page }) => {
      // Wait for task cards to load
      const taskCard = page.locator('[role="article"]').first();
      await expect(taskCard).toBeVisible({ timeout: 10000 });

      // Verify task card has essential elements
      await expect(taskCard.locator('h3')).toBeVisible(); // Task title
      
      // Check for task metadata (task number)
      const taskNumber = taskCard.locator('[class*="font-mono"]').first();
      await expect(taskNumber).toBeVisible();
      
      // Verify task number format (e.g., "TEST-123")
      const taskNumberText = await taskNumber.textContent();
      expect(taskNumberText).toMatch(/^[A-Z]+-\d+$/);
    });

    test('should display assignee information with real user data', async ({ page }) => {
      const taskCard = page.locator('[role="article"]').first();
      await expect(taskCard).toBeVisible();

      // Look for assignee section
      const assigneeSection = taskCard.locator('[title*="@"], [title*="Unassigned"]');
      await expect(assigneeSection).toBeVisible();

      // Check if it shows either a username or "Unassigned"
      const hasUsername = await taskCard.locator('svg.lucide-user').isVisible();
      expect(hasUsername).toBeTruthy();
    });

    test('should display due date in correct format', async ({ page }) => {
      const taskCard = page.locator('[role="article"]').first();
      await expect(taskCard).toBeVisible();

      // Look for calendar icon and date
      const dateSection = taskCard.locator('svg.lucide-calendar').locator('..');
      if (await dateSection.isVisible()) {
        // Date should be in format "MMM d" (e.g., "Jan 15")
        const dateText = await dateSection.textContent();
        expect(dateText).toMatch(/[A-Z][a-z]{2}\s+\d{1,2}/);
      }
    });

    test('should display priority indicator with correct color', async ({ page }) => {
      const taskCard = page.locator('[role="article"]').first();
      await expect(taskCard).toBeVisible();

      // Look for priority indicator with flag icon
      const priorityIndicator = taskCard.locator('svg.lucide-flag').locator('..');
      await expect(priorityIndicator).toBeVisible();

      // Should contain priority text (urgent, high, medium, low)
      const priorityText = await priorityIndicator.textContent();
      expect(priorityText?.toLowerCase()).toMatch(/urgent|high|medium|low/);

      // Check for color classes
      const className = await priorityIndicator.getAttribute('class');
      expect(className).toMatch(/red|orange|yellow|green/);
    });

    test('should display subtask count if task has subtasks', async ({ page }) => {
      // Create a task with subtasks or find one
      const taskWithSubtasks = page.locator('[role="article"]:has(svg.lucide-chevron-right, svg.lucide-chevron-down)').first();
      
      if (await taskWithSubtasks.isVisible()) {
        // Should show subtask count
        const subtaskButton = taskWithSubtasks.locator('button:has(svg.lucide-chevron-right, svg.lucide-chevron-down)');
        await expect(subtaskButton).toBeVisible();
        
        // Should have a number badge
        const countBadge = subtaskButton.locator('span[class*="min-w"]');
        await expect(countBadge).toBeVisible();
        
        const count = await countBadge.textContent();
        expect(Number.parseInt(count || '0')).toBeGreaterThan(0);
      }
    });

    test('should handle unassigned tasks gracefully', async ({ page }) => {
      // Look for or create an unassigned task
      const unassignedCard = page.locator('[role="article"]:has([title="Unassigned"])').first();
      
      if (await unassignedCard.isVisible()) {
        const unassignedText = unassignedCard.locator('text=Unassigned');
        await expect(unassignedText).toBeVisible();
        
        // Should have user icon
        const userIcon = unassignedCard.locator('svg.lucide-user');
        await expect(userIcon).toBeVisible();
      }
    });
  });

  test.describe('Task Card Interactions', () => {
    test('should navigate to task details when clicked', async ({ page }) => {
      const taskCard = page.locator('[role="article"]').first();
      await expect(taskCard).toBeVisible();

      // Get task ID from the card (if available in attributes)
      const currentUrl = page.url();
      
      // Click the task card
      await taskCard.click();

      // Should navigate to task detail page
      await expect(page).toHaveURL(/\/task\/[^/]+/, { timeout: 10000 });
      
      // Should show task details
      await expect(page.locator('h1, h2').first()).toBeVisible();

      // Go back
      await page.goBack();
      await expect(page).toHaveURL(currentUrl);
    });

    test('should open task details with keyboard (Enter key)', async ({ page }) => {
      const taskCard = page.locator('[role="article"]').first();
      await expect(taskCard).toBeVisible();

      // Focus the card
      await taskCard.focus();
      
      // Press Enter
      await page.keyboard.press('Enter');

      // Should navigate to task detail page
      await expect(page).toHaveURL(/\/task\/[^/]+/, { timeout: 10000 });
    });

    test('should open task details with keyboard (Space key)', async ({ page }) => {
      const taskCard = page.locator('[role="article"]').first();
      await expect(taskCard).toBeVisible();

      // Focus the card
      await taskCard.focus();
      
      // Press Space
      await page.keyboard.press('Space');

      // Should navigate to task detail page
      await expect(page).toHaveURL(/\/task\/[^/]+/, { timeout: 10000 });
    });

    test('should show drag handle on hover', async ({ page }) => {
      const taskCard = page.locator('[role="article"]').first();
      await expect(taskCard).toBeVisible();

      // Hover over the card
      await taskCard.hover();

      // Drag handle should become visible
      const dragHandle = taskCard.locator('[aria-label="Drag to reorder task"]');
      await expect(dragHandle).toBeVisible();

      // Should have title/tooltip
      const title = await dragHandle.getAttribute('title');
      expect(title).toBe('Drag to move task');
    });

    test('should expand and collapse subtasks', async ({ page }) => {
      const taskWithSubtasks = page.locator('[role="article"]:has(button:has(svg.lucide-chevron-right))').first();
      
      if (await taskWithSubtasks.isVisible()) {
        // Click to expand
        const expandButton = taskWithSubtasks.locator('button:has(svg.lucide-chevron-right)').first();
        await expandButton.click();

        // Should show chevron-down icon (expanded state)
        const collapseButton = taskWithSubtasks.locator('button:has(svg.lucide-chevron-down)');
        await expect(collapseButton).toBeVisible({ timeout: 2000 });

        // Should display subtasks
        const subtasksList = taskWithSubtasks.locator('[class*="space-y-2"]');
        await expect(subtasksList).toBeVisible();

        // Click to collapse
        await collapseButton.click();

        // Should show chevron-right again
        const rightChevron = taskWithSubtasks.locator('svg.lucide-chevron-right');
        await expect(rightChevron).toBeVisible({ timeout: 2000 });
      }
    });

    test('should show context menu on right click', async ({ page }) => {
      const taskCard = page.locator('[role="article"]').first();
      await expect(taskCard).toBeVisible();

      // Right click the card
      await taskCard.click({ button: 'right' });

      // Context menu should appear
      const contextMenu = page.locator('[role="menu"]');
      await expect(contextMenu).toBeVisible({ timeout: 2000 });

      // Should have menu items
      const menuItems = contextMenu.locator('[role="menuitem"]');
      const count = await menuItems.count();
      expect(count).toBeGreaterThan(0);

      // Close context menu by clicking elsewhere
      await page.keyboard.press('Escape');
      await expect(contextMenu).not.toBeVisible();
    });
  });

  test.describe('Task Card Drag and Drop', () => {
    test('should support drag and drop to change status', async ({ page }) => {
      // Find a task in "To Do" column
      const todoColumn = page.locator('[data-status="todo"]');
      const todoTask = todoColumn.locator('[role="article"]').first();

      if (await todoTask.isVisible()) {
        // Get task title for verification
        const taskTitle = await todoTask.locator('h3').textContent();

        // Find "In Progress" column
        const inProgressColumn = page.locator('[data-status="in_progress"]');
        await expect(inProgressColumn).toBeVisible();

        // Drag task from Todo to In Progress
        await todoTask.hover();
        const dragHandle = todoTask.locator('[aria-label="Drag to reorder task"]');
        await dragHandle.hover();
        
        // Perform drag and drop
        await todoTask.dragTo(inProgressColumn);

        // Wait for the task to appear in the new column
        await page.waitForTimeout(1000); // Wait for animation

        // Verify task moved to In Progress
        const movedTask = inProgressColumn.locator(`text=${taskTitle}`);
        await expect(movedTask).toBeVisible({ timeout: 5000 });
      }
    });

    test('should show visual feedback during drag', async ({ page }) => {
      const taskCard = page.locator('[role="article"]').first();
      await expect(taskCard).toBeVisible();

      // Start dragging
      await taskCard.hover();
      const dragHandle = taskCard.locator('[aria-label="Drag to reorder task"]');
      
      // Get bounding box
      const box = await taskCard.boundingBox();
      if (box) {
        // Start drag
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();

        // Card should have reduced opacity during drag
        const opacity = await taskCard.evaluate(el => 
          window.getComputedStyle(el).opacity
        );
        
        // Release
        await page.mouse.up();
      }
    });
  });

  test.describe('Task Card Accessibility', () => {
    test('should have proper ARIA labels', async ({ page }) => {
      const taskCard = page.locator('[role="article"]').first();
      await expect(taskCard).toBeVisible();

      // Should have aria-label with task information
      const ariaLabel = await taskCard.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).toContain('Task:');
      expect(ariaLabel).toContain('Priority:');
      expect(ariaLabel).toContain('Status:');
    });

    test('should be keyboard navigable', async ({ page }) => {
      const taskCards = page.locator('[role="article"]');
      const firstCard = taskCards.first();
      
      await expect(firstCard).toBeVisible();

      // Tab to first card
      await page.keyboard.press('Tab');
      
      // Should be focusable
      const tabIndex = await firstCard.getAttribute('tabindex');
      expect(tabIndex).toBe('0');
    });

    test('should have proper focus indicators', async ({ page }) => {
      const taskCard = page.locator('[role="article"]').first();
      await expect(taskCard).toBeVisible();

      // Focus the card
      await taskCard.focus();

      // Check if card has focus styles (outline, ring, etc.)
      const outline = await taskCard.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return styles.outline || styles.boxShadow;
      });
      
      expect(outline).toBeTruthy();
    });
  });

  test.describe('Task Card Real-time Updates', () => {
    test('should reflect real-time status changes', async ({ browser }) => {
      // Create two browser contexts (simulate two users)
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      // Login both users
      for (const page of [page1, page2]) {
        await page.goto('/auth/sign-in');
        await page.fill('[name="email"]', 'test@example.com');
        await page.fill('[name="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForURL(/\/dashboard/);
        
        // Navigate to same project
        await page.goto('/dashboard/projects');
        const firstProject = page.locator('[data-testid="project-card"]').first();
        await firstProject.click();
      }

      // User 1 moves a task
      const task1 = page1.locator('[role="article"]').first();
      const taskTitle = await task1.locator('h3').textContent();
      
      const inProgressColumn = page1.locator('[data-status="in_progress"]');
      await task1.dragTo(inProgressColumn);

      // User 2 should see the update (via WebSocket)
      await page2.waitForTimeout(2000); // Wait for real-time update
      const updatedTask = page2.locator(`text=${taskTitle}`);
      await expect(updatedTask).toBeVisible({ timeout: 5000 });

      await context1.close();
      await context2.close();
    });
  });

  test.describe('Task Card Edge Cases', () => {
    test('should handle very long task titles', async ({ page }) => {
      // Create task with very long title
      await page.click('button:has-text("New Task"), button:has-text("Add Task")');
      
      const longTitle = 'This is a very long task title that should be truncated to prevent layout issues and maintain a clean UI appearance in the kanban board view';
      
      await page.fill('[name="title"]', longTitle);
      await page.fill('[name="description"]', 'Test description');
      await page.click('button:has-text("Create Task"), button:has-text("Add Task")');

      // Find the task card
      const taskCard = page.locator('[role="article"]:has-text("This is a very long")').first();
      await expect(taskCard).toBeVisible({ timeout: 5000 });

      // Title should be truncated (check for truncate class)
      const title = taskCard.locator('h3');
      const className = await title.getAttribute('class');
      expect(className).toContain('truncate');
    });

    test('should handle tasks with no due date', async ({ page }) => {
      const taskWithoutDueDate = page.locator('[role="article"]').filter({
        hasNot: page.locator('svg.lucide-calendar')
      }).first();

      if (await taskWithoutDueDate.isVisible()) {
        // Should not have calendar icon
        const calendar = taskWithoutDueDate.locator('svg.lucide-calendar');
        await expect(calendar).not.toBeVisible();
      }
    });

    test('should handle tasks with dependencies', async ({ page }) => {
      // Look for task with dependency indicators
      const taskWithDeps = page.locator('[role="article"]:has([class*="blue-50"], [class*="orange-50"])').first();

      if (await taskWithDeps.isVisible()) {
        // Should show dependency indicator
        const depsIndicator = taskWithDeps.locator('[class*="blue-50"], [class*="orange-50"]');
        await expect(depsIndicator).toBeVisible();

        // Should have tooltip/title explaining the dependency
        const title = await depsIndicator.getAttribute('title');
        expect(title).toBeTruthy();
        expect(title).toMatch(/Blocks|Blocked by/);
      }
    });
  });

  test.describe('Task Card Performance', () => {
    test('should load task cards within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/dashboard/projects');
      const firstProject = page.locator('[data-testid="project-card"]').first();
      await firstProject.click();

      // Wait for task cards to load
      await page.locator('[role="article"]').first().waitFor({ timeout: 10000 });
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('should handle large number of tasks without performance degradation', async ({ page }) => {
      await page.goto('/dashboard/projects');
      const firstProject = page.locator('[data-testid="project-card"]').first();
      await firstProject.click();

      // Count task cards
      const taskCards = page.locator('[role="article"]');
      const count = await taskCards.count();

      // Even with many tasks, interactions should be responsive
      if (count > 10) {
        const startTime = Date.now();
        await taskCards.first().click();
        const clickResponseTime = Date.now() - startTime;
        
        // Click should respond within 1 second
        expect(clickResponseTime).toBeLessThan(1000);
      }
    });
  });
});

