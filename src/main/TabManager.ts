import {
  BrowserWindow,
  clipboard,
  ipcMain,
  Menu,
  MenuItem,
  WebContentsView,
} from 'electron';
import { Tab } from './Tab';
import { TabActionsIpc, TabManagerIpc } from 'src/ipc/Tabs';
import { disablePortals } from '@/components/PortalOverlay';
import { OverlayOptions } from 'src/ipc/Overlay';

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
    ipcMain.on('update-tab-meta', () => {
      this.updateRenderProcess();
    });
    ipcMain.on('app-resize', (_event, size) => {
      this.updateBrowsingView();
    });
    ipcMain.on('update-tab-url', (_event, url) => {
      this.currentTab?.view.webContents.loadURL(url.newUrl);
    });
    ipcMain.on('open-new-tab', (_event, url) => {
      const tab = new Tab(url.newUrl);
      this.focusTab(tab);
    });
    ipcMain.on('browser-layout-change', (_event, size: OverlayOptions) => {
      this.updateBrowsingView({
        x: size.position.x,
        y: size.position.y,
        width: size.position.width,
        height: size.position.height,
      });
    });
    ipcMain.on('update-active-tab', (_event: any, newTabMeta: any) => {
      console.log('Switching to tab uuid', newTabMeta);
      this.focusTabUuid(newTabMeta.activeTabUuid);
    });
    ipcMain.on('update-active-tab', (_event: any, newTabMeta: any) => {
      console.log('Switching to tab uuid', newTabMeta);
      this.focusTabUuid(newTabMeta.activeTabUuid);
    });
    ipcMain.on('close-tab', (_event: any, tabMeta: any) => {
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
    ipcMain.on('tab-actions', (_event: any, actions: TabActionsIpc) => {
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
    ipcMain.on('tab-context-menu', (_event: any, newTabMeta: any) => {
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
      this.mainWindow.webContents.send('browser-layout-change');
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
    this.mainWindow.webContents.send('update-tab-meta', {
      currentTabUuid: this.currentTab?.uuid ?? null,
      tabs: tabMeta,
    } as TabManagerIpc);
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
