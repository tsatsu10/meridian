/**
 * Optional: sign-in with an existing account (no sign-up).
 * Set E2E_SMOKE_EMAIL and E2E_SMOKE_PASSWORD (e.g. a seeded local user).
 * Run: npm run test:e2e:smoke:signin
 * Or with API auto-start: npm run test:e2e:smoke:signin:with-api (see package.json).
 */

import { test, expect } from "@playwright/test";

const email = process.env.E2E_SMOKE_EMAIL;
const password = process.env.E2E_SMOKE_PASSWORD;
const hasCreds = Boolean(email && password);

test.describe("@smoke sign-in (optional)", () => {
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  test("sign in with existing user", async ({ page }) => {
    test.skip(!hasCreds, "Set E2E_SMOKE_EMAIL and E2E_SMOKE_PASSWORD to run this test");

    await page.goto("/auth/sign-in");
    await page.locator('input[name="email"]').fill(email!);
    await page.locator('input[name="password"]').fill(password!);
    await page.getByRole("button", { name: "Sign In" }).click();

    await page.waitForURL(/\/dashboard/, { timeout: 60_000 });

    const meResponse = await page.request.get("/api/users/me");
    expect(meResponse.ok()).toBeTruthy();
    const body = (await meResponse.json()) as { user?: { email?: string } | null };
    expect(body.user?.email).toBe(email);
  });
});
