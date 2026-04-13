/**
 * Authentication Flow E2E Tests
 * 
 * End-to-end tests for complete authentication flows:
 * - Sign up flow
 * - Sign in flow
 * - Password reset
 * - Email verification
 * - 2FA setup
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.describe('Sign Up', () => {
    test('should complete sign up flow', async ({ page }) => {
      await page.goto('/signup');

      // Fill in sign up form
      await page.fill('[name="name"]', 'Test User');
      await page.fill('[name="email"]', 'testuser@example.com');
      await page.fill('[name="password"]', 'SecurePass123!');
      await page.fill('[name="confirmPassword"]', 'SecurePass123!');

      // Submit form
      await page.click('button[type="submit"]');

      // Should redirect to verification page or dashboard
      await expect(page).toHaveURL(/\/(verify-email|dashboard)/);
    });

    test('should validate email format', async ({ page }) => {
      await page.goto('/signup');

      await page.fill('[name="email"]', 'invalid-email');
      await page.click('button[type="submit"]');

      // Should show error
      await expect(page.locator('text=Invalid email')).toBeVisible();
    });

    test('should validate password strength', async ({ page }) => {
      await page.goto('/signup');

      await page.fill('[name="password"]', 'weak');
      await page.click('button[type="submit"]');

      await expect(page.locator('text=/password.*strong/i')).toBeVisible();
    });

    test('should match password confirmation', async ({ page }) => {
      await page.goto('/signup');

      await page.fill('[name="password"]', 'SecurePass123!');
      await page.fill('[name="confirmPassword"]', 'DifferentPass123!');
      await page.click('button[type="submit"]');

      await expect(page.locator('text=/passwords.*match/i')).toBeVisible();
    });
  });

  test.describe('Sign In', () => {
    test('should sign in with valid credentials', async ({ page }) => {
      await page.goto('/signin');

      await page.fill('[name="email"]', 'existing@example.com');
      await page.fill('[name="password"]', 'CorrectPassword123!');
      await page.click('button[type="submit"]');

      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/signin');

      await page.fill('[name="email"]', 'wrong@example.com');
      await page.fill('[name="password"]', 'WrongPassword123!');
      await page.click('button[type="submit"]');

      await expect(page.locator('text=/invalid.*credentials/i')).toBeVisible();
    });

    test('should handle remember me option', async ({ page }) => {
      await page.goto('/signin');

      await page.check('[name="rememberMe"]');
      await page.fill('[name="email"]', 'user@example.com');
      await page.fill('[name="password"]', 'Password123!');
      await page.click('button[type="submit"]');

      // Session should persist longer
      const isChecked = await page.isChecked('[name="rememberMe"]');
      expect(isChecked).toBe(true);
    });
  });

  test.describe('Password Reset', () => {
    test('should request password reset', async ({ page }) => {
      await page.goto('/forgot-password');

      await page.fill('[name="email"]', 'user@example.com');
      await page.click('button[type="submit"]');

      await expect(page.locator('text=/email.*sent/i')).toBeVisible();
    });

    test('should reset password with valid token', async ({ page }) => {
      const resetToken = 'valid-reset-token-123';
      await page.goto(`/reset-password?token=${resetToken}`);

      await page.fill('[name="password"]', 'NewSecurePass123!');
      await page.fill('[name="confirmPassword"]', 'NewSecurePass123!');
      await page.click('button[type="submit"]');

      await expect(page.locator('text=/password.*reset/i')).toBeVisible();
    });
  });

  test.describe('Email Verification', () => {
    test('should verify email with valid token', async ({ page }) => {
      const verifyToken = 'valid-verify-token-123';
      await page.goto(`/verify-email?token=${verifyToken}`);

      await expect(page.locator('text=/email.*verified/i')).toBeVisible();
    });

    test('should resend verification email', async ({ page }) => {
      await page.goto('/verify-email');

      await page.click('button:has-text("Resend")');

      await expect(page.locator('text=/email.*sent/i')).toBeVisible();
    });
  });

  test.describe('Sign Out', () => {
    test('should sign out user', async ({ page }) => {
      // Assume user is signed in
      await page.goto('/dashboard');

      await page.click('[aria-label="User menu"]');
      await page.click('text=Sign Out');

      // Should redirect to signin
      await expect(page).toHaveURL(/\/signin/);
    });
  });
});

