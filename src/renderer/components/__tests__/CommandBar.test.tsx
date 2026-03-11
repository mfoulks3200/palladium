import '@testing-library/jest-dom';
import { render, screen, act } from '@testing-library/react';

// Mock the command UI primitives to avoid TS compile error with interpolateSize CSS prop
jest.mock('@/components/ui/command', () => {
  const React = require('react');
  return {
    Command: ({ children, className }: any) => (
      <div data-testid="command-root" className={className}>{children}</div>
    ),
    CommandInput: React.forwardRef(({ placeholder, onKeyDown, onInput, value }: any, ref: any) => (
      <input
        ref={ref}
        placeholder={placeholder}
        onKeyDown={onKeyDown}
        onInput={onInput}
        value={value}
        data-testid="command-input"
      />
    )),
    CommandList: ({ children }: any) => <div data-testid="command-list">{children}</div>,
    CommandEmpty: ({ children }: any) => <div>{children}</div>,
    CommandGroup: ({ children }: any) => <div data-testid="command-group">{children}</div>,
    CommandItem: ({ children }: any) => <div data-testid="command-item">{children}</div>,
    CommandSeparator: () => <hr />,
    CommandShortcut: ({ children }: any) => <span>{children}</span>,
  };
});

// Mock CommandBar CSS import
jest.mock('../CommandBar.css', () => ({}));

import { CommandBar } from '../CommandBar';

// Mock IPC
const mockSendMessage = jest.fn();
const mockInvoke = jest.fn();
let ipcListeners: Record<string, (data: any) => void> = {};

Object.defineProperty(window, 'electron', {
  value: {
    ipcRenderer: {
      sendMessage: mockSendMessage,
      invoke: mockInvoke,
      on: jest.fn((channel: string, callback: (data: any) => void) => {
        ipcListeners[channel] = callback;
        return jest.fn();
      }),
    },
  },
  writable: true,
});

// Mock lucide icons used via LucideIcons lookup
jest.mock('@/lib/icons', () => ({
  LucideIcons: new Proxy(
    {},
    {
      get: (_target, prop) => {
        // Return a simple component for any icon name
        const MockIcon = () => <span data-testid={`icon-${String(prop)}`} />;
        MockIcon.displayName = String(prop);
        return MockIcon;
      },
      has: () => true,
    },
  ),
}));

describe('CommandBar', () => {
  beforeEach(() => {
    mockSendMessage.mockClear();
    mockInvoke.mockReset();
    // Default: invoke returns a never-resolving promise so component stays in initial state
    mockInvoke.mockReturnValue(new Promise(() => {}));
    ipcListeners = {};
  });

  it('requests suggestions on mount', () => {
    render(<CommandBar />);
    expect(mockInvoke).toHaveBeenCalledWith('command-input', {
      mode: 'suggestions',
      input: '',
    });
  });

  it('renders command interface after receiving response', async () => {
    const response = {
      provider: { prompt: 'Search or type a command...' },
      suggestions: {},
    };
    mockInvoke.mockResolvedValue(response);

    await act(async () => {
      render(<CommandBar />);
    });

    expect(
      screen.getByPlaceholderText('Search or type a command...'),
    ).toBeInTheDocument();
  });

  it('sends close command-bar IPC on Escape', async () => {
    const response = {
      provider: { prompt: 'Type here...' },
      suggestions: {},
    };
    mockInvoke.mockResolvedValue(response);

    await act(async () => {
      render(<CommandBar />);
    });

    const input = screen.getByPlaceholderText('Type here...');
    act(() => {
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
    });

    expect(mockSendMessage).toHaveBeenCalledWith('command-bar', {
      action: 'close',
    });
  });

  it('displays "No results found" when no suggestions', async () => {
    const response = {
      provider: { prompt: 'Search...' },
      suggestions: {},
    };
    mockInvoke.mockResolvedValue(response);

    await act(async () => {
      render(<CommandBar />);
    });

    expect(screen.getByText('No results found.')).toBeInTheDocument();
  });
});
