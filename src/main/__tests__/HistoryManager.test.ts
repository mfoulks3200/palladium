// ---------------------------------------------------------------------------
// Mocks — must be declared before imports
// ---------------------------------------------------------------------------

const mockIpcOn = jest.fn();
const mockIpcHandle = jest.fn();

jest.mock('src/main/ipc', () => ({
  typedIpcMain: { on: mockIpcOn, handle: mockIpcHandle },
  typedWebContents: () => ({ send: jest.fn() }),
}));

jest.mock('node:os', () => ({
  homedir: () => '/tmp/test-home',
}));

jest.mock('node:fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
}));

// Use real better-sqlite3 with :memory: database
const mockPrepare = jest.fn();
const mockExec = jest.fn();
const mockPragma = jest.fn();
const mockClose = jest.fn();

const mockDb = {
  prepare: mockPrepare,
  exec: mockExec,
  pragma: mockPragma,
  close: mockClose,
};

jest.mock('better-sqlite3', () => {
  return jest.fn().mockImplementation(() => mockDb);
});

import { HistoryManager, HistoryEvent } from '../HistoryManager';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wipe the singleton so each test gets a fresh instance. */
function resetSingleton() {
  (HistoryManager as any)['instance'] = undefined as any;
}

/** Find the handler registered for a given IPC channel via typedIpcMain.on. */
function getOnHandler(channel: string): ((...args: any[]) => void) | undefined {
  const call = mockIpcOn.mock.calls.find((c: any[]) => c[0] === channel);
  return call?.[1];
}

