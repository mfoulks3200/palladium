// ---------------------------------------------------------------------------
// Mocks — must be declared before imports
// ---------------------------------------------------------------------------

const mockIpcOn = jest.fn();

jest.mock('src/main/ipc', () => ({
  typedIpcMain: { on: mockIpcOn, handle: jest.fn() },
  typedWebContents: () => ({ send: jest.fn() }),
}));

import { registerTabManagerIpc } from '../TabManagerIpcHandlers';
import type { TabManager } from '../TabManager';
import type { OverlayOptions, TabActionsIpc, MediaControlIpc } from '../../ipc';

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

/** Find the handler registered for a given IPC channel. */
function getHandler(channel: string): ((...args: any[]) => void) | undefined {
  const call = mockIpcOn.mock.calls.find((c: any[]) => c[0] === channel);
  return call?.[1];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('registerTabManagerIpc', () => {
  let tm: ReturnType<typeof createMockTabManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    tm = createMockTabManager();
    registerTabManagerIpc(tm as unknown as TabManager);
  });

  it('registers all expected IPC channels', () => {
    const channels = mockIpcOn.mock.calls.map((c: any[]) => c[0]);
    expect(channels).toEqual(
      expect.arrayContaining([
        'request-tab-meta',
        'app-resize',
        'update-tab-url',
        'open-new-tab',
        'open-settings',
        'browser-layout-change',
        'devtools-layout-change',
        'update-active-tab',
        'close-tab',
        'reorder-tab',
        'tab-actions',
        'tab-context-menu',
        'media-control',
      ]),
    );
  });

  it('request-tab-meta calls updateRenderProcess', () => {
    getHandler('request-tab-meta')!({} as any);
    expect(tm.updateRenderProcess).toHaveBeenCalledTimes(1);
  });

  it('app-resize calls updateBrowsingView and updateDevtoolsView', () => {
    getHandler('app-resize')!({} as any);
    expect(tm.updateBrowsingView).toHaveBeenCalledTimes(1);
    expect(tm.updateDevtoolsView).toHaveBeenCalledTimes(1);
  });

  it('update-tab-url calls loadUrlInCurrentTab with the new URL', () => {
    getHandler('update-tab-url')!({} as any, { newUrl: 'https://test.com' });
    expect(tm.loadUrlInCurrentTab).toHaveBeenCalledWith('https://test.com');
  });

  it('open-new-tab calls openNewTab with the URL', () => {
    getHandler('open-new-tab')!({} as any, { newUrl: 'https://new.com' });
    expect(tm.openNewTab).toHaveBeenCalledWith('https://new.com');
  });

  it('open-settings calls openSettings', () => {
    getHandler('open-settings')!({} as any);
    expect(tm.openSettings).toHaveBeenCalledTimes(1);
  });

  it('browser-layout-change calls updateBrowsingView with bounds', () => {
    const size: OverlayOptions = {
      position: { x: 10, y: 20, width: 800, height: 600 },
    };
    getHandler('browser-layout-change')!({} as any, size);
    expect(tm.updateBrowsingView).toHaveBeenCalledWith({
      x: 10,
      y: 20,
      width: 800,
      height: 600,
    });
  });

  it('devtools-layout-change calls updateDevtoolsView with bounds', () => {
    const size: OverlayOptions = {
      position: { x: 0, y: 0, width: 400, height: 300 },
    };
    getHandler('devtools-layout-change')!({} as any, size);
    expect(tm.updateDevtoolsView).toHaveBeenCalledWith({
      x: 0,
      y: 0,
      width: 400,
      height: 300,
    });
  });

  it('update-active-tab calls focusTabUuid', () => {
    getHandler('update-active-tab')!({} as any, { activeTabUuid: 'uuid-123' });
    expect(tm.focusTabUuid).toHaveBeenCalledWith('uuid-123');
  });

  it('close-tab calls closeTab with the uuid', () => {
    getHandler('close-tab')!({} as any, { uuid: 'uuid-456' });
    expect(tm.closeTab).toHaveBeenCalledWith('uuid-456');
  });

  it('reorder-tab calls reorderTab with start and finish indices', () => {
    getHandler('reorder-tab')!({} as any, { startIndex: 0, finishIndex: 2 });
    expect(tm.reorderTab).toHaveBeenCalledWith(0, 2);
  });

  it('tab-actions calls performTabAction with the action', () => {
    const actions: TabActionsIpc = { action: 'refresh' };
    getHandler('tab-actions')!({} as any, actions);
    expect(tm.performTabAction).toHaveBeenCalledWith('refresh');
  });

  it('tab-context-menu calls showTabContextMenu with the uuid', () => {
    getHandler('tab-context-menu')!({} as any, { uuid: 'uuid-789' });
    expect(tm.showTabContextMenu).toHaveBeenCalledWith('uuid-789');
  });

  it('media-control calls handleMediaControl with the data', () => {
    const data: MediaControlIpc = { mediaId: 'media-1', action: 'play' };
    getHandler('media-control')!({} as any, data);
    expect(tm.handleMediaControl).toHaveBeenCalledWith(data);
  });
});
