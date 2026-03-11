// ---------------------------------------------------------------------------
// Mocks — declared before the AnalyticsManager import so module-level
// references (e.g. `os.homedir()` used to compute `distinctIdPath`) resolve
// to the mocked values.
// ---------------------------------------------------------------------------

const mockCapture = jest.fn();
const mockOptIn = jest.fn();
const mockOptOut = jest.fn();
const mockGetAllFlags = jest
  .fn()
  .mockResolvedValue({ 'test-flag': true } as Record<string, boolean>);
const mockShutdown = jest.fn().mockResolvedValue(undefined);

jest.mock('posthog-node', () => ({
  PostHog: jest.fn().mockImplementation(() => ({
    capture: mockCapture,
    optIn: mockOptIn,
    optOut: mockOptOut,
    getAllFlags: mockGetAllFlags,
    shutdown: mockShutdown,
  })),
}));

jest.mock('electron', () => ({
  app: { getVersion: () => '0.0.8' },
  BrowserWindow: {
    getAllWindows: jest.fn().mockReturnValue([]),
  },
}));

jest.mock('node:os', () => ({
  homedir: () => '/tmp/test-home',
}));

jest.mock('node:fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

const FIXED_UUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
jest.mock('node:crypto', () => ({
  randomUUID: () => FIXED_UUID,
}));

const mockIpcOn = jest.fn();
const mockIpcHandle = jest.fn();
const mockWebContentsSend = jest.fn();

jest.mock('src/main/ipc', () => ({
  typedIpcMain: { on: mockIpcOn, handle: mockIpcHandle },
  typedWebContents: jest.fn(() => ({ send: mockWebContentsSend })),
}));

jest.mock('src/ipc', () => ({}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import { BrowserWindow } from 'electron';
import { AnalyticsManager } from '../AnalyticsManager';
import { typedWebContents } from '../ipc';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const existsSync = fs.existsSync as jest.Mock;
const readFileSync = fs.readFileSync as jest.Mock;
const writeFileSync = fs.writeFileSync as jest.Mock;

const analyticsDir = '/tmp/test-home/.palladium';
const analyticsIdPath = '/tmp/test-home/.palladium/analytics_id';

/** Reset the singleton so each test starts fresh. */
function resetSingleton() {
  AnalyticsManager['instance'] = undefined as any;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AnalyticsManager', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    resetSingleton();

    // Default: directory exists, analytics_id file does not.
    existsSync.mockImplementation((p: string) => {
      if (p === analyticsDir) return true;
      if (p === analyticsIdPath) return false;
      return false;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // -----------------------------------------------------------------------
  // 1. Singleton
  // -----------------------------------------------------------------------

  it('returns the same instance on subsequent getInstance calls', () => {
    const a = AnalyticsManager.getInstance();
    const b = AnalyticsManager.getInstance();
    expect(a).toBe(b);
  });

  // -----------------------------------------------------------------------
  // 2. Loads existing analytics ID from file
  // -----------------------------------------------------------------------

  it('loads an existing analytics ID from disk', () => {
    const savedId = 'existing-uuid-from-file';
    existsSync.mockImplementation((p: string) => {
      if (p === analyticsDir) return true;
      if (p === analyticsIdPath) return true;
      return false;
    });
    readFileSync.mockReturnValue(savedId);

    const mgr = AnalyticsManager.getInstance();

    expect(readFileSync).toHaveBeenCalledWith(analyticsIdPath, 'utf8');
    // The loaded ID should be used for capture calls.
    mgr.capture('test_event');
    expect(mockCapture).toHaveBeenCalledWith(
      expect.objectContaining({ distinctId: savedId }),
    );
  });

  // -----------------------------------------------------------------------
  // 3. Creates new UUID when no ID file exists
  // -----------------------------------------------------------------------

  it('creates a new UUID and writes it when no analytics_id file exists', () => {
    AnalyticsManager.getInstance();

    expect(writeFileSync).toHaveBeenCalledWith(
      analyticsIdPath,
      FIXED_UUID,
      'utf8',
    );
  });

  // -----------------------------------------------------------------------
  // 4. setEnabled(false) calls optOut
  // -----------------------------------------------------------------------

  it('calls client.optOut when setEnabled(false)', () => {
    const mgr = AnalyticsManager.getInstance();

    mgr.setEnabled(false);

    expect(mockOptOut).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 5. setEnabled(true) calls optIn
  // -----------------------------------------------------------------------

  it('calls client.optIn when setEnabled(true)', () => {
    const mgr = AnalyticsManager.getInstance();

    mgr.setEnabled(true);

    expect(mockOptIn).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 6. capture sends event with properties when enabled
  // -----------------------------------------------------------------------

  it('sends an event with properties through PostHog when enabled', () => {
    const mgr = AnalyticsManager.getInstance();

    mgr.capture('app_launched', { first_run: true });

    expect(mockCapture).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'app_launched',
        properties: expect.objectContaining({
          app_version: '0.0.8',
          platform: process.platform,
          first_run: true,
        }),
      }),
    );
  });

  // -----------------------------------------------------------------------
  // 7. capture no-ops when disabled
  // -----------------------------------------------------------------------

  it('does not send events when analytics is disabled', () => {
    const mgr = AnalyticsManager.getInstance();
    mgr.setEnabled(false);
    mockCapture.mockClear();

    mgr.capture('should_not_send');

    expect(mockCapture).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 8. captureException sends error fields
  // -----------------------------------------------------------------------

  it('captures an exception with error fields', () => {
    const mgr = AnalyticsManager.getInstance();
    const err = new Error('something broke');
    err.name = 'TestError';

    mgr.captureException(err, { source: 'main' });

    expect(mockCapture).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'exception',
        properties: expect.objectContaining({
          error_name: 'TestError',
          error_message: 'something broke',
          error_stack: expect.any(String),
          source: 'main',
        }),
      }),
    );
  });

  // -----------------------------------------------------------------------
  // 9. getFeatureFlag returns cached value
  // -----------------------------------------------------------------------

  it('returns the cached feature flag value after refresh', async () => {
    const mgr = AnalyticsManager.getInstance();

    // The constructor already called refreshFeatureFlags once; let the
    // promise resolve so the flags are cached.
    await mgr.refreshFeatureFlags();

    expect(mgr.getFeatureFlag('test-flag')).toBe(true);
    expect(mgr.getFeatureFlag('nonexistent')).toBeUndefined();
  });

  // -----------------------------------------------------------------------
  // 10. getAllFlags returns a copy of cached flags
  // -----------------------------------------------------------------------

  it('returns a copy of all cached flags', async () => {
    const mgr = AnalyticsManager.getInstance();
    await mgr.refreshFeatureFlags();

    const flags = mgr.getAllFlags();

    expect(flags).toEqual({ 'test-flag': true });

    // Mutating the returned object should not affect the internal cache.
    flags['test-flag'] = false;
    expect(mgr.getFeatureFlag('test-flag')).toBe(true);
  });

  // -----------------------------------------------------------------------
  // 11. shutdown clears interval and shuts down client
  // -----------------------------------------------------------------------

  it('clears the polling interval and shuts down the PostHog client', async () => {
    const mgr = AnalyticsManager.getInstance();
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    await mgr.shutdown();

    expect(clearIntervalSpy).toHaveBeenCalled();
    expect(mockShutdown).toHaveBeenCalled();

    clearIntervalSpy.mockRestore();
  });

  // -----------------------------------------------------------------------
  // 12. IPC handlers registered on construction
  // -----------------------------------------------------------------------

  it('registers get-feature-flags, feature-flags-refresh, and capture-exception IPC handlers', () => {
    AnalyticsManager.getInstance();

    const registeredOnChannels = mockIpcOn.mock.calls.map(
      (call: any[]) => call[0],
    );
    expect(registeredOnChannels).toContain('feature-flags-refresh');
    expect(registeredOnChannels).toContain('capture-exception');

    const registeredHandleChannels = mockIpcHandle.mock.calls.map(
      (call: any[]) => call[0],
    );
    expect(registeredHandleChannels).toContain('get-feature-flags');
  });

  // -----------------------------------------------------------------------
  // 13. feature-flags-sync IPC handler responds with cached flags
  // -----------------------------------------------------------------------

  it('responds with cached flags when get-feature-flags is invoked', async () => {
    const mgr = AnalyticsManager.getInstance();
    await mgr.refreshFeatureFlags();

    const handler = mockIpcHandle.mock.calls.find(
      (c: any[]) => c[0] === 'get-feature-flags',
    )?.[1];
    expect(handler).toBeDefined();

    const result = await handler();

    expect(result).toEqual({ flags: { 'test-flag': true } });
  });

  // -----------------------------------------------------------------------
  // 14. refreshFeatureFlags broadcasts to all windows
  // -----------------------------------------------------------------------

  it('broadcasts updated flags to all open windows', async () => {
    const mockSend = jest.fn();
    const mockWindow = {
      isDestroyed: () => false,
      webContents: {},
    };
    (BrowserWindow.getAllWindows as jest.Mock).mockReturnValue([mockWindow]);
    (typedWebContents as jest.Mock).mockReturnValue({ send: mockSend });

    const mgr = AnalyticsManager.getInstance();
    await mgr.refreshFeatureFlags();

    expect(mockSend).toHaveBeenCalledWith('feature-flags-sync', {
      flags: { 'test-flag': true },
    });
  });
});
