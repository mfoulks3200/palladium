import '@testing-library/jest-dom';
import { render, screen, act } from '@testing-library/react';

// Mock the command UI primitives to avoid TS compile error with interpolateSize CSS prop
jest.mock('@/components/ui/command', () => {
  const React = require('react');
  return {
    Command: ({ children, className, ...props }: any) => (
      <div data-testid="command-root" className={className}>{children}</div>
    ),
    CommandInput: React.forwardRef(({ placeholder, onKeyDown, onInput, value, ...props }: any, ref: any) => (
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
    CommandGroup: ({ children, heading }: any) => <div data-testid="command-group">{children}</div>,
    CommandItem: ({ children, value }: any) => <div data-testid="command-item">{children}</div>,
    CommandSeparator: () => <hr />,
    CommandShortcut: ({ children }: any) => <span>{children}</span>,
  };
});

// Mock CommandBar CSS import
jest.mock('../CommandBar.css', () => ({}));

import { CommandBar } from '../CommandBar';

// Mock IPC
const mockSendMessage = jest.fn();
let ipcListeners: Record<string, (data: any) => void> = {};

Object.defineProperty(window, 'electron', {
  value: {
    ipcRenderer: {
      sendMessage: mockSendMessage,
      on: jest.fn((channel: string, callback: (data: any) => void) => {
        ipcListeners[channel] = callback;
        return jest.fn();
      }),
    },
  },
  writable: true,
});

// Mock lucide icons used via LucideIcons lookup
jest.mock('src/ipc/Icons', () => ({
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
    ipcListeners = {};
  });

  it('returns empty fragment before command response', () => {
    const { container } = render(<CommandBar />);
    // Before any command-response IPC, the component returns empty
    expect(container.innerHTML).toBe('');
  });

  it('requests suggestions on mount', () => {
    render(<CommandBar />);
    expect(mockSendMessage).toHaveBeenCalledWith('command-input', {
      mode: 'suggestions',
      input: '',
    });
  });

  it('renders command interface after receiving response', () => {
    render(<CommandBar />);

    act(() => {
      ipcListeners['command-response']?.({
        provider: { prompt: 'Search or type a command...' },
        suggestions: {},
      });
    });

    expect(
      screen.getByPlaceholderText('Search or type a command...'),
    ).toBeInTheDocument();
  });

  it('sends close command-bar IPC on Escape', () => {
    render(<CommandBar />);

    act(() => {
      ipcListeners['command-response']?.({
        provider: { prompt: 'Type here...' },
        suggestions: {},
      });
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

  it('displays "No results found" when no suggestions', () => {
    render(<CommandBar />);

    act(() => {
      ipcListeners['command-response']?.({
        provider: { prompt: 'Search...' },
        suggestions: {},
      });
    });

    expect(screen.getByText('No results found.')).toBeInTheDocument();
  });
});
