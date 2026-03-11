jest.mock('electron', () => ({
  globalShortcut: {
    register: jest.fn(() => true),
    unregisterAll: jest.fn(),
  },
}));

jest.mock('src/main/commands/CommandBar', () => ({
  spawnCommandBarUI: jest.fn(),
}));

import { registerGlobalShortcuts, unregisterGlobalShortcuts } from '../GlobalShortcuts';
import { globalShortcut } from 'electron';
import { spawnCommandBarUI } from 'src/main/commands/CommandBar';

describe('GlobalShortcuts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerGlobalShortcuts', () => {
    it('registers CommandOrControl+Shift+T shortcut', () => {
      registerGlobalShortcuts();
      expect(globalShortcut.register).toHaveBeenCalledWith(
        'CommandOrControl+Shift+T',
        expect.any(Function),
      );
    });

    it('calls spawnCommandBarUI when shortcut is triggered', () => {
      registerGlobalShortcuts();
      const callback = (globalShortcut.register as jest.Mock).mock.calls[0][1];
      callback();
      expect(spawnCommandBarUI).toHaveBeenCalled();
    });

    it('logs failure when registration fails', () => {
      (globalShortcut.register as jest.Mock).mockReturnValue(false);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      registerGlobalShortcuts();
      expect(consoleSpy).toHaveBeenCalledWith('registration failed');
      consoleSpy.mockRestore();
    });
  });

  describe('unregisterGlobalShortcuts', () => {
    it('unregisters all shortcuts', () => {
      unregisterGlobalShortcuts();
      expect(globalShortcut.unregisterAll).toHaveBeenCalled();
    });
  });
});
