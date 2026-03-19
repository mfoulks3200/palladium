import { MediaStateTracker } from '../MediaStateTracker';
import { MediaState } from '../../ipc';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMediaState(overrides: Partial<MediaState> & { id: string }): MediaState {
  return {
    type: 'audio',
    title: 'Test Track',
    artist: 'Test Artist',
    playing: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MediaStateTracker', () => {
  let tracker: MediaStateTracker;

  beforeEach(() => {
    tracker = new MediaStateTracker();
  });

  // -------------------------------------------------------------------------
  // activeMediaId getter / setter
  // -------------------------------------------------------------------------

  describe('activeMediaId', () => {
    it('defaults to null', () => {
      expect(tracker.activeMediaId).toBeNull();
    });

    it('can be set and read back', () => {
      tracker.activeMediaId = 'media-1';
      expect(tracker.activeMediaId).toBe('media-1');
    });

    it('can be reset to null', () => {
      tracker.activeMediaId = 'media-1';
      tracker.activeMediaId = null;
      expect(tracker.activeMediaId).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // addMediaState
  // -------------------------------------------------------------------------

  describe('addMediaState', () => {
    it('adds a state retrievable via getMediaStates', () => {
      const state = makeMediaState({ id: 'a' });
      tracker.addMediaState(state);

      const states = tracker.getMediaStates();
      expect(states).toHaveLength(1);
      expect(states[0]).toEqual(state);
    });

    it('fires a media-state-changed event', () => {
      const listener = jest.fn();
      tracker.addEventListener('media-state-changed', listener);

      tracker.addMediaState(makeMediaState({ id: 'a' }));

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('overwrites an existing entry with the same id', () => {
      tracker.addMediaState(makeMediaState({ id: 'a', title: 'First' }));
      tracker.addMediaState(makeMediaState({ id: 'a', title: 'Second' }));

      const states = tracker.getMediaStates();
      expect(states).toHaveLength(1);
      expect(states[0].title).toBe('Second');
    });

    it('stores multiple distinct states', () => {
      tracker.addMediaState(makeMediaState({ id: 'a' }));
      tracker.addMediaState(makeMediaState({ id: 'b' }));
      tracker.addMediaState(makeMediaState({ id: 'c' }));

      expect(tracker.getMediaStates()).toHaveLength(3);
    });
  });

  // -------------------------------------------------------------------------
  // updateMediaState
  // -------------------------------------------------------------------------

  describe('updateMediaState', () => {
    it('merges partial updates into the existing state', () => {
      tracker.addMediaState(
        makeMediaState({ id: 'a', title: 'Original', playing: false }),
      );

      tracker.updateMediaState({ id: 'a', playing: true });

      const [updated] = tracker.getMediaStates();
      expect(updated.playing).toBe(true);
      expect(updated.title).toBe('Original');
    });

    it('fires a media-state-changed event on successful update', () => {
      tracker.addMediaState(makeMediaState({ id: 'a' }));

      const listener = jest.fn();
      tracker.addEventListener('media-state-changed', listener);

      tracker.updateMediaState({ id: 'a', title: 'Updated' });

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('is a no-op when the id does not exist', () => {
      const listener = jest.fn();
      tracker.addEventListener('media-state-changed', listener);

      tracker.updateMediaState({ id: 'nonexistent', title: 'Nope' });

      expect(listener).not.toHaveBeenCalled();
      expect(tracker.getMediaStates()).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // removeMediaState
  // -------------------------------------------------------------------------

  describe('removeMediaState', () => {
    it('removes an existing state', () => {
      tracker.addMediaState(makeMediaState({ id: 'a' }));
      tracker.removeMediaState('a');

      expect(tracker.getMediaStates()).toHaveLength(0);
    });

    it('fires a media-state-changed event on successful removal', () => {
      tracker.addMediaState(makeMediaState({ id: 'a' }));

      const listener = jest.fn();
      tracker.addEventListener('media-state-changed', listener);

      tracker.removeMediaState('a');

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('is a no-op when the id does not exist', () => {
      const listener = jest.fn();
      tracker.addEventListener('media-state-changed', listener);

      tracker.removeMediaState('ghost');

      expect(listener).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // getMediaStates
  // -------------------------------------------------------------------------

  describe('getMediaStates', () => {
    it('returns an empty array when no states have been added', () => {
      expect(tracker.getMediaStates()).toEqual([]);
    });

    it('returns a copy — mutations do not affect internal state', () => {
      tracker.addMediaState(makeMediaState({ id: 'a' }));

      const snapshot = tracker.getMediaStates();
      snapshot.pop();

      expect(tracker.getMediaStates()).toHaveLength(1);
    });
  });
});
