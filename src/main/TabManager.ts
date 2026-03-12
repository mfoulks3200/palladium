import { BrowserWindow, clipboard, Menu, MenuItem } from 'electron';
import { Tab } from './Tab';
import { MediaControlIpc, MediaState } from '../ipc';
import { typedWebContents } from './ipc';
import { AnalyticsManager } from './AnalyticsManager';
import { registerTabManagerIpc } from './TabManagerIpcHandlers';
import { ElectronBlocker } from '@ghostery/adblocker-electron';
import fetch from 'cross-fetch'; // required 'fetch'
import { SettingsManager } from './SettingsManager';

export class TabManager {
  private static instance: TabManager;
  private mainWindow: BrowserWindow;
  private currentTab: Tab | null = null;
  private tabs: Tab[] = [];
  public blocker: ElectronBlocker = null as any;
  private mediaStates: Map<string, MediaState> = new Map();

  public static getInstance(): TabManager {
    if (!TabManager.instance) {
      throw new Error(
        'TabManager has not been initialized. Call TabManager.initialize(mainWindow) first.',
      );
    }
    return TabManager.instance;
  }

  public static async initialize(
    mainWindow: BrowserWindow,
  ): Promise<TabManager> {
    if (TabManager.instance) {
      throw new Error('TabManager has already been initialized.');
    }
    TabManager.instance = new TabManager(mainWindow);
    TabManager.instance.blocker =
      await ElectronBlocker.fromPrebuiltAdsOnly(fetch);
    return TabManager.instance;
  }

