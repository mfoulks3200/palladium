import { app, BrowserWindow, screen, Menu } from 'electron';
import os from 'node:os';
import path from 'node:path';
import { autoUpdater } from 'electron-updater';
import MenuBuilder from './menu';
import { typedIpcMain, typedWebContents } from './ipc';
import { SystemMetaIpc, UpdateStatusIpc, WindowActionIpc } from '../ipc';
import { SettingsManager } from './SettingsManager';
import { HistoryManager } from './HistoryManager';
import { setupOverlayManager } from './OverlayManager';
import { registerGlobalShortcuts } from './GlobalShortcuts';
import { CommandParser } from './commands/CommandParser';
import { commandBarSetup } from './commands/CommandBar';
import { TabManager } from './TabManager';
import { Tab } from './Tab';
import log from 'electron-log';
import { resolveHtmlPath } from './util';
import { AnalyticsManager } from './AnalyticsManager';

class AppUpdater {
  private mainWindow: BrowserWindow;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;

    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('checking-for-update', () => {
      this.broadcast({ status: 'checking' });
    });

    autoUpdater.on('update-available', (info) => {
      this.broadcast({ status: 'available', version: info.version });
    });

    autoUpdater.on('update-not-available', () => {
      this.broadcast({ status: 'not-available' });
    });

    autoUpdater.on('download-progress', (progress) => {
      this.broadcast({
        status: 'downloading',
        progress: Math.round(progress.percent),
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      this.broadcast({ status: 'downloaded', version: info.version });
    });

    autoUpdater.on('error', (err) => {
      this.broadcast({ status: 'error', error: err.message });
    });

    typedIpcMain.on('check-for-update', () => {
      autoUpdater.checkForUpdates().catch((err) => {
        this.broadcast({ status: 'error', error: err.message });
      });
    });

    typedIpcMain.on('install-update', () => {
      autoUpdater.quitAndInstall();
    });

    // Check for updates on launch
    autoUpdater.checkForUpdates().catch(() => {});
  }

  private broadcast(status: UpdateStatusIpc) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      typedWebContents(this.mainWindow.webContents).send(
        'update-status',
        status,
      );
    }
  }
}

export class BrowserWindowUI {
  public mainWindow: BrowserWindow = null as any;
  public debugMode: boolean = false;
  public headless: boolean = false;

  constructor(debugMode?: boolean, headless?: boolean) {
    this.debugMode = !!debugMode;
    this.headless = !!headless;
    this.createWindow();
    this.createMenu();
    this.initializeSubsystems();
    this.mainWindow.on('show', () => {
      TabManager.getInstance().focusTab(
        TabManager.getInstance().getCurrentTab()!,
      );
    });
  }

  public createWindow() {
    const RESOURCES_PATH = app.isPackaged
      ? path.join(process.resourcesPath, 'assets')
      : path.join(__dirname, '../../assets');

    const getAssetPath = (...paths: string[]): string => {
      return path.join(RESOURCES_PATH, ...paths);
    };

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    // Headless mode disables transparency (requires GPU compositing) and
    // uses an opaque background so the renderer can paint without a display.
    const useTransparency = !this.headless;

    this.mainWindow = new BrowserWindow({
      show: false,
      width,
      height,
      minWidth: 800,
      minHeight: 800,
      titleBarStyle: 'hidden',
      ...(process.platform !== 'darwin'
        ? { titleBarOverlay: true }
        : { trafficLightPosition: { x: 17, y: 17 } }),
      transparent: useTransparency,
      frame: false,
      backgroundColor: useTransparency ? '#FFFFFF00' : '#FFFFFF',
      icon: getAssetPath('icon.png'),
      webPreferences: {
        preload: app.isPackaged
          ? path.join(__dirname, 'preload.js')
          : path.join(__dirname, '../../.erb/dll/preload.js'),
        transparent: useTransparency,
        offscreen: this.headless,
      },
    });

    this.mainWindow.loadURL(resolveHtmlPath('mainUi.html'));

    this.mainWindow.on('ready-to-show', () => {
      if (!this.mainWindow) {
        throw new Error('"mainWindow" is not defined');
      }
      // In headless mode, never show the window — keep it offscreen.
      if (this.headless) {
        return;
      }
      if (process.env.START_MINIMIZED) {
        this.mainWindow.minimize();
      } else {
        this.mainWindow.show();
      }
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null as any;
    });

    const menu = Menu.buildFromTemplate([
      { role: 'copy' },
      { role: 'cut' },
      { role: 'paste' },
    ]);
    this.mainWindow.webContents.on('context-menu', () => {
      menu.popup();
    });

    // Open urls in the user's browser
    // mainWindow.webContents.setWindowOpenHandler((edata) => {
    //   // shell.openExternal(edata.url);
    //   console.log(edata);
    //   return { action: 'deny' };
    // });

    // Auto-updater: checks for updates on launch, broadcasts status via IPC
    new AppUpdater(this.mainWindow);
  }

