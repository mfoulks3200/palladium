jest.mock('src/main/TabManager', () => ({
  TabManager: {
    getInstance: jest.fn(() => ({
      getTabByUuid: jest.fn(),
      focusTab: jest.fn(),
    })),
  },
}));

jest.mock('src/main/Tab', () => ({
  Tab: jest.fn().mockImplementation((url: string) => ({
    url,
    view: { webContents: { loadURL: jest.fn() } },
  })),
}));

jest.mock('src/main/SettingsManager', () => ({
  SettingsManager: {
    getInstance: jest.fn(() => ({
      getItem: jest.fn((key: string) => {
        if (key === 'searchEngines.custom') return [];
        return true; // all default engines enabled
      }),
    })),
  },
}));

import { SearchEngines } from '../SearchEngines';
import { SettingsManager } from 'src/main/SettingsManager';

describe('SearchEngines command provider', () => {
  let provider: SearchEngines;

  beforeEach(() => {
    provider = new SearchEngines();
    jest.clearAllMocks();

    // Re-setup default mock
    (SettingsManager.getInstance as jest.Mock).mockReturnValue({
      getItem: jest.fn((key: string) => {
        if (key === 'searchEngines.custom') return [];
        return true;
      }),
    });
  });

  describe('getProviderMetadata', () => {
    it('returns correct metadata', () => {
      const meta = provider.getProviderMetadata();
      expect(meta.name).toBe('Search Engines');
      expect(meta.id).toBe('builtins.searchEngines');
    });
  });

  describe('getSuggestions', () => {
    it('returns all default engines when all are enabled', () => {
      const suggestions = provider.getSuggestions('');
      const names = suggestions.map((s) => s.name);
      expect(names).toContain('Search Google');
      expect(names).toContain('Search Bing');
      expect(names).toContain('Search DuckDuckGo');
    });

    it('includes search query in suggestion name when input provided', () => {
      const suggestions = provider.getSuggestions('hello world');
      expect(suggestions[0].name).toContain('hello world');
      expect(suggestions[0].name).toContain('Search');
    });

    it('includes shortcuts on suggestions', () => {
      const suggestions = provider.getSuggestions('');
      const google = suggestions.find((s) => s.name === 'Search Google');
      expect(google?.shortcut).toBeDefined();
      expect(google?.shortcut?.shortcutStr).toBe('go');
    });

    it('filters out disabled engines', () => {
      (SettingsManager.getInstance as jest.Mock).mockReturnValue({
        getItem: jest.fn((key: string) => {
          if (key === 'searchEngines.custom') return [];
          if (key === 'searchEngines.defaultEngines.google') return false;
          return true;
        }),
      });

      const suggestions = provider.getSuggestions('');
      const names = suggestions.map((s) => s.name);
      expect(names).not.toContain('Search Google');
      expect(names).toContain('Search Bing');
    });

    it('includes custom search engines', () => {
      (SettingsManager.getInstance as jest.Mock).mockReturnValue({
        getItem: jest.fn((key: string) => {
          if (key === 'searchEngines.custom') {
            return [
              {
                name: 'GitHub',
                shortcut: 'gh',
                urlPattern: 'https://github.com/search?q=%s',
              },
            ];
          }
          return true;
        }),
      });

      const suggestions = provider.getSuggestions('react');
      const github = suggestions.find((s) => s.name.includes('GitHub'));
      expect(github).toBeDefined();
    });
  });

  describe('runCommand', () => {
    it('creates a tab with the correct search URL for Google', () => {
      const { Tab } = require('src/main/Tab');
      const { TabManager } = require('src/main/TabManager');
      TabManager.getInstance.mockReturnValue({
        getTabByUuid: jest.fn(),
        focusTab: jest.fn(),
      });

      provider.runCommand('google', 'test query');

      expect(Tab).toHaveBeenCalledWith(
        expect.stringContaining('google.com/search'),
      );
    });

    it('does nothing for unknown engine id', () => {
      const { Tab } = require('src/main/Tab');
      Tab.mockClear();

      provider.runCommand('nonexistent', 'test');
      expect(Tab).not.toHaveBeenCalled();
    });

    it('navigates existing tab when tabUuid provided', () => {
      const mockLoadURL = jest.fn();
      const { TabManager } = require('src/main/TabManager');
      TabManager.getInstance.mockReturnValue({
        getTabByUuid: jest.fn(() => ({
          view: { webContents: { loadURL: mockLoadURL } },
        })),
        focusTab: jest.fn(),
      });

      provider.runCommand('google', 'test', { tabUuid: 'tab-1' });
      expect(mockLoadURL).toHaveBeenCalledWith(
        expect.stringContaining('google.com/search'),
      );
    });
  });
});
