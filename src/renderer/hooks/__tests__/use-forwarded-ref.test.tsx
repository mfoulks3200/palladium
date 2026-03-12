import { renderHook } from '@testing-library/react';
import { createRef } from 'react';
import { useForwardedRef } from '../use-forwarded-ref';

describe('useForwardedRef', () => {
  it('returns a ref object', () => {
    const { result } = renderHook(() => useForwardedRef<HTMLDivElement>(null));
    expect(result.current).toHaveProperty('current');
  });

  it('syncs to a mutable ref object', () => {
    const outerRef = createRef<HTMLDivElement>();
    const { result } = renderHook(() => useForwardedRef(outerRef));

    // Both should point to null initially (no DOM element)
    expect(result.current.current).toBeNull();
    expect(outerRef.current).toBeNull();
  });

  it('calls a callback ref with the inner ref value', () => {
    const callbackRef = jest.fn();
    renderHook(() => useForwardedRef<HTMLDivElement>(callbackRef));

    // The callback should have been called (with null since no DOM)
    expect(callbackRef).toHaveBeenCalledWith(null);
  });

  it('handles null forwarded ref without error', () => {
    expect(() => {
      renderHook(() => useForwardedRef<HTMLDivElement>(null));
    }).not.toThrow();
  });
});
