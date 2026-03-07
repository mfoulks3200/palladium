import React, {
  createContext,
  useCallback,
  useContext,
  useState,
  useMemo,
  useEffect,
} from 'react';
import {
  generatePalette,
  getAccessibleTextColor,
  adjustLightness,
  hasSufficientContrast,
  ensureVisiblePrimary,
} from '../lib/colors';
import { useSettings } from '../lib/settings';
import chroma from 'chroma-js';

// Define the shape of our tokens
export interface DesignTokens {
  // Core colors
  primary: string;
  background: string;
  surface: string;
  surfaceRaised: string;
  surfaceOverlay: string;
  text: string;
  border: string;

  // Semantic
  success: string;
  warning: string;
  error: string;
  info: string;

  // Calculated
  primaryForeground: string;
  surfaceForeground: string;
  surfaceRaisedForeground: string;
  surfaceOverlayForeground: string;
  successForeground: string;
  warningForeground: string;
  errorForeground: string;
  infoForeground: string;

  // Palettes for more nuanced styling (e.g. 100-900 scale)
  primaryPalette: string[];
}

// User preferences input
export interface DesignPreferences {
  primaryColor: string;
  backgroundColor?: string;
  opacity?: number;
}

// Context shape
interface DesignTokenContextValue {
  tokens: DesignTokens;
  preferences: DesignPreferences;
  setPreferences: (prefs: DesignPreferences) => void;
  updatePreference: <K extends keyof DesignPreferences>(
    key: K,
    value: DesignPreferences[K],
  ) => void;
}

const defaultPreferences: DesignPreferences = {
  primaryColor: '#3b82f6', // A pleasing blue default
};

// Initial fallback tokens before calculation
const defaultTokens: DesignTokens = {
  primary: '#3b82f6',
  background: '#ffffff',
  surface: '#f3f4f6',
  surfaceRaised: '#e5e7eb',
  surfaceOverlay: '#d1d5db',
  text: '#111827',
  border: '#e5e7eb',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  primaryForeground: '#ffffff',
  surfaceForeground: '#111827',
  surfaceRaisedForeground: '#111827',
  surfaceOverlayForeground: '#111827',
  successForeground: '#ffffff',
  warningForeground: '#ffffff',
  errorForeground: '#ffffff',
  infoForeground: '#ffffff',
  primaryPalette: [],
};

const DesignTokenContext = createContext<DesignTokenContextValue | undefined>(
  undefined,
);

// Main generator function
const generateTokens = (prefs: DesignPreferences): DesignTokens => {
  // Raw tint color and its luminance
  const rawPrimary = prefs.primaryColor;
  const primaryLuminance = chroma(rawPrimary).luminance();

  // Use a dark theme if the selected tint color is dark
  const isDark = primaryLuminance < 0.5;

  // Primary color from user, adjusted for extreme light/dark
  const primary = ensureVisiblePrimary(rawPrimary, isDark);

  // Dynamic base background that can be pulled all the way to absolute black/white regardless of the active theme
  let baseBackground =
    prefs.backgroundColor || (isDark ? '#09090b' : '#ffffff');
  if (primaryLuminance < 0.5) {
    baseBackground = chroma
      .mix(baseBackground, '#000000', 1 - primaryLuminance / 0.05, 'rgb')
      .hex();
  } else {
    baseBackground = chroma
      .mix(baseBackground, '#ffffff', (primaryLuminance - 0.5) / 0.5, 'rgb')
      .hex();
  }

  // Solid hexes for contrast calculations using raw unadjusted primary so dark tints don't accidentally lighten backgrounds
  const backgroundHex = chroma
    .mix(baseBackground, rawPrimary, isDark ? 0.05 : 0.03, 'rgb')
    .hex();

  // Scale surfaces based on extremes. If picking pure black, remove the elevation so it stays black.
  const darkElevation = isDark ? Math.min(0.5, primaryLuminance * 25) : 0;
  const rawSurfaceHex = isDark
    ? adjustLightness(backgroundHex, darkElevation)
    : backgroundHex;
  // Desaturate the primary before mixing into surfaces so the tint stays subtle and
  // doesn't produce an overly-saturated surface. Using 'lab' for perceptually uniform blending.
  const surfaceTint = chroma(rawPrimary).desaturate(3).hex();
  const surfaceHex = chroma
    .mix(rawSurfaceHex, surfaceTint, isDark ? 0.15 : 0.08, 'lab')
    .hex();

  // Elevated surfaces — progressively lighter in dark mode, slightly darker/more tinted in light mode
  const surfaceRaisedBase = adjustLightness(surfaceHex, isDark ? 1.5 : -0.5);
  const surfaceRaisedHex = chroma
    .mix(surfaceRaisedBase, surfaceTint, isDark ? 0.2 : 0.1, 'lab')
    .hex();

  const surfaceOverlayBase = adjustLightness(surfaceHex, isDark ? 3 : -1);
  const surfaceOverlayHex = chroma
    .mix(surfaceOverlayBase, surfaceTint, isDark ? 0.25 : 0.12, 'lab')
    .hex();

  // Scale border contrast dynamically. If absolute white/black, borders dissolve too.
  const darkBorderElev = isDark
    ? Math.max(0.5, Math.min(1, primaryLuminance * 50))
    : 0;
  const lightBorderElev = !isDark
    ? Math.max(-1, (primaryLuminance - 1) * 50)
    : 0;
  let borderHex = isDark
    ? adjustLightness(backgroundHex, darkBorderElev)
    : adjustLightness(backgroundHex, lightBorderElev);

  // Enforce a minimum lightness for dark mode borders so they stand out on true black backgrounds
  if (isDark && chroma(borderHex).get('hsl.l') < 0.12) {
    borderHex = chroma(borderHex).set('hsl.l', 0.12).hex();
  }

  // Apply user opacity for glass effect
  const opacity = prefs.opacity !== undefined ? prefs.opacity : 1;
  const background = chroma(backgroundHex).alpha(opacity).css();
  const surface = chroma(surfaceHex).alpha(opacity).css();
  const surfaceRaised = chroma(surfaceRaisedHex).alpha(opacity).css();
  const surfaceOverlay = chroma(surfaceOverlayHex).alpha(opacity).css();
  const border = chroma(borderHex).alpha(opacity).css();

  // Generate a full palette for the primary color
  const primaryPalette = generatePalette(primary, 9);

  // Calculate accessible text colors using the solid hexes
  const text = getAccessibleTextColor(backgroundHex, '#0f172a', '#f8fafc');
  const primaryForeground = getAccessibleTextColor(
    primary,
    '#000000',
    '#ffffff',
  );
  const surfaceForeground = getAccessibleTextColor(
    surfaceHex,
    '#000000',
    '#ffffff',
  );
  const surfaceRaisedForeground = getAccessibleTextColor(
    surfaceRaisedHex,
    '#000000',
    '#ffffff',
  );
  const surfaceOverlayForeground = getAccessibleTextColor(
    surfaceOverlayHex,
    '#000000',
    '#ffffff',
  );

  return {
    primary,
    background,
    surface,
    surfaceRaised,
    surfaceOverlay,
    text,
    border,
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    primaryForeground,
    surfaceForeground,
    surfaceRaisedForeground,
    surfaceOverlayForeground,
    successForeground: getAccessibleTextColor('#10b981', '#000000', '#ffffff'),
    warningForeground: getAccessibleTextColor('#f59e0b', '#000000', '#ffffff'),
    errorForeground: getAccessibleTextColor('#ef4444', '#000000', '#ffffff'),
    infoForeground: getAccessibleTextColor('#3b82f6', '#000000', '#ffffff'),
    primaryPalette,
  };
};

