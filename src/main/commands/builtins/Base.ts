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

  private isUrl(input: string) {
    const hasProtocolStr = /^[a-zA-Z]*:\/\/[0-9a-zA-Z]{3,}/gm;
    const followsUrlFormat =
      /\b(?:(?:[A-Za-z][A-Za-z0-9+.\-]*):(?:\/\/))?(?:www\.)?[A-Za-z0-9\-]+(?:\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}(?:\/\S*)?(?=\s|$)/gm;
    return hasProtocolStr.test(input) || followsUrlFormat.test(input);
  }

  public getSuggestions(input: string) {
    const suggestions: ReturnType<CommandProvider['getSuggestions']> = [];
    if (this.isUrl(input)) {
      suggestions.push({
        name: `Open ${input}`,
        value: 'open',
        icon: 'Globe',
      });
    }
    return suggestions;
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
