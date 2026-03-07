import { TabManager } from 'src/main/TabManager';
import type { CommandMetadata, CommandProvider } from '../CommandParser';
import { Tab } from 'src/main/Tab';
import { HistoryManager } from 'src/main/HistoryManager';

const allowlistedQueryParams: { domains: string[]; params: string[] }[] = [
  { domains: ['google.com'], params: ['q'] },
];

export class History implements CommandProvider {
  public getProviderMetadata() {
    return { name: 'History', id: 'builtins.history' };
  }

  private getSanitizedUrl(input: string) {
    if (!input.includes('?')) {
      return input;
    }
    try {
      const url = new URL(input);
      const newParams = new URLSearchParams();
      const matchingParams: Set<string> = new Set();
      for (const rule of allowlistedQueryParams) {
        if (rule.domains.includes(url.host)) {
          rule.params.forEach((p) => matchingParams.add(p));
        }
      }
      for (const [key, val] of url.searchParams.entries()) {
        if (matchingParams.has(key)) {
          newParams.set(key, val);
        }
      }
      url.search = newParams.toString();
      return url.toString();
    } catch (e) {
      console.error(e);
      return input;
    }
  }

  private getUrlWeightFactors(input: string) {
    try {
      const url = new URL(input);
      const factors: boolean[] = [url.pathname.length > 1];
      return (
        factors.reduce(
          (accumulator, currentValue) => accumulator + (currentValue ? 1 : 0),
          0,
        ) / factors.length
      );
    } catch (e) {
      return 0;
    }
  }

  public getSuggestions(input: string) {
    if (input.length === 0) return [];

    let results;
    try {
      results = HistoryManager.getInstance().searchHistory(input);
    } catch {
      return [];
    }

    const seen = new Set<string>();
    const unique = results.filter((item) => {
      if (!item.title) return false;
      const sanitized = this.getSanitizedUrl(item.url);
      if (seen.has(sanitized)) return false;
      seen.add(sanitized);
      return true;
    });

    return unique.slice(0, 10).map(
      (item) =>
        ({
          name: item.title,
          subname: item.url,
          value: this.getSanitizedUrl(item.url),
          weight: this.getUrlWeightFactors(item.url),
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
