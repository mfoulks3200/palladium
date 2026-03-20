import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { CoreProviders } from '../CoreProviders';

// Mock next-themes
jest.mock('next-themes', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="theme-provider">{children}</div>
  ),
}));

// Mock IPC for SettingsProvider
const mockInvoke = jest.fn();
Object.defineProperty(window, 'electron', {
  value: {
    ipcRenderer: {
      sendMessage: jest.fn(),
      invoke: mockInvoke,
      on: jest.fn(() => jest.fn()),
    },
  },
  writable: true,
});

beforeEach(() => {
  mockInvoke.mockResolvedValue({});
});

describe('CoreProviders', () => {
  it('renders children', () => {
    render(
      <CoreProviders>
        <div data-testid="child">Hello</div>
      </CoreProviders>,
    );
    expect(screen.getByTestId('child')).toHaveTextContent('Hello');
  });

  it('wraps children with ThemeProvider', () => {
    render(
      <CoreProviders>
        <span>Themed</span>
      </CoreProviders>,
    );
    expect(screen.getByTestId('theme-provider')).toBeInTheDocument();
  });

  it('renders multiple children', () => {
    render(
      <CoreProviders>
        <div data-testid="a">A</div>
        <div data-testid="b">B</div>
      </CoreProviders>,
    );
    expect(screen.getByTestId('a')).toBeInTheDocument();
    expect(screen.getByTestId('b')).toBeInTheDocument();
  });
});
