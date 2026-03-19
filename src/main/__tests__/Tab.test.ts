// ---------------------------------------------------------------------------
// Polyfills — Jest's jsdom may not have crypto.randomUUID
// ---------------------------------------------------------------------------

if (typeof crypto === 'undefined' || !crypto.randomUUID) {
  const nodeCrypto = require('node:crypto');
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      ...globalThis.crypto,
      randomUUID: () => nodeCrypto.randomUUID(),
    },
  });
}

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports
// ---------------------------------------------------------------------------

import {
  createMockElectronModule,
  createMockWebContentsView,
  type MockWebContentsView,
} from '../../__test-utils__/electron-mocks';

const mockElectron = createMockElectronModule();
jest.mock('electron', () => mockElectron);

const mockHistoryManager = {
  addTab: jest.fn(),
  closeTab: jest.fn(),
  addHistoryEvent: jest.fn(),
};
jest.mock('../HistoryManager', () => ({
  HistoryManager: { getInstance: () => mockHistoryManager },
}));

const mockAnalyticsManager = { capture: jest.fn() };
jest.mock('../AnalyticsManager', () => ({
  AnalyticsManager: { getInstance: () => mockAnalyticsManager },
}));

// MediaStateTracker is used directly (not mocked) so we get real behavior

// Mock fetch for imageUrlToBase64
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { Tab } from '../Tab';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get the main view's mock webContents from the most recently created Tab. */
function getViewWebContents(tab: Tab) {
  return (tab.view as unknown as MockWebContentsView).webContents;
}

/** Get the devtools view's mock webContents. */
function getDevToolsWebContents(tab: Tab) {
  return (tab.devToolsView as unknown as MockWebContentsView).webContents;
}

/**
 * Capture the handler registered via setWindowOpenHandler on the tab's view.
 * Returns the handler function, or undefined if none was registered.
 */
