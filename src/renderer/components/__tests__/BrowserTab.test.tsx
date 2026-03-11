import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserTab } from '../BrowserTab';

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

// Mock pragmatic-drag-and-drop (heavy dependency)
jest.mock('@atlaskit/pragmatic-drag-and-drop/element/adapter', () => ({
  draggable: jest.fn(() => jest.fn()),
  dropTargetForElements: jest.fn(() => jest.fn()),
}));

jest.mock('@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge', () => ({
  attachClosestEdge: jest.fn(),
  extractClosestEdge: jest.fn(),
}));

jest.mock('@atlaskit/pragmatic-drag-and-drop/combine', () => ({
  combine: jest.fn((...fns: Function[]) => jest.fn()),
}));

jest.mock(
  '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box',
  () => ({
    DropIndicator: () => null,
  }),
);

const defaultProps = {
  isActive: false,
  url: 'https://example.com',
  uuid: 'test-uuid-1',
  title: 'Example Page',
  index: 0,
  isDevMode: false,
  isPlayingAudio: false,
  isMuted: false,
  isLoading: false,
};

describe('BrowserTab', () => {
  beforeEach(() => {
    mockSendMessage.mockClear();
  });

  it('renders the tab title', () => {
    render(<BrowserTab {...defaultProps} />);
    expect(screen.getByText('Example Page')).toBeInTheDocument();
  });

  it('shows "Palladium" when title is empty and URL is palladium://', () => {
    render(
      <BrowserTab
        {...defaultProps}
        title="   "
        url="palladium://settings"
      />,
    );
    expect(screen.getByText('Palladium')).toBeInTheDocument();
  });

  it('shows subtitle when provided', () => {
    render(<BrowserTab {...defaultProps} subtitle="Subtitle text" />);
    expect(screen.getByText('Subtitle text')).toBeInTheDocument();
  });

  it('renders favicon image when provided and not loading', () => {
    render(
      <BrowserTab
        {...defaultProps}
        favicon="data:image/png;base64,abc"
      />,
    );
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'data:image/png;base64,abc');
  });

  it('calls onClick when tab is clicked', () => {
    const onClick = jest.fn();
    render(<BrowserTab {...defaultProps} onClick={onClick} />);
    fireEvent.click(screen.getByText('Example Page'));
    expect(onClick).toHaveBeenCalled();
  });

  it('sends close-tab IPC when close button is clicked', () => {
    render(<BrowserTab {...defaultProps} isActive={true} />);
    // The close button is an X icon button
    const buttons = screen.getAllByRole('button');
    // Click the close button (last button in the component)
    fireEvent.click(buttons[buttons.length - 1]);
    expect(mockSendMessage).toHaveBeenCalledWith('close-tab', {
      uuid: 'test-uuid-1',
    });
  });

  it('applies active styles when isActive is true', () => {
    const { container } = render(
      <BrowserTab {...defaultProps} isActive={true} />,
    );
    const tabEl = container.querySelector('.bg-foreground\\/10');
    expect(tabEl).toBeInTheDocument();
  });

  it('applies dev mode border when isDevMode is true', () => {
    const { container } = render(
      <BrowserTab {...defaultProps} isDevMode={true} />,
    );
    const tabEl = container.querySelector('[class*="border-amber"]');
    expect(tabEl).toBeInTheDocument();
  });
});
