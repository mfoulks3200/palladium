/** @jest-environment node */
const mockHome = jest
  .requireActual('fs')
  .mkdtempSync(
    jest
      .requireActual('path')
      .join(jest.requireActual('os').tmpdir(), 'palladium-history-'),
  );
// Use Node's real SQLite engine so CI needs no Electron native binding.
jest.mock(
  'better-sqlite3',
  () => {
    const { DatabaseSync } = jest.requireActual('node:sqlite');
    return class {
      private database: InstanceType<typeof DatabaseSync>;
      constructor(filename: string) {
        this.database = new DatabaseSync(filename);
      }
      pragma(statement: string) {
        this.database.exec(`PRAGMA ${statement}`);
      }
      exec(statement: string) {
        this.database.exec(statement);
      }
      prepare(statement: string) {
        return this.database.prepare(statement);
      }
      transaction(callback: () => void) {
        return () => {
          this.database.exec('BEGIN');
          try {
            callback();
            this.database.exec('COMMIT');
          } catch (error) {
            this.database.exec('ROLLBACK');
            throw error;
          }
        };
      }
      close() {
        this.database.close();
      }
    };
  },
  { virtual: true },
);
jest.mock('os', () => ({ homedir: () => mockHome }));
jest.mock('../ipc', () => ({
  typedIpcMain: { on: jest.fn(), handle: jest.fn() },
}));

import fs from 'fs';
import { HistoryManager } from '../HistoryManager';

describe('HistoryManager with real SQLite', () => {
  let manager: HistoryManager;
  beforeEach(() => {
    HistoryManager['instance'] = undefined as any;
    manager = HistoryManager.getInstance();
  });
  afterEach(() => {
    manager.close();
    fs.rmSync(`${mockHome}/.palladium`, { recursive: true, force: true });
  });
  afterAll(() => fs.rmSync(mockHome, { recursive: true, force: true }));

  it('clears history while retaining open tabs for future navigation', () => {
    manager.addTab('open');
    manager.addTab('closed');
    manager.closeTab('closed');
    manager.addHistoryEvent({ tabUuid: 'open', url: 'https://old.example' });
    manager.clearHistory();
    expect(manager.getHistory()).toEqual([]);
    expect(() =>
      manager.addHistoryEvent({
        tabUuid: 'open',
        url: 'https://new.example',
      }),
    ).not.toThrow();
    expect(() =>
      manager.addHistoryEvent({
        tabUuid: 'closed',
        url: 'https://closed.example',
      }),
    ).toThrow();
    expect(manager.getHistory()).toHaveLength(1);
  });

  it('rolls back both deletions if clearing tabs fails', () => {
    manager.addTab('closed');
    manager.closeTab('closed');
    manager.addHistoryEvent({
      tabUuid: 'closed',
      url: 'https://old.example',
    });
    manager['db'].exec(
      "CREATE TRIGGER fail_clear BEFORE DELETE ON tabs BEGIN SELECT RAISE(ABORT, 'test failure'); END",
    );
    expect(() => manager.clearHistory()).toThrow('test failure');
    expect(manager.getHistory()).toHaveLength(1);
  });

  it('pages through tied timestamps without duplicates or skipping after new inserts', () => {
    manager.addTab('open');
    for (let i = 0; i < 205; i += 1) {
      manager.addHistoryEvent({
        tabUuid: 'open',
        url: `https://example.test/${i}`,
      });
    }
    const first = manager.getHistory();
    expect(first).toHaveLength(100);
    manager.addHistoryEvent({
      tabUuid: 'open',
      url: 'https://example.test/new',
    });
    const second = manager.getHistory(first[99].id);
    const third = manager.getHistory(second[99].id);
    expect(second).toHaveLength(100);
    expect(third).toHaveLength(5);
    const ids = [...first, ...second, ...third].map((item) => item.id);
    expect(new Set(ids).size).toBe(205);
    expect(ids).toEqual([...ids].sort((a, b) => b - a));
  });
});
