import { app, BrowserWindow, screen } from 'electron';
import path from 'node:path';
import { resolveHtmlPath } from '../util';
import { typedIpcMain, typedWebContents } from '../ipc';
import { TabManager } from '../TabManager';

let commandBarWindow: BrowserWindow | null = null;

// Fixes a bug where the first call to this window flashes white
let hasBeenOpenedBefore = false;

const COMMAND_BAR_WIDTH = 800;
const COMMAND_BAR_HEIGHT = 500;

export const spawnCommandBarUI = (tabUuid?: string) => {
  if (commandBarWindow == null) {
    const RESOURCES_PATH = app.isPackaged
      ? path.join(process.resourcesPath, 'assets')
      : path.join(__dirname, '../../assets');

    // Determine which display the cursor is on and center the window there.
    const cursorPoint = screen.getCursorScreenPoint();
    const targetDisplay = screen.getDisplayNearestPoint(cursorPoint);
    const { x, y, width, height } = targetDisplay.workArea;
    const centeredX = Math.round(x + (width - COMMAND_BAR_WIDTH) / 2);
    const centeredY = Math.round(y + (height - COMMAND_BAR_HEIGHT) / 2);

    commandBarWindow = new BrowserWindow({
      opacity: hasBeenOpenedBefore ? 1 : 0,
      show: hasBeenOpenedBefore ? false : true,
      x: centeredX,
      y: centeredY,
      width: COMMAND_BAR_WIDTH,
      height: COMMAND_BAR_HEIGHT,
      transparent: true,
      vibrancy: 'titlebar',
      backgroundMaterial: 'acrylic',
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

        commandBarWindow.on('blur', () => {
          if (commandBarWindow) {
            commandBarWindow.close();
          }
        });
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
    } else if (data.action === 'close' && commandBarWindow) {
      commandBarWindow.close();
    }
  });
};
