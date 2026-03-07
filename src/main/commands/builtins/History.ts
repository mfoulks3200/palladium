import { TabManager } from 'src/main/TabManager';
import type { CommandMetadata, CommandProvider } from '../CommandParser';
import { Tab } from 'src/main/Tab';
import { HistoryManager } from 'src/main/HistoryManager';

export class History implements CommandProvider {
  public getProviderMetadata() {
    return { name: 'History', id: 'builtins.history' };
  }

  public getSuggestions(input: string) {
    if (input.length === 0) return [];

    const results = HistoryManager.getInstance().searchHistory(input);

    const seen = new Set<string>();
    const unique = results.filter((item) => {
      if (!item.title) return false;
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });

    return unique.slice(0, 10).map(
      (item) =>
        ({
          name: item.title,
          value: item.url,
          icon: 'History',
          keywords: [item.url, item.metaDescription, item.metaKeywords].filter(
            Boolean,
          ),
        }) as ReturnType<CommandProvider['getSuggestions']>[number],
    );
  }

  public runCommand(
    command: string,
    input: string,
    metadata?: CommandMetadata,
  ) {
    const url = command;
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
