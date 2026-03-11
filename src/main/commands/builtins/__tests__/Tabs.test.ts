jest.mock('src/main/TabManager', () => ({
  TabManager: {
    getInstance: jest.fn(() => ({
      getAllTabs: jest.fn(() => []),
      focusTabUuid: jest.fn(),
    })),
  },
}));

import { Tabs } from '../Tabs';
import { TabManager } from 'src/main/TabManager';

describe('Tabs command provider', () => {
  let provider: Tabs;

  beforeEach(() => {
    provider = new Tabs();
    jest.clearAllMocks();
  });

  describe('getProviderMetadata', () => {
    it('returns correct metadata', () => {
      const meta = provider.getProviderMetadata();
      expect(meta.name).toBe('Tabs');
      expect(meta.id).toBe('builtins.tabs');
    });
  });

  describe('getSuggestions', () => {
    it('returns empty array when no tabs exist', () => {
      (TabManager.getInstance as jest.Mock).mockReturnValue({
        getAllTabs: jest.fn(() => []),
      });
      expect(provider.getSuggestions('')).toEqual([]);
    });

    it('returns tab suggestions with title and uuid', () => {
      (TabManager.getInstance as jest.Mock).mockReturnValue({
        getAllTabs: jest.fn(() => [
          {
            uuid: 'tab-1',
            getTitle: () => 'GitHub',
            getCurrentUrl: () => 'https://github.com',
            getFavicon: () => null,
          },
          {
            uuid: 'tab-2',
            getTitle: () => 'Google',
            getCurrentUrl: () => 'https://google.com',
            getFavicon: () => 'data:image/png;base64,abc',
          },
        ]),
      });

      const suggestions = provider.getSuggestions('');
      expect(suggestions).toHaveLength(2);
      expect(suggestions[0].name).toBe('GitHub');
      expect(suggestions[0].value).toBe('tab-1');
      expect(suggestions[0].icon).toBe('StickyNote'); // null favicon fallback
      expect(suggestions[1].icon).toBe('data:image/png;base64,abc');
    });

    it('filters out internal palladium:// tabs', () => {
      (TabManager.getInstance as jest.Mock).mockReturnValue({
        getAllTabs: jest.fn(() => [
          {
            uuid: 'tab-1',
            getTitle: () => 'Settings',
            getCurrentUrl: () => 'palladium://settings',
            getFavicon: () => null,
          },
          {
            uuid: 'tab-2',
            getTitle: () => 'External',
            getCurrentUrl: () => 'https://example.com',
            getFavicon: () => null,
          },
        ]),
      });

      const suggestions = provider.getSuggestions('');
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].name).toBe('External');
    });
  });

  describe('runCommand', () => {
    it('focuses the tab by UUID', () => {
      const mockFocusTabUuid = jest.fn();
      (TabManager.getInstance as jest.Mock).mockReturnValue({
        focusTabUuid: mockFocusTabUuid,
      });

      provider.runCommand('tab-123', '');
      expect(mockFocusTabUuid).toHaveBeenCalledWith('tab-123');
    });
  });
});
