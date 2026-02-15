import {
  BrowserWindow,
  clipboard,
  Menu,
  MenuItem,
  WebContentsView,
} from 'electron';
import { Tab } from './Tab';
import { TabActionsIpc, TabManagerIpc, OverlayOptions } from '../ipc';
import { disablePortals } from '@/components/PortalOverlay';
import { typedIpcMain, typedWebContents } from './ipc';

let browsingView: WebContentsView;
const padding = 12;
const sidebarWidth = 256 + padding * 2;

export class TabManager {
  private mainWindow: BrowserWindow;
  private currentTab: Tab | null = null;
  private tabs: Set<Tab> = new Set();

  public constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.updateBrowsingView();
    mainWindow.on('resize', async () => {
      await this.updateBrowsingView();
    });
    mainWindow.webContents.addListener('devtools-opened', async () => {
      await this.updateBrowsingView();
    });
    mainWindow.webContents.addListener('devtools-closed', async () => {
      await this.updateBrowsingView();
    });
    typedIpcMain.on('update-tab-meta', () => {
      this.updateRenderProcess();
    });
    typedIpcMain.on('app-resize', (_event, size) => {
      this.updateBrowsingView();
    });
    typedIpcMain.on('update-tab-url', (_event, url) => {
      this.currentTab?.view.webContents.loadURL(url.newUrl);
    });
    typedIpcMain.on('open-new-tab', (_event, url) => {
      const tab = new Tab(url.newUrl);
      this.focusTab(tab);
    });
    typedIpcMain.on('browser-layout-change', (_event, size: OverlayOptions) => {
      this.updateBrowsingView({
        x: size.position.x,
        y: size.position.y,
        width: size.position.width,
        height: size.position.height,
      });
    });
    typedIpcMain.on('update-active-tab', (_event, newTabMeta) => {
      console.log('Switching to tab uuid', newTabMeta);
      this.focusTabUuid(newTabMeta.activeTabUuid);
    });
    typedIpcMain.on('close-tab', (_event, tabMeta) => {
      console.log('Closing tab uuid', tabMeta.uuid);
      const selectedIndex = this.getTabIndex(tabMeta.uuid);
      const selectedTab = this.getTabByUuid(tabMeta.uuid);
      if (selectedIndex - 0 > 0) {
        this.focusTabIndex(selectedIndex - 0);
      }
      if (selectedTab) {
        if (this.currentTab && tabMeta.uuid === this.currentTab.uuid) {
          this.mainWindow.contentView.removeChildView(this.currentTab.view);
        }
        selectedTab.view.webContents.close();
        this.tabs.delete(selectedTab);
      }
    });
    typedIpcMain.on('reorder-tab', (_event, data) => {
      console.log('Reordering tab', data);
      const tabArray = [...this.tabs];
      const [removed] = tabArray.splice(data.startIndex, 1);
      tabArray.splice(data.finishIndex, 0, removed);
      this.tabs = new Set(tabArray);
      this.updateRenderProcess();
    });
    typedIpcMain.on('tab-actions', (_event, actions: TabActionsIpc) => {
      switch (actions.action) {
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
    });
    typedIpcMain.on('tab-context-menu', (_event, newTabMeta) => {
      const tab = this.getTabByUuid(newTabMeta.uuid);
      console.log('Context menu on tab uuid', newTabMeta, tab?.getTitle());
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
    });
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
        'browser-layout-change',
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

  public updateRenderProcess() {
    const tabMeta = [...this.tabs].map((tab) => tab.getTabIpcMeta());
    typedWebContents(this.mainWindow.webContents).send('update-tab-meta', {
      currentTabUuid: this.currentTab?.uuid ?? null,
      tabs: tabMeta,
    });
  }

  public addTab(tab: Tab) {
    if (!this.tabs.has(tab)) {
      this.tabs.add(tab);
      tab.addEventListener('tab-updated', () => {
        this.updateRenderProcess();
      });
    }
  }

  public focusTab(tab: Tab) {
    this.addTab(tab);
    if (this.currentTab) {
      this.mainWindow.contentView.removeChildView(this.currentTab.view);
    }

    this.currentTab = tab;
    this.currentTab.view.setBorderRadius(13);
    if (!disablePortals) {
      this.mainWindow.contentView.addChildView(this.currentTab.view);
    }
    this.updateBrowsingView();
    this.updateRenderProcess();
  }

  public focusTabIndex(tab: number) {
    this.focusTab([...this.tabs][tab]);
  }

  public focusTabUuid(uuid: string) {
    const nextTab = [...this.tabs].find((tab) => tab.uuid == uuid)!;
    console.log('Switching to ', nextTab);
    this.focusTab(nextTab);
  }

  public getTabIndex(tabUuid: string) {
    return [...this.tabs].findIndex((t) => t.uuid === tabUuid);
  }

  public getTabByUuid(tabUuid: string) {
    return [...this.tabs].find((t) => t.uuid === tabUuid);
  }
}
