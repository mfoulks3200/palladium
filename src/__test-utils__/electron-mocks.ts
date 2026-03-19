/**
 * Shared Electron test mock factories for Palladium main process tests.
 *
 * Usage: call factory functions to get jest-mocked Electron objects.
 * All methods are jest.fn() stubs with sensible defaults that can be
 * overridden per-test via mockReturnValue / mockImplementation.
 */

import type { TabIpcPacket } from '../ipc';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Allows partial overrides of any mock shape. */
type Overrides = Record<string, any>;

/**
 * Minimal EventEmitter-like mixin so `.on()` / `.once()` / `.addListener()`
 * / `.removeListener()` actually accumulate handlers that tests can fire.
 */
function withEventEmitter() {
  const listeners = new Map<string, ((...args: any[]) => void)[]>();

  const on = jest.fn((event: string, fn: (...args: any[]) => void) => {
    if (!listeners.has(event)) listeners.set(event, []);
    listeners.get(event)!.push(fn);
  });

  const once = jest.fn((event: string, fn: (...args: any[]) => void) => {
    const wrapper = (...args: any[]) => {
      removeListener(event, wrapper);
      fn(...args);
    };
    on(event, wrapper);
  });

  const addListener = jest.fn(
    (event: string, fn: (...args: any[]) => void) => {
      on(event, fn);
    },
  );

  const removeListener = jest.fn((event: string, fn: (...args: any[]) => void) => {
    const fns = listeners.get(event);
    if (fns) {
      const idx = fns.indexOf(fn);
      if (idx !== -1) fns.splice(idx, 1);
    }
  });

  const removeAllListeners = jest.fn((event?: string) => {
    if (event) {
      listeners.delete(event);
    } else {
      listeners.clear();
    }
  });

  /** Fire an event — use in tests to simulate Electron events. */
  const emit = (event: string, ...args: any[]) => {
    const fns = listeners.get(event);
    if (fns) [...fns].forEach((fn) => fn(...args));
  };

  return { on, once, addListener, removeListener, removeAllListeners, emit };
}

// ---------------------------------------------------------------------------
// WebContents
// ---------------------------------------------------------------------------

export interface MockWebContents extends Record<string, any> {
  /** Helper: fire a registered event handler. Not part of Electron API. */
  __emit: (event: string, ...args: any[]) => void;
}

export function createMockWebContents(
  overrides: Overrides = {},
): MockWebContents {
  const ee = withEventEmitter();

  const wc: MockWebContents = {
    // Event emitter
    on: ee.on,
    once: ee.once,
    addListener: ee.addListener,
    removeListener: ee.removeListener,
    removeAllListeners: ee.removeAllListeners,
    __emit: ee.emit,

    // Navigation
    loadURL: jest.fn().mockResolvedValue(undefined),
    getURL: jest.fn().mockReturnValue('https://example.com'),
    getTitle: jest.fn().mockReturnValue('Example'),
    reload: jest.fn(),
    reloadIgnoringCache: jest.fn(),
    navigationHistory: {
      goBack: jest.fn(),
      goForward: jest.fn(),
      canGoBack: jest.fn().mockReturnValue(false),
      canGoForward: jest.fn().mockReturnValue(false),
    },

    // State
    isLoading: jest.fn().mockReturnValue(false),
    isDestroyed: jest.fn().mockReturnValue(false),
    isAudioMuted: jest.fn().mockReturnValue(false),
    setAudioMuted: jest.fn(),

    // DevTools
    openDevTools: jest.fn(),
    closeDevTools: jest.fn(),
    isDevToolsOpened: jest.fn().mockReturnValue(false),
    setDevToolsWebContents: jest.fn(),

    // Script injection
    insertCSS: jest.fn().mockResolvedValue(''),
    executeJavaScript: jest.fn().mockResolvedValue(undefined),

    // Window open
    setWindowOpenHandler: jest.fn(),

    // IPC
    send: jest.fn(),
    inspectElement: jest.fn(),

    // Lifecycle
    close: jest.fn(),

    // Spread overrides last so they win
    ...overrides,
  };

  return wc;
}

// ---------------------------------------------------------------------------
// WebContentsView
// ---------------------------------------------------------------------------

export interface MockWebContentsView extends Record<string, any> {
  webContents: MockWebContents;
}

