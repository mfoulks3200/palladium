import { app, BrowserWindow, shell, screen, BrowserView, Menu } from 'electron';
import path from 'node:path';
import MenuBuilder from './menu';
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
        : { trafficLightPosition: { x: 15, y: 20 } }),
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
    this.mainWindow.webContents.on('context-menu', (_event, params) => {
      // only show the context menu if the element is editable
      // if (params.isEditable) {
      console.log(params);
      menu.popup();
      // }
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
    SettingsManager.getInstance();

    HistoryManager.getInstance();

    setupOverlayManager(this.mainWindow);

    registerGlobalShortcuts();

    CommandParser.getInstance();

    commandBarSetup();

    const tabManager = new TabManager(this.mainWindow);
    if (this.debugMode) {
      tabManager.addTab(new Tab('https://www.electronjs.org'));
      tabManager.addTab(new Tab('https://www.google.com'));
      // tabManager.addTab(
      //   new Tab(
      //     'https://www.youtube.com/watch?v=WUbnO5hz_-U&list=RDWUbnO5hz_-U&start_radio=1',
      //   ),
      // );

      tabManager.addTab(new Tab('palladium://settings'));
      tabManager.addTab(new Tab('palladium://editor'));

      tabManager.focusTabIndex(3);
    } else {
      tabManager.focusTab(new Tab('https://google.com'));
    }
  }

  public createMenu() {
    const menuBuilder = new MenuBuilder(this.mainWindow);
  }
}
