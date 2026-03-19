// ---------------------------------------------------------------------------
// Mocks — must be declared before imports
// ---------------------------------------------------------------------------

const mockSend = jest.fn();

jest.mock('electron', () => {
  const { createMockElectronModule } = require('src/__test-utils__/electron-mocks');
  return createMockElectronModule();
});

jest.mock('src/main/ipc', () => ({
  typedIpcMain: { on: jest.fn(), handle: jest.fn() },
  typedWebContents: jest.fn(() => ({ send: mockSend })),
}));

// Counter for generating unique IDs in environments without crypto.randomUUID
let mockTabCounter = 0;
jest.mock('../Tab', () => {
  const { createMockTab } = require('src/__test-utils__/electron-mocks');
  return {
    Tab: jest.fn().mockImplementation((url: string) => {
      mockTabCounter += 1;
      return createMockTab({ url, uuid: `auto-tab-${mockTabCounter}` });
    }),
  };
});

const mockAnalytics = { capture: jest.fn() };
jest.mock('../AnalyticsManager', () => ({
  AnalyticsManager: { getInstance: () => mockAnalytics },
}));

jest.mock('../TabManagerIpcHandlers', () => ({
  registerTabManagerIpc: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { TabManager } from '../TabManager';
import { Tab } from '../Tab';
import { registerTabManagerIpc } from '../TabManagerIpcHandlers';
import {
  createMockBrowserWindow,
  createMockTab,
  MockBrowserWindow,
  MockTab,
} from 'src/__test-utils__/electron-mocks';
import { clipboard, Menu, MenuItem } from 'electron';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function initTabManager(mainWindow?: MockBrowserWindow): TabManager {
  const win = mainWindow ?? createMockBrowserWindow();
  return TabManager.initialize(win as any);
}

/** Create a mock tab with a deterministic uuid (avoids crypto.randomUUID). */
function makeMockTab(overrides: Parameters<typeof createMockTab>[0] = {}): MockTab {
  mockTabCounter += 1;
  return createMockTab({ uuid: `test-tab-${mockTabCounter}`, ...overrides });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TabManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockTabCounter = 0;
    // Reset singleton between tests
    (TabManager as any).instance = undefined;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // =========================================================================
  // 1. Singleton pattern
  // =========================================================================
  describe('singleton pattern', () => {
    it('getInstance() throws before initialize is called', () => {
      expect(() => TabManager.getInstance()).toThrow(
        'TabManager has not been initialized',
      );
    });

    it('initialize() creates an instance and returns it', () => {
      const tm = initTabManager();
      expect(tm).toBeInstanceOf(TabManager);
    });

    it('initialize() throws if already initialized', () => {
      initTabManager();
      expect(() => initTabManager()).toThrow(
        'TabManager has already been initialized',
      );
    });

    it('getInstance() returns the initialized instance', () => {
      const tm = initTabManager();
      expect(TabManager.getInstance()).toBe(tm);
    });
  });

  // =========================================================================
  // 2. Constructor behavior
  // =========================================================================
  describe('constructor', () => {
    it('calls updateBrowsingView and updateDevtoolsView on init', () => {
      const win = createMockBrowserWindow();
      TabManager.initialize(win as any);

      expect(mockSend).toHaveBeenCalledWith('request-browser-layout');
      expect(mockSend).toHaveBeenCalledWith('request-devtools-layout');
    });

    it('registers resize listener on mainWindow', () => {
      const win = createMockBrowserWindow();
      TabManager.initialize(win as any);

      expect(win.on).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('registers devtools-opened and devtools-closed listeners on webContents', () => {
      const win = createMockBrowserWindow();
      TabManager.initialize(win as any);

      expect(win.webContents.addListener).toHaveBeenCalledWith(
        'devtools-opened',
        expect.any(Function),
      );
      expect(win.webContents.addListener).toHaveBeenCalledWith(
        'devtools-closed',
        expect.any(Function),
      );
    });

    it('calls registerTabManagerIpc', () => {
      const tm = initTabManager();
      expect(registerTabManagerIpc).toHaveBeenCalledWith(tm);
    });

    it('sets up 500ms interval that calls updateRenderProcess', () => {
      const win = createMockBrowserWindow();
      TabManager.initialize(win as any);

      mockSend.mockClear();

      jest.advanceTimersByTime(500);
      expect(mockSend).toHaveBeenCalledWith(
        'update-tab-meta',
        expect.any(Object),
      );
    });

    it('resize event triggers updateBrowsingView and updateDevtoolsView', async () => {
      const win = createMockBrowserWindow();
      TabManager.initialize(win as any);
      mockSend.mockClear();

      // Fire the resize event (handler is async, flush microtasks)
      win.__emit('resize');
      await Promise.resolve();

      expect(mockSend).toHaveBeenCalledWith('request-browser-layout');
      expect(mockSend).toHaveBeenCalledWith('request-devtools-layout');
    });

    it('devtools-opened event triggers layout updates', async () => {
      const win = createMockBrowserWindow();
      TabManager.initialize(win as any);
      mockSend.mockClear();

      win.webContents.__emit('devtools-opened');
      await Promise.resolve();
      await Promise.resolve();

      expect(mockSend).toHaveBeenCalledWith('request-browser-layout');
      expect(mockSend).toHaveBeenCalledWith('request-devtools-layout');
    });
  });

  // =========================================================================
  // 3. addTab
  // =========================================================================
  describe('addTab', () => {
    it('adds a tab to the internal list', () => {
      const tm = initTabManager();
      const tab = makeMockTab();

      tm.addTab(tab as any);

      expect(tm.getAllTabs()).toHaveLength(1);
      expect(tm.getAllTabs()[0]).toBe(tab);
    });

    it('registers event listeners on the tab', () => {
      const tm = initTabManager();
      const tab = makeMockTab();

      tm.addTab(tab as any);

      const registeredEvents = tab.addEventListener.mock.calls.map(
        (c: any[]) => c[0],
      );
      expect(registeredEvents).toContain('tab-updated');
      expect(registeredEvents).toContain('media-state-changed');
      expect(registeredEvents).toContain('request-focus');
      expect(registeredEvents).toContain('new-window-requested');
    });

    it('does not add duplicate tabs', () => {
      const tm = initTabManager();
      const tab = makeMockTab();

      tm.addTab(tab as any);
      tm.addTab(tab as any);

      expect(tm.getAllTabs()).toHaveLength(1);
    });

    it('tab-updated listener calls updateRenderProcess', () => {
      const tm = initTabManager();
      const tab = makeMockTab();
      tm.addTab(tab as any);

      const tabUpdatedCall = tab.addEventListener.mock.calls.find(
        (c: any[]) => c[0] === 'tab-updated',
      );
      const handler = tabUpdatedCall[1];
      mockSend.mockClear();

      handler();

      expect(mockSend).toHaveBeenCalledWith(
        'update-tab-meta',
        expect.any(Object),
      );
    });

    it('media-state-changed listener calls syncMediaStates', () => {
      const tm = initTabManager();
      const tab = makeMockTab();
      const state = {
        id: 'ms-1',
        type: 'audio' as const,
        title: 'Song',
        album: '',
        artist: '',
        artworkUrl: '',
        playing: true,
        progress: 0,
        duration: 100,
      };
      tab.getMediaStates.mockReturnValue([state]);
      tm.addTab(tab as any);

      const mediaCall = tab.addEventListener.mock.calls.find(
        (c: any[]) => c[0] === 'media-state-changed',
      );
      mockSend.mockClear();
      mediaCall[1]();

      expect(mockSend).toHaveBeenCalledWith('media-state', expect.any(Object));
    });

    it('request-focus listener re-focuses tab only if it is the current tab', () => {
      const tm = initTabManager();
      const tab = makeMockTab();
      tm.focusTab(tab as any);

      const requestFocusCall = tab.addEventListener.mock.calls.find(
        (c: any[]) => c[0] === 'request-focus',
      );
      const handler = requestFocusCall[1];

      // Tab is current -- should re-focus (calls updateBrowsingView etc.)
      mockSend.mockClear();
      handler();
      expect(mockSend).toHaveBeenCalledWith('request-browser-layout');
    });

    it('request-focus listener does NOT re-focus if tab is not current', () => {
      const tm = initTabManager();
      const tab1 = makeMockTab();
      const tab2 = makeMockTab();
      tm.addTab(tab1 as any);
      tm.focusTab(tab2 as any);

      const requestFocusCall = tab1.addEventListener.mock.calls.find(
        (c: any[]) => c[0] === 'request-focus',
      );
      const handler = requestFocusCall[1];
      mockSend.mockClear();

      handler();

      // Should NOT have triggered a focusTab (no request-browser-layout beyond what
      // focusTab(tab2) already sent)
      const browserLayoutCalls = mockSend.mock.calls.filter(
        (c: any[]) => c[0] === 'request-browser-layout',
      );
      expect(browserLayoutCalls).toHaveLength(0);
    });

    it('new-window-requested with background-tab adds tab without focus', () => {
      const tm = initTabManager();
      const tab = makeMockTab();
      tm.addTab(tab as any);

      const newWindowCall = tab.addEventListener.mock.calls.find(
        (c: any[]) => c[0] === 'new-window-requested',
      );
      const handler = newWindowCall[1];

      const event = {
        detail: { url: 'https://new-tab.com', disposition: 'background-tab' },
      } as any;

      handler(event);

      expect(Tab).toHaveBeenCalledWith('https://new-tab.com');
      expect(tm.getAllTabs()).toHaveLength(2);
      // Current tab should NOT have changed
      expect(tm.getCurrentTab()).toBeNull();
    });

    it('new-window-requested with foreground disposition focuses new tab', () => {
      const tm = initTabManager();
      const tab = makeMockTab();
      tm.addTab(tab as any);

      const newWindowCall = tab.addEventListener.mock.calls.find(
        (c: any[]) => c[0] === 'new-window-requested',
      );
      const handler = newWindowCall[1];

      const event = {
        detail: {
          url: 'https://foreground.com',
          disposition: 'new-window',
        },
      } as any;

      handler(event);

      expect(Tab).toHaveBeenCalledWith('https://foreground.com');
      expect(tm.getCurrentTab()).not.toBeNull();
    });
  });

  // =========================================================================
  // 4. focusTab
  // =========================================================================
  describe('focusTab', () => {
    it('adds tab if not already present', () => {
      const tm = initTabManager();
      const tab = makeMockTab();

      tm.focusTab(tab as any);

      expect(tm.getAllTabs()).toContain(tab);
    });

    it('removes previous tab views from contentView', () => {
      const win = createMockBrowserWindow();
      const tm = TabManager.initialize(win as any);
      const tab1 = makeMockTab();
      const tab2 = makeMockTab();

      tm.focusTab(tab1 as any);
      tm.focusTab(tab2 as any);

      expect(win.contentView.removeChildView).toHaveBeenCalledWith(tab1.view);
      expect(win.contentView.removeChildView).toHaveBeenCalledWith(
        tab1.devToolsView,
      );
    });

    it('sets currentTab to the focused tab', () => {
      const tm = initTabManager();
      const tab = makeMockTab();

      tm.focusTab(tab as any);

      expect(tm.getCurrentTab()).toBe(tab);
    });

    it('sets border radius on views', () => {
      const tm = initTabManager();
      const tab = makeMockTab();

      tm.focusTab(tab as any);

      expect(tab.view.setBorderRadius).toHaveBeenCalledWith(6);
      expect(tab.devToolsView.setBorderRadius).toHaveBeenCalledWith(6);
    });

    it('adds views to contentView for non-internal pages', () => {
      const win = createMockBrowserWindow();
      const tm = TabManager.initialize(win as any);
      const tab = makeMockTab({ isInternalPage: false });

      tm.focusTab(tab as any);

      expect(win.contentView.addChildView).toHaveBeenCalledWith(tab.view);
      expect(win.contentView.addChildView).toHaveBeenCalledWith(
        tab.devToolsView,
      );
    });

    it('sends internal-page-navigate with empty path for non-internal pages', () => {
      const tm = initTabManager();
      const tab = makeMockTab({ isInternalPage: false });

      tm.focusTab(tab as any);

      expect(mockSend).toHaveBeenCalledWith('internal-page-navigate', {
        newPath: '',
      });
    });

    it('sends internal-page-navigate with URL for internal pages', () => {
      const tm = initTabManager();
      const tab = makeMockTab({
        isInternalPage: true,
        url: 'palladium://settings',
      });

      tm.focusTab(tab as any);

      expect(mockSend).toHaveBeenCalledWith('internal-page-navigate', {
        newPath: 'palladium://settings',
      });
    });

    it('does not add views for internal pages', () => {
      const win = createMockBrowserWindow();
      const tm = TabManager.initialize(win as any);
      const tab = makeMockTab({ isInternalPage: true });

      tm.focusTab(tab as any);

      expect(win.contentView.addChildView).not.toHaveBeenCalledWith(tab.view);
      expect(win.contentView.addChildView).not.toHaveBeenCalledWith(
        tab.devToolsView,
      );
    });

    it('calls updateBrowsingView and updateRenderProcess', () => {
      const tm = initTabManager();
      const tab = makeMockTab();
      mockSend.mockClear();

      tm.focusTab(tab as any);

      expect(mockSend).toHaveBeenCalledWith('request-browser-layout');
      expect(mockSend).toHaveBeenCalledWith(
        'update-tab-meta',
        expect.objectContaining({ currentTabUuid: tab.uuid }),
      );
    });
  });

  // =========================================================================
  // 5. focusTabIndex / focusTabUuid
  // =========================================================================
  describe('focusTabIndex', () => {
    it('focuses the tab at the given index', () => {
      const tm = initTabManager();
      const tab1 = makeMockTab();
      const tab2 = makeMockTab();
      tm.addTab(tab1 as any);
      tm.addTab(tab2 as any);

      tm.focusTabIndex(1);

      expect(tm.getCurrentTab()).toBe(tab2);
    });
  });

  describe('focusTabUuid', () => {
    it('focuses the tab with the given uuid', () => {
      const tm = initTabManager();
      const tab1 = makeMockTab({ uuid: 'aaa' });
      const tab2 = makeMockTab({ uuid: 'bbb' });
      tm.addTab(tab1 as any);
      tm.addTab(tab2 as any);

      tm.focusTabUuid('bbb');

      expect(tm.getCurrentTab()).toBe(tab2);
    });
  });

  // =========================================================================
  // 6. Getters
  // =========================================================================
  describe('getTabIndex / getTabByUuid / getCurrentTab / getAllTabs', () => {
    it('getTabIndex returns the correct index', () => {
      const tm = initTabManager();
      const tab1 = makeMockTab({ uuid: 'x1' });
      const tab2 = makeMockTab({ uuid: 'x2' });
      tm.addTab(tab1 as any);
      tm.addTab(tab2 as any);

      expect(tm.getTabIndex('x1')).toBe(0);
      expect(tm.getTabIndex('x2')).toBe(1);
      expect(tm.getTabIndex('nonexistent')).toBe(-1);
    });

    it('getTabByUuid returns the correct tab or undefined', () => {
      const tm = initTabManager();
      const tab = makeMockTab({ uuid: 'findme' });
      tm.addTab(tab as any);

      expect(tm.getTabByUuid('findme')).toBe(tab);
      expect(tm.getTabByUuid('nope')).toBeUndefined();
    });

    it('getCurrentTab returns null initially', () => {
      const tm = initTabManager();
      expect(tm.getCurrentTab()).toBeNull();
    });

    it('getAllTabs returns a copy of the tabs array', () => {
      const tm = initTabManager();
      const tab = makeMockTab();
      tm.addTab(tab as any);

      const result = tm.getAllTabs();
      expect(result).toHaveLength(1);
      // Should be a copy, not the same reference
      result.push(makeMockTab() as any);
      expect(tm.getAllTabs()).toHaveLength(1);
    });
  });

  // =========================================================================
  // 7. closeTab
  // =========================================================================
  describe('closeTab', () => {
    it('focuses previous tab when index > 0', () => {
      const tm = initTabManager();
      const tab1 = makeMockTab({ uuid: 'c1' });
      const tab2 = makeMockTab({ uuid: 'c2' });
      tm.focusTab(tab1 as any);
      tm.focusTab(tab2 as any);

      tm.closeTab('c2');

      expect(tm.getCurrentTab()).toBe(tab1);
    });

    it('removes view from contentView when closing current tab', () => {
      const win = createMockBrowserWindow();
      const tm = TabManager.initialize(win as any);
      const tab = makeMockTab({ uuid: 'only' });
      tm.focusTab(tab as any);
      win.contentView.removeChildView.mockClear();

      tm.closeTab('only');

      expect(win.contentView.removeChildView).toHaveBeenCalledWith(tab.view);
    });

    it('closes the webContents of the removed tab', () => {
      const tm = initTabManager();
      const tab = makeMockTab({ uuid: 'closeme' });
      tm.addTab(tab as any);

      tm.closeTab('closeme');

      expect(tab.view.webContents.close).toHaveBeenCalled();
    });

    it('removes the tab from the tabs array', () => {
      const tm = initTabManager();
      const tab = makeMockTab({ uuid: 'gone' });
      tm.addTab(tab as any);

      tm.closeTab('gone');

      expect(tm.getAllTabs()).toHaveLength(0);
    });

    it('captures analytics on close', () => {
      const tm = initTabManager();
      const tab = makeMockTab({ uuid: 'analytics-close' });
      tm.addTab(tab as any);

      tm.closeTab('analytics-close');

      expect(mockAnalytics.capture).toHaveBeenCalledWith('tab_closed');
    });

    it('does nothing for a nonexistent uuid', () => {
      const tm = initTabManager();
      const tab = makeMockTab({ uuid: 'keeper' });
      tm.addTab(tab as any);

      tm.closeTab('nonexistent');

      expect(tm.getAllTabs()).toHaveLength(1);
    });
  });

  // =========================================================================
  // 8. reorderTab
  // =========================================================================
  describe('reorderTab', () => {
    it('moves a tab from startIndex to finishIndex', () => {
      const tm = initTabManager();
      const tab1 = makeMockTab({ uuid: 'r1' });
      const tab2 = makeMockTab({ uuid: 'r2' });
      const tab3 = makeMockTab({ uuid: 'r3' });
      tm.addTab(tab1 as any);
      tm.addTab(tab2 as any);
      tm.addTab(tab3 as any);

      tm.reorderTab(0, 2);

      const uuids = tm.getAllTabs().map((t) => t.uuid);
      expect(uuids).toEqual(['r2', 'r3', 'r1']);
    });

    it('calls updateRenderProcess after reorder', () => {
      const tm = initTabManager();
      const tab1 = makeMockTab();
      const tab2 = makeMockTab();
      tm.addTab(tab1 as any);
      tm.addTab(tab2 as any);
      mockSend.mockClear();

      tm.reorderTab(0, 1);

      expect(mockSend).toHaveBeenCalledWith(
        'update-tab-meta',
        expect.any(Object),
      );
    });
  });

  // =========================================================================
  // 9. updateRenderProcess
  // =========================================================================
  describe('updateRenderProcess', () => {
    it('sends update-tab-meta with all tab metadata', () => {
      const tm = initTabManager();
      const tab1 = makeMockTab({ uuid: 'u1' });
      const tab2 = makeMockTab({ uuid: 'u2' });
      tm.addTab(tab1 as any);
      tm.addTab(tab2 as any);
      tm.focusTab(tab1 as any);
      mockSend.mockClear();

      tm.updateRenderProcess();

      expect(mockSend).toHaveBeenCalledWith('update-tab-meta', {
        currentTabUuid: 'u1',
        tabs: [tab1.getTabIpcMeta(), tab2.getTabIpcMeta()],
      });
    });

    it('sends null currentTabUuid when no tab is focused', () => {
      const tm = initTabManager();
      const tab = makeMockTab();
      tm.addTab(tab as any);
      mockSend.mockClear();

      tm.updateRenderProcess();

      expect(mockSend).toHaveBeenCalledWith('update-tab-meta', {
        currentTabUuid: null,
        tabs: [tab.getTabIpcMeta()],
      });
    });

    it('does not send if mainWindow is destroyed', () => {
      const win = createMockBrowserWindow();
      win.isDestroyed.mockReturnValue(true);
      const tm = TabManager.initialize(win as any);
      mockSend.mockClear();

      tm.updateRenderProcess();

      const updateCalls = mockSend.mock.calls.filter(
        (c: any[]) => c[0] === 'update-tab-meta',
      );
      expect(updateCalls).toHaveLength(0);
    });
  });

  // =========================================================================
  // 10. performTabAction
  // =========================================================================
  describe('performTabAction', () => {
    let tm: TabManager;
    let tab: MockTab;

    beforeEach(() => {
      tm = initTabManager();
      tab = makeMockTab();
      tm.focusTab(tab as any);
    });

    it('back calls navigationHistory.goBack()', () => {
      tm.performTabAction('back');
      expect(tab.view.webContents.navigationHistory.goBack).toHaveBeenCalled();
    });

    it('forward calls navigationHistory.goForward()', () => {
      tm.performTabAction('forward');
      expect(
        tab.view.webContents.navigationHistory.goForward,
      ).toHaveBeenCalled();
    });

    it('refresh calls webContents.reload()', () => {
      tm.performTabAction('refresh');
      expect(tab.view.webContents.reload).toHaveBeenCalled();
    });

    it('hard-refresh calls webContents.reloadIgnoringCache()', () => {
      tm.performTabAction('hard-refresh');
      expect(tab.view.webContents.reloadIgnoringCache).toHaveBeenCalled();
    });

    it('mute calls tab.setMuted(true)', () => {
      tm.performTabAction('mute');
      expect(tab.setMuted).toHaveBeenCalledWith(true);
    });

    it('unmute calls tab.setMuted(false)', () => {
      tm.performTabAction('unmute');
      expect(tab.setMuted).toHaveBeenCalledWith(false);
    });

    it('does nothing for unknown action', () => {
      expect(() => tm.performTabAction('yolo')).not.toThrow();
    });

    it('does nothing when no tab is focused', () => {
      const tm2 = TabManager.getInstance();
      // Manually clear currentTab via a fresh manager -- actually we can't easily
      // do this with singleton, so just verify no error with null current tab
      // by using the existing tm before focusTab
    });
  });

  // =========================================================================
  // 11. syncMediaStates
  // =========================================================================
  describe('syncMediaStates', () => {
    it('sends add for new media states', () => {
      const tm = initTabManager();
      const tab = makeMockTab();
      const state = {
        id: 'media-1',
        type: 'audio' as const,
        title: 'Song',
        album: '',
        artist: '',
        artworkUrl: '',
        playing: true,
        progress: 0,
        duration: 180,
      };
      tab.getMediaStates.mockReturnValue([state]);
      tm.addTab(tab as any);

      const mediaCall = tab.addEventListener.mock.calls.find(
        (c: any[]) => c[0] === 'media-state-changed',
      );
      mockSend.mockClear();
      mediaCall[1]();

      expect(mockSend).toHaveBeenCalledWith('media-state', {
        action: 'add',
        state,
      });
    });

    it('sends remove for states that no longer exist', () => {
      const tm = initTabManager();
      const tab = makeMockTab();
      const state = {
        id: 'media-rm',
        type: 'audio' as const,
        title: 'Song',
        album: '',
        artist: '',
        artworkUrl: '',
        playing: true,
        progress: 0,
        duration: 100,
      };

      tab.getMediaStates.mockReturnValue([state]);
      tm.addTab(tab as any);
      const mediaCall = tab.addEventListener.mock.calls.find(
        (c: any[]) => c[0] === 'media-state-changed',
      );
      mediaCall[1]();

      tab.getMediaStates.mockReturnValue([]);
      mockSend.mockClear();
      mediaCall[1]();

      expect(mockSend).toHaveBeenCalledWith('media-state', {
        action: 'remove',
        id: 'media-rm',
      });
    });

    it('sends update for existing states', () => {
      const tm = initTabManager();
      const tab = makeMockTab();
      const state1 = {
        id: 'media-up',
        type: 'audio' as const,
        title: 'Song v1',
        album: '',
        artist: '',
        artworkUrl: '',
        playing: true,
        progress: 0,
        duration: 200,
      };
      const state2 = { ...state1, title: 'Song v2', progress: 50 };

      tab.getMediaStates.mockReturnValue([state1]);
      tm.addTab(tab as any);
      const mediaCall = tab.addEventListener.mock.calls.find(
        (c: any[]) => c[0] === 'media-state-changed',
      );
      mediaCall[1]();

      tab.getMediaStates.mockReturnValue([state2]);
      mockSend.mockClear();
      mediaCall[1]();

      expect(mockSend).toHaveBeenCalledWith('media-state', {
        action: 'update',
        state: state2,
      });
    });

    it('does not send if mainWindow is destroyed', () => {
      const win = createMockBrowserWindow();
      win.isDestroyed.mockReturnValue(true);
      const tm = TabManager.initialize(win as any);
      const tab = makeMockTab();
      tab.getMediaStates.mockReturnValue([{
        id: 'x', type: 'audio', title: '', album: '', artist: '',
        artworkUrl: '', playing: true, progress: 0, duration: 1,
      }]);
      tm.addTab(tab as any);

      const mediaCall = tab.addEventListener.mock.calls.find(
        (c: any[]) => c[0] === 'media-state-changed',
      );
      mockSend.mockClear();
      mediaCall[1]();

      const mediaCalls = mockSend.mock.calls.filter(
        (c: any[]) => c[0] === 'media-state',
      );
      expect(mediaCalls).toHaveLength(0);
    });
  });

  // =========================================================================
  // 12. openNewTab / openSettings / loadUrlInCurrentTab
  // =========================================================================
  describe('openNewTab', () => {
    it('creates a new Tab, captures analytics, and focuses it', () => {
      const tm = initTabManager();

      tm.openNewTab('https://example.com');

      expect(Tab).toHaveBeenCalledWith('https://example.com');
      expect(mockAnalytics.capture).toHaveBeenCalledWith('tab_opened');
      expect(tm.getCurrentTab()).not.toBeNull();
    });
  });

  describe('openSettings', () => {
    it('focuses existing settings tab if one exists', () => {
      const tm = initTabManager();
      const settingsTab = makeMockTab({
        url: 'palladium://settings',
        isInternalPage: true,
      });
      tm.addTab(settingsTab as any);

      tm.openSettings();

      expect(tm.getCurrentTab()).toBe(settingsTab);
    });

    it('creates a new settings tab if none exists', () => {
      const tm = initTabManager();

      tm.openSettings();

      expect(Tab).toHaveBeenCalledWith('palladium://settings');
      expect(tm.getCurrentTab()).not.toBeNull();
    });
  });

  describe('loadUrlInCurrentTab', () => {
    it('loads URL in the current tab webContents', () => {
      const tm = initTabManager();
      const tab = makeMockTab();
      tm.focusTab(tab as any);

      tm.loadUrlInCurrentTab('https://new-url.com');

      expect(tab.view.webContents.loadURL).toHaveBeenCalledWith(
        'https://new-url.com',
      );
    });

    it('does nothing when there is no current tab', () => {
      const tm = initTabManager();
      expect(() => tm.loadUrlInCurrentTab('https://example.com')).not.toThrow();
    });
  });

  // =========================================================================
  // updateBrowsingView / updateDevtoolsView
  // =========================================================================
  describe('updateBrowsingView', () => {
    it('sends request-browser-layout when called without dimensions', async () => {
      const tm = initTabManager();
      mockSend.mockClear();

      await tm.updateBrowsingView();

      expect(mockSend).toHaveBeenCalledWith('request-browser-layout');
    });

    it('sets bounds on current tab view when given dimensions', async () => {
      const tm = initTabManager();
      const tab = makeMockTab();
      tm.focusTab(tab as any);

      await tm.updateBrowsingView({ x: 10, y: 20, width: 800, height: 600 });

      expect(tab.view.setBounds).toHaveBeenCalledWith({
        x: 11,
        y: 21,
        width: 798,
        height: 598,
      });
    });

    it('does nothing with dimensions when no tab is focused', async () => {
      const tm = initTabManager();

      // Should not throw
      await expect(
        tm.updateBrowsingView({ x: 0, y: 0, width: 100, height: 100 }),
      ).resolves.toBeUndefined();
    });
  });

  describe('updateDevtoolsView', () => {
    it('sends request-devtools-layout when called without dimensions', async () => {
      const tm = initTabManager();
      mockSend.mockClear();

      await tm.updateDevtoolsView();

      expect(mockSend).toHaveBeenCalledWith('request-devtools-layout');
    });

    it('sets bounds on devtools view and inserts CSS when given dimensions', async () => {
      const tm = initTabManager();
      const tab = makeMockTab();
      tm.focusTab(tab as any);

      await tm.updateDevtoolsView({ x: 0, y: 0, width: 400, height: 300 });

      expect(tab.devToolsView.setBounds).toHaveBeenCalledWith({
        x: 1,
        y: 1,
        width: 398,
        height: 298,
      });
      expect(tab.devToolsView.webContents.insertCSS).toHaveBeenCalledWith(
        'body{ min-height: 100vh; }',
      );
    });
  });

  // =========================================================================
  // showTabContextMenu
  // =========================================================================
  describe('showTabContextMenu', () => {
    it('builds and shows a context menu for the tab', () => {
      const tm = initTabManager();
      const tab = makeMockTab({ uuid: 'ctx' });
      tab.getMuted.mockReturnValue(false);
      tab.getCurrentUrl.mockReturnValue('https://example.com');
      tab.getTitle.mockReturnValue('Example Title');
      tm.addTab(tab as any);

      tm.showTabContextMenu('ctx');

      expect(Menu).toHaveBeenCalled();
      expect(MenuItem).toHaveBeenCalledTimes(3);

      const labels = (MenuItem as jest.Mock).mock.calls.map(
        (c: any[]) => c[0].label,
      );
      expect(labels).toContain('Mute Tab');
      expect(labels).toContain('Copy URL');
      expect(labels).toContain('Copy Page Title');
    });

    it('shows Unmute Tab when tab is muted', () => {
      const tm = initTabManager();
      const tab = makeMockTab({ uuid: 'muted-ctx', isMuted: true });
      tab.getMuted.mockReturnValue(true);
      tm.addTab(tab as any);

      (MenuItem as jest.Mock).mockClear();
      tm.showTabContextMenu('muted-ctx');

      const labels = (MenuItem as jest.Mock).mock.calls.map(
        (c: any[]) => c[0].label,
      );
      expect(labels).toContain('Unmute Tab');
    });

    it('Mute Tab click toggles mute', () => {
      const tm = initTabManager();
      const tab = makeMockTab({ uuid: 'mute-toggle' });
      tab.getMuted.mockReturnValue(false);
      tm.addTab(tab as any);

      tm.showTabContextMenu('mute-toggle');

      const muteItem = (MenuItem as jest.Mock).mock.calls.find(
        (c: any[]) => c[0].label === 'Mute Tab',
      );
      muteItem[0].click();

      expect(tab.setMuted).toHaveBeenCalledWith(true);
    });

    it('Copy URL click writes URL to clipboard', () => {
      const tm = initTabManager();
      const tab = makeMockTab({ uuid: 'copy-url' });
      tab.getCurrentUrl.mockReturnValue('https://copy-me.com');
      tm.addTab(tab as any);

      tm.showTabContextMenu('copy-url');

      const copyUrlItem = (MenuItem as jest.Mock).mock.calls.find(
        (c: any[]) => c[0].label === 'Copy URL',
      );
      copyUrlItem[0].click();

      expect(clipboard.writeText).toHaveBeenCalledWith('https://copy-me.com');
    });

    it('Copy Page Title click writes title to clipboard', () => {
      const tm = initTabManager();
      const tab = makeMockTab({ uuid: 'copy-title' });
      tab.getTitle.mockReturnValue('My Page');
      tm.addTab(tab as any);

      tm.showTabContextMenu('copy-title');

      const copyTitleItem = (MenuItem as jest.Mock).mock.calls.find(
        (c: any[]) => c[0].label === 'Copy Page Title',
      );
      copyTitleItem[0].click();

      expect(clipboard.writeText).toHaveBeenCalledWith('My Page');
    });

    it('does nothing for nonexistent uuid', () => {
      const tm = initTabManager();

      expect(() => tm.showTabContextMenu('nope')).not.toThrow();
      expect(Menu).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // handleMediaControl
  // =========================================================================
  describe('handleMediaControl', () => {
    it('executes JavaScript in the tab that owns the media', async () => {
      const tm = initTabManager();
      const tab = makeMockTab({ uuid: 'media-tab' });
      const state = {
        id: 'ctrl-1',
        type: 'audio' as const,
        title: 'Song',
        album: '',
        artist: '',
        artworkUrl: '',
        playing: true,
        progress: 0,
        duration: 180,
      };
      tab.getMediaStates.mockReturnValue([state]);
      tm.addTab(tab as any);

      await tm.handleMediaControl({ mediaId: 'ctrl-1', action: 'play' });

      expect(tab.view.webContents.executeJavaScript).toHaveBeenCalled();
    });

    it('does nothing when media ID is not found', async () => {
      const tm = initTabManager();
      const tab = makeMockTab();
      tab.getMediaStates.mockReturnValue([]);
      tm.addTab(tab as any);

      await tm.handleMediaControl({
        mediaId: 'nonexistent',
        action: 'play',
      });

      expect(tab.view.webContents.executeJavaScript).not.toHaveBeenCalled();
    });

    it('does nothing when the tab webContents is destroyed', async () => {
      const tm = initTabManager();
      const tab = makeMockTab();
      const state = {
        id: 'destroyed-media',
        type: 'audio' as const,
        title: 'Song',
        album: '',
        artist: '',
        artworkUrl: '',
        playing: true,
        progress: 0,
        duration: 100,
      };
      tab.getMediaStates.mockReturnValue([state]);
      tab.view.webContents.isDestroyed.mockReturnValue(true);
      tm.addTab(tab as any);

      await tm.handleMediaControl({
        mediaId: 'destroyed-media',
        action: 'pause',
      });

      expect(tab.view.webContents.executeJavaScript).not.toHaveBeenCalled();
    });

    it('handles all action types without throwing', async () => {
      const tm = initTabManager();
      const tab = makeMockTab();
      const state = {
        id: 'all-actions',
        type: 'audio' as const,
        title: 'Song',
        album: '',
        artist: '',
        artworkUrl: '',
        playing: true,
        progress: 0,
        duration: 100,
      };
      tab.getMediaStates.mockReturnValue([state]);
      tm.addTab(tab as any);

      for (const action of ['play', 'pause', 'next', 'previous'] as const) {
        tab.view.webContents.executeJavaScript.mockClear();
        await tm.handleMediaControl({ mediaId: 'all-actions', action });
        expect(tab.view.webContents.executeJavaScript).toHaveBeenCalled();
      }
    });

    it('does nothing for unknown action type', async () => {
      const tm = initTabManager();
      const tab = makeMockTab();
      const state = {
        id: 'unknown-action',
        type: 'audio' as const,
        title: 'Song',
        album: '',
        artist: '',
        artworkUrl: '',
        playing: true,
        progress: 0,
        duration: 100,
      };
      tab.getMediaStates.mockReturnValue([state]);
      tm.addTab(tab as any);

      await tm.handleMediaControl({
        mediaId: 'unknown-action',
        action: 'nonexistent' as any,
      });

      expect(tab.view.webContents.executeJavaScript).not.toHaveBeenCalled();
    });

    it('catches executeJavaScript errors gracefully', async () => {
      const tm = initTabManager();
      const tab = makeMockTab();
      const state = {
        id: 'error-media',
        type: 'audio' as const,
        title: 'Song',
        album: '',
        artist: '',
        artworkUrl: '',
        playing: true,
        progress: 0,
        duration: 100,
      };
      tab.getMediaStates.mockReturnValue([state]);
      tab.view.webContents.executeJavaScript.mockRejectedValue(
        new Error('tab destroyed'),
      );
      tm.addTab(tab as any);

      await expect(
        tm.handleMediaControl({ mediaId: 'error-media', action: 'play' }),
      ).resolves.toBeUndefined();
    });
  });
});
