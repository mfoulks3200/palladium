import { EventEmitter } from 'events';
import { ipcMain, BrowserWindow } from 'electron';
import { typedIpcMain, typedWebContents } from '../ipc';
import { authorizeIpcRenderer } from '../IpcAuthorization';
import { registerTabManagerIpc } from '../TabManagerIpcHandlers';
import type { TabManager } from '../TabManager';

jest.mock('electron', () => {
  const { EventEmitter: MainEmitter } = require('events');
  const emitter = new MainEmitter();
  const handlers = new Map();
  emitter.handle = (channel: string, handler: unknown) => {
    if (handlers.has(channel)) throw new Error('Duplicate handler');
    handlers.set(channel, handler);
  };
  emitter.removeHandler = (channel: string) => handlers.delete(channel);
  emitter.handlers = handlers;
  return { ipcMain: emitter, BrowserWindow: { fromWebContents: jest.fn() } };
});

const bus = ipcMain as typeof ipcMain & {
  handlers: Map<string, (...args: any[]) => Promise<unknown>>;
};
const url = 'file:///app/mainUi.html';
function renderer(role: 'main-ui' | 'command-bar' = 'main-ui') {
  const contents = Object.assign(new EventEmitter(), {
    mainFrame: { url },
    getURL: jest.fn(() => url),
    isDestroyed: jest.fn(() => false),
  });
  const dispose = authorizeIpcRenderer(contents as any, url, role);
  return {
    contents,
    event: { sender: contents, senderFrame: contents.mainFrame } as any,
    dispose,
  };
}

let disposers: (() => void)[];
beforeEach(() => {
  disposers = [];
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  disposers.forEach((dispose) => dispose());
  jest.restoreAllMocks();
  expect(bus.eventNames()).toHaveLength(0);
  expect(bus.handlers.size).toBe(0);
});

it('delivers through a real EventEmitter and stops after idempotent disposal', () => {
  const { event, dispose } = renderer();
  disposers.push(dispose);
  const listener = jest.fn();
  const unsubscribe = typedIpcMain.on('close-tab', listener);
  disposers.push(unsubscribe);
  bus.emit('close-tab', event, { uuid: 'abc' });
  expect(listener).toHaveBeenCalledWith(event, { uuid: 'abc' });
  unsubscribe();
  unsubscribe();
  bus.emit('close-tab', event, { uuid: 'abc' });
  expect(listener).toHaveBeenCalledTimes(1);
  expect(bus.listenerCount('close-tab')).toBe(0);
});

it('removes the registered wrapper when given the original listener', () => {
  const { event, dispose } = renderer();
  disposers.push(dispose);
  const listener = jest.fn();
  disposers.push(typedIpcMain.on('request-tab-meta', listener));
  typedIpcMain.removeListener('request-tab-meta', listener);
  bus.emit('request-tab-meta', event);
  expect(listener).not.toHaveBeenCalled();
});

it('only consumes a once subscription on a valid authorized delivery', () => {
  const { event, dispose } = renderer();
  disposers.push(dispose);
  const listener = jest.fn();
  disposers.push(typedIpcMain.once('close-tab', listener));
  bus.emit('close-tab', event, { uuid: '' });
  bus.emit('close-tab', event, { uuid: 'abc' });
  bus.emit('close-tab', event, { uuid: 'abc' });
  expect(listener).toHaveBeenCalledTimes(1);
});

it.each([
  [],
  [null],
  [{ uuid: '' }],
  [{ uuid: 42 }],
  [{ uuid: 'abc' }, 'extra'],
])(
  'drops malformed event arguments %j without mutation or exception',
  (...args) => {
    const { event, dispose } = renderer();
    disposers.push(dispose);
    const listener = jest.fn();
    disposers.push(typedIpcMain.on('close-tab', listener));
    expect(() => bus.emit('close-tab', event, ...args)).not.toThrow();
    expect(listener).not.toHaveBeenCalled();
  },
);

