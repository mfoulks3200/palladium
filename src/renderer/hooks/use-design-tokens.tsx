import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { generatePalette, getAccessibleTextColor, adjustLightness, hasSufficientContrast, ensureVisiblePrimary } from '../lib/colors';
import { useSettings } from '../lib/settings';

// Define the shape of our tokens
export interface DesignTokens {
  // Core colors
  primary: string;
  background: string;
  surface: string;
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
  successForeground: string;
  warningForeground: string;
  errorForeground: string;
  infoForeground: string;

  // Palettes for more nuanced styling (e.g. 100-900 scale)
  primaryPalette: string[];
}

// User preferences input
export interface DesignPreferences {
  theme: 'light' | 'dark' | 'system';
  primaryColor: string;
  backgroundColor?: string;
}

// Context shape
interface DesignTokenContextValue {
  tokens: DesignTokens;
  preferences: DesignPreferences;
  setPreferences: (prefs: DesignPreferences) => void;
  updatePreference: <K extends keyof DesignPreferences>(key: K, value: DesignPreferences[K]) => void;
}

const defaultPreferences: DesignPreferences = {
  theme: 'system',
  primaryColor: '#3b82f6', // A pleasing blue default
};

// Initial fallback tokens before calculation
const defaultTokens: DesignTokens = {
  primary: '#3b82f6',
  background: '#ffffff',
  surface: '#f3f4f6',
  text: '#111827',
  border: '#e5e7eb',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  primaryForeground: '#ffffff',
  surfaceForeground: '#111827',
  successForeground: '#ffffff',
  warningForeground: '#ffffff',
  errorForeground: '#ffffff',
  infoForeground: '#ffffff',
  primaryPalette: [],
};

const DesignTokenContext = createContext<DesignTokenContextValue | undefined>(undefined);

// Helper to deduce actual theme if 'system' is selected
const getEffectiveTheme = (themePref: 'light' | 'dark' | 'system'): 'light' | 'dark' => {
  if (themePref === 'system') {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return themePref;
};

// Main generator function
const generateTokens = (prefs: DesignPreferences, effectiveTheme: 'light' | 'dark'): DesignTokens => {
  const isDark = effectiveTheme === 'dark';

  // Base backgrounds heavily dependent on theme
  const background = prefs.backgroundColor || (isDark ? '#09090b' : '#ffffff');
  
  // Surface is usually a slight elevation from background
  const surface = isDark ? adjustLightness(background, 0.5) : adjustLightness(background, -0.2);
  
  // Primary color from user, adjusted for extreme light/dark
  const primary = ensureVisiblePrimary(prefs.primaryColor, isDark);

  // Generate a full palette for the primary color
  const primaryPalette = generatePalette(primary, 9);

  // Calculate accessible text colors
  const text = getAccessibleTextColor(background, '#0f172a', '#f8fafc');
  const primaryForeground = getAccessibleTextColor(primary, '#000000', '#ffffff');
  const surfaceForeground = getAccessibleTextColor(surface, '#000000', '#ffffff');

  // Borders need enough contrast to be visible but not overwhelming
  const border = isDark ? adjustLightness(background, 1) : adjustLightness(background, -1);

  return {
    primary,
    background,
    surface,
    text,
    border,
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    primaryForeground,
    surfaceForeground,
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

  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>(() => getEffectiveTheme(preferences.theme));

  // Listen for system theme changes if set to 'system'
  useEffect(() => {
    if (preferences.theme !== 'system') {
      setEffectiveTheme(preferences.theme);
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setEffectiveTheme(e.matches ? 'dark' : 'light');
    };

    // Set initial
    setEffectiveTheme(mediaQuery.matches ? 'dark' : 'light');

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [preferences.theme]);

  const [tintColor] = useSettings('personalization.userInterface.tintColor');
  const safeTintColor = tintColor.startsWith('#') ? tintColor : `#${tintColor}`;

  // Recalculate tokens when preferences or effective theme changes
  const tokens = useMemo(() => generateTokens({
    ...preferences,
    primaryColor: safeTintColor
  }, effectiveTheme), [preferences, effectiveTheme, safeTintColor]);

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
  }, [tokens]);

  const setPreferences = (newPrefs: DesignPreferences) => {
    setPreferencesState(newPrefs);
  };

  const updatePreference = <K extends keyof DesignPreferences>(key: K, value: DesignPreferences[K]) => {
    setPreferencesState((prev) => ({ ...prev, [key]: value }));
  };

  const value = useMemo(
    () => ({
      tokens,
      preferences,
      setPreferences,
      updatePreference,
    }),
    [tokens, preferences]
  );

  return <DesignTokenContext.Provider value={value}>{children}</DesignTokenContext.Provider>;
};

// Custom hook for consuming the tokens
export const useDesignTokens = () => {
  const context = useContext(DesignTokenContext);
  if (context === undefined) {
    throw new Error('useDesignTokens must be used within a DesignTokenProvider');
  }
  return context;
};
