import { renderHook, act } from '@testing-library/react';
import { useAgentAudioVisualizerBarAnimator } from '../use-agent-audio-visualizer-bar';

// Mock livekit -- AgentState is only used as a type import, so an empty
// module is all we need.
jest.mock('@livekit/components-react', () => ({}));

// Fake rAF/cAF so the animation loop doesn't run away into the void.
// We store callbacks instead of invoking them immediately because the
// hook's animate function re-registers itself on every frame -- calling
// it synchronously would create infinite recursion and that is, in fact,
// not the vibe.
let rafCallbacks: FrameRequestCallback[] = [];
let rafId = 0;

function flushRAF() {
  const cbs = [...rafCallbacks];
  rafCallbacks = [];
  cbs.forEach((cb) => cb(Date.now()));
}

beforeEach(() => {
  rafCallbacks = [];
  rafId = 0;

  // performance.now() doesn't exist in jsdom by default
  if (typeof globalThis.performance === 'undefined') {
    (globalThis as any).performance = { now: () => Date.now() };
  }

  jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(
    (cb: FrameRequestCallback) => {
      rafId += 1;
      rafCallbacks.push(cb);
      return rafId;
    },
  );

  jest
    .spyOn(globalThis, 'cancelAnimationFrame')
    .mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('useAgentAudioVisualizerBarAnimator', () => {
  const COLUMNS = 5;
  const INTERVAL = 100;

  it('returns all column indices for "speaking" state', () => {
    const { result } = renderHook(() =>
      useAgentAudioVisualizerBarAnimator('speaking' as any, COLUMNS, INTERVAL),
    );

    // Flush a frame so the animation effect registers
    act(() => flushRAF());

    // 'speaking' sets a single-frame sequence with every column index
    expect(result.current).toEqual([0, 1, 2, 3, 4]);
  });

  it('returns center index for "listening" state', () => {
    const { result } = renderHook(() =>
      useAgentAudioVisualizerBarAnimator('listening' as any, COLUMNS, INTERVAL),
    );

    act(() => flushRAF());

    // 'listening' generates a two-frame sequence: [center] then [-1].
    // At index 0 we get [center], which for 5 columns is [2].
    const center = Math.floor(COLUMNS / 2);
    expect(result.current).toContain(center);
  });

  it('returns all column indices for undefined state', () => {
    const { result } = renderHook(() =>
      useAgentAudioVisualizerBarAnimator(undefined, COLUMNS, INTERVAL),
    );

    act(() => flushRAF());

    // undefined follows the same branch as 'speaking' -- all column indices
    expect(result.current).toEqual([0, 1, 2, 3, 4]);
  });

  it('returns empty array for unknown state like "disconnected"', () => {
    const { result } = renderHook(() =>
      useAgentAudioVisualizerBarAnimator(
        'disconnected' as any,
        COLUMNS,
        INTERVAL,
      ),
    );

    act(() => flushRAF());

    // The else branch sets sequence to [[]], so the result is []
    expect(result.current).toEqual([]);
  });
});
