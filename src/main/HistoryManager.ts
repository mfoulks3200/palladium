import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { typedIpcMain } from './ipc';
import { HistoryItem } from '../ipc';

export interface HistoryEvent {
  tabUuid: string;
  url: string;
  title?: string;
  metaDescription?: string;
  metaKeywords?: string;
}

export class HistoryManager extends EventTarget {
  private static instance: HistoryManager;
  private db: Database.Database;

  public static getInstance() {
    if (!HistoryManager.instance) {
      HistoryManager.instance = new HistoryManager();
    }
    return HistoryManager.instance;
  }

  private constructor() {
    super();
    const dbPath = path.join(os.homedir(), '.palladium', 'history.sqlite');
    const dbDir = path.dirname(dbPath);

    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.init();
    this.registerIpc();
  }

  private registerIpc() {
    typedIpcMain.handle('get-history', () => {
      return this.getHistory() as HistoryItem[];
    });

    typedIpcMain.on('clear-history', () => {
      this.clearHistory();
    });
  }

  private init() {
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');

    // Create tabs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tabs (
        uuid TEXT PRIMARY KEY,
        label TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        closed_at DATETIME
      )
    `);

    // Create history (navigation events) table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tab_uuid TEXT,
        url TEXT NOT NULL,
        title TEXT,
        metaDescription TEXT,
        metaKeywords TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tab_uuid) REFERENCES tabs(uuid) ON DELETE CASCADE
      )
    `);
  }

  public addTab(uuid: string) {
    const stmt = this.db.prepare(
      'INSERT OR IGNORE INTO tabs (uuid) VALUES (?)',
    );
    stmt.run(uuid);
    const updateEvent = new CustomEvent('tab-added', {
      detail: {
        uuid,
      },
      bubbles: true, // Events can bubble up the DOM if necessary
    });
    this.dispatchEvent(updateEvent);
  }

  public closeTab(uuid: string) {
    const stmt = this.db.prepare(
      'UPDATE tabs SET closed_at = CURRENT_TIMESTAMP WHERE uuid = ?',
    );
    stmt.run(uuid);
    const updateEvent = new CustomEvent('tab-closed', {
      detail: {
        uuid,
      },
      bubbles: true,
    });
    this.dispatchEvent(updateEvent);
  }

  public addHistoryEvent(historyEvent: HistoryEvent) {
    const { tabUuid, url, title, metaDescription, metaKeywords } = historyEvent;
    const stmt = this.db.prepare(
      'INSERT INTO history (tab_uuid, url, title, metaDescription, metaKeywords) VALUES (?, ?, ?, ?, ?)',
    );
    stmt.run(
      tabUuid,
      url,
      title || null,
      metaDescription || null,
      metaKeywords || null,
    );
    const updateEvent = new CustomEvent('history-updated', {
      detail: {
        tabUuid,
        url,
        title,
        metaDescription,
        metaKeywords,
      },
      bubbles: true, // Events can bubble up the DOM if necessary
    });
    this.dispatchEvent(updateEvent);
  }

  public getHistory() {
    return this.db
      .prepare('SELECT * FROM history ORDER BY timestamp DESC')
      .all();
  }

  public searchHistory(query: string, limit: number = 20) {
    const pattern = `%${query}%`;
    return this.db
      .prepare(
        `SELECT * FROM history
         WHERE title LIKE ? OR url LIKE ? OR metaDescription LIKE ? OR metaKeywords LIKE ?
         ORDER BY timestamp DESC
         LIMIT ?`,
      )
      .all(pattern, pattern, pattern, pattern, limit) as HistoryItem[];
  }

  public getTabHistory(tabUuid: string) {
    return this.db
      .prepare(
        'SELECT * FROM history WHERE tab_uuid = ? ORDER BY timestamp DESC',
      )
      .all(tabUuid);
  }

  public clearHistory() {
    this.db.prepare('DELETE FROM history').run();
    this.db.prepare('DELETE FROM tabs').run();
    const updateEvent = new CustomEvent('history-cleared', {
      bubbles: true,
    });
    this.dispatchEvent(updateEvent);
  }

  public close() {
    this.db.close();
  }
}
