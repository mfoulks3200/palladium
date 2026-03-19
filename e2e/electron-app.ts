/**
 * Shared Electron app launch helper for E2E tests.
 *
 * Launches the *built* Palladium Electron app (production webpack output)
 * using Playwright's Electron module.
 *
 * Prerequisites:
 *   1. `npm run build` — produces renderer + main bundles
 *   2. `npm run test:e2e:setup` — copies preload script to dev-path location
 */
import { _electron as electron, ElectronApplication, Page } from 'playwright';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const MAIN_JS = path.join(ROOT, 'release', 'app', 'dist', 'main', 'main.js');

export interface AppContext {
  app: ElectronApplication;
  /** The main browser UI window (mainUi.html) */
  mainWindow: Page;
}

/**
 * Launch the Electron app and return the main UI window.
 *
 * The app opens multiple BrowserWindows on startup (main UI, command bar,
 * tab WebContentsViews). We identify the main window by its URL.
 */
export async function launchApp(): Promise<AppContext> {
  // Default to headless unless PALLADIUM_HEADLESS is explicitly set to '0'
  // or the test was invoked with --headed (Playwright sets PWTEST_HEADED).
  const headed =
    process.env.PALLADIUM_HEADLESS === '0' || !!process.env.PWTEST_HEADED;
  const headless = !headed;

  const args = [MAIN_JS];
  if (headless) {
    args.push('--disable-gpu', '--no-sandbox', '--disable-software-rasterizer');
  }

  const app = await electron.launch({
    args,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PALLADIUM_HEADLESS: headless ? '1' : '0',
    },
  });

  // Wait for windows to be created. The main UI window loads mainUi.html.
  let mainWindow: Page | undefined;
  for (let i = 0; i < 40; i++) {
    const windows = await app.windows();
    mainWindow = windows.find((w) => w.url().includes('mainUi.html'));
    if (mainWindow) break;
    await new Promise((r) => setTimeout(r, 250));
  }

  if (!mainWindow) {
    throw new Error(
      'Could not find the main UI window (mainUi.html) after launch',
    );
  }

  await mainWindow.waitForLoadState('load');

  return { app, mainWindow };
}
