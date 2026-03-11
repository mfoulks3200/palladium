import { TabManager } from 'src/main/TabManager';
import type {
  CommandProvider,
  CommandResult,
  CommandSuggestion,
} from '../CommandParser';

export class Tabs implements CommandProvider {
  public getProviderMetadata() {
    return { name: 'Tabs', id: 'builtins.tabs' };
  }

  public getSuggestions(input: string) {
    return TabManager.getInstance()
      .getAllTabs()
      .filter((tab) => !tab.getCurrentUrl().startsWith('palladium://'))
      .map(
        (tab) =>
          ({
            name: tab.getTitle(),
            value: tab.uuid,
            icon: tab.getFavicon() ?? 'StickyNote',
          }) as CommandSuggestion,
      );
  }

  public runCommand(command: string, _input: string): CommandResult {
    TabManager.getInstance().focusTabUuid(command);
    return { success: true };
  }
}
