import { expect, type Page } from '@playwright/test';

export async function openChatPage(page: Page) {
  await page.goto('/dashboard/chat');
  await page.waitForLoadState('networkidle');
}

export async function startDirectMessageWithEmail(page: Page, targetEmail: string) {
  // Open "New conversation" modal from the chat sidebar header (Plus button).
  // The button has only an icon, but the tooltip content is "New conversation".
  await page.getByRole('button').filter({ has: page.locator('svg') }).first().click().catch(async () => {
    // Fallback: click by tooltip text if it renders in the DOM.
    await page.getByText(/new conversation/i).click();
  });

  // Ensure the modal is open.
  await expect(page.getByText(/start a conversation/i)).toBeVisible({ timeout: 10_000 });

  // DM tab is default; filter users by email, then select.
  const search = page.getByPlaceholder(/search by name, email, or department/i);
  await expect(search).toBeVisible();
  await search.fill(targetEmail);

  await page.getByText(targetEmail, { exact: false }).first().click();
  await page.getByRole('button', { name: /start conversation/i }).click();
}

export async function sendMessageInChat(page: Page, message: string) {
  // This is intentionally flexible since the chat input component can vary.
  const textbox = page.getByRole('textbox').last();
  await expect(textbox).toBeVisible({ timeout: 15_000 });
  await textbox.fill(message);
  await page.keyboard.press('Enter');

  await expect(page.getByText(message)).toBeVisible({ timeout: 15_000 });
}