export const DesignTokenProvider: React.FC<{
  children: React.ReactNode;
  initialPreferences?: Partial<DesignPreferences>;
}> = ({ children, initialPreferences }) => {
  const [preferences, setPreferencesState] = useState<DesignPreferences>({
    ...defaultPreferences,
    ...initialPreferences,
  });

  const [tintColor] = useSettings('personalization.userInterface.tintColor');
  const [opacity] = useSettings('personalization.userInterface.transparency');
  const [blur] = useSettings('personalization.userInterface.blur');
  const [saturation] = useSettings(
    'personalization.userInterface.backdropSaturation',
  );
  const safeTintColor = tintColor.startsWith('#') ? tintColor : `#${tintColor}`;

  // Recalculate tokens when preferences change
  const tokens = useMemo(
    () =>
      generateTokens({
        ...preferences,
        primaryColor: safeTintColor,
        opacity,
      }),
    [preferences, safeTintColor, opacity],
  );

  // Inject CSS variables into the root document so regular CSS/Tailwind can use them
  useEffect(() => {
    const root = document.documentElement;
    // We convert hex to RGB values if using Tailwind to allow opacity adjustments,
    // but for simplicity here we just inject the hex.
    Object.entries(tokens).forEach(([key, value]) => {
      if (typeof value === 'string') {
        // Convert camelCase to kebab-case
        const cssVarKey = `--color-${key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}`;
        root.style.setProperty(cssVarKey, value);
      }
    });

    // Inject palette
    tokens.primaryPalette.forEach((color, index) => {
      root.style.setProperty(`--color-primary-${(index + 1) * 100}`, color);
    });

    // Inject glassmorphism effects
    root.style.setProperty('--ui-blur', `${blur}px`);
    root.style.setProperty('--ui-saturation', `${saturation}%`);
  }, [tokens, blur, saturation]);

  const setPreferences = useCallback((newPrefs: DesignPreferences) => {
    setPreferencesState(newPrefs);
  }, []);

  const updatePreference = useCallback(
    <K extends keyof DesignPreferences>(
      key: K,
      value: DesignPreferences[K],
    ) => {
      setPreferencesState((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const value = useMemo(
    () => ({
      tokens,
      preferences,
      setPreferences,
      updatePreference,
    }),
    [tokens, preferences],
  );

  return (
    <DesignTokenContext.Provider value={value}>
      {children}
    </DesignTokenContext.Provider>
  );
};

// Custom hook for consuming the tokens
export const useDesignTokens = () => {
  const context = useContext(DesignTokenContext);
  if (context === undefined) {
    throw new Error(
      'useDesignTokens must be used within a DesignTokenProvider',
    );
  }
  return context;
};
