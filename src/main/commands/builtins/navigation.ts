import { Tab } from 'src/main/Tab';
import { TabManager } from 'src/main/TabManager';
import type { CommandMetadata } from '../CommandParser';

/**
 * Shared navigation helper for command providers.
 * Navigates an existing tab (from metadata) or creates a new one.
 */
export function navigateOrCreateTab(
  url: string,
  metadata?: CommandMetadata,
): void {
  const tab = metadata?.tab;
  if (tab) {
    tab.view.webContents.loadURL(url);
  } else {
    const newTab = new Tab(url);
    TabManager.getInstance().focusTab(newTab);
  }
}
