import { backgrounds } from '../../../ipc/backgrounds';

describe('backgrounds', () => {
  const entries = Object.entries(backgrounds);

  it('exports at least one background', () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it.each(entries)('%s has required fields', (_key, bg) => {
    expect(bg.name).toBeDefined();
    expect(typeof bg.name).toBe('string');
    expect(bg.type).toBe('shader');
    expect(bg.fs).toBeDefined();
    expect(typeof bg.fs).toBe('string');
    expect(bg.fs.length).toBeGreaterThan(0);
  });

  it.each(entries)(
    '%s shader contains a mainImage function',
    (_key, bg) => {
      expect(bg.fs).toContain('mainImage');
    },
  );

  it.each(
    entries.filter(([, bg]) => 'speed' in bg),
  )('%s has valid speed range (min < max)', (_key, bg) => {
    const speed = (bg as any).speed;
    expect(speed.min).toBeLessThan(speed.max);
  });

  it.each(
    entries.filter(([, bg]) => 'author' in bg),
  )('%s has author with name', (_key, bg) => {
    const author = (bg as any).author;
    expect(author.name).toBeDefined();
    expect(typeof author.name).toBe('string');
  });
});
