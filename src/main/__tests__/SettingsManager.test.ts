// ---------------------------------------------------------------------------
// Mocks — these MUST be declared before the SettingsManager import so that
// module-level calls (e.g. `os.homedir()` used to compute `dataPath`) pick up
// the mocked values.
// ---------------------------------------------------------------------------

const mockSetEnabled = jest.fn();
const mockCapture = jest.fn();

jest.mock('node:os', () => ({
  homedir: () => '/tmp/test-home',
}));

jest.mock('node:fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

const mockIpcOn = jest.fn();
const mockWebContentsSend = jest.fn();

jest.mock('src/main/ipc', () => ({
  typedIpcMain: { on: mockIpcOn, handle: jest.fn() },
  typedWebContents: () => ({ send: mockWebContentsSend }),
}));

jest.mock('src/main/GlobalShortcuts', () => ({
  rebindCommandBarShortcut: jest.fn(),
}));

jest.mock('src/main/AnalyticsManager', () => ({
  AnalyticsManager: {
    getInstance: () => ({
      setEnabled: mockSetEnabled,
      capture: mockCapture,
    }),
  },
}));

import fs from 'node:fs';
import { SettingsManager } from '../SettingsManager';
import { settingsSchema, settingsDefaults } from 'src/ipc/SettingsRegistry';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const expectedDir = '/tmp/test-home/.palladium';
const expectedPath = '/tmp/test-home/.palladium/settings.json';

/** Wipe the singleton so each test gets a fresh instance. */
function resetSingleton() {
  (SettingsManager as any)['instance'] = undefined as any;
}

/** Shorthand casts to keep mock assertions readable. */
const existsSync = fs.existsSync as jest.Mock;
const readFileSync = fs.readFileSync as jest.Mock;
const writeFileSync = fs.writeFileSync as jest.Mock;
const mkdirSync = fs.mkdirSync as jest.Mock;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SettingsManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetSingleton();

    // Default fs behaviour: directory exists, file does not (fresh install).
    existsSync.mockImplementation((p: string) => {
      if (p === expectedDir) return true;
      if (p === expectedPath) return false;
      return false;
    });
  });

  // -----------------------------------------------------------------------
  // 1. Singleton
  // -----------------------------------------------------------------------

  it('returns the same instance on subsequent getInstance calls', () => {
    const a = SettingsManager.getInstance();
    const b = SettingsManager.getInstance();
    expect(a).toBe(b);
  });

  // -----------------------------------------------------------------------
  // 2. Creates directory & file when they don't exist
  // -----------------------------------------------------------------------

  it('creates the settings directory and empty file when neither exist', () => {
    existsSync.mockReturnValue(false);

    SettingsManager.getInstance();

    expect(mkdirSync).toHaveBeenCalledWith(expectedDir, { recursive: true });
    // First writeFileSync call is the empty-file seed, second is persist()
    expect(writeFileSync).toHaveBeenCalledWith(expectedPath, '{}');
  });

  // -----------------------------------------------------------------------
  // 3. Reads existing settings file
  // -----------------------------------------------------------------------

  it('reads and parses an existing settings file', () => {
    const saved = { analytics: { enabled: false } };

    existsSync.mockImplementation((p: string) => {
      if (p === expectedDir) return true;
      if (p === expectedPath) return true;
      return false;
    });
    readFileSync.mockReturnValue(JSON.stringify(saved));

    const mgr = SettingsManager.getInstance();

    expect(readFileSync).toHaveBeenCalledWith(expectedPath, 'utf8');
    expect(mgr.getItem('analytics.enabled')).toBe(false);
  });

  // -----------------------------------------------------------------------
  // 4. Handles corrupted settings file gracefully
  // -----------------------------------------------------------------------

  it('falls back to defaults when the settings file contains invalid JSON', () => {
    existsSync.mockImplementation((p: string) => {
      if (p === expectedDir) return true;
      if (p === expectedPath) return true;
      return false;
    });
    readFileSync.mockReturnValue('NOT VALID JSON {{{');

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const mgr = SettingsManager.getInstance();

    // Should have survived the corruption and fallen back to defaults
    expect(mgr.getItem('analytics.enabled')).toBe(
      settingsDefaults.analytics.enabled,
    );

    consoleSpy.mockRestore();
  });

  // -----------------------------------------------------------------------
  // 5. getItem returns defaults when setting not explicitly set
  // -----------------------------------------------------------------------

  it('returns the schema default when a setting has not been explicitly set', () => {
    const mgr = SettingsManager.getInstance();

    // analytics.enabled defaults to true per the schema
    expect(mgr.getItem('analytics.enabled')).toBe(true);

    // search engine defaults
    expect(mgr.getItem('searchEngines.defaultEngines.google')).toBe(true);
    expect(mgr.getItem('searchEngines.defaultEngines.duckDuckGo')).toBe(true);
  });

  // -----------------------------------------------------------------------
  // 6. setItem updates a setting and persists
  // -----------------------------------------------------------------------

  it('updates the value and writes to disk on setItem', () => {
    // Provide a fully-populated settings file so setDeepProp has a complete
    // object tree to walk into.
    const defaults = settingsSchema.parse({});
    existsSync.mockReturnValue(true);
    readFileSync.mockReturnValue(JSON.stringify(defaults));

    const mgr = SettingsManager.getInstance();
    writeFileSync.mockClear();

    mgr.setItem('searchEngines.defaultEngines.google', false);

    expect(mgr.getItem('searchEngines.defaultEngines.google')).toBe(false);
    // persist() should have been called
    expect(writeFileSync).toHaveBeenCalledWith(
      expectedPath,
      expect.any(String),
    );
  });

  // -----------------------------------------------------------------------
  // 7. setItem with analytics.enabled calls AnalyticsManager.setEnabled
  // -----------------------------------------------------------------------

  it('calls AnalyticsManager.setEnabled when analytics.enabled is changed', () => {
    const defaults = settingsSchema.parse({});
    existsSync.mockReturnValue(true);
    readFileSync.mockReturnValue(JSON.stringify(defaults));

    const mgr = SettingsManager.getInstance();
    mockSetEnabled.mockClear();

    mgr.setItem('analytics.enabled', false);

    expect(mockSetEnabled).toHaveBeenCalledWith(false);
  });

  it('captures a settings_changed event for non-analytics keys', () => {
    const defaults = settingsSchema.parse({});
    existsSync.mockReturnValue(true);
    readFileSync.mockReturnValue(JSON.stringify(defaults));

    const mgr = SettingsManager.getInstance();
    mockCapture.mockClear();

    mgr.setItem('searchEngines.defaultEngines.bing', false);

    expect(mockCapture).toHaveBeenCalledWith('settings_changed', {
      setting_key: 'searchEngines.defaultEngines.bing',
    });
  });

  // -----------------------------------------------------------------------
  // 8. persist writes to the correct path
  // -----------------------------------------------------------------------

  it('writes JSON to the correct file path on persist', () => {
    const mgr = SettingsManager.getInstance();
    writeFileSync.mockClear();

    mgr.persist();

    expect(writeFileSync).toHaveBeenCalledTimes(1);
    const [writtenPath, writtenData] = writeFileSync.mock.calls[0];
    expect(writtenPath).toBe(expectedPath);
    // Should be valid JSON
    expect(() => JSON.parse(writtenData)).not.toThrow();
  });

  // -----------------------------------------------------------------------
  // IPC handler — settings-sync
  // -----------------------------------------------------------------------

  it('registers a settings-sync IPC handler on construction', () => {
    SettingsManager.getInstance();
    expect(mockIpcOn).toHaveBeenCalledWith('settings-sync', expect.any(Function));
  });

  it('returns current settings when get-settings is invoked', () => {
    const mockIpcHandle = jest.fn();
    jest.mock('src/main/ipc', () => ({
      typedIpcMain: { on: mockIpcOn, handle: mockIpcHandle },
      typedWebContents: () => ({ send: mockWebContentsSend }),
    }));

    SettingsManager.getInstance();

    const handle = require('src/main/ipc').typedIpcMain.handle as jest.Mock;
    const handler = handle.mock.calls.find(
      (c: any[]) => c[0] === 'get-settings',
    )?.[1];
    expect(handler).toBeDefined();

    const result = handler();
    expect(result).toMatchObject({ analytics: expect.any(Object) });
  });

  it('updates settings when settings-sync receives a new payload', () => {
    const mgr = SettingsManager.getInstance();

    const handler = mockIpcOn.mock.calls.find(
      (c: any[]) => c[0] === 'settings-sync',
    )?.[1];

    const newSettings = settingsSchema.parse({
      searchEngines: {
        defaultEngines: { google: false, bing: true, duckDuckGo: true },
      },
    });

    writeFileSync.mockClear();
    handler({ sender: {} }, newSettings);

    expect(mgr.getItem('searchEngines.defaultEngines.google')).toBe(false);
    // Should have persisted after updating
    expect(writeFileSync).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // settings-sync — listener notification (the bug fix)
  // -----------------------------------------------------------------------

  it('notifies a registered listener when its key changes via settings-sync', () => {
    const defaults = settingsSchema.parse({});
    existsSync.mockReturnValue(true);
    readFileSync.mockReturnValue(JSON.stringify(defaults));

    const mgr = SettingsManager.getInstance();
    const listener = jest.fn();
    mgr.addListener('adBlocking.enabled', listener);
    listener.mockClear(); // ignore the immediate call on registration

    const handler = mockIpcOn.mock.calls.find(
      (c: any[]) => c[0] === 'settings-sync',
    )?.[1];

    const newSettings = settingsSchema.parse({
      adBlocking: { enabled: false },
    });
    handler({ sender: {} }, newSettings);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(false);
  });

  it('notifies all registered listeners when settings-sync fires', () => {
    const defaults = settingsSchema.parse({});
    existsSync.mockReturnValue(true);
    readFileSync.mockReturnValue(JSON.stringify(defaults));

    const mgr = SettingsManager.getInstance();
    const adBlockListener = jest.fn();
    const analyticsListener = jest.fn();
    mgr.addListener('adBlocking.enabled', adBlockListener);
    mgr.addListener('analytics.enabled', analyticsListener);
    adBlockListener.mockClear();
    analyticsListener.mockClear();

    const handler = mockIpcOn.mock.calls.find(
      (c: any[]) => c[0] === 'settings-sync',
    )?.[1];

    handler({ sender: {} }, settingsSchema.parse({}));

    expect(adBlockListener).toHaveBeenCalledTimes(1);
    expect(analyticsListener).toHaveBeenCalledTimes(1);
  });

  it('does not call a removed listener when settings-sync fires', () => {
    const defaults = settingsSchema.parse({});
    existsSync.mockReturnValue(true);
    readFileSync.mockReturnValue(JSON.stringify(defaults));

    const mgr = SettingsManager.getInstance();
    const listener = jest.fn();
    mgr.addListener('adBlocking.enabled', listener);
    mgr.removeListener('adBlocking.enabled', listener);
    listener.mockClear();

    const handler = mockIpcOn.mock.calls.find(
      (c: any[]) => c[0] === 'settings-sync',
    )?.[1];

    handler({ sender: {} }, settingsSchema.parse({ adBlocking: { enabled: false } }));

    expect(listener).not.toHaveBeenCalled();
  });

  it('passes the correct updated value to each listener after settings-sync', () => {
    const defaults = settingsSchema.parse({});
    existsSync.mockReturnValue(true);
    readFileSync.mockReturnValue(JSON.stringify(defaults));

    const mgr = SettingsManager.getInstance();
    const listener = jest.fn();
    mgr.addListener('adBlocking.enabled', listener);
    listener.mockClear();

    const handler = mockIpcOn.mock.calls.find(
      (c: any[]) => c[0] === 'settings-sync',
    )?.[1];

    // Toggle off, then back on
    handler({ sender: {} }, settingsSchema.parse({ adBlocking: { enabled: false } }));
    handler({ sender: {} }, settingsSchema.parse({ adBlocking: { enabled: true } }));

    expect(listener).toHaveBeenNthCalledWith(1, false);
    expect(listener).toHaveBeenNthCalledWith(2, true);
  });
});
