import { MediaState } from '../ipc';

/**
 * Tracks media playback state for a single tab.
 * Extracted from Tab.ts for isolated testability.
 */
export class MediaStateTracker extends EventTarget {
  private mediaStates: Map<string, MediaState> = new Map();
  private _activeMediaId: string | null = null;

  public get activeMediaId(): string | null {
    return this._activeMediaId;
  }

  public set activeMediaId(id: string | null) {
    this._activeMediaId = id;
  }

  public addMediaState(state: MediaState) {
    this.mediaStates.set(state.id, state);
    this.publishMediaStateEvent();
  }

  public updateMediaState(state: Partial<MediaState> & { id: string }) {
    const existing = this.mediaStates.get(state.id);
    if (existing) {
      this.mediaStates.set(state.id, { ...existing, ...state });
      this.publishMediaStateEvent();
    }
  }

  public removeMediaState(id: string) {
    if (this.mediaStates.delete(id)) {
      this.publishMediaStateEvent();
    }
  }

  public getMediaStates(): MediaState[] {
    return [...this.mediaStates.values()];
  }

  private publishMediaStateEvent() {
    this.dispatchEvent(new CustomEvent('media-state-changed'));
  }
}