it('rejects unregistered contents, child frames, navigated and destroyed senders', () => {
  const { contents, event, dispose } = renderer();
  disposers.push(dispose);
  const listener = jest.fn();
  disposers.push(typedIpcMain.on('clear-history', listener));
  bus.emit('clear-history', {
    sender: { mainFrame: event.senderFrame },
    senderFrame: event.senderFrame,
  });
  bus.emit('clear-history', { ...event, senderFrame: { url } });
  bus.emit('clear-history', { ...event, senderFrame: null });
  contents.mainFrame.url = 'https://example.com/mainUi.html';
  bus.emit('clear-history', event);
  contents.mainFrame.url = url;
  contents.getURL.mockReturnValue('https://example.com');
  bus.emit('clear-history', event);
  contents.getURL.mockReturnValue(url);
  contents.isDestroyed.mockReturnValue(true);
  bus.emit('clear-history', event);
  contents.isDestroyed.mockReturnValue(false);
  contents.emit('destroyed');
  bus.emit('clear-history', event);
  expect(listener).not.toHaveBeenCalled();
});

it('limits command-bar authority while allowing its command requests', async () => {
  const { event, dispose } = renderer('command-bar');
  disposers.push(dispose);
  const mutation = jest.fn();
  disposers.push(typedIpcMain.on('clear-history', mutation));
  bus.emit('clear-history', event);
  const command = jest.fn();
  disposers.push(typedIpcMain.handle('command-input', command));
  await bus.handlers.get('command-input')!(event, {
    mode: 'suggestions',
    input: '',
  });
  expect(mutation).not.toHaveBeenCalled();
  expect(command).toHaveBeenCalledTimes(1);
});

it('rejects invalid and unauthorized invokes with controlled errors', async () => {
  const { event, dispose } = renderer();
  disposers.push(dispose);
  const listener = jest.fn(() => []);
  disposers.push(typedIpcMain.handle('get-history', listener));
  const invoke = bus.handlers.get('get-history')!;
  await expect(invoke(event, 'extra')).rejects.toThrow('IPC request invalid');
  await expect(invoke({ sender: {}, senderFrame: null })).rejects.toThrow(
    'IPC request unauthorized',
  );
  expect(listener).not.toHaveBeenCalled();
  await expect(invoke(event)).resolves.toEqual([]);
});

it.each([
  { mode: 'execute', input: '' },
  { mode: 'other', input: '' },
  { mode: 'execute', input: '', command: 'tabs.close', tabUuid: '' },
])(
  'rejects malformed command invocations before execution: %j',
  async (payload) => {
    const { event, dispose } = renderer();
    disposers.push(dispose);
    const listener = jest.fn();
    disposers.push(typedIpcMain.handle('command-input', listener));
    await expect(
      bus.handlers.get('command-input')!(event, payload),
    ).rejects.toThrow('IPC request invalid');
    expect(listener).not.toHaveBeenCalled();
  },
);

it('rejects malformed settings and unsupported navigation URLs', () => {
  const { event, dispose } = renderer();
  disposers.push(dispose);
  const settings = jest.fn();
  const navigate = jest.fn();
  disposers.push(typedIpcMain.on('settings-sync', settings));
  disposers.push(typedIpcMain.on('update-tab-url', navigate));
  bus.emit('settings-sync', event, { analytics: { enabled: 'yes' } });
  bus.emit('update-tab-url', event, { newUrl: 'javascript:alert(1)' });
  expect(settings).not.toHaveBeenCalled();
  expect(navigate).not.toHaveBeenCalled();
});

it('contains asynchronous event listener failures', async () => {
  const { event, dispose } = renderer();
  disposers.push(dispose);
  disposers.push(
    typedIpcMain.on('clear-history', async () => {
      throw new Error('private');
    }),
  );
  bus.emit('clear-history', event);
  await Promise.resolve();
  expect(console.warn).toHaveBeenCalledWith('IPC event failed: clear-history');
});

