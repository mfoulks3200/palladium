import { TabManager } from 'src/main/TabManager';
import type { CommandMetadata, CommandProvider } from '../CommandParser';
import { Tab } from 'src/main/Tab';

function ensureProtocol(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
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
      const url = ensureProtocol(input);
      let tab: Tab | undefined;
      if (metadata && metadata.tabUuid) {
        tab = TabManager.getInstance().getTabByUuid(metadata.tabUuid);
      }
      if (!tab) {
        tab = new Tab(url);
        TabManager.getInstance().focusTab(tab);
      } else {
        tab.view.webContents.loadURL(url);
      }
    }
  }
}
