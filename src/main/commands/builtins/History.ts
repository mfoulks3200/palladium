import type {
  CommandMetadata,
  CommandProvider,
  CommandResult,
  CommandSuggestion,
} from '../CommandParser';
import { navigateOrCreateTab } from './navigation';
import { HistoryManager } from 'src/main/HistoryManager';

export class History implements CommandProvider {
  public getProviderMetadata() {
    return { name: 'History', id: 'builtins.history' };
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
    } catch {
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
      const url = item.url;
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    });

    return unique.slice(0, 10).map(
      (item) =>
        ({
          name: item.title,
          subname: item.url,
          value: item.url,
          weight: this.getUrlWeightFactors(item.url),
          icon: 'History',
          keywords: [item.url, item.metaDescription, item.metaKeywords].filter(
            Boolean,
          ),
        }) as CommandSuggestion,
    );
  }

  public runCommand(
    command: string,
    _input: string,
    metadata?: CommandMetadata,
  ): CommandResult {
    navigateOrCreateTab(command, metadata);
    return { success: true };
  }
}
