/**
 * IPC Integration Test Harness
 *
 * Simulates the full renderer → main → renderer message flow using an
 * EventEmitter-based IPC bus. This wires up real handler registration
 * (typedIpcMain) and a simulated renderer-side sender/listener to verify
 * that messages flow correctly across the process boundary.
 */

import { EventEmitter } from 'events';
import type {
  RendererToMainEvents,
  MainToRendererEvents,
  RendererToMainInvocations,
  TabManagerIpc,
  OverlayOptions,
  TabActionsIpc,
  MediaControlIpc,
} from '../../ipc';
import { settingsSchema } from '../../ipc/SettingsRegistry';

// ---------------------------------------------------------------------------
// IPC Bus — in-memory EventEmitter that replaces Electron's ipcMain/ipcRenderer
// ---------------------------------------------------------------------------

class IpcBus {
  private emitter = new EventEmitter();
  private handlers = new Map<string, (...args: any[]) => any>();

  /** Main-side: register a listener (ipcMain.on) */
  on(channel: string, listener: (event: any, ...args: any[]) => void) {
    this.emitter.on(channel, listener);
  }

  /** Main-side: register a request-reply handler (ipcMain.handle) */
  handle(channel: string, handler: (event: any, ...args: any[]) => any) {
    this.handlers.set(channel, handler);
  }

  /** Renderer-side: send a fire-and-forget message (ipcRenderer.send) */
  send(channel: string, ...args: any[]) {
    const event = { sender: { send: this.sendToRenderer.bind(this) } };
    this.emitter.emit(channel, event, ...args);
  }

  /** Renderer-side: invoke a request-reply (ipcRenderer.invoke) */
  async invoke(channel: string, ...args: any[]): Promise<any> {
    const handler = this.handlers.get(channel);
    if (!handler) throw new Error(`No handler registered for channel: ${channel}`);
    const event = { sender: { send: this.sendToRenderer.bind(this) } };
    return handler(event, ...args);
  }

  /** Main-side: send back to renderer (webContents.send) */
  private rendererListeners = new EventEmitter();

  sendToRenderer(channel: string, ...args: any[]) {
    this.rendererListeners.emit(channel, ...args);
  }

  /** Renderer-side: listen for main→renderer messages */
  onRenderer(channel: string, listener: (...args: any[]) => void) {
    this.rendererListeners.on(channel, listener);
    return () => this.rendererListeners.removeListener(channel, listener);
  }

  removeAllListeners() {
    this.emitter.removeAllListeners();
    this.rendererListeners.removeAllListeners();
    this.handlers.clear();
  }
}

// ---------------------------------------------------------------------------
// Wire up the bus as the mock for `src/main/ipc`
// ---------------------------------------------------------------------------

const bus = new IpcBus();

jest.mock('src/main/ipc', () => ({
  typedIpcMain: {
    on: (channel: string, listener: any) => bus.on(channel, listener),
    once: (channel: string, listener: any) => bus.on(channel, listener),
    handle: (channel: string, handler: any) => bus.handle(channel, handler),
    removeListener: jest.fn(),
  },
  typedWebContents: (wc: any) => ({
    send: (channel: string, ...args: any[]) => bus.sendToRenderer(channel, ...args),
  }),
}));

// ---------------------------------------------------------------------------
// Import handlers AFTER the mock is set up
// ---------------------------------------------------------------------------

import { registerTabManagerIpc } from '../../main/TabManagerIpcHandlers';
import type { TabManager } from '../../main/TabManager';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockTabManager(): jest.Mocked<
  Pick<
    TabManager,
    | 'updateRenderProcess'
    | 'updateBrowsingView'
    | 'updateDevtoolsView'
    | 'loadUrlInCurrentTab'
    | 'openNewTab'
    | 'openSettings'
    | 'focusTabUuid'
    | 'closeTab'
    | 'reorderTab'
    | 'performTabAction'
    | 'showTabContextMenu'
    | 'handleMediaControl'
  >
