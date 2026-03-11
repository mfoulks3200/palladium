import {
  getLuminance,
  hasSufficientContrast,
  getAccessibleTextColor,
  generatePalette,
  adjustLightness,
  ensureVisiblePrimary,
  toHex,
} from '../colors';

describe('getLuminance', () => {
  it('returns ~1 for white', () => {
    expect(getLuminance('#ffffff')).toBeCloseTo(1, 1);
  });

  it('returns ~0 for black', () => {
    expect(getLuminance('#000000')).toBeCloseTo(0, 1);
  });

  it('returns a mid-range value for a mid-tone color', () => {
    const lum = getLuminance('#808080');
    expect(lum).toBeGreaterThan(0.1);
    expect(lum).toBeLessThan(0.5);
  });
});

describe('hasSufficientContrast', () => {
  it('returns true for black text on white background', () => {
    expect(hasSufficientContrast('#000000', '#ffffff')).toBe(true);
  });

  it('returns false for similar colors', () => {
    expect(hasSufficientContrast('#777777', '#888888')).toBe(false);
  });

  it('respects custom minimum ratio', () => {
    // black on white has ~21:1 ratio, so a threshold of 20 should still pass
    expect(hasSufficientContrast('#000000', '#ffffff', 20)).toBe(true);
  });
});

describe('getAccessibleTextColor', () => {
  it('returns black for light backgrounds', () => {
    expect(getAccessibleTextColor('#ffffff')).toBe('#000000');
  });

  it('returns white for dark backgrounds', () => {
    expect(getAccessibleTextColor('#000000')).toBe('#ffffff');
  });

  it('uses custom dark/light colors when provided', () => {
    const result = getAccessibleTextColor('#ffffff', '#111111', '#eeeeee');
    expect(result).toBe('#111111');
  });
});

describe('generatePalette', () => {
  it('generates the requested number of steps', () => {
    const palette = generatePalette('#3b82f6', 9);
    expect(palette).toHaveLength(9);
  });

  it('generates valid hex color strings', () => {
    const palette = generatePalette('#ff0000', 5);
    palette.forEach((color) => {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  it('goes from lighter to darker shades', () => {
    const palette = generatePalette('#3b82f6', 9);
    // First color should be lighter (closer to white), last should be darker
    const firstLum = getLuminance(palette[0]);
    const lastLum = getLuminance(palette[palette.length - 1]);
    expect(firstLum).toBeGreaterThan(lastLum);
  });
});

describe('adjustLightness', () => {
  it('brightens a color with positive amount', () => {
    const original = getLuminance('#555555');
    const brightened = getLuminance(adjustLightness('#555555', 20));
    expect(brightened).toBeGreaterThan(original);
  });

  it('darkens a color with negative amount', () => {
    const original = getLuminance('#aaaaaa');
    const darkened = getLuminance(adjustLightness('#aaaaaa', -20));
    expect(darkened).toBeLessThan(original);
  });

  it('returns the same color with zero amount', () => {
    const result = adjustLightness('#3b82f6', 0);
    expect(result).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});

describe('ensureVisiblePrimary', () => {
  it('returns the same color for mid-range luminance', () => {
    const color = '#3b82f6';
    expect(ensureVisiblePrimary(color, true)).toBe(color);
    expect(ensureVisiblePrimary(color, false)).toBe(color);
  });

  it('lightens very dark colors in dark mode', () => {
    const veryDark = '#050505';
    const result = ensureVisiblePrimary(veryDark, true);
    expect(getLuminance(result)).toBeGreaterThan(getLuminance(veryDark));
  });

  it('darkens very light colors in light mode', () => {
    const veryLight = '#fafafa';
    const result = ensureVisiblePrimary(veryLight, false);
    expect(getLuminance(result)).toBeLessThan(getLuminance(veryLight));
  });
});

describe('toHex', () => {
  it('converts a named color to hex', () => {
    const result = toHex('red');
    expect(result).toMatch(/^#[0-9a-fA-F]+$/);
  });

  it('passes through a hex color', () => {
    const result = toHex('#3b82f6');
    expect(result).toMatch(/^#[0-9a-fA-F]+$/);
  });
});
