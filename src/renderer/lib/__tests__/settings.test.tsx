import '@testing-library/jest-dom';
import { render, screen, act } from '@testing-library/react';
import { SettingsProvider, useSettings } from '../settings';
import { settingsDefaults } from 'src/ipc/SettingsRegistry';

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

beforeEach(() => {
  mockSendMessage.mockClear();
  mockInvoke.mockReset();
  mockInvoke.mockResolvedValue(settingsDefaults);
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
    expect(mockInvoke).toHaveBeenCalledWith('get-settings');
  });

  it('provides default values before IPC response', () => {
    // Use a never-resolving promise so the invoke doesn't update state
    mockInvoke.mockReturnValue(new Promise(() => {}));

    render(
      <SettingsProvider>
        <TestSettingConsumer />
      </SettingsProvider>,
    );
    // analytics.enabled defaults to true
    expect(screen.getByTestId('setting-value')).toHaveTextContent('true');
  });

  it('updates values when invoke resolves with settings', async () => {
    const { settingsSchema } = require('src/ipc/SettingsRegistry');
    const settings = settingsSchema.parse({ analytics: { enabled: false } });

    mockInvoke.mockResolvedValue(settings);

    await act(async () => {
      render(
        <SettingsProvider>
          <TestSettingConsumer />
        </SettingsProvider>,
      );
    });

    expect(screen.getByTestId('setting-value')).toHaveTextContent('false');
  });

  it('sends updated settings via IPC when setter is called', async () => {
    await act(async () => {
      render(
        <SettingsProvider>
          <TestSettingConsumer />
        </SettingsProvider>,
      );
    });

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
