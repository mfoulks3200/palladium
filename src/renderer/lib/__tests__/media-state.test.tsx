import '@testing-library/jest-dom';
import { render, screen, act } from '@testing-library/react';
import { MediaStateProvider, useMediaStates, useMediaState } from '../media-state';

// Mock IPC
let ipcListeners: Record<string, (data: any) => void> = {};

Object.defineProperty(window, 'electron', {
  value: {
    ipcRenderer: {
      sendMessage: jest.fn(),
      on: jest.fn((channel: string, callback: (data: any) => void) => {
        ipcListeners[channel] = callback;
        return jest.fn();
      }),
    },
  },
  writable: true,
});

beforeEach(() => {
  ipcListeners = {};
});

const TestMediaList = () => {
  const states = useMediaStates();
  return (
    <div data-testid="media-list">
      {states.map((s) => (
        <div key={s.id} data-testid={`media-${s.id}`}>
          {s.title}
        </div>
      ))}
    </div>
  );
};

const TestSingleMedia = ({ id }: { id: string }) => {
  const state = useMediaState(id);
  return (
    <div data-testid="single-media">
      {state ? state.title : 'not found'}
    </div>
  );
};

describe('MediaStateProvider', () => {
  it('starts with no media states', () => {
    render(
      <MediaStateProvider>
        <TestMediaList />
      </MediaStateProvider>,
    );
    expect(screen.getByTestId('media-list').children).toHaveLength(0);
  });

  it('adds media state on "add" action', () => {
    render(
      <MediaStateProvider>
        <TestMediaList />
      </MediaStateProvider>,
    );

    act(() => {
      ipcListeners['media-state']?.({
        action: 'add',
        state: { id: 'track-1', type: 'audio', title: 'Cool Song' },
      });
    });

    expect(screen.getByTestId('media-track-1')).toHaveTextContent('Cool Song');
  });

  it('updates existing media state on "update" action', () => {
    render(
      <MediaStateProvider>
        <TestMediaList />
      </MediaStateProvider>,
    );

    act(() => {
      ipcListeners['media-state']?.({
        action: 'add',
        state: { id: 'track-1', type: 'audio', title: 'Old Title' },
      });
    });

    act(() => {
      ipcListeners['media-state']?.({
        action: 'update',
        state: { id: 'track-1', title: 'New Title' },
      });
    });

    expect(screen.getByTestId('media-track-1')).toHaveTextContent('New Title');
  });

  it('removes media state on "remove" action', () => {
    render(
      <MediaStateProvider>
        <TestMediaList />
      </MediaStateProvider>,
    );

    act(() => {
      ipcListeners['media-state']?.({
        action: 'add',
        state: { id: 'track-1', type: 'audio', title: 'Temp' },
      });
    });
    expect(screen.getByTestId('media-list').children).toHaveLength(1);

    act(() => {
      ipcListeners['media-state']?.({ action: 'remove', id: 'track-1' });
    });
    expect(screen.getByTestId('media-list').children).toHaveLength(0);
  });

  it('ignores update for non-existent media', () => {
    render(
      <MediaStateProvider>
        <TestMediaList />
      </MediaStateProvider>,
    );

    act(() => {
      ipcListeners['media-state']?.({
        action: 'update',
        state: { id: 'ghost', title: 'Should not appear' },
      });
    });

    expect(screen.getByTestId('media-list').children).toHaveLength(0);
  });
});

describe('useMediaState', () => {
  it('returns specific media state by id', () => {
    render(
      <MediaStateProvider>
        <TestSingleMedia id="track-1" />
      </MediaStateProvider>,
    );

    act(() => {
      ipcListeners['media-state']?.({
        action: 'add',
        state: { id: 'track-1', type: 'audio', title: 'Found It' },
      });
    });

    expect(screen.getByTestId('single-media')).toHaveTextContent('Found It');
  });

  it('returns undefined for non-existent id', () => {
    render(
      <MediaStateProvider>
        <TestSingleMedia id="nope" />
      </MediaStateProvider>,
    );

    expect(screen.getByTestId('single-media')).toHaveTextContent('not found');
  });
});
