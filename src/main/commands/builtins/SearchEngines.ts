import { TabManager } from 'src/main/TabManager';
import type { CommandMetadata, CommandProvider } from '../CommandParser';
import { Tab } from 'src/main/Tab';

interface SearchEngine {
  name: string;
  id: string;
  shortcutCode: string;
  getSearchUrl: (query: string) => string;
}

const searchEngines: SearchEngine[] = [
  {
    name: 'Google',
    id: 'google',
    shortcutCode: 'go',
    getSearchUrl: (query: string) =>
      `https://google.com/search?q=${encodeURIComponent(query)}`,
  },
  {
    name: 'Bing',
    id: 'bing',
    shortcutCode: 'bi',
    getSearchUrl: (query: string) =>
      `https://bing.com/search?q=${encodeURIComponent(query)}`,
  },
  {
    name: 'DuckDuckGo',
    id: 'ddg',
    shortcutCode: 'ddg',
    getSearchUrl: (query: string) =>
      `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
  },
];

export class SearchEngines implements CommandProvider {
  public getProviderMetadata() {
    return { name: 'Search Engines', id: 'builtins.searchEngines' };
  }

  public getSuggestions(input: string) {
    return searchEngines.map((engine) => {
      let suggestion: ReturnType<CommandProvider['getSuggestions']>[number] = {
        name:
          input.length > 0
            ? `Search ${input} with ${engine.name}...`
            : `Search ${engine.name}`,
        value: engine.id,
        icon: 'Search',
      };

      if (engine.shortcutCode) {
        suggestion.shortcut = {
          shortcutStr: engine.shortcutCode,
          name: `Search ${engine.name}`,
          color: 'green',
        };
      }

      return suggestion;
    });
  }

  public runCommand(
    command: string,
    input: string,
    metadata?: CommandMetadata,
  ) {
    const engine = searchEngines.find((e) => e.id === command);

    let searchUrl = '';
    if (engine) {
      searchUrl = engine.getSearchUrl(input);
    } else {
      return;
    }

    let tab: Tab | undefined;
    if (metadata && metadata.tabUuid) {
      tab = TabManager.getInstance().getTabByUuid(metadata.tabUuid);
    }
    if (!tab) {
      tab = new Tab(searchUrl);
      TabManager.getInstance().focusTab(tab);
    } else {
      tab.view.webContents.loadURL(searchUrl);
    }
  }
}
