import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should redirect to sign-in when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should redirect to sign-in page
    await expect(page).toHaveURL(/.*auth\/sign-in/);
  });

  test('should show landing page without authentication', async ({ page }) => {
    await page.goto('/');
    
    // Should show landing page
    await expect(page.locator('h1')).toBeVisible();
  });
});

test.describe('Dashboard Access', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication by setting localStorage
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth-token', 'mock-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'member',
        workspaceId: 'workspace-1'
      }));
    });
  });

  test('should access dashboard when authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should show dashboard
    await expect(page.locator('h1, h2')).toContainText(/dashboard|Dashboard/i);
  });

  test('should show milestone dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should show milestone dashboard
    await expect(page.locator('text=Milestone Dashboard')).toBeVisible();
  });

  test('should show interactive charts', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should show chart components
    await expect(page.locator('[data-testid="line-chart"], [data-testid="bar-chart"], [data-testid="area-chart"], [data-testid="pie-chart"]').first()).toBeVisible();
  });
});

test.describe('Role-Based Access Control', () => {
  test('should show different content for admin role', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth-token', 'mock-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'admin-1',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
        workspaceId: 'workspace-1'
      }));
    });

    await page.goto('/dashboard');
    
    // Admin should see admin-specific content
    await expect(page.locator('text=Admin')).toBeVisible();
  });

  test('should show different content for member role', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth-token', 'mock-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'member-1',
        email: 'member@example.com',
        name: 'Member User',
        role: 'member',
        workspaceId: 'workspace-1'
      }));
    });

    await page.goto('/dashboard');
    
    // Member should see member-specific content
    await expect(page.locator('text=Member')).toBeVisible();
  });
});

test.describe('Interactive Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth-token', 'mock-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'member',
        workspaceId: 'workspace-1'
      }));
    });
  });

  test('should interact with milestone dashboard filters', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should be able to interact with project filter
    const projectFilter = page.locator('select').first();
    if (await projectFilter.isVisible()) {
      await projectFilter.selectOption('all');
    }
    
    // Should be able to interact with status filter
    const statusFilter = page.locator('select').nth(1);
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('all');
    }
  });

  test('should interact with chart controls', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should be able to click chart type dropdown
    const chartDropdown = page.locator('button').filter({ hasText: /more/i }).first();
    if (await chartDropdown.isVisible()) {
      await chartDropdown.click();
      
      // Should show chart type options
      await expect(page.locator('text=Line Chart')).toBeVisible();
      await expect(page.locator('text=Bar Chart')).toBeVisible();
    }
  });

  test('should interact with time range buttons', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should be able to click time range buttons
    const timeRangeButtons = page.locator('button').filter({ hasText: /7d|30d|90d|1y/ });
    if (await timeRangeButtons.first().isVisible()) {
      await timeRangeButtons.first().click();
    }
  });
});

test.describe('Responsive Design', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth-token', 'mock-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'member',
        workspaceId: 'workspace-1'
      }));
    });
  });

  test('should work on mobile devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    
    // Should show mobile-friendly layout
    await expect(page.locator('h1, h2')).toContainText(/dashboard|Dashboard/i);
  });

  test('should work on tablet devices', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/dashboard');
    
    // Should show tablet-friendly layout
    await expect(page.locator('h1, h2')).toContainText(/dashboard|Dashboard/i);
  });
});

test.describe('Error Handling', () => {
  test('should handle 404 pages gracefully', async ({ page }) => {
    await page.goto('/non-existent-page');
    
    // Should show 404 or redirect to appropriate page
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network failure
    await page.route('**/api/**', route => route.abort());
    
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth-token', 'mock-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'member',
        workspaceId: 'workspace-1'
      }));
    });

    await page.goto('/dashboard');
    
    // Should handle network errors gracefully
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Performance', () => {
  test('should load dashboard within acceptable time', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth-token', 'mock-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'member',
        workspaceId: 'workspace-1'
      }));
    });

    const startTime = Date.now();
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should have good Core Web Vitals', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth-token', 'mock-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'member',
        workspaceId: 'workspace-1'
      }));
    });

    await page.goto('/dashboard');
    
    // Check for performance metrics
    const metrics = await page.evaluate(() => {
      return {
        loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
        domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
      };
    });
    
    expect(metrics.loadTime).toBeLessThan(3000);
    expect(metrics.domContentLoaded).toBeLessThan(2000);
  });
});
