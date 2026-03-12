import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { AnalyticsSettings } from '../GeneralSettings';
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

const renderWithSettings = (analyticsEnabled: boolean = true) => {
  const mockUseSetting = jest.fn((key: string) => {
    if (key === 'analytics.enabled') {
      return [analyticsEnabled, jest.fn()];
    }
    return [null, jest.fn()];
  });

  return render(
    <SettingsContext.Provider value={{ useSetting: mockUseSetting as any }}>
      <AnalyticsSettings />
    </SettingsContext.Provider>,
  );
};

describe('AnalyticsSettings', () => {
  it('renders Send Analytics option', () => {
    renderWithSettings();
    expect(screen.getByText('Send Analytics')).toBeInTheDocument();
  });

  it('renders description about anonymous analytics', () => {
    renderWithSettings();
    expect(
      screen.getByText(/anonymous usage analytics/i),
    ).toBeInTheDocument();
  });

  it('renders a checkbox', () => {
    renderWithSettings();
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
  });
});
