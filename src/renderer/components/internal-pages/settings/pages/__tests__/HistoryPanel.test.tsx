import '@testing-library/jest-dom';
import { render, screen, act } from '@testing-library/react';
import { HistoryItem } from '../../../../../../ipc';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Trash2: (props: any) => <span data-testid="trash-icon" {...props} />,
  ExternalLink: (props: any) => <span data-testid="external-link-icon" {...props} />,
  Globe: (props: any) => <span data-testid="globe-icon" {...props} />,
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

// Track IPC listener callbacks so we can invoke them in tests
let ipcListeners: Record<string, (...args: any[]) => void> = {};
const mockSendMessage = jest.fn();
const mockOn = jest.fn((channel: string, callback: (...args: any[]) => void) => {
  ipcListeners[channel] = callback;
  return jest.fn(); // cleanup function
});

Object.defineProperty(window, 'electron', {
  value: {
    ipcRenderer: {
      sendMessage: mockSendMessage,
      on: mockOn,
    },
  },
  writable: true,
});

// Import after mocks are set up
import { HistoryPanel } from '../HistoryPanel';

const makeHistoryItem = (overrides: Partial<HistoryItem> = {}): HistoryItem => ({
  id: 1,
  tab_uuid: 'tab-1',
  url: 'https://example.com',
  title: 'Example Page',
  metaDescription: 'An example page',
  metaKeywords: 'example, test',
  timestamp: '2025-06-15T12:00:00Z',
  ...overrides,
});

describe('HistoryPanel', () => {
  beforeEach(() => {
    ipcListeners = {};
    mockSendMessage.mockClear();
    mockOn.mockClear();
  });

  it('renders "No history found" when there are no history items', () => {
    render(<HistoryPanel />);
    expect(screen.getByText('No history found')).toBeInTheDocument();
  });

  it('sends get-history IPC message on mount', () => {
    render(<HistoryPanel />);
    expect(mockSendMessage).toHaveBeenCalledWith('get-history');
  });

  it('renders history items when data is received via IPC', () => {
    render(<HistoryPanel />);

    const items: HistoryItem[] = [
      makeHistoryItem({ id: 1, title: 'First Page', url: 'https://first.com' }),
      makeHistoryItem({ id: 2, title: 'Second Page', url: 'https://second.com' }),
    ];

    act(() => {
      ipcListeners['history-data'](items);
    });

    expect(screen.getByText('First Page')).toBeInTheDocument();
    expect(screen.getByText('https://first.com')).toBeInTheDocument();
    expect(screen.getByText('Second Page')).toBeInTheDocument();
    expect(screen.getByText('https://second.com')).toBeInTheDocument();
    expect(screen.queryByText('No history found')).not.toBeInTheDocument();
  });

  it('disables Clear History button when there is no history', () => {
    render(<HistoryPanel />);
    const clearButton = screen.getByText('Clear History').closest('button');
    expect(clearButton).toBeDisabled();
  });

  it('shows "Untitled" for history items without a title', () => {
    render(<HistoryPanel />);

    const items: HistoryItem[] = [
      makeHistoryItem({ id: 1, title: '', url: 'https://no-title.com' }),
    ];

    act(() => {
      ipcListeners['history-data'](items);
    });

    expect(screen.getByText('Untitled')).toBeInTheDocument();
    expect(screen.getByText('https://no-title.com')).toBeInTheDocument();
  });
});