it('contains listener errors and sanitizes invocation failures', async () => {
  const { event, dispose } = renderer();
  disposers.push(dispose);
  disposers.push(
    typedIpcMain.on('clear-history', () => {
      throw new Error('private details');
    }),
  );
  expect(() => bus.emit('clear-history', event)).not.toThrow();
  disposers.push(
    typedIpcMain.handle('get-history', () => {
      throw new Error('private details');
    }),
  );
  await expect(bus.handlers.get('get-history')!(event)).rejects.toThrow(
    /^IPC request failed$/,
  );
});

it('keeps listener and handler counts stable across repeated registration/disposal', () => {
  for (let i = 0; i < 25; i += 1) {
    const off = typedIpcMain.on('request-tab-meta', jest.fn());
    const onceOff = typedIpcMain.once('request-tab-meta', jest.fn());
    const unhandle = typedIpcMain.handle('get-history', () => []);
    off();
    onceOff();
    unhandle();
    unhandle();
  }
  const stale = typedIpcMain.handle('get-history', () => []);
  stale();
  const current = typedIpcMain.handle('get-history', () => []);
  disposers.push(current);
  stale();
  expect(bus.handlers.size).toBe(1);
});

it('validates tab existence, reorder bounds and window layout before mutation', () => {
  const { event, dispose } = renderer();
  disposers.push(dispose);
  (BrowserWindow.fromWebContents as jest.Mock).mockReturnValue({
    isDestroyed: () => false,
    getContentSize: () => [800, 600],
  });
  const manager = {
    getTabByUuid: (id: string) => (id === 'known' ? {} : undefined),
    getAllTabs: () => [{}, {}],
    focusTabUuid: jest.fn(),
    closeTab: jest.fn(),
    showTabContextMenu: jest.fn(),
    reorderTab: jest.fn(),
    updateBrowsingView: jest.fn(),
    updateDevtoolsView: jest.fn(),
  };
  disposers.push(registerTabManagerIpc(manager as unknown as TabManager));
  bus.emit('update-active-tab', event, { activeTabUuid: 'missing' });
  bus.emit('close-tab', event, { uuid: 'missing' });
  bus.emit('tab-context-menu', event, { uuid: 'missing' });
  for (const startIndex of [-1, 0.5, 2, Infinity])
    bus.emit('reorder-tab', event, { startIndex, finishIndex: 0 });
  bus.emit('reorder-tab', event, { startIndex: 0, finishIndex: 2 });
  for (const channel of ['browser-layout-change', 'devtools-layout-change']) {
    for (const position of [
      { x: -1, y: 0, width: 100, height: 100 },
      { x: 0, y: 0, width: NaN, height: 100 },
      { x: 700, y: 0, width: 200, height: 100 },
      { x: 0, y: 0, width: 100, height: -1 },
    ])
      bus.emit(channel, event, { position });
  }
  for (const key of [
    'focusTabUuid',
    'closeTab',
    'showTabContextMenu',
    'reorderTab',
    'updateBrowsingView',
    'updateDevtoolsView',
  ] as const)
    expect(manager[key]).not.toHaveBeenCalled();
  bus.emit('update-active-tab', event, { activeTabUuid: 'known' });
  bus.emit('close-tab', event, { uuid: 'known' });
  bus.emit('reorder-tab', event, { startIndex: 0, finishIndex: 1 });
  bus.emit('browser-layout-change', event, {
    position: { x: 0.5, y: 0.5, width: 400, height: 300 },
  });
  expect(manager.focusTabUuid).toHaveBeenCalledWith('known');
  expect(manager.closeTab).toHaveBeenCalledWith('known');
  expect(manager.reorderTab).toHaveBeenCalledWith(0, 1);
  expect(manager.updateBrowsingView).toHaveBeenCalledTimes(1);
});

it('sends typed messages to WebContents', () => {
  const send = jest.fn();
  typedWebContents({ send } as any).send('update-tab-meta', {
    neighbors: {},
    activeSpace: 0,
    spaceCount: 1,
    currentTabUuid: 'abc',
    tabs: [],
  });
  expect(send).toHaveBeenCalledWith('update-tab-meta', {
    neighbors: {},
    activeSpace: 0,
    spaceCount: 1,
    currentTabUuid: 'abc',
    tabs: [],
  });
});
