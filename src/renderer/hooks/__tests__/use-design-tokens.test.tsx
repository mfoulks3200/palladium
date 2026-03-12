import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import {
  DesignTokenProvider,
  useDesignTokens,
  DesignTokens,
} from '../use-design-tokens';

// Mock @/lib/settings so we don't need IPC or window.electron
jest.mock('@/hooks/settings', () => ({
  useSettings: jest.fn((key: string) => {
    const values: Record<string, unknown> = {
      'personalization.userInterface.tintColor': '3b82f6',
      'personalization.userInterface.transparency': 1,
      'personalization.userInterface.blur': 10,
      'personalization.userInterface.backdropSaturation': 100,
    };
    return [values[key], jest.fn()];
  }),
}));

// Test helper that renders the token context value
const TokenConsumer = () => {
  const { tokens } = useDesignTokens();
  return <div data-testid="tokens">{JSON.stringify(tokens)}</div>;
};

// Helper to parse rendered tokens back out
const renderWithProvider = () => {
  render(
    <DesignTokenProvider>
      <TokenConsumer />
    </DesignTokenProvider>,
  );
  const raw = screen.getByTestId('tokens').textContent!;
  return JSON.parse(raw) as DesignTokens;
};

describe('useDesignTokens', () => {
  it('throws when used outside DesignTokenProvider', () => {
    // Suppress React error boundary noise in test output
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const BadConsumer = () => {
      useDesignTokens();
      return null;
    };

    expect(() => render(<BadConsumer />)).toThrow(
      'useDesignTokens must be used within a DesignTokenProvider',
    );

    spy.mockRestore();
  });
});

describe('DesignTokenProvider', () => {
  it('generates tokens with the expected shape', () => {
    const tokens = renderWithProvider();

    // Core color tokens
    expect(tokens.primary).toBeDefined();
    expect(tokens.background).toBeDefined();
    expect(tokens.surface).toBeDefined();
    expect(tokens.surfaceRaised).toBeDefined();
    expect(tokens.surfaceOverlay).toBeDefined();
    expect(tokens.text).toBeDefined();
    expect(tokens.border).toBeDefined();

    // Semantic tokens
    expect(tokens.success).toBeDefined();
    expect(tokens.warning).toBeDefined();
    expect(tokens.error).toBeDefined();
    expect(tokens.info).toBeDefined();

    // Foreground tokens
    expect(tokens.primaryForeground).toBeDefined();
    expect(tokens.surfaceForeground).toBeDefined();
    expect(tokens.surfaceRaisedForeground).toBeDefined();
    expect(tokens.surfaceOverlayForeground).toBeDefined();
    expect(tokens.successForeground).toBeDefined();
    expect(tokens.warningForeground).toBeDefined();
    expect(tokens.errorForeground).toBeDefined();
    expect(tokens.infoForeground).toBeDefined();

    // Palette
    expect(tokens.primaryPalette).toBeDefined();
  });

  it('produces a primaryPalette with 9 colors', () => {
    const tokens = renderWithProvider();

    expect(tokens.primaryPalette).toHaveLength(9);
    tokens.primaryPalette.forEach((color) => {
      // Each palette entry should be a valid hex-ish color string
      expect(typeof color).toBe('string');
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  it('sets CSS variables on document.documentElement', () => {
    renderWithProvider();

    const root = document.documentElement;

    // Core token CSS variables (camelCase -> kebab-case)
    expect(root.style.getPropertyValue('--color-primary')).toBeTruthy();
    expect(root.style.getPropertyValue('--color-background')).toBeTruthy();
    expect(root.style.getPropertyValue('--color-surface')).toBeTruthy();
    expect(root.style.getPropertyValue('--color-text')).toBeTruthy();
    expect(root.style.getPropertyValue('--color-border')).toBeTruthy();
    expect(
      root.style.getPropertyValue('--color-surface-raised'),
    ).toBeTruthy();
    expect(
      root.style.getPropertyValue('--color-surface-overlay'),
    ).toBeTruthy();

    // Palette CSS variables (--color-primary-100 through --color-primary-900)
    for (let i = 1; i <= 9; i++) {
      expect(
        root.style.getPropertyValue(`--color-primary-${i * 100}`),
      ).toBeTruthy();
    }

    // Glassmorphism variables
    expect(root.style.getPropertyValue('--ui-blur')).toBe('10px');
    expect(root.style.getPropertyValue('--ui-saturation')).toBe('100%');
  });
});
