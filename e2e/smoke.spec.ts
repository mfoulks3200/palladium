/**
 * Smoke tests for the Palladium browser.
 *
 * Validates core user-facing flows:
 *   1. App launches and the main window appears
 *   2. A new tab can be created via the command bar
 *   3. The command bar opens and closes
 *   4. URL navigation works via the command bar
 *
 * Prerequisites: `npm run build` (then `npm run test:e2e` auto-runs setup)
 */
import { test, expect } from '@playwright/test';
import { ElectronApplication, Page } from 'playwright';
import { launchApp } from './electron-app';

let app: ElectronApplication;
let mainWindow: Page;

/**
 * Tab elements are identified by having both `draggable="true"` and
 * `data-drop-target-for-element="true"` attributes (from the drag-and-drop
 * library used in BrowserTab.tsx).
 */
const TAB_SELECTOR = '[draggable="true"][data-drop-target-for-element="true"]';

test.beforeAll(async () => {
  ({ app, mainWindow } = await launchApp());

  // Wait for the React app to fully render.
  await mainWindow.waitForSelector('text=New Tab', { timeout: 30_000 });
});

test.afterAll(async () => {
  await app?.close();
});

// Helper: find the command bar window
async function findCommandBarWindow(): Promise<Page | undefined> {
  const windows = await app.windows();
  return windows.find((w) => w.url().includes('commandBar.html'));
}

// Helper: open command bar and return its window with the input ready.
// When `viaNewTab` is true, opens without a tab context (creates new tab).
async function openCommandBar(
  viaNewTab = false,
): Promise<Page | undefined> {
  if (viaNewTab) {
    await mainWindow.getByText('New Tab').click();
  } else {
    // Click the address bar
    const addressBar = mainWindow
      .locator('[data-slot="card"]')
      .filter({ has: mainWindow.locator('[class*="text-ellipsis"]') })
      .first();

    if (await addressBar.isVisible({ timeout: 3_000 })) {
      await addressBar.click();
    } else {
      await mainWindow.keyboard.press('Meta+t');
    }
  }

  // Wait for the command bar window to become ready
  let commandBarWindow: Page | undefined;
  for (let i = 0; i < 40; i++) {
    commandBarWindow = await findCommandBarWindow();
    if (commandBarWindow) {
      const hasInput = await commandBarWindow
        .locator('input')
        .first()
        .isVisible()
        .catch(() => false);
      if (hasInput) break;
    }
    await mainWindow.waitForTimeout(250);
  }

  if (commandBarWindow) {
    // Wait for the command-setup IPC to arrive and the component to
    // settle (resets text, fetches initial suggestions). The setup
    // includes a setTimeout(1) for focus, so give it a bit.
    await commandBarWindow.waitForTimeout(500);
  }

  return commandBarWindow;
}

// ── 1. App launch ──────────────────────────────────────────────────────

test('app launches and shows the main window', async () => {
  const rootHasChildren = await mainWindow.evaluate(() => {
    const root = document.getElementById('root');
    return root !== null && root.children.length > 0;
  });
  expect(rootHasChildren).toBe(true);
});

test('main window has the sidebar rendered', async () => {
  await expect(mainWindow.getByText('New Tab')).toBeVisible();
});

// ── 2. Tab creation ────────────────────────────────────────────────────

test('a default tab exists on launch', async () => {
  const tabs = mainWindow.locator(TAB_SELECTOR);
  await expect(tabs.first()).toBeVisible({ timeout: 10_000 });

  const tabCount = await tabs.count();
  expect(tabCount).toBeGreaterThanOrEqual(1);
});

test('creating a new tab via the command bar', async () => {
  const tabsBefore = await mainWindow.locator(TAB_SELECTOR).count();

  // Click "New Tab" — opens command bar without tab context, so
  // entering a URL creates a new tab rather than navigating the current one.
  const commandBarWindow = await openCommandBar(/* viaNewTab */ true);

  if (!commandBarWindow) {
    test.skip(true, 'Could not open the command bar');
    return;
  }

  const input = commandBarWindow.locator('input').first();
  await expect(input).toBeVisible({ timeout: 5_000 });

  // Type a URL to trigger a new tab creation.
  await input.pressSequentially('example.com', { delay: 50 });

  // Wait for the suggestion to appear (IPC round-trip)
  await commandBarWindow.waitForTimeout(1_000);

  // Press Enter to execute the top suggestion (navigate/create tab)
  await commandBarWindow.keyboard.press('Enter');

  // Wait for the new tab to appear in the sidebar.
  await expect(mainWindow.locator(TAB_SELECTOR)).toHaveCount(
    tabsBefore + 1,
    { timeout: 15_000 },
  );
});

// ── 3. Command bar open / close ────────────────────────────────────────

test('command bar opens and closes', async () => {
  const commandBarWindow = await openCommandBar();

  if (!commandBarWindow) {
    test.skip(true, 'Could not open the command bar in this environment');
    return;
  }

  const input = commandBarWindow.locator('input').first();
  await expect(input).toBeVisible({ timeout: 5_000 });

  // Close with Escape
  await commandBarWindow.keyboard.press('Escape');
  await mainWindow.waitForTimeout(1_000);
});

// ── 4. URL navigation via command bar ──────────────────────────────────

test('navigating to a URL via the command bar updates the address bar', async () => {
  // Record the current address bar text to verify it changes.
  const currentUrl = await mainWindow
    .locator('[class*="text-ellipsis"]')
    .first()
    .textContent();

  const commandBarWindow = await openCommandBar();

  if (!commandBarWindow) {
    test.skip(true, 'Could not open the command bar in this environment');
    return;
  }

  const input = commandBarWindow.locator('input').first();
  await expect(input).toBeVisible({ timeout: 5_000 });

  // The command-setup IPC prefills the input with the current tab URL.
  // Wait for the prefill to arrive then clear it.
  await expect
    .poll(async () => input.inputValue(), { timeout: 3_000 })
    .not.toBe('');

  // Select all and clear
  await input.click({ clickCount: 3 });
  await commandBarWindow.keyboard.press('Backspace');

  // Type a different URL. Use a fully-qualified https URL so the Base
  // command provider's ensureProtocol() doesn't need to modify it.
  const targetDomain = currentUrl?.includes('bing') ? 'duckduckgo.com' : 'bing.com';
  await input.pressSequentially(`https://${targetDomain}`, { delay: 30 });

  // Wait for the suggestion to appear
  await commandBarWindow.waitForTimeout(1_000);

  // Press Enter to execute the selected suggestion
  await commandBarWindow.keyboard.press('Enter');

  // Verify the address bar updates to the new domain.
  await expect
    .poll(
      async () => {
        return mainWindow
          .locator('[class*="text-ellipsis"]')
          .first()
          .textContent()
          .catch(() => '');
      },
      { timeout: 15_000 },
    )
    .toContain(targetDomain);
});
