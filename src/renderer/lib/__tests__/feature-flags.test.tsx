import '@testing-library/jest-dom';
import { render, screen, act } from '@testing-library/react';
import {
  FeatureFlagProvider,
  useFeatureFlag,
  useFeatureFlags,
  useRefreshFeatureFlags,
} from '../feature-flags';

// Mock IPC
const mockSendMessage = jest.fn();
let ipcListeners: Record<string, (data: any) => void> = {};

Object.defineProperty(window, 'electron', {
  value: {
    ipcRenderer: {
      sendMessage: mockSendMessage,
      on: jest.fn((channel: string, callback: (data: any) => void) => {
        ipcListeners[channel] = callback;
        return jest.fn(); // removeListener
      }),
    },
  },
  writable: true,
});

beforeEach(() => {
  mockSendMessage.mockClear();
  ipcListeners = {};
});

const TestFlagConsumer = ({ flagKey }: { flagKey: string }) => {
  const value = useFeatureFlag(flagKey);
  return <div data-testid="flag-value">{String(value ?? 'undefined')}</div>;
};

const TestAllFlagsConsumer = () => {
  const flags = useFeatureFlags();
  return (
    <div data-testid="all-flags">{JSON.stringify(flags)}</div>
  );
};

const TestRefreshConsumer = () => {
  const refresh = useRefreshFeatureFlags();
  return <button data-testid="refresh-btn" onClick={refresh}>Refresh</button>;
};

describe('FeatureFlagProvider', () => {
  it('requests flags on mount via IPC', () => {
    render(
      <FeatureFlagProvider>
        <div />
      </FeatureFlagProvider>,
    );
    expect(mockSendMessage).toHaveBeenCalledWith('feature-flags-sync');
  });

  it('provides flag values from IPC response', () => {
    render(
      <FeatureFlagProvider>
        <TestFlagConsumer flagKey="new-ui" />
      </FeatureFlagProvider>,
    );

    // Initially undefined
    expect(screen.getByTestId('flag-value').textContent).toBe('undefined');

    // Simulate IPC response
    act(() => {
      ipcListeners['feature-flags-sync']?.({ flags: { 'new-ui': true } });
    });

    expect(screen.getByTestId('flag-value').textContent).toBe('true');
  });
});

describe('useFeatureFlags', () => {
  it('returns all flags', () => {
    render(
      <FeatureFlagProvider>
        <TestAllFlagsConsumer />
      </FeatureFlagProvider>,
    );

    act(() => {
      ipcListeners['feature-flags-sync']?.({
        flags: { a: true, b: 'variant-1' },
      });
    });

    const content = screen.getByTestId('all-flags').textContent;
    expect(JSON.parse(content!)).toEqual({ a: true, b: 'variant-1' });
  });
});

describe('useRefreshFeatureFlags', () => {
  it('sends refresh message on call', () => {
    render(
      <FeatureFlagProvider>
        <TestRefreshConsumer />
      </FeatureFlagProvider>,
    );

    mockSendMessage.mockClear();
    screen.getByTestId('refresh-btn').click();
    expect(mockSendMessage).toHaveBeenCalledWith('feature-flags-refresh');
  });
});
