import { TabManager } from 'src/main/TabManager';
import type { CommandMetadata, CommandProvider } from '../CommandParser';
import { Tab } from 'src/main/Tab';
import { SettingsKeys } from 'src/ipc/SettingsRegistry';
import { SettingsManager } from 'src/main/SettingsManager';

interface SearchEngine {
  name: string;
  enableSettingKey: SettingsKeys;
  id: string;
  shortcutCode: string;
  getSearchUrl: (query: string) => string;
}

export class Base implements CommandProvider {
  public getProviderMetadata() {
    return { name: 'Palladium', id: 'builtins.base' };
  }

  public getSuggestions(input: string) {
    return [
      {
        name: `Open ${input}`,
        value: 'open',
        icon: 'StickyNote',
      },
    ] as ReturnType<CommandProvider['getSuggestions']>;
  }

  public runCommand(
    command: string,
    input: string,
    metadata?: CommandMetadata,
  ) {
    if (command === 'open') {
      let tab: Tab | undefined;
      if (metadata && metadata.tabUuid) {
        tab = TabManager.getInstance().getTabByUuid(metadata.tabUuid);
      }
      if (!tab) {
        tab = new Tab(input);
        TabManager.getInstance().focusTab(tab);
      } else {
        tab.view.webContents.loadURL(input);
      }
    }
  }
}
