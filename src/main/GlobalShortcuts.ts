import { globalShortcut } from 'electron';
import { spawnCommandBarUI } from './commands/CommandBar';

export const registerGlobalShortcuts = () => {
  const ret = globalShortcut.register('CommandOrControl+T', () => {
    console.log('CommandOrControl+T is pressed');
    spawnCommandBarUI();
  });

  if (!ret) {
    console.log('registration failed');
  }
};

export const unregisterGlobalShortcuts = () => {
  globalShortcut.unregisterAll();
};
