import { EventEmitter } from 'events';
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

function makeTab(uuid: string) {
  return Object.assign(new EventTarget(), {
    uuid,
    isInternalPage: false,
    view: { setBorderRadius: jest.fn(), webContents: {} },
    devToolsView: { setBorderRadius: jest.fn(), webContents: {} },
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
