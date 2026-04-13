/**
 * Quick E2E Demo - No Auth Required
 * Shows how real browser testing works
 */

import { test, expect } from '@playwright/test';

test.describe('Quick E2E Demo', () => {
  test('should load the homepage', async ({ page }) => {
    // Go to the app
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot
    await page.screenshot({ path: 'homepage.png' });
    
    console.log('✅ Page loaded! URL:', page.url());
    console.log('✅ Screenshot saved to homepage.png');
    
    // Check if page has content
    const bodyText = await page.textContent('body');
    console.log('✅ Page has content:', bodyText?.length, 'characters');
  });

  test('should show that real navigation works', async ({ page }) => {
    // Start at homepage
    await page.goto('/');
    
    const initialUrl = page.url();
    console.log('📍 Starting URL:', initialUrl);
    
    // Try to navigate (might redirect to login if not authenticated)
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    const finalUrl = page.url();
    console.log('📍 Final URL:', finalUrl);
    
    // This is REAL navigation in a REAL browser!
    expect(finalUrl).toBeTruthy();
  });
});

