import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

import { CustomSearchEngines } from '../CustomSearchEngines';
import { SettingsContext } from '@/hooks/settings';

// Mock IPC
Object.defineProperty(window, 'electron', {
  value: {
    ipcRenderer: {
      sendMessage: jest.fn(),
      on: jest.fn(() => jest.fn()),
    },
  },
  writable: true,
});

// Mock Input as a plain <input>
jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

// Mock Button as a plain <button>
jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string;
    size?: string;
  }) => <button {...props}>{children}</button>,
}));

// Mock Card as a plain <div>
jest.mock('@/components/ui/card', () => ({
  Card: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & { apperance?: string }) => (
    <div {...props}>{children}</div>
  ),
}));

// Mock lucide-react icons as simple spans
jest.mock('lucide-react', () => ({
  Plus: (props: any) => <span data-testid="icon-plus" {...props} />,
  Search: (props: any) => <span data-testid="icon-search" {...props} />,
  Trash2: (props: any) => <span data-testid="icon-trash" {...props} />,
}));

const initialEngines = [
  {
    name: 'GitHub',
    shortcut: 'gh',
    urlPattern: 'https://github.com/search?q=%s',
  },
];

const renderWithSettings = (
  engines: Array<{ name: string; shortcut: string; urlPattern: string }> = initialEngines,
) => {
  const mockSetCustomEngines = jest.fn();
  const mockUseSetting = jest.fn(() => {
    return [engines, mockSetCustomEngines];
  });

  return {
    ...render(
      <SettingsContext.Provider value={{ useSetting: mockUseSetting as any }}>
        <CustomSearchEngines />
      </SettingsContext.Provider>,
    ),
    mockSetCustomEngines,
    mockUseSetting,
  };
};

describe('CustomSearchEngines', () => {
  it('renders existing custom engines', () => {
    renderWithSettings([
      {
        name: 'GitHub',
        shortcut: 'gh',
        urlPattern: 'https://github.com/search?q=%s',
      },
      {
        name: 'StackOverflow',
        shortcut: 'so',
        urlPattern: 'https://stackoverflow.com/search?q=%s',
      },
    ]);

    expect(screen.getByText('GitHub')).toBeInTheDocument();
    expect(screen.getByText('StackOverflow')).toBeInTheDocument();
  });

  it('renders the "Add Search Engine" form', () => {
    renderWithSettings();

    expect(screen.getByText('Add Search Engine')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Name (e.g. GitHub)'),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Shortcut (e.g. gh)'),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('URL Pattern (use %s for query)'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Add Engine/i }),
    ).toBeInTheDocument();
  });

  it('displays engine name, shortcut, and URL pattern for each engine', () => {
    renderWithSettings([
      {
        name: 'GitHub',
        shortcut: 'gh',
        urlPattern: 'https://github.com/search?q=%s',
      },
    ]);

    expect(screen.getByText('GitHub')).toBeInTheDocument();
    expect(screen.getByText('gh')).toBeInTheDocument();
    expect(
      screen.getByText('https://github.com/search?q=%s'),
    ).toBeInTheDocument();
  });
});
