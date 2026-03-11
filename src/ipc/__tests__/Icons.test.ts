import { LucideIcons } from '../../renderer/lib/icons';

describe('LucideIcons', () => {
  it('is a defined object', () => {
    expect(LucideIcons).toBeDefined();
    expect(typeof LucideIcons).toBe('object');
    expect(LucideIcons).not.toBeNull();
  });

  it.each(['Search', 'Settings', 'Plus', 'X'])(
    'contains the well-known icon "%s"',
    (iconName) => {
      expect(LucideIcons).toHaveProperty(iconName);
    },
  );

  it('icon values are valid React components', () => {
    const iconsToCheck = ['Search', 'Settings', 'Plus', 'X'] as const;

    for (const name of iconsToCheck) {
      const icon = (LucideIcons as Record<string, unknown>)[name];
      const isComponent =
        typeof icon === 'function' ||
        (typeof icon === 'object' &&
          icon !== null &&
          '$$typeof' in icon);
      expect(isComponent).toBe(true);
    }
  });
});
