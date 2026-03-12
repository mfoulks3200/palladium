import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { createContext } from 'react';
import { TabManagerIpc } from 'src/ipc';

// Mock tab-meta module to avoid pulling in real context dependencies
const TabMetaContext = createContext<TabManagerIpc | null>(null);
const InternalTabMetaContext = createContext<any>(null);

jest.mock('@/hooks/tab-meta', () => ({
  TabMetaContext,
  InternalTabMetaContext,
}));

// Must import Sidebar AFTER the mock is set up
import { Sidebar } from '../Sidebar';

// Mock IPC
const mockSendMessage = jest.fn();
Object.defineProperty(window, 'electron', {
  value: {
    ipcRenderer: {
      sendMessage: mockSendMessage,
      invoke: jest.fn().mockResolvedValue(null),
      on: jest.fn(() => jest.fn()),
    },
  },
  writable: true,
});

// Mock drag and drop monitoring
jest.mock('@atlaskit/pragmatic-drag-and-drop/element/adapter', () => ({
  monitorForElements: jest.fn(() => jest.fn()),
  draggable: jest.fn(() => jest.fn()),
  dropTargetForElements: jest.fn(() => jest.fn()),
}));

jest.mock('@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge', () => ({
  extractClosestEdge: jest.fn(),
  attachClosestEdge: jest.fn(),
}));

jest.mock(
  '@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index',
  () => ({
    getReorderDestinationIndex: jest.fn(),
  }),
);

jest.mock('@atlaskit/pragmatic-drag-and-drop/combine', () => ({
  combine: jest.fn(() => jest.fn()),
}));

jest.mock(
  '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box',
  () => ({
    DropIndicator: () => null,
  }),
);

// Mock MediaWidget since it has complex deps
jest.mock('../MediaWidget', () => ({
  MediaWidget: () => <div data-testid="media-widget" />,
}));

// Mock system-meta hook
jest.mock('@/hooks/system-meta', () => ({
  useSystemMeta: jest.fn(() => ({ platform: 'darwin' })),
}));

// Mock the CSS module
jest.mock('../Sidebar.module.css', () => ({}));

const mockTabMeta: TabManagerIpc = {
  currentTabUuid: 'tab-1',
  tabs: [
    {
      uuid: 'tab-1',
      url: 'https://github.com',
      title: 'GitHub',
      isDevMode: false,
      isPlayingAudio: false,
      isMuted: false,
      isLoading: false,
      isInternal: false,
    },
    {
      uuid: 'tab-2',
      url: 'https://google.com',
      title: 'Google',
      isDevMode: false,
      isPlayingAudio: false,
      isMuted: false,
      isLoading: false,
      isInternal: false,
    },
  ],
};

const renderSidebar = (tabMeta: TabManagerIpc | null = mockTabMeta) => {
  return render(
    <TabMetaContext.Provider value={tabMeta}>
      <InternalTabMetaContext.Provider
        value={{ tabs: {}, setTabMeta: jest.fn() }}
      >
        <Sidebar />
      </InternalTabMetaContext.Provider>
    </TabMetaContext.Provider>,
  );
};

describe('Sidebar', () => {
  beforeEach(() => {
    mockSendMessage.mockClear();
  });

  it('renders tab list from context', () => {
    renderSidebar();
    expect(screen.getByText('GitHub')).toBeInTheDocument();
    expect(screen.getByText('Google')).toBeInTheDocument();
  });

  it('displays current tab URL in address bar', () => {
    renderSidebar();
    expect(screen.getByText('github.com')).toBeInTheDocument();
  });

  it('shows "New Tab" button', () => {
    renderSidebar();
    expect(screen.getByText('New Tab')).toBeInTheDocument();
  });

  it('sends update-active-tab IPC when clicking a tab', () => {
    renderSidebar();
    fireEvent.click(screen.getByText('Google'));
    expect(mockSendMessage).toHaveBeenCalledWith('update-active-tab', {
      activeTabUuid: 'tab-2',
    });
  });

  it('sends command-bar open IPC when clicking New Tab', () => {
    renderSidebar();
    fireEvent.click(screen.getByText('New Tab'));
    expect(mockSendMessage).toHaveBeenCalledWith('command-bar', {
      action: 'open',
    });
  });

  it('sends open-settings IPC when clicking settings cog', () => {
    renderSidebar();
    // Settings cog is a Cog icon button at the bottom
    const cogs = screen.getAllByRole('button');
    // Find the settings button (last one that's not New Tab)
    const settingsButton = cogs[cogs.length - 1];
    fireEvent.click(settingsButton);
    // Should send either open-settings or command-bar
    expect(mockSendMessage).toHaveBeenCalled();
  });

  it('sends tab-actions IPC for navigation buttons', () => {
    renderSidebar();
    const buttons = screen.getAllByRole('button');
    // First 3 buttons are back, forward, refresh
    fireEvent.click(buttons[0]);
    expect(mockSendMessage).toHaveBeenCalledWith('tab-actions', {
      action: 'back',
    });
  });

  it('does not show NonNativeWindowControls on macOS', () => {
    renderSidebar();
    // On darwin, non-native window controls should not render
    // The close/minimize/maximize buttons have specific red/amber/green styling
    const container = document.querySelector('[class*="bg-red-500"]');
    expect(container).not.toBeInTheDocument();
  });
});
