import chroma from 'chroma-js';

// Calculate relative luminance for contrast
export const getLuminance = (hexColor: string): number => {
  return chroma(hexColor).luminance();
};

// Check if a color meets WCAG AA guidelines for contrast (4.5:1 ratio)
export const hasSufficientContrast = (
  textColor: string,
  bgColor: string,
  minRatio: number = 4.5,
): boolean => {
  return chroma.contrast(textColor, bgColor) >= minRatio;
};

// Generate an accessible text color (black or white) given a background color
export const getAccessibleTextColor = (
  bgColor: string,
  darkColor: string = '#000000',
  lightColor: string = '#ffffff',
): string => {
  const contrastWithDark = chroma.contrast(bgColor, darkColor);
  const contrastWithLight = chroma.contrast(bgColor, lightColor);
  return contrastWithDark >= contrastWithLight ? darkColor : lightColor;
};

// Generate a full palette of varying lightnesses from a single base color
export const generatePalette = (
  baseColor: string,
  steps: number = 9,
): string[] => {
  // We use bezier interpolation to get a smooth scale
  // We want to generate shades from very light to very dark
  const scale = chroma.scale(['white', baseColor, 'black']).domain([0, 0.5, 1]);
  const palette: string[] = [];

  // Generate evenly spaced steps along the scale (excluding pure white/black if prefered, but we'll include range)
  for (let i = 1; i <= steps; i++) {
    // calculate a value between 0.1 and 0.9 depending on the step
    const lightness = i / (steps + 1);
    palette.push(scale(lightness).hex());
  }

  return palette;
};

// Adjust lightness of a color
export const adjustLightness = (hexColor: string, amount: number): string => {
  // Amount should be between -100 and +100 roughly, indicating percentage lightness shift
  // In chroma, we can use `brighten` or `darken`. A value of 1 brightens, -1 darkens
  if (amount > 0) {
    return chroma(hexColor)
      .brighten(amount / 10)
      .hex();
  }
  return chroma(hexColor)
    .darken(Math.abs(amount) / 10)
    .hex();
};

// Ensure primary color stays visible at the extremes by fading it towards white/black
export const ensureVisiblePrimary = (
  hexColor: string,
  isDark: boolean,
): string => {
  const luminance = chroma(hexColor).luminance();
  if (isDark && luminance < 0.15) {
    // Fade to white smoothly as luminance drops below 0.15
    const ratio = Math.max(0, Math.min(1, 1 - luminance / 0.15));
    return chroma.mix(hexColor, '#ffffff', ratio, 'rgb').hex();
  } else if (!isDark && luminance > 0.85) {
    // Fade to black smoothly as luminance goes above 0.85
    const ratio = Math.max(0, Math.min(1, (luminance - 0.85) / 0.15));
    return chroma.mix(hexColor, '#000000', ratio, 'rgb').hex();
  }
  return hexColor;
};

export const toHex = (color: string): string => {
  return chroma(color).hex('rgba');
};
