import '@testing-library/jest-dom';
import { render, screen, act } from '@testing-library/react';
import { SettingsProvider, useSettings } from '../settings';

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

beforeEach(() => {
  mockSendMessage.mockClear();
  ipcListeners = {};
});

const TestSettingConsumer = () => {
  const [value, setValue] = useSettings('analytics.enabled');
  return (
    <div>
      <span data-testid="setting-value">{String(value)}</span>
      <button
        data-testid="toggle-btn"
        onClick={() => setValue(!value as any)}
      >
        Toggle
      </button>
    </div>
  );
};

describe('SettingsProvider', () => {
  it('requests initial settings on mount', () => {
    render(
      <SettingsProvider>
        <div />
      </SettingsProvider>,
    );
    expect(mockSendMessage).toHaveBeenCalledWith('settings-sync', null);
  });

  it('provides default values before IPC response', () => {
    render(
      <SettingsProvider>
        <TestSettingConsumer />
      </SettingsProvider>,
    );
    // analytics.enabled defaults to true
    expect(screen.getByTestId('setting-value')).toHaveTextContent('true');
  });

  it('updates values from IPC sync', () => {
    // Need to import settingsSchema to produce a valid full settings object
    const { settingsSchema } = require('src/ipc/SettingsRegistry');
    const settings = settingsSchema.parse({ analytics: { enabled: false } });

    render(
      <SettingsProvider>
        <TestSettingConsumer />
      </SettingsProvider>,
    );

    act(() => {
      ipcListeners['settings-sync']?.(settings);
    });

    expect(screen.getByTestId('setting-value')).toHaveTextContent('false');
  });

  it('sends updated settings via IPC when setter is called', () => {
    render(
      <SettingsProvider>
        <TestSettingConsumer />
      </SettingsProvider>,
    );

    mockSendMessage.mockClear();

    act(() => {
      screen.getByTestId('toggle-btn').click();
    });

    expect(mockSendMessage).toHaveBeenCalledWith(
      'settings-sync',
      expect.objectContaining({
        analytics: expect.objectContaining({ enabled: false }),
      }),
    );
  });
});
