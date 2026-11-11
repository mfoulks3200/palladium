/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import { app } from 'electron';
import path from 'node:path';
import { getWebsiteSession } from './WebsiteSession';
import { unregisterGlobalShortcuts } from './GlobalShortcuts';
import { BrowserWindowUI } from './BrowserWindowUI';
import { AnalyticsManager } from './AnalyticsManager';

let windowOwner: BrowserWindowUI | null = null;
let creatingWindow = false;

// ---------------------------------------------------------------------------
// Global exception handlers — forward to PostHog via AnalyticsManager
// ---------------------------------------------------------------------------

process.on('uncaughtException', (error) => {
  AnalyticsManager.getInstance().captureException(error, { source: 'main' });
  console.error('[Main] Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  const error =
    reason instanceof Error
      ? reason
      : Object.assign(new Error(String(reason)), {
          name: 'UnhandledRejection',
        });
  AnalyticsManager.getInstance().captureException(error, { source: 'main' });
  console.error('[Main] Unhandled rejection:', reason);
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug').default();
}

app.commandLine.appendSwitch('enable-features', 'GlobalShortcutsPortal');

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (creatingWindow || windowOwner) return;
  creatingWindow = true;
  try {
    if (isDebug) await installExtensions();
    const owner = new BrowserWindowUI(isDebug);
    windowOwner = owner;
    owner.mainWindow.once('closed', () => {
      if (windowOwner === owner) windowOwner = null;
    });
  } finally {
    creatingWindow = false;
  }
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    unregisterGlobalShortcuts();
    app.quit();
  }
});

app
  .whenReady()
  .then(async () => {
    const directory = process.env.PALLADIUM_UNPACKED_EXTENSION;
    if (directory && !app.isPackaged) {
      try {
        const extension = await getWebsiteSession().extensions.loadExtension(
          path.resolve(directory),
        );
        console.info('[Extensions] Loaded', extension.name);
      } catch (error) {
        console.error('[Extensions] Could not load unpacked extension', error);
      }
    }
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (!windowOwner) createWindow();
      else {
        const win = windowOwner.mainWindow;
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
      }
    });
  })
  .catch(console.log);

// app.on('before-quit', async (e) => {
//   e.preventDefault(); // prevents the default quit
//   setTimeout(() => {
//     app.exit();
//   }, 500);
// });

app.on('will-quit', async (e) => {
  e.preventDefault();
  unregisterGlobalShortcuts();
  AnalyticsManager.getInstance().capture('app_quit');
  await AnalyticsManager.getInstance().shutdown();
  app.exit(0);
});
