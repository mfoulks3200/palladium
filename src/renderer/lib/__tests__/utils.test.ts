import { cn } from '../utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible');
  });

  it('merges conflicting tailwind classes (last wins)', () => {
    const result = cn('p-4', 'p-2');
    expect(result).toBe('p-2');
  });

  it('handles undefined and null inputs', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
  });

  it('returns empty string for no arguments', () => {
    expect(cn()).toBe('');
  });

  it('handles array inputs via clsx', () => {
    expect(cn(['a', 'b'], 'c')).toBe('a b c');
  });
});
