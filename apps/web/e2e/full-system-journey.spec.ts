import { test, expect } from '@playwright/test';
import {
  createProjectViaUi,
  createTaskViaUi,
  ensureWorkspaceExists,
  extractWorkspaceIdFromUrl,
  inviteWorkspaceUserViaApi,
  makeTestUser,
  signUpViaUi,
} from './helpers/journey';
import { openChatPage, sendMessageInChat, startDirectMessageWithEmail } from './helpers/direct-messaging';

test.describe('Full system journey (signup → core features)', () => {
  test('Sign up → Workspace → Project → Task → Direct messaging', async ({ page }) => {
    const health = await page.request.get('/api/health');
    const status = health.status();
    // Some deployments protect /api/health behind auth; for E2E we only need "reachable".
    expect(
      [200, 401, 403].includes(status),
      `API not reachable (got HTTP ${status}). Start \`apps/api\` with valid DATABASE_URL + JWT_SECRET before running E2E.`,
    ).toBeTruthy();

    const seed = `${Date.now()}`;
    const user = makeTestUser(seed);
    const inviteeEmail = `e2e-invitee-${seed}@example.com`;

    const consoleLines: string[] = [];
    page.on('console', (msg) => {
      consoleLines.push(`[${msg.type()}] ${msg.text()}`);
    });
    page.on('pageerror', (err) => {
      consoleLines.push(`[pageerror] ${err.message}`);
    });

    try {
      await signUpViaUi(page, user);
    } catch (err) {
      await page.screenshot({ path: 'test-results/signup-debug.png', fullPage: true }).catch(() => {});
      const tail = consoleLines.slice(-30).join('\n');
      throw new Error(
        `Signup UI failed on ${page.url()}\n\nRecent browser logs:\n${tail || '(none)'}\n\nOriginal error: ${String(err)}`,
      );
    }
    await ensureWorkspaceExists(page);

    // We need a workspace ID for API-based invite (DM user list comes from workspace members).
    const workspaceId = extractWorkspaceIdFromUrl(page.url());
    expect(workspaceId).toBeTruthy();

    await inviteWorkspaceUserViaApi(page.request, {
      workspaceId: workspaceId!,
      userEmail: inviteeEmail,
    });

    // Project + task
    await createProjectViaUi(page, `E2E Project ${seed}`);
    await createTaskViaUi(page, `E2E Task ${seed}`);

    // Direct messaging (start DM with invited member + send message)
    await openChatPage(page);
    await startDirectMessageWithEmail(page, inviteeEmail);
    await sendMessageInChat(page, `hello from playwright ${seed}`);
  });
});

