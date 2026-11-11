import '@testing-library/jest-dom';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { createContext } from 'react';
import {
  dropTargetForElements,
  monitorForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { TabManagerIpc } from 'src/ipc';

// Mock tab-meta module to avoid pulling in real context dependencies
const TabMetaContext = createContext<TabManagerIpc | null>(null);
const InternalTabMetaContext = createContext<any>(null);

jest.mock('@/lib/tab-meta', () => ({
  TabMetaContext,
  InternalTabMetaContext,
}));

// Must import Sidebar AFTER the mock is set up
import { Sidebar } from '../Sidebar';

// Mock IPC
const mockSendMessage = jest.fn();
beforeAll(() => {
  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    disconnect: jest.fn(),
  }));
});
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

jest.mock('@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box', () => ({
  DropIndicator: () => null,
}));

// Mock MediaWidget since it has complex deps
jest.mock('../MediaWidget', () => ({
  MediaWidget: () => <div data-testid="media-widget" />,
}));

// Mock system-meta hook
jest.mock('@/lib/system-meta', () => ({
  useSystemMeta: jest.fn(() => ({ platform: 'darwin' })),
}));

// Mock the CSS module
jest.mock('../Sidebar.module.css', () => ({}));

const mockTabMeta: TabManagerIpc = {
  neighbors: { 1: { tabs: [], selected: null } },
  activeSpace: 0,
  spaceCount: 2,
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
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(mockSendMessage).toHaveBeenCalledWith('open-settings');
  });

  it('shows labeled space dots below the sidebar actions', () => {
    renderSidebar();
    const settings = screen.getByRole('button', { name: 'Settings' });
    const spaces = screen.getByRole('navigation', { name: 'Spaces' });
    expect(
      settings.compareDocumentPosition(spaces) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Space 1', pressed: true }),
    ).toHaveTextContent(/^$/);
    fireEvent.click(
      screen.getByRole('button', { name: 'Space 2', pressed: false }),
    );
    expect(mockSendMessage).toHaveBeenCalledWith('switch-space', { space: 1 });
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

it.each<[number, number, boolean]>([
  [80, 0, false],
  [120, 1, false],
  [120, 1, true],
])(
  'holds a partial scroll at %i until release, then settles on space %i (reduced motion: %s)',
  (distance, space, reducedMotion) => {
    window.matchMedia = jest.fn().mockReturnValue({ matches: reducedMotion });
    mockSendMessage.mockClear();
    renderSidebar();
    const scroller = screen.getByRole('region', { name: 'Space tabs' });
    const incoming = screen.getByLabelText('Tabs in space 2');
    Object.defineProperty(incoming, 'offsetLeft', { value: 200 });
    scroller.scrollTo = jest.fn();
    scroller.scrollLeft = distance;
    fireEvent.scroll(scroller);
    expect(
      screen
        .getByRole('navigation', { name: 'Spaces' })
        .style.getPropertyValue('--swipe-space'),
    ).toBe(String(distance / 200));
    expect(scroller.scrollTo).not.toHaveBeenCalled();
    expect(mockSendMessage).not.toHaveBeenCalled();
    fireEvent(scroller, new Event('scrollend'));
    expect(scroller.scrollTo).toHaveBeenCalledWith({
      left: space * 200,
      behavior: reducedMotion ? 'instant' : 'smooth',
    });
    expect(mockSendMessage).not.toHaveBeenCalled();
    scroller.scrollLeft = space * 200;
    fireEvent(scroller, new Event('scrollend'));
    if (space)
      expect(mockSendMessage).toHaveBeenCalledWith('switch-space', { space });
    else expect(mockSendMessage).not.toHaveBeenCalled();
  },
);

it('advances repeatedly while held at the edge and stops when the pointer leaves it', async () => {
  jest.useFakeTimers();
  try {
    jest.mocked(monitorForElements).mockClear();
    const previews = Array.from({ length: 4 }, () => ({
      tabs: [],
      selected: null,
    }));
    jest
      .mocked(window.electron.ipcRenderer.invoke)
      .mockResolvedValueOnce(previews);
    renderSidebar({ ...mockTabMeta, spaceCount: 4 });
    const scroller = screen.getByRole('region', { name: 'Space tabs' });
    const incoming = screen.getByLabelText('Tabs in space 2');
    const bounds = new DOMRect(10, 20, 200, 450);
    jest.spyOn(scroller, 'getBoundingClientRect').mockReturnValue(bounds);
    jest
      .spyOn(incoming.parentElement!, 'getBoundingClientRect')
      .mockReturnValue(bounds);
    Object.defineProperty(incoming, 'offsetLeft', { value: 216 });
    scroller.scrollTo = jest.fn();
    window.matchMedia = jest.fn().mockReturnValue({ matches: false });
    const monitor = jest
      .mocked(monitorForElements)
      .mock.calls.map(([config]) => config)
      .find((config) => config.canMonitor);
    if (!monitor?.onDragStart || !monitor.onDrop)
      throw new Error('Missing edge drag monitor');
    await act(async () => {
      monitor.onDragStart!(
        {} as Parameters<NonNullable<typeof monitor.onDragStart>>[0],
      );
    });
    Object.defineProperty(
      screen.getByLabelText('Tabs in space 3'),
      'offsetLeft',
      { value: 432 },
    );
    Object.defineProperty(
      screen.getByLabelText('Tabs in space 4'),
      'offsetLeft',
      { value: 648 },
    );
    const move = (x: number) =>
      fireEvent(
        scroller,
        new MouseEvent('dragover', { bubbles: true, clientX: x, clientY: 80 }),
      );
    move(205);
    move(100);
    jest.advanceTimersByTime(500);
    expect(scroller.scrollTo).not.toHaveBeenCalled();
    move(205);
    jest.advanceTimersByTime(300);
    expect(scroller.scrollTo).toHaveBeenCalledWith({
      left: 216,
      behavior: 'smooth',
    });
    jest.advanceTimersByTime(850);
    expect(scroller.scrollTo).toHaveBeenLastCalledWith({
      left: 432,
      behavior: 'smooth',
    });
    move(100);
    jest.advanceTimersByTime(1700);
    expect(scroller.scrollTo).toHaveBeenCalledTimes(2);
    move(205);
    jest.advanceTimersByTime(2000);
    expect(scroller.scrollTo).toHaveBeenCalledTimes(3);
    expect(scroller.scrollTo).toHaveBeenLastCalledWith({
      left: 648,
      behavior: 'smooth',
    });
    scroller.scrollLeft = 648;
    act(() =>
      monitor.onDrop!({
        location: { current: { dropTargets: [] } },
      } as unknown as Parameters<NonNullable<typeof monitor.onDrop>>[0]),
    );
    expect(scroller.scrollLeft).toBe(0);
  } finally {
    jest.useRealTimers();
  }
});

it('moves the dragged tab to the space under the pointer', () => {
  mockSendMessage.mockClear();
  renderSidebar();
  const button = screen.getByRole('button', { name: 'Space 2' });
  const target = jest
    .mocked(dropTargetForElements)
    .mock.calls.map(([config]) => config)
    .find((config) => config.element === button);
  if (!target?.onDrop) throw new Error('Missing space drop target');
  const self = {
    element: button,
    data: {},
    dropEffect: 'move' as const,
    isActiveDueToStickiness: false,
  };
  const location = { input: new MouseEvent('drop'), dropTargets: [self] };
  act(() =>
    target.onDrop!({
      self,
      location: { initial: location, current: location, previous: location },
      source: {
        element: screen.getByText('Google'),
        dragHandle: null,
        data: { type: 'tab', uuid: 'tab-2' },
      },
    }),
  );
  expect(mockSendMessage).toHaveBeenCalledWith('move-tab-to-space', {
    uuid: 'tab-2',
    space: 1,
  });
});
