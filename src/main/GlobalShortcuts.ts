import { globalShortcut } from 'electron';
import { spawnCommandBarUI } from './commands/CommandBar';

export const registerGlobalShortcuts = () => {
  const ret = globalShortcut.register('CommandOrControl+Shift+T', () => {
    console.log('CommandOrControl+Shift+T is pressed');
    spawnCommandBarUI();
  });

  if (!ret) {
    console.log('registration failed');
  }
};

export const unregisterGlobalShortcuts = () => {
  globalShortcut.unregisterAll();
};
