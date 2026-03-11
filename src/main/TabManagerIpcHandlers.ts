import { TabManager } from './TabManager';
import { MediaControlIpc, TabActionsIpc, OverlayOptions } from '../ipc';
import { typedIpcMain } from './ipc';

export function registerTabManagerIpc(tabManager: TabManager) {
  typedIpcMain.on('update-tab-meta', () => {
    tabManager.updateRenderProcess();
  });

  typedIpcMain.on('app-resize', () => {
    tabManager.updateBrowsingView();
    tabManager.updateDevtoolsView();
  });

  typedIpcMain.on('update-tab-url', (_event, url) => {
    tabManager.loadUrlInCurrentTab(url.newUrl);
  });

  typedIpcMain.on('open-new-tab', (_event, url) => {
    tabManager.openNewTab(url.newUrl);
  });

  typedIpcMain.on('open-settings', () => {
    tabManager.openSettings();
  });

  typedIpcMain.on('browser-layout-change', (_event, size: OverlayOptions) => {
    tabManager.updateBrowsingView({
      x: size.position.x,
      y: size.position.y,
      width: size.position.width,
      height: size.position.height,
    });
  });

  typedIpcMain.on('devtools-layout-change', (_event, size: OverlayOptions) => {
    tabManager.updateDevtoolsView({
      x: size.position.x,
      y: size.position.y,
      width: size.position.width,
      height: size.position.height,
    });
  });

  typedIpcMain.on('update-active-tab', (_event, newTabMeta) => {
    tabManager.focusTabUuid(newTabMeta.activeTabUuid);
  });

  typedIpcMain.on('close-tab', (_event, tabMeta) => {
    tabManager.closeTab(tabMeta.uuid);
  });

  typedIpcMain.on('reorder-tab', (_event, data) => {
    tabManager.reorderTab(data.startIndex, data.finishIndex);
  });

  typedIpcMain.on('tab-actions', (_event, actions: TabActionsIpc) => {
    tabManager.performTabAction(actions.action);
  });

  typedIpcMain.on('tab-context-menu', (_event, newTabMeta) => {
    tabManager.showTabContextMenu(newTabMeta.uuid);
  });

  typedIpcMain.on('media-control', (_event, data: MediaControlIpc) => {
    tabManager.handleMediaControl(data);
  });
}
