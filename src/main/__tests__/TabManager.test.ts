import { EventEmitter } from 'events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Tab } from '../Tab';
import { rendererEventSchemas } from '../../ipc/RequestSchemas';
import { SpaceSession } from '../SpaceSession';
import { TabManager } from '../TabManager';

jest.mock('electron', () => ({
  clipboard: {},
  Menu: jest.fn(),
  MenuItem: jest.fn(),
}));
jest.mock('../Tab', () => ({ Tab: jest.fn() }));
jest.mock('../AnalyticsManager', () => ({
  AnalyticsManager: { getInstance: () => ({ capture: jest.fn() }) },
}));
jest.mock('../ipc', () => ({ typedWebContents: (contents: any) => contents }));
jest.mock('../TabManagerIpcHandlers', () => ({
  registerTabManagerIpc: () => jest.fn(),
}));

function makeTab(uuid: string, url = 'https://example.org/' + uuid) {
  return Object.assign(new EventTarget(), {
    uuid,
    isInternalPage: false,
    view: { setBorderRadius: jest.fn(), webContents: {} },
    devToolsView: { setBorderRadius: jest.fn(), webContents: {} },
    getCurrentUrl: () => url,
    getTabIpcMeta: () => ({ uuid }),
    getMediaStates: () => [{ id: uuid }],
    destroyTab: jest.fn(),
  }) as any;
}
let win: any;
let manager: TabManager;
beforeEach(() => {
  jest.useFakeTimers();
  win = Object.assign(new EventEmitter(), {
    webContents: Object.assign(new EventEmitter(), { send: jest.fn() }),
    contentView: { addChildView: jest.fn(), removeChildView: jest.fn() },
    isDestroyed: () => false,
  });
  manager = TabManager.initialize(win);
});
afterEach(() => {
  win.emit('closed');
  jest.useRealTimers();
});

it('closes the first active tab, selects a survivor and removes both views and media', () => {
  const first = makeTab('first');
  const second = makeTab('second');
  manager.focusTab(first);
  manager.addTab(second);
  first.dispatchEvent(new Event('media-state-changed'));
  manager.closeTab('first');
  expect(manager.getCurrentTab()).toBe(second);
  expect(manager.getAllTabs()).toEqual([second]);
  expect(win.contentView.removeChildView).toHaveBeenCalledWith(first.view);
  expect(win.contentView.removeChildView).toHaveBeenCalledWith(
    first.devToolsView,
  );
  expect(first.destroyTab).toHaveBeenCalledTimes(1);
  expect(win.webContents.send).toHaveBeenCalledWith('media-state', {
    action: 'remove',
    id: 'first',
  });
});
it('preserves selection for background close and clears selection on last close', () => {
  const first = makeTab('first');
  const second = makeTab('second');
  manager.focusTab(first);
  manager.addTab(second);
  manager.closeTab('second');
  expect(manager.getCurrentTab()).toBe(first);
  manager.closeTab('first');
  expect(manager.getCurrentTab()).toBeNull();
  expect(manager.getAllTabs()).toEqual([]);
  expect(win.webContents.send).toHaveBeenLastCalledWith('update-tab-meta', {
    neighbors: {},
    activeSpace: 0,
    spaceCount: 1,
    currentTabUuid: null,
    tabs: [],
  });
  manager.closeTab('missing');
});
it('selects the previous tab when closing the final active tab', () => {
  const first = makeTab('first');
  const last = makeTab('last');
  manager.addTab(first);
  manager.focusTab(last);
  manager.closeTab('last');
  expect(manager.getCurrentTab()).toBe(first);
});
it('stops polling, destroys all tabs and allows a new owner after disposal', () => {
  const tab = makeTab('one');
  manager.addTab(tab);
  win.emit('closed');
  expect(tab.destroyTab).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(0);
  expect(() => TabManager.getInstance()).toThrow('not been initialized');
  manager = TabManager.initialize(win);
  expect(TabManager.getInstance()).toBe(manager);
});

it('restores selection and moves live tabs between spaces without changing the destination selection', () => {
  const first = makeTab('first');
  const moved = makeTab('moved');
  const other = makeTab('other');
  manager.focusTab(first);
  manager.focusTab(moved);
  manager.createSpace();
  expect(manager.getCurrentTab()).toBeNull();
  manager.focusTab(other);
  manager.switchSpace(0);
  expect(manager.getCurrentTab()).toBe(moved);
  manager.moveTabToSpace('moved', 1);
  expect(manager.getCurrentTab()).toBe(first);
  manager.switchSpace(1);
  expect(manager.getCurrentTab()).toBe(other);
  manager.closeTab('other');
  expect(manager.getCurrentTab()).toBe(moved);
  expect(moved.destroyTab).not.toHaveBeenCalled();
  manager.moveTabToSpace('moved', 0);
  expect(manager.getCurrentTab()).toBeNull();
  manager.focusTabUuid('moved');
  expect(manager.getCurrentTab()).toBe(moved);
  expect(win.webContents.send).toHaveBeenLastCalledWith('update-tab-meta', {
    neighbors: { 1: { tabs: [], selected: null } },
    activeSpace: 0,
    spaceCount: 2,
    currentTabUuid: 'moved',
    tabs: [{ uuid: 'first' }, { uuid: 'moved' }],
  });
});

