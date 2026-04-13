/**
 * Smoke: sign-up → session (/api/users/me) → create first workspace.
 * Run locally from apps/web (starts API + Vite via Playwright; needs Postgres):
 *   npm run test:e2e:smoke:with-api
 * If API is already running, use: npm run test:e2e:smoke
 */

import { test, expect } from "@playwright/test";

const shouldSkip = process.env.SKIP_E2E_SMOKE === "true";

test.describe("@smoke auth + workspace", () => {
  test.skip(shouldSkip, "SKIP_E2E_SMOKE=true");
  // Default test timeout is 30s; cold API/Vite startup + sign-up need more headroom.
  test.describe.configure({ mode: "serial", timeout: 180_000 });

  test("sign up, session is valid, create workspace", async ({ page }) => {
    const id = Date.now();
    const email = `e2e-smoke-${id}@example.com`;
    const password = "E2E_Smoke_Secure_Pass_1!";
    const displayName = "E2E Smoke User";

    await page.goto("/auth/sign-up");
    await page.locator('input[name="name"]').fill(displayName);
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.locator('input[name="confirmPassword"]').fill(password);
    await page.locator("#terms").check();
    await page.getByRole("button", { name: "Sign Up" }).click();

    await page.waitForURL(/\/dashboard/, { timeout: 90_000 });

    const meResponse = await page.request.get("/api/users/me");
    expect(meResponse.ok(), `/api/users/me status ${meResponse.status()}`).toBeTruthy();
    const meBody = (await meResponse.json()) as { user?: { email?: string } | null };
    expect(meBody.user?.email).toBe(email);

    await page
      .getByRole("button", { name: "Create Workspace" })
      .first()
      .click({ timeout: 30_000 });

    await page.locator("#workspaceName").waitFor({ state: "visible", timeout: 30_000 });
    await page.locator("#workspaceName").fill(`Smoke Workspace ${id}`);
    await page
      .locator('[role="dialog"]')
      .getByRole("button", { name: "Create Workspace" })
      .click();

    await page.waitForURL(/\/dashboard\/projects/, { timeout: 90_000 });
  });
});
