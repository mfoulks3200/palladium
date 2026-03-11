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

import { Base } from '../Base';

describe('Base command provider', () => {
  let provider: Base;

  beforeEach(() => {
    provider = new Base();
  });

  describe('getProviderMetadata', () => {
    it('returns correct provider metadata', () => {
      const meta = provider.getProviderMetadata();
      expect(meta.name).toBe('Palladium');
      expect(meta.id).toBe('builtins.base');
    });
  });

  describe('getSuggestions', () => {
    // URLs that should be recognized
    const validUrls = [
      'https://google.com',
      'http://example.com',
      'google.com',
      'www.github.com',
      'docs.google.com/spreadsheets',
      'example.com/path/to/page',
      'https://localhost:3000/test',
    ];

    // Strings that should NOT be recognized as URLs
    const nonUrls = [
      'hello world',
      'search query',
      'just some text',
      '',
    ];

    it.each(validUrls)('recognizes "%s" as a URL', (url) => {
      const suggestions = provider.getSuggestions(url);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].name).toContain('Open');
      expect(suggestions[0].value).toBe('open');
    });

    it.each(nonUrls)('does not recognize "%s" as a URL', (input) => {
      const suggestions = provider.getSuggestions(input);
      expect(suggestions).toHaveLength(0);
    });
  });

  describe('runCommand', () => {
    it('calls TabManager when opening a URL', () => {
      const { TabManager } = require('src/main/TabManager');
      const mockFocusTab = jest.fn();
      TabManager.getInstance.mockReturnValue({
        getTabByUuid: jest.fn(),
        focusTab: mockFocusTab,
      });

      provider.runCommand('open', 'google.com');
      expect(mockFocusTab).toHaveBeenCalled();
    });

    it('adds https:// protocol when missing', () => {
      const { Tab } = require('src/main/Tab');
      const { TabManager } = require('src/main/TabManager');
      TabManager.getInstance.mockReturnValue({
        getTabByUuid: jest.fn(),
        focusTab: jest.fn(),
      });

      provider.runCommand('open', 'example.com');
      expect(Tab).toHaveBeenCalledWith('https://example.com');
    });

    it('preserves existing protocol', () => {
      const { Tab } = require('src/main/Tab');
      const { TabManager } = require('src/main/TabManager');
      TabManager.getInstance.mockReturnValue({
        getTabByUuid: jest.fn(),
        focusTab: jest.fn(),
      });

      Tab.mockClear();
      provider.runCommand('open', 'http://example.com');
      expect(Tab).toHaveBeenCalledWith('http://example.com');
    });

    it('navigates existing tab when tabUuid is provided', () => {
      const mockLoadURL = jest.fn();
      const { TabManager } = require('src/main/TabManager');
      TabManager.getInstance.mockReturnValue({
        getTabByUuid: jest.fn(() => ({
          view: { webContents: { loadURL: mockLoadURL } },
        })),
        focusTab: jest.fn(),
      });

      provider.runCommand('open', 'https://google.com', {
        tabUuid: 'test-uuid',
      });
      expect(mockLoadURL).toHaveBeenCalledWith('https://google.com');
    });
  });
});
