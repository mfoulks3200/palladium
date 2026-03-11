// Mock Electron dependencies before imports
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

jest.mock('src/main/HistoryManager', () => ({
  HistoryManager: {
    getInstance: jest.fn(() => ({
      searchHistory: jest.fn(() => []),
    })),
  },
}));

import { History } from '../History';
import { HistoryManager } from 'src/main/HistoryManager';

describe('History command provider', () => {
  let provider: History;

  beforeEach(() => {
    provider = new History();
    jest.clearAllMocks();
  });

  describe('getProviderMetadata', () => {
    it('returns correct metadata', () => {
      const meta = provider.getProviderMetadata();
      expect(meta.name).toBe('History');
      expect(meta.id).toBe('builtins.history');
    });
  });

  describe('getSuggestions', () => {
    it('returns empty array for empty input', () => {
      expect(provider.getSuggestions('')).toEqual([]);
    });

    it('returns suggestions based on search results', () => {
      const mockSearch = jest.fn(() => [
        {
          id: 1,
          tab_uuid: 'tab1',
          url: 'https://github.com/repos',
          title: 'GitHub Repos',
          metaDescription: 'A page about repos',
          metaKeywords: 'github repos',
          timestamp: '2024-01-01',
        },
      ]);
      (HistoryManager.getInstance as jest.Mock).mockReturnValue({
        searchHistory: mockSearch,
      });

      const suggestions = provider.getSuggestions('github');
      expect(mockSearch).toHaveBeenCalledWith('github');
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].name).toBe('GitHub Repos');
      expect(suggestions[0].icon).toBe('History');
    });

    it('deduplicates results by sanitized URL', () => {
      const mockSearch = jest.fn(() => [
        {
          id: 1,
          tab_uuid: 't1',
          url: 'https://google.com/search?q=test&sourceid=chrome&ie=utf8',
          title: 'test - Google Search',
          metaDescription: '',
          metaKeywords: '',
          timestamp: '2024-01-01',
        },
        {
          id: 2,
          tab_uuid: 't2',
          url: 'https://google.com/search?q=test&sourceid=firefox&ie=utf8',
          title: 'test - Google Search',
          metaDescription: '',
          metaKeywords: '',
          timestamp: '2024-01-02',
        },
      ]);
      (HistoryManager.getInstance as jest.Mock).mockReturnValue({
        searchHistory: mockSearch,
      });

      const suggestions = provider.getSuggestions('test');
      // Both URLs sanitize to the same thing (only ?q=test is kept for google.com)
      expect(suggestions).toHaveLength(1);
    });

    it('strips non-allowlisted query params from Google URLs', () => {
      const mockSearch = jest.fn(() => [
        {
          id: 1,
          tab_uuid: 't1',
          url: 'https://google.com/search?q=hello&tracking=abc&sourceid=chrome',
          title: 'hello - Google',
          metaDescription: '',
          metaKeywords: '',
          timestamp: '2024-01-01',
        },
      ]);
      (HistoryManager.getInstance as jest.Mock).mockReturnValue({
        searchHistory: mockSearch,
      });

      const suggestions = provider.getSuggestions('hello');
      expect(suggestions).toHaveLength(1);
      // The sanitized URL should only contain ?q=hello
      expect(suggestions[0].value).toContain('q=hello');
      expect(suggestions[0].value).not.toContain('tracking');
      expect(suggestions[0].value).not.toContain('sourceid');
    });

    it('preserves query params for non-allowlisted domains', () => {
      const mockSearch = jest.fn(() => [
        {
          id: 1,
          tab_uuid: 't1',
          url: 'https://example.com/page?foo=bar&baz=qux',
          title: 'Example Page',
          metaDescription: '',
          metaKeywords: '',
          timestamp: '2024-01-01',
        },
      ]);
      (HistoryManager.getInstance as jest.Mock).mockReturnValue({
        searchHistory: mockSearch,
      });

      const suggestions = provider.getSuggestions('example');
      expect(suggestions).toHaveLength(1);
      // No allowlisted params for example.com, so all are stripped
      expect(suggestions[0].value).toBe('https://example.com/page');
    });

    it('filters out results without titles', () => {
      const mockSearch = jest.fn(() => [
        {
          id: 1,
          tab_uuid: 't1',
          url: 'https://example.com',
          title: '',
          metaDescription: '',
          metaKeywords: '',
          timestamp: '2024-01-01',
        },
        {
          id: 2,
          tab_uuid: 't2',
          url: 'https://example.org',
          title: 'Has Title',
          metaDescription: '',
          metaKeywords: '',
          timestamp: '2024-01-01',
        },
      ]);
      (HistoryManager.getInstance as jest.Mock).mockReturnValue({
        searchHistory: mockSearch,
      });

      const suggestions = provider.getSuggestions('example');
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].name).toBe('Has Title');
    });

    it('limits results to 10', () => {
      const items = Array.from({ length: 15 }, (_, i) => ({
        id: i,
        tab_uuid: `t${i}`,
        url: `https://example${i}.com`,
        title: `Page ${i}`,
        metaDescription: '',
        metaKeywords: '',
        timestamp: '2024-01-01',
      }));
      (HistoryManager.getInstance as jest.Mock).mockReturnValue({
        searchHistory: jest.fn(() => items),
      });

      const suggestions = provider.getSuggestions('page');
      expect(suggestions).toHaveLength(10);
    });

    it('handles searchHistory throwing gracefully', () => {
      (HistoryManager.getInstance as jest.Mock).mockReturnValue({
        searchHistory: jest.fn(() => {
          throw new Error('DB error');
        }),
      });

      expect(provider.getSuggestions('test')).toEqual([]);
    });
  });

  describe('runCommand', () => {
    it('opens a new tab with the URL when no tabUuid', () => {
      const { TabManager } = require('src/main/TabManager');
      const mockFocusTab = jest.fn();
      TabManager.getInstance.mockReturnValue({
        getTabByUuid: jest.fn(),
        focusTab: mockFocusTab,
      });

      provider.runCommand('https://example.com', '');
      expect(mockFocusTab).toHaveBeenCalled();
    });

    it('navigates existing tab when tabUuid matches', () => {
      const mockLoadURL = jest.fn();
      const { TabManager } = require('src/main/TabManager');
      TabManager.getInstance.mockReturnValue({
        getTabByUuid: jest.fn(() => ({
          view: { webContents: { loadURL: mockLoadURL } },
        })),
        focusTab: jest.fn(),
      });

      provider.runCommand('https://example.com', '', {
        tabUuid: 'existing-tab',
      });
      expect(mockLoadURL).toHaveBeenCalledWith('https://example.com');
    });
  });
});
