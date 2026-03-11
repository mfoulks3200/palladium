import { settingsSchema, settingsDefaults } from '../SettingsRegistry';

describe('settingsSchema', () => {
  it('parses an empty object to valid defaults', () => {
    const result = settingsSchema.parse({});
    expect(result).toBeDefined();
    expect(result.searchEngines).toBeDefined();
    expect(result.analytics).toBeDefined();
    expect(result.personalization).toBeDefined();
  });

  it('default search engines are all enabled', () => {
    const result = settingsSchema.parse({});
    expect(result.searchEngines.defaultEngines.google).toBe(true);
    expect(result.searchEngines.defaultEngines.bing).toBe(true);
    expect(result.searchEngines.defaultEngines.duckDuckGo).toBe(true);
  });

  it('default custom search engines is empty array', () => {
    const result = settingsSchema.parse({});
    expect(result.searchEngines.custom).toEqual([]);
  });

  it('analytics is enabled by default', () => {
    const result = settingsSchema.parse({});
    expect(result.analytics.enabled).toBe(true);
  });

  it('personalization has correct UI defaults', () => {
    const result = settingsSchema.parse({});
    expect(result.personalization.userInterface.tintColor).toBe('FFFFFF');
    expect(result.personalization.userInterface.transparency).toBe(0.3);
    expect(result.personalization.userInterface.blur).toBe(40);
    expect(result.personalization.userInterface.backdropSaturation).toBe(300);
  });

  it('background defaults to presetShader vortex', () => {
    const result = settingsSchema.parse({});
    expect(result.personalization.background.type).toBe('presetShader');
    expect(result.personalization.background.id).toBe('vortex');
  });

  it('accepts partial overrides and fills in defaults', () => {
    const result = settingsSchema.parse({
      analytics: { enabled: false },
    });
    expect(result.analytics.enabled).toBe(false);
    // Other sections should still have defaults
    expect(result.searchEngines.defaultEngines.google).toBe(true);
  });

  it('validates custom search engine entries', () => {
    const result = settingsSchema.parse({
      searchEngines: {
        custom: [
          { name: 'GitHub', shortcut: 'gh', urlPattern: 'https://github.com/search?q=%s' },
        ],
      },
    });
    expect(result.searchEngines.custom).toHaveLength(1);
    expect(result.searchEngines.custom[0].name).toBe('GitHub');
  });

  it('rejects invalid transparency values', () => {
    expect(() => {
      settingsSchema.parse({
        personalization: {
          userInterface: { transparency: 2 },
        },
      });
    }).toThrow();
  });

  it('rejects invalid blur values', () => {
    expect(() => {
      settingsSchema.parse({
        personalization: {
          userInterface: { blur: -1 },
        },
      });
    }).toThrow();
  });
});

describe('settingsDefaults', () => {
  it('is a valid parsed settings object', () => {
    expect(settingsDefaults).toBeDefined();
    expect(settingsDefaults.searchEngines).toBeDefined();
    expect(settingsDefaults.analytics).toBeDefined();
    expect(settingsDefaults.personalization).toBeDefined();
  });

  it('matches what parse({}) produces', () => {
    const parsed = settingsSchema.parse({});
    expect(settingsDefaults).toEqual(parsed);
  });
});
