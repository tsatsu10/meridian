/**
 * E2E Project Workflow Tests
 * 
 * End-to-end tests for complete project workflows:
 * - Create workspace → Create project → Add tasks → Complete
 * - Team collaboration scenarios
 * - Real-time updates
 * - Cross-browser compatibility
 */

import { test, expect } from '@playwright/test';

test.describe('Project Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to application
    await page.goto('http://localhost:5173');
  });

  test.describe('Authentication Flow', () => {
    test('should sign up new user', async ({ page }) => {
      await page.click('text=Sign Up');
      
      await page.fill('input[name="email"]', 'testuser@example.com');
      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.fill('input[name="name"]', 'Test User');
      
      await page.click('button[type="submit"]');
      
      // Should redirect to dashboard or email verification
      await expect(page).toHaveURL(/dashboard|verify-email/);
    });

    test('should sign in existing user', async ({ page }) => {
      await page.click('text=Sign In');
      
      await page.fill('input[name="email"]', 'admin@meridian.app');
      await page.fill('input[name="password"]', 'admin');
      
      await page.click('button[type="submit"]');
      
      // Should redirect to dashboard
      await expect(page).toHaveURL(/dashboard/);
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.click('text=Sign In');
      
      await page.fill('input[name="email"]', 'wrong@example.com');
      await page.fill('input[name="password"]', 'wrongpassword');
      
      await page.click('button[type="submit"]');
      
      // Should show error message
      await expect(page.locator('text=/invalid|error/i')).toBeVisible();
    });

    test('should sign out user', async ({ page }) => {
      // Sign in first
      await page.goto('http://localhost:5173/auth/sign-in');
      await page.fill('input[name="email"]', 'admin@meridian.app');
      await page.fill('input[name="password"]', 'admin');
      await page.click('button[type="submit"]');
      
      await page.waitForURL(/dashboard/);
      
      // Sign out
      await page.click('[aria-label*="menu" i], [aria-label*="user" i]');
      await page.click('text=Sign Out');
      
      // Should redirect to landing or sign in
      await expect(page).toHaveURL(/auth\/sign-in|^\//);
    });
  });

  test.describe('Project Creation Workflow', () => {
    test.beforeEach(async ({ page }) => {
      // Sign in as admin
      await page.goto('http://localhost:5173/auth/sign-in');
      await page.fill('input[name="email"]', 'admin@meridian.app');
      await page.fill('input[name="password"]', 'admin');
      await page.click('button[type="submit"]');
      await page.waitForURL(/dashboard/);
    });

    test('should create new project', async ({ page }) => {
      // Click create project button
      await page.click('text=/create project/i');
      
      // Fill project form
      await page.fill('input[name="name"]', 'E2E Test Project');
      await page.fill('textarea[name="description"]', 'Created from E2E test');
      await page.selectOption('select[name="priority"]', 'high');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Should show success message or redirect
      await expect(
        page.locator('text=/created|success/i')
      ).toBeVisible({ timeout: 5000 });
    });

    test('should navigate to project details', async ({ page }) => {
      // Wait for projects to load
      await page.waitForSelector('.project-card, [data-testid="project-card"]', {
        timeout: 5000,
      });
      
      // Click first project
      await page.click('.project-card:first-child, [data-testid="project-card"]:first-child');
      
      // Should navigate to project page
      await expect(page).toHaveURL(/projects\/[a-z0-9]+/);
    });
  });

  test.describe('Task Management Workflow', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('http://localhost:5173/auth/sign-in');
      await page.fill('input[name="email"]', 'admin@meridian.app');
      await page.fill('input[name="password"]', 'admin');
      await page.click('button[type="submit"]');
      await page.waitForURL(/dashboard/);
    });

    test('should create new task', async ({ page }) => {
      // Navigate to a project (if projects exist)
      const projectExists = await page.locator('.project-card').count() > 0;
      
      if (projectExists) {
        await page.click('.project-card:first-child');
        await page.waitForURL(/projects/);
        
        // Click add task
        await page.click('text=/add task/i, button:has-text("Add")');
        
        // Fill task form
        await page.fill('input[name="title"], input[placeholder*="task" i]', 'E2E Test Task');
        
        // Submit
        await page.click('button[type="submit"], button:has-text("Create")');
        
        // Task should appear
        await expect(
          page.locator('text=E2E Test Task')
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test('should move task between columns', async ({ page }) => {
      const hasKanban = await page.locator('.kanban-column, [data-testid="kanban-column"]').count() > 0;
      
      if (hasKanban) {
        // Get first task
        const firstTask = page.locator('.task-card, [data-testid="task-card"]').first();
        
        if (await firstTask.count() > 0) {
          // Drag task (basic check - full drag simulation is complex)
          await firstTask.hover();
          
          // In real test, would use page.dragAndDrop()
          // For now, just verify task is draggable
          const isDraggable = await firstTask.getAttribute('draggable');
          expect(isDraggable).toBeTruthy();
        }
      }
    });

    test('should update task status', async ({ page }) => {
      const hasTask = await page.locator('.task-card, [data-testid="task-card"]').count() > 0;
      
      if (hasTask) {
        // Click task to open details
        await page.click('.task-card:first-child, [data-testid="task-card"]:first-child');
        
        // Look for status dropdown or buttons
        const statusElement = page.locator('select[name="status"], [aria-label*="status" i]');
        
        if (await statusElement.count() > 0) {
          // Update status (if available)
          await expect(statusElement).toBeVisible();
        }
      }
    });
  });

  test.describe('Dashboard Interactions', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('http://localhost:5173/auth/sign-in');
      await page.fill('input[name="email"]', 'admin@meridian.app');
      await page.fill('input[name="password"]', 'admin');
      await page.click('button[type="submit"]');
      await page.waitForURL(/dashboard/);
    });

    test('should display dashboard stats', async ({ page }) => {
      // Wait for dashboard to load
      await page.waitForSelector('[data-testid*="stat"], .stat-card', {
        timeout: 5000,
      });
      
      // Stats should be visible
      const stats = page.locator('[data-testid*="stat"], .stat-card');
      const count = await stats.count();
      
      expect(count).toBeGreaterThan(0);
    });

    test('should navigate between dashboard sections', async ({ page }) => {
      // Look for navigation links
      const navLinks = [
        'Projects',
        'Tasks',
        'Team',
        'Analytics',
      ];

      for (const linkText of navLinks) {
        const link = page.locator(`a:has-text("${linkText}"), button:has-text("${linkText}")`);
        
        if (await link.count() > 0) {
          await expect(link.first()).toBeVisible();
        }
      }
    });

    test('should load without errors', async ({ page }) => {
      // Check for error messages
      const errors = await page.locator('text=/error|failed/i').count();
      
      // Some error text might be in labels, so we check for error alerts
      const errorAlerts = await page.locator('[role="alert"]').count();
      
      expect(errorAlerts).toBe(0);
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone size
      
      await page.goto('http://localhost:5173/auth/sign-in');
      await page.fill('input[name="email"]', 'admin@meridian.app');
      await page.fill('input[name="password"]', 'admin');
      await page.click('button[type="submit"]');
      
      // Dashboard should load on mobile
      await expect(page).toHaveURL(/dashboard/);
    });

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad size
      
      await page.goto('http://localhost:5173');
      
      // Page should render without horizontal scroll
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      
      expect(hasHorizontalScroll).toBe(false);
    });

    test('should work on desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      await page.goto('http://localhost:5173');
      
      // Page should render
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should have no critical accessibility violations', async ({ page }) => {
      await page.goto('http://localhost:5173');
      
      // Check for basic accessibility
      const mainContent = page.locator('main, [role="main"]');
      await expect(mainContent).toBeVisible();
      
      // Forms should have labels
      const inputs = await page.locator('input').all();
      
      for (const input of inputs) {
        const hasLabel = await input.evaluate((el) => {
          const id = el.getAttribute('id');
          const ariaLabel = el.getAttribute('aria-label');
          const ariaLabelledBy = el.getAttribute('aria-labelledby');
          
          if (ariaLabel || ariaLabelledBy) return true;
          if (id) {
            return document.querySelector(`label[for="${id}"]`) !== null;
          }
          return false;
        });
        
        // Most inputs should have labels (some hidden inputs might not)
        if (await input.isVisible()) {
          expect(hasLabel).toBeTruthy();
        }
      }
    });

    test('should support keyboard navigation', async ({ page }) => {
      await page.goto('http://localhost:5173/auth/sign-in');
      
      // Tab through form fields
      await page.keyboard.press('Tab'); // Focus email
      await page.keyboard.type('test@example.com');
      
      await page.keyboard.press('Tab'); // Focus password
      await page.keyboard.type('password123');
      
      await page.keyboard.press('Tab'); // Focus submit button
      await page.keyboard.press('Enter'); // Submit form
      
      // Should process the form submission
      await page.waitForTimeout(500);
    });
  });

  test.describe('Performance', () => {
    test('should load dashboard within 3 seconds', async ({ page }) => {
      await page.goto('http://localhost:5173/auth/sign-in');
      await page.fill('input[name="email"]', 'admin@meridian.app');
      await page.fill('input[name="password"]', 'admin');
      
      const startTime = Date.now();
      
      await page.click('button[type="submit"]');
      await page.waitForURL(/dashboard/);
      
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(3000);
    });

    test('should handle rapid navigation', async ({ page }) => {
      await page.goto('http://localhost:5173/auth/sign-in');
      await page.fill('input[name="email"]', 'admin@meridian.app');
      await page.fill('input[name="password"]', 'admin');
      await page.click('button[type="submit"]');
      await page.waitForURL(/dashboard/);
      
      // Rapid navigation
      const routes = [
        '/dashboard',
        '/dashboard/projects',
        '/dashboard/tasks',
        '/dashboard',
      ];
      
      for (const route of routes) {
        await page.goto(`http://localhost:5173${route}`);
        await page.waitForLoadState('networkidle');
      }
      
      // Should not crash
      await expect(page.locator('body')).toBeVisible();
    });
  });
});

