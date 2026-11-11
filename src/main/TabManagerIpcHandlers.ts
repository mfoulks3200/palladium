import { BrowserWindow } from 'electron';
import { TabManager } from './TabManager';
import { MediaControlIpc, TabActionsIpc, OverlayOptions } from '../ipc';
import { typedIpcMain } from './ipc';

export function registerTabManagerIpc(tabManager: TabManager) {
  const disposers: (() => void)[] = [];
  const validLayout = (
    sender: Electron.WebContents,
    { position }: OverlayOptions,
  ) => {
    const win = BrowserWindow.fromWebContents(sender);
    if (!win || win.isDestroyed()) return false;
    const [width, height] = win.getContentSize();
    return (
      position.x + position.width <= width + 1 &&
      position.y + position.height <= height + 1
    );
  };
  disposers.push(
    typedIpcMain.handle('get-space-previews', () =>
      tabManager.getSpacePreviews(),
    ),
    typedIpcMain.on('create-space', () => tabManager.createSpace()),
    typedIpcMain.on('switch-space', (_event, { space }) =>
      tabManager.switchSpace(space),
    ),
    typedIpcMain.on('move-tab-to-space', (_event, { uuid, space, activate }) =>
      tabManager.moveTabToSpace(uuid, space, activate),
    ),
    typedIpcMain.on('request-tab-meta', () => {
      tabManager.updateRenderProcess();
    }),
  );

  disposers.push(
    typedIpcMain.on('app-resize', () => {
      return Promise.all([
        tabManager.updateBrowsingView(),
        tabManager.updateDevtoolsView(),
      ]);
    }),
  );

  disposers.push(
    typedIpcMain.on('update-tab-url', (_event, url) => {
      return tabManager.loadUrlInCurrentTab(url.newUrl);
    }),
  );

  disposers.push(
    typedIpcMain.on('open-new-tab', (_event, url) => {
      tabManager.openNewTab(url.newUrl);
    }),
  );

  disposers.push(
    typedIpcMain.on('open-settings', () => {
      tabManager.openSettings();
    }),
  );

  disposers.push(
    typedIpcMain.on('browser-layout-change', (event, size: OverlayOptions) => {
      if (!validLayout(event.sender, size)) return;
      return tabManager.updateBrowsingView({
        x: size.position.x,
        y: size.position.y,
        width: size.position.width,
        height: size.position.height,
      });
    }),
  );

  disposers.push(
    typedIpcMain.on('devtools-layout-change', (event, size: OverlayOptions) => {
      if (!validLayout(event.sender, size)) return;
      return tabManager.updateDevtoolsView({
        x: size.position.x,
        y: size.position.y,
        width: size.position.width,
        height: size.position.height,
      });
    }),
  );

  disposers.push(
    typedIpcMain.on('update-active-tab', (_event, newTabMeta) => {
      if (tabManager.getTabByUuid(newTabMeta.activeTabUuid))
        tabManager.focusTabUuid(newTabMeta.activeTabUuid);
    }),
  );

  disposers.push(
    typedIpcMain.on('close-tab', (_event, tabMeta) => {
      if (tabManager.getTabByUuid(tabMeta.uuid))
        tabManager.closeTab(tabMeta.uuid);
    }),
  );

  disposers.push(
    typedIpcMain.on('reorder-tab', (_event, data) => {
      const count = tabManager.getAllTabs().length;
      if (data.startIndex >= count || data.finishIndex >= count) return;
      tabManager.reorderTab(data.startIndex, data.finishIndex);
    }),
  );

  disposers.push(
    typedIpcMain.on('tab-actions', (_event, actions: TabActionsIpc) => {
      tabManager.performTabAction(actions.action);
    }),
  );

  disposers.push(
    typedIpcMain.on('tab-context-menu', (_event, newTabMeta) => {
      if (tabManager.getTabByUuid(newTabMeta.uuid))
        tabManager.showTabContextMenu(newTabMeta.uuid);
    }),
  );

  disposers.push(
    typedIpcMain.on('media-control', (_event, data: MediaControlIpc) => {
      return tabManager.handleMediaControl(data);
    }),
  );
  return () => disposers.forEach((dispose) => dispose());
}
