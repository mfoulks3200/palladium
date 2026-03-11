import '@testing-library/jest-dom';
import { render, screen, act } from '@testing-library/react';
import { SystemMetaProvider, useSystemMeta } from '../system-meta';

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

const TestMetaConsumer = () => {
  const meta = useSystemMeta();
  return (
    <div data-testid="meta">
      {meta ? `${meta.platform}-${meta.appVersion}` : 'loading'}
    </div>
  );
};

describe('SystemMetaProvider', () => {
  it('requests system meta on mount', () => {
    render(
      <SystemMetaProvider>
        <div />
      </SystemMetaProvider>,
    );
    expect(mockSendMessage).toHaveBeenCalledWith('get-system-meta');
  });

  it('starts with null (loading state)', () => {
    render(
      <SystemMetaProvider>
        <TestMetaConsumer />
      </SystemMetaProvider>,
    );
    expect(screen.getByTestId('meta')).toHaveTextContent('loading');
  });

  it('provides system meta after IPC response', () => {
    render(
      <SystemMetaProvider>
        <TestMetaConsumer />
      </SystemMetaProvider>,
    );

    act(() => {
      ipcListeners['system-meta']?.({
        platform: 'darwin',
        arch: 'arm64',
        osVersion: '14.0',
        electronVersion: '35.0.0',
        chromeVersion: '128.0',
        nodeVersion: '20.0',
        appVersion: '0.0.8',
        appName: 'Palladium',
        gitInfo: {
          version: '0.0.8',
          commitHash: 'abc123',
          branch: 'main',
          lastCommitDateTime: '2024-01-01',
        },
      });
    });

    expect(screen.getByTestId('meta')).toHaveTextContent('darwin-0.0.8');
  });
});