/** Find the handler registered via typedIpcMain.handle. */
function getHandleHandler(
  channel: string,
): ((...args: any[]) => any) | undefined {
  const call = mockIpcHandle.mock.calls.find((c: any[]) => c[0] === channel);
  return call?.[1];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HistoryManager', () => {
  const mockRun = jest.fn();
  const mockAll = jest.fn().mockReturnValue([]);

  beforeEach(() => {
    jest.clearAllMocks();
    resetSingleton();

    // Reset prepare to return a statement mock
    mockRun.mockReset();
    mockAll.mockReset().mockReturnValue([]);
    mockPrepare.mockReturnValue({ run: mockRun, all: mockAll });
  });

  // -----------------------------------------------------------------------
  // Singleton
  // -----------------------------------------------------------------------

  it('returns the same instance on subsequent getInstance calls', () => {
    const a = HistoryManager.getInstance();
    const b = HistoryManager.getInstance();
    expect(a).toBe(b);
  });

  // -----------------------------------------------------------------------
  // Initialization
  // -----------------------------------------------------------------------

  it('enables foreign keys and creates tables on construction', () => {
    HistoryManager.getInstance();

    expect(mockPragma).toHaveBeenCalledWith('foreign_keys = ON');
    expect(mockExec).toHaveBeenCalledTimes(2);
    // Check table creation SQL is present
    expect(mockExec).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS tabs'),
    );
    expect(mockExec).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS history'),
    );
  });

  // -----------------------------------------------------------------------
  // IPC registration
  // -----------------------------------------------------------------------

  it('registers get-history and clear-history IPC handlers', () => {
    HistoryManager.getInstance();

    expect(mockIpcHandle).toHaveBeenCalledWith(
      'get-history',
      expect.any(Function),
    );
    expect(mockIpcOn).toHaveBeenCalledWith(
      'clear-history',
      expect.any(Function),
    );
  });

  it('get-history IPC handler returns history', () => {
    const historyRows = [
      { id: 1, tab_uuid: 'u1', url: 'https://a.com', title: 'A' },
    ];
    HistoryManager.getInstance();

    // Override the prepare call for the getHistory SELECT
    mockAll.mockReturnValueOnce(historyRows);

    const handler = getHandleHandler('get-history');
    const result = handler!();
    expect(result).toEqual(historyRows);
  });

  it('clear-history IPC handler clears all data', () => {
    const mgr = HistoryManager.getInstance();
    const spy = jest.spyOn(mgr, 'clearHistory');

    const handler = getOnHandler('clear-history');
    handler!({} as any);

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  // -----------------------------------------------------------------------
  // addTab
  // -----------------------------------------------------------------------

  it('addTab inserts a row and dispatches tab-added event', () => {
    const mgr = HistoryManager.getInstance();
    const listener = jest.fn();
    mgr.addEventListener('tab-added', listener);

    mgr.addTab('tab-uuid-1');

    expect(mockPrepare).toHaveBeenCalledWith(
      'INSERT OR IGNORE INTO tabs (uuid) VALUES (?)',
    );
    expect(mockRun).toHaveBeenCalledWith('tab-uuid-1');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail).toEqual({ uuid: 'tab-uuid-1' });
  });

  // -----------------------------------------------------------------------
  // closeTab
  // -----------------------------------------------------------------------

  it('closeTab updates closed_at and dispatches tab-closed event', () => {
    const mgr = HistoryManager.getInstance();
    const listener = jest.fn();
    mgr.addEventListener('tab-closed', listener);

    mgr.closeTab('tab-uuid-2');

    expect(mockPrepare).toHaveBeenCalledWith(
      'UPDATE tabs SET closed_at = CURRENT_TIMESTAMP WHERE uuid = ?',
    );
    expect(mockRun).toHaveBeenCalledWith('tab-uuid-2');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail).toEqual({ uuid: 'tab-uuid-2' });
  });

  // -----------------------------------------------------------------------
  // addHistoryEvent
  // -----------------------------------------------------------------------

  it('addHistoryEvent inserts a history row and dispatches history-updated', () => {
    const mgr = HistoryManager.getInstance();
    const listener = jest.fn();
    mgr.addEventListener('history-updated', listener);

    const event: HistoryEvent = {
      tabUuid: 'tab-1',
      url: 'https://example.com',
      title: 'Example',
      metaDescription: 'A test page',
      metaKeywords: 'test',
    };

    mgr.addHistoryEvent(event);

    expect(mockPrepare).toHaveBeenCalledWith(
      'INSERT INTO history (tab_uuid, url, title, metaDescription, metaKeywords) VALUES (?, ?, ?, ?, ?)',
    );
    expect(mockRun).toHaveBeenCalledWith(
      'tab-1',
      'https://example.com',
      'Example',
      'A test page',
      'test',
    );
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('addHistoryEvent coerces empty title/description/keywords to null', () => {
    const mgr = HistoryManager.getInstance();

    mgr.addHistoryEvent({ tabUuid: 't1', url: 'https://x.com' });

    expect(mockRun).toHaveBeenCalledWith('t1', 'https://x.com', null, null, null);
  });

  // -----------------------------------------------------------------------
  // getHistory
  // -----------------------------------------------------------------------

  it('getHistory queries all rows ordered by timestamp DESC', () => {
    const mgr = HistoryManager.getInstance();
    const rows = [{ id: 1, url: 'https://a.com' }];
    mockAll.mockReturnValueOnce(rows);

    const result = mgr.getHistory();

    expect(mockPrepare).toHaveBeenCalledWith(
      'SELECT * FROM history ORDER BY timestamp DESC',
    );
    expect(result).toEqual(rows);
  });

  // -----------------------------------------------------------------------
  // searchHistory
  // -----------------------------------------------------------------------

  it('searchHistory queries with LIKE pattern and default limit', () => {
    const mgr = HistoryManager.getInstance();
    mockAll.mockReturnValueOnce([]);

    mgr.searchHistory('google');

    expect(mockPrepare).toHaveBeenCalledWith(
      expect.stringContaining('WHERE title LIKE ?'),
    );
    expect(mockAll).toHaveBeenCalledWith(
      '%google%',
      '%google%',
      '%google%',
      '%google%',
      20,
    );
  });

  it('searchHistory respects custom limit', () => {
    const mgr = HistoryManager.getInstance();
    mockAll.mockReturnValueOnce([]);

    mgr.searchHistory('test', 5);

    expect(mockAll).toHaveBeenCalledWith(
      '%test%',
      '%test%',
      '%test%',
      '%test%',
      5,
    );
  });

  // -----------------------------------------------------------------------
  // getTabHistory
  // -----------------------------------------------------------------------

  it('getTabHistory queries by tab_uuid', () => {
    const mgr = HistoryManager.getInstance();
    mockAll.mockReturnValueOnce([]);

    mgr.getTabHistory('tab-abc');

    expect(mockPrepare).toHaveBeenCalledWith(
      'SELECT * FROM history WHERE tab_uuid = ? ORDER BY timestamp DESC',
    );
    expect(mockAll).toHaveBeenCalledWith('tab-abc');
  });

  // -----------------------------------------------------------------------
  // clearHistory
  // -----------------------------------------------------------------------

  it('clearHistory deletes all rows and dispatches history-cleared', () => {
    const mgr = HistoryManager.getInstance();
    const listener = jest.fn();
    mgr.addEventListener('history-cleared', listener);

    mgr.clearHistory();

    // Two prepare calls: one for history, one for tabs
    const deleteHistory = mockPrepare.mock.calls.find(
      (c: any[]) => c[0] === 'DELETE FROM history',
    );
    const deleteTabs = mockPrepare.mock.calls.find(
      (c: any[]) => c[0] === 'DELETE FROM tabs',
    );
    expect(deleteHistory).toBeTruthy();
    expect(deleteTabs).toBeTruthy();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  // -----------------------------------------------------------------------
  // close
  // -----------------------------------------------------------------------

  it('close closes the database', () => {
    const mgr = HistoryManager.getInstance();
    mgr.close();
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});
