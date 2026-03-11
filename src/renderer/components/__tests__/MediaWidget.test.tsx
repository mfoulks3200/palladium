import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MediaWidget } from '../MediaWidget';
import { MediaStateProvider } from '@/lib/media-state';
import { act } from '@testing-library/react';

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

// Mock the image import
jest.mock(
  '../../../../assets/images/kalen-emsley-Bkci_8qcdvQ-unsplash.jpg',
  () => 'mock-image.jpg',
);

const renderWithProvider = () => {
  return render(
    <MediaStateProvider>
      <MediaWidget />
    </MediaStateProvider>,
  );
};

describe('MediaWidget', () => {
  beforeEach(() => {
    mockSendMessage.mockClear();
    ipcListeners = {};
  });

  it('renders nothing when no media is playing', () => {
    const { container } = renderWithProvider();
    // Empty fragment
    expect(container.innerHTML).toBe('');
  });

  it('renders media info when a track is added', () => {
    renderWithProvider();

    act(() => {
      ipcListeners['media-state']?.({
        action: 'add',
        state: {
          id: 'audio-tab1',
          type: 'audio',
          title: 'Cool Song',
          artist: 'Cool Artist',
          playing: true,
          progress: 30,
          duration: 180,
        },
      });
    });

    expect(screen.getByText('Cool Song')).toBeInTheDocument();
    expect(screen.getByText('Cool Artist')).toBeInTheDocument();
  });

  it('renders nothing after all media is removed', () => {
    const { container } = renderWithProvider();

    act(() => {
      ipcListeners['media-state']?.({
        action: 'add',
        state: {
          id: 'audio-tab1',
          type: 'audio',
          title: 'Temp',
          playing: false,
          duration: 100,
        },
      });
    });

    act(() => {
      ipcListeners['media-state']?.({ action: 'remove', id: 'audio-tab1' });
    });

    // Should return to empty state
    expect(container.querySelector('[class*="group"]')).not.toBeInTheDocument();
  });
});
