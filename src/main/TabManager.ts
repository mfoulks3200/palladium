import { BrowserWindow, clipboard, Menu, MenuItem } from 'electron';
import { Tab } from './Tab';
import { SpaceSession } from './SpaceSession';
import { sessionUrl } from '../ipc/RequestSchemas';
import { MediaControlIpc, MediaState, TabManagerIpc } from '../ipc';
import { typedWebContents } from './ipc';
import { AnalyticsManager } from './AnalyticsManager';
import { registerTabManagerIpc } from './TabManagerIpcHandlers';

interface Space {
  tabs: Tab[];
  selected: Tab | null;
}

export class TabManager {
  private static instance: TabManager | null = null;
  private mainWindow: BrowserWindow;
  private currentTab: Tab | null = null;
  private spaces: Space[] = [{ tabs: [], selected: null }];
  private activeSpace = 0;

  private get tabs() {
    return this.spaces[this.activeSpace].tabs;
  }

  private mediaStates: Map<string, MediaState> = new Map();

  public static getInstance(): TabManager {
    if (!TabManager.instance) {
      throw new Error(
        'TabManager has not been initialized. Call TabManager.initialize(mainWindow) first.',
      );
    }
    return TabManager.instance;
  }

  public static initialize(mainWindow: BrowserWindow): TabManager {
    if (TabManager.instance) {
      throw new Error('TabManager has already been initialized.');
    }
    TabManager.instance = new TabManager(mainWindow);
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
    const disposeIpc = registerTabManagerIpc(this);
    const timer = setInterval(() => this.updateRenderProcess(), 500);
    mainWindow.once('closed', () => {
      clearInterval(timer);
      disposeIpc();
      const tabs = this.getAllTabs();
      this.spaces = [];
      this.currentTab = null;
      this.mediaStates.clear();
      tabs.forEach((tab) => tab.destroyTab());
      if (TabManager.instance === this) TabManager.instance = null;
    });
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
      x: Math.round(dimensions?.x ?? 0) + 1,
      y: Math.round(dimensions?.y ?? 0) + 1,
      width: Math.max(0, Math.round(dimensions?.width ?? 0) - 2),
      height: Math.max(0, Math.round(dimensions?.height ?? 0) - 2),
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
      x: Math.round(dimensions?.x ?? 0) + 1,
      y: Math.round(dimensions?.y ?? 0) + 1,
      width: Math.max(0, Math.round(dimensions?.width ?? 0) - 2),
      height: Math.max(0, Math.round(dimensions?.height ?? 0) - 2),
    };
    if (this.currentTab) {
      this.currentTab.devToolsView.setBounds(internalSize);
      this.currentTab.devToolsView.webContents.insertCSS(
        'body{ min-height: 100vh; }',
      );
    }
  }

  private spacePreview(space: Space) {
    return {
      tabs: space.tabs
        .filter((tab) => tab.view)
        .map((tab) => tab.getTabIpcMeta()),
      selected: (space.selected ?? space.tabs[0])?.uuid ?? null,
    };
  }

  public getSpacePreviews() {
    return this.spaces.map((space) => this.spacePreview(space));
  }

  public updateRenderProcess() {
    if (!this.mainWindow.isDestroyed()) {
      const neighbors: TabManagerIpc['neighbors'] = {};
      for (const index of [this.activeSpace - 1, this.activeSpace + 1]) {
        const space = this.spaces[index];
        if (space) neighbors[index] = this.spacePreview(space);
      }
      typedWebContents(this.mainWindow.webContents).send('update-tab-meta', {
        neighbors,
        activeSpace: this.activeSpace,
        spaceCount: this.spaces.length,
        currentTabUuid: this.currentTab?.uuid ?? null,
        tabs: this.spacePreview(this.spaces[this.activeSpace]).tabs,
      });
    }
  }

  public addTab(tab: Tab, space = this.spaces[this.activeSpace]) {
    if (!this.spaces.some((s) => s.tabs.includes(tab))) {
      space.tabs.push(tab);
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
          this.addTab(
            newTab,
            this.spaces.find((s) => s.tabs.includes(tab)),
          );
        } else {
          this.focusTab(newTab);
        }
      });
    }
  }

  private syncMediaStates() {
    const previousIds = new Set(this.mediaStates.keys());
    const nextStates = new Map<string, MediaState>();
    for (const tab of this.getAllTabs()) {
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
    this.activeSpace = this.spaces.findIndex((space) =>
      space.tabs.includes(tab),
    );
    this.spaces[this.activeSpace].selected = tab;
    this.showTab(tab);
  }

  private showTab(tab: Tab | null) {
    if (this.currentTab) {
      this.mainWindow.contentView.removeChildView(this.currentTab.view);
      this.mainWindow.contentView.removeChildView(this.currentTab.devToolsView);
    }

    this.currentTab = tab;
    if (!this.currentTab) {
      typedWebContents(this.mainWindow.webContents).send(
        'internal-page-navigate',
        { newPath: '' },
      );
      this.updateRenderProcess();
      return;
    }
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
    if (this.tabs[index]) this.focusTab(this.tabs[index]);
  }

  public focusTabUuid(uuid: string) {
    const nextTab = this.getTabByUuid(uuid);
    if (nextTab) this.focusTab(nextTab);
  }

  public getTabByUuid(tabUuid: string) {
    return this.getAllTabs().find((t) => t.uuid === tabUuid);
  }

  public getCurrentTab() {
    return this.currentTab;
  }

  public getAllTabs() {
    return this.spaces.flatMap((space) => space.tabs);
  }

  public loadUrlInCurrentTab(url: string) {
    return this.currentTab?.view.webContents.loadURL(url);
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

  public restoreSession(session: SpaceSession) {
    const saved = session.read();
    if (saved) {
      this.spaces = saved.spaces.map(() => ({ tabs: [], selected: null }));
      saved.spaces.forEach(({ tabs, selected }, index) => {
        const space = this.spaces[index];
        tabs.forEach((url) => this.addTab(new Tab(url), space));
        space.selected = selected === null ? null : space.tabs[selected];
      });
      this.activeSpace = saved.activeSpace;
      this.showTab(this.spaces[this.activeSpace].selected);
    }
    this.mainWindow.on('close', () => {
      try {
        session.write({
          version: 1,
          activeSpace: this.activeSpace,
          spaces: this.spaces.map(({ tabs, selected }) => ({
            tabs: tabs.map((tab) => {
              const url = tab.getCurrentUrl();
              return sessionUrl.safeParse(url).success ? url : 'about:blank';
            }),
            selected: selected ? tabs.indexOf(selected) : null,
          })),
        });
      } catch {
        console.warn('Could not save spaces on close.');
      }
    });
    return saved !== null;
  }

  public createSpace() {
    this.spaces.push({ tabs: [], selected: null });
    this.switchSpace(this.spaces.length - 1);
  }

  public switchSpace(index: number) {
    const space = this.spaces[index];
    if (!space || index === this.activeSpace) return;
    this.activeSpace = index;
    space.selected ??= space.tabs[0] ?? null;
    this.showTab(space.selected);
  }

  private removeFromSpace(tab: Tab, space: Space) {
    const index = space.tabs.indexOf(tab);
    space.tabs.splice(index, 1);
    if (space.selected === tab) {
      space.selected = space.tabs[Math.max(0, index - 1)] ?? null;
      if (this.currentTab === tab) this.showTab(space.selected);
    }
  }

  public moveTabToSpace(uuid: string, index: number, activate = false) {
    const destination = this.spaces[index];
    const tab = this.tabs.find((item) => item.uuid === uuid);
    if (!tab || !destination || index === this.activeSpace) return;
    this.removeFromSpace(tab, this.spaces[this.activeSpace]);
    destination.tabs.push(tab);
    if (activate) this.focusTab(tab);
    else this.updateRenderProcess();
  }

  public closeTab(uuid: string) {
    const tab = this.getTabByUuid(uuid);
    if (!tab) return;
    const space = this.spaces.find((item) => item.tabs.includes(tab))!;
    this.removeFromSpace(tab, space);
    tab.destroyTab();
    this.syncMediaStates();
    this.updateRenderProcess();
    AnalyticsManager.getInstance().capture('tab_closed');
  }

  public reorderTab(startIndex: number, finishIndex: number) {
    if (
      !Number.isInteger(startIndex) ||
      !Number.isInteger(finishIndex) ||
      startIndex < 0 ||
      finishIndex < 0 ||
      startIndex >= this.tabs.length ||
      finishIndex >= this.tabs.length
    )
      return;
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
    for (const tab of this.getAllTabs()) {
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
