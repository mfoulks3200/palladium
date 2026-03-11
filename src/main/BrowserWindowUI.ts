import { app, BrowserWindow, shell, screen, BrowserView, Menu } from 'electron';
import os from 'node:os';
import path from 'node:path';
import MenuBuilder from './menu';
import { typedIpcMain } from './ipc';
import { SystemMetaIpc, WindowActionIpc } from '../ipc';
import { SettingsManager } from './SettingsManager';
import { HistoryManager } from './HistoryManager';
import { setupOverlayManager } from './OverlayManager';
import { registerGlobalShortcuts } from './GlobalShortcuts';
import { CommandParser } from './commands/CommandParser';
import { commandBarSetup } from './commands/CommandBar';
import { TabManager } from './TabManager';
import { Tab } from './Tab';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { resolveHtmlPath } from './util';
import { AnalyticsManager } from './AnalyticsManager';

class AppUpdater {
  constructor() {
    log.transports.file.level = false;
    log.transports.console.level = false;
    // log.transports.file.level = 'info';
    // autoUpdater.logger = log;
    // autoUpdater.checkForUpdatesAndNotify();
  }
}

export class BrowserWindowUI {
  public mainWindow: BrowserWindow = null as any;
  public debugMode: boolean = false;

  constructor(debugMode?: boolean) {
    this.debugMode = !!debugMode;
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
      transparent: true,
      frame: false,
      backgroundColor: '#FFFFFF00',
      icon: getAssetPath('icon.png'),
      webPreferences: {
        preload: app.isPackaged
          ? path.join(__dirname, 'preload.js')
          : path.join(__dirname, '../../.erb/dll/preload.js'),
        transparent: true,
        // devTools: false,
      },
    });

    this.mainWindow.loadURL(resolveHtmlPath('mainUi.html'));

    this.mainWindow.on('ready-to-show', () => {
      if (!this.mainWindow) {
        throw new Error('"mainWindow" is not defined');
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
    this.mainWindow.webContents.on('context-menu', (_event, _params) => {
      menu.popup();
    });

    // Open urls in the user's browser
    // mainWindow.webContents.setWindowOpenHandler((edata) => {
    //   // shell.openExternal(edata.url);
    //   console.log(edata);
    //   return { action: 'deny' };
    // });

    // Remove this if your app does not use auto updates
    // eslint-disable-next-line
    new AppUpdater();
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
      registerGlobalShortcuts();
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
    const menuBuilder = new MenuBuilder(this.mainWindow);
  }
}
