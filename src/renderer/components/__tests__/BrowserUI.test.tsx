import '@testing-library/jest-dom';
import { render, screen, act } from '@testing-library/react';
import { createContext } from 'react';
import { TabManagerIpc } from 'src/ipc';

// Mock tab-meta context
const TabMetaContext = createContext<TabManagerIpc | null>(null);
const InternalTabMetaContext = createContext<any>(null);

jest.mock('@/lib/tab-meta', () => ({
  TabMetaContext,
  InternalTabMetaContext,
}));

// Mock ShaderBackground (uses WebGL)
jest.mock('../ShaderBackground', () => ({
  ShaderBackground: () => <div data-testid="shader-background" />,
}));

// Mock ErrorBoundary to passthrough children
jest.mock('../ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  ComponentErrorBoundary: ({
    children,
  }: {
    children: React.ReactNode;
    name: string;
  }) => <>{children}</>,
}));

// Mock Sidebar (tested separately)
jest.mock('../Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar" />,
}));

// Mock InternalPageRouter
jest.mock('../internal-pages/InternalPageRouter', () => ({
  InternalPageRouter: ({ path }: { path: string }) => (
    <div data-testid="internal-page-router">{path}</div>
  ),
}));

// Mock CSS module
jest.mock('../BrowserUI.module.css', () => ({
  draggableFrame: 'draggableFrame',
}));

// Mock drag and drop (used by Sidebar which we mock, but just in case)
jest.mock('@atlaskit/pragmatic-drag-and-drop/element/adapter', () => ({
  monitorForElements: jest.fn(() => jest.fn()),
  draggable: jest.fn(() => jest.fn()),
  dropTargetForElements: jest.fn(() => jest.fn()),
}));

// Mock IPC
const mockSendMessage = jest.fn();
let ipcListeners: Record<string, (...args: any[]) => void> = {};

Object.defineProperty(window, 'electron', {
  value: {
    ipcRenderer: {
      sendMessage: mockSendMessage,
      invoke: jest.fn().mockResolvedValue(null),
      on: jest.fn((channel: string, callback: (...args: any[]) => void) => {
        ipcListeners[channel] = callback;
        return jest.fn();
      }),
    },
  },
  writable: true,
});

// Mock ResizeObserver
const mockObserve = jest.fn();
const mockDisconnect = jest.fn();
window.ResizeObserver = jest.fn(() => ({
  observe: mockObserve,
  unobserve: jest.fn(),
  disconnect: mockDisconnect,
})) as any;

// Import after mocks
import { BrowserUI } from '../BrowserUI';

const mockTabMeta: TabManagerIpc = {
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

const renderBrowserUI = (tabMeta: TabManagerIpc | null = mockTabMeta) => {
  return render(
    <TabMetaContext.Provider value={tabMeta}>
      <InternalTabMetaContext.Provider
        value={{ tabs: {}, setTabMeta: jest.fn() }}
      >
        <BrowserUI />
      </InternalTabMetaContext.Provider>
    </TabMetaContext.Provider>,
  );
};

describe('BrowserUI', () => {
  beforeEach(() => {
    mockSendMessage.mockClear();
    mockObserve.mockClear();
    mockDisconnect.mockClear();
    ipcListeners = {};
    (window.electron.ipcRenderer.on as jest.Mock).mockClear();
  });

  it('renders the sidebar', () => {
    renderBrowserUI();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  it('renders the shader background', () => {
    renderBrowserUI();
    expect(screen.getByTestId('shader-background')).toBeInTheDocument();
  });

  it('sends browser-layout-change IPC on mount', () => {
    renderBrowserUI();
    expect(mockSendMessage).toHaveBeenCalledWith(
      'browser-layout-change',
      expect.objectContaining({
        position: expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
          width: expect.any(Number),
          height: expect.any(Number),
        }),
      }),
    );
  });

  it('registers IPC listeners for layout requests', () => {
    renderBrowserUI();
    const onCalls = (window.electron.ipcRenderer.on as jest.Mock).mock.calls;
    const channels = onCalls.map(([ch]: [string]) => ch);
    expect(channels).toContain('request-browser-layout');
    expect(channels).toContain('request-devtools-layout');
  });

  it('sets up ResizeObserver on the browser panel', () => {
    renderBrowserUI();
    expect(mockObserve).toHaveBeenCalled();
  });

  it('does not render devtools panel when isDevMode is false', () => {
    renderBrowserUI();
    // Only one resizable panel group (the horizontal sidebar/browser split)
    const panels = document.querySelectorAll(
      '[data-slot="resizable-panel-group"]',
    );
    expect(panels.length).toBe(1);
  });

  it('renders devtools panel when isDevMode is true', () => {
    const devTabMeta: TabManagerIpc = {
      currentTabUuid: 'tab-1',
      tabs: [
        {
          uuid: 'tab-1',
          url: 'https://example.com',
          title: 'Example',
          isDevMode: true,
          isPlayingAudio: false,
          isMuted: false,
          isLoading: false,
          isInternal: false,
        },
      ],
    };
    renderBrowserUI(devTabMeta);
    // Should have two resizable panel groups (outer horizontal + inner vertical for devtools)
    const panels = document.querySelectorAll(
      '[data-slot="resizable-panel-group"]',
    );
    expect(panels.length).toBe(2);
  });

  it('does not render InternalPageRouter for external URLs', () => {
    renderBrowserUI();
    expect(
      screen.queryByTestId('internal-page-router'),
    ).not.toBeInTheDocument();
  });

  it('renders InternalPageRouter for internal pages', () => {
    const internalTabMeta: TabManagerIpc = {
      currentTabUuid: 'tab-1',
      tabs: [
        {
          uuid: 'tab-1',
          url: 'palladium://settings',
          title: 'Settings',
          isDevMode: false,
          isPlayingAudio: false,
          isMuted: false,
          isLoading: false,
          isInternal: true,
        },
      ],
    };
    renderBrowserUI(internalTabMeta);
    expect(screen.getByTestId('internal-page-router')).toBeInTheDocument();
    expect(screen.getByTestId('internal-page-router')).toHaveTextContent(
      'palladium://settings',
    );
  });

  it('responds to request-browser-layout IPC by sending layout', () => {
    renderBrowserUI();
    mockSendMessage.mockClear();

    act(() => {
      ipcListeners['request-browser-layout']?.();
    });

    expect(mockSendMessage).toHaveBeenCalledWith(
      'browser-layout-change',
      expect.any(Object),
    );
  });

  it('cleans up listeners on unmount', () => {
    const { unmount } = renderBrowserUI();
    unmount();
    expect(mockDisconnect).toHaveBeenCalled();
  });
});