  private constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.updateBrowsingView();
    this.updateDevtoolsView();
    mainWindow.on('resize', async () => {
      await this.updateBrowsingView();
      this.updateDevtoolsView();
    });
    mainWindow.webContents.addListener('devtools-opened', async () => {
      await this.updateBrowsingView();
      await this.updateDevtoolsView();
    });
    mainWindow.webContents.addListener('devtools-closed', async () => {
      await this.updateBrowsingView();
      await this.updateDevtoolsView();
    });
    registerTabManagerIpc(this);
    setInterval(() => {
      this.updateRenderProcess();
    }, 500);
  }

  public async updateBrowsingView(
    dimensions?: Partial<{
      x: number;
      y: number;
      width: number;
      height: number;
    }>,
  ) {
    if (!dimensions) {
      typedWebContents(this.mainWindow.webContents).send(
        'request-browser-layout',
      );
      return;
    }
    const internalSize = {
      x: (dimensions?.x ?? 0) + 1,
      y: (dimensions?.y ?? 0) + 1,
      width: (dimensions?.width ?? 0) - 2,
      height: (dimensions?.height ?? 0) - 2,
    };
    if (this.currentTab) {
      this.currentTab.view.setBounds(internalSize);
    }
  }

  public async updateDevtoolsView(
    dimensions?: Partial<{
      x: number;
      y: number;
      width: number;
      height: number;
    }>,
  ) {
    if (!dimensions) {
      typedWebContents(this.mainWindow.webContents).send(
        'request-devtools-layout',
      );
      return;
    }
    const internalSize = {
      x: (dimensions?.x ?? 0) + 1,
      y: (dimensions?.y ?? 0) + 1,
      width: (dimensions?.width ?? 0) - 2,
      height: (dimensions?.height ?? 0) - 2,
    };
    if (this.currentTab) {
      this.currentTab.devToolsView.setBounds(internalSize);
      this.currentTab.devToolsView.webContents.insertCSS(
        'body{ min-height: 100vh; }',
      );
    }
  }

  public updateRenderProcess() {
    const tabMeta = this.tabs
      .map((tab) => (tab.view ? tab.getTabIpcMeta() : undefined))
      .filter((meta) => !!meta);
    if (!this.mainWindow.isDestroyed()) {
      typedWebContents(this.mainWindow.webContents).send('update-tab-meta', {
        currentTabUuid: this.currentTab?.uuid ?? null,
        tabs: tabMeta,
      });
    }
  }

  public addTab(tab: Tab) {
    if (!this.tabs.includes(tab)) {
      this.tabs.push(tab);
      tab.addEventListener('tab-updated', () => {
        this.updateRenderProcess();
      });
      tab.addEventListener('media-state-changed', () => {
        this.syncMediaStates();
      });
      tab.addEventListener('request-focus', () => {
        if (this.currentTab === tab) {
          this.focusTab(tab);
        }
      });
      tab.addEventListener('new-window-requested', (event: Event) => {
        const { url, disposition } = (event as CustomEvent).detail;
        const newTab = new Tab(url);
        if (disposition === 'background-tab') {
          this.addTab(newTab);
        } else {
          this.focusTab(newTab);
        }
      });
    }
  }

  private syncMediaStates() {
    const previousIds = new Set(this.mediaStates.keys());
    const nextStates = new Map<string, MediaState>();
    for (const tab of this.tabs) {
      for (const state of tab.getMediaStates()) {
        nextStates.set(state.id, state);
      }
    }

    if (!this.mainWindow.isDestroyed()) {
      // Remove states that no longer exist
      for (const id of previousIds) {
        if (!nextStates.has(id)) {
          typedWebContents(this.mainWindow.webContents).send('media-state', {
            action: 'remove',
            id,
          });
        }
      }

      // Add or update current states
      for (const [id, state] of nextStates) {
        typedWebContents(this.mainWindow.webContents).send('media-state', {
          action: previousIds.has(id) ? 'update' : 'add',
          state,
        });
      }
    }

    this.mediaStates = nextStates;
  }

  public focusTab(tab: Tab) {
    this.addTab(tab);
    if (this.currentTab) {
      this.mainWindow.contentView.removeChildView(this.currentTab.view);
      this.mainWindow.contentView.removeChildView(this.currentTab.devToolsView);
    }

    this.currentTab = tab;
    this.currentTab.view.setBorderRadius(6);
    this.currentTab.devToolsView.setBorderRadius(6);
    if (!this.currentTab.isInternalPage) {
      this.mainWindow.contentView.addChildView(this.currentTab.view);
      this.mainWindow.contentView.addChildView(this.currentTab.devToolsView);

      typedWebContents(this.mainWindow.webContents).send(
        'internal-page-navigate',
        {
          newPath: '',
        },
      );
    } else {
      typedWebContents(this.mainWindow.webContents).send(
        'internal-page-navigate',
        {
          newPath: this.currentTab.getCurrentUrl(),
        },
      );
    }
    this.updateBrowsingView();
    this.updateRenderProcess();
  }

  public focusTabIndex(index: number) {
    this.focusTab(this.tabs[index]);
  }

  public focusTabUuid(uuid: string) {
    const nextTab = this.tabs.find((tab) => tab.uuid === uuid)!;
    this.focusTab(nextTab);
  }

  public getTabIndex(tabUuid: string) {
    return this.tabs.findIndex((t) => t.uuid === tabUuid);
  }

  public getTabByUuid(tabUuid: string) {
    return this.tabs.find((t) => t.uuid === tabUuid);
  }

  public getCurrentTab() {
    return this.currentTab;
  }

  public getAllTabs() {
    return [...this.tabs];
  }

  public loadUrlInCurrentTab(url: string) {
    this.currentTab?.view.webContents.loadURL(url);
  }

  public openNewTab(url: string) {
    const tab = new Tab(url);
    AnalyticsManager.getInstance().capture('tab_opened');
    this.focusTab(tab);
  }

  public openSettings() {
    const existing = this.getAllTabs().find(
      (tab) => tab.getCurrentUrl() === 'palladium://settings',
    );
    if (existing) {
      this.focusTab(existing);
    } else {
      this.focusTab(new Tab('palladium://settings'));
    }
  }

  public closeTab(uuid: string) {
    const selectedIndex = this.getTabIndex(uuid);
    const selectedTab = this.getTabByUuid(uuid);
    if (selectedIndex > 0) {
      this.focusTabIndex(selectedIndex - 1);
    }
    if (selectedTab) {
      AnalyticsManager.getInstance().capture('tab_closed');
      if (this.currentTab && uuid === this.currentTab.uuid) {
        this.mainWindow.contentView.removeChildView(this.currentTab.view);
      }
      selectedTab.view.webContents.close();
      const idx = this.tabs.indexOf(selectedTab);
      if (idx !== -1) this.tabs.splice(idx, 1);
    }
  }

  public reorderTab(startIndex: number, finishIndex: number) {
    const [removed] = this.tabs.splice(startIndex, 1);
    this.tabs.splice(finishIndex, 0, removed);
    this.updateRenderProcess();
  }

  public performTabAction(action: string) {
    switch (action) {
      case 'back':
        this.currentTab?.view.webContents.navigationHistory.goBack();
        break;
      case 'forward':
        this.currentTab?.view.webContents.navigationHistory.goForward();
        break;
      case 'refresh':
        this.currentTab?.view.webContents.reload();
        break;
      case 'hard-refresh':
        this.currentTab?.view.webContents.reloadIgnoringCache();
        break;
      case 'mute':
        this.currentTab?.setMuted(true);
        break;
      case 'unmute':
        this.currentTab?.setMuted(false);
        break;
    }
  }

  public showTabContextMenu(uuid: string) {
    const tab = this.getTabByUuid(uuid);
    if (tab) {
      const menu = new Menu();
      menu.append(
        new MenuItem({
          label: tab.getMuted() ? 'Unmute Tab' : 'Mute Tab',
          click: () => tab.setMuted(!tab.getMuted()),
        }),
      );
      menu.append(
        new MenuItem({
          label: 'Copy URL',
          click: () => clipboard.writeText(tab.getCurrentUrl()),
        }),
      );
      menu.append(
        new MenuItem({
          label: 'Copy Page Title',
          click: () => clipboard.writeText(tab.getTitle()),
        }),
      );
      menu.popup({});
    }
  }

  /**
   * Find the tab that owns a given media state ID.
   */
  private getTabByMediaId(mediaId: string): Tab | undefined {
    for (const tab of this.tabs) {
      if (tab.getMediaStates().some((s) => s.id === mediaId)) {
        return tab;
      }
    }
    return undefined;
  }

  /**
   * Execute a media control action (play, pause, next, previous) on the tab
   * that owns the given media state by injecting JavaScript into its
   * WebContents.
   */
  public async handleMediaControl(data: MediaControlIpc) {
    const tab = this.getTabByMediaId(data.mediaId);
    if (!tab || tab.view.webContents.isDestroyed()) return;

    const js = (() => {
      switch (data.action) {
        case 'play':
          return `
            (() => {
              if (navigator.mediaSession.playbackState !== 'playing') {
                const v = document.querySelectorAll('video');
                const a = document.querySelectorAll('audio');
                const all = [...v, ...a].sort((a, b) => b.duration - a.duration);
                if (all.length) all[0].play();
              }
            })()`;
        case 'pause':
          return `
            (() => {
              const v = document.querySelectorAll('video');
              const a = document.querySelectorAll('audio');
              const all = [...v, ...a].sort((a, b) => b.duration - a.duration);
              if (all.length) all[0].pause();
            })()`;
        case 'next':
          return `
            (() => {
              const handlers = navigator.mediaSession;
              if (handlers && handlers.metadata) {
                const evt = new Event('nexttrack');
                document.dispatchEvent(evt);
              }
              // Many sites use the MediaSession API action handler
              // Try triggering it directly via the internal action handler
              try { navigator.mediaSession.callActionHandler?.('nexttrack'); } catch {}
            })()`;
        case 'previous':
          return `
            (() => {
              try { navigator.mediaSession.callActionHandler?.('previoustrack'); } catch {}
            })()`;
        default:
          return '';
      }
    })();

    if (js) {
      try {
        await tab.view.webContents.executeJavaScript(js);
      } catch (e) {
        console.error(`Failed to execute media control '${data.action}':`, e);
      }
    }
  }
}