function getWindowOpenHandler(tab: Tab) {
  const wc = getViewWebContents(tab);
  const call = wc.setWindowOpenHandler.mock.calls[0];
  return call?.[0] as ((details: any) => any) | undefined;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Tab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the static session so each test gets a fresh fromPath call
    (Tab as any).session = undefined;
    // Reset fetch mock
    mockFetch.mockReset();
  });

  // =========================================================================
  // Constructor
  // =========================================================================

  describe('constructor — normal URL', () => {
    it('creates a WebContentsView and loads the URL', () => {
      const tab = new Tab('https://example.com');

      expect(mockElectron.WebContentsView).toHaveBeenCalled();
      expect(getViewWebContents(tab).loadURL).toHaveBeenCalledWith(
        'https://example.com',
      );
    });

    it('initializes the Electron session via session.fromPath on first construction', () => {
      new Tab('https://example.com');
      expect(mockElectron.session.fromPath).toHaveBeenCalledWith(
        expect.stringContaining('.palladium'),
      );
    });

    it('reuses the static session on subsequent constructions', () => {
      new Tab('https://one.com');
      new Tab('https://two.com');
      expect(mockElectron.session.fromPath).toHaveBeenCalledTimes(1);
    });

    it('calls HistoryManager.addTab with the tab uuid', () => {
      const tab = new Tab('https://example.com');
      expect(mockHistoryManager.addTab).toHaveBeenCalledWith(tab.uuid);
    });

    it('registers tab events (webContents.on called multiple times)', () => {
      const tab = new Tab('https://example.com');
      const wc = getViewWebContents(tab);
      // Should have registered event listeners for various events
      expect(wc.on).toHaveBeenCalled();
      const registeredEvents = wc.on.mock.calls.map((c: any[]) => c[0]);
      expect(registeredEvents).toEqual(
        expect.arrayContaining([
          'page-favicon-updated',
          'audio-state-changed',
          'devtools-opened',
          'devtools-closed',
          'did-navigate',
          'destroyed',
          'did-start-loading',
          'did-stop-loading',
        ]),
      );
    });

    it('sets up a window open handler', () => {
      const tab = new Tab('https://example.com');
      expect(getViewWebContents(tab).setWindowOpenHandler).toHaveBeenCalled();
    });

    it('sets up a context menu handler', () => {
      const tab = new Tab('https://example.com');
      const wc = getViewWebContents(tab);
      const contextMenuCalls = wc.on.mock.calls.filter(
        (c: any[]) => c[0] === 'context-menu',
      );
      expect(contextMenuCalls.length).toBe(1);
    });

    it('does NOT set isInternalPage', () => {
      const tab = new Tab('https://example.com');
      expect(tab.isInternalPage).toBe(false);
    });
  });

  describe('constructor — palladium:// URL', () => {
    it('sets isInternalPage to true', () => {
      const tab = new Tab('palladium://settings');
      expect(tab.isInternalPage).toBe(true);
    });

    it('does NOT call HistoryManager.addTab', () => {
      new Tab('palladium://settings');
      expect(mockHistoryManager.addTab).not.toHaveBeenCalled();
    });

    it('does NOT register tab events', () => {
      const tab = new Tab('palladium://settings');
      const wc = getViewWebContents(tab);
      // The only .on calls should be from setupDevtoolsWindow (on devToolsView),
      // not from registerTabEvents on the main view
      const mainViewEvents = wc.on.mock.calls.map((c: any[]) => c[0]);
      expect(mainViewEvents).not.toEqual(
        expect.arrayContaining(['did-navigate']),
      );
    });

    it('does NOT load the URL via webContents.loadURL', () => {
      const tab = new Tab('palladium://settings');
      expect(getViewWebContents(tab).loadURL).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // getCurrentUrl
  // =========================================================================

  describe('getCurrentUrl', () => {
    it('returns the stored currentUrl for internal pages', () => {
      const tab = new Tab('palladium://editor');
      expect(tab.getCurrentUrl()).toBe('palladium://editor');
    });

    it('returns webContents.getURL() for normal pages', () => {
      const tab = new Tab('https://example.com');
      getViewWebContents(tab).getURL.mockReturnValue('https://navigated.com');
      expect(tab.getCurrentUrl()).toBe('https://navigated.com');
    });
  });

  // =========================================================================
  // getTitle
  // =========================================================================

  describe('getTitle', () => {
    it('delegates to webContents.getTitle()', () => {
      const tab = new Tab('https://example.com');
      getViewWebContents(tab).getTitle.mockReturnValue('My Title');
      expect(tab.getTitle()).toBe('My Title');
    });
  });

  // =========================================================================
  // setDevMode
  // =========================================================================

  describe('setDevMode', () => {
    it('enables devtools when called with true', () => {
      const tab = new Tab('https://example.com');
      const wc = getViewWebContents(tab);
      wc.isDestroyed.mockReturnValue(false);
      getDevToolsWebContents(tab).isDestroyed.mockReturnValue(false);

      tab.setDevMode(true);

      expect(tab.devMode).toBe(true);
      expect(wc.setDevToolsWebContents).toHaveBeenCalled();
      expect(wc.openDevTools).toHaveBeenCalledWith({ mode: 'bottom' });
    });

    it('closes devtools when called with false', () => {
      const tab = new Tab('https://example.com');
      const wc = getViewWebContents(tab);
      getDevToolsWebContents(tab).isDestroyed.mockReturnValue(false);

      // First enable
      tab.setDevMode(true);
      wc.isDevToolsOpened.mockReturnValue(true);

      // Then disable
      tab.setDevMode(false);

      expect(tab.devMode).toBe(false);
      expect(wc.closeDevTools).toHaveBeenCalled();
    });

    it('is a no-op when called with the same value', () => {
      const tab = new Tab('https://example.com');
      const wc = getViewWebContents(tab);

      // devMode starts false, calling with false should be no-op
      tab.setDevMode(false);
      expect(wc.openDevTools).not.toHaveBeenCalled();
      expect(wc.closeDevTools).not.toHaveBeenCalled();
    });

    it('dispatches tab-updated event', () => {
      const tab = new Tab('https://example.com');
      getDevToolsWebContents(tab).isDestroyed.mockReturnValue(false);

      const listener = jest.fn();
      tab.addEventListener('tab-updated', listener);

      tab.setDevMode(true);
      expect(listener).toHaveBeenCalled();
    });

    it('recreates devtools view if the old one is destroyed', () => {
      const tab = new Tab('https://example.com');
      getDevToolsWebContents(tab).isDestroyed.mockReturnValue(true);

      const initialCallCount = mockElectron.WebContentsView.mock.calls.length;
      tab.setDevMode(true);

      // setupDevtoolsWindow should have been called again, creating a new view
      expect(mockElectron.WebContentsView.mock.calls.length).toBeGreaterThan(
        initialCallCount,
      );
    });
  });

  // =========================================================================
  // getMuted / setMuted
  // =========================================================================

  describe('getMuted / setMuted', () => {
    it('getMuted delegates to webContents.isAudioMuted', () => {
      const tab = new Tab('https://example.com');
      getViewWebContents(tab).isAudioMuted.mockReturnValue(true);
      expect(tab.getMuted()).toBe(true);
    });

    it('setMuted delegates to webContents.setAudioMuted', () => {
      const tab = new Tab('https://example.com');
      tab.setMuted(true);
      expect(getViewWebContents(tab).setAudioMuted).toHaveBeenCalledWith(true);
    });

    it('setMuted dispatches tab-updated event', () => {
      const tab = new Tab('https://example.com');
      const listener = jest.fn();
      tab.addEventListener('tab-updated', listener);

      tab.setMuted(true);
      expect(listener).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Media state methods
  // =========================================================================

  describe('media state methods', () => {
    it('addMediaState delegates to mediaTracker', () => {
      const tab = new Tab('https://example.com');
      const state = {
        id: 'test-media',
        type: 'audio' as const,
        title: 'Song',
        album: '',
        artist: '',
        artworkUrl: '',
        playing: true,
        progress: 0,
        duration: 100,
      };
      tab.addMediaState(state);
      expect(tab.mediaTracker.getMediaStates()).toEqual([state]);
    });

    it('updateMediaState delegates to mediaTracker', () => {
      const tab = new Tab('https://example.com');
      const state = {
        id: 'test-media',
        type: 'audio' as const,
        title: 'Song',
        album: '',
        artist: '',
        artworkUrl: '',
        playing: true,
        progress: 0,
        duration: 100,
      };
      tab.addMediaState(state);
      tab.updateMediaState({ id: 'test-media', playing: false });
      expect(tab.getMediaStates()[0].playing).toBe(false);
    });

    it('removeMediaState delegates to mediaTracker', () => {
      const tab = new Tab('https://example.com');
      tab.addMediaState({
        id: 'test-media',
        type: 'audio',
        title: 'Song',
        album: '',
        artist: '',
        artworkUrl: '',
        playing: true,
        progress: 0,
        duration: 100,
      });
      tab.removeMediaState('test-media');
      expect(tab.getMediaStates()).toEqual([]);
    });

    it('getMediaStates returns all active media states', () => {
      const tab = new Tab('https://example.com');
      expect(tab.getMediaStates()).toEqual([]);
    });

    it('media-state-changed on mediaTracker bubbles to the Tab', () => {
      const tab = new Tab('https://example.com');
      const listener = jest.fn();
      tab.addEventListener('media-state-changed', listener);

      // Adding media triggers the tracker event, which should bubble
      tab.addMediaState({
        id: 'test',
        type: 'audio',
        title: 'T',
        album: '',
        artist: '',
        artworkUrl: '',
        playing: true,
        progress: 0,
        duration: 1,
      });
      expect(listener).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // getTabIpcMeta
  // =========================================================================

  describe('getTabIpcMeta', () => {
    it('returns a TabIpcPacket with the correct shape', () => {
      const tab = new Tab('https://example.com');
      const wc = getViewWebContents(tab);
      wc.getURL.mockReturnValue('https://example.com');
      wc.getTitle.mockReturnValue('Example Title');
      wc.isAudioMuted.mockReturnValue(false);
      wc.isLoading.mockReturnValue(true);

      const meta = tab.getTabIpcMeta();

      expect(meta).toEqual({
        uuid: tab.uuid,
        url: 'https://example.com',
        title: 'Example Title',
        faviconB64: undefined,
        isDevMode: false,
        isPlayingAudio: false,
        isMuted: false,
        isLoading: true,
        isInternal: false,
      });
    });

    it('includes favicon when available', () => {
      const tab = new Tab('palladium://settings');
      // Internally set favicon via the private field
      (tab as any).faviconB64 = 'data:image/png;base64,abc123';
      const meta = tab.getTabIpcMeta();
      expect(meta.faviconB64).toBe('data:image/png;base64,abc123');
    });

    it('returns isInternal=true for palladium:// URLs', () => {
      const tab = new Tab('palladium://settings');
      expect(tab.getTabIpcMeta().isInternal).toBe(true);
    });
  });

  // =========================================================================
  // destroyTab
  // =========================================================================

  describe('destroyTab', () => {
    it('calls HistoryManager.closeTab with the tab uuid', () => {
      const tab = new Tab('https://example.com');
      tab.destroyTab();
      expect(mockHistoryManager.closeTab).toHaveBeenCalledWith(tab.uuid);
    });
  });

  // =========================================================================
  // Registered events (via __emit on mock webContents)
  // =========================================================================

  describe('registered events', () => {
    describe('page-favicon-updated', () => {
      it('updates the favicon via imageUrlToBase64 and dispatches tab-updated', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          arrayBuffer: () =>
            Promise.resolve(Buffer.from('fake-image-data').buffer),
          headers: { get: () => 'image/png' },
        });

        const tab = new Tab('https://example.com');
        const listener = jest.fn();
        tab.addEventListener('tab-updated', listener);

        const wc = getViewWebContents(tab);
        wc.__emit('page-favicon-updated', {}, ['https://example.com/favicon.ico']);

        // Wait for the async imageUrlToBase64 to resolve
        await new Promise((r) => setTimeout(r, 10));

        expect(mockFetch).toHaveBeenCalledWith('https://example.com/favicon.ico');
        expect(tab.getFavicon()).toContain('data:image/png;base64,');
        expect(listener).toHaveBeenCalled();
      });

      it('handles fetch failure gracefully', async () => {
        mockFetch.mockResolvedValue({ ok: false, status: 404 });

        const tab = new Tab('https://example.com');
        const wc = getViewWebContents(tab);
        wc.__emit('page-favicon-updated', {}, ['https://example.com/bad.ico']);

        await new Promise((r) => setTimeout(r, 10));

        // Should not throw, favicon remains null
        expect(tab.getFavicon()).toBeNull();
      });
    });

    describe('did-navigate', () => {
      it('clears active media, adds history event, and flushes session', async () => {
        const tab = new Tab('https://example.com');
        const wc = getViewWebContents(tab);

        // Set up an active media to be cleared
        tab.mediaTracker.activeMediaId = 'audio-test';
        tab.addMediaState({
          id: 'audio-test',
          type: 'audio',
          title: 'T',
          album: '',
          artist: '',
          artworkUrl: '',
          playing: true,
          progress: 0,
          duration: 1,
        });

        wc.getURL.mockReturnValue('https://navigated.com');
        wc.executeJavaScript.mockResolvedValue('Page Title');

        wc.__emit('did-navigate');

        // Wait for async handlers
        await new Promise((r) => setTimeout(r, 10));

        // Should have cleared the active media
        expect(tab.mediaTracker.activeMediaId).toBeNull();
        expect(tab.getMediaStates()).toEqual([]);

        // Should have captured analytics
        expect(mockAnalyticsManager.capture).toHaveBeenCalledWith(
          'page_navigated',
        );

        // Should have added a history event
        expect(mockHistoryManager.addHistoryEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            tabUuid: tab.uuid,
            url: 'https://navigated.com',
          }),
        );

        // Should have flushed session
        expect(
          mockElectron.session.fromPath.mock.results[0].value.flushStorageData,
        ).toHaveBeenCalled();
      });
    });

    describe('destroyed', () => {
      it('calls HistoryManager.closeTab and flushes session', () => {
        const tab = new Tab('https://example.com');
        const wc = getViewWebContents(tab);

        wc.__emit('destroyed');

        expect(mockHistoryManager.closeTab).toHaveBeenCalledWith(tab.uuid);
        expect(
          mockElectron.session.fromPath.mock.results[0].value.flushStorageData,
        ).toHaveBeenCalled();
      });
    });

    describe('did-start-loading / did-stop-loading', () => {
      it('dispatches tab-updated on did-start-loading', () => {
        const tab = new Tab('https://example.com');
        const listener = jest.fn();
        tab.addEventListener('tab-updated', listener);

        getViewWebContents(tab).__emit('did-start-loading');
        expect(listener).toHaveBeenCalled();
      });

      it('dispatches tab-updated on did-stop-loading', () => {
        const tab = new Tab('https://example.com');
        const listener = jest.fn();
        tab.addEventListener('tab-updated', listener);

        getViewWebContents(tab).__emit('did-stop-loading');
        expect(listener).toHaveBeenCalled();
      });
    });

    describe('devtools-opened / devtools-closed', () => {
      it('sets devMode to true on devtools-opened', () => {
        const tab = new Tab('https://example.com');
        getDevToolsWebContents(tab).isDestroyed.mockReturnValue(false);

        getViewWebContents(tab).__emit('devtools-opened');
        expect(tab.devMode).toBe(true);
      });

      it('sets devMode to false on devtools-closed', () => {
        const tab = new Tab('https://example.com');
        getDevToolsWebContents(tab).isDestroyed.mockReturnValue(false);

        // First enable
        tab.setDevMode(true);
        // Then close via event
        getViewWebContents(tab).__emit('devtools-closed');
        expect(tab.devMode).toBe(false);
      });
    });

    describe('window open handler', () => {
      it('dispatches new-window-requested event and denies the action', () => {
        const tab = new Tab('https://example.com');
        const listener = jest.fn();
        tab.addEventListener('new-window-requested', listener);

        const handler = getWindowOpenHandler(tab);
        expect(handler).toBeDefined();

        const result = handler!({
          url: 'https://popup.com',
          disposition: 'new-window',
        });

        expect(result).toEqual({ action: 'deny' });
        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({
            detail: { url: 'https://popup.com', disposition: 'new-window' },
          }),
        );
      });
    });
  });

  // =========================================================================
  // setupDevtoolsWindow
  // =========================================================================

  describe('setupDevtoolsWindow', () => {
    it('creates a devToolsView on construction', () => {
      const tab = new Tab('https://example.com');
      expect(tab.devToolsView).toBeDefined();
      expect(tab.devToolsView).not.toBeNull();
    });

    it('recreates devtools and dispatches request-focus when devtools view is destroyed', () => {
      const tab = new Tab('https://example.com');
      const wc = getViewWebContents(tab);
      wc.isDestroyed.mockReturnValue(false);

      const listener = jest.fn();
      tab.addEventListener('request-focus', listener);

      // Trigger the destroyed event on the devtools view
      getDevToolsWebContents(tab).__emit('destroyed');

      expect(listener).toHaveBeenCalled();
    });

    it('does NOT dispatch request-focus if main view is already destroyed', () => {
      const tab = new Tab('https://example.com');
      const wc = getViewWebContents(tab);
      wc.isDestroyed.mockReturnValue(true);

      const listener = jest.fn();
      tab.addEventListener('request-focus', listener);

      getDevToolsWebContents(tab).__emit('destroyed');

      expect(listener).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // getFavicon
  // =========================================================================

  describe('getFavicon', () => {
    it('returns null by default', () => {
      const tab = new Tab('https://example.com');
      expect(tab.getFavicon()).toBeNull();
    });
  });

  // =========================================================================
  // isDevMode
  // =========================================================================

  describe('isDevMode', () => {
    it('returns false by default', () => {
      const tab = new Tab('https://example.com');
      expect(tab.isDevMode()).toBe(false);
    });

    it('returns true after setDevMode(true)', () => {
      const tab = new Tab('https://example.com');
      getDevToolsWebContents(tab).isDestroyed.mockReturnValue(false);
      tab.setDevMode(true);
      expect(tab.isDevMode()).toBe(true);
    });
  });

  // =========================================================================
  // Context menu
  // =========================================================================

  describe('context menu', () => {
    it('creates a menu with "Enable dev mode" when devMode is off', () => {
      const tab = new Tab('https://example.com');
      const wc = getViewWebContents(tab);

      // Find the context-menu handler
      const contextMenuCall = wc.on.mock.calls.find(
        (c: any[]) => c[0] === 'context-menu',
      );
      expect(contextMenuCall).toBeDefined();

      // Fire it
      contextMenuCall![1]();

      expect(mockElectron.Menu).toHaveBeenCalled();
      expect(mockElectron.MenuItem).toHaveBeenCalledWith(
        expect.objectContaining({ label: 'Enable dev mode' }),
      );
    });

    it('does not add "Enable dev mode" menu item when devMode is on', () => {
      const tab = new Tab('https://example.com');
      getDevToolsWebContents(tab).isDestroyed.mockReturnValue(false);
      tab.setDevMode(true);

      // Clear the MenuItem mock to only track calls from the context menu
      mockElectron.MenuItem.mockClear();

      const wc = getViewWebContents(tab);
      const contextMenuCall = wc.on.mock.calls.find(
        (c: any[]) => c[0] === 'context-menu',
      );
      contextMenuCall![1]();

      expect(mockElectron.MenuItem).not.toHaveBeenCalled();
    });
  });
});
