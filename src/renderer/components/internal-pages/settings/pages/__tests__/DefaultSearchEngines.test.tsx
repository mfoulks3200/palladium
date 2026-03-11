import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { createContext } from 'react';
import { DefaultSearchEngines } from '../DefaultSearchEngines';
import { SettingsContext } from '@/lib/settings';

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

// Mock the Checkbox component as a simple <input type="checkbox">
jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({
    defaultChecked,
    onCheckedChange,
  }: {
    defaultChecked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      type="checkbox"
      defaultChecked={defaultChecked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
    />
  ),
}));

// Mock SettingsOption as a simple wrapper that renders its name
jest.mock('../../SettingComponents', () => ({
  SettingsOption: ({
    name,
    children,
  }: {
    name: string;
    className?: string;
    children?: React.ReactNode;
  }) => (
    <div>
      <span>{name}</span>
      {children}
    </div>
  ),
}));

const renderWithSettings = (
  settings: Record<string, boolean> = {
    'searchEngines.defaultEngines.google': true,
    'searchEngines.defaultEngines.bing': true,
    'searchEngines.defaultEngines.duckDuckGo': true,
  },
) => {
  const mockUseSetting = jest.fn((key: string) => {
    const value = settings[key] ?? false;
    return [value, jest.fn()];
  });

  return render(
    <SettingsContext.Provider value={{ useSetting: mockUseSetting as any }}>
      <DefaultSearchEngines />
    </SettingsContext.Provider>,
  );
};

describe('DefaultSearchEngines', () => {
  it('renders all three search engine names', () => {
    renderWithSettings();
    expect(screen.getByText('Google')).toBeInTheDocument();
    expect(screen.getByText('Bing')).toBeInTheDocument();
    expect(screen.getByText('DuckDuckGo')).toBeInTheDocument();
  });

  it('renders three checkboxes', () => {
    renderWithSettings();
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(3);
  });

  it('checkboxes reflect initial values from settings', () => {
    renderWithSettings({
      'searchEngines.defaultEngines.google': true,
      'searchEngines.defaultEngines.bing': false,
      'searchEngines.defaultEngines.duckDuckGo': true,
    });

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();
    expect(checkboxes[2]).toBeChecked();
  });
});
