import { app, BrowserWindow, screen } from 'electron';
import path from 'node:path';
import { resolveHtmlPath } from '../util';
import { typedIpcMain, typedWebContents } from '../ipc';
import { TabManager } from '../TabManager';

let commandBarWindow: BrowserWindow | null = null;
let isWindowReady = false;

const COMMAND_BAR_WIDTH = 800;
const COMMAND_BAR_HEIGHT = 500;

const positionOnCursorDisplay = (win: BrowserWindow) => {
  const cursorPoint = screen.getCursorScreenPoint();
  const targetDisplay = screen.getDisplayNearestPoint(cursorPoint);
  const { x, y, width, height } = targetDisplay.workArea;
  win.setPosition(
    Math.round(x + (width - COMMAND_BAR_WIDTH) / 2),
    Math.round(y + (height - COMMAND_BAR_HEIGHT) / 2),
  );
};

const createCommandBarWindow = (): BrowserWindow => {
  const win = new BrowserWindow({
    show: false,
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
      devTools: true,
    },
  });

  win.webContents.insertCSS(`
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

  win.once('ready-to-show', () => {
    isWindowReady = true;
  });

  win.on('blur', () => {
    if (!win.isDestroyed() && win.isVisible()) {
      win.hide();
    }
  });

  win.on('closed', () => {
    commandBarWindow = null;
    isWindowReady = false;
  });

  win.loadURL(resolveHtmlPath('commandBar.html'));

  return win;
};

/**
 * Pre-warm the command bar window at startup so the first keypress is instant.
 * The window loads its HTML in the background while hidden.
 */
const preWarmCommandBar = () => {
  commandBarWindow = createCommandBarWindow();
};

export const spawnCommandBarUI = (tabUuid?: string) => {
  if (!commandBarWindow || commandBarWindow.isDestroyed()) {
    commandBarWindow = createCommandBarWindow();
  }

  const showWindow = () => {
    const win = commandBarWindow;
    if (!win || win.isDestroyed()) return;

    positionOnCursorDisplay(win);

    // Always reset renderer state on each open, even if no tab context.
    typedWebContents(win.webContents).send('command-setup', {
      tabUuid: tabUuid ?? '',
      prefill: tabUuid
        ? (TabManager.getInstance().getCurrentTab()?.getCurrentUrl() ?? '')
        : '',
    });

    win.show();
    win.focus();
    win.focusOnWebView();
  };

  if (isWindowReady) {
    showWindow();
  } else {
    commandBarWindow.once('ready-to-show', showWindow);
  }
};

export const commandBarSetup = () => {
  preWarmCommandBar();

  typedIpcMain.on('command-bar', (_event, data) => {
    if (data.action === 'open') {
      spawnCommandBarUI(data.tabUuid);
    } else if (data.action === 'close' && commandBarWindow) {
      commandBarWindow.hide();
    }
  });
};