> {
  return {
    updateRenderProcess: jest.fn(),
    updateBrowsingView: jest.fn(),
    updateDevtoolsView: jest.fn(),
    loadUrlInCurrentTab: jest.fn(),
    openNewTab: jest.fn(),
    openSettings: jest.fn(),
    focusTabUuid: jest.fn(),
    closeTab: jest.fn(),
    reorderTab: jest.fn(),
    performTabAction: jest.fn(),
    showTabContextMenu: jest.fn(),
    handleMediaControl: jest.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('IPC Integration — renderer → main → renderer', () => {
  let tm: ReturnType<typeof createMockTabManager>;

  beforeEach(() => {
    bus.removeAllListeners();
    jest.clearAllMocks();
    tm = createMockTabManager();
    registerTabManagerIpc(tm as unknown as TabManager);
  });

  // -------------------------------------------------------------------------
  // Fire-and-forget channels (renderer.send → ipcMain.on → handler)
  // -------------------------------------------------------------------------

  describe('fire-and-forget channels', () => {
    it('request-tab-meta: renderer send triggers updateRenderProcess', () => {
      bus.send('request-tab-meta');
      expect(tm.updateRenderProcess).toHaveBeenCalledTimes(1);
    });

    it('update-tab-url: renderer sends URL, main loads it', () => {
      bus.send('update-tab-url', { newUrl: 'https://example.com' });
      expect(tm.loadUrlInCurrentTab).toHaveBeenCalledWith('https://example.com');
    });

    it('open-new-tab: renderer sends URL, main opens tab', () => {
      bus.send('open-new-tab', { newUrl: 'https://new-tab.com' });
      expect(tm.openNewTab).toHaveBeenCalledWith('https://new-tab.com');
    });

    it('close-tab: renderer sends uuid, main closes tab', () => {
      bus.send('close-tab', { uuid: 'tab-1' });
      expect(tm.closeTab).toHaveBeenCalledWith('tab-1');
    });

    it('update-active-tab: renderer sends uuid, main focuses tab', () => {
      bus.send('update-active-tab', { activeTabUuid: 'tab-2' });
      expect(tm.focusTabUuid).toHaveBeenCalledWith('tab-2');
    });

    it('reorder-tab: renderer sends indices, main reorders', () => {
      bus.send('reorder-tab', { startIndex: 0, finishIndex: 3 });
      expect(tm.reorderTab).toHaveBeenCalledWith(0, 3);
    });

    it('tab-actions: renderer sends action, main performs it', () => {
      const actions: TabActionsIpc = { action: 'refresh' };
      bus.send('tab-actions', actions);
      expect(tm.performTabAction).toHaveBeenCalledWith('refresh');
    });

    it('tab-context-menu: renderer sends uuid, main shows menu', () => {
      bus.send('tab-context-menu', { uuid: 'tab-3' });
      expect(tm.showTabContextMenu).toHaveBeenCalledWith('tab-3');
    });

    it('browser-layout-change: renderer sends bounds, main updates view', () => {
      const layout: OverlayOptions = {
        position: { x: 10, y: 20, width: 800, height: 600 },
      };
      bus.send('browser-layout-change', layout);
      expect(tm.updateBrowsingView).toHaveBeenCalledWith({
        x: 10, y: 20, width: 800, height: 600,
      });
    });

    it('devtools-layout-change: renderer sends bounds, main updates devtools', () => {
      const layout: OverlayOptions = {
        position: { x: 0, y: 0, width: 400, height: 300 },
      };
      bus.send('devtools-layout-change', layout);
      expect(tm.updateDevtoolsView).toHaveBeenCalledWith({
        x: 0, y: 0, width: 400, height: 300,
      });
    });

    it('app-resize: renderer sends size, main updates both views', () => {
      bus.send('app-resize', { width: 1024, height: 768 });
      expect(tm.updateBrowsingView).toHaveBeenCalledTimes(1);
      expect(tm.updateDevtoolsView).toHaveBeenCalledTimes(1);
    });

    it('open-settings: renderer triggers settings open', () => {
      bus.send('open-settings');
      expect(tm.openSettings).toHaveBeenCalledTimes(1);
    });

    it('media-control: renderer sends control, main handles it', () => {
      const data: MediaControlIpc = { mediaId: 'media-1', action: 'play' };
      bus.send('media-control', data);
      expect(tm.handleMediaControl).toHaveBeenCalledWith(data);
    });
  });

  // -------------------------------------------------------------------------
  // Main → Renderer messages via bus
  // -------------------------------------------------------------------------

  describe('main → renderer messages', () => {
    it('update-tab-meta: main sends tab state, renderer receives it', (done) => {
      const tabMeta: TabManagerIpc = {
        currentTabUuid: 'tab-1',
        tabs: [
          {
            uuid: 'tab-1',
            url: 'https://example.com',
            title: 'Example',
            isDevMode: false,
            isPlayingAudio: false,
            isMuted: false,
            isLoading: false,
            isInternal: false,
          },
        ],
      };

      bus.onRenderer('update-tab-meta', (data: TabManagerIpc) => {
        expect(data).toEqual(tabMeta);
        done();
      });

      bus.sendToRenderer('update-tab-meta', tabMeta);
    });

    it('feature-flags-sync: main sends flags, renderer receives them', (done) => {
      const flags = { flags: { darkMode: true, betaFeatures: 'enabled' } };

      bus.onRenderer('feature-flags-sync', (data) => {
        expect(data).toEqual(flags);
        done();
      });

      bus.sendToRenderer('feature-flags-sync', flags);
    });

    it('media-state: main sends media state, renderer receives it', (done) => {
      const mediaState = {
        action: 'add' as const,
        state: {
          id: 'media-1',
          type: 'audio',
          title: 'Song',
          playing: true,
        },
      };

      bus.onRenderer('media-state', (data) => {
        expect(data).toEqual(mediaState);
        done();
      });

      bus.sendToRenderer('media-state', mediaState);
    });

    it('request-browser-layout: main requests layout, renderer receives signal', (done) => {
      bus.onRenderer('request-browser-layout', () => {
        done();
      });

      bus.sendToRenderer('request-browser-layout');
    });
  });

  // -------------------------------------------------------------------------
  // Round-trip: renderer sends → main processes → main responds to renderer
  // -------------------------------------------------------------------------

  describe('round-trip message flow', () => {
    it('renderer sends request-tab-meta → main calls updateRenderProcess → main sends update-tab-meta back to renderer', (done) => {
      const tabMeta: TabManagerIpc = {
        currentTabUuid: 'tab-1',
        tabs: [
          {
            uuid: 'tab-1',
            url: 'https://round-trip.com',
            title: 'Round Trip',
            isDevMode: false,
            isPlayingAudio: false,
            isMuted: false,
            isLoading: false,
            isInternal: false,
          },
        ],
      };

      // When updateRenderProcess is called, simulate main sending tab meta back
      tm.updateRenderProcess.mockImplementation(() => {
        bus.sendToRenderer('update-tab-meta', tabMeta);
      });

      // Renderer listens for the response
      bus.onRenderer('update-tab-meta', (data: TabManagerIpc) => {
        expect(data).toEqual(tabMeta);
        expect(tm.updateRenderProcess).toHaveBeenCalledTimes(1);
        done();
      });

      // Renderer sends the request
      bus.send('request-tab-meta');
    });

    it('renderer sends browser-layout-change → main updates view → main requests layout confirmation', (done) => {
      const layout: OverlayOptions = {
        position: { x: 50, y: 50, width: 1200, height: 900 },
      };

      // When updateBrowsingView is called, simulate main requesting layout confirmation
      tm.updateBrowsingView.mockImplementation(async () => {
        bus.sendToRenderer('request-browser-layout');
      });

      bus.onRenderer('request-browser-layout', () => {
        expect(tm.updateBrowsingView).toHaveBeenCalledWith({
          x: 50, y: 50, width: 1200, height: 900,
        });
        done();
      });

      bus.send('browser-layout-change', layout);
    });

    it('multiple rapid tab switches flow correctly', () => {
      const uuids = ['tab-a', 'tab-b', 'tab-c', 'tab-a'];

      for (const uuid of uuids) {
        bus.send('update-active-tab', { activeTabUuid: uuid });
      }

      expect(tm.focusTabUuid).toHaveBeenCalledTimes(4);
      expect(tm.focusTabUuid).toHaveBeenNthCalledWith(1, 'tab-a');
      expect(tm.focusTabUuid).toHaveBeenNthCalledWith(2, 'tab-b');
      expect(tm.focusTabUuid).toHaveBeenNthCalledWith(3, 'tab-c');
      expect(tm.focusTabUuid).toHaveBeenNthCalledWith(4, 'tab-a');
    });

    it('open-new-tab followed by close-tab in sequence', () => {
      bus.send('open-new-tab', { newUrl: 'https://ephemeral.com' });
      expect(tm.openNewTab).toHaveBeenCalledWith('https://ephemeral.com');

      bus.send('close-tab', { uuid: 'ephemeral-tab' });
      expect(tm.closeTab).toHaveBeenCalledWith('ephemeral-tab');
    });
  });

  // -------------------------------------------------------------------------
  // Request-reply channels (renderer.invoke → ipcMain.handle → response)
  // -------------------------------------------------------------------------

  describe('request-reply (invoke/handle) channels', () => {
    it('custom handler registered via bus.handle can be invoked', async () => {
      const mockHistory = [
        { id: 1, tab_uuid: 'tab-1', url: 'https://test.com', title: 'Test', metaDescription: '', metaKeywords: '', timestamp: '2026-01-01' },
      ];

      bus.handle('get-history', () => mockHistory);

      const result = await bus.invoke('get-history');
      expect(result).toEqual(mockHistory);
    });

    it('get-settings handler returns parsed settings', async () => {
      const defaults = settingsSchema.parse({});
      bus.handle('get-settings', () => defaults);

      const result = await bus.invoke('get-settings');
      expect(result).toEqual(defaults);
      expect(result).toHaveProperty('analytics');
      expect(result).toHaveProperty('searchEngines');
    });

    it('invoke on unregistered channel throws', async () => {
      await expect(bus.invoke('nonexistent-channel')).rejects.toThrow(
        'No handler registered for channel: nonexistent-channel',
      );
    });
  });
});
