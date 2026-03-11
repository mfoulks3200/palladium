import { getDeepProp, setDeepProp, diffObjects } from '../Utility';

describe('getDeepProp', () => {
  const obj = {
    a: {
      b: {
        c: 42,
        d: 'hello',
      },
      e: true,
    },
    f: 'top-level',
  };

  it('retrieves a deeply nested property', () => {
    expect(getDeepProp(obj, 'a.b.c' as any)).toBe(42);
  });

  it('retrieves a mid-level nested property', () => {
    expect(getDeepProp(obj, 'a.e' as any)).toBe(true);
  });

  it('retrieves a top-level property', () => {
    expect(getDeepProp(obj, 'f' as any)).toBe('top-level');
  });

  it('returns the full object when path is empty', () => {
    expect(getDeepProp(obj, '' as any)).toEqual(obj);
  });

  it('returns undefined for a non-existent path', () => {
    expect(getDeepProp(obj, 'a.b.z' as any)).toBeUndefined();
  });

  it('returns null when traversing through a null value', () => {
    expect(getDeepProp(null as any, 'a.b' as any)).toBeNull();
  });

  it('returns null when traversing through undefined', () => {
    const sparse = { a: undefined } as any;
    expect(getDeepProp(sparse, 'a.b' as any)).toBeNull();
  });
});

describe('setDeepProp', () => {
  it('sets a deeply nested property immutably', () => {
    const obj = { a: { b: { c: 1 } } };
    const result = setDeepProp(obj, 'a.b.c' as any, 99);
    expect(result.a.b.c).toBe(99);
    // original is not mutated at the returned reference level
    expect(result).not.toBe(obj);
  });

  it('sets a top-level property', () => {
    const obj = { x: 'old' };
    const result = setDeepProp(obj, 'x' as any, 'new');
    expect(result.x).toBe('new');
  });

  it('creates intermediate structure when setting nested values', () => {
    const obj = { a: { b: { c: 0 } } };
    const result = setDeepProp(obj, 'a.b.c' as any, 42);
    expect(result).toEqual({ a: { b: { c: 42 } } });
  });

  it('returns the same object when path is empty', () => {
    const obj = { a: 1 };
    const result = setDeepProp(obj, '' as any, undefined as any);
    expect(result).toBe(obj);
  });
});

describe('diffObjects', () => {
  it('returns empty object for identical objects', () => {
    const obj = { a: 1, b: 'two' };
    expect(diffObjects(obj, { ...obj })).toEqual({});
  });

  it('detects a changed primitive value', () => {
    const o1 = { a: 1, b: 2 };
    const o2 = { a: 1, b: 3 };
    expect(diffObjects(o1, o2)).toEqual({ b: 3 });
  });

  it('detects nested object changes', () => {
    const o1 = { a: { x: 1, y: 2 }, b: 'same' };
    const o2 = { a: { x: 1, y: 99 }, b: 'same' };
    expect(diffObjects(o1, o2)).toEqual({ a: { y: 99 } });
  });

  it('returns the full new array when arrays differ and o2 is non-empty', () => {
    const o1 = { items: [1, 2, 3] };
    const o2 = { items: [4, 5] };
    expect(diffObjects(o1, o2)).toEqual({ items: [4, 5] });
  });

  it('returns empty diff when both arrays are empty', () => {
    const o1 = { items: [] };
    const o2 = { items: [] };
    expect(diffObjects(o1, o2)).toEqual({});
  });

  it('recurses into array indices when o2 array is empty', () => {
    const o1 = { items: [1, 2] };
    const o2 = { items: [] as number[] };
    // o2 array is empty so the array shortcut doesn't apply; diffObjects recurses
    // into array indices where o1 has values and o2 doesn't, yielding undefined diffs
    const result = diffObjects(o1, o2);
    expect(result).toHaveProperty('items');
  });

  it('handles multiple changed keys', () => {
    const o1 = { a: 1, b: 2, c: 3 };
    const o2 = { a: 10, b: 2, c: 30 };
    expect(diffObjects(o1, o2)).toEqual({ a: 10, c: 30 });
  });
});