  public initializeSubsystems() {
    const initSubsystem = (name: string, init: () => void) => {
      try {
        init();
      } catch (error) {
        console.error(`Failed to initialize subsystem "${name}":`, error);
      }
    };

    initSubsystem('SettingsManager', () => {
      SettingsManager.getInstance();
    });

    initSubsystem('HistoryManager', () => {
      HistoryManager.getInstance();
    });

    initSubsystem('AnalyticsManager', () => {
      const analytics = AnalyticsManager.getInstance();
      const analyticsEnabled =
        SettingsManager.getInstance().getItem('analytics.enabled');
      analytics.setEnabled(analyticsEnabled);
      analytics.capture('app_launched');
    });

    initSubsystem('OverlayManager', () => {
      setupOverlayManager(this.mainWindow);
    });

    initSubsystem('GlobalShortcuts', () => {
      const savedShortcut = SettingsManager.getInstance().getItem(
        'shortcuts.commandBar',
      );
      registerGlobalShortcuts(savedShortcut);
    });

    initSubsystem('SystemMetaIpc', () => {
      typedIpcMain.handle('get-system-meta', () => {
        return {
          platform: process.platform,
          arch: process.arch,
          osVersion: os.release(),
          electronVersion: process.versions.electron ?? '',
          chromeVersion: process.versions.chrome ?? '',
          nodeVersion: process.versions.node ?? '',
          appVersion: app.getVersion(),
          appName: app.getName(),
          gitInfo: {
            version: VERSION,
            commitHash: COMMITHASH,
            branch: BRANCH,
            lastCommitDateTime: LASTCOMMITDATETIME,
          },
        } satisfies SystemMetaIpc;
      });
    });

    initSubsystem('WindowActions', () => {
      typedIpcMain.on('window-action', (event, { action }: WindowActionIpc) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (!win || win.isDestroyed()) return;

        switch (action) {
          case 'close':
            win.close();
            break;
          case 'minimize':
            win.minimize();
            break;
          case 'maximize':
            if (win.isMaximized()) {
              win.unmaximize();
            } else {
              win.maximize();
            }
            break;
          default:
            break;
        }
      });
    });

    initSubsystem('CommandParser', () => {
      CommandParser.getInstance();
    });

    initSubsystem('CommandBar', () => {
      commandBarSetup();
    });

    initSubsystem('TabManager', () => {
      const tabManager = TabManager.initialize(this.mainWindow);
      if (this.debugMode) {
        tabManager.addTab(new Tab('https://www.electronjs.org'));
        tabManager.addTab(new Tab('https://www.google.com'));

        tabManager.addTab(new Tab('palladium://settings'));
        tabManager.addTab(new Tab('palladium://editor'));

        tabManager.focusTabIndex(3);
      } else {
        tabManager.focusTab(new Tab('https://google.com'));
      }
    });
  }

  public createMenu() {
    new MenuBuilder(this.mainWindow);
  }
}
