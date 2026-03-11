import type {
  CommandMetadata,
  CommandProvider,
  CommandResult,
  CommandSuggestion,
} from '../CommandParser';
import { navigateOrCreateTab } from './navigation';
import { SettingsKeys } from 'src/ipc/SettingsRegistry';
import { SettingsManager } from 'src/main/SettingsManager';

interface SearchEngine {
  name: string;
  enableSettingKey: SettingsKeys;
  id: string;
  shortcutCode: string;
  getSearchUrl: (query: string) => string;
}

const searchEngines: SearchEngine[] = [
  {
    name: 'Google',
    id: 'google',
    enableSettingKey: 'searchEngines.defaultEngines.google',
    shortcutCode: 'go',
    getSearchUrl: (query: string) => {
      const params = new URLSearchParams();
      params.append('q', query);
      params.append('oq', query);
      params.append('sourceid', 'chrome');
      params.append('ie', 'utf8');
      params.append('hl', 'en');
      params.append('source', 'hp');
      return `https://google.com/search?${params.toString()}`;
    },
  },
  {
    name: 'Bing',
    id: 'bing',
    enableSettingKey: 'searchEngines.defaultEngines.bing',
    shortcutCode: 'bi',
    getSearchUrl: (query: string) =>
      `https://bing.com/search?q=${encodeURIComponent(query)}`,
  },
  {
    name: 'DuckDuckGo',
    id: 'ddg',
    enableSettingKey: 'searchEngines.defaultEngines.duckDuckGo',
    shortcutCode: 'ddg',
    getSearchUrl: (query: string) =>
      `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
  },
];

export class SearchEngines implements CommandProvider {
  public getProviderMetadata() {
    return { name: 'Search Engines', id: 'builtins.searchEngines' };
  }

  private getActiveEngines() {
    const builtinEngines = searchEngines
      .filter((engine) => {
        const enabled = SettingsManager.getInstance().getItem(
          engine.enableSettingKey,
        );
        return enabled;
      })
      .map((engine) => ({
        id: engine.id,
        name: engine.name,
        shortcut: engine.shortcutCode,
        getSearchUrl: engine.getSearchUrl,
      }));

    const customEngines = SettingsManager.getInstance()
      .getItem('searchEngines.custom')
      .map((engine, index) => ({
        id: `custom-${index}`,
        name: engine.name,
        shortcut: engine.shortcut,
        getSearchUrl: (query: string) =>
          engine.urlPattern.replace('%s', encodeURIComponent(query)),
      }));

    return [...builtinEngines, ...customEngines];
  }

  public getSuggestions(input: string) {
    return this.getActiveEngines().map((engine) => {
      let suggestion: CommandSuggestion = {
        name:
          input.length > 0
            ? `Search ${input} with ${engine.name}...`
            : `Search ${engine.name}`,
        value: engine.id,
        icon: 'Search',
        keywords: [engine.name, engine.name.toLowerCase()],
      };

      if (engine.shortcut) {
        suggestion.shortcut = {
          shortcutStr: engine.shortcut,
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
  ): CommandResult {
    const engine = this.getActiveEngines().find((e) => e.id === command);
    if (!engine) {
      return { success: false, error: `Unknown search engine: ${command}` };
    }

    const searchUrl = engine.getSearchUrl(input);
    navigateOrCreateTab(searchUrl, metadata);
    return { success: true };
  }
}
