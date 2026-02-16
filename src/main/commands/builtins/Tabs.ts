import { TabManager } from 'src/main/TabManager';
import type { CommandMetadata, CommandProvider } from '../CommandParser';

export class Tabs implements CommandProvider {
  public getProviderMetadata() {
    return { name: 'Tabs', id: 'builtins.tabs' };
  }

  public getSuggestions(input: string) {
    return TabManager.getInstance()
      .getAllTabs()
      .map(
        (tab) =>
          ({
            name: tab.getTitle(),
            value: tab.uuid,
            icon: tab.getFavicon() ?? 'StickyNote',
          }) as ReturnType<CommandProvider['getSuggestions']>[number],
      );
  }

  public runCommand(
    command: string,
    input: string,
    metadata?: CommandMetadata,
  ) {
    TabManager.getInstance().focusTabUuid(command);
  }
}
