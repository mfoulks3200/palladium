import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { resolveHtmlPath } from '../util';
import { typedIpcMain, typedWebContents } from '../ipc';
import { TabManager } from '../TabManager';

let commandBarWindow: BrowserWindow | null = null;

// Fixes a bug where the first call to this window flashes white
let hasBeenOpenedBefore = false;

export const spawnCommandBarUI = (tabUuid?: string) => {
  if (commandBarWindow == null) {
    const RESOURCES_PATH = app.isPackaged
      ? path.join(process.resourcesPath, 'assets')
      : path.join(__dirname, '../../assets');

    commandBarWindow = new BrowserWindow({
      opacity: hasBeenOpenedBefore ? 1 : 0,
      show: hasBeenOpenedBefore ? false : true,
      width: 800,
      height: 500,
      transparent: true,
      vibrancy: 'hud',
      frame: false,
      backgroundColor: '#00000000',
      roundedCorners: true,
      resizable: false,
      webPreferences: {
        preload: app.isPackaged
          ? path.join(__dirname, 'preload.js')
          : path.join(__dirname, '../../.erb/dll/preload.js'),
        devTools: false,
      },
    });

    commandBarWindow.webContents.insertCSS(`
        html,
        body,
        #root {
        position: relative;
        height: 100vh;
        width: 100vw;
        font-family: 'Inter', sans-serif;
        overflow-y: hidden;
        justify-content: center;
        align-items: center;
        background: rgba(0, 0, 0, 0) !important;
        }
    `);

    Promise.all([
      commandBarWindow.loadURL(resolveHtmlPath('commandBar.html')),
      new Promise((resolve) => {
        commandBarWindow!.on('ready-to-show', () => {
          resolve(null);
        });
      }),
    ]).then(() => {
      if (!commandBarWindow) {
        throw new Error('"commandBarWindow" is not defined');
      }
      if (process.env.START_MINIMIZED) {
        commandBarWindow.minimize();
      } else {
        if (tabUuid) {
          typedWebContents(commandBarWindow.webContents).send('command-setup', {
            tabUuid: tabUuid,
            prefill:
              TabManager.getInstance().getCurrentTab()?.getCurrentUrl() ?? '',
          });
        }

        if (hasBeenOpenedBefore) {
          commandBarWindow.show();
        } else {
          commandBarWindow.setOpacity(1);
        }

        hasBeenOpenedBefore = true;
      }
    });

    typedIpcMain.on('command-bar', (_event, data) => {
      if (data.action === 'close' && commandBarWindow) {
        commandBarWindow.close();
      }
    });

    commandBarWindow.on('closed', () => {
      commandBarWindow = null;
    });
  } else {
    commandBarWindow.moveTop();
    commandBarWindow.focus();
    commandBarWindow.focusOnWebView();
  }
};

export const commandBarSetup = () => {
  typedIpcMain.on('command-bar', (_event, data) => {
    if (data.action === 'open') {
      spawnCommandBarUI(data.tabUuid);
    }
  });
};
