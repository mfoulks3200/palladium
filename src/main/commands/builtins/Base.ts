import type {
  CommandMetadata,
  CommandProvider,
  CommandResult,
  CommandSuggestions,
} from '../CommandParser';
import { navigateOrCreateTab } from './navigation';

function ensureProtocol(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

export class Base implements CommandProvider {
  public getProviderMetadata() {
    return { name: 'Palladium', id: 'builtins.base' };
  }

  private isUrl(input: string) {
    const hasProtocolStr = /^[a-zA-Z]*:\/\/[0-9a-zA-Z]{3,}/;
    const followsUrlFormat =
      /\b(?:(?:[A-Za-z][A-Za-z0-9+.\-]*):(?:\/\/))?(?:www\.)?[A-Za-z0-9\-]+(?:\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}(?:\/\S*)?(?=\s|$)/;
    return hasProtocolStr.test(input) || followsUrlFormat.test(input);
  }

  public getSuggestions(input: string) {
    const suggestions: CommandSuggestions = [];
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
  ): CommandResult {
    if (command === 'open') {
      const url = ensureProtocol(input);
      navigateOrCreateTab(url, metadata);
      return { success: true };
    }
    return { success: false, error: `Unknown command: ${command}` };
  }
}
