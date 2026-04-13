import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should load sign-in page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Meridian/);
  });

  test('should sign in with valid credentials', async ({ page }) => {
    await page.goto('/');
    
    // Fill in credentials
    await page.fill('input[type="email"]', 'admin@meridian.app');
    await page.fill('input[type="password"]', 'admin123');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/');
    
    await page.fill('input[type="email"]', 'wrong@email.com');
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('text=Invalid')).toBeVisible({ timeout: 5000 });
  });
});