export function createMockWebContentsView(
  overrides: Overrides = {},
): MockWebContentsView {
  const { webContentsOverrides, ...viewOverrides } = overrides;

  return {
    webContents: createMockWebContents(webContentsOverrides),
    setBounds: jest.fn(),
    setBorderRadius: jest.fn(),
    getBounds: jest.fn().mockReturnValue({ x: 0, y: 0, width: 800, height: 600 }),
    setBackgroundColor: jest.fn(),
    ...viewOverrides,
  };
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export interface MockSession extends Record<string, any> {}

export function createMockSession(
  overrides: Overrides = {},
): MockSession {
  return {
    flushStorageData: jest.fn(),
    clearStorageData: jest.fn().mockResolvedValue(undefined),
    setPermissionRequestHandler: jest.fn(),
    setPermissionCheckHandler: jest.fn(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// BrowserWindow
// ---------------------------------------------------------------------------

export interface MockBrowserWindow extends Record<string, any> {
  webContents: MockWebContents;
  contentView: {
    addChildView: jest.Mock;
    removeChildView: jest.Mock;
  };
  /** Helper: fire a registered event handler. Not part of Electron API. */
  __emit: (event: string, ...args: any[]) => void;
}

export function createMockBrowserWindow(
  overrides: Overrides = {},
): MockBrowserWindow {
  const { webContentsOverrides, ...windowOverrides } = overrides;
  const ee = withEventEmitter();

  return {
    // Event emitter
    on: ee.on,
    once: ee.once,
    addListener: ee.addListener,
    removeListener: ee.removeListener,
    removeAllListeners: ee.removeAllListeners,
    __emit: ee.emit,

    // WebContents
    webContents: createMockWebContents(webContentsOverrides),

    // Content view (child view management for tabs)
    contentView: {
      addChildView: jest.fn(),
      removeChildView: jest.fn(),
    },

    // Window state
    show: jest.fn(),
    hide: jest.fn(),
    close: jest.fn(),
    destroy: jest.fn(),
    focus: jest.fn(),
    blur: jest.fn(),
    minimize: jest.fn(),
    maximize: jest.fn(),
    unmaximize: jest.fn(),
    restore: jest.fn(),
    isMaximized: jest.fn().mockReturnValue(false),
    isMinimized: jest.fn().mockReturnValue(false),
    isVisible: jest.fn().mockReturnValue(true),
    isDestroyed: jest.fn().mockReturnValue(false),
    isFocused: jest.fn().mockReturnValue(true),
    focusOnWebView: jest.fn(),

    // Geometry
    setPosition: jest.fn(),
    getPosition: jest.fn().mockReturnValue([0, 0]),
    setSize: jest.fn(),
    getSize: jest.fn().mockReturnValue([1280, 720]),
    setBounds: jest.fn(),
    getBounds: jest
      .fn()
      .mockReturnValue({ x: 0, y: 0, width: 1280, height: 720 }),
    getContentBounds: jest
      .fn()
      .mockReturnValue({ x: 0, y: 0, width: 1280, height: 720 }),

    // Loading
    loadURL: jest.fn().mockResolvedValue(undefined),
    loadFile: jest.fn().mockResolvedValue(undefined),

    ...windowOverrides,
  } as MockBrowserWindow;
}

// ---------------------------------------------------------------------------
// Tab (mock matching the public interface of src/main/Tab.ts)
// ---------------------------------------------------------------------------

export interface MockTab {
  uuid: string;
  isInternalPage: boolean;
  devMode: boolean;
  view: MockWebContentsView;
  devToolsView: MockWebContentsView;
  getCurrentUrl: jest.Mock;
  getTitle: jest.Mock;
  isDevMode: jest.Mock;
  setDevMode: jest.Mock;
  getMuted: jest.Mock;
  setMuted: jest.Mock;
  getFavicon: jest.Mock;
  getTabIpcMeta: jest.Mock;
  getMediaStates: jest.Mock;
  addMediaState: jest.Mock;
  updateMediaState: jest.Mock;
  removeMediaState: jest.Mock;
  destroyTab: jest.Mock;
  addEventListener: jest.Mock;
  removeEventListener: jest.Mock;
  dispatchEvent: jest.Mock;
}

export function createMockTab(
  overrides: Partial<{
    uuid: string;
    url: string;
    title: string;
    isInternalPage: boolean;
    devMode: boolean;
    isMuted: boolean;
    favicon: string | null;
  }> = {},
): MockTab {
  const uuid = overrides.uuid ?? crypto.randomUUID();
  const url = overrides.url ?? 'https://example.com';
  const title = overrides.title ?? 'Example';
  const isInternalPage = overrides.isInternalPage ?? false;
  const devMode = overrides.devMode ?? false;
  const isMuted = overrides.isMuted ?? false;
  const favicon = overrides.favicon ?? null;

  const view = createMockWebContentsView();
  const devToolsView = createMockWebContentsView();

  // Wire up webContents defaults to match tab state
  view.webContents.getURL.mockReturnValue(url);
  view.webContents.getTitle.mockReturnValue(title);
  view.webContents.isAudioMuted.mockReturnValue(isMuted);

  const meta: TabIpcPacket = {
    uuid,
    url,
    title,
    faviconB64: favicon ?? undefined,
    isDevMode: devMode,
    isPlayingAudio: false,
    isMuted,
    isLoading: false,
    isInternal: isInternalPage,
  };

  return {
    uuid,
    isInternalPage,
    devMode,
    view,
    devToolsView,
    getCurrentUrl: jest.fn().mockReturnValue(url),
    getTitle: jest.fn().mockReturnValue(title),
    isDevMode: jest.fn().mockReturnValue(devMode),
    setDevMode: jest.fn(),
    getMuted: jest.fn().mockReturnValue(isMuted),
    setMuted: jest.fn(),
    getFavicon: jest.fn().mockReturnValue(favicon),
    getTabIpcMeta: jest.fn().mockReturnValue(meta),
    getMediaStates: jest.fn().mockReturnValue([]),
    addMediaState: jest.fn(),
    updateMediaState: jest.fn(),
    removeMediaState: jest.fn(),
    destroyTab: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  };
}

// ---------------------------------------------------------------------------
// Electron module mock (for jest.mock('electron', () => ...))
// ---------------------------------------------------------------------------

/**
 * Returns a complete mock of the `electron` module suitable for
 * `jest.mock('electron', () => createMockElectronModule())`.
 *
 * The returned object preserves references so tests can inspect
 * what was called (e.g. `mockElectron.ipcMain.on`).
 */
export function createMockElectronModule() {
  const mockSession = createMockSession();

  return {
    // IPC
    ipcMain: {
      on: jest.fn(),
      once: jest.fn(),
      handle: jest.fn(),
      removeListener: jest.fn(),
      removeHandler: jest.fn(),
    },

    // Constructors — return mocks when `new` is called
    BrowserWindow: jest.fn().mockImplementation(() => createMockBrowserWindow()),
    WebContentsView: jest
      .fn()
      .mockImplementation(() => createMockWebContentsView()),
    Menu: jest.fn().mockImplementation(() => ({
      append: jest.fn(),
      popup: jest.fn(),
      items: [],
    })),
    MenuItem: jest.fn().mockImplementation((opts: any) => ({ ...opts })),

    // Singletons
    app: {
      isPackaged: false,
      getVersion: jest.fn().mockReturnValue('0.0.0-test'),
      getName: jest.fn().mockReturnValue('palladium-test'),
      getPath: jest.fn().mockReturnValue('/tmp/test'),
      quit: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      whenReady: jest.fn().mockResolvedValue(undefined),
    },

    session: {
      fromPath: jest.fn().mockReturnValue(mockSession),
      defaultSession: mockSession,
    },

    screen: {
      getPrimaryDisplay: jest.fn().mockReturnValue({
        workAreaSize: { width: 1920, height: 1080 },
        workArea: { x: 0, y: 0, width: 1920, height: 1080 },
      }),
      getCursorScreenPoint: jest.fn().mockReturnValue({ x: 500, y: 500 }),
      getDisplayNearestPoint: jest.fn().mockReturnValue({
        workAreaSize: { width: 1920, height: 1080 },
        workArea: { x: 0, y: 0, width: 1920, height: 1080 },
      }),
    },

    globalShortcut: {
      register: jest.fn().mockReturnValue(true),
      unregister: jest.fn(),
      unregisterAll: jest.fn(),
      isRegistered: jest.fn().mockReturnValue(false),
    },

    clipboard: {
      writeText: jest.fn(),
      readText: jest.fn().mockReturnValue(''),
    },
  };
}
