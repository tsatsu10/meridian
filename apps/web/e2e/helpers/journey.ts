import { expect, type Page, type APIRequestContext } from '@playwright/test';

export type TestUser = {
  name: string;
  email: string;
  password: string;
};

export function makeTestUser(seed: string): TestUser {
  const safeSeed = seed.replace(/[^a-zA-Z0-9_-]/g, '-');
  return {
    name: `E2E ${safeSeed}`,
    email: `e2e-${safeSeed}@example.com`,
    password: 'TestPassword123!',
  };
}

export async function signUpViaUi(page: Page, user: TestUser) {
  // This app opens websockets/polling; waiting for full "load" can hang.
  await page.goto('/auth/sign-up', { waitUntil: 'domcontentloaded' });

  expect(
    page.url().includes('/auth/sign-up'),
    `Expected to be on /auth/sign-up, but landed on ${page.url()}`,
  ).toBeTruthy();

  const nameField = page.locator('[name="name"], input[placeholder*="full name" i]').first();
  await expect(nameField, `Sign up form did not render on ${page.url()}`).toBeVisible({
    timeout: 15_000,
  });
  await nameField.fill(user.name);

  await page.locator('[name="email"], input[type="email"]').first().fill(user.email);
  await page.locator('[name="password"], input[type="password"]').nth(0).fill(user.password);
  await page.locator('[name="confirmPassword"], input[type="password"]').nth(1).fill(user.password);

  await page.locator('#terms').check();
  const signUpResponsePromise = page.waitForResponse((res) => {
    return res.url().includes('/api/users/sign-up') && res.request().method() === 'POST';
  });

  await page.getByRole('button', { name: /sign up/i }).click();

  const signUpResponse = await signUpResponsePromise;
  expect(
    signUpResponse.ok(),
    `Sign-up API failed (HTTP ${signUpResponse.status()}). Check API logs for /api/users/sign-up.`,
  ).toBeTruthy();

  // The UI pushes to /dashboard after signup.
  await page.waitForURL(/\/dashboard/, { timeout: 30_000, waitUntil: 'domcontentloaded' });
}

export async function ensureWorkspaceExists(page: Page) {
  // Some environments auto-create a workspace; others prompt creation.
  // We keep this intentionally permissive: the goal is to land inside a workspace context.
  if (await page.getByRole('button', { name: /create workspace/i }).isVisible().catch(() => false)) {
    await page.getByRole('button', { name: /create workspace/i }).click();
  } else if (await page.getByText(/create workspace/i).isVisible().catch(() => false)) {
    await page.getByText(/create workspace/i).click();
  }

  const workspaceName = `E2E Workspace ${Date.now()}`;
  if (await page.locator('[name="name"]').isVisible().catch(() => false)) {
    await page.locator('[name="name"]').fill(workspaceName);
  }
  if (await page.locator('[name="description"]').isVisible().catch(() => false)) {
    await page.locator('[name="description"]').fill('Workspace created by Playwright');
  }

  if (await page.getByRole('button', { name: /^create$/i }).isVisible().catch(() => false)) {
    await page.getByRole('button', { name: /^create$/i }).click();
  } else if (await page.getByRole('button', { name: /create workspace/i }).isVisible().catch(() => false)) {
    await page.getByRole('button', { name: /create workspace/i }).click();
  } else if (await page.getByRole('button', { name: /create/i }).isVisible().catch(() => false)) {
    await page.getByRole('button', { name: /create/i }).click();
  }

  // Wait until we are in some dashboard/workspace context.
  await page.waitForURL(/\/dashboard|\/workspace\//, { timeout: 30_000 });
}

export async function createProjectViaUi(page: Page, projectName: string) {
  // Best-effort selectors; the app has multiple variants.
  await page.getByRole('button', { name: /new project/i }).click().catch(async () => {
    await page.locator('[data-testid="create-project-btn"]').click();
  });

  const nameField = page.locator('[name="projectName"], [name="name"]').first();
  await expect(nameField).toBeVisible({ timeout: 10_000 });
  await nameField.fill(projectName);

  const descField = page.locator('[name="description"]').first();
  if (await descField.isVisible().catch(() => false)) {
    await descField.fill('Project created by Playwright');
  }

  await page.getByRole('button', { name: /create project/i }).click().catch(async () => {
    await page.getByRole('button', { name: /create/i }).click();
  });

  await page.waitForURL(/project\//, { timeout: 30_000 });
}

export async function createTaskViaUi(page: Page, title: string) {
  await page.getByRole('button', { name: /new task/i }).click();

  const titleField = page.locator('[name="title"]').first();
  await expect(titleField).toBeVisible({ timeout: 10_000 });
  await titleField.fill(title);

  const descField = page.locator('[name="description"]').first();
  if (await descField.isVisible().catch(() => false)) {
    await descField.fill('Task created by Playwright');
  }

  await page.getByRole('button', { name: /create|save|submit/i }).click();
  await expect(page.getByText(title)).toBeVisible({ timeout: 15_000 });
}

export async function inviteWorkspaceUserViaApi(
  request: APIRequestContext,
  args: { workspaceId: string; userEmail: string }
) {
  const res = await request.post(`/api/workspace-user/${encodeURIComponent(args.workspaceId)}/invite`, {
    data: { userEmail: args.userEmail },
  });
  expect(res.ok()).toBeTruthy();
}

export function extractWorkspaceIdFromUrl(url: string): string | null {
  const match = url.match(/workspace\/([^/]+)/i);
  return match?.[1] ?? null;
}