it('focuses a live tab dropped into a previewed space and preserves the source selection', () => {
  const staying = makeTab('staying');
  const moved = makeTab('moved');
  manager.focusTab(staying);
  manager.focusTab(moved);
  manager.createSpace();
  manager.switchSpace(0);
  manager.moveTabToSpace('moved', 1, true);
  expect(manager.getCurrentTab()).toBe(moved);
  manager.switchSpace(0);
  expect(manager.getCurrentTab()).toBe(staying);
  expect(moved.destroyTab).not.toHaveBeenCalled();
});

describe('saved spaces', () => {
  let dir: string;
  let file: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'palladium-spaces-'));
    file = path.join(dir, 'spaces.json');
    jest
      .mocked(Tab)
      .mockImplementation((url) => makeTab(crypto.randomUUID(), url));
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  function reopen() {
    win.emit('close');
    win.emit('closed');
    win = Object.assign(new EventEmitter(), {
      webContents: win.webContents,
      contentView: win.contentView,
      isDestroyed: () => false,
    });
    manager = TabManager.initialize(win);
    expect(manager.restoreSession(new SpaceSession(file))).toBe(true);
  }

  it('reopens the active space and restores order and selection after dragging and reordering tabs', () => {
    expect(manager.restoreSession(new SpaceSession(file))).toBe(false);
    const first = makeTab('first');
    const moved = makeTab('moved');
    const last = makeTab('last');
    const settings = makeTab('settings', 'palladium://settings');
    manager.focusTab(first);
    manager.addTab(moved);
    manager.addTab(last);
    manager.createSpace();
    manager.focusTab(settings);
    manager.switchSpace(0);
    manager.moveTabToSpace('moved', 1);
    manager.reorderTab(1, 0);
    manager.createSpace();
    manager.switchSpace(1);
    reopen();
    expect(win.webContents.send).toHaveBeenLastCalledWith(
      'update-tab-meta',
      expect.objectContaining({ activeSpace: 1, spaceCount: 3 }),
    );
    expect(manager.getCurrentTab()?.getCurrentUrl()).toBe(
      'palladium://settings',
    );
    expect(manager.getAllTabs().map((tab) => tab.getCurrentUrl())).toEqual(
      [last, first, settings, moved].map((tab) => tab.getCurrentUrl()),
    );
    manager.switchSpace(0);
    expect(manager.getCurrentTab()?.getCurrentUrl()).toBe(
      first.getCurrentUrl(),
    );
    manager.switchSpace(2);
    reopen();
    expect(manager.getCurrentTab()).toBeNull();
    expect(win.webContents.send).toHaveBeenLastCalledWith(
      'update-tab-meta',
      expect.objectContaining({ activeSpace: 2, tabs: [] }),
    );
  });

  it('preserves the original session when a tab fails to restore', () => {
    const tabs = ['https://one.test', 'https://two.test', 'https://three.test'];
    const original = JSON.stringify({
      version: 1,
      activeSpace: 0,
      spaces: [{ tabs, selected: 2 }],
    });
    fs.writeFileSync(file, original);
    jest.mocked(Tab).mockImplementation((url) => {
      if (url === tabs[2]) throw new Error('Could not create tab');
      return makeTab(crypto.randomUUID(), url);
    });
    expect(() => manager.restoreSession(new SpaceSession(file))).toThrow(
      'Could not create tab',
    );
    win.emit('close');
    expect(fs.readFileSync(file, 'utf8')).toBe(original);
  });

  it('restores a long HTTPS URL while retaining navigation request limits', () => {
    const url = 'https://example.org/?q=' + 'x'.repeat(33000);
    expect(
      rendererEventSchemas['open-new-tab'].safeParse([{ newUrl: url }]).success,
    ).toBe(false);
    manager.restoreSession(new SpaceSession(file));
    manager.focusTab(makeTab('long', url));
    reopen();
    expect(manager.getCurrentTab()?.getCurrentUrl()).toBe(url);
  });

  it('keeps a damaged session for recovery and falls back to normal startup', () => {
    fs.writeFileSync(file, '{"spaces":[]}');
    expect(manager.restoreSession(new SpaceSession(file))).toBe(false);
    manager.focusTab(makeTab('new'));
    reopen();
    expect(manager.getCurrentTab()?.getCurrentUrl()).toBe(
      'https://example.org/new',
    );
    const backup = fs
      .readdirSync(dir)
      .find((name) => name.startsWith('spaces.json.unreadable-'));
    expect(fs.readFileSync(path.join(dir, backup!), 'utf8')).toBe(
      '{"spaces":[]}',
    );
  });
});
